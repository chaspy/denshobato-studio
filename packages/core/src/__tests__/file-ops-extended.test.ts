import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileOperations } from '../file-ops.js';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('FileOperations (extended)', () => {
  let tempDir: string;
  let fileOps: FileOperations;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-fileops-ext-${randomUUID()}`);
    mkdirSync(join(tempDir, 'src', 'components'), { recursive: true });
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'App.tsx'), '<div>Hello</div>');
    writeFileSync(join(tempDir, 'src', 'index.ts'), 'export default App;');
    writeFileSync(join(tempDir, 'src', 'components', 'Button.tsx'), '<button>Click</button>');
    writeFileSync(join(tempDir, 'config', 'settings.json'), '{}');
    fileOps = new FileOperations(tempDir, ['src']);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('readFile', () => {
    it('reads files in nested directories', () => {
      expect(fileOps.readFile('src/components/Button.tsx')).toBe(
        '<button>Click</button>',
      );
    });

    it('reads files outside editable directories (read is allowed)', () => {
      expect(fileOps.readFile('config/settings.json')).toBe('{}');
    });
  });

  describe('writeFile', () => {
    it('creates new file in editable directory', () => {
      const patch = fileOps.writeFile('src/new.ts', 'export const x = 1;');
      expect(patch.before).toBe('');
      expect(patch.after).toBe('export const x = 1;');
      expect(readFileSync(join(tempDir, 'src', 'new.ts'), 'utf-8')).toBe(
        'export const x = 1;',
      );
    });

    it('overwrites existing file', () => {
      const patch = fileOps.writeFile('src/App.tsx', '<div>World</div>');
      expect(patch.before).toBe('<div>Hello</div>');
      expect(patch.after).toBe('<div>World</div>');
    });

    it('creates nested directories automatically', () => {
      fileOps.writeFile('src/deep/nested/File.tsx', 'content');
      expect(
        existsSync(join(tempDir, 'src', 'deep', 'nested', 'File.tsx')),
      ).toBe(true);
    });

    it('refuses to write to non-editable directory', () => {
      expect(() => fileOps.writeFile('config/db.json', '{}')).toThrow(
        'not in an editable directory',
      );
    });

    it('generates unified diff in patch', () => {
      const patch = fileOps.writeFile('src/App.tsx', '<div>Changed</div>');
      expect(patch.patch).toContain('---');
      expect(patch.patch).toContain('+++');
      expect(patch.patch).toContain('-<div>Hello</div>');
      expect(patch.patch).toContain('+<div>Changed</div>');
    });
  });

  describe('editFile', () => {
    it('replaces only the first occurrence', () => {
      writeFileSync(
        join(tempDir, 'src', 'multi.tsx'),
        '<div>Hello</div><div>Hello</div>',
      );
      const patch = fileOps.editFile('src/multi.tsx', 'Hello', 'World');
      expect(patch.after).toBe('<div>World</div><div>Hello</div>');
    });

    it('throws when search string is not found', () => {
      expect(() =>
        fileOps.editFile('src/App.tsx', 'nonexistent', 'replacement'),
      ).toThrow('Search string not found');
    });

    it('chains multiple edits', () => {
      fileOps.editFile('src/App.tsx', 'Hello', 'World');
      const patch = fileOps.editFile('src/App.tsx', 'World', 'Universe');
      expect(patch.after).toBe('<div>Universe</div>');
    });
  });

  describe('listFiles', () => {
    it('lists all files with default patterns', async () => {
      const files = await fileOps.listFiles();
      expect(files).toContain('src/App.tsx');
      expect(files).toContain('src/index.ts');
      expect(files).toContain('src/components/Button.tsx');
    });

    it('lists files with custom pattern', async () => {
      const files = await fileOps.listFiles('src/components/**/*.tsx');
      expect(files).toEqual(['src/components/Button.tsx']);
    });

    it('excludes node_modules by default', async () => {
      mkdirSync(join(tempDir, 'node_modules', 'pkg'), { recursive: true });
      writeFileSync(join(tempDir, 'node_modules', 'pkg', 'index.ts'), '');
      const files = await fileOps.listFiles('**/*.ts');
      expect(files).not.toContain('node_modules/pkg/index.ts');
    });
  });

  describe('deleteFile', () => {
    it('deletes file in editable directory', () => {
      fileOps.deleteFile('src/index.ts');
      expect(existsSync(join(tempDir, 'src', 'index.ts'))).toBe(false);
    });

    it('is a no-op for non-existent file', () => {
      expect(() => fileOps.deleteFile('src/missing.ts')).not.toThrow();
    });

    it('refuses to delete outside editable directories', () => {
      expect(() => fileOps.deleteFile('config/settings.json')).toThrow(
        'not in an editable directory',
      );
    });
  });

  describe('generateDiff', () => {
    it('generates unified diff', () => {
      const diff = fileOps.generateDiff(
        'src/App.tsx',
        '<div>Hello</div>',
        '<div>World</div>',
      );
      expect(diff).toContain('-<div>Hello</div>');
      expect(diff).toContain('+<div>World</div>');
    });
  });

  describe('multiple editable directories', () => {
    it('allows writes to any configured editable directory', () => {
      const ops = new FileOperations(tempDir, ['src', 'config']);
      ops.writeFile('config/settings.json', '{"key": "value"}');
      expect(
        readFileSync(join(tempDir, 'config', 'settings.json'), 'utf-8'),
      ).toBe('{"key": "value"}');
    });
  });
});
