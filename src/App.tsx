import { useEffect, useRef, useState } from 'react';
import { usePlayerStore, Track } from './stores/playerStore';

function App() {
  const playerRef = useRef<HTMLDivElement>(null);
  const { currentTrack, isPlaying, isLoading, queue, currentIndex, playTrack, togglePlay, next, prev } = usePlayerStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!playerRef.current || !currentTrack) return;

    const videoId = currentTrack.id;
    playerRef.current.innerHTML = `
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
      const query = encodeURIComponent(search + ' music');
      const response = await fetch(
        `https://www.youtube.com/results?search_query=${query}&pbj=1`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const text = await response.text();

      const videoIds = [...text.matchAll(/"videoId":"([^"]+)"/g)].map(m => m[1]);
      const titles = [...text.matchAll(/"title":"([^"]+)"/g)].map(m => m[1]);
      const thumbs = [...text.matchAll(/ytimg\.com\/vi\/([^"\/]+)\/hqdefault/g)].map(m => m[1]);
      const channels = [...text.matchAll(/"longBylineText":"([^"]+)"/g)].map(m => m[1]);

      const uniqueIds = [...new Set(videoIds)].slice(0, 20);

      const tracks = uniqueIds.map((id, i) => ({
        id,
        title: decodeHTML(titles[i * 2] || 'Unknown Track'),
        artist: decodeHTML(channels[i] || 'YouTube'),
        thumbnail: thumbs[i] ? `https://i.ytimg.com/vi/${thumbs[i]}/hqdefault.jpg` : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      }));

      setResults(tracks);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }

    setSearching(false);
  }

  function decodeHTML(str: string): string {
    if (!str) return '';
    return str
      .replace(/\\u0026/g, '&')
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
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
          </>
        )}
      </div>

      <div ref={playerRef} style={{ display: currentTrack ? 'block' : 'none' }} />
    </div>
  );
}

export default App;