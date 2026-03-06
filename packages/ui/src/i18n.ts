export type Language = 'en' | 'ja';
export type ThinkingMode = 'standard' | 'deep';

export const LANGUAGE_STORAGE_KEY = 'denshobato:language';
export const THINKING_MODE_STORAGE_KEY = 'denshobato:thinking-mode';
export const API_KEY_STORAGE_KEY = 'denshobato:api-key';
export const PREVIEW_PORT_STORAGE_KEY = 'denshobato:preview-port';
export const DEFAULT_PREVIEW_PORT = '5173';

type Translator = {
  appTitle: string;
  modeBadgeLabel: Record<ThinkingMode, string>;
  modeToggleLabel: string;
  modeInfoTitle: string;
  modeInfoDescription: Record<ThinkingMode, string>;
  languageLabel: string;
  languageName: Record<Language, string>;
  settings: string;
  settingsTitle: string;
  settingsDescription: string;
  saveSettings: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyHelp: string;
  previewPortLabel: string;
  previewPortPlaceholder: string;
  previewPortHelp: string;
  apiKeyRequiredTitle: string;
  apiKeyRequiredDescription: string;
  openSettings: string;
  sessionsTitle: string;
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
  deepThinkTrace: string[];
  processingElapsed: (seconds: number) => string;
  processingFinished: (seconds: number) => string;
  revert: string;
  directInstructionCta: string;
  directInstructionHint: string;
  directInstructionDisabled: string;
  selectorActiveCta: string;
  selectorSelectedCta: string;
  info: string;
  aiOverlayLabel: string;
  chatLockedPlaceholder: string;
  noSessionsYet: string;
  sessionMeta: (messageCount: number, changeCount: number, updatedAt: number) => string;
  messageCount: (count: number) => string;
  changeCount: (count: number) => string;
  selectedContext: (tagName: string, file: string, line: number) => string;
};

const translations: Record<Language, Translator> = {
  en: {
    appTitle: 'Denshobato Studio',
    modeBadgeLabel: {
      standard: 'Standard',
      deep: 'Deep Think',
    },
    modeToggleLabel: 'Execution mode',
    modeInfoTitle: 'Deep Think',
    modeInfoDescription: {
      standard: 'Standard keeps iteration fast.',
      deep: 'Deep Think spends extra effort on exploration, edge cases, and validation before it responds.',
    },
    languageLabel: 'Language',
    languageName: {
      en: 'English',
      ja: 'Japanese',
    },
    settings: 'Settings',
    settingsTitle: 'Settings',
    settingsDescription: 'Configure language and future workspace preferences.',
    saveSettings: 'Save settings',
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelp: 'Stored locally in this browser and sent only when chat requests are made.',
    previewPortLabel: 'Default Preview Port',
    previewPortPlaceholder: '5173',
    previewPortHelp: 'Applied automatically when you enter localhost without an explicit port.',
    apiKeyRequiredTitle: 'API key required',
    apiKeyRequiredDescription: 'Open settings and add your Anthropic API key before starting a session.',
    openSettings: 'Open settings',
    sessionsTitle: 'Sessions',
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
    deepThinkTrace: [
      'Breaking the request into concrete changes.',
      'Scanning relevant files and impact areas.',
      'Comparing implementation options and edge cases.',
      'Preparing edits and verification checkpoints.',
      'Drafting the final response.',
    ],
    processingElapsed: (seconds) => `${seconds}s elapsed`,
    processingFinished: (seconds) => `Completed in ${seconds}s`,
    revert: 'Revert',
    directInstructionCta: 'Direct the UI visually',
    directInstructionHint: 'Click this, then pick any element in the preview to tell Denshobato what to change.',
    directInstructionDisabled: 'Set your API key in settings before direct UI instructions are available.',
    selectorActiveCta: 'Selecting UI element...',
    selectorSelectedCta: 'Element selected. Describe the change in chat.',
    info: 'Info',
    aiOverlayLabel: 'AI UI Editing Overlay',
    chatLockedPlaceholder: 'Add your API key in settings to start chatting.',
    noSessionsYet: 'No sessions yet',
    sessionMeta: (messageCount, changeCount, updatedAt) =>
      `${messageCount} messages · ${changeCount} changes · ${formatDate('en', updatedAt)}`,
    messageCount: (count) => `${count} messages`,
    changeCount: (count) => `${count} changes`,
    selectedContext: (tagName, file, line) => `<${tagName}> ${file}:${line}`,
  },
  ja: {
    appTitle: 'Denshobato Studio',
    modeBadgeLabel: {
      standard: 'Standard',
      deep: 'Deep Think',
    },
    modeToggleLabel: '実行モード',
    modeInfoTitle: 'Deep Think',
    modeInfoDescription: {
      standard: 'Standard は素早い反復向けです。',
      deep: 'Deep Think は調査、抜け漏れ確認、検証により多くの時間を使ってから応答します。',
    },
    languageLabel: '表示言語',
    languageName: {
      en: 'English',
      ja: '日本語',
    },
    settings: '設定',
    settingsTitle: '設定',
    settingsDescription: '表示言語などのワークスペース設定を変更します。',
    saveSettings: '設定を保存',
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelp: 'このブラウザのローカルに保存され、チャット送信時だけ利用されます。',
    previewPortLabel: 'プレビュー既定ポート',
    previewPortPlaceholder: '5173',
    previewPortHelp: 'localhost にポートが含まれない場合、この番号を自動で補完します。',
    apiKeyRequiredTitle: 'API キーが必要です',
    apiKeyRequiredDescription: 'セッションを始める前に設定画面から Anthropic API Key を入力してください。',
    openSettings: '設定を開く',
    sessionsTitle: 'セッション',
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
    deepThinkTrace: [
      '依頼内容を細かい変更単位に分解しています。',
      '関連ファイルと影響範囲を洗い出しています。',
      '実装方針と抜け漏れを比較しています。',
      '編集内容と確認ポイントを組み立てています。',
      '最終的な返答をまとめています。',
    ],
    processingElapsed: (seconds) => `${seconds}秒経過`,
    processingFinished: (seconds) => `${seconds}秒かかりました`,
    revert: '元に戻す',
    directInstructionCta: 'UI で直接指示する！',
    directInstructionHint: '押したあとにプレビュー上の要素をクリックすると、どこを直すかそのまま指示できます。',
    directInstructionDisabled: '直接指示を使うには、先に設定画面で API キーを入力してください。',
    selectorActiveCta: '要素を選択中...',
    selectorSelectedCta: '要素を選択しました。チャットで変更内容を入力してください。',
    info: 'Info',
    aiOverlayLabel: 'AI UI Editing Overlay',
    chatLockedPlaceholder: 'チャットを始めるには設定画面で API キーを入力してください。',
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

export function getInitialApiKey(): string {
  return readStoredValue(API_KEY_STORAGE_KEY) ?? '';
}

export function getInitialPreviewPort(): string {
  const stored = readStoredValue(PREVIEW_PORT_STORAGE_KEY);
  return normalizePreviewPort(stored);
}

export function persistLanguage(language: Language): void {
  writeStoredValue(LANGUAGE_STORAGE_KEY, language);
}

export function persistThinkingMode(mode: ThinkingMode): void {
  writeStoredValue(THINKING_MODE_STORAGE_KEY, mode);
}

export function persistApiKey(apiKey: string): void {
  if (apiKey.trim().length === 0) {
    removeStoredValue(API_KEY_STORAGE_KEY);
    return;
  }
  writeStoredValue(API_KEY_STORAGE_KEY, apiKey.trim());
}

export function persistPreviewPort(previewPort: string): void {
  const normalized = normalizePreviewPort(previewPort);
  if (!normalized) {
    removeStoredValue(PREVIEW_PORT_STORAGE_KEY);
    return;
  }
  writeStoredValue(PREVIEW_PORT_STORAGE_KEY, normalized);
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

function normalizePreviewPort(value: string | null | undefined): string {
  const digits = (value ?? '').trim().replace(/\D+/g, '');
  return digits || DEFAULT_PREVIEW_PORT;
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

function removeStoredValue(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage write failures.
  }
}
