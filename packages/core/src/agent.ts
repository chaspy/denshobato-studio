import Anthropic from '@anthropic-ai/sdk';
import type { DenshobatoConfig } from './config.js';
import { FileOperations, type FilePatch } from './file-ops.js';
import { SessionManager, type SessionPreferences } from './session.js';

interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates or overwrites)',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Edit a file by replacing a search string with a replacement string',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'File path relative to project root' },
        search: { type: 'string', description: 'Exact string to search for' },
        replace: { type: 'string', description: 'String to replace with' },
      },
      required: ['path', 'search', 'replace'],
    },
  },
  {
    name: 'list_files',
    description: 'List files matching a glob pattern',
    input_schema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern (e.g. "src/**/*.tsx")',
        },
      },
      required: [],
    },
  },
];

export class DenshobatoAgent {
  private sessionManager: SessionManager;
  private config: DenshobatoConfig;
  private baseProjectDir: string;

  constructor(config: DenshobatoConfig, projectDir: string, sessionManager?: SessionManager) {
    this.config = config;
    this.baseProjectDir = projectDir;
    this.sessionManager = sessionManager ?? new SessionManager(
      config.sessionStorageDir ? `${projectDir}/${config.sessionStorageDir}` : undefined,
    );
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getFileOps(sessionId?: string): FileOperations {
    const sessionProjectDir =
      sessionId ? this.sessionManager.getSession(sessionId)?.appDir : null;

    return new FileOperations(
      sessionProjectDir ?? this.baseProjectDir,
      this.config.editableDirectories,
      this.config.includePatterns,
      this.config.excludePatterns,
    );
  }

  async chat(
    sessionId: string,
    userMessage: string,
    context?: { file?: string; line?: number; component?: string },
    preferences?: SessionPreferences,
    apiKeyOverride?: string,
  ): Promise<{ response: string; patches: FilePatch[] }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    const client = this.createClient(apiKeyOverride);

    // Add user message to session
    this.sessionManager.addMessage(sessionId, {
      role: 'user',
      content: userMessage,
      context,
      preferences,
    });

    // Build messages for the API
    const messages: Anthropic.MessageParam[] = session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = this.buildSystemPrompt(context, preferences);
    const patches: FilePatch[] = [];

    // Tool use loop
    let response = await client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    while (response.stop_reason === 'tool_use') {
      const toolUses = response.content.filter(
        (block): block is Anthropic.ContentBlockParam & { type: 'tool_use' } =>
          block.type === 'tool_use',
      );

      const toolResults: ToolResult[] = [];

      for (const toolUse of toolUses) {
        const result = await this.executeTool(
          sessionId,
          toolUse.name,
          toolUse.input as Record<string, string>,
          patches,
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          ...result,
        });
      }

      // Add assistant response and tool results to messages
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        tools: TOOLS,
        messages,
      });
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    const assistantMessage = textBlocks.map((b) => b.text).join('\n');

    // Save assistant message to session
    this.sessionManager.addMessage(sessionId, {
      role: 'assistant',
      content: assistantMessage,
    });

    return { response: assistantMessage, patches };
  }

  restoreSessionWorkspace(sessionId: string): string[] {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    const fileOps = this.getFileOps(sessionId);

    const restored: string[] = [];
    for (const file of this.sessionManager.listTrackedFiles()) {
      const hasSessionVersion = Object.prototype.hasOwnProperty.call(session.workspaceFiles, file);
      if (hasSessionVersion) {
        const content = session.workspaceFiles[file];
        const current = fileOps.fileExists(file) ? fileOps.readFile(file) : null;
        if (current !== content) {
          fileOps.writeFile(file, content);
          restored.push(file);
        }
        continue;
      }

      const original = this.sessionManager.getOriginalSnapshot(file);
      if (!original) continue;

      if (!original.exists) {
        if (fileOps.fileExists(file)) {
          fileOps.deleteFile(file);
          restored.push(file);
        }
        continue;
      }

      const current = fileOps.fileExists(file) ? fileOps.readFile(file) : null;
      if (current !== original.content) {
        fileOps.writeFile(file, original.content);
        restored.push(file);
      }
    }

    return restored;
  }

  private createClient(apiKeyOverride?: string): Anthropic {
    const apiKey = apiKeyOverride?.trim() || this.config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is not configured');
    }
    return new Anthropic({ apiKey });
  }

  private buildSystemPrompt(context?: {
    file?: string;
    line?: number;
    component?: string;
  }, preferences?: SessionPreferences): string {
    const parts = [
      'You are Denshobato Studio, an AI assistant that helps modify React application code.',
      'You can read, write, and edit files in the project.',
      'When the user asks you to make changes, use the provided tools to modify files directly.',
      'Always read a file before editing it.',
      'Make minimal, focused changes.',
    ];

    if (preferences?.thinkingMode === 'deep') {
      parts.push(
        'Deep Think mode is enabled. Spend additional effort exploring alternatives, checking edge cases, and validating edits before finishing.',
      );
    }

    if (preferences?.responseLanguage === 'ja') {
      parts.push('Respond to the user in Japanese.');
    } else if (preferences?.responseLanguage === 'en') {
      parts.push('Respond to the user in English.');
    }

    if (this.config.agentPrompt) {
      parts.push(`\nProject context: ${this.config.agentPrompt}`);
    }

    if (context?.file) {
      parts.push(`\nThe user is currently looking at: ${context.file}`);
      if (context.line) parts.push(`At line: ${context.line}`);
      if (context.component) parts.push(`Component: ${context.component}`);
    }

    return parts.join('\n');
  }

  private async executeTool(
    sessionId: string,
    toolName: string,
    input: Record<string, string>,
    patches: FilePatch[],
  ): Promise<{ content: string; is_error?: boolean }> {
    try {
      const fileOps = this.getFileOps(sessionId);

      switch (toolName) {
        case 'read_file': {
          const content = fileOps.readFile(input.path);
          return { content };
        }
        case 'write_file': {
          const fileExists = fileOps.fileExists(input.path);
          const original = fileExists ? fileOps.readFile(input.path) : '';
          this.sessionManager.addSnapshot(sessionId, input.path, original, fileExists);
          const patch = fileOps.writeFile(input.path, input.content);
          patches.push(patch);
          this.sessionManager.setWorkspaceFile(sessionId, patch.file, patch.after);
          this.sessionManager.addChange(sessionId, patch.file, patch.patch);
          return { content: `File written: ${input.path}` };
        }
        case 'edit_file': {
          // Snapshot original before first edit
          const original = fileOps.readFile(input.path);
          this.sessionManager.addSnapshot(sessionId, input.path, original, true);
          const patch = fileOps.editFile(input.path, input.search, input.replace);
          patches.push(patch);
          this.sessionManager.setWorkspaceFile(sessionId, patch.file, patch.after);
          this.sessionManager.addChange(sessionId, patch.file, patch.patch);
          return { content: `File edited: ${input.path}` };
        }
        case 'list_files': {
          const files = await fileOps.listFiles(input.pattern);
          return { content: files.join('\n') };
        }
        default:
          return { content: `Unknown tool: ${toolName}`, is_error: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: message, is_error: true };
    }
  }
}
