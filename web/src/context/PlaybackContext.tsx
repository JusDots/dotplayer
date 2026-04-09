import React, { createContext, useState, useRef, useCallback, useEffect } from 'react';
import Hls from 'hls.js';
import { addToHistory } from '../services/history';
import { getStreamUrl } from '../services/ytmusic';
import { updateDiscordPresence } from '../services/discordPresence';

interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface PlaybackContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isResolvingStream: boolean;
  playTrack: (track: Track) => void;
  playFromQueue: (tracks: Track[], index: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  togglePlay: () => void;
  progress: number;
  duration: number;
  seek: (pct: number) => void;
}

export const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolvingStream, setIsResolvingStream] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryAttemptedRef = useRef<Record<string, boolean>>({});
  const startedAtRef = useRef<number>(Date.now());
  const streamRequestIdRef = useRef<number>(0);
  const queueRef = useRef<Track[]>([]);
  const currentIndexRef = useRef<number>(-1);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const failOrAdvance = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const nextIndex = idx + 1;

    if (q.length && nextIndex < q.length) {
      const next = q[nextIndex];
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      setCurrentTrack(next);
      setIsPlaying(true);
      setIsResolvingStream(true);
      setProgress(0);
      retryAttemptedRef.current[next.id] = false;
      addToHistory(next);
      loadStream(next.id);
      return;
    }

    setIsPlaying(false);
    setIsResolvingStream(false);
    setProgress(0);
  }, []);

  const playTrack = useCallback((track: Track) => {
    setQueue([track]);
    setCurrentIndex(0);
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsResolvingStream(true);
    setProgress(0);
    retryAttemptedRef.current[track.id] = false;
    startedAtRef.current = Date.now();
    addToHistory(track);
    loadStream(track.id);
  }, []);

  const playFromQueue = useCallback((tracks: Track[], index: number) => {
    if (!tracks.length || index < 0 || index >= tracks.length) return;
    const track = tracks[index];
    setQueue(tracks);
    setCurrentIndex(index);
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsResolvingStream(true);
    setProgress(0);
    retryAttemptedRef.current[track.id] = false;
    startedAtRef.current = Date.now();
    addToHistory(track);
    loadStream(track.id);
  }, []);

  const nextTrack = useCallback(() => {
    if (!queue.length) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setIsPlaying(false);
      return;
    }
    const track = queue[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsResolvingStream(true);
    setProgress(0);
    retryAttemptedRef.current[track.id] = false;
    startedAtRef.current = Date.now();
    addToHistory(track);
    loadStream(track.id);
  }, [queue, currentIndex]);

  const prevTrack = useCallback(() => {
    if (!queue.length) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) return;
    const track = queue[prevIndex];
    setCurrentIndex(prevIndex);
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsResolvingStream(true);
    setProgress(0);
    retryAttemptedRef.current[track.id] = false;
    startedAtRef.current = Date.now();
    addToHistory(track);
    loadStream(track.id);
  }, [queue, currentIndex]);

  useEffect(() => {
    if (!currentTrack) return;
    updateDiscordPresence({
      title: currentTrack.title,
      artist: currentTrack.artist,
      artwork: currentTrack.thumbnail,
      playing: isPlaying,
      startedAt: startedAtRef.current,
    });
  }, [currentTrack, isPlaying]);

  // Track progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      if (queue.length && currentIndex + 1 < queue.length) {
        nextTrack();
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      setIsResolvingStream(false);
    };
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [queue, currentIndex, nextTrack]);

  const loadStream = useCallback(async function loadStreamInternal(videoId: string, retryCount = 0) {
    const audio = audioRef.current;
    if (!audio) return;
    const requestId = ++streamRequestIdRef.current;
    setIsResolvingStream(true);

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    audio.removeAttribute('src');
    audio.onerror = null;
    audio.onloadedmetadata = null;
    audio.load();
    audio.preload = 'auto';

    try {
      console.log('[Playback] Fetching stream info for', videoId);
      const streamInfo = await Promise.race([
        getStreamUrl(videoId),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Stream request timed out')), 12000);
        })
      ]);
      if (requestId !== streamRequestIdRef.current) return;
      const { url, mimeType } = streamInfo;
      console.log('[Playback] Got stream URL, mimeType:', mimeType);

      const retryOnce = () => {
        if (!retryAttemptedRef.current[videoId]) {
          retryAttemptedRef.current[videoId] = true;
          console.warn('[Playback] Stream failed, retrying once with fresh URL...', videoId);
          loadStreamInternal(videoId, retryCount + 1);
          return true;
        }
        return false;
      };

      if (mimeType.includes('mpegurl') || url.includes('.m3u8')) {
        // HLS stream
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: false });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(audio);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            audio.play().catch((err) => {
              console.error('[Playback] play() failed:', err);
              if (retryCount < 1 && retryOnce()) return;
              failOrAdvance();
            });
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            console.error('[Playback] HLS error:', data);
            if (data?.fatal && retryCount < 1 && retryOnce()) return;
            failOrAdvance();
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          audio.onerror = () => {
            if (retryCount < 1 && retryOnce()) return;
            failOrAdvance();
          };
          audio.src = url;
          audio.play().catch((err) => {
            console.error('[Playback] play() failed:', err);
            if (retryCount < 1 && retryOnce()) return;
            failOrAdvance();
          });
        }
      } else {
        // Direct audio URL (webm/opus/mp4)
        audio.onerror = () => {
          if (retryCount < 1 && retryOnce()) return;
          failOrAdvance();
        };
        audio.src = url;
        audio.play().catch((err) => {
          console.error('[Playback] play() failed:', err);
          if (retryCount < 1 && retryOnce()) return;
          failOrAdvance();
        });
      }
    } catch (err) {
      console.error('[Playback] Failed to load stream:', err);
      if (retryCount < 1 && !retryAttemptedRef.current[videoId]) {
        retryAttemptedRef.current[videoId] = true;
        await loadStreamInternal(videoId, retryCount + 1);
        return;
      }
      failOrAdvance();
    }
  }, [failOrAdvance]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
  }, []);

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isResolvingStream,
        playTrack,
        playFromQueue,
        nextTrack,
        prevTrack,
        togglePlay,
        progress,
        duration,
        seek
      }}
    >
      {children}
      <audio ref={audioRef} />
    </PlaybackContext.Provider>
  );
};
