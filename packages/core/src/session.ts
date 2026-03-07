import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface SessionPreferences {
  responseLanguage?: 'en' | 'ja';
  thinkingMode?: 'standard' | 'deep';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  context?: {
    file?: string;
    line?: number;
    component?: string;
  };
  preferences?: SessionPreferences;
}

export interface FileSnapshot {
  path: string;
  content: string;
  exists: boolean;
  timestamp: number;
}

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  previewUrl: string;
  previewBaseUrl: string | null;
  previewPort: number | null;
  baseSessionId: string | null;
  gitBranch: string | null;
  repoDir: string | null;
  appDir: string | null;
  status: 'idle' | 'provisioning' | 'running' | 'failed';
  lastError: string | null;
  messages: Message[];
  snapshots: FileSnapshot[];
  workspaceFiles: Record<string, string>;
  changes: Array<{
    file: string;
    patch: string;
    timestamp: number;
  }>;
}

export interface CreateSessionOptions {
  previewUrl?: string;
  baseSessionId?: string | null;
  gitBranch?: string | null;
  seedFiles?: Record<string, string>;
  previewBaseUrl?: string | null;
  previewPort?: number | null;
  repoDir?: string | null;
  appDir?: string | null;
  status?: Session['status'];
  lastError?: string | null;
}

export function deriveSessionTitleFromMessages(
  messages: Array<Pick<Message, 'role' | 'content'>>,
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;

    const normalized = message.content.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;

    return normalized.length > 48
      ? `${normalized.slice(0, 45).trimEnd()}...`
      : normalized;
  }

  return null;
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private storageDir: string | null;

  constructor(storageDir?: string) {
    this.storageDir = storageDir ?? null;
    if (this.storageDir) {
      mkdirSync(this.storageDir, { recursive: true });
      this.loadFromDisk();
    }
  }

  createSession(options: CreateSessionOptions | string = {}): Session {
    const resolved =
      typeof options === 'string'
        ? { previewUrl: options }
        : options;
    const session: Session = {
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      previewUrl: resolved.previewUrl ?? '/',
      previewBaseUrl: resolved.previewBaseUrl ?? null,
      previewPort: resolved.previewPort ?? null,
      baseSessionId: resolved.baseSessionId ?? null,
      gitBranch: resolved.gitBranch ?? null,
      repoDir: resolved.repoDir ?? null,
      appDir: resolved.appDir ?? null,
      status: resolved.status ?? 'idle',
      lastError: resolved.lastError ?? null,
      messages: [],
      snapshots: [],
      workspaceFiles: { ...(resolved.seedFiles ?? {}) },
      changes: [],
    };
    this.sessions.set(session.id, session);
    this.persist(session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  listSessions(): Session[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  addMessage(sessionId: string, message: Omit<Message, 'timestamp'>): Message {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const msg: Message = { ...message, timestamp: Date.now() };
    session.messages.push(msg);
    session.updatedAt = Date.now();
    this.persist(session);
    return msg;
  }

  setPreviewUrl(sessionId: string, previewUrl: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.previewUrl = previewUrl;
    session.updatedAt = Date.now();
    this.persist(session);
  }

  updateSessionRuntime(
    sessionId: string,
    runtime: Partial<Pick<
      Session,
      'previewBaseUrl' | 'previewPort' | 'gitBranch' | 'repoDir' | 'appDir' | 'status' | 'lastError'
    >>,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    Object.assign(session, runtime);
    session.updatedAt = Date.now();
    this.persist(session);
  }

  addSnapshot(sessionId: string, file: string, content: string, exists = true): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // Only store one snapshot per file (the original)
    const existing = session.snapshots.find((s) => s.path === file);
    if (!existing) {
      session.snapshots.push({ path: file, content, exists, timestamp: Date.now() });
      this.persist(session);
    }
  }

  addChange(sessionId: string, file: string, patch: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.changes.push({ file, patch, timestamp: Date.now() });
    session.updatedAt = Date.now();
    this.persist(session);
  }

  setWorkspaceFile(sessionId: string, file: string, content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.workspaceFiles[file] = content;
    session.updatedAt = Date.now();
    this.persist(session);
  }

  removeWorkspaceFile(sessionId: string, file: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    delete session.workspaceFiles[file];
    session.updatedAt = Date.now();
    this.persist(session);
  }

  getWorkspaceFiles(sessionId: string): Record<string, string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return { ...session.workspaceFiles };
  }

  getSnapshots(sessionId: string): FileSnapshot[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return session.snapshots;
  }

  getOriginalSnapshot(file: string): FileSnapshot | null {
    let earliest: FileSnapshot | null = null;
    for (const session of this.sessions.values()) {
      for (const snapshot of session.snapshots) {
        if (snapshot.path !== file) continue;
        if (!earliest || snapshot.timestamp < earliest.timestamp) {
          earliest = snapshot;
        }
      }
    }
    return earliest;
  }

  listTrackedFiles(): string[] {
    const files = new Set<string>();
    for (const session of this.sessions.values()) {
      for (const snapshot of session.snapshots) {
        files.add(snapshot.path);
      }
      for (const file of Object.keys(session.workspaceFiles)) {
        files.add(file);
      }
    }
    return Array.from(files).sort();
  }

  revertToSnapshots(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    for (const snapshot of session.snapshots) {
      if (snapshot.exists) {
        session.workspaceFiles[snapshot.path] = snapshot.content;
      } else {
        delete session.workspaceFiles[snapshot.path];
      }
    }
    session.changes = [];
    session.updatedAt = Date.now();
    this.persist(session);
  }

  private persist(session: Session): void {
    if (!this.storageDir) return;
    const filePath = join(this.storageDir, `${session.id}.json`);
    writeFileSync(filePath, JSON.stringify(session, null, 2));
  }

  private loadFromDisk(): void {
    if (!this.storageDir || !existsSync(this.storageDir)) return;
    const files = readdirSync(this.storageDir).filter((f: string) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.storageDir, file), 'utf-8');
        const session = JSON.parse(raw) as Session;
        session.previewUrl = session.previewUrl || '/';
        session.previewBaseUrl = session.previewBaseUrl ?? null;
        session.previewPort = session.previewPort ?? null;
        session.baseSessionId = session.baseSessionId ?? null;
        session.gitBranch = session.gitBranch ?? null;
        session.repoDir = session.repoDir ?? null;
        session.appDir = session.appDir ?? null;
        session.status = session.status ?? 'idle';
        session.lastError = session.lastError ?? null;
        session.workspaceFiles = session.workspaceFiles ?? {};
        session.snapshots = session.snapshots.map((snapshot) => ({
          ...snapshot,
          exists: snapshot.exists ?? true,
        }));
        this.sessions.set(session.id, session);
      } catch {
        // Skip corrupted session files
      }
    }
  }
}
