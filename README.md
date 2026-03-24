# drift

Analyze npm package version drift. Get AI-powered migration reports with actionable steps.

![drift - dark mode](./docs/screenshot-dark.png)

![drift - light mode](./docs/screenshot-light.png)

## What it does

Enter an npm package name, pick a "from" and "to" version, and drift will:

1. **Gather data** from npm registry, GitHub (changelogs, releases, commits), and unpkg (export surface diffs)
2. **Analyze with AI** using Claude to produce a structured migration report
3. **Show you exactly what to do** — breaking changes with before/after code, ordered migration steps, and a ready-to-paste AI prompt to auto-apply the migration

## Privacy & Security

**Your API keys never leave your browser.**

- Keys are stored in `localStorage` only — never sent to any server
- API calls go directly from your browser to `api.anthropic.com` and `api.github.com`
- No backend, no server, no tracking, no analytics — 100% client-side SPA
- [Read the source code](./src/services/anthropic.ts) to verify

## Setup

```bash
git clone https://github.com/andreadito/drift.git
cd drift
npm install
npm run dev
```

Then go to **Settings** and add your Claude API key.

Optionally add a GitHub token to increase the rate limit from 60 to 5,000 requests/hour (no special scopes needed for public repos).

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4 with dark/light theme
- Direct Claude API calls from the browser (streaming)
- npm registry, GitHub API, unpkg — all CORS-friendly, no proxy needed

## How the AI prompt works

After analysis, drift generates a complete, self-contained prompt you can paste into Claude Code, Cursor, or any AI assistant. The prompt includes specific search-and-replace patterns, commands to run, files to check, and validation steps — so the AI can execute the migration on your codebase automatically.

## License

MIT
