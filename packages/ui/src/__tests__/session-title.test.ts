import { describe, expect, it } from 'vitest';
import { deriveSessionTitle } from '../session-title.js';

describe('deriveSessionTitle', () => {
  it('uses the latest user message', () => {
    expect(deriveSessionTitle([
      { role: 'user', content: 'first instruction' },
      { role: 'assistant', content: 'done' },
      { role: 'user', content: 'update the sidebar heading' },
    ])).toBe('update the sidebar heading');
  });

  it('trims and shortens long messages', () => {
    expect(deriveSessionTitle([
      {
        role: 'user',
        content: '   make   the pricing table easier to scan with clearer spacing and stronger row grouping   ',
      },
    ])).toBe('make the pricing table easier to scan with cl...');
  });
});
