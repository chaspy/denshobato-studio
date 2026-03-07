import { copyFileSync, existsSync, mkdirSync, rmSync, unlinkSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import simpleGit from 'simple-git';
import type { Session } from './session.js';

export interface WorkspaceInfo {
  branchName: string;
  repoDir: string;
  appDir: string;
  sourceRepoDir: string;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function findGitRoot(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Git repository root was not found for: ${startDir}`);
    }

    current = parent;
  }
}

export class WorkspaceManager {
  readonly gitRoot: string;
  readonly projectRelativePath: string;

  private storageRoot: string;
  private sessionStorageRelativePath: string;

  constructor(
    private projectDir: string,
    sessionStorageDir: string,
  ) {
    this.projectDir = resolve(projectDir);
    this.gitRoot = findGitRoot(this.projectDir);
    this.projectRelativePath = normalizePath(relative(this.gitRoot, this.projectDir));
    this.storageRoot = resolve(this.projectDir, sessionStorageDir, 'workspaces');
    this.sessionStorageRelativePath = normalizePath(
      relative(this.gitRoot, resolve(this.projectDir, sessionStorageDir)),
    );

    mkdirSync(this.storageRoot, { recursive: true });
  }

  getBranchName(sessionId: string): string {
    return `denshobato/session-${sessionId.slice(0, 8)}`;
  }

  getWorkspaceRoot(sessionId: string): string {
    return join(this.storageRoot, sessionId);
  }

  getRepoDir(sessionId: string): string {
    return join(this.getWorkspaceRoot(sessionId), 'repo');
  }

  getAppDir(sessionId: string): string {
    return join(this.getRepoDir(sessionId), this.projectRelativePath);
  }

  async createSessionWorkspace(sessionId: string, baseSession?: Session | null): Promise<WorkspaceInfo> {
    const branchName = this.getBranchName(sessionId);
    const sourceRepoDir = this.resolveSourceRepoDir(baseSession);
    const repoDir = this.getRepoDir(sessionId);

    rmSync(this.getWorkspaceRoot(sessionId), { recursive: true, force: true });
    mkdirSync(dirname(repoDir), { recursive: true });

    await simpleGit().clone(sourceRepoDir, repoDir, ['--local']);
    await this.configureOriginRemote(repoDir);
    await simpleGit(repoDir).checkout(['-B', branchName]);
    await this.applyLocalChanges(sourceRepoDir, repoDir);

    return {
      branchName,
      repoDir,
      appDir: this.getAppDir(sessionId),
      sourceRepoDir,
    };
  }

  private resolveSourceRepoDir(baseSession?: Session | null): string {
    if (baseSession?.repoDir && existsSync(baseSession.repoDir)) {
      return resolve(baseSession.repoDir);
    }

    return this.gitRoot;
  }

  private async configureOriginRemote(repoDir: string): Promise<void> {
    const sourceGit = simpleGit(this.gitRoot);
    const remotes = await sourceGit.getRemotes(true);
    const origin = remotes.find((remote) => remote.name === 'origin');
    const remoteUrl = origin?.refs.fetch;

    if (!remoteUrl) {
      return;
    }

    const targetGit = simpleGit(repoDir);
    const targetRemotes = await targetGit.getRemotes(true);
    const hasOrigin = targetRemotes.some((remote) => remote.name === 'origin');

    if (hasOrigin) {
      await targetGit.remote(['set-url', 'origin', remoteUrl]);
      return;
    }

    await targetGit.addRemote('origin', remoteUrl);
  }

  private isExcludedRepoPath(filePath: string): boolean {
    const normalized = normalizePath(filePath).replace(/^\.\/+/, '');
    if (!normalized) return true;

    return (
      normalized === this.sessionStorageRelativePath ||
      normalized.startsWith(`${this.sessionStorageRelativePath}/`) ||
      normalized === '.git' ||
      normalized.startsWith('.git/') ||
      normalized.includes('/.git/') ||
      normalized === 'node_modules' ||
      normalized.startsWith('node_modules/') ||
      normalized.includes('/node_modules/')
    );
  }

  private async applyLocalChanges(sourceRepoDir: string, repoDir: string): Promise<void> {
    const git = simpleGit(sourceRepoDir);
    const status = await git.status();

    if (status.conflicted.length > 0) {
      throw new Error('Cannot create a session from a repository with merge conflicts.');
    }

    const filesToCopy = new Set<string>([
      ...status.created,
      ...status.modified,
      ...status.not_added,
      ...status.staged,
    ]);
    const filesToDelete = new Set<string>(status.deleted);

    for (const renamed of status.renamed) {
      filesToDelete.add(renamed.from);
      filesToCopy.add(renamed.to);
    }

    for (const filePath of filesToDelete) {
      if (this.isExcludedRepoPath(filePath)) continue;
      const targetPath = resolve(repoDir, filePath);
      if (existsSync(targetPath)) {
        unlinkSync(targetPath);
      }
    }

    for (const filePath of filesToCopy) {
      if (this.isExcludedRepoPath(filePath)) continue;

      const sourcePath = resolve(sourceRepoDir, filePath);
      const targetPath = resolve(repoDir, filePath);
      if (!existsSync(sourcePath)) continue;

      mkdirSync(dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}
