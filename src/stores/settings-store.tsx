import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppSettings, Theme } from '../types/settings';

const STORAGE_KEYS = {
  claudeApiKey: 'drift_claude_api_key',
  githubToken: 'drift_github_token',
  theme: 'drift_theme',
} as const;

function loadSettings(): AppSettings {
  return {
    claudeApiKey: localStorage.getItem(STORAGE_KEYS.claudeApiKey) || '',
    githubToken: localStorage.getItem(STORAGE_KEYS.githubToken) || '',
    theme: (localStorage.getItem(STORAGE_KEYS.theme) as Theme) || 'dark',
  };
}

function saveSettings(settings: AppSettings) {
  if (settings.claudeApiKey) {
    localStorage.setItem(STORAGE_KEYS.claudeApiKey, settings.claudeApiKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.claudeApiKey);
  }
  if (settings.githubToken) {
    localStorage.setItem(STORAGE_KEYS.githubToken, settings.githubToken);
  } else {
    localStorage.removeItem(STORAGE_KEYS.githubToken);
  }
  localStorage.setItem(STORAGE_KEYS.theme, settings.theme);
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (update: Partial<AppSettings>) => void;
  clearSettings: () => void;
  resolvedTheme: 'dark' | 'light';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(settings.theme);
    const resolved = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme;
    setResolvedTheme(resolved);
  }, [settings.theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const updateSettings = useCallback((update: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...update };
      saveSettings(next);
      return next;
    });
  }, []);

  const clearSettings = useCallback(() => {
    const empty: AppSettings = { claudeApiKey: '', githubToken: '', theme: 'dark' };
    saveSettings(empty);
    setSettings(empty);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, clearSettings, resolvedTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
