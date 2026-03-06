import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { DenshobatoAgent } from '../agent.js';
import { defineConfig } from '../config.js';

describe('DenshobatoAgent workspace restore', () => {
  let tempDir: string;
  let agent: DenshobatoAgent;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-agent-test-${randomUUID()}`);
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'App.tsx'), '<div>base</div>');
    agent = new DenshobatoAgent(
      defineConfig({
        editableDirectories: ['src'],
        includePatterns: ['src/**/*.tsx'],
      }),
      tempDir,
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('restores the file state for the selected session', () => {
    const sessionManager = agent.getSessionManager();
    const fileOps = agent.getFileOps();

    const base = sessionManager.createSession('/');
    sessionManager.addSnapshot(base.id, 'src/App.tsx', '<div>base</div>', true);
    sessionManager.setWorkspaceFile(base.id, 'src/App.tsx', '<div>session-a</div>');
    fileOps.writeFile('src/App.tsx', '<div>session-a</div>');

    const fork = sessionManager.createSession({
      previewUrl: '/todos',
      baseSessionId: base.id,
      seedFiles: sessionManager.getWorkspaceFiles(base.id),
    });
    sessionManager.addSnapshot(fork.id, 'src/New.tsx', '', false);
    sessionManager.setWorkspaceFile(fork.id, 'src/New.tsx', 'export const value = 1;');
    fileOps.writeFile('src/New.tsx', 'export const value = 1;');

    const clean = sessionManager.createSession('/');
    const restored = agent.restoreSessionWorkspace(clean.id);

    expect(restored).toContain('src/App.tsx');
    expect(restored).toContain('src/New.tsx');
    expect(fileOps.readFile('src/App.tsx')).toBe('<div>base</div>');
    expect(fileOps.fileExists('src/New.tsx')).toBe(false);
  });
});
