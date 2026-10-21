import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { inspectChangeBindings, verifyChangeBindings, type ChangeReview } from '../src/change-bindings.js';
import { runCli } from '../src/cli.js';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-change-bindings-')); roots.push(root);
  for (const [file, source] of Object.entries({ 'contract.md': 'Owner owns the rule. Consumers delegate.', 'owner.ts': 'export const rule = () => 1;', 'consumer.ts': 'export {rule} from "./owner.js";', 'second.ts': 'export {rule} from "./owner.js";' })) writeFileSync(join(root, file), source);
  const definition = { bindingVersion: 1, id: 'rule', contractInputs: ['contract.md'], implementations: [{ id: 'owner', role: 'provider', inputs: ['owner.ts'] }, { id: 'first', role: 'consumer', inputs: ['consumer.ts'] }, { id: 'second', role: 'consumer', inputs: ['second.ts'] }] };
  const current = inspectChangeBindings(root, definition);
  const review: ChangeReview = { reviewVersion: 1, id: current.id, definitionDigest: current.definitionDigest, bindings: Object.fromEntries(current.implementations.map(item => [item.id, { contractDigest: current.contractDigest, implementationDigest: item.implementationDigest, rationale: 'Reviewed current requirements and consumer delegation.' }])) };
  return { root, definition, review };
}
it('keeps inspection read-only and accepts exact reviewed identities', () => {
  const f = fixture(), before = readFileSync(join(f.root, 'contract.md'), 'utf8');
  expect(verifyChangeBindings(f.root, f.definition, f.review).state).toBe('current');
  expect(readFileSync(join(f.root, 'contract.md'), 'utf8')).toBe(before);
});
it('invalidates every affected implementation on a contract-only change', () => {
  const f = fixture(); writeFileSync(join(f.root, 'contract.md'), 'The rule has changed.');
  expect(verifyChangeBindings(f.root, f.definition, f.review).findings.filter(item => item.code === 'contract-changed').map(item => item.id)).toEqual(['owner', 'first', 'second']);
  const current = inspectChangeBindings(f.root, f.definition);
  f.review.bindings.owner!.contractDigest = current.contractDigest;
  f.review.bindings.first!.contractDigest = current.contractDigest;
  expect(verifyChangeBindings(f.root, f.definition, f.review).findings.map(item => item.id)).toEqual(['second']);
});
it.each(['owner.ts', 'consumer.ts'])('requires contract review after %s changes with compatible exports', file => {
  const f = fixture(); writeFileSync(join(f.root, file), readFileSync(join(f.root, file), 'utf8') + '\n// Refactor without an interface change');
  expect(verifyChangeBindings(f.root, f.definition, f.review).findings).toContainEqual(expect.objectContaining({ code: 'implementation-changed' }));
});
it('permits explicit unchanged-contract reaffirmation without modifying other consumers', () => {
  const f = fixture(); writeFileSync(join(f.root, 'owner.ts'), 'export const rule = () => { return 1; };');
  const current = inspectChangeBindings(f.root, f.definition);
  f.review.bindings.owner = { contractDigest: current.contractDigest, implementationDigest: current.implementations[0]!.implementationDigest, rationale: 'Internal refactor: same requirement, native behavior and propagation checks rerun.' };
  expect(verifyChangeBindings(f.root, f.definition, f.review).state).toBe('current');
});
it('does not accept missing, extra, wrong-responsibility or changed-scope bindings', () => {
  const f = fixture(); delete f.review.bindings.first;
  f.review.bindings.ghost = f.review.bindings.owner!; f.review.id = 'other';
  f.definition.implementations.pop();
  const result = verifyChangeBindings(f.root, f.definition, f.review);
  expect(new Set(result.findings.map(item => item.code))).toEqual(new Set(['wrong-contract', 'scope-changed', 'missing-review', 'unknown-review']));
});
it('rejects empty explanations, duplicate IDs, duplicate paths and missing consumer/provider coverage', () => {
  const f = fixture(); f.review.bindings.first!.rationale = ' ';
  expect(() => verifyChangeBindings(f.root, f.definition, f.review)).toThrow();
  expect(() => inspectChangeBindings(f.root, { ...f.definition, implementations: [...f.definition.implementations, f.definition.implementations[0]] })).toThrow();
  expect(() => inspectChangeBindings(f.root, { ...f.definition, contractInputs: ['contract.md', 'contract.md'] })).toThrow();
  expect(() => inspectChangeBindings(f.root, { ...f.definition, implementations: f.definition.implementations.slice(1) })).toThrow();
});
it('rejects escaped, missing, non-file and external symlink inputs', () => {
  const f = fixture(), outside = fixture(); symlinkSync(join(outside.root, 'owner.ts'), join(f.root, 'escape.ts'));
  for (const path of ['../outside', '/etc/hosts', 'missing.ts', '.', 'escape.ts']) expect(() => inspectChangeBindings(f.root, { ...f.definition, contractInputs: [path] })).toThrow();
});
it('the actual CLI fails stale reviews and reports missing evidence as unresolved', async () => {
  const f = fixture(); writeFileSync(join(f.root, 'definition.json'), JSON.stringify(f.definition)); writeFileSync(join(f.root, 'review.json'), JSON.stringify(f.review));
  expect(await runCli(['verify-bindings', f.root, 'definition.json', 'review.json'])).toBe(0);
  writeFileSync(join(f.root, 'owner.ts'), 'export const rule = () => 2;');
  expect(await runCli(['verify-bindings', f.root, 'definition.json', 'review.json'])).toBe(1);
  expect(await runCli(['verify-bindings', f.root, 'definition.json', 'missing.json'])).toBe(2);
});

it('accepts a compact shared contract identity and rejects drift in either direction', () => {
  const f = fixture();
  const compact = { reviewVersion: 2, id: f.review.id, definitionDigest: f.review.definitionDigest,
    contractDigest: f.review.bindings.owner!.contractDigest,
    implementations: Object.fromEntries(Object.entries(f.review.bindings).map(([id, binding]) => [id, binding.implementationDigest])),
    rationale: 'Reviewed this responsibility and all declared consumers; behavior remains independently required.' };
  expect(verifyChangeBindings(f.root, f.definition, compact).state).toBe('current');
  writeFileSync(join(f.root, 'consumer.ts'), 'export const rule = () => 99;');
  expect(verifyChangeBindings(f.root, f.definition, compact).findings.map(item => item.id)).toEqual(['first']);
  const unchanged = [compact.implementations.owner, compact.implementations.second];
  compact.implementations.first = inspectChangeBindings(f.root, f.definition).implementations.find(item => item.id === 'first')!.implementationDigest;
  expect(verifyChangeBindings(f.root, f.definition, compact).state).toBe('current');
  expect([compact.implementations.owner, compact.implementations.second]).toEqual(unchanged);
  writeFileSync(join(f.root, 'contract.md'), 'Changed requirement.');
  expect(verifyChangeBindings(f.root, f.definition, compact).findings.filter(item => item.code === 'contract-changed')).toHaveLength(3);
});
it('compact reviews cannot omit consumers, change scope or omit the review explanation', () => {
  const f = fixture();
  const compact = { reviewVersion: 2, id: f.review.id, definitionDigest: f.review.definitionDigest,
    contractDigest: f.review.bindings.owner!.contractDigest,
    implementations: { owner: f.review.bindings.owner!.implementationDigest }, rationale: 'Explicit scoped review.' };
  expect(verifyChangeBindings(f.root, f.definition, compact).findings.filter(item => item.code === 'missing-review')).toHaveLength(2);
  expect(() => verifyChangeBindings(f.root, f.definition, { ...compact, rationale: ' ' })).toThrow();
  compact.definitionDigest = '0'.repeat(64);
  expect(verifyChangeBindings(f.root, f.definition, compact).findings.some(item => item.code === 'scope-changed')).toBe(true);
});
