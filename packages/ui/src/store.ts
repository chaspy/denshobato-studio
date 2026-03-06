import { create } from 'zustand';
import { api, type ChatResponse } from './api.js';
import {
  getInitialLanguage,
  getInitialThinkingMode,
  persistLanguage,
  persistThinkingMode,
  type Language,
  type ThinkingMode,
} from './i18n.js';

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
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  changeCount: number;
}

interface DenshobatoState {
  // View
  view: 'sessions' | 'chat';

  // Preferences
  language: Language;
  thinkingMode: ThinkingMode;

  // Session
  sessionId: string | null;
  sessions: SessionSummary[];
  messages: Message[];

  // Preview
  previewUrl: string;

  // Component selector
  selectorActive: boolean;
  selectedElement: SelectedElement | null;

  // PR dialog
  prDialogOpen: boolean;

  // Loading / error
  loading: boolean;
  error: string | null;

  // Actions
  setView: (view: 'sessions' | 'chat') => void;
  setLanguage: (language: Language) => void;
  setThinkingMode: (mode: ThinkingMode) => void;
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
  createPR: (opts: { title: string; body: string; branchName: string }) => Promise<string>;
  clearError: () => void;
}

let messageCounter = 0;
function genId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export const useStore = create<DenshobatoState>((set, get) => ({
  view: 'sessions',
  language: getInitialLanguage(),
  thinkingMode: getInitialThinkingMode(),
  sessionId: null,
  sessions: [],
  messages: [],
  previewUrl: '/',
  selectorActive: false,
  selectedElement: null,
  prDialogOpen: false,
  loading: false,
  error: null,

  setView: (view) => set({ view }),

  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
  },

  setThinkingMode: (thinkingMode) => {
    persistThinkingMode(thinkingMode);
    set({ thinkingMode });
  },

  setPreviewUrl: (url) => set({ previewUrl: url }),

  loadSessions: async () => {
    try {
      const sessions = await api.listSessions();
      set({ sessions });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
    }
  },

  createSession: () => {
    // Session is created on first message send
    set({ view: 'chat', sessionId: null, messages: [], selectedElement: null });
  },

  openSession: async (id) => {
    try {
      const session = await api.getSession(id);
      set({
        view: 'chat',
        sessionId: id,
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
    const { sessionId, selectedElement, language, thinkingMode } = get();

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

      const result: ChatResponse = await api.chat(message, sessionId ?? undefined, context, {
        responseLanguage: language,
        thinkingMode,
      });

      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        patches: result.patches.map((p) => ({ file: p.file, patch: p.patch })),
      };

      set((s) => ({
        sessionId: result.sessionId,
        loading: false,
        messages: [...s.messages, assistantMsg],
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
