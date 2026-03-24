export interface ParsedReport {
  summary: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  quickActions: string[];
  breakingChanges: BreakingChange[];
  migrationSteps: MigrationStep[];
  newFeatures: NewFeature[];
  deprecations: Deprecation[];
  dependencyChanges: DependencyChanges;
  aiInstructions: string;
}

export interface BreakingChange {
  title: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  before: string;
  after: string;
  migrationNote: string;
}

export interface MigrationStep {
  step: number;
  title: string;
  detail: string;
  commands: string[];
}

export interface NewFeature {
  title: string;
  description: string;
}

export interface Deprecation {
  item: string;
  alternative: string;
  deadline: string;
}

export interface DependencyChanges {
  added: string[];
  removed: string[];
  updated: string[];
}
