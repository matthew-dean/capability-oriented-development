import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, ftruncateSync, openSync, readFileSync, readdirSync, realpathSync, statSync, writeSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
export const sourcePattern = /\.(?:[cm]?ts|tsx)$/;
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage', '.cod', '.threadlabs']);
export const hash = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
export const portable = (value: string): string => value.split(sep).join('/');
/** Temporary verification writes own one canonical regular file, never a replacement alias. */
export function writeOwnedSource(canonical: string, bytes: Buffer): boolean {
  let descriptor: number | undefined;
  try {
    descriptor = openSync(canonical, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0));
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1 || realpathSync(canonical) !== canonical) return false;
    if (!readFileSync(descriptor).equals(bytes)) {
      ftruncateSync(descriptor, 0);
      let offset = 0;
      while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
    }
    return true;
  } catch { return false; } finally { if (descriptor !== undefined) closeSync(descriptor); }
}
export function contained(root: string, file: string): boolean {
  const rel = relative(root, file);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}
export function reference(folder: string, path: string, boundary = folder): string {
  if (!path || isAbsolute(path) || /^[a-z]:|\\/i.test(path)) throw new Error(`Unsafe path: ${path}`);
  const file = resolve(folder, path);
  if (!contained(boundary, file) || !contained(realpathSync(boundary), realpathSync(file))) throw new Error(`Path escapes reference boundary: ${path}`);
  if (!statSync(file).isFile()) throw new Error(`Expected a regular file: ${path}`);
  return file;
}
export function scan(root: string): { files: string[]; symlinks: string[] } {
  const files: string[] = [], symlinks: string[] = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ignored.has(entry.name)) continue;
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink()) symlinks.push(file);
      else if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  walk(root); return { files, symlinks };
}
