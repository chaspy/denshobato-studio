import express, { type Express } from 'express';
import cors from 'cors';
import {
  loadConfig,
  DenshobatoAgent,
  GitHubIntegration,
  deriveSessionTitleFromMessages,
} from '@denshobato-studio/core';

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
  const agent = new DenshobatoAgent(config, projectDir);

  async function getCurrentGitBranch(): Promise<string | null> {
    const github = new GitHubIntegration(projectDir, {
      baseBranch: config.github.baseBranch,
      owner: config.github.owner,
      repo: config.github.repo,
    });
    return github.getCurrentBranch();
  }

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

  // Chat
  app.post('/__denshobato/chat', async (req, res) => {
    try {
      const { message, sessionId, context, preferences, previewUrl, baseSessionId } = req.body;
      const apiKeyHeader = req.header('x-denshobato-api-key')?.trim();
      const sm = agent.getSessionManager();

      let sid = sessionId;
      if (!sid) {
        const baseSession =
          typeof baseSessionId === 'string' ? sm.getSession(baseSessionId) : undefined;
        const session = sm.createSession({
          previewUrl:
            typeof previewUrl === 'string'
              ? previewUrl
              : baseSession?.previewUrl ?? '/',
          baseSessionId: baseSession?.id ?? null,
          gitBranch: await getCurrentGitBranch(),
          seedFiles: baseSession?.workspaceFiles,
        });
        sid = session.id;
      } else if (typeof previewUrl === 'string') {
        sm.setPreviewUrl(sid, previewUrl);
      }

      agent.restoreSessionWorkspace(sid);
      const result = await agent.chat(sid, message, context, preferences, apiKeyHeader);
      res.json({ sessionId: sid, response: result.response, patches: result.patches });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // List sessions
  app.get('/__denshobato/sessions', (_req, res) => {
    const sessions = agent.getSessionManager().listSessions();
    res.json(
      sessions.map((s) => ({
        id: s.id,
        title: deriveSessionTitleFromMessages(s.messages),
        previewUrl: s.previewUrl,
        baseSessionId: s.baseSessionId,
        gitBranch: s.gitBranch,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
        changeCount: s.changes.length,
      })),
    );
  });

  // Get session
  app.get('/__denshobato/session/:id', (req, res) => {
    const session = agent.getSessionManager().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  });

  app.post('/__denshobato/session/:id/activate', (req, res) => {
    try {
      const session = agent.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      agent.restoreSessionWorkspace(req.params.id);
      res.json(agent.getSessionManager().getSession(req.params.id));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/__denshobato/session/:id/preview', (req, res) => {
    try {
      const session = agent.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const previewUrl = typeof req.body.previewUrl === 'string' ? req.body.previewUrl : '/';
      agent.getSessionManager().setPreviewUrl(req.params.id, previewUrl);
      res.json({ previewUrl });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Revert session
  app.post('/__denshobato/session/:id/revert', (req, res) => {
    try {
      const session = agent.getSessionManager().getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'Session not found' });

      const snapshots = agent.getSessionManager().getSnapshots(req.params.id);
      const fileOps = agent.getFileOps();
      for (const snapshot of snapshots) {
        if (snapshot.exists) {
          fileOps.writeFile(snapshot.path, snapshot.content);
        } else {
          fileOps.deleteFile(snapshot.path);
        }
      }
      agent.getSessionManager().revertToSnapshots(req.params.id);
      res.json({ reverted: snapshots.map((s) => s.path) });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  // Get diff
  app.get('/__denshobato/diff/:id', (req, res) => {
    const session = agent.getSessionManager().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ changes: session.changes });
  });

  // Create PR
  app.post('/__denshobato/pr', async (req, res) => {
    try {
      const github = new GitHubIntegration(projectDir, {
        baseBranch: config.github.baseBranch,
        owner: config.github.owner,
        repo: config.github.repo,
      });
      const result = await github.createPR(req.body);
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  });

  return app;
}

export { loadConfig, DenshobatoAgent, GitHubIntegration };
