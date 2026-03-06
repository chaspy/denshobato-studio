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
  private client: Anthropic;
  private fileOps: FileOperations;
  private sessionManager: SessionManager;
  private config: DenshobatoConfig;

  constructor(config: DenshobatoConfig, projectDir: string) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.fileOps = new FileOperations(
      projectDir,
      config.editableDirectories,
      config.includePatterns,
      config.excludePatterns,
    );
    this.sessionManager = new SessionManager(
      config.sessionStorageDir ? `${projectDir}/${config.sessionStorageDir}` : undefined,
    );
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getFileOps(): FileOperations {
    return this.fileOps;
  }

  async chat(
    sessionId: string,
    userMessage: string,
    context?: { file?: string; line?: number; component?: string },
    preferences?: SessionPreferences,
  ): Promise<{ response: string; patches: FilePatch[] }> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

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
    let response = await this.client.messages.create({
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

      response = await this.client.messages.create({
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
      switch (toolName) {
        case 'read_file': {
          const content = this.fileOps.readFile(input.path);
          return { content };
        }
        case 'write_file': {
          // Snapshot original before first edit
          if (this.fileOps.fileExists(input.path)) {
            const original = this.fileOps.readFile(input.path);
            this.sessionManager.addSnapshot(sessionId, input.path, original);
          }
          const patch = this.fileOps.writeFile(input.path, input.content);
          patches.push(patch);
          this.sessionManager.addChange(sessionId, patch.file, patch.patch);
          return { content: `File written: ${input.path}` };
        }
        case 'edit_file': {
          // Snapshot original before first edit
          const original = this.fileOps.readFile(input.path);
          this.sessionManager.addSnapshot(sessionId, input.path, original);
          const patch = this.fileOps.editFile(input.path, input.search, input.replace);
          patches.push(patch);
          this.sessionManager.addChange(sessionId, patch.file, patch.patch);
          return { content: `File edited: ${input.path}` };
        }
        case 'list_files': {
          const files = await this.fileOps.listFiles(input.pattern);
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
