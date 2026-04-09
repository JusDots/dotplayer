import React, { useEffect, useMemo, useState } from 'react';
import DotButton from './DotButton';
import { useSettings } from '../context/useSettings';
import type { ThemePreset } from '../context/SettingsContext';
import './SettingsPanel.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const keyRows: Array<{ label: string; key: keyof ReturnType<typeof useSettings>['settings']['keyBindings'] }> = [
  { label: 'Home', key: 'home' },
  { label: 'History', key: 'history' },
  { label: 'Playlists', key: 'playlists' },
  { label: 'Library', key: 'library' },
  { label: 'Recent', key: 'recent' },
  { label: 'Play/Pause', key: 'playPause' },
  { label: 'Next', key: 'next' },
  { label: 'Prev', key: 'prev' },
  { label: 'Settings', key: 'settings' },
];

const SettingsPanel: React.FC<Props> = ({ open, onClose }) => {
  const { settings, updateSettings, updateKeyBinding, setThemePreset, setCustomMode, resetSettings } = useSettings();
  const [discordStatus, setDiscordStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch('http://127.0.0.1:3789/health');
        if (!mounted) return;
        setDiscordStatus(res.ok ? 'connected' : 'offline');
      } catch {
        if (!mounted) return;
        setDiscordStatus('offline');
      }
    };
    check();
    const id = window.setInterval(check, 4000);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [open]);

  const copyCommands = useMemo(() => ([
    'cd web/discord-companion',
    'npm install',
    '$env:DISCORD_CLIENT_ID="your_client_id_here"',
    'npm start',
  ]), []);

  const copySetup = async () => {
    try {
      await navigator.clipboard.writeText(copyCommands.join('\n'));
    } catch {
      // ignore copy failures
    }
  };

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h3>Settings</h3>
          <DotButton variant="pill" onClick={onClose}>Close</DotButton>
        </div>

        <div className="settings-row theme-row">
          <label>
            Theme
            <select value={settings.themePreset} onChange={(e) => setThemePreset(e.target.value as ThemePreset)}>
              <option value="default">Default</option>
              <option value="night">Night</option>
              <option value="nord">Nord</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={settings.customMode} onChange={(e) => setCustomMode(e.target.checked)} />
            Custom overrides
          </label>
        </div>

        <div className="settings-grid section">
          <label>Accent <input disabled={!settings.customMode} type="color" value={settings.accentColor} onChange={(e) => updateSettings({ accentColor: e.target.value })} /></label>
          <label>Background <input disabled={!settings.customMode} type="color" value={settings.bgColor} onChange={(e) => updateSettings({ bgColor: e.target.value })} /></label>
          <label>Text <input disabled={!settings.customMode} type="color" value={settings.textColor} onChange={(e) => updateSettings({ textColor: e.target.value })} /></label>
          <label>Dot <input disabled={!settings.customMode} type="color" value={settings.dotColor} onChange={(e) => updateSettings({ dotColor: e.target.value })} /></label>
        </div>

        <div className="settings-row section">
          <label>
            UI Scale: {settings.uiScale}%
            <input
              type="range"
              min={85}
              max={125}
              value={settings.uiScale}
              disabled={!settings.customMode}
              onChange={(e) => updateSettings({ uiScale: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="settings-grid slider-grid section">
          <label>
            Card Radius: {settings.cardRadius}px
            <input disabled={!settings.customMode} type="range" min={0} max={18} value={settings.cardRadius} onChange={(e) => updateSettings({ cardRadius: Number(e.target.value) })} />
          </label>
          <label>
            Player Bottom Padding: {settings.playerPaddingBottom}px
            <input disabled={!settings.customMode} type="range" min={20} max={90} value={settings.playerPaddingBottom} onChange={(e) => updateSettings({ playerPaddingBottom: Number(e.target.value) })} />
          </label>
          <label>
            Nav Bottom Offset: {settings.navBottomOffset}px
            <input disabled={!settings.customMode} type="range" min={90} max={220} value={settings.navBottomOffset} onChange={(e) => updateSettings({ navBottomOffset: Number(e.target.value) })} />
          </label>
          <label>
            Panel Blur: {settings.panelBlur}px
            <input disabled={!settings.customMode} type="range" min={0} max={20} value={settings.panelBlur} onChange={(e) => updateSettings({ panelBlur: Number(e.target.value) })} />
          </label>
          <label>
            Dot Grid Size: {settings.dotGridSize}px
            <input disabled={!settings.customMode} type="range" min={8} max={40} value={settings.dotGridSize} onChange={(e) => updateSettings({ dotGridSize: Number(e.target.value) })} />
          </label>
        </div>

        <div className="settings-row check">
          <label><input type="checkbox" checked={settings.navPill} onChange={(e) => updateSettings({ navPill: e.target.checked })} /> Use pill nav</label>
          <label><input type="checkbox" checked={settings.animations} onChange={(e) => updateSettings({ animations: e.target.checked })} /> Enable animations</label>
        </div>

        <h4>Keybinds</h4>
        <div className="settings-grid keybinds">
          {keyRows.map((row) => (
            <label key={row.key}>
              {row.label}
              <input
                value={settings.keyBindings[row.key]}
                onChange={(e) => updateKeyBinding(row.key, e.target.value)}
                placeholder="Key"
              />
            </label>
          ))}
        </div>

        <div className="settings-actions">
          <DotButton variant="pill" onClick={copySetup}>Copy Discord Setup</DotButton>
          <DotButton variant="pill" onClick={resetSettings}>Reset</DotButton>
        </div>

        <h4>Discord Rich Presence</h4>
        <div className="discord-status-row">
          <span className={`status-badge ${discordStatus}`}>
            {discordStatus === 'checking' ? 'Checking' : discordStatus === 'connected' ? 'Connected' : 'Offline'}
          </span>
          <span className="discord-hint">
            Companion endpoint: <code>http://127.0.0.1:3789/health</code>
          </span>
        </div>
        <pre className="discord-setup">
{copyCommands.join('\n')}
        </pre>

        <div className="settings-signature">
          <div className="settings-version">v1.0 "Boombox"</div>
          <div>
            Made with ❤️ and 🍿 by <span className="brand-jusdots">JusDots</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
