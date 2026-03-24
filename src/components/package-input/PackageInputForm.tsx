import { useState, useCallback } from 'react';
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
