interface HistoryTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  timestamp: number;
}

const HISTORY_KEY = 'dotplayer_history';

export const addToHistory = (track: { id: string, title: string, artist: string, thumbnail: string }) => {
  const historyRaw = localStorage.getItem(HISTORY_KEY);
  let history: HistoryTrack[] = historyRaw ? JSON.parse(historyRaw) : [];
  
  // Remove if exists and add to front
  history = history.filter(t => t.id !== track.id);
  history.unshift({ ...track, timestamp: Date.now() });
  
  // Limit to 50 items
  history = history.slice(0, 50);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const getHistory = (): HistoryTrack[] => {
  const historyRaw = localStorage.getItem(HISTORY_KEY);
  return historyRaw ? JSON.parse(historyRaw) : [];
};
