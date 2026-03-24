const GITHUB_URL = 'https://github.com/andreadito/drift';

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span>&#128274;</span> API keys stay in your browser
          </span>
          <span className="hidden sm:inline text-border">|</span>
          <span className="hidden sm:inline">No server &middot; No tracking &middot; 100% client-side</span>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-muted hover:text-text transition-colors no-underline"
        >
          source &#8599;
        </a>
      </div>
    </footer>
  );
}
