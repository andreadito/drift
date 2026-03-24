import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { VersionEntry } from '../../hooks/usePackageVersions';

type Filter = 'stable' | 'major' | 'minor' | 'all';

interface Props {
  label: string;
  value: string;
  versions: VersionEntry[];
  loading: boolean;
  onChange: (version: string) => void;
  disabled?: boolean;
}

export function VersionSelect({ label, value, versions, loading, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('stable');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter + search
  const filtered = useMemo(() => {
    let list = versions;

    // Apply filter
    if (filter === 'stable') {
      list = list.filter(v => !v.prerelease);
    } else if (filter === 'major') {
      list = list.filter(v => !v.prerelease && v.minor === 0 && v.patch === 0);
    } else if (filter === 'minor') {
      list = list.filter(v => !v.prerelease && v.patch === 0);
    }

    // Apply search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v => v.version.includes(q));
    }

    return list;
  }, [versions, filter, search]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIdx(0);
  }, [filtered.length, search, filter]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx, open]);

  const select = useCallback((version: string) => {
    onChange(version);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIdx]) select(filtered[highlightIdx].version);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setSearch('');
        break;
    }
  };

  const isDisabled = disabled || loading || versions.length === 0;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'stable', label: 'stable' },
    { key: 'major', label: 'major' },
    { key: 'minor', label: 'minor' },
    { key: 'all', label: 'all' },
  ];

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => { if (!isDisabled) { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0); } }}
        disabled={isDisabled}
        className={`w-full bg-surface border border-border rounded px-3 py-2 text-sm text-left font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          open ? 'border-primary/60 ring-1 ring-primary/20' : 'hover:border-border'
        }`}
      >
        <span className={value ? 'text-text' : 'text-text-muted/50'}>
          {loading ? 'loading...' : value || 'select'}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 w-full mt-0.5 bg-surface border border-border rounded shadow-xl overflow-hidden" style={{ minWidth: '220px' }}>
          {/* Search input */}
          <div className="p-1.5 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="search versions..."
              className="w-full bg-code-bg border border-border rounded px-2 py-1 text-xs font-mono text-text placeholder:text-text-muted/40 focus:outline-none focus:border-primary/40"
              autoComplete="off"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex gap-0.5 px-1.5 py-1 border-b border-border">
            {FILTERS.map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  filter === f.key
                    ? 'bg-primary/20 text-primary-light'
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-text-muted self-center">
              {filtered.length}
            </span>
          </div>

          {/* Version list */}
          <div ref={listRef} className="max-h-48 overflow-y-auto" onKeyDown={handleKeyDown}>
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[11px] font-mono text-text-muted">no matches</div>
            )}
            {filtered.map((v, i) => (
              <div
                key={v.version}
                onClick={() => select(v.version)}
                onMouseEnter={() => setHighlightIdx(i)}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs font-mono transition-colors ${
                  i === highlightIdx ? 'bg-surface-light' : ''
                } ${v.version === value ? 'text-primary-light' : 'text-text'}`}
              >
                <span className={v.prerelease ? 'text-text-muted' : ''}>
                  {v.version}
                  {v.version === value && <span className="text-primary ml-1">●</span>}
                </span>
                {v.date && <span className="text-text-muted text-[10px]">{v.date}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
