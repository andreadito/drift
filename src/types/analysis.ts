import type { NpmPackageMetadata, NpmVersionInfo } from './npm';
import type { GitHubRelease, GitHubCompareResponse } from './github';

export type StepName =
  | 'npm-metadata'
  | 'changelog'
  | 'releases'
  | 'commits'
  | 'exports'
  | 'ai-analysis';

export type StepStatus = 'pending' | 'loading' | 'done' | 'error' | 'skipped';

export interface StepInfo {
  status: StepStatus;
  summary?: string;
  error?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export type AnalysisEvent =
  | { type: 'step'; step: StepName; status: StepStatus; summary?: string; error?: string }
  | { type: 'ai-chunk'; text: string }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'complete'; report: string };

export interface GatheredData {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  metadata: NpmPackageMetadata;
  fromVersionInfo: NpmVersionInfo;
  toVersionInfo: NpmVersionInfo;
  changelog: string | null;
  releases: GitHubRelease[];
  comparison: GitHubCompareResponse | null;
  exportDiff: ExportDiff | null;
}

export interface ExportDiff {
  added: string[];
  removed: string[];
  changed: string[];
  fromExports: string[];
  toExports: string[];
}

export type AnalysisStatus = 'idle' | 'gathering' | 'analyzing' | 'complete' | 'error';

export interface AnalysisState {
  status: AnalysisStatus;
  steps: Record<StepName, StepInfo>;
  rawAiResponse: string;
  usage: TokenUsage | null;
  error: string | null;
}

export type AnalysisAction =
  | { type: 'START' }
  | { type: 'STEP_UPDATE'; step: StepName; info: StepInfo }
  | { type: 'AI_CHUNK'; text: string }
  | { type: 'USAGE'; usage: TokenUsage }
  | { type: 'COMPLETE'; report: string }
  | { type: 'ERROR'; error: string }
  | { type: 'RESET' };
