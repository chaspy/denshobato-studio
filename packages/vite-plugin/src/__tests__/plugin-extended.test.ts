import { describe, it, expect } from 'vitest';
import { denshobato } from '../plugin.js';

describe('denshobato plugin (extended)', () => {
  it('returns an array of 3 plugins', () => {
    const plugins = denshobato();
    expect(plugins).toHaveLength(3);
  });

  it('names plugins correctly', () => {
    const plugins = denshobato();
    expect(plugins.map((p) => p.name)).toEqual([
      'denshobato:jsx-transform',
      'denshobato:api',
      'denshobato:studio',
    ]);
  });

  describe('jsx-transform plugin', () => {
    it('has enforce: "pre"', () => {
      const plugins = denshobato();
      const jsxPlugin = plugins.find(
        (p) => p.name === 'denshobato:jsx-transform',
      );
      expect(jsxPlugin!.enforce).toBe('pre');
    });

    it('only applies during serve', () => {
      const plugins = denshobato();
      const jsxPlugin = plugins.find(
        (p) => p.name === 'denshobato:jsx-transform',
      );
      expect((jsxPlugin as any).apply).toBe('serve');
    });
  });

  describe('studio plugin', () => {
    it('resolves virtual:denshobato-studio', () => {
      const plugins = denshobato();
      const studioPlugin = plugins.find(
        (p) => p.name === 'denshobato:studio',
      );
      const resolveId = studioPlugin!.resolveId as (
        id: string,
      ) => string | undefined;
      expect(resolveId('virtual:denshobato-studio')).toBe(
        '\0virtual:denshobato-studio',
      );
    });

    it('does not resolve other virtual modules', () => {
      const plugins = denshobato();
      const studioPlugin = plugins.find(
        (p) => p.name === 'denshobato:studio',
      );
      const resolveId = studioPlugin!.resolveId as (
        id: string,
      ) => string | undefined;
      expect(resolveId('virtual:something-else')).toBeUndefined();
    });

    it('loads virtual module with mount code', () => {
      const plugins = denshobato();
      const studioPlugin = plugins.find(
        (p) => p.name === 'denshobato:studio',
      );
      const load = studioPlugin!.load as (id: string) => string | undefined;
      const code = load('\0virtual:denshobato-studio');
      expect(code).toBeDefined();
      expect(code).toContain('mountDenshobatoStudio');
      expect(code).toContain('@denshobato-studio/ui');
    });

    it('does not load non-virtual modules', () => {
      const plugins = denshobato();
      const studioPlugin = plugins.find(
        (p) => p.name === 'denshobato:studio',
      );
      const load = studioPlugin!.load as (id: string) => string | undefined;
      expect(load('some-other-module')).toBeUndefined();
    });
  });

  describe('api plugin', () => {
    it('exists and is named correctly', () => {
      const plugins = denshobato();
      const apiPlugin = plugins.find((p) => p.name === 'denshobato:api');
      expect(apiPlugin).toBeDefined();
    });
  });
});
