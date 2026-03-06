const API_BASE = '/__denshobato';

interface ApiRequestInit extends RequestInit {
  apiKey?: string;
}

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
  title: string | null;
  previewUrl?: string;
  baseSessionId?: string | null;
  gitBranch?: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  changeCount: number;
}

export interface SessionDetail {
  id: string;
  createdAt: number;
  updatedAt: number;
  previewUrl: string;
  baseSessionId: string | null;
  gitBranch: string | null;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    context?: { file?: string; line?: number; component?: string };
    preferences?: ChatPreferences;
  }>;
  workspaceFiles: Record<string, string>;
  changes: Array<{ file: string; patch: string; timestamp: number }>;
}

export interface PRResult {
  url: string;
  number: number;
  branchName: string;
}

async function fetchJson<T>(path: string, options?: ApiRequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  if (options?.apiKey) {
    headers.set('x-denshobato-api-key', options.apiKey);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
    baseSessionId?: string,
    context?: { file?: string; line?: number; component?: string },
    preferences?: ChatPreferences,
    apiKey?: string,
    previewUrl?: string,
  ): Promise<ChatResponse> {
    return fetchJson('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, baseSessionId, context, preferences, previewUrl }),
      apiKey,
    });
  },

  listSessions(): Promise<SessionSummary[]> {
    return fetchJson('/sessions');
  },

  getSession(id: string): Promise<SessionDetail> {
    return fetchJson(`/session/${id}`);
  },

  activateSession(id: string): Promise<SessionDetail> {
    return fetchJson(`/session/${id}/activate`, { method: 'POST' });
  },

  updateSessionPreview(sessionId: string, previewUrl: string): Promise<{ previewUrl: string }> {
    return fetchJson(`/session/${sessionId}/preview`, {
      method: 'POST',
      body: JSON.stringify({ previewUrl }),
    });
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
