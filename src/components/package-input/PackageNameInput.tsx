import { useState, useRef, useEffect } from 'react';
import { usePackageSearch } from '../../hooks/usePackageSearch';

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelect: (name: string) => void;
}

export function PackageNameInput({ value, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const { results, loading } = usePackageSearch(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-[11px] font-mono text-text-muted mb-1 uppercase tracking-wider">Package</label>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. react, express, axios"
        className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all font-mono"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-8 text-text-muted text-[10px] font-mono">...</div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-0.5 bg-surface border border-border rounded shadow-xl max-h-52 overflow-auto">
          {results.map(r => (
            <li
              key={r.name}
              onClick={() => { onSelect(r.name); onChange(r.name); setOpen(false); }}
              className="px-3 py-1.5 cursor-pointer hover:bg-surface-light transition-colors border-b border-border last:border-0"
            >
              <div className="font-mono text-xs text-text">{r.name}</div>
              <div className="text-[10px] text-text-muted truncate">{r.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
