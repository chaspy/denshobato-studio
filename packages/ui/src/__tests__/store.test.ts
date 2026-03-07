import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api.js';
import { useStore } from '../store.js';

vi.mock('../api.js', () => ({
  api: {
    createSession: vi.fn(),
    updateSessionPreview: vi.fn().mockResolvedValue({ previewUrl: '/' }),
    listSessions: vi.fn().mockResolvedValue([]),
    activateSession: vi.fn(),
    chat: vi.fn(),
    revert: vi.fn(),
    createPR: vi.fn(),
  },
}));

describe('store', () => {
  beforeEach(() => {
    vi.mocked(api.createSession).mockResolvedValue({
      id: 'session-created',
      createdAt: 1,
      updatedAt: 1,
      previewUrl: '/',
      previewBaseUrl: 'http://127.0.0.1:40123',
      previewPort: 40123,
      baseSessionId: null,
      gitBranch: 'denshobato/session-created',
      repoDir: '/tmp/repo',
      appDir: '/tmp/repo/examples/react-todo',
      status: 'running',
      lastError: null,
      messages: [],
      workspaceFiles: {},
      changes: [],
    });

    useStore.setState({
      view: 'sessions',
      apiKey: 'sk-ant-test',
      language: 'en',
      thinkingMode: 'standard',
      previewPort: '39483',
      sessionId: null,
      draftBaseSessionId: null,
      sessions: [],
      messages: [],
      previewUrl: '/',
      previewBaseUrl: null,
      selectorActive: false,
      selectedElement: null,
      prDialogOpen: false,
      settingsOpen: false,
      loading: false,
      error: null,
    });
  });

  it('switches view', () => {
    useStore.getState().setView('chat');
    expect(useStore.getState().view).toBe('chat');
  });

  it('updates api key', () => {
    useStore.getState().setApiKey('sk-ant-next');
    expect(useStore.getState().apiKey).toBe('sk-ant-next');
  });

  it('updates language', () => {
    useStore.getState().setLanguage('ja');
    expect(useStore.getState().language).toBe('ja');
  });

  it('updates thinking mode', () => {
    useStore.getState().setThinkingMode('deep');
    expect(useStore.getState().thinkingMode).toBe('deep');
  });

  it('creates session and switches to chat', async () => {
    await useStore.getState().createSession();
    expect(useStore.getState().view).toBe('chat');
    expect(useStore.getState().sessionId).toBe('session-created');
    expect(useStore.getState().draftBaseSessionId).toBeNull();
    expect(useStore.getState().messages).toEqual([]);
    expect(useStore.getState().previewBaseUrl).toBe('http://127.0.0.1:40123');
  });

  it('creates a new session from the active session', async () => {
    useStore.setState({ sessionId: 'session-1', previewUrl: '/todos' });
    await useStore.getState().createSession();
    expect(api.createSession).toHaveBeenCalledWith({
      baseSessionId: 'session-1',
      previewUrl: '/todos',
    });
  });

  it('opens settings instead of creating a session when api key is missing', () => {
    useStore.setState({ apiKey: '', settingsOpen: false });
    useStore.getState().createSession();
    expect(useStore.getState().view).toBe('sessions');
    expect(useStore.getState().settingsOpen).toBe(true);
  });

  it('toggles selector mode', () => {
    useStore.getState().toggleSelector();
    expect(useStore.getState().selectorActive).toBe(true);
    useStore.getState().toggleSelector();
    expect(useStore.getState().selectorActive).toBe(false);
  });

  it('selects an element and disables selector', () => {
    useStore.setState({ selectorActive: true });
    const el = { file: '/src/App.tsx', line: 10, tagName: 'div', textContent: 'Hello' };
    useStore.getState().selectElement(el);
    expect(useStore.getState().selectedElement).toEqual(el);
    expect(useStore.getState().selectorActive).toBe(false);
  });

  it('clears selected element', () => {
    useStore.setState({ selectedElement: { file: 'a', line: 1, tagName: 'div', textContent: '' } });
    useStore.getState().clearSelectedElement();
    expect(useStore.getState().selectedElement).toBeNull();
  });

  it('sets preview url', () => {
    useStore.getState().setPreviewUrl('/todos');
    expect(useStore.getState().previewUrl).toBe('/todos');
  });

  it('clears error', () => {
    useStore.setState({ error: 'test error' });
    useStore.getState().clearError();
    expect(useStore.getState().error).toBeNull();
  });
});
