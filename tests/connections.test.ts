import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import { z } from 'zod';
import { sourcesSchema, syncConnections, inspectConnections } from '../src/connections.js';

const roots: string[] = [];
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); });
function directory() { const root = mkdtempSync(join(tmpdir(), 'cod-connected-')); roots.push(root); return root; }
function git(root: string, ...args: string[]) { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function contract(id: string, dependencies: unknown[] = []) {
  return {
    contractVersion: 1, id, profile: 'javascript-library', responsibility: `${id} policy`,
    decision: { action: 'reuse', need: 'A shared policy', considered: [{ candidate: 'owner.mjs', finding: 'Existing owner' }], rationale: 'Delegate' },
    owner: { entrypoint: 'owner.mjs', export: 'value' },
    consumers: [{ id: 'screen', entrypoint: 'consumer.mjs', export: 'run', alternatives: { wrapper: 'wrapper.mjs', copy: 'copy.mjs', unusedImport: 'decoy.mjs' } }],
    rules: { owns: ['policy'], consumerOwns: [], allowed: ['wrappers'], extend: 'Extend owner', forbidden: ['copies'] },
    requirements: { value: 1 }, dependencies, checks: { entrypoint: 'check.mjs', files: [] },
  };
}
function populate(root: string, id: string, dependencies: unknown[] = []) {
  mkdirSync(join(root, `capabilities/${id}`), { recursive: true });
  writeFileSync(join(root, `capabilities/${id}/capability.json`), JSON.stringify(contract(id, dependencies)));
  for (const file of ['owner', 'consumer', 'wrapper', 'copy', 'decoy']) writeFileSync(join(root, `${file}.mjs`), 'export const value=1;');
  writeFileSync(join(root, 'check.mjs'), "import{writeFileSync}from'node:fs';writeFileSync('EXECUTED','bad');");
}
function provider(id = 'shared') {
  const root = directory(); populate(root, id); git(root, 'init', '-b', 'main');
  git(root, 'config', 'user.name', 'Test Fixture'); git(root, 'config', 'user.email', 'fixture@example.test');
  git(root, 'add', '.'); git(root, 'commit', '-m', 'Initial capability');
  return { root, revision: git(root, 'rev-parse', 'HEAD') };
}
function consumer(p: ReturnType<typeof provider>, revision: string | undefined = p.revision) {
  const root = directory();
  populate(root, 'app', [{ id: 'shared', repository: p.root, contract: 'capabilities/shared/capability.json', version: '1.0.0', ...(revision ? { revision } : {}) }]);
  const sources = { sourcesVersion: 1, repositories: [{ repository: p.root, discoveryRef: 'refs/heads/main' }] };
  writeFileSync(join(root, 'capabilities/sources.json'), JSON.stringify(sources));
  return { root, sources };
}

it('retrieves exact and newest catalogs without checkout or executing provider checks', () => {
  const p = provider(); const c = consumer(p);
  writeFileSync(join(p.root, 'owner.mjs'), 'export const value=2;'); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Changed owner');
  const report = syncConnections(c.root);
  expect(report.state).toBe('current');
  expect(report.edges.find(edge => edge.selection === 'selected')).toMatchObject({ revision: p.revision, state: 'resolved', version: '1.0.0' });
  expect(report.edges.find(edge => edge.selection === 'latest')?.revision).toBe(git(p.root, 'rev-parse', 'HEAD'));
  expect(report.updates[0]?.affectedConsumers).toEqual(['app']);
  expect(report.catalogs[0]?.capabilities[0]?.rules.extend).toBe('Extend owner');
  expect(report.conformance).toBe('not-evaluated');
  expect(existsSync(join(p.root, 'EXECUTED'))).toBe(false);
  expect(inspectConnections(c.root).freshness).toBe('cached');
});

it('resolves native package versions and expires the snapshot when the package reference changes', () => {
  const p = provider(); const c = consumer(p);
  writeFileSync(join(c.root, 'app.csproj'), '<Project><ItemGroup><PackageReference Include="Shared.Policy" Version="1.0.0" /></ItemGroup></Project>');
  const file = join(c.root, 'capabilities/app/capability.json'); const value = JSON.parse(readFileSync(file, 'utf8'));
  value.dependencies[0].version = { file: 'app.csproj', format: 'nuget', package: 'Shared.Policy' }; writeFileSync(file, JSON.stringify(value));
  expect(syncConnections(c.root).edges[0]?.version).toBe('1.0.0');
  writeFileSync(join(c.root, 'app.csproj'), '<Project><ItemGroup><PackageReference Include="Shared.Policy" Version="2.0.0" /></ItemGroup></Project>');
  expect(inspectConnections(c.root).state).toBe('stale');
});

it('keeps discovery available but marks an unpinned selected provider unresolved', () => {
  const p = provider(); const c = consumer(p, '');
  const report = syncConnections(c.root);
  expect(report.state).toBe('unresolved');
  expect(report.edges.find(edge => edge.selection === 'selected')?.gap).toContain('immutable revision');
  expect(report.edges.find(edge => edge.selection === 'latest')?.state).toBe('resolved');
});

it('walks cyclic dependency graphs once and reports transitive consumers affected by upstream changes', () => {
  const b = provider('foundation'); const a = provider();
  const aFile = join(a.root, 'capabilities/shared/capability.json');
  writeFileSync(aFile, JSON.stringify(contract('shared', [{ id: 'foundation', repository: b.root, contract: 'capabilities/foundation/capability.json', version: '1', revision: b.revision }])));
  git(a.root, 'add', '.'); git(a.root, 'commit', '-m', 'Depend on foundation'); a.revision = git(a.root, 'rev-parse', 'HEAD');
  // A latest-only cycle is valid discovery; selected revisions remain immutable.
  writeFileSync(join(b.root, 'capabilities/foundation/capability.json'), JSON.stringify(contract('foundation', [{ id: 'shared', repository: a.root, contract: 'capabilities/shared/capability.json', version: '1', revision: a.revision }])));
  git(b.root, 'add', '.'); git(b.root, 'commit', '-m', 'Connect back to shared');
  const c = consumer(a); c.sources.repositories.push({ repository: b.root, discoveryRef: 'refs/heads/main' });
  writeFileSync(join(c.root, 'capabilities/sources.json'), JSON.stringify(c.sources));
  const result = syncConnections(c.root);
  expect(result.state).toBe('current');
  expect(result.edges.length).toBeLessThan(10);
  expect(result.updates.find(item => item.capability === 'foundation')?.affectedConsumers).toEqual(['app']);
});

it('reports missing catalogs and inaccessible providers without silently certifying old cache', () => {
  const p = provider(); const c = consumer(p); syncConnections(c.root);
  rmSync(p.root, { recursive: true });
  const failed = syncConnections(c.root);
  expect(failed.state).toBe('unresolved');
  expect(failed.edges.some(edge => edge.gap?.includes('fetch'))).toBe(true);
  expect(inspectConnections(c.root).state).toBe('unresolved');
  expect(failed.catalogs.length).toBeGreaterThan(0);
});

it('uses the cache offline and reports unapproved remote dependencies without contacting them', () => {
  const p = provider(); const c = consumer(p); syncConnections(c.root);
  rmSync(p.root, { recursive: true });
  expect(syncConnections(c.root, 'capabilities/sources.json', { offline: true }).freshness).toBe('cached');
  const file = join(c.root, 'capabilities/app/capability.json'); const data = JSON.parse(readFileSync(file, 'utf8'));
  data.dependencies[0].repository = 'ext::touch SHOULD_NOT_EXIST'; writeFileSync(file, JSON.stringify(data));
  expect(syncConnections(c.root).edges.every(edge => edge.state === 'unresolved')).toBe(true);
  expect(existsSync(join(c.root, 'SHOULD_NOT_EXIST'))).toBe(false);
});

it('rejects malformed catalogs, escaping metadata paths and duplicate source declarations', () => {
  const p = provider(); const c = consumer(p);
  c.sources.repositories.push(c.sources.repositories[0]!); writeFileSync(join(c.root, 'capabilities/sources.json'), JSON.stringify(c.sources));
  expect(() => syncConnections(c.root)).toThrow('Duplicate');
  c.sources.repositories.pop(); writeFileSync(join(c.root, 'capabilities/sources.json'), JSON.stringify(c.sources));
  const data = contract('shared'); data.owner.entrypoint = '../outside';
  writeFileSync(join(p.root, 'capabilities/shared/capability.json'), JSON.stringify(data)); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Unsafe reference');
  expect(syncConnections(c.root).edges.find(edge => edge.selection === 'latest')?.state).toBe('unresolved');
});

it('uses the actual default branch, nested source files and restored NuGet provenance together', () => {
  const p = provider();
  git(p.root, 'branch', '-m', 'master');
  const data = contract('shared'); data.owner.entrypoint = 'src/policy.mjs';
  mkdirSync(join(p.root, 'src')); writeFileSync(join(p.root, 'src/policy.mjs'), 'export const value=1;');
  writeFileSync(join(p.root, 'capabilities/shared/capability.json'), JSON.stringify(data));
  git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Nested owner'); p.revision = git(p.root, 'rev-parse', 'HEAD');
  const c = consumer(p); const native = join(c.root, 'native-packages/shared.policy/1.0.0'); mkdirSync(native, { recursive: true });
  vi.stubEnv('NUGET_PACKAGES', join(c.root, 'native-packages'));
  writeFileSync(join(native, 'shared.policy.nuspec'), `<package><metadata><id>Shared.Policy</id><version>1.0.0</version><repository type="git" url="${p.root}" commit="${p.revision}" /></metadata></package>`);
  writeFileSync(join(c.root, 'app.csproj'), '<Project><PackageReference Include="Shared.Policy" Version="1.0.0" /></Project>');
  const local = contract('app', [{ id: 'shared', repository: p.root, contract: 'capabilities/shared/capability.json', version: { file: 'app.csproj', format: 'nuget', package: 'Shared.Policy' }, revision: { format: 'nuget' } }]);
  writeFileSync(join(c.root, 'capabilities/app/capability.json'), JSON.stringify(local));
  writeFileSync(join(c.root, 'capabilities/sources.json'), JSON.stringify({ sourcesVersion: 1, repositories: [{ repository: p.root }] }));
  const result = syncConnections(c.root);
  expect(result.state).toBe('current');
  expect(result.edges.every(edge => edge.revision === p.revision)).toBe(true);
  expect(result.catalogs[0]?.capabilities[0]?.files).toContain('src/policy.mjs');
  expect(existsSync(join(c.root, 'EXECUTED'))).toBe(false);
});

it('keeps different selected revisions and their affected consumers separate', () => {
  const p = provider(); const c = consumer(p);
  writeFileSync(join(p.root, 'owner.mjs'), 'export const value=2;'); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Second policy');
  const secondRevision = git(p.root, 'rev-parse', 'HEAD');
  populate(c.root, 'other', [{ id: 'shared', repository: p.root, contract: 'capabilities/shared/capability.json', version: '2', revision: secondRevision }]);
  let report = syncConnections(c.root);
  expect(report.updates).toHaveLength(1); expect(report.updates[0]?.affectedConsumers).toEqual(['app']);
  writeFileSync(join(p.root, 'owner.mjs'), 'export const value=3;'); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Third policy');
  report = syncConnections(c.root);
  expect(report.updates).toHaveLength(2);
  expect(report.updates.find(update => update.selectedRevision === secondRevision)?.affectedConsumers).toEqual(['other']);
  expect(report.catalogs).toHaveLength(3);
});

it('exposes sync and offline inspection through the CLI and publishes the matching source schema', async () => {
  expect(JSON.parse(readFileSync('schemas/sources.schema.json', 'utf8'))).toEqual(z.toJSONSchema(sourcesSchema, { io: 'input' }));
  const p = provider(); const c = consumer(p); const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  expect(await runCli(['sync', c.root, '--json'])).toBe(0);
  expect(JSON.parse(String(output.mock.calls.at(-1)?.[0])).edges.length).toBe(2);
  expect(await runCli(['connections', c.root])).toBe(0);
  expect(await runCli(['sync', c.root, '--offline'])).toBe(0);
  expect(output.mock.calls.some(call => String(call[0]).includes('cached'))).toBe(true);
  rmSync(p.root, { recursive: true });
  expect(await runCli(['sync', c.root, '--report-only', '--json'])).toBe(0);
  expect(JSON.parse(String(output.mock.calls.at(-1)?.[0])).state).toBe('unresolved');
  expect(await runCli(['sync', c.root, '--json'])).toBe(2);
  const errors = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  expect(await runCli(['connections', c.root, '--unknown'])).toBe(2);
  expect(errors).toHaveBeenCalled();
});

it('detects changed binary covered inputs without decoding them as text', () => {
  const p = provider();
  const data = contract('shared') as ReturnType<typeof contract> & { owner: { files?: string[] } };
  data.owner.files = ['policy.bin'];
  writeFileSync(join(p.root, 'policy.bin'), Buffer.from([255]));
  writeFileSync(join(p.root, 'capabilities/shared/capability.json'), JSON.stringify(data));
  git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Binary contract input'); p.revision = git(p.root, 'rev-parse', 'HEAD');
  const c = consumer(p);
  writeFileSync(join(p.root, 'policy.bin'), Buffer.from([254])); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'Different binary policy');
  expect(syncConnections(c.root).updates[0]?.affectedConsumers).toEqual(['app']);
});

it('refuses an overlapping refresh before touching shared Git state and releases its lock after completion', () => {
  const p = provider(); const c = consumer(p); const cache = join(c.root, '.cod/cache');
  mkdirSync(cache, { recursive: true });
  const lock = join(cache, 'connections.sync.lock'); writeFileSync(lock, JSON.stringify({ pid: process.pid }));
  expect(() => syncConnections(c.root)).toThrow('already running');
  expect(existsSync(join(cache, 'repositories'))).toBe(false);
  rmSync(lock);
  expect(syncConnections(c.root).state).toBe('current');
  expect(existsSync(lock)).toBe(false);
});

it('rebuilds damaged or differently scoped snapshots without manual cache deletion', () => {
  const p = provider(); const c = consumer(p); syncConnections(c.root);
  const snapshot = join(c.root, '.cod/cache/connections.json');
  writeFileSync(snapshot, '{unfinished');
  expect(() => inspectConnections(c.root)).toThrow();
  expect(syncConnections(c.root).state).toBe('current');
  const report = JSON.parse(readFileSync(snapshot, 'utf8')); report.connectionsVersion = 999; writeFileSync(snapshot, JSON.stringify(report));
  expect(syncConnections(c.root).state).toBe('current');
  writeFileSync(join(c.root, 'capabilities/alternate-sources.json'), JSON.stringify(c.sources));
  expect(syncConnections(c.root, 'capabilities/alternate-sources.json').source).toBe('capabilities/alternate-sources.json');
  writeFileSync(join(c.root, 'capabilities/alternate-sources.json'), '{invalid');
  expect(() => syncConnections(c.root, 'capabilities/alternate-sources.json')).toThrow();
});

it('clears an interrupted temporary snapshot under the exclusive lock without following links', () => {
  const p = provider(); const c = consumer(p); syncConnections(c.root);
  const temporary = join(c.root, '.cod/cache/connections.json.tmp'); writeFileSync(temporary, '{unfinished');
  expect(syncConnections(c.root).state).toBe('current'); expect(existsSync(temporary)).toBe(false);
  const target = join(p.root, 'must-not-change.txt'); writeFileSync(target, 'unchanged');
  symlinkSync(target, temporary);
  expect(syncConnections(c.root).state).toBe('current');
  expect(readFileSync(target, 'utf8')).toBe('unchanged');
  expect(existsSync(temporary)).toBe(false);
});
