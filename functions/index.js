const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { Innertube, UniversalCache } = require('youtubei.js');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const urlCache = new Map();
let ytInstance = null;
let dynamicPipedInstances = [];
let dynamicInvidiousInstances = [];
let instanceListLastRefresh = 0;

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://pipedapi.drgns.space',
  'https://pipedapi.syncpundit.io',
  'https://pipedapi.ducks.party',
  'https://api.piped.yt'
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.projectsegfau.lt',
  'https://iv.ggtyler.dev',
  'https://invidious.fdn.fr'
];

const getYT = async () => {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: true
    });
  }
  return ytInstance;
};

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of urlCache.entries()) {
    if (now - val.time > 1000 * 60 * 45) urlCache.delete(key);
  }
}, 1000 * 60 * 30);

async function refreshInstanceLists() {
  const now = Date.now();
  if (now - instanceListLastRefresh < 1000 * 60 * 20) return;
  instanceListLastRefresh = now;

  try {
    const res = await fetch('https://piped-instances.kavin.rocks/');
    if (res.ok) {
      const data = await res.json();
      const discovered = (Array.isArray(data) ? data : [])
        .map((i) => i?.api_url)
        .filter((u) => typeof u === 'string' && u.startsWith('https://'));
      if (discovered.length) dynamicPipedInstances = [...new Set(discovered)];
    }
  } catch {}

  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=api,health');
    if (res.ok) {
      const data = await res.json();
      const discovered = (Array.isArray(data) ? data : [])
        .map((entry) => {
          const host = entry?.[0];
          if (!host || typeof host !== 'string') return null;
          if (host.includes('.onion') || host.includes('.i2p')) return null;
          return `https://${host}`;
        })
        .filter((u) => typeof u === 'string');
      if (discovered.length) dynamicInvidiousInstances = [...new Set(discovered)];
    }
  } catch {}
}

async function downloadWithClientFallback(videoId) {
  const yt = await getYT();
  const clients = ['IOS', 'ANDROID', 'YTMUSIC'];
  let lastError = null;
  for (const client of clients) {
    try {
      return await yt.download(videoId, { type: 'audio', quality: 'best', client });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All YouTube download clients failed.');
}

async function tryYouTubeDirect(videoId) {
  const yt = await getYT();
  try {
    const streamData = await yt.getStreamingData(videoId, { type: 'audio', quality: 'best' });
    if (streamData?.url && streamData?.mime_type) {
      return {
        url: streamData.url,
        mimeType: streamData.mime_type,
        time: Date.now(),
        directYT: false,
        contentLength: streamData.content_length
      };
    }
  } catch {}
  return null;
}

async function tryYouTubeDownload(videoId) {
  try {
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId, { client: 'IOS' });
    const format = info.chooseFormat?.({ type: 'audio', quality: 'best' });
    const probe = await downloadWithClientFallback(videoId);
    if (probe?.return) {
      try { await probe.return(); } catch {}
    }
    return {
      mimeType: 'audio/webm; codecs="opus"',
      time: Date.now(),
      directYT: true,
      contentLength: format?.content_length
    };
  } catch {
    return null;
  }
}

async function tryPiped(videoId) {
  await refreshInstanceLists();
  const allInstances = [...dynamicPipedInstances, ...PIPED_INSTANCES];
  for (const apiBase of [...new Set(allInstances)]) {
    try {
      const res = await fetch(`${apiBase}/streams/${videoId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const stream = data.audioStreams?.find((s) => s?.mimeType?.includes('opus') && s?.url) ||
        data.audioStreams?.find((s) => s?.mimeType?.includes('audio') && s?.url);
      if (stream?.url) {
        return { url: stream.url, mimeType: stream.mimeType, time: Date.now(), directYT: false };
      }
    } catch {}
  }
  return null;
}

async function tryInvidious(videoId) {
  await refreshInstanceLists();
  const allInstances = [...dynamicInvidiousInstances, ...INVIDIOUS_INSTANCES];
  for (const base of [...new Set(allInstances)]) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${videoId}`);
      if (!res.ok) continue;
      const data = await res.json();
      const stream = data?.adaptiveFormats?.find((s) => s?.type?.includes('audio') && s?.url) ||
        data?.formatStreams?.find((s) => s?.type?.includes('audio') && s?.url);
      if (stream?.url) {
        return {
          url: stream.url,
          mimeType: stream.type || 'audio/webm',
          time: Date.now(),
          directYT: false,
          contentLength: stream.clen
        };
      }
    } catch {}
  }
  return null;
}

async function tryCobalt(videoId) {
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        audioFormat: 'mp3'
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const url = data?.url || data?.download_url || data?.media?.url || data?.audio?.url || data?.files?.audio;
    if (typeof url === 'string' && url.startsWith('http')) {
      return { url, mimeType: 'audio/mpeg', time: Date.now(), directYT: false };
    }
  } catch {}
  return null;
}

function mapTrack(item) {
  const id = item.video_id || item.videoId || item.endpoint?.payload?.videoId || item.id;
  const title = item.title ? item.title.toString() : 'Unknown';
  let artist = 'Unknown';
  if (item.artists?.[0]?.name) artist = item.artists[0].name;
  const thumbnail = item.thumbnails?.[0]?.url || item.thumbnail?.url || '';
  return { id, title, artist, thumbnail };
}

function extractVideoIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function normalizeThumb(url) {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function mapPipedTrack(item) {
  const id = item.videoId || item.id || extractVideoIdFromUrl(item.url);
  if (!id || typeof id !== 'string' || id.length !== 11) return null;
  const title = item.title || item.name || 'Unknown';
  const artist = item.uploaderName || item.uploader || item.artist || 'Unknown';
  const thumbnail = normalizeThumb(item.thumbnail || item.thumbnailUrl || item.uploaderAvatar);
  return { id, title, artist, thumbnail };
}

async function fetchPipedJson(path) {
  await refreshInstanceLists();
  const allInstances = [...dynamicPipedInstances, ...PIPED_INSTANCES];
  for (const apiBase of [...new Set(allInstances)]) {
    try {
      const res = await fetch(`${apiBase}${path}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
    } catch {}
  }
  return null;
}

app.get('/api/piped/home', async (_req, res) => {
  try {
    const trending = await fetchPipedJson('/trending?region=US') || await fetchPipedJson('/popular');
    if (!trending) return res.status(404).json({ error: 'No Piped instances available.' });
    const tracks = trending.map(mapPipedTrack).filter(Boolean).slice(0, 80);
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/piped/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  try {
    const encoded = encodeURIComponent(q);
    const results = await fetchPipedJson(`/search?q=${encoded}&filter=videos`) || await fetchPipedJson(`/search?q=${encoded}`);
    if (!results) return res.status(404).json({ error: 'No Piped instances available.' });
    const tracks = results.map(mapPipedTrack).filter(Boolean).slice(0, 120);
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/home', async (_req, res) => {
  try {
    const instance = await getYT();
    const home = await instance.music.getHomeFeed();
    const sections = home.sections || [];
    const allItems = [];
    for (const section of sections) {
      const items = section.contents || section.items || [];
      if (Array.isArray(items)) allItems.push(...items);
    }
    const tracks = allItems.map(mapTrack).filter((t) => t.id && t.id.length === 11);
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (_req, res) => {
  try {
    const instance = await getYT();
    const history = await instance.getHistory();
    const items = history.contents || [];
    const tracks = items.map(mapTrack).filter((t) => t.id && t.id.length === 11);
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/library', async (_req, res) => {
  try {
    const instance = await getYT();
    const library = await instance.music.getLibrary();
    const sections = library.sections || library.contents || [];
    const allItems = [];
    for (const section of sections) {
      const items = section.contents || section.items || [];
      if (Array.isArray(items)) allItems.push(...items);
      else if (section && typeof section === 'object') allItems.push(section);
    }
    const tracks = allItems.map(mapTrack).filter((t) => t.id && t.id.length === 11);
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/playlists', async (_req, res) => {
  try {
    const instance = await getYT();
    const library = await instance.music.getLibrary();
    const sections = library.sections || library.contents || [];
    const rows = [];
    for (const section of sections) {
      const items = section.contents || section.items || [];
      if (Array.isArray(items)) rows.push(...items);
    }
    const tracks = rows
      .filter((item) => item.type === 'MusicTwoRowItem' && item.item_type === 'playlist')
      .map((item) => ({
        id: item.id || item.endpoint?.payload?.browseId,
        title: item.title?.toString() || 'Untitled Playlist',
        artist: item.subtitle?.toString() || 'Playlist',
        thumbnail: item.thumbnail?.url || item.thumbnails?.[0]?.url || ''
      }));
    return res.json(tracks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/stream/:videoId', async (req, res) => {
  let { videoId } = req.params;
  if (videoId.length !== 11 || videoId.startsWith('VL')) {
    try {
      const yt = await getYT();
      const pInfo = await yt.music.getPlaylist(videoId);
      const firstItem = pInfo.items?.[0];
      const firstId = firstItem?.id || firstItem?.video_id || firstItem?.endpoint?.payload?.videoId;
      if (firstId) videoId = firstId;
    } catch {}
  }

  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.time < 1000 * 60 * 45) {
    if (cached.url && !cached.directYT) return res.json({ url: cached.url, mimeType: cached.mimeType });
    return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: cached.mimeType });
  }

  try {
    const ytResult = await tryYouTubeDirect(videoId);
    if (ytResult) {
      urlCache.set(videoId, ytResult);
      if (ytResult.url && !ytResult.directYT) return res.json({ url: ytResult.url, mimeType: ytResult.mimeType });
      return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: ytResult.mimeType });
    }

    const pipedResult = await tryPiped(videoId);
    if (pipedResult) {
      urlCache.set(videoId, pipedResult);
      return res.json({ url: pipedResult.url, mimeType: pipedResult.mimeType });
    }

    const cobaltResult = await tryCobalt(videoId);
    if (cobaltResult) {
      urlCache.set(videoId, cobaltResult);
      return res.json({ url: cobaltResult.url, mimeType: cobaltResult.mimeType });
    }

    const ytDownloadResult = await tryYouTubeDownload(videoId);
    if (ytDownloadResult) {
      urlCache.set(videoId, ytDownloadResult);
      return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: ytDownloadResult.mimeType });
    }

    const invidiousResult = await tryInvidious(videoId);
    if (invidiousResult) {
      urlCache.set(videoId, invidiousResult);
      return res.json({ url: invidiousResult.url, mimeType: invidiousResult.mimeType });
    }

    return res.status(404).json({ error: 'All stream resolution methods failed.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/stream-proxy/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const cached = urlCache.get(videoId);
  if (!cached) return res.status(404).json({ error: 'Not cached.' });

  try {
    res.setHeader('Content-Type', cached.directYT ? 'audio/webm; codecs="opus"' : cached.mimeType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (cached.directYT) {
      try {
        const stream = await downloadWithClientFallback(videoId);
        for await (const chunk of stream) {
          if (!res.write(chunk)) await new Promise((r) => res.once('drain', r));
        }
        return res.end();
      } catch {
        const fallback = await tryPiped(videoId) || await tryCobalt(videoId) || await tryInvidious(videoId);
        if (!fallback?.url) {
          urlCache.delete(videoId);
          return res.status(404).json({ error: 'Track is unavailable from all providers.' });
        }
        urlCache.set(videoId, fallback);
        const response = await fetch(fallback.url);
        if (!response.ok && response.status !== 206) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
        res.status(response.status);
        res.setHeader('Content-Type', fallback.mimeType || 'audio/webm; codecs="opus"');
        if (!response.body) return res.end();
        const reader = response.body.getReader();
        const push = async () => {
          const { done, value } = await reader.read();
          if (done) return res.end();
          if (res.write(Buffer.from(value))) push(); else res.once('drain', push);
        };
        return push();
      }
    }

    if (cached.url) {
      const response = await fetch(cached.url);
      if (!response.ok && response.status !== 206) return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
      res.status(response.status);
      if (!response.body) return res.end();
      const reader = response.body.getReader();
      const push = async () => {
        const { done, value } = await reader.read();
        if (done) return res.end();
        if (res.write(Buffer.from(value))) push(); else res.once('drain', push);
      };
      return push();
    }

    return res.status(404).json({ error: 'Stream unavailable.' });
  } catch (err) {
    urlCache.delete(videoId);
    return res.status(500).json({ error: err.message || 'Unknown proxy error' });
  }
});

exports.api = functions.runWith({ timeoutSeconds: 540, memory: '1GB' }).https.onRequest(app);
