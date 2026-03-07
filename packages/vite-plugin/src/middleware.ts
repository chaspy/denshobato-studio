import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  loadConfig,
  StudioRuntime,
  deriveSessionTitleFromMessages,
  type DenshobatoConfig,
} from '@denshobato-studio/core';

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
  let runtime: StudioRuntime | null = null;
  let configPromise: Promise<DenshobatoConfig> | null = null;

  async function getRuntime(): Promise<StudioRuntime> {
    if (runtime) return runtime;
    if (!configPromise) {
      configPromise = loadConfig(projectDir);
    }
    const config = await configPromise;
    runtime = new StudioRuntime(config, projectDir);
    return runtime;
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

      if (path === '/sessions' && method === 'POST') {
        const body = await readBody(req);
        const r = await getRuntime();
        const session = await r.createSession({
          previewUrl: typeof body.previewUrl === 'string' ? body.previewUrl : undefined,
          baseSessionId:
            typeof body.baseSessionId === 'string' ? body.baseSessionId : undefined,
        });
        return sendJson(res, 200, session);
      }

      // POST /chat
      if (path === '/chat' && method === 'POST') {
        const body = await readBody(req);
        const r = await getRuntime();
        const apiKeyHeader = req.headers['x-denshobato-api-key'];
        const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

        let sessionId = body.sessionId as string | undefined;
        if (!sessionId) {
          const session = await r.createSession({
            previewUrl: typeof body.previewUrl === 'string' ? body.previewUrl : undefined,
            baseSessionId:
              typeof body.baseSessionId === 'string' ? body.baseSessionId : undefined,
          });
          sessionId = session.id;
        } else if (typeof body.previewUrl === 'string') {
          r.setPreviewUrl(sessionId, body.previewUrl);
        }

        const result = await r.chat(
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
        const r = await getRuntime();
        const sessions = r.getSessionManager().listSessions();
        return sendJson(
          res,
          200,
          sessions.map((s) => ({
            id: s.id,
            title: deriveSessionTitleFromMessages(s.messages),
            previewUrl: s.previewUrl,
            previewBaseUrl: s.previewBaseUrl,
            baseSessionId: s.baseSessionId,
            gitBranch: s.gitBranch,
            status: s.status,
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
        const r = await getRuntime();
        const session = r.getSessionManager().getSession(sessionMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, session);
      }

      const activateMatch = path.match(/^\/session\/([^/]+)\/activate$/);
      if (activateMatch && method === 'POST') {
        const r = await getRuntime();
        const session = r.getSessionManager().getSession(activateMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, await r.ensureSession(activateMatch[1]));
      }

      const previewMatch = path.match(/^\/session\/([^/]+)\/preview$/);
      if (previewMatch && method === 'POST') {
        const body = await readBody(req);
        const r = await getRuntime();
        const session = r.getSessionManager().getSession(previewMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        const previewUrl = typeof body.previewUrl === 'string' ? body.previewUrl : '/';
        r.setPreviewUrl(previewMatch[1], previewUrl);
        return sendJson(res, 200, { previewUrl });
      }

      // POST /session/:id/revert
      const revertMatch = path.match(/^\/session\/([^/]+)\/revert$/);
      if (revertMatch && method === 'POST') {
        const r = await getRuntime();
        const session = r.getSessionManager().getSession(revertMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, { reverted: await r.revertSession(revertMatch[1]) });
      }

      // GET /diff/:id
      const diffMatch = path.match(/^\/diff\/([^/]+)$/);
      if (diffMatch && method === 'GET') {
        const r = await getRuntime();
        const session = r.getSessionManager().getSession(diffMatch[1]);
        if (!session) {
          return sendJson(res, 404, { error: 'Session not found' });
        }
        return sendJson(res, 200, { changes: session.changes });
      }

      // POST /pr
      if (path === '/pr' && method === 'POST') {
        const body = await readBody(req);
        const r = await getRuntime();
        const result = await r.createPR({
          sessionId: body.sessionId as string,
          title: body.title as string,
          body: body.body as string,
          branchName: body.branchName as string | undefined,
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
