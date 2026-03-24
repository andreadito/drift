export type Theme = 'dark' | 'light' | 'system';

export interface AppSettings {
  claudeApiKey: string;
  githubToken: string;
  theme: Theme;
}
