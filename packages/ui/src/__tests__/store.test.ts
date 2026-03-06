import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store.js';

describe('store', () => {
  beforeEach(() => {
    useStore.setState({
      view: 'sessions',
      language: 'en',
      thinkingMode: 'standard',
      sessionId: null,
      sessions: [],
      messages: [],
      previewUrl: '/',
      selectorActive: false,
      selectedElement: null,
      prDialogOpen: false,
      loading: false,
      error: null,
    });
  });

  it('switches view', () => {
    useStore.getState().setView('chat');
    expect(useStore.getState().view).toBe('chat');
  });

  it('updates language', () => {
    useStore.getState().setLanguage('ja');
    expect(useStore.getState().language).toBe('ja');
  });

  it('updates thinking mode', () => {
    useStore.getState().setThinkingMode('deep');
    expect(useStore.getState().thinkingMode).toBe('deep');
  });

  it('creates session and switches to chat', () => {
    useStore.getState().createSession();
    expect(useStore.getState().view).toBe('chat');
    expect(useStore.getState().sessionId).toBeNull();
    expect(useStore.getState().messages).toEqual([]);
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
