# Denshobato Studio

AI-powered UI editing overlay for Vite + React applications. Select any UI element, describe changes in natural language, and watch the code update instantly via HMR. When you're happy with the result, create a GitHub PR directly from the overlay.

## Features

- **Element Selector** - Click any UI element to select it. The source file and line number are identified automatically via JSX transform.
- **AI Chat** - Describe UI changes in natural language. The AI reads, edits, and writes files using Claude's tool-use loop.
- **Instant Preview** - Vite HMR updates the browser as soon as files are modified. Each session gets an isolated workspace and preview server.
- **Session Management** - Create multiple editing sessions with independent file snapshots. Revert any session to its original state.
- **GitHub PR Creation** - Push changes and open a pull request directly from the overlay.
- **Deep Think Mode** - Enable exploratory editing for complex changes.
- **Bilingual** - Supports English and Japanese.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@chaspy/denshobato-vite-plugin`](./packages/vite-plugin) | Vite plugin (JSX transform + dev server middleware) | [![npm](https://img.shields.io/npm/v/@chaspy/denshobato-vite-plugin)](https://www.npmjs.com/package/@chaspy/denshobato-vite-plugin) |
| [`@chaspy/denshobato-core`](./packages/core) | LLM integration, file operations, session management, GitHub integration | [![npm](https://img.shields.io/npm/v/@chaspy/denshobato-core)](https://www.npmjs.com/package/@chaspy/denshobato-core) |
| [`@chaspy/denshobato-ui`](./packages/ui) | React overlay UI (chat, element selector, diff viewer, PR dialog) | [![npm](https://img.shields.io/npm/v/@chaspy/denshobato-ui)](https://www.npmjs.com/package/@chaspy/denshobato-ui) |
| [`@chaspy/denshobato-server`](./packages/server) | Standalone Express server for non-Vite environments | [![npm](https://img.shields.io/npm/v/@chaspy/denshobato-server)](https://www.npmjs.com/package/@chaspy/denshobato-server) |

## Quick Start

### 1. Install

```bash
npm install @chaspy/denshobato-vite-plugin @chaspy/denshobato-ui
```

### 2. Add the Vite plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { denshobato } from '@chaspy/denshobato-vite-plugin'

export default defineConfig({
  plugins: [denshobato(), react()],
})
```

### 3. Run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open `http://localhost:5173/dev` to access the Studio overlay. Your app runs in an iframe inside the overlay.

## How It Works

```
Browser                          Vite Dev Server
+----------------------+        +------------------------------+
| User App             |        |                              |
| (data-denshobato-*   |        |  /__denshobato/* API routes  |
|  attributes injected)|        |                              |
|                      |        |  DenshobatoAgent (@core)     |
| DenshobatoOverlay    |--HTTP--+    1. Build prompt           |
|  +- ChatPanel        |        |    2. Anthropic API call     |
|  +- ElementSelector  |        |    3. tool_use file edits    |
|  +- DiffViewer       |        |    4. Return result          |
|  +- PRDialog         |        |                              |
+----------------------+        |  Vite HMR -> instant update  |
                                +------------------------------+
```

1. The Vite plugin injects `data-denshobato-file` and `data-denshobato-line` attributes into JSX elements during development.
2. The overlay UI renders in a Shadow DOM, isolated from your app's styles.
3. Click the selector button, then click any UI element to select it.
4. Describe changes in the chat panel - the AI modifies source files directly.
5. Vite HMR updates the browser instantly.
6. Review diffs and create GitHub PRs from the overlay.

## Configuration

Create an optional `denshobato.config.ts` in your project root:

```ts
import { defineConfig } from '@chaspy/denshobato-core'

export default defineConfig({
  // Claude model to use (default: 'claude-sonnet-4-20250514')
  model: 'claude-sonnet-4-20250514',

  // Max tokens per API call (default: 4096)
  maxTokens: 4096,

  // Directories the AI is allowed to edit (default: ['src'])
  editableDirectories: ['src'],

  // File patterns to include/exclude
  includePatterns: ['**/*.tsx', '**/*.ts', '**/*.css'],
  excludePatterns: ['**/node_modules/**', '**/dist/**'],

  // Project context prompt for the AI
  agentPrompt: 'This is a React app using Tailwind CSS.',

  // GitHub PR settings
  github: {
    baseBranch: 'main',
    // owner and repo are auto-detected from git remote
  },

  // Session storage directory (default: '.denshobato')
  sessionStorageDir: '.denshobato',
})
```

## Standalone Server

For non-Vite environments, use the standalone Express server:

```bash
npm install @chaspy/denshobato-server
```

```bash
npx denshobato-server --project-dir ./my-app --port 3000
```

Or programmatically:

```ts
import { createServer } from '@chaspy/denshobato-server'

const app = await createServer({
  projectDir: './my-app',
  corsOrigin: 'http://localhost:3000',
  authToken: process.env.AUTH_TOKEN,
})

app.listen(3001)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (required). Can also be set in the UI settings. |
| `GITHUB_TOKEN` | GitHub personal access token for PR creation (optional). |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run the example app with Studio overlay
make dev
# Studio: http://localhost:39483/dev
```

### Versioning

This project uses [Changesets](https://github.com/changesets/changesets) for version management. To add a changeset:

```bash
pnpm changeset
```

To publish:

```bash
pnpm changeset version
pnpm build
pnpm changeset publish
```

## License

MIT
