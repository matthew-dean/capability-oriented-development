import { z } from 'zod';

const text = z.string().trim().min(1);
const packageId = text.regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const commit = text.regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/, 'Use a full immutable Git commit ID');
/** Read a version from the native consumer declaration instead of copying it. */
export const versionSourceSchema = z.union([
  text,
  z.object({ file: text, format: z.literal('json'), pointer: text.regex(/^(?:\/(?:[^~]|~[01])*)+$/, 'Use an escaped JSON pointer') }).strict(),
  z.object({ file: text, format: z.literal('nuget'), package: packageId }).strict(),
]);
export const dependencySchema = z.object({
  id: text, repository: text, contract: text, version: versionSourceSchema,
  revision: z.union([commit, z.object({ format: z.literal('nuget') }).strict()]).optional(),
}).strict();
export type CapabilityDependency = z.infer<typeof dependencySchema>;

export function dependencyVersion(version: z.infer<typeof versionSourceSchema>, read: (file: string) => string): string {
  if (typeof version === 'string') return version;
  const source = read(version.file);
  if (version.format === 'json') {
    let value: unknown = JSON.parse(source);
    for (const key of version.pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'))) {
      if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) throw Error(`Version pointer is absent: ${version.file}${version.pointer}`);
      value = (value as Record<string, unknown>)[key];
    }
    if (typeof value !== 'string' || !value.trim()) throw Error('Native version must be a nonempty string');
    return value.trim();
  }
  // Deliberately limited to explicit PackageReference literals. MSBuild properties,
  // central versions and conditional alternatives need their resolved native output.
  const literalSource = source.replace(/<!--[\s\S]*?-->/g, '');
  if (/\bCondition\s*=/.test(literalSource)) throw Error('Conditional MSBuild declarations need resolved native version output');
  const matches = [...literalSource.matchAll(/<PackageReference\b([^>]*?)(?:\/>|>([\s\S]*?)<\/PackageReference\s*>)/g)]
    .filter(match => /\bInclude\s*=\s*(["'])(.*?)\1/.exec(match[1]!)?.[2] === version.package)
    .map(match => /\bVersion\s*=\s*(["'])(.*?)\1/.exec(match[1]!)?.[2] ?? /<Version\s*>([^<]+)<\/Version\s*>/.exec(match[2] ?? '')?.[1]);
  if (matches.length !== 1 || !matches[0] || !/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(matches[0])) throw Error(`Expected one literal PackageReference version for ${version.package} in ${version.file}`);
  return matches[0];
}

/** Resolve the selected commit from native package provenance, never a moving ref.
 * The caller supplies metadata obtained through its normal package restore/cache.
 */
export function dependencyRevision(dependency: CapabilityDependency, version: string, readNuget: (packageId: string, version: string) => string): string | undefined {
  if (typeof dependency.revision === 'string') return dependency.revision;
  if (!dependency.revision) return /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(version) ? version : undefined;
  if (typeof dependency.version === 'string' || dependency.version.format !== 'nuget') throw Error('NuGet revision requires a native NuGet version source');
  const xml = readNuget(dependency.version.package, version);
  const tag = (name: string) => new RegExp(`<${name}\\s*>([^<]+)</${name}\\s*>`).exec(xml)?.[1]?.trim();
  if (tag('id')?.toLowerCase() !== dependency.version.package.toLowerCase()) throw Error('Restored package identity does not match');
  if (tag('version') !== version) throw Error('Restored package version does not match native version');
  const repository = /<repository\b([^>]+)\/?\s*>/.exec(xml)?.[1];
  const attribute = (name: string) => new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`).exec(repository ?? '')?.[2];
  const canonical = (url: string) => url.replace(/\/$/, '').replace(/\.git$/, '');
  if (attribute('type') !== 'git' || canonical(attribute('url') ?? '') !== canonical(dependency.repository)) throw Error('Restored package repository does not match declared provider');
  return commit.parse(attribute('commit'));
}
