import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager, deriveSessionTitleFromMessages } from '../session.js';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('SessionManager (extended)', () => {
  describe('addMessage', () => {
    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() =>
        manager.addMessage('nonexistent', { role: 'user', content: 'hi' }),
      ).toThrow('Session not found');
    });

    it('preserves context on messages', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.addMessage(session.id, {
        role: 'user',
        content: 'Change button',
        context: { file: 'src/App.tsx', line: 10, component: 'Button' },
      });
      const msg = manager.getSession(session.id)!.messages[0];
      expect(msg.context).toEqual({
        file: 'src/App.tsx',
        line: 10,
        component: 'Button',
      });
    });
  });

  describe('updateSessionRuntime', () => {
    it('updates runtime fields', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.updateSessionRuntime(session.id, {
        status: 'running',
        previewBaseUrl: 'http://localhost:5173',
        previewPort: 5173,
        gitBranch: 'feature/demo',
        repoDir: '/tmp/repo',
        appDir: '/tmp/app',
      });
      const updated = manager.getSession(session.id)!;
      expect(updated.status).toBe('running');
      expect(updated.previewBaseUrl).toBe('http://localhost:5173');
      expect(updated.previewPort).toBe(5173);
      expect(updated.gitBranch).toBe('feature/demo');
      expect(updated.repoDir).toBe('/tmp/repo');
      expect(updated.appDir).toBe('/tmp/app');
    });

    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() =>
        manager.updateSessionRuntime('nonexistent', { status: 'running' }),
      ).toThrow('Session not found');
    });
  });

  describe('addChange', () => {
    it('records changes with timestamps', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.addChange(session.id, 'src/App.tsx', '--- a\n+++ b');
      const changes = manager.getSession(session.id)!.changes;
      expect(changes).toHaveLength(1);
      expect(changes[0].file).toBe('src/App.tsx');
      expect(changes[0].patch).toBe('--- a\n+++ b');
      expect(changes[0].timestamp).toBeGreaterThan(0);
    });

    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() =>
        manager.addChange('nonexistent', 'file.ts', 'patch'),
      ).toThrow('Session not found');
    });
  });

  describe('workspaceFiles', () => {
    it('sets and gets workspace files', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.setWorkspaceFile(session.id, 'src/A.tsx', 'content-a');
      manager.setWorkspaceFile(session.id, 'src/B.tsx', 'content-b');
      const files = manager.getWorkspaceFiles(session.id);
      expect(files).toEqual({
        'src/A.tsx': 'content-a',
        'src/B.tsx': 'content-b',
      });
    });

    it('removes workspace files', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.setWorkspaceFile(session.id, 'src/A.tsx', 'content');
      manager.removeWorkspaceFile(session.id, 'src/A.tsx');
      expect(manager.getWorkspaceFiles(session.id)).toEqual({});
    });

    it('returns a copy (not a reference)', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.setWorkspaceFile(session.id, 'src/A.tsx', 'content');
      const files = manager.getWorkspaceFiles(session.id);
      files['src/A.tsx'] = 'modified';
      expect(manager.getWorkspaceFiles(session.id)['src/A.tsx']).toBe('content');
    });

    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() => manager.setWorkspaceFile('x', 'f', 'c')).toThrow('Session not found');
      expect(() => manager.removeWorkspaceFile('x', 'f')).toThrow('Session not found');
      expect(() => manager.getWorkspaceFiles('x')).toThrow('Session not found');
    });
  });

  describe('revertToSnapshots', () => {
    it('restores workspace files from snapshots', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.addSnapshot(session.id, 'src/App.tsx', '<div>original</div>', true);
      manager.setWorkspaceFile(session.id, 'src/App.tsx', '<div>modified</div>');
      manager.addChange(session.id, 'src/App.tsx', 'some patch');

      manager.revertToSnapshots(session.id);

      const s = manager.getSession(session.id)!;
      expect(s.workspaceFiles['src/App.tsx']).toBe('<div>original</div>');
      expect(s.changes).toEqual([]);
    });

    it('removes files that did not exist originally', () => {
      const manager = new SessionManager();
      const session = manager.createSession();
      manager.addSnapshot(session.id, 'src/New.tsx', '', false);
      manager.setWorkspaceFile(session.id, 'src/New.tsx', 'new content');

      manager.revertToSnapshots(session.id);

      expect(manager.getSession(session.id)!.workspaceFiles).not.toHaveProperty(
        'src/New.tsx',
      );
    });

    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() => manager.revertToSnapshots('x')).toThrow('Session not found');
    });
  });

  describe('listTrackedFiles', () => {
    it('returns sorted unique files from all sessions', () => {
      const manager = new SessionManager();
      const s1 = manager.createSession();
      const s2 = manager.createSession();
      manager.addSnapshot(s1.id, 'src/B.tsx', 'b', true);
      manager.addSnapshot(s2.id, 'src/A.tsx', 'a', true);
      manager.setWorkspaceFile(s1.id, 'src/C.tsx', 'c');
      manager.setWorkspaceFile(s2.id, 'src/A.tsx', 'a-mod');

      expect(manager.listTrackedFiles()).toEqual([
        'src/A.tsx',
        'src/B.tsx',
        'src/C.tsx',
      ]);
    });
  });

  describe('setPreviewUrl', () => {
    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() => manager.setPreviewUrl('x', '/foo')).toThrow('Session not found');
    });
  });

  describe('getSnapshots', () => {
    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() => manager.getSnapshots('x')).toThrow('Session not found');
    });
  });

  describe('addSnapshot', () => {
    it('throws for unknown session', () => {
      const manager = new SessionManager();
      expect(() => manager.addSnapshot('x', 'f', 'c')).toThrow('Session not found');
    });
  });

  describe('file-backed persistence', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = join(tmpdir(), `denshobato-session-persist-${randomUUID()}`);
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('persists workspace files and runtime fields', () => {
      const m1 = new SessionManager(tempDir);
      const session = m1.createSession({ previewUrl: '/todos' });
      m1.setWorkspaceFile(session.id, 'src/App.tsx', '<div>ws</div>');
      m1.updateSessionRuntime(session.id, {
        status: 'running',
        gitBranch: 'feature/x',
      });

      const m2 = new SessionManager(tempDir);
      const loaded = m2.getSession(session.id)!;
      expect(loaded.previewUrl).toBe('/todos');
      expect(loaded.workspaceFiles['src/App.tsx']).toBe('<div>ws</div>');
      expect(loaded.status).toBe('running');
      expect(loaded.gitBranch).toBe('feature/x');
    });

    it('skips corrupted JSON files gracefully', () => {
      mkdirSync(tempDir, { recursive: true });
      writeFileSync(join(tempDir, 'corrupted.json'), 'not valid json {{{');
      const manager = new SessionManager(tempDir);
      expect(manager.listSessions()).toEqual([]);
    });

    it('handles sessions missing optional fields', () => {
      mkdirSync(tempDir, { recursive: true });
      const minimalSession = {
        id: 'test-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        snapshots: [{ path: 'src/a.tsx', content: 'x', timestamp: 1 }],
        changes: [],
      };
      writeFileSync(
        join(tempDir, 'test-id.json'),
        JSON.stringify(minimalSession),
      );

      const manager = new SessionManager(tempDir);
      const session = manager.getSession('test-id')!;
      expect(session.previewUrl).toBe('/');
      expect(session.baseSessionId).toBeNull();
      expect(session.gitBranch).toBeNull();
      expect(session.status).toBe('idle');
      expect(session.workspaceFiles).toEqual({});
      expect(session.snapshots[0].exists).toBe(true);
    });
  });
});

describe('deriveSessionTitleFromMessages (extended)', () => {
  it('returns null for empty messages', () => {
    expect(deriveSessionTitleFromMessages([])).toBeNull();
  });

  it('returns null if no user messages', () => {
    expect(
      deriveSessionTitleFromMessages([
        { role: 'assistant', content: 'Hello!' },
      ]),
    ).toBeNull();
  });

  it('truncates long messages', () => {
    const longMsg = 'a'.repeat(100);
    const title = deriveSessionTitleFromMessages([
      { role: 'user', content: longMsg },
    ]);
    expect(title!.length).toBeLessThanOrEqual(48);
    expect(title!.endsWith('...')).toBe(true);
  });

  it('normalizes whitespace', () => {
    const title = deriveSessionTitleFromMessages([
      { role: 'user', content: '  hello   world  ' },
    ]);
    expect(title).toBe('hello world');
  });

  it('skips empty user messages', () => {
    expect(
      deriveSessionTitleFromMessages([
        { role: 'user', content: '   ' },
        { role: 'user', content: 'actual content' },
      ]),
    ).toBe('actual content');
  });
});
