import { Innertube } from 'youtubei.js';
import { apiUrl } from '../config';

let yt: Innertube | null = null;
// In production we rely on backend API routes for reliability.
// In production we rely on backend API routes for reliability.
if (typeof window !== 'undefined' && import.meta.env.PROD && !apiUrl('').startsWith('http')) {
  console.warn(
    '%c[DotPlayer] WARNING: No VITE_API_BASE_URL detected in production!',
    'color: red; font-size: 14px; font-weight: bold;'
  );
  console.warn(
    'GitHub Pages is a static host and cannot run the DotPlayer backend. ' +
    'Please set VITE_API_BASE_URL to your working Vercel URL in your GitHub Repository Variables.'
  );
}
const CLIENT_PIPED_APIS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi-libre.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.nosebs.ru',
  'https://pipedapi.drgns.space',
  'https://pipedapi.syncpundit.io',
  'https://pipedapi.ducks.party',
  'https://api.piped.yt',
  'https://api.piped.projectsegfau.lt',
  'https://piped-api.garudalinux.org'
];

// Helper to fetch from Piped with multiple instance fallback
const fetchPiped = async (path: string) => {
  for (const base of CLIENT_PIPED_APIS) {
    try {
      const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const mapPipedTrack = (item: any): Track | null => {
  const id = item.videoId || item.id;
  if (!id || typeof id !== 'string') return null;
  return {
    id,
    title: item.title || 'Unknown',
    artist: item.uploaderName || item.uploader || 'Unknown',
    thumbnail: item.thumbnail || item.thumbnailUrl || ''
  };
};

export const getYTInstance = async (credentials?: any) => {
  if (!yt || credentials) {
    yt = await Innertube.create({
      retrieve_player: true,
      device_category: 'desktop',
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        let url = (typeof input === 'string') ? input : (input instanceof URL ? input.toString() : input.url);
        const urlObj = new URL(url);

        if (init?.body && (!init.method || ['GET', 'HEAD'].includes(init.method.toUpperCase()))) {
          init = { ...init, method: 'POST' };
        }

        let proxyUrl = url;
        const headers = new Headers(init?.headers);
        
        if (urlObj.hostname.includes('www.youtube.com')) proxyUrl = url.replace('https://www.youtube.com', '/yt-main');
        else if (urlObj.hostname.includes('music.youtube.com')) proxyUrl = url.replace('https://music.youtube.com', '/yt-music');
        else if (urlObj.hostname.includes('youtubei.googleapis.com')) proxyUrl = url.replace('https://youtubei.googleapis.com', '/yt-api');
        else if (urlObj.hostname.includes('suggestqueries-clients6.google.com')) proxyUrl = url.replace('https://suggestqueries-clients6.google.com', '/yt-suggest');
        else if (urlObj.hostname.includes('googlevideo.com')) {
          proxyUrl = '/yt-video' + urlObj.pathname + urlObj.search;
          headers.set('x-target-host', urlObj.host);
        }
        
        return fetch(proxyUrl, { ...init, headers });
      }
    });

    if (credentials && credentials.access_token !== 'GUEST') {
       await yt.session.signIn(credentials);
    }
  }
  return yt;
};


export const getRecommendations = async () => {
  // 1. Try backend first (for library integration if available)
  try {
    const res = await fetch(apiUrl('/api/piped/home'));
    if (res.ok) return await res.json();
  } catch {}

  // 2. Browser-side Piped fallback (Crucial for GitHub Pages if backend is slow/down)
  console.log('[YTMusic] Backend home failed, trying direct Piped...');
  const data = await fetchPiped('/trending?region=US') || await fetchPiped('/popular');
  if (data) {
    const items = Array.isArray(data) ? data : (data.items || []);
    return items.map(mapPipedTrack).filter(Boolean) as Track[];
  }

  return [];
};

export const getHistory = async () => {
  try {
    const res = await fetch(apiUrl('/api/history'));
    if (res.ok) return await res.json();
  } catch {}
  return [];
};

export const getLibrary = async () => {
  try {
    const res = await fetch(apiUrl('/api/library'));
    if (res.ok) return await res.json();
  } catch {}
  return [];
};

export const getPlaylists = async () => {
  try {
    const res = await fetch(apiUrl('/api/playlists'));
    if (res.ok) return await res.json();
  } catch {}
  return [];
};

export const getStreamUrl = async (videoId: string): Promise<{ url: string; mimeType: string }> => {
  // 1. Try multiple Piped instances directly from browser (Fastest & most reliable bypass)
  console.log('[YTMusic] Attempting direct Piped stream for:', videoId);
  for (const base of CLIENT_PIPED_APIS) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      const stream = data?.audioStreams?.find((s: any) => s?.mimeType?.includes('opus') && s?.url) ||
                     data?.audioStreams?.find((s: any) => s?.mimeType?.includes('audio') && s?.url);
      if (stream?.url) {
        return { url: stream.url, mimeType: stream.mimeType || 'audio/webm; codecs="opus"' };
      }
    } catch {}
  }

  // 2. Fallback to Vercel backend
  console.log('[YTMusic] Direct Piped failed, falling back to backend...');
  const res = await fetch(apiUrl(`/api/stream/${videoId}`));
  if (res.ok) {
    const data = await res.json();
    if (data.url && data.url.startsWith('/')) data.url = apiUrl(data.url);
    return data;
  }

  throw new Error('All playback methods failed.');
};

export const search = async (query: string) => {
  // 1. Try Piped directly from browser first (high reliability)
  const data = await fetchPiped(`/search?q=${encodeURIComponent(query)}&filter=videos`);
  if (data) {
    const items = Array.isArray(data) ? data : (data.items || []);
    return items.map(mapPipedTrack).filter(Boolean) as Track[];
  }

  // 2. Fallback to backend
  try {
    const res = await fetch(apiUrl(`/api/piped/search?q=${encodeURIComponent(query)}`));
    if (res.ok) return await res.json();
  } catch {}

  return [];
};

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}
