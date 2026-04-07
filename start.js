#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 使用 tsx 运行 server
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

server.on('close', (code) => {
  process.exit(code || 0);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});