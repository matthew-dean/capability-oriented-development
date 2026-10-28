#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { packageManager } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (typeof packageManager !== 'string' || !/^pnpm@\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(packageManager)) {
  throw Error('Source setup requires a pinned pnpm release in package.json.');
}
for (const args of [['install', '--frozen-lockfile'], ['build']]) {
  const result = spawnSync('npm', ['exec', '--yes', `--package=${packageManager}`, '--', 'pnpm', ...args], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
