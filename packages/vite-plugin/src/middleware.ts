import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadConfig, DenshobatoAgent, type DenshobatoConfig } from '@denshobato-studio/core';

const API_PREFIX = '/__denshobato';

interface RequestBody {
  [key: string]: unknown;
}

async function readBody(req: IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function createMiddleware(
  projectDir: string,
  configPath?: string,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  let agent: DenshobatoAgent | null = null;
  let configPromise: Promise<DenshobatoConfig> | null = null;

  async function getAgent(): Promise<DenshobatoAgent> {
    if (agent) return agent;
    if (!configPromise) {
      configPromise = loadConfig(projectDir);
    }
    const config = await configPromise;
    agent = new DenshobatoAgent(config, projectDir);
    return agent;
  }

  return async (req, res, next) => {
    const url = req.url;
    if (!url || !url.startsWith(API_PREFIX)) {
      return next();
    }

    const path = url.slice(API_PREFIX.length);
    const method = req.method?.toUpperCase();

    try {
      // GET /health
      if (path === '/health' && method === 'GET') {
        return sendJson(res, 200, { status: 'ok' });
      }

      // POST /chat
      if (path === '/chat' && method === 'POST') {
        const body = await readBody(req);
        const a = await getAgent();
        const sessionManager = a.getSessionManager();
        const apiKeyHeader = req.headers['x-denshobato-api-key'];
        const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

        // Create or reuse session
        let sessionId = body.sessionId as string | undefined;
        if (!sessionId) {
          const session = sessionManager.createSession();
          sessionId = session.id;
        }

        const result = await a.chat(
          sessionId,
          body.message as string,
          body.context as {
            file?: string;
            line?: number;
            component?: string;
          },
          body.preferences as {
            responseLanguage?: 'en' | 'ja';
            thinkingMode?: 'standard' | 'deep';
          } | undefined,
          apiKey?.trim(),
        );

        return sendJson(res, 200, {
          sessionId,
          response: result.response,
          patches: result.patches,
        });
      }

      // GET /sessions
      if (path === '/sessions' && method === 'GET') {
        const a = await getAgent();
        const sessions = a.getSessionManager().listSessions();
        return sendJson(
          res,
          200,
          sessions.map((s) => ({
            id: s.id,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messageCount: s.messages.length,
            changeCount: s.changes.length,
          })),
        );
      }

      // GET /session/:id
      const sessionMatch = path.match(/^\/session\/([^/]+)$/);
      if (sessionMatch && method === 'GET') {
        const a = await getAgent();
        const session = a.getSessionManager().getSession(sessionMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, session);
      }

      // POST /session/:id/revert
      const revertMatch = path.match(/^\/session\/([^/]+)\/revert$/);
      if (revertMatch && method === 'POST') {
        const a = await getAgent();
        const session = a.getSessionManager().getSession(revertMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        const fileOps = a.getFileOps();
        const snapshots = a.getSessionManager().getSnapshots(revertMatch[1]);
        for (const snapshot of snapshots) {
          fileOps.writeFile(snapshot.path, snapshot.content);
        }
        return sendJson(res, 200, { reverted: snapshots.map((s) => s.path) });
      }

      // GET /diff/:id
      const diffMatch = path.match(/^\/diff\/([^/]+)$/);
      if (diffMatch && method === 'GET') {
        const a = await getAgent();
        const session = a.getSessionManager().getSession(diffMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, { changes: session.changes });
      }

      // POST /pr
      if (path === '/pr' && method === 'POST') {
        const body = await readBody(req);
        const { GitHubIntegration } = await import('@denshobato-studio/core');
        const a = await getAgent();
        const config = await loadConfig(projectDir);
        const github = new GitHubIntegration(projectDir, {
          baseBranch: config.github.baseBranch,
          owner: config.github.owner,
          repo: config.github.repo,
        });
        const result = await github.createPR({
          title: body.title as string,
          body: body.body as string,
          branchName: body.branchName as string,
          baseBranch: body.baseBranch as string | undefined,
        });
        return sendJson(res, 200, result);
      }

      // Not found
      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: message });
    }
  };
}
