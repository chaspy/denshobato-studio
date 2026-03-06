export type Language = 'en' | 'ja';
export type ThinkingMode = 'standard' | 'deep';

export const LANGUAGE_STORAGE_KEY = 'denshobato:language';
export const THINKING_MODE_STORAGE_KEY = 'denshobato:thinking-mode';

type Translator = {
  appTitle: string;
  modeLabel: string;
  modeDescription: Record<ThinkingMode, string>;
  modeBadgeLabel: Record<ThinkingMode, string>;
  modeToggleLabel: string;
  languageLabel: string;
  languageName: Record<Language, string>;
  newSession: string;
  newSessionTitle: string;
  sessionLabel: (id: string) => string;
  createPR: string;
  prCreated: string;
  close: string;
  cancel: string;
  branchName: string;
  title: string;
  description: string;
  prTitlePlaceholder: string;
  prBodyPlaceholder: string;
  creating: string;
  backToSessions: string;
  preview: string;
  previewTitle: string;
  refreshPreview: string;
  selectorButton: string;
  selectorOverlay: string;
  emptySessionsTitle: string;
  emptySessionsDescription: string;
  emptyChatTitle: string;
  emptyChatDescription: string;
  selectedElement: string;
  describeSelectedElement: string;
  describeChange: string;
  send: string;
  thinking: Record<ThinkingMode, string>;
  revert: string;
  noSessionsYet: string;
  sessionMeta: (messageCount: number, changeCount: number, updatedAt: number) => string;
  messageCount: (count: number) => string;
  changeCount: (count: number) => string;
  selectedContext: (tagName: string, file: string, line: number) => string;
};

const translations: Record<Language, Translator> = {
  en: {
    appTitle: 'Denshobato Studio',
    modeLabel: 'Thinking Mode',
    modeDescription: {
      standard: 'Standard keeps responses fast for routine edits.',
      deep: 'Deep Think spends more effort on exploration, edge cases, and validation.',
    },
    modeBadgeLabel: {
      standard: 'Standard',
      deep: 'Deep Think',
    },
    modeToggleLabel: 'Execution mode',
    languageLabel: 'Language',
    languageName: {
      en: 'English',
      ja: 'Japanese',
    },
    newSession: '+ New Session',
    newSessionTitle: 'New Session',
    sessionLabel: (id) => `Session ${id}`,
    createPR: 'Create PR',
    prCreated: 'PR created successfully!',
    close: 'Close',
    cancel: 'Cancel',
    branchName: 'Branch Name',
    title: 'Title',
    description: 'Description',
    prTitlePlaceholder: 'Update UI components',
    prBodyPlaceholder: 'Describe the changes...',
    creating: 'Creating...',
    backToSessions: 'Back to sessions',
    preview: 'Preview',
    previewTitle: 'App Preview',
    refreshPreview: 'Refresh preview',
    selectorButton: 'Select UI element',
    selectorOverlay: 'Click an element to select it (Esc to cancel)',
    emptySessionsTitle: 'No sessions yet',
    emptySessionsDescription: 'Start a new session to modify your app with AI',
    emptyChatTitle: 'Describe what you want to change',
    emptyChatDescription: 'Use the element selector to pick a UI component, then type your instruction.',
    selectedElement: 'Selected element',
    describeSelectedElement: 'Describe how to modify this element...',
    describeChange: 'Describe the change you want to make...',
    send: 'Send',
    thinking: {
      standard: 'Thinking...',
      deep: 'Deep thinking...',
    },
    revert: 'Revert',
    noSessionsYet: 'No sessions yet',
    sessionMeta: (messageCount, changeCount, updatedAt) =>
      `${messageCount} messages · ${changeCount} changes · ${formatDate('en', updatedAt)}`,
    messageCount: (count) => `${count} messages`,
    changeCount: (count) => `${count} changes`,
    selectedContext: (tagName, file, line) => `<${tagName}> ${file}:${line}`,
  },
  ja: {
    appTitle: 'Denshobato Studio',
    modeLabel: '思考モード',
    modeDescription: {
      standard: 'Standard は通常の編集を素早く進めます。',
      deep: 'Deep Think は調査、抜け漏れ確認、検証により多くの時間を使います。',
    },
    modeBadgeLabel: {
      standard: 'Standard',
      deep: 'Deep Think',
    },
    modeToggleLabel: '実行モード',
    languageLabel: '表示言語',
    languageName: {
      en: 'English',
      ja: '日本語',
    },
    newSession: '+ 新規セッション',
    newSessionTitle: '新規セッション',
    sessionLabel: (id) => `Session ${id}`,
    createPR: 'PR を作成',
    prCreated: 'PR を作成しました。',
    close: '閉じる',
    cancel: 'キャンセル',
    branchName: 'ブランチ名',
    title: 'タイトル',
    description: '説明',
    prTitlePlaceholder: 'UI コンポーネントを更新',
    prBodyPlaceholder: '変更内容を記述してください...',
    creating: '作成中...',
    backToSessions: 'セッション一覧へ戻る',
    preview: 'プレビュー',
    previewTitle: 'アプリプレビュー',
    refreshPreview: 'プレビューを再読み込み',
    selectorButton: 'UI 要素を選択',
    selectorOverlay: '編集したい要素をクリックしてください（Esc でキャンセル）',
    emptySessionsTitle: 'まだセッションがありません',
    emptySessionsDescription: '新しいセッションを開始して AI と一緒にアプリを編集します。',
    emptyChatTitle: '変更したい内容を入力してください',
    emptyChatDescription: '要素選択で UI コンポーネントを指定してから、変更内容を入力します。',
    selectedElement: '選択中の要素',
    describeSelectedElement: 'この要素をどう変更したいか入力してください...',
    describeChange: '変更したい内容を入力してください...',
    send: '送信',
    thinking: {
      standard: '考え中...',
      deep: '深く考え中...',
    },
    revert: '元に戻す',
    noSessionsYet: 'まだセッションがありません',
    sessionMeta: (messageCount, changeCount, updatedAt) =>
      `${messageCount}件のメッセージ · ${changeCount}件の変更 · ${formatDate('ja', updatedAt)}`,
    messageCount: (count) => `${count}件のメッセージ`,
    changeCount: (count) => `${count}件の変更`,
    selectedContext: (tagName, file, line) => `<${tagName}> ${file}:${line}`,
  },
};

export function getCopy(language: Language): Translator {
  return translations[language];
}

export function normalizeLanguage(value: unknown): Language {
  return value === 'ja' ? 'ja' : 'en';
}

export function normalizeThinkingMode(value: unknown): ThinkingMode {
  return value === 'deep' ? 'deep' : 'standard';
}

export function detectBrowserLanguage(
  languages: readonly string[] | undefined,
  fallback?: string,
): Language {
  const candidates = [...(languages ?? []), fallback ?? ''];
  return candidates.some((candidate) => candidate.toLowerCase().startsWith('ja')) ? 'ja' : 'en';
}

export function getInitialLanguage(): Language {
  const stored = readStoredValue(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  if (typeof navigator === 'undefined') return 'en';
  return detectBrowserLanguage(navigator.languages, navigator.language);
}

export function getInitialThinkingMode(): ThinkingMode {
  return normalizeThinkingMode(readStoredValue(THINKING_MODE_STORAGE_KEY));
}

export function persistLanguage(language: Language): void {
  writeStoredValue(LANGUAGE_STORAGE_KEY, language);
}

export function persistThinkingMode(mode: ThinkingMode): void {
  writeStoredValue(THINKING_MODE_STORAGE_KEY, mode);
}

export function formatDate(language: Language, value: number): string {
  return new Date(value).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US');
}

function readStoredValue(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}
