import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineConfig, DenshobatoConfigSchema, loadConfig } from '../config.js';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('defineConfig', () => {
  it('returns all defaults for empty object', () => {
    const config = defineConfig({});
    expect(config.model).toBe('claude-sonnet-4-20250514');
    expect(config.maxTokens).toBe(4096);
    expect(config.editableDirectories).toEqual(['src']);
    expect(config.includePatterns).toEqual(['**/*.tsx', '**/*.ts', '**/*.css']);
    expect(config.excludePatterns).toEqual([
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ]);
    expect(config.agentPrompt).toBe('');
    expect(config.github.baseBranch).toBe('main');
    expect(config.sessionStorageDir).toBe('.denshobato');
  });

  it('merges partial overrides', () => {
    const config = defineConfig({
      model: 'claude-opus-4-20250514',
      github: { baseBranch: 'develop' },
    });
    expect(config.model).toBe('claude-opus-4-20250514');
    expect(config.maxTokens).toBe(4096); // default preserved
    expect(config.github.baseBranch).toBe('develop');
  });

  it('accepts apiKey', () => {
    const config = defineConfig({ apiKey: 'sk-test' });
    expect(config.apiKey).toBe('sk-test');
  });

  it('accepts custom session storage dir', () => {
    const config = defineConfig({ sessionStorageDir: '.sessions' });
    expect(config.sessionStorageDir).toBe('.sessions');
  });
});

describe('DenshobatoConfigSchema', () => {
  it('rejects invalid model type', () => {
    const result = DenshobatoConfigSchema.safeParse({ model: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid maxTokens type', () => {
    const result = DenshobatoConfigSchema.safeParse({ maxTokens: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects non-array editableDirectories', () => {
    const result = DenshobatoConfigSchema.safeParse({
      editableDirectories: 'src',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid full config', () => {
    const result = DenshobatoConfigSchema.safeParse({
      model: 'claude-sonnet-4-20250514',
      maxTokens: 8192,
      editableDirectories: ['src', 'lib'],
      includePatterns: ['**/*.tsx'],
      excludePatterns: ['**/dist/**'],
      agentPrompt: 'A todo app',
      github: { baseBranch: 'main', owner: 'user', repo: 'project' },
      sessionStorageDir: '.denshobato',
    });
    expect(result.success).toBe(true);
  });
});

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-config-test-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig(tempDir);
    expect(config.model).toBe('claude-sonnet-4-20250514');
    expect(config.maxTokens).toBe(4096);
  });

  it('loads JSON config file', async () => {
    writeFileSync(
      join(tempDir, 'denshobato.config.json'),
      JSON.stringify({ model: 'claude-opus-4-20250514', maxTokens: 8192 }),
    );
    const config = await loadConfig(tempDir);
    expect(config.model).toBe('claude-opus-4-20250514');
    expect(config.maxTokens).toBe(8192);
  });

  it('falls back to defaults for invalid JSON', async () => {
    writeFileSync(join(tempDir, 'denshobato.config.json'), 'not json');
    const config = await loadConfig(tempDir);
    expect(config.model).toBe('claude-sonnet-4-20250514');
  });
});
