import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { importScipIndexes, inspectScipMap, refreshScipMap, scipMappingSchema } from '../src/scip.js';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const policy = 'scip-dotnet nuget sample 1 Policy#Allows().';
const screen = 'scip-typescript npm sample 1 screen.ts/show().';
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-scip-test-')); roots.push(root);
  execFileSync('git', ['init', '-q'], { cwd: root });
  writeFileSync(join(root, '.gitignore'), '.cache/\n');
  for (const file of ['Policy.cs', 'Consumer.cs', 'screen.ts', 'wrapper.ts', 'contract.md', 'tsconfig.json']) writeFileSync(join(root, file), 'source\n');
  const document = (file: string, symbol: string, definition: boolean) => ({ relative_path: file, language: file.endsWith('.cs') ? 'CSharp' : 'TypeScript', position_encoding: 2, occurrences: [{ symbol, range: [0, 0, 3], symbol_roles: definition ? 1 : 0 }] });
  const index = { metadata: { project_root: pathToFileURL(root).href, tool_info: { name: 'test-producer', version: '1' } }, documents: [document('Policy.cs', policy, true), document('Consumer.cs', policy, false), document('screen.ts', screen, true), document('wrapper.ts', screen, false)] };
  const emit = `import {writeFileSync} from 'node:fs';writeFileSync(process.argv[2],${JSON.stringify(JSON.stringify(index))});`;
  writeFileSync(join(root, 'produce.mjs'), emit);
  const mapping = { scipMappingVersion: 1 as const, producers: [{ command: process.execPath, args: ['produce.mjs', '{output}'] }], capabilities: [{ id: 'eligibility', contract: 'contract.md', symbols: [policy] }, { id: 'presentation', contract: 'contract.md', symbols: [screen] }] };
  return { root, mapping, index };
}
async function capture() {
  const f = fixture();
  const result = await refreshScipMap(f.root, f.mapping, '.cache/map.json', { allowExecution: true });
  expect(result.state).toBe('mapped');
  return { ...f, snapshot: JSON.parse(readFileSync(join(f.root, '.cache/map.json'), 'utf8')) };
}
it('runs a producer with a fresh output, preserves both language symbol identities and binds actual definitions/references', async () => {
  const f = await capture(), report = inspectScipMap(f.root, f.snapshot);
  expect(report.state).toBe('current');
  expect(report.capabilities[0]?.definitions[0]?.file).toBe('Policy.cs');
  expect(report.capabilities[0]?.consumers).toEqual(['Consumer.cs']);
  expect(report.capabilities[1]?.consumers).toEqual(['wrapper.ts']);
  expect(readFileSync(join(f.root, 'contract.md'), 'utf8')).toBe('source\n');
  expect(report.producers[0]?.name).toBe('test-producer');
  expect(report).not.toHaveProperty('unresolvedReferences');
  const queried = inspectScipMap(f.root, f.snapshot, { symbol: 'Policy#' });
  expect(queried.matchingDefinitions?.[policy]?.[0]?.file).toBe('Policy.cs');
  expect(queried.matchingReferences?.[0]?.file).toBe('Consumer.cs');
});
it('invalidates changed owner source and follows reverse references to an unchanged consumer without claiming all capabilities changed', async () => {
  const f = await capture(); writeFileSync(join(f.root, 'Policy.cs'), 'changed\n');
  const report = inspectScipMap(f.root, f.snapshot);
  expect(report.state).toBe('stale'); expect(report.changedFiles).toEqual(['Policy.cs']);
  expect(report.affectedFiles).toEqual(['Consumer.cs', 'Policy.cs']);
  expect(report.capabilities.map(c => c.needsReconciliation)).toEqual([true, false]);
});
it('invalidates conservatively for configuration, new files and tracked deletions', async () => {
  const f = await capture(); writeFileSync(join(f.root, 'new.ts'), 'new');
  expect(inspectScipMap(f.root, f.snapshot).capabilities.every(c => c.needsReconciliation)).toBe(true);
  unlinkSync(join(f.root, 'new.ts')); writeFileSync(join(f.root, 'tsconfig.json'), 'changed');
  expect(inspectScipMap(f.root, f.snapshot).unknownScope).toBe(true);
  unlinkSync(join(f.root, 'Policy.cs'));
  expect(inspectScipMap(f.root, f.snapshot).changedFiles).toContain('Policy.cs');
});
it('does not merge document-local symbols or pretend unresolved external symbols have local owners', () => {
  const f = fixture();
  f.index.documents[0]!.occurrences = [{ symbol: 'local 0', range: [0, 0, 3], symbol_roles: 1 }];
  f.index.documents[1]!.occurrences = [{ symbol: 'local 0', range: [0, 0, 3], symbol_roles: 0 }];
  const graph = importScipIndexes(f.root, [f.index]);
  expect(graph.references.find(r => r.file === 'Consumer.cs')?.definitions).toEqual([]);
  expect(graph.definitions[JSON.stringify(['Policy.cs', 'local 0'])]).toHaveLength(1);
  expect(() => scipMappingSchema.parse({ ...f.mapping, capabilities: [{ id: 'bad', contract: 'contract.md', symbols: ['local 0'] }] })).toThrow();
});
it('retains the previous map when generation fails, emits no output, or changes source while running', async () => {
  const f = await capture(), before = readFileSync(join(f.root, '.cache/map.json'));
  for (const producer of ['process.exit(1)', 'process.exit(0)', `import {writeFileSync} from 'node:fs';writeFileSync('Policy.cs','changed');`]) {
    writeFileSync(join(f.root, 'produce.mjs'), producer);
    try {
      const report = await refreshScipMap(f.root, f.mapping, '.cache/map.json', { allowExecution: true });
      expect(report.state).toBe('unresolved');
    } catch (error) { expect(String(error)).toContain('ENOENT'); }
    expect(readFileSync(join(f.root, '.cache/map.json'))).toEqual(before);
  }
});
it('rejects stale embedded text, duplicate documents, unsafe paths, wrong roots and symlinked documents', () => {
  const f = fixture();
  const change = (document: object) => ({ ...f.index, documents: [{ ...f.index.documents[0], ...document }] });
  expect(() => importScipIndexes(f.root, [change({ text: 'stale' })])).toThrow('Indexed text');
  expect(() => importScipIndexes(f.root, [{ ...f.index, documents: [f.index.documents[0], f.index.documents[0]] }])).toThrow('Duplicate');
  for (const path of ['../Policy.cs', '/Policy.cs', 'a/../Policy.cs', 'a\\Policy.cs']) expect(() => importScipIndexes(f.root, [change({ relative_path: path })])).toThrow();
  expect(() => importScipIndexes(f.root, [{ ...f.index, metadata: { ...f.index.metadata, project_root: 'file:///tmp' } }])).toThrow('outside');
  symlinkSync(join(f.root, 'Policy.cs'), join(f.root, 'alias.cs'));
  expect(() => importScipIndexes(f.root, [change({ relative_path: 'alias.cs' })])).toThrow('symlinks');
});
it('requires authorization, fresh producer output arguments and an ignored untracked cache destination', async () => {
  const f = fixture();
  await expect(refreshScipMap(f.root, f.mapping, '.cache/map.json', { allowExecution: false })).rejects.toThrow('authorization');
  await expect(refreshScipMap(f.root, f.mapping, 'contract.md', { allowExecution: true })).rejects.toThrow();
  expect(() => scipMappingSchema.parse({ ...f.mapping, producers: [{ command: 'echo', args: ['old.json'] }] })).toThrow('fresh');
});

it('captures explicitly declared generated inputs and keeps omitted generated documents unresolved', async () => {
  const f = fixture();
  writeFileSync(join(f.root, '.gitignore'), '.cache/\nGenerated.cs\n');
  writeFileSync(join(f.root, 'Generated.cs'), 'generated');
  f.index.documents[0]!.relative_path = 'Generated.cs';
  writeFileSync(join(f.root, 'produce.mjs'), `import {writeFileSync} from 'node:fs';writeFileSync(process.argv[2],${JSON.stringify(JSON.stringify(f.index))});`);
  const omitted = await refreshScipMap(f.root, f.mapping, '.cache/map.json', { allowExecution: true });
  expect(omitted.state).toBe('unresolved');
  const included = await refreshScipMap(f.root, { ...f.mapping, additionalInputs: ['Generated.cs'] }, '.cache/map.json', { allowExecution: true });
  expect(included.state).toBe('mapped');
  const snapshot = JSON.parse(readFileSync(join(f.root, '.cache/map.json'), 'utf8'));
  expect(inspectScipMap(f.root, snapshot).state).toBe('current');
  writeFileSync(join(f.root, 'Generated.cs'), 'changed');
  expect(inspectScipMap(f.root, snapshot).changedFiles).toEqual(['Generated.cs']);
});

it('rejects broken source symlinks rather than recording them as deleted files', async () => {
  const f = fixture();
  symlinkSync('missing.cs', join(f.root, 'broken.cs'));
  await expect(refreshScipMap(f.root, f.mapping, '.cache/map.json', { allowExecution: true })).rejects.toThrow('Unsupported source entry');
});
