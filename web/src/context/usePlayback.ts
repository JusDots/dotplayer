import { useContext } from 'react';
import { PlaybackContext } from './PlaybackContext';

export const usePlayback = () => {
  const context = useContext(PlaybackContext);
  if (!context) throw new Error('usePlayback must be used within PlaybackProvider');
  return context;
};
