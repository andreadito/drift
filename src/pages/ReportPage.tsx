import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { useSettings } from '../stores/settings-store';
import { useHistory } from '../stores/history-store';
import { GatheringProgress } from '../components/progress/GatheringProgress';
import { ReportView } from '../components/report/ReportView';

export function ReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();
  const { addReport, getReport } = useHistory();
  const { state, startAnalysis, cancelAnalysis } = useAnalysis();
  const savedRef = useRef(false);

  const pkg = searchParams.get('pkg') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const historyId = searchParams.get('id') || '';

  // Try to load from history
  const [cachedReport, setCachedReport] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    if (historyId) {
      const entry = getReport(historyId);
      if (entry) {
        setCachedReport(entry.rawResponse);
        setUsingCache(true);
        return;
      }
    }
    // No cache — run analysis
    setCachedReport(null);
    setUsingCache(false);
    if (!pkg || !from || !to || !settings.claudeApiKey) return;
    savedRef.current = false;
    startAnalysis(pkg, from, to, settings.claudeApiKey, settings.githubToken || undefined);
    return () => cancelAnalysis();
  }, [pkg, from, to, historyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save to history when analysis completes
  useEffect(() => {
    if (state.status === 'complete' && !savedRef.current && pkg && from && to) {
      savedRef.current = true;
      const id = addReport({ pkg, fromVersion: from, toVersion: to, rawResponse: state.rawAiResponse });
      // Update URL with history id (without re-triggering analysis)
      setSearchParams(prev => {
        prev.set('id', id);
        return prev;
      }, { replace: true });
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReanalyze = () => {
    setCachedReport(null);
    setUsingCache(false);
    savedRef.current = false;
    // Remove id from URL
    setSearchParams(prev => {
      prev.delete('id');
      return prev;
    }, { replace: true });
    if (settings.claudeApiKey) {
      startAnalysis(pkg, from, to, settings.claudeApiKey, settings.githubToken || undefined);
    }
  };

  if (!pkg || !from || !to) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center font-mono">
          <p className="text-text-muted text-sm mb-3">Missing package info.</p>
          <Link to="/" className="text-primary text-sm hover:text-primary-light">&#8592; back</Link>
        </div>
      </div>
    );
  }

  if (!settings.claudeApiKey && !usingCache) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center font-mono">
          <p className="text-text-muted text-sm mb-3">API key required.</p>
          <Link to="/settings" className="text-primary text-sm hover:text-primary-light">settings &#8599;</Link>
        </div>
      </div>
    );
  }

  const reportMarkdown = usingCache ? cachedReport : state.rawAiResponse;
  const isComplete = usingCache || state.status === 'complete';
  const isWorking = !usingCache && (state.status === 'gathering' || state.status === 'analyzing');

  const handleCopyReport = () => {
    if (!reportMarkdown) return;
    try {
      let cleaned = reportMarkdown.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const r = JSON.parse(cleaned);
      const lines: string[] = [
        `# ${pkg} ${from} → ${to}\n`,
        `${r.summary}\n`,
      ];
      if (r.quickActions?.length) {
        lines.push('## Actions');
        r.quickActions.forEach((a: string) => lines.push(`- [ ] ${a}`));
        lines.push('');
      }
      if (r.breakingChanges?.length) {
        lines.push('## Breaking Changes');
        r.breakingChanges.forEach((bc: { title: string; risk: string; description: string; before: string; after: string; migrationNote: string }) => {
          lines.push(`\n### ${bc.title} [${bc.risk}]`);
          lines.push(bc.description);
          if (bc.before) lines.push(`\n**Before:**\n\`\`\`\n${bc.before}\n\`\`\``);
          if (bc.after) lines.push(`\n**After:**\n\`\`\`\n${bc.after}\n\`\`\``);
          lines.push(`\n> ${bc.migrationNote}`);
        });
        lines.push('');
      }
      if (r.migrationSteps?.length) {
        lines.push('## Migration Steps');
        r.migrationSteps.forEach((s: { step: number; title: string; detail: string; commands: string[] }) => {
          lines.push(`\n${s.step}. **${s.title}** — ${s.detail}`);
          s.commands?.forEach((c: string) => lines.push(`   \`${c}\``));
        });
      }
      if (r.aiInstructions) {
        lines.push('\n## AI Migration Prompt\n');
        lines.push(r.aiInstructions);
      }
      navigator.clipboard.writeText(lines.join('\n'));
    } catch {
      navigator.clipboard.writeText(reportMarkdown);
    }
  };

  return (
    <div className="flex-1 px-4 py-4 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to="/" className="text-[11px] font-mono text-text-muted hover:text-text no-underline">&#8592; new analysis</Link>
          <h1 className="text-base font-mono font-bold text-text mt-0.5">
            {pkg}{' '}
            <span className="text-text-muted font-normal">{from}</span>
            <span className="text-text-muted font-normal"> &#8594; </span>
            <span className="text-text-muted font-normal">{to}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isComplete && (
            <>
              <button
                onClick={handleCopyReport}
                className="px-2.5 py-1 bg-surface border border-border rounded text-[11px] font-mono text-text-muted hover:text-text transition-colors"
              >
                copy report
              </button>
              {usingCache && settings.claudeApiKey && (
                <button
                  onClick={handleReanalyze}
                  className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary-light rounded text-[11px] font-mono transition-colors hover:bg-primary/15"
                >
                  re-analyze
                </button>
              )}
            </>
          )}
          {isWorking && (
            <button
              onClick={cancelAnalysis}
              className="px-2.5 py-1 bg-danger/10 border border-danger/20 text-danger rounded text-[11px] font-mono transition-colors"
            >
              cancel
            </button>
          )}
        </div>
      </div>

      {/* Cache indicator */}
      {usingCache && (
        <div className="flex items-center gap-1.5 mb-3 text-[11px] font-mono text-text-muted">
          <span>&#9679;</span> loaded from cache
        </div>
      )}

      {/* Progress */}
      {isWorking && (
        <div className="mb-4">
          <GatheringProgress steps={state.steps} />
        </div>
      )}

      {/* Error */}
      {state.status === 'error' && !usingCache && (
        <div className="bg-danger/8 border border-danger/20 rounded-lg p-3 mb-4">
          <p className="text-danger text-xs font-mono font-medium mb-0.5">error</p>
          <p className="text-danger/80 text-[11px]">{state.error}</p>
          <button
            onClick={handleReanalyze}
            className="mt-2 px-2.5 py-1 bg-danger/10 border border-danger/20 text-danger rounded text-[11px] font-mono transition-colors"
          >
            retry
          </button>
        </div>
      )}

      {/* Report */}
      {!usingCache && state.status === 'analyzing' && state.rawAiResponse && (
        <ReportView markdown={state.rawAiResponse} streaming />
      )}
      {isComplete && reportMarkdown && (
        <ReportView markdown={reportMarkdown} />
      )}
    </div>
  );
}
