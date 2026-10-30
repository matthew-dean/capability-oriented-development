import { linkSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { writeOwnedSource } from '../src/filesystem.js';

const hooks = vi.hoisted(() => ({ afterRead: undefined as (() => void) | undefined }));
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
    const bytes = actual.readFileSync(...args);
    hooks.afterRead?.();
    return bytes;
  } };
});
const roots: string[] = [];
afterEach(() => {
  hooks.afterRead = undefined;
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

it.skipIf(process.platform === 'win32').each([symlinkSync, linkSync])('never writes a replacement alias installed after the source read', link => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'cod-owned-write-'))); roots.push(root);
  const source = join(root, 'source'), saved = join(root, 'saved'), innocent = join(root, 'innocent');
  writeFileSync(source, 'long temporary probe'); writeFileSync(innocent, 'keep untouched');
  hooks.afterRead = () => {
    hooks.afterRead = undefined;
    renameSync(source, saved); link(innocent, source);
  };
  expect(writeOwnedSource(source, Buffer.from('restored'))).toBe(true);
  expect(readFileSync(innocent, 'utf8')).toBe('keep untouched');
  expect(readFileSync(saved, 'utf8')).toBe('restored');
});
