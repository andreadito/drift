import type { StepName, StepInfo } from '../../types/analysis';

const STEP_LABELS: Record<StepName, string> = {
  'npm-metadata': 'npm',
  'changelog': 'changelog',
  'releases': 'releases',
  'commits': 'commits',
  'exports': 'exports',
  'ai-analysis': 'ai',
};

interface Props {
  steps: Record<StepName, StepInfo>;
}

export function GatheringProgress({ steps }: Props) {
  const stepOrder: StepName[] = ['npm-metadata', 'changelog', 'releases', 'commits', 'exports', 'ai-analysis'];

  return (
    <div className="flex flex-wrap gap-1.5">
      {stepOrder.map(step => {
        const info = steps[step];
        const isLoading = info.status === 'loading';
        const isDone = info.status === 'done';
        const isError = info.status === 'error';

        return (
          <div
            key={step}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
              isLoading ? 'border-primary/40 bg-primary/10 text-primary-light' :
              isDone ? 'border-success/30 bg-success/10 text-success' :
              isError ? 'border-danger/30 bg-danger/10 text-danger' :
              'border-border bg-surface text-text-muted'
            }`}
            title={info.summary || info.error || ''}
          >
            <span className={isLoading ? 'animate-pulse' : ''}>
              {isLoading ? '◌' : isDone ? '●' : isError ? '✕' : '○'}
            </span>
            {STEP_LABELS[step]}
          </div>
        );
      })}
    </div>
  );
}
