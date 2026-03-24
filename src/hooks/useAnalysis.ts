import { useReducer, useCallback, useRef } from 'react';
import { analysisReducer, initialAnalysisState } from '../stores/analysis-store';
import { analyzePackage } from '../services/package-analyzer';

export function useAnalysis() {
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const abortRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async (
    packageName: string,
    fromVersion: string,
    toVersion: string,
    claudeApiKey: string,
    githubToken?: string,
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'START' });

    try {
      const generator = analyzePackage(
        packageName, fromVersion, toVersion,
        claudeApiKey, githubToken,
        controller.signal
      );

      for await (const event of generator) {
        if (controller.signal.aborted) break;

        switch (event.type) {
          case 'step':
            dispatch({
              type: 'STEP_UPDATE',
              step: event.step,
              info: { status: event.status, summary: event.summary, error: event.error },
            });
            break;
          case 'ai-chunk':
            dispatch({ type: 'AI_CHUNK', text: event.text });
            break;
          case 'usage':
            dispatch({ type: 'USAGE', usage: event.usage });
            break;
          case 'complete':
            dispatch({ type: 'COMPLETE', report: event.report });
            break;
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        dispatch({ type: 'ERROR', error: err instanceof Error ? err.message : String(err) });
      }
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  return { state, startAnalysis, cancelAnalysis };
}
