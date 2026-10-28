import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-bootstrap-')); roots.push(root);
  mkdirSync(join(root, 'tools')); mkdirSync(join(root, 'bin'));
  copyFileSync(resolve('tools/setup.mjs'), join(root, 'tools/setup.mjs'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', packageManager: 'pnpm@11.1.0' }));
  writeFileSync(join(root, 'bin/npm'), `#!/usr/bin/env node
import {appendFileSync} from 'node:fs';
appendFileSync('commands.jsonl',JSON.stringify(process.argv.slice(2))+'\\n');
if(process.env.FAIL_INSTALL && process.argv.includes('install'))process.exit(17);
`);
  chmodSync(join(root, 'bin/npm'), 0o755);
  return { root, env: { ...process.env, PATH: join(root, 'bin') + delimiter + process.env.PATH } };
}
it.skipIf(process.platform === 'win32')('bootstraps through the declared manager without relying on global Corepack and stops when install fails', () => {
  const f = fixture();
  execFileSync(process.execPath, ['tools/setup.mjs'], { cwd: f.root, env: f.env });
  const calls = readFileSync(join(f.root, 'commands.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  expect(calls).toEqual([
    ['exec', '--yes', '--package=pnpm@11.1.0', '--', 'pnpm', 'install', '--frozen-lockfile'],
    ['exec', '--yes', '--package=pnpm@11.1.0', '--', 'pnpm', 'build'],
  ]);
  rmSync(join(f.root, 'commands.jsonl'));
  const failed = spawnSync(process.execPath, ['tools/setup.mjs'], { cwd: f.root, env: { ...f.env, FAIL_INSTALL: '1' } });
  expect(failed.status).toBe(17);
  expect(readFileSync(join(f.root, 'commands.jsonl'), 'utf8').trim().split('\n')).toHaveLength(1);
});
