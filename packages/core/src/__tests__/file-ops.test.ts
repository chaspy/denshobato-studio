import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileOperations } from '../file-ops.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

describe('FileOperations', () => {
  let tempDir: string;
  let fileOps: FileOperations;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-test-${randomUUID()}`);
    mkdirSync(join(tempDir, 'src'), { recursive: true });
    writeFileSync(join(tempDir, 'src', 'app.tsx'), '<div>Hello</div>');
    writeFileSync(join(tempDir, 'src', 'style.css'), '.app { color: red; }');
    fileOps = new FileOperations(tempDir, ['src']);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads a file', () => {
    const content = fileOps.readFile('src/app.tsx');
    expect(content).toBe('<div>Hello</div>');
  });

  it('throws when reading non-existent file', () => {
    expect(() => fileOps.readFile('src/missing.tsx')).toThrow('File not found');
  });

  it('writes a file and returns patch', () => {
    const patch = fileOps.writeFile('src/app.tsx', '<div>World</div>');
    expect(patch.file).toBe('src/app.tsx');
    expect(patch.before).toBe('<div>Hello</div>');
    expect(patch.after).toBe('<div>World</div>');
    expect(patch.patch).toContain('-<div>Hello</div>');
    expect(patch.patch).toContain('+<div>World</div>');
  });

  it('refuses to write outside editable directories', () => {
    mkdirSync(join(tempDir, 'config'), { recursive: true });
    expect(() => fileOps.writeFile('config/secret.ts', 'data')).toThrow(
      'not in an editable directory',
    );
  });

  it('edits a file by search/replace', () => {
    const patch = fileOps.editFile('src/app.tsx', 'Hello', 'World');
    expect(patch.after).toBe('<div>World</div>');
  });

  it('throws when search string not found', () => {
    expect(() => fileOps.editFile('src/app.tsx', 'Missing', 'Replacement')).toThrow(
      'Search string not found',
    );
  });

  it('lists files matching patterns', async () => {
    const files = await fileOps.listFiles('src/**/*.tsx');
    expect(files).toContain('src/app.tsx');
    expect(files).not.toContain('src/style.css');
  });

  it('checks file existence', () => {
    expect(fileOps.fileExists('src/app.tsx')).toBe(true);
    expect(fileOps.fileExists('src/missing.tsx')).toBe(false);
  });

  it('creates directories when writing new files', () => {
    fileOps.writeFile('src/components/Button.tsx', '<button>Click</button>');
    expect(existsSync(join(tempDir, 'src', 'components', 'Button.tsx'))).toBe(true);
  });
});
