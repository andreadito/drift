export type Theme = 'dark' | 'light' | 'system';

export interface AppSettings {
  claudeApiKey: string;
  githubToken: string;
  theme: Theme;
  teamName: string;
}

export interface ReportHistoryEntry {
  id: string;
  pkg: string;
  fromVersion: string;
  toVersion: string;
  timestamp: number;
  rawResponse: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}
