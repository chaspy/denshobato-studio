import { existsSync } from 'node:fs';
import type { DenshobatoConfig } from './config.js';
import { DenshobatoAgent } from './agent.js';
import type { FilePatch } from './file-ops.js';
import { GitHubIntegration, type PRResult } from './github.js';
import {
  SessionManager,
  type Session,
  type SessionPreferences,
} from './session.js';
import { PreviewRunnerManager } from './preview-runner.js';
import { WorkspaceManager } from './workspace.js';

export interface CreateRuntimeSessionOptions {
  previewUrl?: string;
  baseSessionId?: string | null;
}

export interface CreateRuntimePROptions {
  sessionId: string;
  title: string;
  body: string;
  branchName?: string;
  baseBranch?: string;
}

export class StudioRuntime {
  private sessionManager: SessionManager;
  private agent: DenshobatoAgent;
  private workspaceManager: WorkspaceManager;
  private previewRunnerManager: PreviewRunnerManager;

  constructor(
    private config: DenshobatoConfig,
    private projectDir: string,
  ) {
    const storageDir = config.sessionStorageDir
      ? `${projectDir}/${config.sessionStorageDir}`
      : undefined;

    this.sessionManager = new SessionManager(storageDir);
    this.agent = new DenshobatoAgent(config, projectDir, this.sessionManager);
    this.workspaceManager = new WorkspaceManager(projectDir, config.sessionStorageDir);
    this.previewRunnerManager = new PreviewRunnerManager(projectDir);
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  async createSession(options: CreateRuntimeSessionOptions = {}): Promise<Session> {
    const baseSession =
      typeof options.baseSessionId === 'string'
        ? this.requireSession(options.baseSessionId)
        : null;
    const session = this.sessionManager.createSession({
      previewUrl: options.previewUrl ?? baseSession?.previewUrl ?? '/',
      baseSessionId: baseSession?.id ?? null,
      seedFiles: baseSession?.workspaceFiles,
    });

    return this.ensureSession(session.id);
  }

  async ensureSession(sessionId: string): Promise<Session> {
    const session = this.requireSession(sessionId);
    const baseSession = session.baseSessionId
      ? this.sessionManager.getSession(session.baseSessionId) ?? null
      : null;

    try {
      if (baseSession?.id) {
        await this.ensureSession(baseSession.id);
      }

      if (!session.repoDir || !session.appDir || !existsSync(session.appDir)) {
        this.sessionManager.updateSessionRuntime(sessionId, {
          status: 'provisioning',
          lastError: null,
        });

        const workspace = await this.workspaceManager.createSessionWorkspace(sessionId, baseSession);
        this.sessionManager.updateSessionRuntime(sessionId, {
          appDir: workspace.appDir,
          repoDir: workspace.repoDir,
          gitBranch: workspace.branchName,
          status: 'idle',
          lastError: null,
        });
      }

      this.applyLegacyWorkspaceState(sessionId);

      const current = this.requireSession(sessionId);
      if (!current.appDir) {
        throw new Error(`Session appDir is not available: ${sessionId}`);
      }

      const preview = await this.previewRunnerManager.ensureRunner(
        sessionId,
        current.appDir,
        current.previewPort,
      );

      this.sessionManager.updateSessionRuntime(sessionId, {
        previewBaseUrl: preview.baseUrl,
        previewPort: preview.port,
        status: 'running',
        lastError: null,
      });

      return this.requireSession(sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.sessionManager.updateSessionRuntime(sessionId, {
        status: 'failed',
        lastError: message,
      });
      throw error;
    }
  }

  async chat(
    sessionId: string,
    userMessage: string,
    context?: { file?: string; line?: number; component?: string },
    preferences?: SessionPreferences,
    apiKeyOverride?: string,
  ): Promise<{ response: string; patches: FilePatch[] }> {
    await this.ensureSession(sessionId);
    return this.agent.chat(sessionId, userMessage, context, preferences, apiKeyOverride);
  }

  async revertSession(sessionId: string): Promise<string[]> {
    await this.ensureSession(sessionId);

    const snapshots = this.sessionManager.getSnapshots(sessionId);
    const fileOps = this.agent.getFileOps(sessionId);
    for (const snapshot of snapshots) {
      if (snapshot.exists) {
        fileOps.writeFile(snapshot.path, snapshot.content);
      } else {
        fileOps.deleteFile(snapshot.path);
      }
    }

    this.sessionManager.revertToSnapshots(sessionId);
    return snapshots.map((snapshot) => snapshot.path);
  }

  setPreviewUrl(sessionId: string, previewUrl: string): string {
    this.requireSession(sessionId);
    this.sessionManager.setPreviewUrl(sessionId, previewUrl);
    return previewUrl;
  }

  async createPR(options: CreateRuntimePROptions): Promise<PRResult> {
    const session = await this.ensureSession(options.sessionId);
    if (!session.repoDir) {
      throw new Error(`Session repoDir is not available: ${options.sessionId}`);
    }

    const branchName = options.branchName?.trim() || session.gitBranch;
    if (!branchName) {
      throw new Error(`Session branch is not available: ${options.sessionId}`);
    }

    const github = new GitHubIntegration(session.repoDir, {
      baseBranch: this.config.github.baseBranch,
      owner: this.config.github.owner,
      repo: this.config.github.repo,
    });
    const result = await github.createPR({
      title: options.title,
      body: options.body,
      branchName,
      baseBranch: options.baseBranch,
      useCurrentBranch: true,
    });

    if (branchName !== session.gitBranch) {
      this.sessionManager.updateSessionRuntime(options.sessionId, { gitBranch: branchName });
    }

    return result;
  }

  private requireSession(sessionId: string): Session {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  private applyLegacyWorkspaceState(sessionId: string): void {
    const session = this.requireSession(sessionId);
    if (!session.appDir) return;

    const fileOps = this.agent.getFileOps(sessionId);
    const trackedFiles = new Set<string>([
      ...session.snapshots.map((snapshot) => snapshot.path),
      ...Object.keys(session.workspaceFiles),
    ]);

    for (const file of trackedFiles) {
      if (Object.prototype.hasOwnProperty.call(session.workspaceFiles, file)) {
        const content = session.workspaceFiles[file];
        const current = fileOps.fileExists(file) ? fileOps.readFile(file) : null;
        if (current !== content) {
          fileOps.writeFile(file, content);
        }
        continue;
      }

      const snapshot = session.snapshots.find((entry) => entry.path === file);
      if (snapshot && !snapshot.exists && fileOps.fileExists(file)) {
        fileOps.deleteFile(file);
      }
    }
  }
}
