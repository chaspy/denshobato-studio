import { describe, expect, it } from 'vitest';
import { normalizePreviewUrl } from '../preview-url.js';

describe('normalizePreviewUrl', () => {
  it('keeps relative paths unchanged', () => {
    expect(normalizePreviewUrl('/todos', '39483', 'http://localhost:3001/dev')).toBe('/todos');
  });

  it('adds the default port to localhost shorthand', () => {
    expect(normalizePreviewUrl('localhost/todos', '39483', 'http://localhost:3001/dev')).toBe(
      'http://localhost:39483/todos',
    );
  });

  it('adds the default port to localhost urls without an explicit port', () => {
    expect(normalizePreviewUrl('http://127.0.0.1/about', '39483')).toBe(
      'http://127.0.0.1:39483/about',
    );
  });

  it('preserves explicit ports', () => {
    expect(normalizePreviewUrl('http://localhost:4321/about', '39483')).toBe(
      'http://localhost:4321/about',
    );
  });

  it('does not alter non-localhost urls', () => {
    expect(normalizePreviewUrl('https://example.com/app', '39483')).toBe(
      'https://example.com/app',
    );
  });
});
