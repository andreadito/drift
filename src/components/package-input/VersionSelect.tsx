import type { VersionEntry } from '../../hooks/usePackageVersions';

interface Props {
  label: string;
  value: string;
  versions: VersionEntry[];
  loading: boolean;
  onChange: (version: string) => void;
  disabled?: boolean;
}

export function VersionSelect({ label, value, versions, loading, onChange, disabled }: Props) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || loading || versions.length === 0}
        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed appearance-none"
      >
        <option value="">{loading ? 'loading...' : 'select'}</option>
        {versions.map(v => (
          <option key={v.version} value={v.version}>
            {v.version}{v.date ? ` · ${v.date}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
