import { defineConfig } from '@chaspy/denshobato-core';

export default defineConfig({
  model: 'claude-sonnet-4-20250514',
  editableDirectories: ['src'],
  includePatterns: ['**/*.tsx', '**/*.css'],
  agentPrompt:
    'This is a React Todo application using Tailwind CSS. It has pages for Home, Todo List (with CRUD operations), and About. Use Tailwind CSS utility classes for styling.',
  github: {
    baseBranch: 'main',
  },
});
