const API_BASE = '/__denshobato';

export interface ChatPreferences {
  responseLanguage?: 'en' | 'ja';
  thinkingMode?: 'standard' | 'deep';
}

export interface ChatResponse {
  sessionId: string;
  response: string;
  patches: Array<{
    file: string;
    patch: string;
    before: string;
    after: string;
  }>;
}

export interface SessionSummary {
  id: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  changeCount: number;
}

export interface SessionDetail {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    context?: { file?: string; line?: number; component?: string };
    preferences?: ChatPreferences;
  }>;
  changes: Array<{ file: string; patch: string; timestamp: number }>;
}

export interface PRResult {
  url: string;
  number: number;
  branchName: string;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  health(): Promise<{ status: string }> {
    return fetchJson('/health');
  },

  chat(
    message: string,
    sessionId?: string,
    context?: { file?: string; line?: number; component?: string },
    preferences?: ChatPreferences,
  ): Promise<ChatResponse> {
    return fetchJson('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, context, preferences }),
    });
  },

  listSessions(): Promise<SessionSummary[]> {
    return fetchJson('/sessions');
  },

  getSession(id: string): Promise<SessionDetail> {
    return fetchJson(`/session/${id}`);
  },

  revert(sessionId: string): Promise<{ reverted: string[] }> {
    return fetchJson(`/session/${sessionId}/revert`, { method: 'POST' });
  },

  getDiff(sessionId: string): Promise<{ changes: Array<{ file: string; patch: string; timestamp: number }> }> {
    return fetchJson(`/diff/${sessionId}`);
  },

  createPR(options: {
    title: string;
    body: string;
    branchName: string;
    baseBranch?: string;
  }): Promise<PRResult> {
    return fetchJson('/pr', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },
};
