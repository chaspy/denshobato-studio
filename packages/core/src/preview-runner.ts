import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createServer as createNetServer } from 'node:net';
import { spawn } from 'node:child_process';

export interface PreviewRunnerInfo {
  port: number;
  baseUrl: string;
}

interface PreviewRunnerState extends PreviewRunnerInfo {
  sessionId: string;
  appDir: string;
  child: ReturnType<typeof spawn>;
  logs: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function allocatePort(): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    const server = createNetServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not allocate a preview port.')));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePromise(port);
      });
    });
  });
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const server = createNetServer();
    server.unref();
    server.once('error', () => resolvePromise(false));
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePromise(true));
    });
  });
}

function findViteBinary(projectDir: string): string {
  const binaryName = process.platform === 'win32' ? 'vite.cmd' : 'vite';
  let current = resolve(projectDir);

  while (true) {
    const candidate = join(current, 'node_modules', '.bin', binaryName);
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error('Vite binary was not found. Run pnpm install before starting Denshobato Studio.');
    }
    current = parent;
  }
}

export class PreviewRunnerManager {
  private static cleanupRegistered = false;
  private static instances = new Set<PreviewRunnerManager>();

  private runners = new Map<string, PreviewRunnerState>();
  private viteBinary: string;

  constructor(projectDir: string) {
    this.viteBinary = findViteBinary(projectDir);
    PreviewRunnerManager.instances.add(this);
    PreviewRunnerManager.registerCleanupHandlers();
  }

  async ensureRunner(
    sessionId: string,
    appDir: string,
    preferredPort?: number | null,
  ): Promise<PreviewRunnerInfo> {
    const existing = this.runners.get(sessionId);
    if (existing && !existing.child.killed) {
      return { port: existing.port, baseUrl: existing.baseUrl };
    }

    const port =
      preferredPort && await isPortAvailable(preferredPort)
        ? preferredPort
        : await allocatePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = spawn(
      this.viteBinary,
      ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: appDir,
        env: {
          ...process.env,
          DENSHOBATO_PREVIEW_RUNNER: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const state: PreviewRunnerState = { sessionId, appDir, port, baseUrl, child, logs: '' };
    child.stdout.on('data', (chunk) => {
      state.logs += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      state.logs += chunk.toString();
    });
    child.once('exit', () => {
      if (this.runners.get(sessionId)?.child === child) {
        this.runners.delete(sessionId);
      }
    });

    this.runners.set(sessionId, state);
    await this.waitUntilReady(state);

    return { port, baseUrl };
  }

  private async waitUntilReady(state: PreviewRunnerState): Promise<void> {
    const deadline = Date.now() + 20_000;

    while (Date.now() < deadline) {
      if (state.child.exitCode !== null) {
        throw new Error(`Preview runner exited early.\n${state.logs}`.trim());
      }

      try {
        const response = await fetch(`${state.baseUrl}/`);
        if (response.ok) {
          return;
        }
      } catch {
        // Retry until the deadline.
      }

      await sleep(200);
    }

    state.child.kill('SIGTERM');
    throw new Error(`Preview runner did not become ready in time.\n${state.logs}`.trim());
  }

  private stopAll(): void {
    for (const state of this.runners.values()) {
      if (!state.child.killed) {
        state.child.kill('SIGTERM');
      }
    }
    this.runners.clear();
  }

  private static registerCleanupHandlers(): void {
    if (PreviewRunnerManager.cleanupRegistered) {
      return;
    }

    const cleanup = () => {
      for (const manager of PreviewRunnerManager.instances) {
        manager.stopAll();
      }
    };

    process.once('exit', cleanup);
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    PreviewRunnerManager.cleanupRegistered = true;
  }
}
