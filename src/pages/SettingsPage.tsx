import { useState } from 'react';
import { ApiKeyForm } from '../components/settings/ApiKeyForm';
import { GitHubTokenForm } from '../components/settings/GitHubTokenForm';
import { useSettings } from '../stores/settings-store';
import { usePeer } from '../stores/peer-store';

export function SettingsPage() {
  const { settings, updateSettings, clearSettings } = useSettings();
  const { peerCount, isConnected, connect, disconnect } = usePeer();
  const [teamInput, setTeamInput] = useState(settings.teamName);
  const [connecting, setConnecting] = useState(false);

  const handleTeamConnect = async () => {
    if (!teamInput.trim()) return;
    setConnecting(true);
    try {
      updateSettings({ teamName: teamInput.trim() });
      await connect(teamInput.trim());
    } catch {
      // Connection might fail silently
    }
    setConnecting(false);
  };

  const handleTeamDisconnect = () => {
    disconnect();
    updateSettings({ teamName: '' });
    setTeamInput('');
  };

  return (
    <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
      <h1 className="text-base font-mono font-bold text-text mb-4 lowercase">settings</h1>

      <div className="space-y-4">
        <ApiKeyForm />
        <GitHubTokenForm />

        {/* P2P Team */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">p2p team cache</span>
            {isConnected && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                peerCount > 0 ? 'text-success bg-success/10' : 'text-text-muted bg-surface-light'
              }`}>
                {peerCount > 0 ? `${peerCount} peer${peerCount !== 1 ? 's' : ''}` : 'connected'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1 mb-3 font-mono">
            Share reports with your team via WebRTC. Set a team name — everyone with the same name auto-connects. Reports are shared peer-to-peer, no server involved.
          </p>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={teamInput}
              onChange={e => setTeamInput(e.target.value)}
              placeholder="e.g. acme-dev"
              disabled={isConnected}
              className="flex-1 bg-code-bg border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 font-mono disabled:opacity-50"
            />
            {!isConnected ? (
              <button
                onClick={handleTeamConnect}
                disabled={!teamInput.trim() || connecting}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {connecting ? '...' : 'join'}
              </button>
            ) : (
              <button
                onClick={handleTeamDisconnect}
                className="px-3 py-1.5 bg-danger/10 border border-danger/20 text-danger rounded text-[11px] font-mono transition-colors hover:bg-danger/15"
              >
                leave
              </button>
            )}
          </div>
        </div>

        {/* Security info */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span>&#128274;</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">security</span>
          </div>
          <ul className="text-[11px] text-text-muted space-y-1 font-mono">
            <li>&#8226; Keys are stored in your browser's localStorage only</li>
            <li>&#8226; Keys are sent directly to api.anthropic.com / api.github.com</li>
            <li>&#8226; P2P data goes directly between browsers via WebRTC</li>
            <li>&#8226; No server, no backend, no tracking — 100% client-side</li>
            <li>&#8226; <a href="https://github.com/andreadito/drift" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">Verify in the source code &#8599;</a></li>
          </ul>
        </div>

        <div className="bg-surface rounded-lg border border-border p-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">danger zone</span>
          <button
            onClick={clearSettings}
            className="px-3 py-1.5 bg-danger/10 border border-danger/20 text-danger rounded text-[11px] font-mono transition-colors hover:bg-danger/15"
          >
            clear all data
          </button>
        </div>
      </div>
    </div>
  );
}
