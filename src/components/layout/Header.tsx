import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../../stores/settings-store';
import { PeerIndicator } from './PeerIndicator';

export function Header() {
  const location = useLocation();
  const { settings, updateSettings, resolvedTheme } = useSettings();

  const cycleTheme = () => {
    const order = ['dark', 'light', 'system'] as const;
    const idx = order.indexOf(settings.theme);
    updateSettings({ theme: order[(idx + 1) % order.length] });
  };

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-11 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-text hover:text-primary-light transition-colors no-underline">
          <span className="font-mono text-base font-bold tracking-tight lowercase">drift</span>
          <span className="text-[10px] text-text-muted font-mono">/v1</span>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className={`text-xs font-mono transition-colors no-underline ${location.pathname === '/' ? 'text-primary-light' : 'text-text-muted hover:text-text'}`}
            >
              analyze
            </Link>
            <Link
              to="/settings"
              className={`text-xs font-mono transition-colors no-underline ${location.pathname === '/settings' ? 'text-primary-light' : 'text-text-muted hover:text-text'}`}
            >
              settings
            </Link>
          </nav>
          <PeerIndicator />
          <div className="w-px h-4 bg-border" />
          <button
            onClick={cycleTheme}
            className="text-text-muted hover:text-text transition-colors text-sm"
            title={`Theme: ${settings.theme}`}
          >
            {resolvedTheme === 'dark' ? '☾' : '☀'}
          </button>
        </div>
      </div>
    </header>
  );
}
