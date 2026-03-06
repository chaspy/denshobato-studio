import simpleGit, { type SimpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';

export interface PROptions {
  title: string;
  body: string;
  branchName: string;
  baseBranch?: string;
  files?: string[];
}

export interface PRResult {
  url: string;
  number: number;
  branchName: string;
}

export class GitHubIntegration {
  private git: SimpleGit;
  private octokit: Octokit | null = null;
  private owner: string;
  private repo: string;
  private baseBranch: string;

  constructor(
    projectDir: string,
    options: { baseBranch?: string; owner?: string; repo?: string; token?: string } = {},
  ) {
    this.git = simpleGit(projectDir);
    this.baseBranch = options.baseBranch ?? 'main';
    this.owner = options.owner ?? '';
    this.repo = options.repo ?? '';

    const token = options.token ?? process.env.GITHUB_TOKEN;
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  async init(): Promise<void> {
    // Auto-detect owner/repo from git remote if not configured
    if (!this.owner || !this.repo) {
      try {
        const remotes = await this.git.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');
        if (origin?.refs.fetch) {
          const match = origin.refs.fetch.match(
            /github\.com[:/]([^/]+)\/([^/.]+)/,
          );
          if (match) {
            this.owner = this.owner || match[1];
            this.repo = this.repo || match[2];
          }
        }
      } catch {
        // Git not initialized or no remote
      }
    }
  }

  async createPR(options: PROptions): Promise<PRResult> {
    if (!this.octokit) {
      throw new Error(
        'GitHub token not configured. Set GITHUB_TOKEN environment variable.',
      );
    }

    await this.init();

    if (!this.owner || !this.repo) {
      throw new Error(
        'Could not determine GitHub owner/repo. Configure github.owner and github.repo in denshobato.config.',
      );
    }

    const baseBranch = options.baseBranch ?? this.baseBranch;

    // Create and checkout new branch
    await this.git.checkoutBranch(options.branchName, baseBranch);

    // Stage and commit
    if (options.files && options.files.length > 0) {
      await this.git.add(options.files);
    } else {
      await this.git.add('.');
    }

    await this.git.commit(options.title);

    // Push to remote
    await this.git.push('origin', options.branchName, ['--set-upstream']);

    // Create PR
    const { data: pr } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: options.title,
      body: options.body,
      head: options.branchName,
      base: baseBranch,
    });

    // Switch back to base branch
    await this.git.checkout(baseBranch);

    return {
      url: pr.html_url,
      number: pr.number,
      branchName: options.branchName,
    };
  }

  async getChangedFiles(): Promise<string[]> {
    const status = await this.git.status();
    return [...status.modified, ...status.not_added, ...status.created];
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const branch = await this.git.branchLocal();
      return branch.current || null;
    } catch {
      return null;
    }
  }

  async getDiff(): Promise<string> {
    return this.git.diff();
  }
}
