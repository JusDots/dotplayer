import React from 'react';
import { usePlayback } from '../context/usePlayback';
import DotButton from './DotButton';
import './PlayerControls.css';

const PlayerControls: React.FC = () => {
  const { currentTrack, isPlaying, isResolvingStream, togglePlay, progress, duration, seek, nextTrack, prevTrack } = usePlayback();

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const elapsed = duration ? (progress / 100) * duration : 0;

  return (
    <div className="player-controls">
      <div
        className="progress-bar"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = ((e.clientX - rect.left) / rect.width) * 100;
          seek(pct);
        }}
        title="Click to seek"
      >
        <div className="progress-fill" style={{ width: `${progress}%` }}>
          <div className="progress-thumb" />
        </div>
      </div>
      <div className="player-content">
        <div className="mini-track-info">
          {currentTrack.thumbnail && (
            <div className="mini-thumb" style={{ backgroundImage: `url(${currentTrack.thumbnail})` }} />
          )}
          <div>
            <div className="mini-title">{currentTrack.title}</div>
            <div className="mini-artist">{currentTrack.artist}</div>
          </div>
        </div>
        <div className="main-controls">
          <DotButton onClick={prevTrack}>«</DotButton>
          <DotButton onClick={togglePlay} active={isPlaying}>
            {isPlaying ? '||' : '▶'}
          </DotButton>
          <DotButton onClick={nextTrack}>»</DotButton>
        </div>
        <div className="mini-time">
          {formatTime(elapsed)} / {formatTime(duration)}
          {isResolvingStream && !isPlaying && (
            <div className="mini-time-loading">FINDING SUITABLE INSTANCES FOR YOUR MEDIA</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
