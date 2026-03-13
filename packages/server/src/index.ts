import express, { type Express } from 'express';
import cors from 'cors';
import {
  loadConfig,
  StudioRuntime,
  deriveSessionTitleFromMessages,
} from '@chaspy/denshobato-core';

export interface ServerOptions {
  projectDir: string;
  port?: number;
  configPath?: string;
  corsOrigin?: string | string[];
  authToken?: string;
}

export async function createServer(options: ServerOptions): Promise<Express> {
  const { projectDir, corsOrigin = '*', authToken } = options;

  const config = await loadConfig(projectDir);
  const runtime = new StudioRuntime(config, projectDir);

  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  // Auth middleware
  if (authToken) {
    app.use('/__denshobato', (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token !== authToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });
  }

  // Health check
  app.get('/__denshobato/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/__denshobato/sessions', async (req, res) => {
    try {
      const session = await runtime.createSession({
        previewUrl: typeof req.body.previewUrl === 'string' ? req.body.previewUrl : undefined,
        baseSessionId:
          typeof req.body.baseSessionId === 'string' ? req.body.baseSessionId : undefined,
      });
      res.json(session);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Chat
  app.post('/__denshobato/chat', async (req, res) => {
    try {
      const { message, sessionId, context, preferences, previewUrl, baseSessionId } = req.body;
      const apiKeyHeader = req.header('x-denshobato-api-key')?.trim();

      let sid = sessionId;
      if (!sid) {
        const session = await runtime.createSession({
          previewUrl: typeof previewUrl === 'string' ? previewUrl : undefined,
          baseSessionId: typeof baseSessionId === 'string' ? baseSessionId : undefined,
        });
        sid = session.id;
      } else if (typeof previewUrl === 'string') {
        runtime.setPreviewUrl(sid, previewUrl);
      }

      const result = await runtime.chat(sid, message, context, preferences, apiKeyHeader);
      res.json({ sessionId: sid, response: result.response, patches: result.patches });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // List sessions
  app.get('/__denshobato/sessions', (_req, res) => {
    const sessions = runtime.getSessionManager().listSessions();
    res.json(
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
  });

  // Get session
  app.get('/__denshobato/session/:id', (req, res) => {
    const session = runtime.getSessionManager().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });

  app.post('/__denshobato/session/:id/activate', async (req, res) => {
    try {
      const session = runtime.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(await runtime.ensureSession(req.params.id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/__denshobato/session/:id/preview', (req, res) => {
    try {
      const session = runtime.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const previewUrl = typeof req.body.previewUrl === 'string' ? req.body.previewUrl : '/';
      runtime.setPreviewUrl(req.params.id, previewUrl);
      res.json({ previewUrl });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Revert session
  app.post('/__denshobato/session/:id/revert', async (req, res) => {
    try {
      const session = runtime.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json({ reverted: await runtime.revertSession(req.params.id) });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Get diff
  app.get('/__denshobato/diff/:id', (req, res) => {
    const session = runtime.getSessionManager().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ changes: session.changes });
  });

  // Create PR
  app.post('/__denshobato/pr', async (req, res) => {
    try {
      const result = await runtime.createPR({
        sessionId: req.body.sessionId as string,
        title: req.body.title as string,
        body: req.body.body as string,
        branchName: req.body.branchName as string | undefined,
        baseBranch: req.body.baseBranch as string | undefined,
      });
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  return app;
}

export { loadConfig, StudioRuntime };
