import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  queue: Track[];
  currentIndex: number;
  progress: number;
  duration: number;

  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  setProgress: (pct: number) => void;
  setDuration: (secs: number) => void;
  setIsLoading: (v: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  queue: [],
  currentIndex: 0,
  progress: 0,
  duration: 0,

  playTrack: (track, queue) => {
    const newQueue = queue || [track];
    const idx = newQueue.findIndex(t => t.id === track.id);
    set({
      currentTrack: track,
      queue: newQueue,
      currentIndex: idx >= 0 ? idx : 0,
      isPlaying: true,
      isLoading: false,
      progress: 0,
    });
  },

  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex } = get();
    const nextIdx = currentIndex + 1;
    if (nextIdx < queue.length) {
      const track = queue[nextIdx];
      set({ currentTrack: track, currentIndex: nextIdx, progress: 0 });
    } else {
      set({ isPlaying: false });
    }
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (currentIndex > 0) {
      const track = queue[currentIndex - 1];
      set({ currentTrack: track, currentIndex: currentIndex - 1, progress: 0 });
    }
  },

  setProgress: (pct) => set({ progress: pct }),
  setDuration: (secs) => set({ duration: secs }),
  setIsLoading: (v) => set({ isLoading: v }),
}));