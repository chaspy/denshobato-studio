import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';

function setupTempProject(): string {
  const tempDir = join(tmpdir(), `denshobato-server-test-${randomUUID()}`);
  mkdirSync(join(tempDir, 'src'), { recursive: true });
  writeFileSync(join(tempDir, 'src', 'App.tsx'), '<div>Hello</div>');

  // Create a fake vite binary so PreviewRunnerManager doesn't throw
  const binDir = join(tempDir, 'node_modules', '.bin');
  mkdirSync(binDir, { recursive: true });
  writeFileSync(join(binDir, 'vite'), '#!/bin/sh\necho "fake vite"');
  chmodSync(join(binDir, 'vite'), 0o755);

  // Git init
  execSync('git init', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', {
    cwd: tempDir,
    stdio: 'pipe',
  });
  execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git add -A && git commit -m "init"', {
    cwd: tempDir,
    stdio: 'pipe',
  });

  return tempDir;
}

describe('server exports', () => {
  it('exports createServer', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.createServer).toBe('function');
  });

  it('exports loadConfig', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.loadConfig).toBe('function');
  });

  it('exports StudioRuntime', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.StudioRuntime).toBe('function');
  });
});

describe('createServer', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = setupTempProject();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates an Express app', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  it('responds to health check', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(
        `http://localhost:${address.port}/__denshobato/health`,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: 'ok' });
    } finally {
      server.close();
    }
  });

  it('returns 404 for unknown API routes', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(
        `http://localhost:${address.port}/__denshobato/nonexistent`,
      );
      expect(response.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it('lists empty sessions initially', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(
        `http://localhost:${address.port}/__denshobato/sessions`,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    } finally {
      server.close();
    }
  });

  it('returns 404 for non-existent session', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(
        `http://localhost:${address.port}/__denshobato/session/nonexistent`,
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Session not found');
    } finally {
      server.close();
    }
  });

  it('returns 404 for non-existent session diff', async () => {
    const { createServer } = await import('../index.js');
    const app = await createServer({ projectDir: tempDir });
    const server = app.listen(0);
    const address = server.address() as { port: number };

    try {
      const response = await fetch(
        `http://localhost:${address.port}/__denshobato/diff/nonexistent`,
      );
      expect(response.status).toBe(404);
    } finally {
      server.close();
    }
  });

  describe('auth token', () => {
    it('rejects requests without token when configured', async () => {
      const { createServer } = await import('../index.js');
      const app = await createServer({
        projectDir: tempDir,
        authToken: 'secret-token',
      });
      const server = app.listen(0);
      const address = server.address() as { port: number };

      try {
        const response = await fetch(
          `http://localhost:${address.port}/__denshobato/sessions`,
        );
        expect(response.status).toBe(401);
      } finally {
        server.close();
      }
    });

    it('allows requests with correct token', async () => {
      const { createServer } = await import('../index.js');
      const app = await createServer({
        projectDir: tempDir,
        authToken: 'secret-token',
      });
      const server = app.listen(0);
      const address = server.address() as { port: number };

      try {
        const response = await fetch(
          `http://localhost:${address.port}/__denshobato/sessions`,
          {
            headers: { Authorization: 'Bearer secret-token' },
          },
        );
        expect(response.status).toBe(200);
      } finally {
        server.close();
      }
    });
  });
});
