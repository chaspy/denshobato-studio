import { create } from 'zustand';
import { api, type ChatResponse } from './api.js';
import {
  getInitialApiKey,
  getInitialLanguage,
  getInitialPreviewPort,
  getInitialThinkingMode,
  persistApiKey,
  persistLanguage,
  persistPreviewPort,
  persistThinkingMode,
  type Language,
  type ThinkingMode,
} from './i18n.js';
import { normalizePreviewUrl } from './preview-url.js';
import { deriveSessionTitle } from './session-title.js';

export interface SelectedElement {
  file: string;
  line: number;
  tagName: string;
  textContent: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  context?: SelectedElement;
  patches?: Array<{ file: string; patch: string }>;
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

interface DenshobatoState {
  // View
  view: 'sessions' | 'chat';

  // Preferences
  apiKey: string;
  language: Language;
  thinkingMode: ThinkingMode;
  previewPort: string;

  // Session
  sessionId: string | null;
  draftBaseSessionId: string | null;
  sessions: SessionSummary[];
  messages: Message[];

  // Preview
  previewUrl: string;

  // Component selector
  selectorActive: boolean;
  selectedElement: SelectedElement | null;

  // PR dialog
  prDialogOpen: boolean;
  settingsOpen: boolean;

  // Loading / error
  loading: boolean;
  error: string | null;

  // Actions
  setView: (view: 'sessions' | 'chat') => void;
  setApiKey: (apiKey: string) => void;
  setLanguage: (language: Language) => void;
  setThinkingMode: (mode: ThinkingMode) => void;
  setPreviewPort: (previewPort: string) => void;
  setPreviewUrl: (url: string) => void;
  loadSessions: () => Promise<void>;
  createSession: () => void;
  openSession: (id: string) => Promise<void>;
  selectElement: (el: SelectedElement) => void;
  clearSelectedElement: () => void;
  toggleSelector: () => void;
  sendMessage: (message: string) => Promise<void>;
  revertMessage: (messageId: string) => Promise<void>;
  setPRDialogOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  createPR: (opts: { title: string; body: string; branchName: string }) => Promise<string>;
  clearError: () => void;
}

let messageCounter = 0;
function genId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export const useStore = create<DenshobatoState>((set, get) => ({
  view: 'sessions',
  apiKey: getInitialApiKey(),
  language: getInitialLanguage(),
  thinkingMode: getInitialThinkingMode(),
  previewPort: getInitialPreviewPort(),
  sessionId: null,
  draftBaseSessionId: null,
  sessions: [],
  messages: [],
  previewUrl: '/',
  selectorActive: false,
  selectedElement: null,
  prDialogOpen: false,
  settingsOpen: !getInitialApiKey(),
  loading: false,
  error: null,

  setView: (view) => set({ view }),

  setApiKey: (apiKey) => {
    persistApiKey(apiKey);
    set({ apiKey: apiKey.trim() });
  },

  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
  },

  setThinkingMode: (thinkingMode) => {
    persistThinkingMode(thinkingMode);
    set({ thinkingMode });
  },

  setPreviewPort: (previewPort) => {
    persistPreviewPort(previewPort);
    const normalizedPort = getInitialPreviewPort();
    const { sessionId, previewUrl } = get();
    const normalizedPreviewUrl = normalizePreviewUrl(previewUrl, normalizedPort);
    set({ previewPort: normalizedPort, previewUrl: normalizedPreviewUrl });
    if (sessionId) {
      void api.updateSessionPreview(sessionId, normalizedPreviewUrl).catch(() => {
        // Preserve optimistic preview navigation even if persistence fails.
      });
    }
  },

  setPreviewUrl: (url) => {
    const { sessionId, previewPort } = get();
    const normalized = normalizePreviewUrl(url, previewPort);
    set({ previewUrl: normalized });
    if (sessionId) {
      void api.updateSessionPreview(sessionId, normalized).catch(() => {
        // Preserve optimistic preview navigation even if persistence fails.
      });
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await api.listSessions();
      set({ sessions });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  createSession: () => {
    const { apiKey, sessionId } = get();
    if (!apiKey) {
      set({ settingsOpen: true });
      return;
    }
    // Session is created on first message send, seeded from the active session if present.
    set({
      view: 'chat',
      sessionId: null,
      draftBaseSessionId: sessionId,
      messages: [],
      selectedElement: null,
    });
  },

  openSession: async (id) => {
    try {
      const session = await api.activateSession(id);
      set({
        view: 'chat',
        sessionId: id,
        draftBaseSessionId: null,
        previewUrl: normalizePreviewUrl(session.previewUrl || '/', get().previewPort),
        messages: session.messages.map((m) => ({
          id: genId(),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          context: m.context as SelectedElement | undefined,
        })),
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  selectElement: (el) => set({ selectedElement: el, selectorActive: false }),

  clearSelectedElement: () => set({ selectedElement: null }),

  toggleSelector: () => set((s) => ({ selectorActive: !s.selectorActive })),

  sendMessage: async (message) => {
    const {
      sessionId,
      draftBaseSessionId,
      selectedElement,
      language,
      thinkingMode,
      apiKey,
      previewUrl,
    } = get();
    if (!apiKey) {
      set({ settingsOpen: true });
      return;
    }

    const userMsg: Message = {
      id: genId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      context: selectedElement ?? undefined,
    };

    set((s) => ({
      loading: true,
      error: null,
      messages: [...s.messages, userMsg],
      selectedElement: null,
    }));

    try {
      const context = selectedElement
        ? { file: selectedElement.file, line: selectedElement.line, component: selectedElement.tagName }
        : undefined;

      const result: ChatResponse = await api.chat(
        message,
        sessionId ?? undefined,
        draftBaseSessionId ?? undefined,
        context,
        {
          responseLanguage: language,
          thinkingMode,
        },
        apiKey,
        previewUrl,
      );

      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        patches: result.patches.map((p) => ({ file: p.file, patch: p.patch })),
      };
      const now = Date.now();
      const derivedTitle = deriveSessionTitle(get().messages);

      set((s) => ({
        sessionId: result.sessionId,
        draftBaseSessionId: null,
        loading: false,
        messages: [...s.messages, assistantMsg],
        sessions: s.sessions.some((session) => session.id === result.sessionId)
          ? s.sessions.map((session) => (
              session.id === result.sessionId
                ? {
                    ...session,
                    title: derivedTitle,
                    previewUrl,
                    updatedAt: now,
                    messageCount: session.messageCount + 2,
                    changeCount: session.changeCount + result.patches.length,
                  }
                : session
            ))
          : [
              {
                id: result.sessionId,
                title: derivedTitle,
                previewUrl,
                baseSessionId: draftBaseSessionId,
                gitBranch: null,
                createdAt: now,
                updatedAt: now,
                messageCount: 2,
                changeCount: result.patches.length,
              },
              ...s.sessions,
            ],
      }));
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  revertMessage: async (_messageId) => {
    const { sessionId } = get();
    if (!sessionId) return;
    set({ loading: true, error: null });
    try {
      await api.revert(sessionId);
      set({ loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  },

  setPRDialogOpen: (open) => set({ prDialogOpen: open }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  createPR: async (opts) => {
    set({ loading: true, error: null });
    try {
      const result = await api.createPR(opts);
      set({ loading: false, prDialogOpen: false });
      return result.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ loading: false, error: msg });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
