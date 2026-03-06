import { describe, it, expect } from 'vitest';
import { denshobato } from '../plugin.js';

describe('denshobato studio plugin', () => {
  it('resolves the virtual module id', () => {
    const plugins = denshobato();
    const studioPlugin = plugins.find((p) => p.name === 'denshobato:studio');
    expect(studioPlugin).toBeDefined();
    const resolveId = studioPlugin!.resolveId as (id: string) => string | undefined;
    expect(resolveId('virtual:denshobato-studio')).toBe('\0virtual:denshobato-studio');
    expect(resolveId('something-else')).toBeUndefined();
  });

  it('loads the virtual module with studio mount', () => {
    const plugins = denshobato();
    const studioPlugin = plugins.find((p) => p.name === 'denshobato:studio');
    const load = studioPlugin!.load as (id: string) => string | undefined;
    const code = load('\0virtual:denshobato-studio');
    expect(code).toContain('mountDenshobatoStudio');
    expect(code).toContain('@denshobato-studio/ui');
  });

  it('creates three plugins', () => {
    const plugins = denshobato();
    expect(plugins).toHaveLength(3);
    expect(plugins.map((p) => p.name)).toEqual([
      'denshobato:jsx-transform',
      'denshobato:api',
      'denshobato:studio',
    ]);
  });
});
