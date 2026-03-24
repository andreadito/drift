export interface NpmSearchResult {
  name: string;
  description: string;
  version: string;
}

export interface NpmPackageMetadata {
  name: string;
  description: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, NpmVersionInfo>;
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
  time?: Record<string, string>;
}

export interface NpmVersionInfo {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
  main?: string;
  types?: string;
  typings?: string;
}
