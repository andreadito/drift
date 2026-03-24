import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ParsedReport, BreakingChange } from '../../types/report';
import { RiskBadge } from './RiskBadge';

interface Props {
  markdown: string;
  streaming?: boolean;
}

function tryParseReport(raw: string): ParsedReport | null {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (parsed.summary && Array.isArray(parsed.quickActions)) {
      return parsed as ParsedReport;
    }
    return null;
  } catch {
    return null;
  }
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 text-[10px] font-mono bg-surface-lighter hover:bg-primary/30 text-text-muted px-1.5 py-0.5 rounded transition-all"
      >
        {copied ? 'copied' : 'copy'}
      </button>
      <pre className="bg-code-bg border border-border rounded p-3 overflow-x-auto text-xs leading-relaxed font-mono">
        <code className={lang ? `language-${lang}` : ''}>{code}</code>
      </pre>
    </div>
  );
}

// ─── Impact Banner ───
function ImpactBanner({ report }: { report: ParsedReport }) {
  const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  report.breakingChanges.forEach(bc => counts[bc.risk]++);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">impact</span>
            <RiskBadge level={report.impactLevel} />
          </div>
          <p className="text-text text-xs leading-relaxed">{report.summary}</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          {counts.HIGH > 0 && (
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-danger">{counts.HIGH}</div>
              <div className="text-[9px] uppercase tracking-wider text-danger/60 font-mono">high</div>
            </div>
          )}
          {counts.MEDIUM > 0 && (
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-warning">{counts.MEDIUM}</div>
              <div className="text-[9px] uppercase tracking-wider text-warning/60 font-mono">med</div>
            </div>
          )}
          {counts.LOW > 0 && (
            <div className="text-center">
              <div className="text-xl font-mono font-bold text-success">{counts.LOW}</div>
              <div className="text-[9px] uppercase tracking-wider text-success/60 font-mono">low</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Quick Actions Checklist ───
function QuickActions({ actions }: { actions: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const progress = actions.length > 0 ? Math.round((checked.size / actions.length) * 100) : 0;

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">actions</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-surface-lighter rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-mono text-text-muted">{checked.size}/{actions.length}</span>
        </div>
      </div>
      <div className="space-y-0.5">
        {actions.map((action, i) => (
          <label
            key={i}
            className={`flex items-start gap-2.5 px-2 py-1.5 rounded cursor-pointer transition-all hover:bg-surface-light ${
              checked.has(i) ? 'opacity-40' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={() => toggle(i)}
              className="mt-0.5 rounded border-border bg-surface text-primary focus:ring-primary/30 flex-shrink-0"
            />
            <span className={`text-xs ${checked.has(i) ? 'line-through text-text-muted' : 'text-text'}`}>
              {action}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Breaking Change Card ───
function BreakingChangeCard({ change }: { change: BreakingChange }) {
  const [expanded, setExpanded] = useState(false);

  const riskBorder = {
    HIGH: 'border-l-danger',
    MEDIUM: 'border-l-warning',
    LOW: 'border-l-success',
  };

  return (
    <div className={`bg-surface rounded-lg border border-border border-l-2 ${riskBorder[change.risk]} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface-light/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <RiskBadge level={change.risk} />
          <span className="text-xs font-medium text-text truncate">{change.title}</span>
        </div>
        <span className={`text-text-muted text-[10px] transition-transform flex-shrink-0 ml-2 ${expanded ? 'rotate-180' : ''}`}>
          &#9660;
        </span>
      </button>

      {!expanded && (
        <div className="px-3 pb-2 -mt-0.5">
          <p className="text-[11px] text-primary-light font-mono">{change.migrationNote}</p>
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          <p className="text-xs text-text-muted">{change.description}</p>

          {(change.before || change.after) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {change.before && (
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-danger/70 font-mono font-semibold">before</span>
                  <pre className="bg-code-bg border border-danger/15 rounded p-2 mt-0.5 text-[11px] overflow-x-auto font-mono">
                    <code>{change.before}</code>
                  </pre>
                </div>
              )}
              {change.after && (
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-success/70 font-mono font-semibold">after</span>
                  <pre className="bg-code-bg border border-success/15 rounded p-2 mt-0.5 text-[11px] overflow-x-auto font-mono">
                    <code>{change.after}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="bg-primary/8 border border-primary/15 rounded px-2.5 py-1.5">
            <span className="text-[10px] font-mono font-semibold text-primary-light">fix: </span>
            <span className="text-[11px] text-text">{change.migrationNote}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Migration Steps ───
function MigrationSteps({ steps }: { steps: ParsedReport['migrationSteps'] }) {
  const [completedSteps, setCompleted] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step); else next.add(step);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      {steps.map((s) => (
        <div
          key={s.step}
          className={`bg-surface rounded-lg border border-border p-3 transition-all ${
            completedSteps.has(s.step) ? 'opacity-40' : ''
          }`}
        >
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => toggleStep(s.step)}
              className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all text-[10px] font-mono ${
                completedSteps.has(s.step)
                  ? 'bg-success border-success text-white'
                  : 'border-border text-text-muted hover:border-primary'
              }`}
            >
              {completedSteps.has(s.step) ? '✓' : s.step}
            </button>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-medium ${completedSteps.has(s.step) ? 'line-through text-text-muted' : 'text-text'}`}>
                {s.title}
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">{s.detail}</p>
              {s.commands.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {s.commands.map((cmd, i) => (
                    <div key={i} className="flex items-center gap-1.5 group">
                      <pre className="bg-code-bg rounded px-2 py-1 text-[11px] text-primary-light flex-1 overflow-x-auto font-mono">
                        <code>{cmd}</code>
                      </pre>
                      <button
                        onClick={() => navigator.clipboard.writeText(cmd)}
                        className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-text-muted hover:text-text px-1 py-0.5 bg-surface-lighter rounded transition-all flex-shrink-0"
                      >
                        copy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── AI Instructions Panel ───
function AiInstructions({ instructions }: { instructions: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface rounded-lg border border-primary/25 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-primary/8 border-b border-primary/15">
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary-light">ai prompt</span>
        <button
          onClick={handleCopy}
          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
            copied
              ? 'bg-success/15 text-success border border-success/25'
              : 'bg-primary/15 hover:bg-primary/25 text-primary-light border border-primary/25'
          }`}
        >
          {copied ? 'copied' : 'copy prompt'}
        </button>
      </div>
      <div className="p-3">
        <p className="text-[10px] text-text-muted mb-2 font-mono">
          Paste into Claude Code, Cursor, or any AI assistant to auto-apply this migration.
        </p>
        <pre className="bg-code-bg border border-border rounded p-3 text-[11px] text-text leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto font-mono">
          {instructions}
        </pre>
      </div>
    </div>
  );
}

// ─── Section Nav ───
const SECTION_IDS = ['actions', 'breaking', 'steps', 'features', 'deprecations', 'deps', 'ai-prompt'] as const;
const SECTION_LABELS: Record<string, string> = {
  actions: 'actions',
  breaking: 'breaking',
  steps: 'steps',
  features: 'features',
  deprecations: 'deprecated',
  deps: 'deps',
  'ai-prompt': 'ai prompt',
};

// ─── Fallback markdown renderer ───
function MarkdownFallback({ markdown, streaming }: { markdown: string; streaming?: boolean }) {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-surface rounded-lg p-4 border border-border">
        {streaming && (
          <div className="flex items-center gap-2 mb-3 text-primary text-xs font-mono">
            <span className="animate-pulse">●</span> generating...
          </div>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const isInline = !className;
              if (isInline) {
                return <code className="bg-code-bg px-1 py-0.5 rounded text-primary-light text-xs font-mono" {...props}>{children}</code>;
              }
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

// ─── Main ReportView ───
export function ReportView({ markdown, streaming }: Props) {
  const report = useMemo(() => streaming ? null : tryParseReport(markdown), [markdown, streaming]);
  const [activeSection, setActiveSection] = useState<string>('actions');

  if (streaming || !report) {
    return <MarkdownFallback markdown={markdown} streaming={streaming} />;
  }

  const hasBreaking = report.breakingChanges.length > 0;
  const hasSteps = report.migrationSteps.length > 0;
  const hasFeatures = report.newFeatures.length > 0;
  const hasDeprecations = report.deprecations.length > 0;
  const hasDeps = report.dependencyChanges &&
    (report.dependencyChanges.added.length > 0 || report.dependencyChanges.removed.length > 0 || report.dependencyChanges.updated.length > 0);
  const hasAiPrompt = !!report.aiInstructions;

  const visibleSections = SECTION_IDS.filter(id => {
    if (id === 'actions') return report.quickActions.length > 0;
    if (id === 'breaking') return hasBreaking;
    if (id === 'steps') return hasSteps;
    if (id === 'features') return hasFeatures;
    if (id === 'deprecations') return hasDeprecations;
    if (id === 'deps') return hasDeps;
    if (id === 'ai-prompt') return hasAiPrompt;
    return false;
  });

  return (
    <div>
      <ImpactBanner report={report} />

      <div className="flex gap-4">
        {/* Sidebar */}
        <nav className="hidden lg:block w-32 flex-shrink-0">
          <div className="sticky top-14 space-y-0.5">
            {visibleSections.map(id => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setActiveSection(id)}
                className={`block text-[11px] font-mono px-2 py-1 rounded transition-colors no-underline ${
                  activeSection === id
                    ? 'bg-primary/15 text-primary-light'
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                {SECTION_LABELS[id]}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {report.quickActions.length > 0 && (
            <div id="actions">
              <QuickActions actions={report.quickActions} />
            </div>
          )}

          {hasBreaking && (
            <div id="breaking">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">breaking changes</span>
                <span className="text-[10px] font-mono text-text-muted">({report.breakingChanges.length})</span>
              </div>
              <div className="space-y-1.5">
                {report.breakingChanges
                  .sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.risk] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.risk]))
                  .map((bc, i) => (
                    <BreakingChangeCard key={i} change={bc} />
                  ))}
              </div>
            </div>
          )}

          {hasSteps && (
            <div id="steps">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">migration steps</span>
              <MigrationSteps steps={report.migrationSteps} />
            </div>
          )}

          {hasFeatures && (
            <div id="features">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">new features</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {report.newFeatures.map((f, i) => (
                  <div key={i} className="bg-surface rounded-lg border border-border p-3">
                    <h4 className="text-xs font-medium text-text">{f.title}</h4>
                    <p className="text-[11px] text-text-muted mt-0.5">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasDeprecations && (
            <div id="deprecations">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">deprecations</span>
              <div className="space-y-1.5">
                {report.deprecations.map((d, i) => (
                  <div key={i} className="bg-surface rounded-lg border border-border border-l-2 border-l-warning px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-medium text-text font-mono">{d.item}</span>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          Use <code className="bg-code-bg px-1 py-0.5 rounded text-primary-light text-[11px] font-mono">{d.alternative}</code>
                        </p>
                      </div>
                      {d.deadline && d.deadline !== 'Unknown' && (
                        <span className="text-[9px] uppercase tracking-wider text-warning bg-warning/10 px-1.5 py-0.5 rounded flex-shrink-0 font-mono">
                          {d.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasDeps && (
            <div id="deps">
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">dependency changes</span>
              <div className="bg-surface rounded-lg border border-border p-3 space-y-2">
                {report.dependencyChanges.removed.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-danger font-mono font-semibold">removed</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {report.dependencyChanges.removed.map((d, i) => (
                        <span key={i} className="bg-danger/10 text-danger text-[11px] px-1.5 py-0.5 rounded border border-danger/15 font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {report.dependencyChanges.added.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-success font-mono font-semibold">added</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {report.dependencyChanges.added.map((d, i) => (
                        <span key={i} className="bg-success/10 text-success text-[11px] px-1.5 py-0.5 rounded border border-success/15 font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {report.dependencyChanges.updated.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-primary-light font-mono font-semibold">updated</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {report.dependencyChanges.updated.map((d, i) => (
                        <span key={i} className="bg-primary/10 text-primary-light text-[11px] px-1.5 py-0.5 rounded border border-primary/15 font-mono">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasAiPrompt && (
            <div id="ai-prompt">
              <AiInstructions instructions={report.aiInstructions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
