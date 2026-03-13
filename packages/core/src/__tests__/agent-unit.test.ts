import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { DenshobatoAgent } from '../agent.js';
import { defineConfig } from '../config.js';
import { SessionManager } from '../session.js';

describe('DenshobatoAgent', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-agent-unit-${randomUUID()}`);
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'App.tsx'), '<div>Hello</div>');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates agent with default session manager', () => {
      const agent = new DenshobatoAgent(
        defineConfig({ sessionStorageDir: '' }),
        tempDir,
      );
      expect(agent.getSessionManager()).toBeDefined();
    });

    it('creates agent with provided session manager', () => {
      const sm = new SessionManager();
      const agent = new DenshobatoAgent(defineConfig({}), tempDir, sm);
      expect(agent.getSessionManager()).toBe(sm);
    });
  });

  describe('getFileOps', () => {
    it('returns file operations for base project dir without session', () => {
      const agent = new DenshobatoAgent(
        defineConfig({ editableDirectories: ['src'], sessionStorageDir: '' }),
        tempDir,
      );
      const fileOps = agent.getFileOps();
      expect(fileOps.readFile('src/App.tsx')).toBe('<div>Hello</div>');
    });

    it('returns file operations scoped to session appDir when available', () => {
      const sessionDir = join(tmpdir(), `denshobato-session-dir-${randomUUID()}`);
      mkdirSync(join(sessionDir, 'src'), { recursive: true });
      writeFileSync(join(sessionDir, 'src', 'App.tsx'), '<div>Session</div>');

      try {
        const agent = new DenshobatoAgent(
          defineConfig({ editableDirectories: ['src'], sessionStorageDir: '' }),
          tempDir,
        );
        const sm = agent.getSessionManager();
        const session = sm.createSession({ appDir: sessionDir });
        const fileOps = agent.getFileOps(session.id);
        expect(fileOps.readFile('src/App.tsx')).toBe('<div>Session</div>');
      } finally {
        rmSync(sessionDir, { recursive: true, force: true });
      }
    });
  });

  describe('restoreSessionWorkspace', () => {
    it('restores files from workspace state', () => {
      const agent = new DenshobatoAgent(
        defineConfig({ editableDirectories: ['src'], sessionStorageDir: '' }),
        tempDir,
      );
      const sm = agent.getSessionManager();
      const fileOps = agent.getFileOps();

      // Create session A with modifications
      const sessionA = sm.createSession('/');
      sm.addSnapshot(sessionA.id, 'src/App.tsx', '<div>Hello</div>', true);
      sm.setWorkspaceFile(sessionA.id, 'src/App.tsx', '<div>Modified</div>');
      fileOps.writeFile('src/App.tsx', '<div>Modified</div>');

      // Create session B (clean)
      const sessionB = sm.createSession('/');
      const restored = agent.restoreSessionWorkspace(sessionB.id);

      expect(restored).toContain('src/App.tsx');
      expect(fileOps.readFile('src/App.tsx')).toBe('<div>Hello</div>');
    });

    it('deletes files that did not exist in original snapshot', () => {
      const agent = new DenshobatoAgent(
        defineConfig({ editableDirectories: ['src'], sessionStorageDir: '' }),
        tempDir,
      );
      const sm = agent.getSessionManager();
      const fileOps = agent.getFileOps();

      const session = sm.createSession('/');
      sm.addSnapshot(session.id, 'src/New.tsx', '', false);
      sm.setWorkspaceFile(session.id, 'src/New.tsx', 'export default 1;');
      fileOps.writeFile('src/New.tsx', 'export default 1;');

      const clean = sm.createSession('/');
      agent.restoreSessionWorkspace(clean.id);

      expect(fileOps.fileExists('src/New.tsx')).toBe(false);
    });

    it('throws for unknown session', () => {
      const agent = new DenshobatoAgent(
        defineConfig({ sessionStorageDir: '' }),
        tempDir,
      );
      expect(() => agent.restoreSessionWorkspace('nonexistent')).toThrow(
        'Session not found',
      );
    });
  });

  describe('chat', () => {
    it('throws without API key', async () => {
      const original = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      try {
        const agent = new DenshobatoAgent(
          defineConfig({ sessionStorageDir: '' }),
          tempDir,
        );
        const session = agent.getSessionManager().createSession('/');
        await expect(agent.chat(session.id, 'hello')).rejects.toThrow(
          'Anthropic API key is not configured',
        );
      } finally {
        if (original !== undefined) {
          process.env.ANTHROPIC_API_KEY = original;
        }
      }
    });

    it('throws for unknown session', async () => {
      const agent = new DenshobatoAgent(
        defineConfig({ sessionStorageDir: '' }),
        tempDir,
      );
      await expect(agent.chat('nonexistent', 'hello')).rejects.toThrow(
        'Session not found',
      );
    });
  });
});
