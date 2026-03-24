import { useNavigate } from 'react-router-dom';
import { useHistory } from '../../stores/history-store';

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ReportHistory() {
  const { history, deleteReport, clearHistory } = useHistory();
  const navigate = useNavigate();

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto mt-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">recent reports</span>
        <button
          onClick={clearHistory}
          className="text-[10px] font-mono text-text-muted hover:text-danger transition-colors"
        >
          clear
        </button>
      </div>
      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-center justify-between px-3 py-2 hover:bg-surface-light transition-colors group"
          >
            <button
              onClick={() => navigate(`/report?pkg=${encodeURIComponent(entry.pkg)}&from=${encodeURIComponent(entry.fromVersion)}&to=${encodeURIComponent(entry.toVersion)}&id=${entry.id}`)}
              className="flex-1 min-w-0 text-left"
            >
              <span className="text-xs font-mono text-text">{entry.pkg}</span>
              <span className="text-[11px] font-mono text-text-muted ml-1.5">
                {entry.fromVersion} → {entry.toVersion}
              </span>
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              {entry.costUsd !== undefined && (
                <span className="text-[10px] font-mono text-text-muted">${entry.costUsd.toFixed(4)}</span>
              )}
              <span className="text-[10px] font-mono text-text-muted">{timeAgo(entry.timestamp)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteReport(entry.id); }}
                className="text-text-muted hover:text-danger text-[10px] opacity-0 group-hover:opacity-100 transition-all"
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
