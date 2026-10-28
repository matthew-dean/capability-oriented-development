import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { z } from 'zod';
import { inspectCatalog } from './catalog.js';
import { contractSchema, contractFiles } from './contracts.js';
import { dependencyVersion, dependencyRevision, type CapabilityDependency } from './dependencies.js';
import { contained, hash, reference } from './filesystem.js';

const text = z.string().trim().min(1);
const repositorySource = z.object({
  repository: text,
  discoveryRef: text.default('HEAD'),
  directory: text.default('capabilities'),
}).strict();
export const sourcesSchema = z.object({ sourcesVersion: z.literal(1), repositories: z.array(repositorySource) }).strict()
  .refine(value => new Set(value.repositories.map(item => item.repository)).size === value.repositories.length, 'Duplicate repository sources');
type Source = z.infer<typeof repositorySource>;
type Contract = z.infer<typeof contractSchema>;
type RemoteCapability = Omit<Contract, 'dependencies'> & { dependencies: (Contract['dependencies'][number] & { resolvedVersion: string })[]; contract: string; digest: string; files: string[] };
type Catalog = { repository: string; revision: string; sourceCache: string; freshness: 'fetched' | 'cached'; capabilities: RemoteCapability[] };
type Edge = {
  from: string; capability: string; repository: string; contract: string;
  version: string; selection: 'selected' | 'latest'; state: 'resolved' | 'unresolved';
  revision?: string; target?: string; gap?: string;
};
export type ConnectionReport = {
  connectionsVersion: 1; source: string; inputDigest: string; syncedAt: string;
  state: 'current' | 'unresolved' | 'stale'; freshness: 'fetched' | 'cached';
  catalogs: Catalog[]; edges: Edge[];
  updates: { repository: string; capability: string; selectedRevision: string; latestRevision: string; affectedConsumers: string[] }[];
  gaps: string[]; conformance: 'not-evaluated';
};
const cachePath = '.cod/cache/connections.json';
const gitOptions = ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.ext.allow=never', '-c', 'protocol.file.allow=always'];
function git(directory: string, args: string[]): string {
  return execFileSync('git', [...gitOptions, '-C', directory, ...args], {
    encoding: 'utf8', timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function safePath(path: string): string {
  if (!path || path.startsWith('-') || isAbsolute(path) || path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '..' || part === '.' || !part)) throw Error(`Unsafe metadata path: ${path}`);
  return path;
}
function cacheDirectory(root: string, relative: string): string {
  safePath(relative);
  let path = root;
  for (const part of relative.split('/')) {
    path = join(path, part);
    if (existsSync(path)) {
      if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory()) throw Error('Cache directories must be regular directories');
    } else mkdirSync(path);
    if (!contained(root, realpathSync(path))) throw Error('Cache escapes project root');
  }
  return path;
}
function readNuget(packageId: string, version: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(packageId) || !/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(version)) throw Error('NuGet provenance needs a literal package identity and version');
  const id = packageId.toLowerCase();
  try { return readFileSync(join(process.env.NUGET_PACKAGES ?? join(homedir(), '.nuget/packages'), id, version.toLowerCase(), `${id}.nuspec`), 'utf8'); }
  catch { throw Error('Restored NuGet package provenance is unavailable; restore the native consumer first'); }
}
function configuration(rootPath: string, source: string) {
  const root = realpathSync(rootPath);
  const sources = sourcesSchema.parse(JSON.parse(readFileSync(reference(root, source), 'utf8')));
  for (const item of sources.repositories) {
    safePath(item.directory);
    if (item.discoveryRef !== 'HEAD' && !item.discoveryRef.startsWith('refs/heads/') && !item.discoveryRef.startsWith('refs/tags/')) throw Error('Discovery must use HEAD or a full branch or tag ref');
    if (item.repository.startsWith('-') || item.repository.includes('\n') || !(isAbsolute(item.repository) || /^https:\/\/[^\s]+$/.test(item.repository) || /^ssh:\/\/[^\s]+$/.test(item.repository) || /^[\w.-]+@[\w.-]+:[\w./-]+$/.test(item.repository))) throw Error('Source repository must use HTTPS, SSH or an explicit absolute local path');
    if (item.repository.startsWith('https://') && new URL(item.repository).username) throw Error('Do not embed credentials in repository URLs');
  }
  const catalog = inspectCatalog(root);
  const inputs = [...new Set([source, ...catalog.capabilities.flatMap(item => item.files)])].sort();
  const provenance = catalog.capabilities.flatMap(capability => capability.dependencies.filter(dependency => typeof dependency.revision === 'object').map(dependency => {
    try { return dependencyRevision(dependency, dependencyVersion(dependency.version, file => readFileSync(reference(root, file), 'utf8')), readNuget); }
    catch (error) { return String(error); }
  }));
  const inputDigest = hash(JSON.stringify([inputs.map(file => [file, hash(readFileSync(reference(root, file)))]), provenance]));
  return { root, sources, catalog, inputDigest };
}

/** Read a snapshot without network access or imported code execution. */
export function inspectConnections(root: string, source = 'capabilities/sources.json'): ConnectionReport {
  const config = configuration(root, source);
  const path = join(config.root, cachePath);
  if (!existsSync(path)) return { connectionsVersion: 1, source, inputDigest: config.inputDigest, syncedAt: '', state: 'unresolved', freshness: 'cached', catalogs: [], edges: [], updates: [], gaps: ['No connected catalog snapshot. Run cod sync.'], conformance: 'not-evaluated' };
  const report = JSON.parse(readFileSync(reference(config.root, cachePath), 'utf8')) as ConnectionReport;
  if (report.connectionsVersion !== 1 || report.source !== source || !Array.isArray(report.catalogs) || !Array.isArray(report.edges) || !Array.isArray(report.gaps)) throw Error('Invalid connection snapshot; run cod sync');
  return { ...report, freshness: 'cached', catalogs: report.catalogs.map(catalog => ({ ...catalog, freshness: 'cached' })), ...(config.inputDigest !== report.inputDigest ? { state: 'stale' as const, gaps: [...report.gaps, 'Local contracts, native version declarations or covered files changed. Run cod sync.'] } : {}) };
}

/** Resolve metadata from Git objects. No checkout, install, indexer or provider
 * check is executed. Only explicitly configured repositories may be contacted.
 */
export function syncConnections(rootPath: string, sourceFile = 'capabilities/sources.json', options: { offline?: boolean } = {}): ConnectionReport {
  if (options.offline) return inspectConnections(rootPath, sourceFile);
  const root = realpathSync(rootPath);
  const lock = join(cacheDirectory(root, '.cod/cache'), 'connections.sync.lock');
  try { writeFileSync(lock, JSON.stringify({ pid: process.pid }) + '\n', { flag: 'wx' }); }
  catch { throw Error('A connected-catalog sync is already running, or its lock is unavailable. Inspect .cod/cache/connections.sync.lock; remove a stale lock only after its process has stopped.'); }
  try { return retrieveConnections(root, sourceFile); }
  finally { rmSync(lock); }
}

function retrieveConnections(rootPath: string, sourceFile: string): ConnectionReport {
  const config = configuration(rootPath, sourceFile);
  const { root } = config;
  const old = inspectConnections(root, sourceFile);
  const configured = new Map(config.sources.repositories.map(item => [item.repository, item]));
  const catalogs = new Map<string, Catalog>();
  const retrieval = new Map<string, Catalog | Error>();
  const resolvedRevisions = new Map<string, string>();
  function readCatalog(source: Source, ref: string): Catalog {
    const key = `${source.repository}\0${ref}`;
    const previous = retrieval.get(key);
    if (previous instanceof Error) throw previous;
    if (previous) return previous;
    try {
      const folder = cacheDirectory(root, `.cod/cache/repositories/${hash(source.repository)}`);
      if (!existsSync(join(folder, 'HEAD'))) git(folder, ['init', '--bare']);
      // Configure the promisor remote so reads lazily retrieve only needed blobs.
      git(folder, ['config', 'remote.origin.url', source.repository]);
      git(folder, ['config', 'remote.origin.promisor', 'true']);
      git(folder, ['config', 'remote.origin.partialclonefilter', 'blob:none']);
      // A bare cache never materializes source or runs repository hooks.
      try { git(folder, ['fetch', '--depth=1', '--no-tags', '--no-recurse-submodules', '--filter=blob:none', 'origin', ref]); }
      catch { throw Error('Unable to fetch configured repository/ref; access, connectivity or revision may be unavailable'); }
      const revision = git(folder, ['rev-parse', '--verify', 'FETCH_HEAD^{commit}']).trim();
      resolvedRevisions.set(key, revision);
      if (/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(ref) && revision !== ref) throw Error('Fetched revision does not match selected immutable commit');
      const tree = git(folder, ['ls-tree', '-r', '-z', revision, '--', source.directory]);
      const files = new Map(tree.split('\0').filter(Boolean).map(line => {
        const tab = line.indexOf('\t'); const [mode, kind, oid] = line.slice(0, tab).split(' ');
        return [line.slice(tab + 1), { mode, kind, oid }];
      }));
      function blob(path: string) {
        safePath(path);
        // Read the exact object: never dereference symlinks, submodules or local paths.
        const entry = files.get(path) ?? (() => {
          const line = git(folder, ['ls-tree', '-z', revision, '--', path]).replace(/\0$/, '');
          const tab = line.indexOf('\t'); const [mode, kind, oid] = line.slice(0, tab).split(' ');
          return tab >= 0 && line.slice(tab + 1) === path ? { mode, kind, oid } : undefined;
        })();
        if (!entry || entry.kind !== 'blob' || !['100644', '100755'].includes(entry.mode ?? '')) throw Error(`Missing regular metadata/input file: ${path}`);
        files.set(path, entry);
        return entry;
      }
      function read(path: string): string { return git(folder, ['cat-file', 'blob', blob(path).oid!]); }
      const paths = [...files.keys()].filter(path => path.endsWith('/capability.json')).sort();
      if (!paths.length) throw Error('No standard capability contracts in configured catalog directory');
      const capabilities = paths.map(path => {
        const contract = contractSchema.parse(JSON.parse(read(path)));
        const inputs = contractFiles(contract, path).inputs.sort();
        // Fingerprints detect covered implementation changes even when the authored
        // contract stays identical. They establish change, never conformance.
        const digest = hash(JSON.stringify(inputs.map(file => [file, blob(file).oid])));
        const dependencies = contract.dependencies.map(dependency => ({ ...dependency, resolvedVersion: dependencyVersion(dependency.version, read) }));
        return { ...contract, dependencies, contract: path, digest, files: inputs };
      });
      if (new Set(capabilities.map(item => item.id)).size !== capabilities.length) throw Error('Duplicate capability IDs in provider catalog');
      const catalog: Catalog = { repository: source.repository, revision, sourceCache: `.cod/cache/repositories/${hash(source.repository)}`, freshness: 'fetched', capabilities };
      catalogs.set(`${source.repository}\0${revision}`, catalog); retrieval.set(key, catalog);
      return catalog;
    } catch (error) {
      const failure = error instanceof Error ? error : Error(String(error)); retrieval.set(key, failure); throw failure;
    }
  }
  const edges: Edge[] = [];
  const visited = new Set<string>();
  const queue: { from: string; dependency: CapabilityDependency; selection: Edge['selection']; readVersion: (file: string) => string; version?: string }[] = [];
  for (const capability of config.catalog.capabilities) for (const dependency of capability.dependencies) {
    for (const selection of ['selected', 'latest'] as const) queue.push({ from: `local:${capability.id}`, dependency, selection, readVersion: file => readFileSync(reference(root, file), 'utf8') });
  }
  for (let index = 0; index < queue.length; index++) {
    const item = queue[index]!; const { dependency, selection, from } = item;
    const edge: Edge = { from, capability: dependency.id, repository: dependency.repository, contract: dependency.contract, version: '', selection, state: 'unresolved' };
    edges.push(edge);
    try {
      edge.version = item.version ?? dependencyVersion(dependency.version, item.readVersion);
      const source = configured.get(dependency.repository);
      if (!source) throw Error('Repository is not configured as a connected source');
      const ref = selection === 'latest' ? source.discoveryRef : dependencyRevision(dependency, edge.version, readNuget);
      if (!ref) throw Error('Selected provider has no immutable revision mapped to the native version; latest discovery is separate');
      if (selection === 'selected') edge.revision = ref;
      let catalog: Catalog;
      try { catalog = readCatalog(source, ref); }
      finally { const revision = resolvedRevisions.get(`${source.repository}\0${ref}`); if (revision) edge.revision = revision; }
      edge.revision = catalog.revision;
      const capability = catalog.capabilities.find(candidate => candidate.id === dependency.id && candidate.contract === dependency.contract);
      if (!capability) throw Error('Referenced capability ID/contract path is absent from this provider revision');
      const target = `${selection}:${dependency.repository}@${catalog.revision}:${capability.id}`;
      edge.target = target; edge.state = 'resolved';
      if (visited.has(target)) continue;
      visited.add(target);
      for (const child of capability.dependencies) queue.push({ from: target, dependency: child, selection, version: child.resolvedVersion, readVersion: () => { throw Error('Provider native versions were not resolved'); } });
    } catch (error) { edge.gap = error instanceof Error ? error.message : String(error); }
  }
  // Preserve previously retrieved metadata after failed refresh, explicitly as
  // cached information. Failed edges remain unresolved, never resolved by fallback.
  for (const catalog of old.catalogs) if (edges.some(edge => edge.repository === catalog.repository && edge.state === 'unresolved') && !catalogs.has(`${catalog.repository}\0${catalog.revision}`)) catalogs.set(`${catalog.repository}\0${catalog.revision}`, { ...catalog, freshness: 'cached' });
  function rootsFor(edge: Edge): string[] {
    const roots = new Set<string>(), seen = new Set<string>(), queue = [edge.from];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i]!; if (seen.has(node)) continue; seen.add(node);
      if (node.startsWith('local:')) roots.add(node.slice(6));
      else for (const parent of edges) if (parent.target === node) queue.push(parent.from);
    }
    return [...roots].sort();
  }
  const updates: ConnectionReport['updates'] = [];
  for (const latest of edges.filter(edge => edge.selection === 'latest' && edge.state === 'resolved')) {
    const selections = edges.filter(edge => edge.selection === 'selected' && edge.state === 'resolved' && edge.repository === latest.repository && edge.capability === latest.capability && edge.contract === latest.contract);
    for (const selected of selections) {
      const affected = rootsFor(latest).filter(root => rootsFor(selected).includes(root));
      if (!affected.length) continue;
      const get = (edge: Edge) => catalogs.get(`${edge.repository}\0${edge.revision}`)?.capabilities.find(capability => capability.id === edge.capability)?.digest;
      if (get(selected) !== get(latest)) {
        const previous = updates.find(item => item.repository === latest.repository && item.capability === latest.capability && item.selectedRevision === selected.revision && item.latestRevision === latest.revision);
        if (previous) previous.affectedConsumers = [...new Set([...previous.affectedConsumers, ...affected])].sort();
        else updates.push({ repository: latest.repository, capability: latest.capability, selectedRevision: selected.revision!, latestRevision: latest.revision!, affectedConsumers: affected });
      }
    }
  }
  const gaps = edges.filter(edge => edge.gap).map(edge => `${edge.selection} ${edge.capability}: ${edge.gap}`);
  const localChanged = configuration(root, sourceFile).inputDigest !== config.inputDigest;
  if (localChanged) gaps.push('Local inputs changed during retrieval. Run cod sync again.');
  const report: ConnectionReport = {
    connectionsVersion: 1, source: sourceFile, inputDigest: config.inputDigest, syncedAt: new Date().toISOString(),
    state: localChanged ? 'stale' : gaps.length ? 'unresolved' : 'current', freshness: 'fetched', catalogs: [...catalogs.values()], edges, updates, gaps, conformance: 'not-evaluated',
  };
  const destination = join(cacheDirectory(root, '.cod/cache'), 'connections.json');
  if (existsSync(destination) && (lstatSync(destination).isSymbolicLink() || lstatSync(destination).nlink > 1)) throw Error('Connection snapshot cannot be a link');
  const temporary = destination + '.tmp';
  if (existsSync(temporary)) throw Error('Connection snapshot is being written or temporary file needs cleanup');
  writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); renameSync(temporary, destination);
  return report;
}
