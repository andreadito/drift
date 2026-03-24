import type { NpmPackageMetadata } from '../types/npm';
import type { GitHubRepo, GitHubRelease, GitHubCompareResponse } from '../types/github';

const tagFormatCache = new Map<string, string>();

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

export function resolveRepoFromNpm(metadata: NpmPackageMetadata): GitHubRepo | null {
  const repoUrl = metadata.repository?.url;
  if (!repoUrl) return null;

  // Handle various formats: git+https://github.com/user/repo.git, github:user/repo, etc.
  const patterns = [
    /github\.com[/:]([^/]+)\/([^/.#]+)/,
    /^github:([^/]+)\/(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
}

async function resolveTagFormat(
  owner: string,
  repo: string,
  version: string,
  token?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const cacheKey = `${owner}/${repo}`;
  const cached = tagFormatCache.get(cacheKey);

  const formats = cached
    ? [cached]
    : [`v${version}`, version, `${repo}@${version}`];

  for (const tag of formats) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/tags/${tag}`,
      { headers: githubHeaders(token), signal }
    );
    if (res.ok) {
      // Cache the format pattern
      if (!cached) {
        const prefix = tag.replace(version, '');
        tagFormatCache.set(cacheKey, prefix + '{VERSION}');
      }
      return tag;
    }
  }
  return null;
}

function formatTag(owner: string, repo: string, version: string): string {
  const cacheKey = `${owner}/${repo}`;
  const pattern = tagFormatCache.get(cacheKey);
  if (pattern) return pattern.replace('{VERSION}', version);
  return `v${version}`;
}

export async function fetchChangelog(
  owner: string,
  repo: string,
  token?: string,
  signal?: AbortSignal
): Promise<string | null> {
  const filenames = ['CHANGELOG.md', 'HISTORY.md', 'CHANGES.md', 'changelog.md'];

  for (const filename of filenames) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`,
        { headers: githubHeaders(token), signal }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.content) {
        return atob(data.content.replace(/\n/g, ''));
      }
      if (data.download_url) {
        const dlRes = await fetch(data.download_url, { signal });
        if (dlRes.ok) return await dlRes.text();
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchReleasesBetween(
  owner: string,
  repo: string,
  fromVersion: string,
  toVersion: string,
  token?: string,
  signal?: AbortSignal
): Promise<GitHubRelease[]> {
  const releases: GitHubRelease[] = [];
  let page = 1;
  const maxPages = 5;

  while (page <= maxPages) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`,
      { headers: githubHeaders(token), signal }
    );
    if (!res.ok) break;
    const batch: GitHubRelease[] = await res.json();
    if (batch.length === 0) break;
    releases.push(...batch);
    page++;
  }

  // Filter to releases between fromVersion and toVersion
  const { gt, lte, valid, coerce } = await import('semver');
  return releases.filter(r => {
    const v = valid(r.tag_name) || valid(coerce(r.tag_name));
    if (!v) return false;
    return gt(v, fromVersion) && lte(v, toVersion);
  }).filter(r => !r.draft);
}

export async function compareCommits(
  owner: string,
  repo: string,
  fromVersion: string,
  toVersion: string,
  token?: string,
  signal?: AbortSignal
): Promise<GitHubCompareResponse | null> {
  // Resolve tag formats
  const fromTag = await resolveTagFormat(owner, repo, fromVersion, token, signal);
  if (!fromTag) return null;

  const toTag = formatTag(owner, repo, toVersion);

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/compare/${fromTag}...${toTag}`,
    { headers: githubHeaders(token), signal }
  );

  if (!res.ok) return null;
  return await res.json();
}
