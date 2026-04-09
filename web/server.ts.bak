import express from 'express';
import cors from 'cors';
import { Innertube, UniversalCache } from 'youtubei.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface CachedStream { url?: string; mimeType: string; time: number; directYT: boolean; contentLength?: string }
const urlCache = new Map<string, CachedStream>();

let ytInstance: Innertube | null = null;

const getYT = async () => {
  if (!ytInstance) {
    ytInstance = await Innertube.create({
      cache: new UniversalCache(false),
      retrieve_player: true,
    });
  }
  return ytInstance;
};

// Cleanup cache
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of urlCache.entries()) {
    if (now - val.time > 1000 * 60 * 45) urlCache.delete(key);
  }
}, 1000 * 60 * 30);

function pickBestAudio(formats: any[]): any {
  const audioFmts = formats
    .filter((f: any) => f.mime_type?.includes('audio'))
    .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return audioFmts.find((f: any) => f.mime_type?.includes('opus')) || audioFmts[0];
}

async function tryYouTubeDirect(videoId: string): Promise<CachedStream | null> {
  const yt = await getYT();
  try {
    // Prefer a fully resolved URL so we can proxy a concrete upstream stream.
    // This avoids caching undecipherable formats that later fail with 500.
    const streamData = await (yt as any).getStreamingData(videoId, { type: 'audio', quality: 'best' });
    if (streamData?.url && streamData?.mime_type) {
      console.log(`[Server] Success via YT StreamingData | mime: ${streamData.mime_type}`);
      return {
        url: streamData.url,
        mimeType: streamData.mime_type,
        time: Date.now(),
        directYT: false,
        contentLength: streamData.content_length
      };
    }
  } catch (e: any) {
    console.warn(`[Server] YT StreamingData failed:`, e.message?.slice(0, 100));
  }

  try {
    const info = await yt.getBasicInfo(videoId);
    const formats = info.streaming_data?.adaptive_formats ?? [];
    const best = pickBestAudio(formats);
    if (best?.url && best?.mime_type) {
      console.log(`[Server] Success via YT BasicInfo URL | mime: ${best.mime_type}`);
      return {
        url: best.url,
        mimeType: best.mime_type,
        time: Date.now(),
        directYT: false,
        contentLength: best.content_length
      };
    }
  } catch (e: any) {
    console.warn(`[Server] YT BasicInfo failed:`, e.message?.slice(0, 100));
  }
  return null;
}

async function tryYouTubeDownload(videoId: string): Promise<CachedStream | null> {
  try {
    const yt = await getYT();
    const info = await yt.getBasicInfo(videoId, { client: 'IOS' as any });
    const format = (info as any).chooseFormat?.({ type: 'audio', quality: 'best' });
    // Verify at least one download client can actually open the stream.
    // Without this, /api/stream may return a proxy URL that always 500s.
    const probe = await downloadWithClientFallback(videoId);
    if ((probe as any)?.return) {
      try { await (probe as any).return(); } catch {}
    }
    // Use proxied download stream for reliability; direct format URLs can be
    // undeciphered/expired and trigger browser "no supported source".
    // Force a browser-safe audio type for proxied yt.download streams.
    // The downloaded container can differ from guessed format metadata.
    const mimeType = 'audio/webm; codecs="opus"';
    const contentLength = format?.content_length;
    console.log('[Server] Success via YT download fallback (IOS client)');
    return {
      mimeType,
      time: Date.now(),
      directYT: true,
      contentLength,
    };
  } catch (e: any) {
    console.warn(`[Server] YT download fallback failed:`, e.message?.slice(0, 100));
  }
  return null;
}

const PIPED_INSTANCES = [
  'https://piped.privacydev.net/api',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://pipedapi.drgns.space',
  'https://pipedapi.syncpundit.io',
  'https://pipedapi.ducks.party',
  'https://api.piped.yt',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.in.projectsegfau.lt',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.adminforge.de',
  'https://piped-api.codespace.cz',
];

const INVIDIOUS_INSTANCES = [
  'https://invidious.privacyredirect.com',
  'https://inv.nadeko.net',
  'https://invidious.projectsegfau.lt',
  'https://iv.ggtyler.dev',
  'https://invidious.fdn.fr',
];

let dynamicPipedInstances: string[] = [];
let dynamicInvidiousInstances: string[] = [];
let instanceListLastRefresh = 0;

async function downloadWithClientFallback(videoId: string): Promise<AsyncIterable<Uint8Array>> {
  const yt = await getYT();
  const clients = ['IOS', 'ANDROID', 'YTMUSIC'];
  let lastError: any = null;

  for (const client of clients) {
    try {
      return await yt.download(videoId, {
        type: 'audio',
        quality: 'best',
        client
      } as any);
    } catch (e: any) {
      lastError = e;
      console.warn(`[Server] yt.download failed for client ${client}: ${e.message?.slice(0, 100)}`);
    }
  }

  throw lastError || new Error('All YouTube download clients failed.');
}

async function refreshInstanceLists(): Promise<void> {
  const now = Date.now();
  if (now - instanceListLastRefresh < 1000 * 60 * 20) return;
  instanceListLastRefresh = now;

  try {
    const res = await fetch('https://piped-instances.kavin.rocks/');
    if (res.ok) {
      const data = await res.json();
      const discovered = (Array.isArray(data) ? data : [])
        .map((i: any) => i?.api_url)
        .filter((u: any) => typeof u === 'string' && u.startsWith('https://'));
      if (discovered.length) {
        dynamicPipedInstances = [...new Set(discovered)];
        console.log(`[Server] Loaded ${dynamicPipedInstances.length} dynamic Piped instances`);
      }
    }
  } catch (e: any) {
    console.warn('[Server] Failed to refresh Piped instances:', e.message?.slice(0, 100));
  }

  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=api,health');
    if (res.ok) {
      const data = await res.json();
      const discovered = (Array.isArray(data) ? data : [])
        .map((entry: any) => {
          const host = entry?.[0];
          if (!host || typeof host !== 'string') return null;
          if (host.includes('.onion') || host.includes('.i2p')) return null;
          return `https://${host}`;
        })
        .filter((u: any) => typeof u === 'string');
      if (discovered.length) {
        dynamicInvidiousInstances = [...new Set(discovered)];
        console.log(`[Server] Loaded ${dynamicInvidiousInstances.length} dynamic Invidious instances`);
      }
    }
  } catch (e: any) {
    console.warn('[Server] Failed to refresh Invidious instances:', e.message?.slice(0, 100));
  }
}

async function tryPiped(videoId: string): Promise<CachedStream | null> {
  await refreshInstanceLists();
  const allInstances = [...dynamicPipedInstances, ...PIPED_INSTANCES];
  for (const apiBase of [...new Set(allInstances)]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${apiBase}/streams/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const stream = data.audioStreams?.find((s: any) => s.mimeType?.includes('opus') && s.url) ||
                     data.audioStreams?.find((s: any) => s.mimeType?.includes('audio') && s.url);

      if (stream?.url) {
        console.log(`[Server] Piped success via ${apiBase}`);
        return { url: stream.url, mimeType: stream.mimeType, time: Date.now(), directYT: false };
      }
    } catch (e: any) {}
  }
  return null;
}

async function tryInvidious(videoId: string): Promise<CachedStream | null> {
  await refreshInstanceLists();
  const allInstances = [...dynamicInvidiousInstances, ...INVIDIOUS_INSTANCES];
  for (const base of [...new Set(allInstances)]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}/api/v1/videos/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      const stream = data?.adaptiveFormats?.find((s: any) => s.type?.includes('audio') && s.url) ||
                     data?.formatStreams?.find((s: any) => s.type?.includes('audio') && s.url);

      if (stream?.url) {
        console.log(`[Server] Invidious success via ${base}`);
        return {
          url: stream.url,
          mimeType: stream.type || 'audio/webm',
          time: Date.now(),
          directYT: false,
          contentLength: stream.clen
        };
      }
    } catch (e: any) {}
  }
  return null;
}

async function tryCobalt(videoId: string): Promise<CachedStream | null> {
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        isAudioOnly: true,
        audioFormat: 'mp3',
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const url =
      data?.url ||
      data?.download_url ||
      data?.media?.url ||
      data?.audio?.url ||
      data?.files?.audio;

    if (typeof url === 'string' && url.startsWith('http')) {
      console.log('[Server] Cobalt success');
      return {
        url,
        mimeType: 'audio/mpeg',
        time: Date.now(),
        directYT: false,
      };
    }
  } catch (e: any) {
    console.warn('[Server] Cobalt failed:', e.message?.slice(0, 100));
  }

  return null;
}

function extractVideoIdFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
}

function normalizeThumb(url?: string): string {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function mapPipedTrack(item: any): { id: string; title: string; artist: string; thumbnail: string } | null {
  const id = item.videoId || item.id || extractVideoIdFromUrl(item.url);
  if (!id || typeof id !== 'string' || id.length !== 11) return null;
  const title = item.title || item.name || 'Unknown';
  const artist = item.uploaderName || item.uploader || item.artist || 'Unknown';
  const thumbnail = normalizeThumb(item.thumbnail || item.thumbnailUrl || item.uploaderAvatar);
  return { id, title, artist, thumbnail };
}

async function fetchPipedJson(path: string): Promise<any[] | null> {
  await refreshInstanceLists();
  const allInstances = [...dynamicPipedInstances, ...PIPED_INSTANCES];
  for (const apiBase of [...new Set(allInstances)]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${apiBase}${path}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
    } catch {}
  }
  return null;
}

app.get('/api/stream/:videoId', async (req, res) => {
  let { videoId } = req.params;
  
  if (videoId.length !== 11 || videoId.startsWith('VL')) {
      try {
          const yt = await getYT();
          const pInfo = await yt.music.getPlaylist(videoId);
          const firstItem = pInfo.items?.[0] as any;
          const firstId = firstItem?.id || firstItem?.video_id || firstItem?.endpoint?.payload?.videoId;
          if (firstId) videoId = firstId;
      } catch (e: any) {}
  }

  const cached = urlCache.get(videoId);
  if (cached && Date.now() - cached.time < 1000 * 60 * 45) {
    if (cached.url && !cached.directYT) {
      return res.json({ url: cached.url, mimeType: cached.mimeType });
    }
    return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: cached.mimeType });
  }

  try {
    const ytResult = await tryYouTubeDirect(videoId);
    if (ytResult) {
      urlCache.set(videoId, ytResult);
      if (ytResult.url && !ytResult.directYT) {
        return res.json({ url: ytResult.url, mimeType: ytResult.mimeType });
      }
      return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: ytResult.mimeType });
    }

    const pipedResult = await tryPiped(videoId);
    if (pipedResult) {
      urlCache.set(videoId, pipedResult);
      return res.json({ url: pipedResult.url!, mimeType: pipedResult.mimeType });
    }

    const cobaltResult = await tryCobalt(videoId);
    if (cobaltResult) {
      urlCache.set(videoId, cobaltResult);
      return res.json({ url: cobaltResult.url!, mimeType: cobaltResult.mimeType });
    }

    const ytDownloadResult = await tryYouTubeDownload(videoId);
    if (ytDownloadResult) {
      urlCache.set(videoId, ytDownloadResult);
      return res.json({ url: `/api/stream-proxy/${videoId}`, mimeType: ytDownloadResult.mimeType });
    }

    const invidiousResult = await tryInvidious(videoId);
    if (invidiousResult) {
      urlCache.set(videoId, invidiousResult);
      return res.json({ url: invidiousResult.url!, mimeType: invidiousResult.mimeType });
    }

    res.status(404).json({ error: 'All stream resolution methods failed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
      } catch (downloadErr: any) {
        console.warn(`[Server] Direct YT download failed, trying external fallbacks: ${downloadErr.message?.slice(0, 120)}`);

        const fallback = await tryPiped(videoId) || await tryCobalt(videoId) || await tryInvidious(videoId);
        if (!fallback?.url) {
          urlCache.delete(videoId);
          return res.status(404).json({ error: 'Track is unavailable from all providers.' });
        }

        urlCache.set(videoId, fallback);
        const fetchHeaders: Record<string, string> = {};
        if (req.headers.range) fetchHeaders['Range'] = req.headers.range as string;
        const response = await fetch(fallback.url, { headers: fetchHeaders });

        if (!response.ok && response.status !== 206) {
          throw new Error(`External fallback upstream error: ${response.status}`);
        }

        res.status(response.status);
        res.setHeader('Content-Type', fallback.mimeType || 'audio/webm; codecs="opus"');
        if (response.headers.get('content-length')) res.setHeader('Content-Length', response.headers.get('content-length')!);
        if (response.headers.get('content-range')) res.setHeader('Content-Range', response.headers.get('content-range')!);

        if (!response.body) return res.end();
        const reader = response.body.getReader();
        const push = async () => {
          try {
            const { done, value } = await reader.read();
            if (done) return res.end();
            if (res.write(Buffer.from(value))) push(); else res.once('drain', push);
          } catch {
            if (!res.headersSent) res.status(500).end();
          }
        };
        return push();
      }
    } else if (cached.url) {
      // Fallback to fetch for Piped
      const fetchHeaders: Record<string, string> = {};
      if (req.headers.range) fetchHeaders['Range'] = req.headers.range as string;
      const response = await fetch(cached.url, { headers: fetchHeaders });
      
      if (!response.ok && response.status !== 206) {
        // If upstream URL is stale/blocked, fallback to direct YT download streaming.
        // This recovers tracks where third-party URLs intermittently return 4xx/5xx.
        urlCache.delete(videoId);
        console.warn(`[Server] Upstream URL failed (${response.status}), trying direct YT fallback`);
        try {
          const stream = await downloadWithClientFallback(videoId);

          res.status(req.headers.range ? 206 : 200);
          res.setHeader('Content-Type', cached.mimeType || 'audio/webm; codecs="opus"');
          for await (const chunk of stream) {
            if (!res.write(chunk)) await new Promise((r) => res.once('drain', r));
          }
          return res.end();
        } catch (fallbackErr: any) {
          return res.status(response.status).json({
            error: `Upstream error: ${response.status}; direct fallback failed: ${fallbackErr.message || 'unknown'}`
          });
        }
      }

      res.status(response.status);
      if (response.headers.get('content-length')) res.setHeader('Content-Length', response.headers.get('content-length')!);
      if (response.headers.get('content-range')) res.setHeader('Content-Range', response.headers.get('content-range')!);
      
      if (!response.body) return res.end();
      const reader = response.body.getReader();
      const push = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) return res.end();
          if (res.write(Buffer.from(value))) push(); else res.once('drain', push);
        } catch (e) {
          if (!res.headersSent) res.status(500).end();
        }
      };
      return push();
    }
  } catch (err: any) {
    urlCache.delete(videoId);
    const message = err?.message || 'Unknown proxy error';
    if (!res.headersSent) {
      if (message.includes('non 2xx')) {
        return res.status(404).json({ error: 'Track is unavailable from all providers.' });
      }
      return res.status(500).json({ error: message });
    }
  }
});

app.get('/api/home', async (req, res) => {
  try {
    const instance = await getYT();
    const home = await instance.music.getHomeFeed();
    const sections = (home.sections as any[]) || [];
    const allItems: any[] = [];
    for (const section of sections) {
      const items = section.contents || (section as any).items || [];
      if (Array.isArray(items)) allItems.push(...items);
    }
    const tracks = allItems.map(item => {
      const id = item.video_id || item.videoId || item.endpoint?.payload?.videoId || item.id;
      const title = item.title ? item.title.toString() : 'Unknown';
      let artist = 'Unknown';
      if (item.artists?.[0]?.name) artist = item.artists[0].name;
      const thumb = item.thumbnails?.[0]?.url || item.thumbnail?.url || '';
      return { id, title, artist, thumbnail: thumb };
    }).filter(t => t.id && typeof t.id === 'string' && t.id.length === 11);
    
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', async (_req, res) => {
  try {
    const instance = await getYT();
    const history = await instance.getHistory();
    const items = ((history as any).contents || []) as any[];
    const tracks = items.map(item => {
      const id = item.video_id || item.videoId || item.endpoint?.payload?.videoId || item.id;
      const title = item.title ? item.title.toString() : 'Unknown';
      let artist = 'Unknown';
      if (item.artists?.[0]?.name) artist = item.artists[0].name;
      const thumb = item.thumbnails?.[0]?.url || item.thumbnail?.url || '';
      return { id, title, artist, thumbnail: thumb };
    }).filter(t => t.id && typeof t.id === 'string' && t.id.length === 11);
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/library', async (_req, res) => {
  try {
    const instance = await getYT();
    const library = await instance.music.getLibrary();
    const sections = ((library as any).sections || (library as any).contents || []) as any[];
    const allItems: any[] = [];
    for (const section of sections) {
      const items = (section as any).contents || (section as any).items || [];
      if (Array.isArray(items)) allItems.push(...items);
      else if (typeof section === 'object' && section !== null) allItems.push(section);
    }
    const tracks = allItems.map(item => {
      const id = item.video_id || item.videoId || item.endpoint?.payload?.videoId || item.id;
      const title = item.title ? item.title.toString() : 'Unknown';
      let artist = 'Unknown';
      if (item.artists?.[0]?.name) artist = item.artists[0].name;
      const thumb = item.thumbnails?.[0]?.url || item.thumbnail?.url || '';
      return { id, title, artist, thumbnail: thumb };
    }).filter(t => t.id && typeof t.id === 'string' && t.id.length === 11);
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/playlists', async (_req, res) => {
  try {
    const instance = await getYT();
    const library = await instance.music.getLibrary();
    const sections = ((library as any).sections || (library as any).contents || []) as any[];
    const rows: any[] = [];
    for (const section of sections) {
      const items = (section as any).contents || (section as any).items || [];
      if (Array.isArray(items)) rows.push(...items);
    }
    const tracks = rows
      .filter(item => item.type === 'MusicTwoRowItem' && item.item_type === 'playlist')
      .map(item => ({
        id: item.id || item.endpoint?.payload?.browseId,
        title: item.title?.toString() || 'Untitled Playlist',
        artist: item.subtitle?.toString() || 'Playlist',
        thumbnail: item.thumbnail?.url || item.thumbnails?.[0]?.url || ''
      }));
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/piped/home', async (_req, res) => {
  try {
    const trending = await fetchPipedJson('/trending?region=US') || await fetchPipedJson('/popular');
    if (!trending) return res.status(404).json({ error: 'No Piped instances available.' });
    const tracks = trending.map(mapPipedTrack).filter(Boolean).slice(0, 80);
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Server] DotPlayer API server running on http://localhost:${PORT}`);
  });
}

export default app;
