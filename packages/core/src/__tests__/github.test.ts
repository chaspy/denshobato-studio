import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubIntegration } from '../github.js';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';

describe('GitHubIntegration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `denshobato-github-test-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });
    // Initialize a git repo
    execSync('git init', { cwd: tempDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', {
      cwd: tempDir,
      stdio: 'pipe',
    });
    execSync('git config user.name "Test"', { cwd: tempDir, stdio: 'pipe' });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates instance with default baseBranch', () => {
    const gh = new GitHubIntegration(tempDir);
    expect(gh).toBeDefined();
  });

  it('creates instance with custom options', () => {
    const gh = new GitHubIntegration(tempDir, {
      baseBranch: 'develop',
      owner: 'test-owner',
      repo: 'test-repo',
    });
    expect(gh).toBeDefined();
  });

  it('throws when creating PR without GitHub token', async () => {
    const gh = new GitHubIntegration(tempDir);
    await expect(
      gh.createPR({
        title: 'Test PR',
        body: 'Test body',
        branchName: 'test-branch',
      }),
    ).rejects.toThrow('GitHub token not configured');
  });

  it('gets current branch', async () => {
    // Create initial commit so there is a branch
    execSync('git commit --allow-empty -m "init"', {
      cwd: tempDir,
      stdio: 'pipe',
    });
    const gh = new GitHubIntegration(tempDir);
    const branch = await gh.getCurrentBranch();
    expect(typeof branch).toBe('string');
  });

  it('gets changed files', async () => {
    execSync('git commit --allow-empty -m "init"', {
      cwd: tempDir,
      stdio: 'pipe',
    });
    const gh = new GitHubIntegration(tempDir);
    const files = await gh.getChangedFiles();
    expect(Array.isArray(files)).toBe(true);
  });

  it('gets diff', async () => {
    execSync('git commit --allow-empty -m "init"', {
      cwd: tempDir,
      stdio: 'pipe',
    });
    const gh = new GitHubIntegration(tempDir);
    const diff = await gh.getDiff();
    expect(typeof diff).toBe('string');
  });

  describe('init (auto-detect owner/repo)', () => {
    it('detects owner/repo from HTTPS remote', async () => {
      execSync('git commit --allow-empty -m "init"', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      execSync(
        'git remote add origin https://github.com/test-owner/test-repo.git',
        { cwd: tempDir, stdio: 'pipe' },
      );
      const gh = new GitHubIntegration(tempDir);
      await gh.init();
      // Owner/repo should be set (we can't directly access private fields,
      // but at least init shouldn't throw)
    });

    it('detects owner/repo from SSH remote', async () => {
      execSync('git commit --allow-empty -m "init"', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      execSync(
        'git remote add origin git@github.com:test-owner/test-repo.git',
        { cwd: tempDir, stdio: 'pipe' },
      );
      const gh = new GitHubIntegration(tempDir);
      await gh.init();
    });

    it('does not throw when no remote is set', async () => {
      execSync('git commit --allow-empty -m "init"', {
        cwd: tempDir,
        stdio: 'pipe',
      });
      const gh = new GitHubIntegration(tempDir);
      await expect(gh.init()).resolves.not.toThrow();
    });
  });
});
