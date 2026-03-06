# Denshobato Studio

AI-powered UI editing overlay for Vite + React applications. Select any UI element, describe changes in natural language, and watch the code update instantly via HMR.

## Packages

| Package | Description |
|---------|-------------|
| `@denshobato-studio/core` | LLM integration, file operations, session management, GitHub integration |
| `@denshobato-studio/vite-plugin` | Vite plugin (JSX transform + dev server middleware) |
| `@denshobato-studio/ui` | React overlay UI (chat, element selector, diff viewer, PR dialog) |
| `@denshobato-studio/server` | Standalone Express server for deploy environments |

## Getting Started

### Installation

```bash
npm install @denshobato-studio/vite-plugin @denshobato-studio/ui
```

### Setup

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { denshobato } from '@denshobato-studio/vite-plugin'

export default defineConfig({
  plugins: [denshobato(), react()],
})
```

### Configuration (optional)

```ts
// denshobato.config.ts
import { defineConfig } from '@denshobato-studio/core'

export default defineConfig({
  model: 'claude-sonnet-4-20250514',
  editableDirectories: ['src'],
  includePatterns: ['**/*.tsx', '**/*.css'],
  agentPrompt: 'This is a React app using Tailwind CSS...',
  github: { baseBranch: 'main' },
})
```

### Run

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
# Overlay appears automatically in the browser
```

## How It Works

1. The Vite plugin injects `data-denshobato-file` and `data-denshobato-line` attributes into JSX elements during development
2. The overlay UI renders in a Shadow DOM, isolated from your app's styles
3. Click the selector button, then click any UI element to select it
4. Describe changes in the chat panel - the AI modifies source files directly
5. Vite HMR updates the browser instantly
6. Review diffs and create GitHub PRs from the overlay

## Architecture

```
Browser                          Vite Dev Server / Standalone Server
+----------------------+        +------------------------------+
| User App             |        |                              |
| (data-denshobato-*   |        |  /__denshobato/* API routes  |
|  attributes injected)|        |                              |
|                      |        |  DenshobatoAgent (@core)     |
| DenshobatoOverlay    |--HTTP--+    1. Build prompt           |
|  +- HeaderBar        |        |    2. Anthropic API call     |
|  +- ChatPanel        |        |    3. tool_use file edits    |
|  +- ComponentSelector|        |    4. Return result          |
|  +- DiffViewer       |        |                              |
|  +- PRDialog         |        |  Vite HMR -> instant update  |
+----------------------+        +------------------------------+
```

## Development

```bash
pnpm install
pnpm build
pnpm test

# Run example app
make dev
# Studio: http://localhost:39483/dev
# Default preview port: 39483
```

## License

MIT
