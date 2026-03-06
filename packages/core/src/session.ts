import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
  timestamp: number;
}

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  snapshots: FileSnapshot[];
  changes: Array<{
    file: string;
    patch: string;
    timestamp: number;
  }>;
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

  createSession(): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      snapshots: [],
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

  addSnapshot(sessionId: string, file: string, content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // Only store one snapshot per file (the original)
    const existing = session.snapshots.find((s) => s.path === file);
    if (!existing) {
      session.snapshots.push({ path: file, content, timestamp: Date.now() });
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

  getSnapshots(sessionId: string): FileSnapshot[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    return session.snapshots;
  }

  private persist(session: Session): void {
    if (!this.storageDir) return;
    const filePath = join(this.storageDir, `${session.id}.json`);
    writeFileSync(filePath, JSON.stringify(session, null, 2));
  }

  private loadFromDisk(): void {
    if (!this.storageDir || !existsSync(this.storageDir)) return;
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const files = readdirSync(this.storageDir).filter((f: string) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const raw = readFileSync(join(this.storageDir, file), 'utf-8');
        const session = JSON.parse(raw) as Session;
        this.sessions.set(session.id, session);
      } catch {
        // Skip corrupted session files
      }
    }
  }
}
