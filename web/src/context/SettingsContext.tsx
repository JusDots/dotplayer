import React, { createContext, useEffect, useMemo, useState } from 'react';

export interface KeyBindings {
  home: string;
  history: string;
  playlists: string;
  library: string;
  recent: string;
  playPause: string;
  next: string;
  prev: string;
  settings: string;
}

export type ThemePreset = 'default' | 'night' | 'nord' | 'light';

export interface AppSettings {
  themePreset: ThemePreset;
  customMode: boolean;
  accentColor: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  uiScale: number;
  navPill: boolean;
  animations: boolean;
  cardRadius: number;
  playerPaddingBottom: number;
  navBottomOffset: number;
  panelBlur: number;
  dotGridSize: number;
  keyBindings: KeyBindings;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateKeyBinding: (key: keyof KeyBindings, value: string) => void;
  setThemePreset: (preset: ThemePreset) => void;
  setCustomMode: (enabled: boolean) => void;
  resetSettings: () => void;
}

const THEME_PRESETS: Record<ThemePreset, Pick<AppSettings, 'accentColor' | 'bgColor' | 'textColor' | 'dotColor'>> = {
  default: {
    accentColor: '#00ffcc',
    bgColor: '#0c0c0c',
    textColor: '#ffffff',
    dotColor: '#333333',
  },
  night: {
    accentColor: '#8d9bff',
    bgColor: '#06070d',
    textColor: '#dbe1ff',
    dotColor: '#1b2242',
  },
  nord: {
    accentColor: '#88c0d0',
    bgColor: '#2e3440',
    textColor: '#eceff4',
    dotColor: '#4c566a',
  },
  light: {
    accentColor: '#2b6cb0',
    bgColor: '#f5f7fb',
    textColor: '#1a202c',
    dotColor: '#cbd5e0',
  },
};

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(12, 12, 12, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const DEFAULT_SETTINGS: AppSettings = {
  themePreset: 'default',
  customMode: true,
  accentColor: '#00ffcc',
  bgColor: '#0c0c0c',
  textColor: '#ffffff',
  dotColor: '#333333',
  uiScale: 100,
  navPill: true,
  animations: true,
  cardRadius: 4,
  playerPaddingBottom: 40,
  navBottomOffset: 120,
  panelBlur: 10,
  dotGridSize: 20,
  keyBindings: {
    home: 'h',
    history: 't',
    playlists: 'p',
    library: 'l',
    recent: 'r',
    playPause: ' ',
    next: 'ArrowRight',
    prev: 'ArrowLeft',
    settings: ',',
  },
};

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('dotplayer_settings');
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(saved),
        keyBindings: {
          ...DEFAULT_SETTINGS.keyBindings,
          ...(JSON.parse(saved).keyBindings || {}),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('dotplayer_settings', JSON.stringify(settings));
    const activeTheme = settings.customMode ? settings : { ...settings, ...THEME_PRESETS[settings.themePreset] };
    const root = document.documentElement;
    root.style.setProperty('--accent-color', activeTheme.accentColor);
    root.style.setProperty('--bg-color', activeTheme.bgColor);
    root.style.setProperty('--text-color', activeTheme.textColor);
    root.style.setProperty('--dot-color', activeTheme.dotColor);
    root.style.setProperty('--panel-bg', hexToRgba(activeTheme.bgColor, 0.92));
    root.style.setProperty('--ui-scale', `${settings.uiScale}%`);
    root.style.setProperty('--anim-speed', settings.animations ? '0.2s' : '0s');
    root.style.setProperty('--card-radius', `${settings.cardRadius}px`);
    root.style.setProperty('--player-padding-bottom', `${settings.playerPaddingBottom}px`);
    root.style.setProperty('--nav-bottom-offset', `${settings.navBottomOffset}px`);
    root.style.setProperty('--panel-blur', `${settings.panelBlur}px`);
    root.style.setProperty('--dot-grid-size', `${settings.dotGridSize}px`);

    // Ensure updates are visible even where inheritance is interrupted.
    document.body.style.backgroundColor = activeTheme.bgColor;
    document.body.style.color = activeTheme.textColor;
  }, [settings]);

  const value = useMemo<SettingsContextType>(() => ({
    settings,
    updateSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
    updateKeyBinding: (key, value) =>
      setSettings((prev) => ({
        ...prev,
        keyBindings: { ...prev.keyBindings, [key]: value },
      })),
    setThemePreset: (preset) => setSettings((prev) => ({ ...prev, themePreset: preset })),
    setCustomMode: (enabled) => setSettings((prev) => ({ ...prev, customMode: enabled })),
    resetSettings: () => setSettings(DEFAULT_SETTINGS),
  }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
