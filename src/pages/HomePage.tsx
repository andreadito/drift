import { useNavigate } from 'react-router-dom';
import { PackageInputForm } from '../components/package-input/PackageInputForm';
import { ReportHistory } from '../components/history/ReportHistory';

const EXAMPLES = [
  { pkg: 'axios', from: '0.27.2', to: '1.7.9', label: 'axios 0.27→1.7' },
  { pkg: 'express', from: '4.21.2', to: '5.1.0', label: 'express 4→5' },
  { pkg: 'react', from: '17.0.2', to: '18.3.1', label: 'react 17→18' },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 dot-grid">
      <div className="text-center mb-8">
        <h1 className="font-mono text-3xl font-bold text-text mb-2 tracking-tight lowercase">
          drift
        </h1>
        <p className="text-text-muted text-sm max-w-sm mx-auto leading-relaxed">
          Analyze npm package version drift. Get AI-powered migration reports with actionable steps.
        </p>
      </div>

      <PackageInputForm />

      <div className="mt-6 flex items-center gap-1.5 text-[11px] font-mono text-text-muted">
        <span>&#128274;</span>
        <span>Your API keys never leave your browser</span>
      </div>

      <div className="mt-8">
        <p className="text-[10px] text-text-muted mb-2 uppercase tracking-widest font-mono">examples</p>
        <div className="flex gap-1.5 flex-wrap justify-center">
          {EXAMPLES.map(ex => (
            <button
              key={ex.label}
              onClick={() => navigate(`/report?pkg=${ex.pkg}&from=${ex.from}&to=${ex.to}`)}
              className="px-2.5 py-1 bg-surface border border-border rounded text-xs font-mono text-text-muted hover:text-text hover:border-primary/40 transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <ReportHistory />
    </div>
  );
}
