import { Innertube } from 'youtubei.js';
import { apiUrl } from '../config';

let yt: Innertube | null = null;
// In production we rely on backend API routes for reliability.
const HAS_REMOTE_API = true;

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
];

export const getYTInstance = async (credentials?: any) => {
  if (!yt || credentials) {
    yt = await Innertube.create({
      retrieve_player: true,
      device_category: 'desktop',
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        let url = '';
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else {
          url = input.url;
        }

        const urlObj = new URL(url);

        // Fix for "Request with GET/HEAD method cannot have body" error in browser
        if (init?.body && (!init.method || ['GET', 'HEAD'].includes(init.method.toUpperCase()))) {
          init = { ...init, method: 'POST' };
        }

        // Use the local Vite proxy
        let proxyUrl = url;
        const headers = new Headers(init?.headers);
        
        if (urlObj.hostname.includes('www.youtube.com')) {
          proxyUrl = url.replace('https://www.youtube.com', '/yt-main');
        } else if (urlObj.hostname.includes('music.youtube.com')) {
          proxyUrl = url.replace('https://music.youtube.com', '/yt-music');
        } else if (urlObj.hostname.includes('youtubei.googleapis.com')) {
          proxyUrl = url.replace('https://youtubei.googleapis.com', '/yt-api');
        } else if (urlObj.hostname.includes('suggestqueries-clients6.google.com')) {
          proxyUrl = url.replace('https://suggestqueries-clients6.google.com', '/yt-suggest');
        } else if (urlObj.hostname.includes('oauth2.googleapis.com')) {
          proxyUrl = url.replace('https://oauth2.googleapis.com', '/yt-oauth');
        } else if (urlObj.hostname.includes('s.ytimg.com')) {
          proxyUrl = url.replace('https://s.ytimg.com', '/yt-img-s');
        } else if (urlObj.hostname.includes('googlevideo.com')) {
          // Playback proxy
          proxyUrl = '/yt-video' + urlObj.pathname + urlObj.search;
          headers.set('x-target-host', urlObj.host);
        }
        
        return fetch(proxyUrl, { ...init, headers });
      }
    });

    if (credentials && credentials.access_token !== 'GUEST') {
       console.log("[YTMusic] Signing in with provided credentials...");
       await yt.session.signIn(credentials);
    } else if (credentials && credentials.access_token === 'GUEST') {
       console.log("[YTMusic] Debug bypass active: Using guest session.");
    }
  }
  return yt;
};

const mapTracks = (items: any[]): Track[] => {
  const tracks: any[] = [];
  
  for (const item of items) {
    const type = item.type;
    const id = item.id || item.video_id || item.endpoint?.payload?.videoId || (item as any).videoId;
    
    const isTrack = type === 'MusicResponsiveListItem' || 
                    type === 'MusicTwoRowItem' || 
                    type === 'MusicMultiRowListItem' ||
                    (item as any).videoId ||
                    type === 'YTNode'; // Be permissive

    if (id && (isTrack || item.title)) {
      tracks.push(item);
    }
  }

  return tracks.map((track) => {
    // Prioritize videoId specifically to avoid mapping playlists/browse items as playable tracks
    const videoId = track.video_id || track.videoId || track.endpoint?.payload?.videoId;
    const playlistId = track.playlist_id || track.playlistId || track.endpoint?.payload?.playlistId;
    
    let id = videoId || (playlistId ? null : track.id);
    if (!id && track.endpoint?.payload?.browseId) {
        id = track.endpoint.payload.browseId;
    }

    if (!id) return null;

    const title = track.title ? track.title.toString() : 'Unknown Title';
    
    // Extensive artist discovery
    let artist = 'Unknown Artist';
    if (track.artists?.[0]?.name) artist = track.artists[0].name;
    else if (track.author?.name) artist = track.author.name;
    else if (track.authors?.[0]?.name) artist = track.authors[0].name;
    else if (track.subtitle?.toString()) {
       const sub = track.subtitle.toString();
       artist = sub.split(' • ')[0] || sub;
    }
    
    // Thumbnail discovery
    let thumb = '';
    const thumbnails = track.thumbnails || track.thumbnail;
    if (Array.isArray(thumbnails) && thumbnails.length > 0) {
      thumb = thumbnails[0].url;
    } else if (thumbnails?.url) {
      thumb = thumbnails.url;
    }

    return {
      id: id as string,
      title: title,
      artist: artist,
      thumbnail: thumb,
      isPlaylist: !!playlistId && !videoId
    };
  }).filter(t => t !== null && !t.isPlaylist) as any[];
};

export const getRecommendations = async () => {
  try {
    const piped = await fetch(apiUrl('/api/piped/home'));
    if (piped.ok) {
      const data = await piped.json();
      if (Array.isArray(data) && data.length) {
        console.log('[YTMusic] Using Piped recommendations:', data.length);
        return data as Track[];
      }
    }
  } catch (err) {
    console.warn('[YTMusic] Piped recommendations unavailable, falling back to YT feed.');
  }

  if (HAS_REMOTE_API) return [];

  try {
    const instance = await getYTInstance();
    const music = instance.music;
    const home = await music.getHomeFeed();
    
    console.log("[YTMusic] Home feed sections:", home.sections?.length);
    
    const sections = (home.sections as any[]) || [];
    const allItems: any[] = [];

    for (const section of sections) {
      const items = section.contents || (section as any).items || [];
      if (Array.isArray(items)) {
        allItems.push(...items);
      }
    }

    return mapTracks(allItems);
  } catch (err) {
    console.error("[YTMusic] Error fetching recommendations:", err);
    throw err;
  }
};

export const getHistory = async () => {
  if (HAS_REMOTE_API) {
    try {
      const res = await fetch(apiUrl('/api/history'));
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  }
  try {
    const instance = await getYTInstance();
    // YouTube Music history is often just the main history
    const history = await instance.getHistory();
    console.log("[YTMusic] History items:", (history as any).contents?.length);
    return mapTracks((history as any).contents || []);
  } catch (err) {
    console.error("[YTMusic] Error fetching history:", err);
    return [];
  }
};

export const getLibrary = async () => {
  if (HAS_REMOTE_API) {
    try {
      const res = await fetch(apiUrl('/api/library'));
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  }
  try {
    const instance = await getYTInstance();
    const library = await instance.music.getLibrary();
    
    const allItems: any[] = [];
    // Library structure can vary, try to find sections or contents
    const sections = (library as any).sections || (library as any).contents || [];
    
    if (Array.isArray(sections)) {
        for (const section of sections) {
            const items = (section as any).contents || (section as any).items || [];
            if (Array.isArray(items)) allItems.push(...items);
            else if (typeof section === 'object' && section !== null) allItems.push(section);
        }
    }
    
    console.log("[YTMusic] Library items extracted:", allItems.length);
    return mapTracks(allItems);
  } catch (err) {
    console.error("[YTMusic] Error fetching library:", err);
    return [];
  }
};

export const getPlaylists = async () => {
  if (HAS_REMOTE_API) {
    try {
      const res = await fetch(apiUrl('/api/playlists'));
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  }
  try {
    const instance = await getYTInstance();
    const playlists = await instance.music.getLibrary(); // Often library contains playlists
    // If we want specifically playlists, there's music.getLibrary() but it returns a feed
    // We can filter for Playlist types in our extraction or use a different endpoint
    
    console.log("[YTMusic] Fetching playlists from library...");
    const sections = (playlists as any).sections || (playlists as any).contents || [];
    const allItems: any[] = [];
    
    if (Array.isArray(sections)) {
        for (const section of sections) {
            const items = (section as any).contents || (section as any).items || [];
            if (Array.isArray(items)) {
                for (const item of items) {
                    if (item.type === 'MusicTwoRowItem' && item.item_type === 'playlist') {
                        allItems.push(item);
                    }
                }
            }
        }
    }
    
    return allItems.map(item => ({
        id: item.id || item.endpoint?.payload?.browseId,
        title: item.title?.toString() || 'Untitled Playlist',
        artist: item.subtitle?.toString() || 'Playlist',
        thumbnail: item.thumbnail?.url || item.thumbnails?.[0]?.url || ''
    }));
  } catch (err) {
    console.error("[YTMusic] Error fetching playlists:", err);
    return [];
  }
};

export const getStreamUrl = async (videoId: string): Promise<{ url: string; mimeType: string }> => {
  try {
    const instance = await getYTInstance();
    
    // Resolve playlist IDs to real video IDs
    if (videoId.length !== 11 || videoId.startsWith('VL')) {
      try {
          console.log("[YTMusic] Resolving playlist to track:", videoId);
          const pInfo = await instance.music.getPlaylist(videoId);
          const firstItem = pInfo.items?.[0] as any;
          const firstId = firstItem?.id || firstItem?.video_id || firstItem?.endpoint?.payload?.videoId;
          if (firstId) videoId = firstId;
      } catch (e: any) {
          console.warn("[YTMusic] Failed to resolve playlist:", e.message);
      }
    }

    const format = await instance.getStreamingData(videoId, { type: 'audio', quality: 'best' });
    
    if (format?.url) {
       console.log("[YTMusic] Found direct audio url:", format.mime_type);
       return { url: format.url, mimeType: format.mime_type };
    }
  } catch(e) {
     console.warn("[YTMusic] Direct extraction failed, falling back to server...", e);
  }

  // Hybrid mode: try public Piped APIs directly from browser first.
  // This avoids hitting our backend for every playback request.
  for (const base of CLIENT_PIPED_APIS) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${base}/streams/${videoId}`, { signal: controller.signal });
      window.clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      const stream =
        data?.audioStreams?.find((s: any) => s?.mimeType?.includes('opus') && s?.url) ||
        data?.audioStreams?.find((s: any) => s?.mimeType?.includes('audio') && s?.url);
      if (stream?.url) {
        console.log('[YTMusic] Using direct browser Piped stream:', base);
        return { url: stream.url, mimeType: stream.mimeType || 'audio/webm; codecs="opus"' };
      }
    } catch {
      // try next instance
    }
  }

  const res = await fetch(apiUrl(`/api/stream/${videoId}`));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server returned ${res.status}`);
  }
  return res.json();
};

export const search = async (query: string) => {
  try {
    const piped = await fetch(apiUrl(`/api/piped/search?q=${encodeURIComponent(query)}`));
    if (piped.ok) {
      const data = await piped.json();
      if (Array.isArray(data)) {
        console.log('[YTMusic] Using Piped search results:', data.length);
        return data as Track[];
      }
    }
  } catch {
    console.warn('[YTMusic] Piped search unavailable, falling back to YT search.');
  }

  if (HAS_REMOTE_API) return [];

  try {
    const instance = await getYTInstance();
    const result: any = await instance.music.search(query);
    console.log("[YTMusic] Search result sections:", (result as any).sections?.length);
    
    const allItems: any[] = [];
    const sections = (result as any).sections || (result as any).contents || [];
    
    for (const section of (sections as any[])) {
        // Handle direct items or items inside shelves/sections
        const items = section.contents || section.items || (Array.isArray(section) ? section : null);
        if (Array.isArray(items)) {
            allItems.push(...items);
        } else if (typeof section === 'object' && !section.contents && !section.items) {
           // If it's already an item
           allItems.push(section);
        }
    }
    
    return mapTracks(allItems);
  } catch (err) {
    console.error("[YTMusic] Error searching:", err);
    return [];
  }
};

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}
