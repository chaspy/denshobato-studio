import { describe, it, expect } from 'vitest';

describe('server', () => {
  it('createServer is exported', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.createServer).toBe('function');
  });
});
