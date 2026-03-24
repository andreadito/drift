import type { GatheredData } from '../types/analysis';

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n... (truncated)';
}

function buildDependencyDiff(from: Record<string, string> | undefined, to: Record<string, string> | undefined): string {
  if (!from && !to) return 'No dependency information available.';
  const fromDeps = from || {};
  const toDeps = to || {};
  const allKeys = new Set([...Object.keys(fromDeps), ...Object.keys(toDeps)]);
  const lines: string[] = [];

  for (const key of [...allKeys].sort()) {
    const fv = fromDeps[key];
    const tv = toDeps[key];
    if (!fv && tv) lines.push(`+ ${key}: ${tv}`);
    else if (fv && !tv) lines.push(`- ${key}: ${fv}`);
    else if (fv !== tv) lines.push(`~ ${key}: ${fv} → ${tv}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No changes.';
}

export function buildSystemPrompt(): string {
  return `You are an expert npm package migration analyst. Analyze the differences between two package versions and produce a structured migration report.

CRITICAL: Your output MUST be valid JSON matching this exact schema. Output ONLY the JSON, no markdown fences, no extra text:

{
  "summary": "2-3 sentence overview of the upgrade",
  "impactLevel": "HIGH" | "MEDIUM" | "LOW",
  "quickActions": [
    "Short imperative action sentence, e.g. Replace import X with import Y",
    "Run npm install newDep@latest",
    "Update config file to use new option name"
  ],
  "breakingChanges": [
    {
      "title": "Short descriptive title",
      "risk": "HIGH" | "MEDIUM" | "LOW",
      "description": "What changed and why it matters",
      "before": "code snippet showing old usage (just the code, no fences)",
      "after": "code snippet showing new usage (just the code, no fences)",
      "migrationNote": "One-liner on what to do"
    }
  ],
  "migrationSteps": [
    {
      "step": 1,
      "title": "Short step title",
      "detail": "Detailed instruction with specifics",
      "commands": ["npm install ...", "npx migrate ..."]
    }
  ],
  "newFeatures": [
    {
      "title": "Feature name",
      "description": "Brief description of what it enables"
    }
  ],
  "deprecations": [
    {
      "item": "Deprecated API or feature name",
      "alternative": "What to use instead",
      "deadline": "When it will be removed, if known"
    }
  ],
  "dependencyChanges": {
    "added": ["pkg@version"],
    "removed": ["pkg@version"],
    "updated": ["pkg: oldVersion → newVersion"]
  },
  "aiInstructions": "A complete, self-contained prompt that can be pasted into an AI coding assistant (like Claude Code) to execute this migration automatically on a codebase. See rules below."
}

Rules:
- quickActions: The TOP 5-10 most important things to do, ordered by priority. These are the "TL;DR" checklist. Each must be a short, imperative sentence a developer can act on immediately.
- breakingChanges: Include ALL breaking changes. before/after should be real code, not pseudocode. Keep them concise - just the relevant lines.
- migrationSteps: Ordered sequence. Include actual commands where applicable.
- Risk: HIGH = will break your code, MEDIUM = might break depending on usage, LOW = unlikely but worth knowing.
- Be specific. Use real package names, real function names, real config keys.
- If information is incomplete, say so honestly rather than guessing.
- commands arrays can be empty if no CLI command is needed for that step.
- aiInstructions: Write a COMPLETE prompt that an AI coding assistant can follow to perform the migration on an existing codebase. This should be a single, self-contained block of text structured as follows:
  1. Start with context: what package is being upgraded, from what version to what version.
  2. List specific search-and-replace patterns (old import → new import, old API call → new API call).
  3. List commands to run (npm install, etc.).
  4. List files/patterns to look for in the codebase (e.g. "Search for all files importing from '@pkg/old'").
  5. Include validation steps (run tests, check for TypeScript errors, etc.).
  6. Be explicit about order of operations.
  7. Warn about edge cases the AI should watch for.
  The tone should be imperative and direct - this is an instruction set, not a report. Write it as if you're telling a senior developer exactly what to do, step by step.`;
}

export function buildUserPrompt(data: GatheredData): string {
  const sections: string[] = [];

  sections.push(`# Package: ${data.packageName}`);
  sections.push(`# Upgrading from ${data.fromVersion} to ${data.toVersion}`);

  // Dependency changes
  sections.push('\n## Dependency Changes (from → to)');
  sections.push('### dependencies');
  sections.push(buildDependencyDiff(data.fromVersionInfo.dependencies, data.toVersionInfo.dependencies));
  sections.push('### peerDependencies');
  sections.push(buildDependencyDiff(data.fromVersionInfo.peerDependencies, data.toVersionInfo.peerDependencies));

  // Export diff
  if (data.exportDiff) {
    sections.push('\n## Export API Surface Changes');
    if (data.exportDiff.removed.length > 0) {
      sections.push(`### Removed exports (BREAKING)\n${data.exportDiff.removed.join(', ')}`);
    }
    if (data.exportDiff.added.length > 0) {
      sections.push(`### Added exports\n${data.exportDiff.added.join(', ')}`);
    }
    if (data.exportDiff.removed.length === 0 && data.exportDiff.added.length === 0) {
      sections.push('No export changes detected (note: this is based on regex analysis and may miss signature changes).');
    }
  }

  // Changelog
  if (data.changelog) {
    sections.push('\n## Changelog (raw)');
    sections.push(truncate(data.changelog, 16000));
  }

  // Release notes
  if (data.releases.length > 0) {
    sections.push(`\n## GitHub Releases (${data.releases.length} releases between versions)`);
    const releaseText = data.releases
      .map(r => `### ${r.tag_name} (${r.published_at?.split('T')[0] || 'unknown date'})\n${r.body || 'No release notes.'}`)
      .join('\n\n');
    sections.push(truncate(releaseText, 16000));
  }

  // Commit summary
  if (data.comparison) {
    sections.push(`\n## Commit Summary (${data.comparison.total_commits} commits)`);
    const commitMessages = data.comparison.commits
      .slice(0, 100)
      .map(c => `- ${c.commit.message.split('\n')[0]}`)
      .join('\n');
    sections.push(truncate(commitMessages, 8000));

    if (data.comparison.files && data.comparison.files.length > 0) {
      sections.push(`\n### Files Changed (${data.comparison.files.length} files)`);
      const fileList = data.comparison.files
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 50)
        .map(f => `- ${f.filename} (+${f.additions}/-${f.deletions})`)
        .join('\n');
      sections.push(truncate(fileList, 4000));
    }
  }

  return sections.join('\n');
}
