import type { AnalysisEvent, GatheredData } from '../types/analysis';
import { getPackageMetadata } from './npm-registry';
import { resolveRepoFromNpm, fetchChangelog, fetchReleasesBetween, compareCommits } from './github';
import { fetchExportDiff } from './unpkg';
import { streamClaudeResponse } from './anthropic';
import { buildSystemPrompt, buildUserPrompt } from '../lib/prompt-builder';

export async function* analyzePackage(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  claudeApiKey: string,
  githubToken?: string,
  signal?: AbortSignal
): AsyncGenerator<AnalysisEvent> {
  const gathered: Partial<GatheredData> = {
    packageName,
    fromVersion,
    toVersion,
  };

  // Step 1: npm metadata
  yield { type: 'step', step: 'npm-metadata', status: 'loading' };
  try {
    const metadata = await getPackageMetadata(packageName, signal);
    gathered.metadata = metadata;
    gathered.fromVersionInfo = metadata.versions[fromVersion];
    gathered.toVersionInfo = metadata.versions[toVersion];

    if (!gathered.fromVersionInfo || !gathered.toVersionInfo) {
      throw new Error(`Version ${!gathered.fromVersionInfo ? fromVersion : toVersion} not found in registry`);
    }

    const versionCount = Object.keys(metadata.versions).length;
    yield { type: 'step', step: 'npm-metadata', status: 'done', summary: `${versionCount} versions found` };
  } catch (err) {
    yield { type: 'step', step: 'npm-metadata', status: 'error', error: String(err) };
    throw err;
  }

  // Resolve GitHub repo
  const ghRepo = resolveRepoFromNpm(gathered.metadata!);

  // Collect loading state events
  const results: AnalysisEvent[] = [];

  const pushEvent = (e: AnalysisEvent) => results.push(e);

  // Changelog
  if (ghRepo) {
    pushEvent({ type: 'step', step: 'changelog', status: 'loading' });
    pushEvent({ type: 'step', step: 'releases', status: 'loading' });
    pushEvent({ type: 'step', step: 'commits', status: 'loading' });
  }
  pushEvent({ type: 'step', step: 'exports', status: 'loading' });

  // Yield loading states
  for (const e of results) yield e;
  results.length = 0;

  // Run parallel fetches
  const [changelogResult, releasesResult, commitsResult, exportsResult] = await Promise.allSettled([
    ghRepo
      ? fetchChangelog(ghRepo.owner, ghRepo.repo, githubToken, signal).then(cl => { gathered.changelog = cl; return cl; })
      : Promise.resolve(null),
    ghRepo
      ? fetchReleasesBetween(ghRepo.owner, ghRepo.repo, fromVersion, toVersion, githubToken, signal).then(r => { gathered.releases = r; return r; })
      : Promise.resolve([]),
    ghRepo
      ? compareCommits(ghRepo.owner, ghRepo.repo, fromVersion, toVersion, githubToken, signal).then(c => { gathered.comparison = c; return c; })
      : Promise.resolve(null),
    fetchExportDiff(packageName, gathered.fromVersionInfo!, gathered.toVersionInfo!, signal).then(d => { gathered.exportDiff = d; return d; }),
  ]);

  // Yield results
  if (ghRepo) {
    yield {
      type: 'step', step: 'changelog',
      status: changelogResult.status === 'fulfilled' ? 'done' : 'error',
      summary: changelogResult.status === 'fulfilled'
        ? (changelogResult.value ? 'Found changelog' : 'No changelog found')
        : 'Failed to fetch',
    };

    yield {
      type: 'step', step: 'releases',
      status: releasesResult.status === 'fulfilled' ? 'done' : 'error',
      summary: releasesResult.status === 'fulfilled'
        ? `${(releasesResult.value as unknown[])?.length || 0} releases found`
        : 'Failed to fetch',
    };

    yield {
      type: 'step', step: 'commits',
      status: commitsResult.status === 'fulfilled' ? 'done' : 'error',
      summary: commitsResult.status === 'fulfilled'
        ? (commitsResult.value ? `${commitsResult.value.total_commits} commits` : 'Could not compare')
        : 'Failed to fetch',
    };
  } else {
    yield { type: 'step', step: 'changelog', status: 'skipped', summary: 'No GitHub repo' };
    yield { type: 'step', step: 'releases', status: 'skipped', summary: 'No GitHub repo' };
    yield { type: 'step', step: 'commits', status: 'skipped', summary: 'No GitHub repo' };
  }

  yield {
    type: 'step', step: 'exports',
    status: exportsResult.status === 'fulfilled' ? 'done' : 'error',
    summary: exportsResult.status === 'fulfilled'
      ? (exportsResult.value
        ? `${exportsResult.value.added.length} added, ${exportsResult.value.removed.length} removed`
        : 'Could not analyze exports')
      : 'Failed to analyze',
  };

  // Ensure defaults for missing data
  gathered.changelog = gathered.changelog ?? null;
  gathered.releases = gathered.releases ?? [];
  gathered.comparison = gathered.comparison ?? null;
  gathered.exportDiff = gathered.exportDiff ?? null;

  // Step 5: AI Analysis
  yield { type: 'step', step: 'ai-analysis', status: 'loading', summary: 'Analyzing with Claude...' };

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(gathered as GatheredData);
    let fullResponse = '';

    for await (const event of streamClaudeResponse(systemPrompt, userPrompt, claudeApiKey, signal)) {
      if (event.type === 'text') {
        fullResponse += event.text;
        yield { type: 'ai-chunk', text: event.text };
      } else if (event.type === 'usage') {
        // Claude Sonnet pricing: $3/M input, $15/M output
        const costUsd = (event.usage.inputTokens * 3 + event.usage.outputTokens * 15) / 1_000_000;
        yield { type: 'usage', usage: { inputTokens: event.usage.inputTokens, outputTokens: event.usage.outputTokens, costUsd } };
      }
    }

    yield { type: 'step', step: 'ai-analysis', status: 'done', summary: 'Analysis complete' };
    yield { type: 'complete', report: fullResponse };
  } catch (err) {
    yield { type: 'step', step: 'ai-analysis', status: 'error', error: String(err) };
    throw err;
  }
}

