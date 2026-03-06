import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager, deriveSessionTitleFromMessages } from '../session.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('SessionManager', () => {
  describe('in-memory mode', () => {
    let manager: SessionManager;

    beforeEach(() => {
      manager = new SessionManager();
    });

    it('creates a session', () => {
      const session = manager.createSession();
      expect(session.id).toBeDefined();
      expect(session.previewUrl).toBe('/');
      expect(session.baseSessionId).toBeNull();
      expect(session.gitBranch).toBeNull();
      expect(session.messages).toEqual([]);
      expect(session.snapshots).toEqual([]);
      expect(session.workspaceFiles).toEqual({});
    });

    it('stores preview url per session', () => {
      const session = manager.createSession('/todos');
      expect(session.previewUrl).toBe('/todos');
      manager.setPreviewUrl(session.id, '/about');
      expect(manager.getSession(session.id)?.previewUrl).toBe('/about');
    });

    it('creates a session from an existing workspace state', () => {
      const parent = manager.createSession({
        previewUrl: '/todos',
        gitBranch: 'main',
        seedFiles: { 'src/App.tsx': '<div>draft</div>' },
      });
      const child = manager.createSession({
        previewUrl: '/about',
        baseSessionId: parent.id,
        gitBranch: 'feature/demo',
        seedFiles: manager.getWorkspaceFiles(parent.id),
      });

      expect(child.baseSessionId).toBe(parent.id);
      expect(child.gitBranch).toBe('feature/demo');
      expect(child.workspaceFiles).toEqual({ 'src/App.tsx': '<div>draft</div>' });
    });

    it('retrieves a session by id', () => {
      const session = manager.createSession();
      const retrieved = manager.getSession(session.id);
      expect(retrieved).toEqual(session);
    });

    it('returns undefined for unknown session', () => {
      expect(manager.getSession('nonexistent')).toBeUndefined();
    });

    it('adds messages to session', () => {
      const session = manager.createSession();
      const msg = manager.addMessage(session.id, {
        role: 'user',
        content: 'Hello',
        preferences: { responseLanguage: 'ja', thinkingMode: 'deep' },
      });
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('Hello');
      expect(msg.timestamp).toBeGreaterThan(0);
      expect(msg.preferences).toEqual({ responseLanguage: 'ja', thinkingMode: 'deep' });
      expect(manager.getSession(session.id)!.messages).toHaveLength(1);
    });

    it('adds snapshots (only first per file)', () => {
      const session = manager.createSession();
      manager.addSnapshot(session.id, 'src/app.tsx', 'original', true);
      manager.addSnapshot(session.id, 'src/app.tsx', 'modified', true);
      const snapshots = manager.getSnapshots(session.id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].content).toBe('original');
      expect(snapshots[0].exists).toBe(true);
    });

    it('returns the earliest snapshot as the original file baseline', () => {
      const base = manager.createSession();
      manager.addSnapshot(base.id, 'src/app.tsx', 'base', true);

      const child = manager.createSession();
      manager.addSnapshot(child.id, 'src/app.tsx', 'child-start', true);

      expect(manager.getOriginalSnapshot('src/app.tsx')?.content).toBe('base');
    });

    it('lists sessions sorted by updatedAt', () => {
      const s1 = manager.createSession();
      const s2 = manager.createSession();
      manager.addMessage(s1.id, { role: 'user', content: 'later' });
      const list = manager.listSessions();
      expect(list[0].id).toBe(s1.id);
    });

    it('derives a session title from the latest user message', () => {
      expect(deriveSessionTitleFromMessages([
        { role: 'user', content: 'first instruction' },
        { role: 'assistant', content: 'done' },
        { role: 'user', content: 'make the header sticky and tighten spacing' },
      ])).toBe('make the header sticky and tighten spacing');
    });
  });

  describe('file-backed mode', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), `denshobato-session-test-${randomUUID()}`);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('persists and loads sessions', () => {
      const manager1 = new SessionManager(tempDir);
      const session = manager1.createSession();
      manager1.addMessage(session.id, { role: 'user', content: 'Hello' });

      // Create new manager that loads from disk
      const manager2 = new SessionManager(tempDir);
      const loaded = manager2.getSession(session.id);
      expect(loaded).toBeDefined();
      expect(loaded!.messages).toHaveLength(1);
      expect(loaded!.messages[0].content).toBe('Hello');
    });
  });
});
