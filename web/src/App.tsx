import { useState, useEffect, useCallback } from 'react'
import { PlaybackProvider } from './context/PlaybackContext'
import { usePlayback } from './context/usePlayback'
import { SettingsProvider } from './context/SettingsContext'
import { useSettings } from './context/useSettings'
import './App.css'
import DotButton from './components/DotButton'
import PlayerControls from './components/PlayerControls'
import Auth from './components/Auth'
import SettingsPanel from './components/SettingsPanel'
import { getRecommendations, getYTInstance, getHistory, getLibrary, getPlaylists, search } from './services/ytmusic'
import type { Track } from './services/ytmusic'
import { getHistory as getLocalRecent } from './services/history'

function AppContent() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [recent, setRecent] = useState<Track[]>([])
  const [ytHistory, setYTHistory] = useState<Track[]>([])
  const [library, setLibrary] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Track[]>([])
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'home' | 'recent' | 'history' | 'library' | 'playlists' | 'search'>('home')
  const [credentials, setCredentials] = useState<any>(null)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = useSettings();
  const { playFromQueue, togglePlay, nextTrack, prevTrack } = usePlayback();

  const handleLogin = useCallback((creds: any) => {
    setCredentials(creds);
  }, []);

  const fetchData = useCallback(async (v: typeof view, q?: string) => {
    setLoading(true)
    try {
      await getYTInstance(credentials);
      let data: Track[] = [];
      if (v === 'home') data = await getRecommendations();
      else if (v === 'history') data = await getHistory();
      else if (v === 'library') data = await getLibrary();
      else if (v === 'playlists') data = await getPlaylists();
      else if (v === 'search' && q) data = await search(q);
      
      if (v === 'home') setTracks(data);
      else if (v === 'history') setYTHistory(data);
      else if (v === 'library') setLibrary(data);
      else if (v === 'playlists') setPlaylists(data);
      else if (v === 'search') setSearchResults(data);
    } catch (error) {
      console.error(`Failed to fetch ${v}:`, error)
    } finally {
      setLoading(false)
    }
  }, [credentials]);

  useEffect(() => {
    if (!credentials) return;
    if (view !== 'search') fetchData(view);
    setRecent(getLocalRecent());
  }, [credentials, view, fetchData])

  useEffect(() => {
    if (!credentials) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = !!target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select');
      if (isTyping) return;

      const key = event.key;
      const kb = settings.keyBindings;
      if (key.toLowerCase() === kb.home.toLowerCase()) {
        setView('home');
      } else if (key.toLowerCase() === kb.history.toLowerCase()) {
        setView('history');
      } else if (key.toLowerCase() === kb.playlists.toLowerCase()) {
        setView('playlists');
      } else if (key.toLowerCase() === kb.library.toLowerCase()) {
        setView('library');
      } else if (key.toLowerCase() === kb.recent.toLowerCase()) {
        setView('recent');
      } else if (key === kb.playPause) {
        togglePlay();
      } else if (key === kb.next) {
        nextTrack();
      } else if (key === kb.prev) {
        prevTrack();
      } else if (key === kb.settings) {
        setSettingsOpen((s) => !s);
      } else {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [credentials, nextTrack, prevTrack, settings.keyBindings, togglePlay]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
        setView('search');
        fetchData('search', searchQuery);
    } else {
        setView('home');
        fetchData('home');
    }
  };

  if (!credentials) {
    return <Auth onLogin={handleLogin} />;
  }

  const getViewTitle = () => {
    switch(view) {
      case 'home': return 'RECOMMENDED';
      case 'recent': return 'RECENTLY_PLAYED';
      case 'history': return 'YT_HISTORY';
      case 'library': return 'MY_LIBRARY';
      case 'playlists': return 'PLAYLISTS';
      case 'search': return `RESULTS: ${searchQuery}`;
      default: return 'MUSIC';
    }
  };

  const currentList = {
    home: tracks,
    recent: recent,
    history: ytHistory,
    library: library,
    playlists: playlists,
    search: searchResults
  }[view] || [];

  return (
    <div className="app dot-grid">
      <header className="header">
        <h1 className="logo">DOT.PLAYER</h1>
        <form className="search-box" onSubmit={handleSearch}>
            <input 
                type="text" 
                placeholder="SEARCH_TRACKS..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
            />
        </form>
        <div className="user-controls" style={{ display: 'flex', gap: '10px' }}>
          <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => { setView('home'); fetchData('home'); }}>Recommended</DotButton>
          <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setSettingsOpen(true)}>Settings</DotButton>
          <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => { localStorage.removeItem('yt_credentials'); window.location.reload(); }}>Logout</DotButton>
        </div>
      </header>

      <main className="content">
        <section className="recommendations">
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2>{getViewTitle()}</h2>
            {view === 'recent' && (
              <div style={{ fontSize: '0.6rem', opacity: 0.5, cursor: 'pointer' }} onClick={() => { localStorage.removeItem('dotplayer_history'); setRecent([]); }}>CLEAR_ALL</div>
            )}
          </div>
          
          {loading ? (
            <div className="loading">LOADING_DATA...</div>
          ) : (
            <div className="track-list">
              {currentList.length > 0 ? (
                currentList.map((track: Track, idx: number) => (
                  <div
                    key={`${view}-${track.id}-${idx}`}
                    className="track-card"
                    onClick={() => (view === 'playlists' ? setView('library') : playFromQueue(currentList, idx))}
                  >
                    <div className="track-thumb" style={{ backgroundImage: `url(${track.thumbnail})` }}>
                      <div className="dot-overlay"></div>
                    </div>
                    <div className="track-info">
                      <div className="track-title">{track.title}</div>
                      <div className="track-artist">{track.artist}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="loading">NO_ITEMS_FOUND</div>
              )}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-nav">
        <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setView('home')} active={view === 'home'}>Recommended</DotButton>
        <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setView('history')} active={view === 'history'}>History</DotButton>
        <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setView('playlists')} active={view === 'playlists'}>Playlists</DotButton>
        <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setView('library')} active={view === 'library'}>Library</DotButton>
        <DotButton variant={settings.navPill ? 'pill' : 'dot'} onClick={() => setView('recent')} active={view === 'recent'}>Recent</DotButton>
      </nav>

      <PlayerControls />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function App() {
  return (
    <SettingsProvider>
      <PlaybackProvider>
        <AppContent />
      </PlaybackProvider>
    </SettingsProvider>
  )
}

export default App
