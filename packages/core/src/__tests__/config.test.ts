import { describe, it, expect } from 'vitest';
import { defineConfig, DenshobatoConfigSchema } from '../config.js';

describe('config', () => {
  it('returns defaults when given empty object', () => {
    const config = defineConfig({});
    expect(config.model).toBe('claude-sonnet-4-20250514');
    expect(config.maxTokens).toBe(4096);
    expect(config.editableDirectories).toEqual(['src']);
    expect(config.github.baseBranch).toBe('main');
  });

  it('overrides defaults with provided values', () => {
    const config = defineConfig({
      model: 'claude-opus-4-20250514',
      maxTokens: 8192,
      editableDirectories: ['src', 'lib'],
      agentPrompt: 'A todo app',
    });
    expect(config.model).toBe('claude-opus-4-20250514');
    expect(config.maxTokens).toBe(8192);
    expect(config.editableDirectories).toEqual(['src', 'lib']);
    expect(config.agentPrompt).toBe('A todo app');
  });

  it('validates config schema', () => {
    const result = DenshobatoConfigSchema.safeParse({
      model: 123, // invalid
    });
    expect(result.success).toBe(false);
  });
});
