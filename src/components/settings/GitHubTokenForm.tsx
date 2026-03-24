import { useState } from 'react';
import { useSettings } from '../../stores/settings-store';

export function GitHubTokenForm() {
  const { settings, updateSettings } = useSettings();
  const [token, setToken] = useState(settings.githubToken);

  const handleSave = () => {
    updateSettings({ githubToken: token });
  };

  const maskedToken = settings.githubToken
    ? `ghp_...${settings.githubToken.slice(-4)}`
    : '';

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">github token</span>
      <p className="text-[11px] text-text-muted mt-1 mb-3 font-mono">
        Optional. Raises rate limit from 60 to 5,000 req/hr. No scopes needed for public repos.
      </p>

      {settings.githubToken && (
        <p className="text-[11px] text-success mb-2 font-mono">saved: {maskedToken}</p>
      )}

      <div className="flex gap-1.5">
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ghp_..."
          className="flex-1 bg-code-bg border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 font-mono"
        />
        <button
          onClick={handleSave}
          disabled={token === settings.githubToken}
          className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          save
        </button>
      </div>
    </div>
  );
}
