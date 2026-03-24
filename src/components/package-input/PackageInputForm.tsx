import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageNameInput } from './PackageNameInput';
import { VersionSelect } from './VersionSelect';
import { usePackageVersions } from '../../hooks/usePackageVersions';
import { useSettings } from '../../stores/settings-store';

export function PackageInputForm() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [packageName, setPackageName] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');

  const { versions, loading: versionsLoading } = usePackageVersions(selectedPackage);

  const handleSelect = useCallback((name: string) => {
    setSelectedPackage(name);
    setFromVersion('');
    setToVersion('');
  }, []);

  const canSubmit = selectedPackage && fromVersion && toVersion && fromVersion !== toVersion && settings.claudeApiKey;

  // Estimate version span for cost warning
  const versionSpan = useMemo(() => {
    if (!fromVersion || !toVersion) return 0;
    const fromIdx = versions.findIndex(v => v.version === fromVersion);
    const toIdx = versions.findIndex(v => v.version === toVersion);
    if (fromIdx === -1 || toIdx === -1) return 0;
    return Math.abs(fromIdx - toIdx);
  }, [fromVersion, toVersion, versions]);

  const isMajorJump = useMemo(() => {
    if (!fromVersion || !toVersion) return false;
    const fromEntry = versions.find(v => v.version === fromVersion);
    const toEntry = versions.find(v => v.version === toVersion);
    if (!fromEntry || !toEntry) return false;
    return Math.abs(fromEntry.major - toEntry.major) >= 2;
  }, [fromVersion, toVersion, versions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    navigate(`/report?pkg=${encodeURIComponent(selectedPackage)}&from=${encodeURIComponent(fromVersion)}&to=${encodeURIComponent(toVersion)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-3 bg-surface border border-border rounded-lg p-4">
      <PackageNameInput
        value={packageName}
        onChange={setPackageName}
        onSelect={handleSelect}
      />

      <div className="grid grid-cols-2 gap-2">
        <VersionSelect
          label="From"
          value={fromVersion}
          versions={versions}
          loading={versionsLoading}
          onChange={setFromVersion}
          disabled={!selectedPackage}
        />
        <VersionSelect
          label="To"
          value={toVersion}
          versions={versions}
          loading={versionsLoading}
          onChange={setToVersion}
          disabled={!selectedPackage}
        />
      </div>

      {!settings.claudeApiKey && (
        <p className="text-[11px] font-mono text-warning bg-warning/10 border border-warning/20 rounded px-2.5 py-1.5">
          Add your Claude API key in{' '}
          <a href="/settings" className="underline text-warning hover:text-warning/80">settings</a>{' '}
          to enable analysis.
        </p>
      )}

      {(versionSpan > 50 || isMajorJump) && fromVersion && toVersion && (
        <p className="text-[11px] font-mono text-text-muted bg-surface-light border border-border rounded px-2.5 py-1.5">
          {isMajorJump ? '&#9888; Large version jump' : `&#9888; ${versionSpan} versions apart`}
          {' — '}more data means more tokens sent to Claude, which costs more.
          {versionSpan > 100 && ' Consider narrowing the range for a cheaper analysis.'}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-primary hover:bg-primary-dark text-white font-mono text-sm py-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        analyze
      </button>
    </form>
  );
}
