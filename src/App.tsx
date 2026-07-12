import { useEffect, useRef, useState } from 'react';
import { usePlayerStore, Track } from './stores/playerStore';

const API = '/api';

function App() {
  const playerRef = useRef<HTMLDivElement>(null);
  const { currentTrack, isPlaying, isLoading, queue, currentIndex, progress, playTrack, togglePlay, next, prev } = usePlayerStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;

    const videoId = currentTrack.id;
    const playerEl = playerRef.current;
    playerEl.innerHTML = `
      <iframe
        id="yt-player"
        width="1"
        height="1"
        src="https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0"
        frameborder="0"
        allow="autoplay; encrypted-media"
        style="position:fixed;bottom:80px;right:10px;opacity:0;pointer-events:none;"
      ></iframe>
    `;
  }, [currentTrack?.id]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Search failed');
      const tracks = await res.json();
      setResults(tracks);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }
    setSearching(false);
  }

  return (
    <div className="app">
      <header className="header">
        <h1>DotPlayer</h1>
      </header>

      <main className="main">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search for a song..."
            className="search-input"
          />
          <button type="submit" disabled={searching}>
            {searching ? '...' : 'Search'}
          </button>
        </form>

        {results.length > 0 && (
          <div className="results">
            {results.map(track => (
              <div
                key={track.id}
                className={`track-item ${currentTrack?.id === track.id ? 'active' : ''}`}
                onClick={() => playTrack(track, results)}
              >
                <img src={track.thumbnail} alt="" className="track-thumb" />
                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <div className="track-artist">{track.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="player-bar">
        {currentTrack && (
          <>
            <div className="now-playing">
              <img src={currentTrack.thumbnail} alt="" className="player-thumb" />
              <div className="player-info">
                <div className="player-title">{currentTrack.title}</div>
                <div className="player-artist">{currentTrack.artist}</div>
              </div>
            </div>

            <div className="player-controls">
              <button onClick={prev} disabled={currentIndex === 0}>⏮</button>
              <button className="play-btn" onClick={togglePlay} disabled={isLoading}>
                {isLoading ? '⏳' : '▶'}
              </button>
              <button onClick={next} disabled={currentIndex >= queue.length - 1}>⏭</button>
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>

      <div ref={playerRef} style={{ display: currentTrack ? 'block' : 'none' }} />
    </div>
  );
}

export default App;