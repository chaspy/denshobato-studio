import { describe, expect, it } from 'vitest';
import {
  detectBrowserLanguage,
  getCopy,
  normalizeLanguage,
  normalizeThinkingMode,
} from '../i18n.js';

describe('i18n helpers', () => {
  it('normalizes supported values', () => {
    expect(normalizeLanguage('ja')).toBe('ja');
    expect(normalizeLanguage('anything-else')).toBe('en');
    expect(normalizeThinkingMode('deep')).toBe('deep');
    expect(normalizeThinkingMode('fast')).toBe('standard');
  });

  it('detects Japanese browser preferences', () => {
    expect(detectBrowserLanguage(['ja-JP'], 'en-US')).toBe('ja');
    expect(detectBrowserLanguage(['en-US'], 'ja-JP')).toBe('ja');
    expect(detectBrowserLanguage(['en-US'], 'en-US')).toBe('en');
  });

  it('returns translated copy', () => {
    expect(getCopy('ja').createPR).toBe('PR を作成');
    expect(getCopy('en').createPR).toBe('Create PR');
  });
});
