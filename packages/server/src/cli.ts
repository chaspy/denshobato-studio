#!/usr/bin/env node

import { createServer } from './index.js';
import { resolve } from 'node:path';

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

const projectDir = resolve(getArg('--project-dir') || '.');
const port = parseInt(getArg('--port') || '3001', 10);
const authToken = getArg('--auth-token') || process.env.DENSHOBATO_AUTH_TOKEN;

async function main() {
  console.log(`Denshobato Studio Server`);
  console.log(`  Project: ${projectDir}`);
  console.log(`  Port: ${port}`);
  console.log(`  Auth: ${authToken ? 'enabled' : 'disabled'}`);

  const app = await createServer({
    projectDir,
    port,
    authToken,
  });

  app.listen(port, () => {
    console.log(`\nServer running at http://localhost:${port}`);
    console.log(`API endpoint: http://localhost:${port}/__denshobato/`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
