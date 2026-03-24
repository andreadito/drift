import { useState } from 'react';
import { useSettings } from '../../stores/settings-store';
import { testApiKey } from '../../services/anthropic';

export function ApiKeyForm() {
  const { settings, updateSettings } = useSettings();
  const [key, setKey] = useState(settings.claudeApiKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const handleSave = () => {
    updateSettings({ claudeApiKey: key });
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!key) return;
    setTesting(true);
    setTestResult(null);
    const ok = await testApiKey(key);
    setTestResult(ok);
    setTesting(false);
  };

  const maskedKey = settings.claudeApiKey
    ? `sk-ant-...${settings.claudeApiKey.slice(-4)}`
    : '';

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">claude api key</span>
      <p className="text-[11px] text-text-muted mt-1 mb-3 font-mono">
        Required for AI analysis. Stored in localStorage only.
      </p>

      {settings.claudeApiKey && !key.startsWith('sk-ant-') && (
        <p className="text-[11px] text-success mb-2 font-mono">saved: {maskedKey}</p>
      )}

      <div className="flex gap-1.5">
        <input
          type="password"
          value={key}
          onChange={e => { setKey(e.target.value); setTestResult(null); }}
          placeholder="sk-ant-api03-..."
          className="flex-1 bg-code-bg border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 font-mono"
        />
        <button
          onClick={handleSave}
          disabled={!key || key === settings.claudeApiKey}
          className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          save
        </button>
        <button
          onClick={handleTest}
          disabled={!key || testing}
          className="px-3 py-1.5 bg-surface-lighter hover:bg-surface-light text-text rounded text-[11px] font-mono transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {testing ? '...' : 'test'}
        </button>
      </div>

      {testResult !== null && (
        <p className={`text-[11px] mt-1.5 font-mono ${testResult ? 'text-success' : 'text-danger'}`}>
          {testResult ? '● key valid' : '✕ key invalid'}
        </p>
      )}
    </div>
  );
}
