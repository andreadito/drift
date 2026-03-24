import type { AnalysisState, AnalysisAction, StepName, StepInfo } from '../types/analysis';

const STEP_NAMES: StepName[] = ['npm-metadata', 'changelog', 'releases', 'commits', 'exports', 'ai-analysis'];

function makeInitialSteps(): Record<StepName, StepInfo> {
  return Object.fromEntries(STEP_NAMES.map(s => [s, { status: 'pending' as const }])) as Record<StepName, StepInfo>;
}

export const initialAnalysisState: AnalysisState = {
  status: 'idle',
  steps: makeInitialSteps(),
  rawAiResponse: '',
  usage: null,
  error: null,
};

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case 'START':
      return { ...initialAnalysisState, status: 'gathering', steps: makeInitialSteps() };
    case 'STEP_UPDATE':
      return {
        ...state,
        status: action.step === 'ai-analysis' && action.info.status === 'loading' ? 'analyzing' : state.status,
        steps: { ...state.steps, [action.step]: action.info },
      };
    case 'AI_CHUNK':
      return { ...state, rawAiResponse: state.rawAiResponse + action.text };
    case 'USAGE':
      return { ...state, usage: action.usage };
    case 'COMPLETE':
      return { ...state, status: 'complete', rawAiResponse: action.report };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return initialAnalysisState;
    default:
      return state;
  }
}
