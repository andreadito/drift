import { ApiKeyForm } from '../components/settings/ApiKeyForm';
import { GitHubTokenForm } from '../components/settings/GitHubTokenForm';
import { useSettings } from '../stores/settings-store';

export function SettingsPage() {
  const { clearSettings } = useSettings();

  return (
    <div className="flex-1 px-4 py-6 max-w-xl mx-auto w-full">
      <h1 className="text-base font-mono font-bold text-text mb-4 lowercase">settings</h1>

      <div className="space-y-4">
        <ApiKeyForm />
        <GitHubTokenForm />

        {/* Security info */}
        <div className="bg-surface rounded-lg border border-border p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <span>&#128274;</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">security</span>
          </div>
          <ul className="text-[11px] text-text-muted space-y-1 font-mono">
            <li>&#8226; Keys are stored in your browser's localStorage only</li>
            <li>&#8226; Keys are sent directly to api.anthropic.com / api.github.com</li>
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
