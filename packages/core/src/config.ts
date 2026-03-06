import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const GitHubConfigSchema = z.object({
  baseBranch: z.string().default('main'),
  owner: z.string().optional(),
  repo: z.string().optional(),
});

export const DenshobatoConfigSchema = z.object({
  model: z.string().default('claude-sonnet-4-20250514'),
  maxTokens: z.number().default(4096),
  editableDirectories: z.array(z.string()).default(['src']),
  includePatterns: z.array(z.string()).default(['**/*.tsx', '**/*.ts', '**/*.css']),
  excludePatterns: z
    .array(z.string())
    .default(['**/node_modules/**', '**/dist/**', '**/.git/**']),
  agentPrompt: z.string().default(''),
  github: GitHubConfigSchema.default({}),
  apiKey: z.string().optional(),
  sessionStorageDir: z.string().default('.denshobato'),
});

export type DenshobatoConfig = z.infer<typeof DenshobatoConfigSchema>;

export function defineConfig(config: Partial<DenshobatoConfig>): DenshobatoConfig {
  return DenshobatoConfigSchema.parse(config);
}

export async function loadConfig(projectDir: string): Promise<DenshobatoConfig> {
  const configPaths = [
    'denshobato.config.ts',
    'denshobato.config.js',
    'denshobato.config.json',
  ];

  for (const configPath of configPaths) {
    const fullPath = resolve(projectDir, configPath);
    try {
      if (configPath.endsWith('.json')) {
        const raw = readFileSync(fullPath, 'utf-8');
        return DenshobatoConfigSchema.parse(JSON.parse(raw));
      }
      // For TS/JS configs, use dynamic import
      const mod = await import(fullPath);
      const exported = mod.default ?? mod;
      return DenshobatoConfigSchema.parse(exported);
    } catch {
      // Config file not found or invalid, try next
      continue;
    }
  }

  // Return defaults if no config file found
  return DenshobatoConfigSchema.parse({});
}
