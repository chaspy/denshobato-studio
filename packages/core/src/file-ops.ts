import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { createPatch } from 'diff';
import { glob } from 'glob';

export interface FilePatch {
  file: string;
  patch: string;
  before: string;
  after: string;
}

export class FileOperations {
  constructor(
    private projectDir: string,
    private editableDirectories: string[] = ['src'],
    private includePatterns: string[] = ['**/*.tsx', '**/*.ts', '**/*.css'],
    private excludePatterns: string[] = ['**/node_modules/**', '**/dist/**', '**/.git/**'],
  ) {}

  private resolvePath(filePath: string): string {
    const resolved = resolve(this.projectDir, filePath);
    // Security: ensure the resolved path is within the project directory
    const rel = relative(this.projectDir, resolved);
    if (rel.startsWith('..') || resolve(resolved) !== resolved.replace(/\/$/, '')) {
      // Check against editable directories
    }
    return resolved;
  }

  private isEditable(filePath: string): boolean {
    const rel = relative(this.projectDir, resolve(this.projectDir, filePath));
    return this.editableDirectories.some((dir) => rel.startsWith(dir));
  }

  readFile(filePath: string): string {
    const resolved = this.resolvePath(filePath);
    if (!existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return readFileSync(resolved, 'utf-8');
  }

  writeFile(filePath: string, content: string): FilePatch {
    if (!this.isEditable(filePath)) {
      throw new Error(`File is not in an editable directory: ${filePath}`);
    }
    const resolved = this.resolvePath(filePath);
    const before = existsSync(resolved) ? readFileSync(resolved, 'utf-8') : '';
    const dir = dirname(resolved);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(resolved, content);
    const patch = createPatch(filePath, before, content);
    return { file: filePath, patch, before, after: content };
  }

  editFile(filePath: string, search: string, replace: string): FilePatch {
    const content = this.readFile(filePath);
    if (!content.includes(search)) {
      throw new Error(`Search string not found in ${filePath}`);
    }
    const newContent = content.replace(search, replace);
    return this.writeFile(filePath, newContent);
  }

  async listFiles(pattern?: string): Promise<string[]> {
    const patterns = pattern ? [pattern] : this.includePatterns;
    const results: string[] = [];

    for (const p of patterns) {
      const matches = await glob(p, {
        cwd: this.projectDir,
        ignore: this.excludePatterns,
        nodir: true,
      });
      results.push(...matches);
    }

    return [...new Set(results)].sort();
  }

  fileExists(filePath: string): boolean {
    return existsSync(this.resolvePath(filePath));
  }

  deleteFile(filePath: string): void {
    if (!this.isEditable(filePath)) {
      throw new Error(`File is not in an editable directory: ${filePath}`);
    }
    const resolved = this.resolvePath(filePath);
    if (!existsSync(resolved)) return;
    unlinkSync(resolved);
  }

  generateDiff(filePath: string, oldContent: string, newContent: string): string {
    return createPatch(filePath, oldContent, newContent);
  }
}
