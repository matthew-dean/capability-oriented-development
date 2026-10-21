import { mkdtempSync, mkdirSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { buildIndex, discover, parseCapability, parseIndex, reconcile } from '../src/index.js';

const dirs: string[] = [];
function fixture(source = 'export function work(value: string): string { return value; }') {
  const root = mkdtempSync(join(tmpdir(), 'cod-test-')); dirs.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(join(root, 'a.ts'), source);
  const manifest = { schemaVersion: 1, id: 'test.work', intent: 'Process work values', owner: 'team', status: 'experimental', operations: [{ name: 'work', file: './a.ts', export: 'work' }] };
  writeFileSync(join(root, 'a.capability.json'), JSON.stringify(manifest));
  return { root, manifest, save: (value: unknown) => writeFileSync(join(root, 'a.capability.json'), JSON.stringify(value)) };
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const codes = (root: string) => buildIndex(root).diagnostics.map(e => e.code);

describe('schema and graph', () => {
  it('preserves v1 input and normalizes omitted lists without mutating input', () => {
    const { manifest } = fixture(); const parsed = parseCapability(manifest);
    expect(parsed.capability?.requires).toEqual([]); expect(manifest).not.toHaveProperty('requires');
  });
  it.each([null, 3, [], { schemaVersion: 2 }, { schemaVersion: 1, operations: 'bad' }])('rejects malformed input %j without crashing', input => expect(parseCapability(input).capability).toBeNull());
  it('rejects unknown fields, blank metadata and duplicate dependencies', () => {
    const { manifest } = fixture();
    for (const extra of [{ owner: ' ' }, { surprise: true }, { requires: ['test.a', 'test.a'] }]) expect(parseCapability({ ...manifest, ...extra }).capability).toBeNull();
  });
  it('reports invalid JSON alongside a valid graph', () => { const { root } = fixture(); writeFileSync(join(root, 'bad.capability.json'), '{'); expect(codes(root)).toContain('INVALID_JSON'); });
  it('detects duplicate IDs and operation names', () => {
    const { root, manifest, save } = fixture(); writeFileSync(join(root, 'b.capability.json'), JSON.stringify(manifest));
    save({ ...manifest, operations: [...manifest.operations, ...manifest.operations] });
    expect(codes(root)).toEqual(expect.arrayContaining(['DUPLICATE_ID', 'DUPLICATE_OPERATION', 'DUPLICATE_BINDING']));
  });
  it('detects missing dependencies and cycles', () => {
    const { root, manifest, save } = fixture(); save({ ...manifest, requires: ['test.missing'] }); expect(codes(root)).toContain('MISSING_DEPENDENCY');
    save({ ...manifest, requires: ['test.work'] }); expect(codes(root)).toContain('DEPENDENCY_CYCLE');
  });
  it('requires stable evidence and rejects missing evidence', () => {
    const { root, manifest, save } = fixture(); save({ ...manifest, status: 'stable', tests: ['missing.ts'] });
    expect(codes(root)).toEqual(expect.arrayContaining(['INSUFFICIENT_EVIDENCE', 'INVALID_EVIDENCE']));
  });
  it('rejects absolute paths, traversal, directories and physical symlink escapes', () => {
    const { root, manifest, save } = fixture(), outside = fixture(); mkdirSync(join(root, 'dir'));
    symlinkSync(join(outside.root, 'a.ts'), join(root, 'escape.ts'));
    for (const file of ['../a.ts', join(outside.root, 'a.ts'), './escape.ts', './dir']) {
      save({ ...manifest, operations: [{ name: 'work', file, export: 'work' }] }); expect(codes(root)).toContain('INVALID_REFERENCE');
    }
  });
});
describe('compiler resolution and freshness', () => {
  it('resolves direct, default, star, named aliases and destructured exports', () => {
    const { root, manifest, save } = fixture('export default function work(v: string) { return v; }\nexport const { other } = { other: 2 };');
    writeFileSync(join(root, 'barrel.ts'), "export { default as aliased } from './a.js'; export * from './a.js';");
    save({ ...manifest, operations: [{ name: 'work', file: './barrel.ts', export: 'aliased' }, { name: 'other', file: './barrel.ts', export: 'other' }] });
    const index = buildIndex(root); expect(index.ok).toBe(true); expect(index.capabilities[0]?.operations[0]?.signature).toContain('string');
    expect(index.capabilities[0]?.operations[0]?.declaration).toBe('a.ts');
  });
  it('rejects fake aliases and missing exports', () => {
    const { root, manifest, save } = fixture(); writeFileSync(join(root, 'barrel.ts'), "export { absent as work } from './a.js';");
    save({ ...manifest, operations: [{ name: 'work', file: './barrel.ts', export: 'work' }] });
    expect(codes(root)).toEqual(expect.arrayContaining(['TYPE_ERROR', 'UNRESOLVED_EXPORT', 'MISSING_EXPORT']));
  });
  it('reports full type errors', () => { const { root } = fixture('export const work: string = 12;'); expect(buildIndex(root).ok).toBe(false); expect(codes(root)).toContain('TYPE_ERROR'); });
  it('detects competing owners through barrel aliases', () => {
    const { root, manifest } = fixture(); writeFileSync(join(root, 'barrel.ts'), "export { work as aliased } from './a.js';");
    writeFileSync(join(root, 'b.capability.json'), JSON.stringify({ ...manifest, id: 'test.other', operations: [{ name: 'alias', file: './barrel.ts', export: 'aliased' }] }));
    expect(codes(root)).toContain('CONFLICTING_OWNERSHIP');
  });
  it('does not conflate symbols on the same source line', () => {
    const { root, manifest } = fixture('export const work = 1, other = 2;');
    writeFileSync(join(root, 'b.capability.json'), JSON.stringify({ ...manifest, id: 'test.other', operations: [{ name: 'other', file: './a.ts', export: 'other' }] })); expect(codes(root)).not.toContain('CONFLICTING_OWNERSHIP');
  });
  it('includes source content changes in a deterministic digest', () => {
    const { root } = fixture(); const before = buildIndex(root); expect(buildIndex(root).digest).toBe(before.digest);
    expect(parseIndex(JSON.parse(JSON.stringify(before))).digest).toBe(before.digest);
    writeFileSync(join(root, 'a.ts'), 'export function work(value: string): string { return value.toUpperCase(); }');
    expect(buildIndex(root).digest).not.toBe(before.digest);
    expect(() => parseIndex({ ...before, digest: '0'.repeat(64) })).toThrow('digest');
  });
  it('fingerprints inherited compiler configuration even when signatures do not change', () => {
    const { root } = fixture();
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({ extends: './base.json', compilerOptions: { target: 'ES2023', module: 'NodeNext', moduleResolution: 'NodeNext', types: [] } }));
    writeFileSync(join(root, 'base.json'), JSON.stringify({ compilerOptions: { strict: true } }));
    const before = buildIndex(root); expect(before.files).toHaveProperty('base.json');
    writeFileSync(join(root, 'base.json'), JSON.stringify({ compilerOptions: { strict: true, skipLibCheck: true } }));
    expect(buildIndex(root).digest).not.toBe(before.digest);
  });
  it('fingerprints transitive source and reports outside-root imports', () => {
    const { root } = fixture("import { helper } from './helper.js'; export function work(value: string) { return helper(value); }");
    writeFileSync(join(root, 'helper.ts'), 'export const helper = (v: string) => v;'); const before = buildIndex(root);
    writeFileSync(join(root, 'helper.ts'), 'export const helper = (v: string) => v.trim();'); expect(buildIndex(root).digest).not.toBe(before.digest);
    expect(before.files).toHaveProperty('helper.ts');
    const outside = fixture('export const helper = (v: string) => v;');
    writeFileSync(join(root, 'a.ts'), `import { helper } from '${relative(root, join(outside.root, 'a.js'))}'; export const work = helper;`);
    expect(codes(root)).toContain('SOURCE_OUTSIDE_ROOT');
  });
});
describe('discovery and reconciliation', () => {
  it('ranks lexical tokens, filters domain, and labels contract uncertainty', () => {
    const { root } = fixture(); const index = buildIndex(root), result = discover(index, { intent: 'work', domain: 'test' });
    expect(result.results[0]?.id).toBe('test.work'); expect(result.results[0]?.contractFit).toBe('unknown');
    expect(discover(index, { intent: 'work', domain: 'ui' }).results).toEqual([]); expect(discover(index, { intent: 'work', limit: 0 }).results).toEqual([]);
  });
  it('reports breaking surface changes, removed owners, and reverse dependencies', () => {
    const { root, manifest } = fixture(); writeFileSync(join(root, 'b.capability.json'), JSON.stringify({ ...manifest, id: 'test.consumer', requires: ['test.work'], operations: [{ name: 'other', file: './b.ts', export: 'other' }] }));
    writeFileSync(join(root, 'b.ts'), 'export const other = 3;'); const before = buildIndex(root);
    writeFileSync(join(root, 'a.ts'), 'export function work(value: number): number { return value; }'); const result = reconcile(before, buildIndex(root));
    expect(result.changes).toContainEqual(expect.objectContaining({ kind: 'signature-changed', review: 'potentially-breaking' }));
    expect(result.affectedCapabilities).toEqual(['test.consumer', 'test.work']); expect(result.verification.testsExecuted).toBe(false);
    rmSync(join(root, 'a.capability.json')); expect(reconcile(before, buildIndex(root)).changes).toContainEqual(expect.objectContaining({ kind: 'removed-capability' }));
  });
  it('identifies new unowned exports and conservative source invalidation', () => {
    const { root } = fixture(), before = buildIndex(root); writeFileSync(join(root, 'new.ts'), 'export function orphan() {}');
    const result = reconcile(before, buildIndex(root)); expect(result.unownedExports.some(e => e.export === 'orphan')).toBe(true); expect(result.affectedCapabilities).toContain('test.work'); expect(result.reviewRequired).toBe(true);
  });
  it('routes non-TypeScript contract changes to owners, dependents and their tests', () => {
    const { root, manifest, save } = fixture(); mkdirSync(join(root, 'feature'));
    writeFileSync(join(root, 'contract.html'), '<button>Before</button>');
    writeFileSync(join(root, 'owner.test.mjs'), '// Owner visual-state tests');
    writeFileSync(join(root, 'feature/consumer.test.mjs'), '// Integration tests');
    save({ ...manifest, examples: ['./contract.html'], tests: ['./owner.test.mjs'] });
    writeFileSync(join(root, 'feature/b.ts'), 'export const other = 3;');
    writeFileSync(join(root, 'feature/b.capability.json'), JSON.stringify({ ...manifest, id: 'test.consumer', requires: ['test.work'], operations: [{name:'other', file:'./b.ts', export:'other'}], tests: ['./consumer.test.mjs'] }));
    const before = buildIndex(root); expect(before.ok).toBe(true);
    writeFileSync(join(root, 'contract.html'), '<button disabled>After</button>');
    const result = reconcile(before, buildIndex(root));
    expect(result.changedFiles).toEqual(['contract.html']);
    expect(result.changes).toContainEqual({capability:'test.work',kind:'evidence-changed',operation:null,review:'semantic-review'});
    expect(result.affectedCapabilities).toEqual(['test.consumer','test.work']);
    expect(result.recommendedTests).toEqual(expect.arrayContaining(['owner.test.mjs','feature/consumer.test.mjs']));
    expect(result.reviewRequired).toBe(true); expect(result.verification.testsExecuted).toBe(false);
    const stable = buildIndex(root); writeFileSync(join(root, 'owner.test.mjs'), '// Changed evidence');
    expect(reconcile(stable, buildIndex(root)).affectedCapabilities).toEqual(['test.consumer','test.work']);
  });
  it('returns a no-change report without claiming tests or semantics', () => { const { root } = fixture(), index = buildIndex(root), result = reconcile(index, index); expect(result.changedFiles).toEqual([]); expect(result.changes).toEqual([]); expect(result.verification.semanticCompatibility).toBe('unknown'); });
});
describe('CLI process behavior', () => {
  it('returns JSON and distinct success, findings and usage exits', () => {
    const { root } = fixture(); const cli = resolve('dist/cli.js');
    const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    expect(run('check', root).status).toBe(0); expect(JSON.parse(run('discover', root, 'work').stdout).results).toHaveLength(1);
    writeFileSync(join(root, 'a.ts'), 'export const absent = 1;'); expect(run('check', root).status).toBe(1); expect(run('nope', root).status).toBe(2);
    expect(run('discover', root).status).toBe(2); expect(run('check', join(root, 'missing')).status).toBe(2);
  });
  it('checks the inherited samples with the portable compiler', () => { const index = buildIndex(resolve('examples')); expect(index.ok, JSON.stringify(index.diagnostics)).toBe(true); expect(index.capabilities).toHaveLength(2); });
});
