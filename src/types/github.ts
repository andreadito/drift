export interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

export interface GitHubCompareResponse {
  total_commits: number;
  commits: Array<{
    sha: string;
    commit: {
      message: string;
    };
  }>;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
}
