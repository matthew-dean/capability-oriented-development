import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { runCli } from '../src/cli.js';
import { recordContractReview } from '../src/contracts.js';

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-catalog-'));
  roots.push(root);
  mkdirSync(join(root, 'capabilities/word'), { recursive: true });
  writeFileSync(join(root, 'owner.mjs'), 'export const value=()=>"shared";');
  writeFileSync(join(root, 'consumer.mjs'), 'import {value} from "./owner.mjs"; export const run=()=>value();');
  writeFileSync(join(root, 'wrapper.mjs'), 'import {value} from "./owner.mjs"; const wrapped=()=>value(); export const run=wrapped;');
  writeFileSync(join(root, 'copy.mjs'), 'export const run=()=>"shared";');
  writeFileSync(join(root, 'decoy.mjs'), 'import {value} from "./owner.mjs"; export const run=()=>{value(); return "shared";};');
  writeFileSync(join(root, 'check.mjs'), `
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const mode=process.argv[2], contract=JSON.parse(readFileSync(process.argv[3],'utf8'));
const original=readFileSync('owner.mjs');
try {
 if(mode==='ownership') writeFileSync('owner.mjs','export const value=()=>"changed";');
 if(mode!=='changes') {
  const {run}=await import('./consumer.mjs');
  assert.equal(run(),mode==='ownership'?'changed':contract.requirements.expected);
 }
} catch(error) {process.exitCode=error instanceof assert.AssertionError?1:2;}
finally {writeFileSync('owner.mjs',original);}
`);
  const contract = {
    contractVersion: 1, id: 'word', profile: 'javascript-library', responsibility: 'Screens use shared wording.',
    decision: { action: 'reuse', need: 'The screen needs shared wording.', considered: [{ candidate: 'owner.mjs', finding: 'Owns the wording.' }], rationale: 'Use the owner.' },
    owner: { entrypoint: 'owner.mjs', export: 'value' },
    consumers: [{ id: 'screen', entrypoint: 'consumer.mjs', export: 'run', alternatives: { wrapper: 'wrapper.mjs', copy: 'copy.mjs', unusedImport: 'decoy.mjs' } }],
    rules: { owns: ['wording'], consumerOwns: [], allowed: ['wrapping'], extend: 'Extend the existing owner.', forbidden: ['copy the wording'] },
    requirements: { expected: 'shared' }, checks: { entrypoint: 'check.mjs', files: [] },
  };
  const path = 'capabilities/word/capability.json';
  const save = (value: unknown = contract) => writeFileSync(join(root, path), JSON.stringify(value));
  const review = () => recordContractReview(root, path, 'Reviewed the owner, consumers and checks.');
  save();
  return { root, path, contract, save, review };
}

async function cli(args: string[]) {
  const output = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  const exit = await runCli(args);
  const text = output.mock.calls.map(call => String(call[0])).join('\n');
  const errors = error.mock.calls.map(call => String(call[0])).join('\n');
  output.mockRestore(); error.mockRestore();
  return { exit, text, errors };
}

it('derives a navigable catalog from standard contracts and reports stale review without executing checks', async () => {
  const f = fixture();
  const missing = await cli(['catalog', f.root, '--check-reviews', '--json']);
  expect(missing.exit).toBe(2);
  expect(JSON.parse(missing.text).capabilities[0].review.state).toBe('missing');
  f.review();
  const before = readFileSync(join(f.root, 'owner.mjs'));
  const result = await cli(['catalog', f.root, '--json']);
  expect(result.exit).toBe(0);
  const report = JSON.parse(result.text);
  expect(report.catalogVersion).toBe(1);
  expect(report.conformance).toBe('not-evaluated');
  expect(report.capabilities[0]).toMatchObject({ contract: f.path, id: 'word', owner: { entrypoint: 'owner.mjs' }, rules: { extend: 'Extend the existing owner.' }, review: { state: 'current' } });
  expect(report.capabilities[0].files).toContain('consumer.mjs');
  expect(readFileSync(join(f.root, 'owner.mjs'))).toEqual(before);
  writeFileSync(join(f.root, 'consumer.mjs'), 'export const run=()=>"shared";');
  const stale = await cli(['catalog', f.root, '--check-reviews', '--json']);
  expect(stale.exit).toBe(2);
  expect(JSON.parse(stale.text).capabilities[0].review.state).toBe('stale');
});

it('lists all contracts in stable path order and exposes declared external contract versions', async () => {
  const f = fixture();
  f.save({ ...f.contract, dependencies: [{ id: 'identity.permissions', repository: 'https://example.test/identity', contract: 'permissions', version: '1.2.0' }] });
  f.review();
  mkdirSync(join(f.root, 'capabilities/alpha'));
  const second = 'capabilities/alpha/capability.json';
  writeFileSync(join(f.root, second), JSON.stringify({ ...f.contract, id: 'another-word' }));
  recordContractReview(f.root, second, 'Reviewed second responsibility.');
  const result = await cli(['catalog', f.root, '--json']);
  expect(result.exit).toBe(0);
  const report = JSON.parse(result.text);
  expect(report.capabilities.map((item: { contract: string }) => item.contract)).toEqual([second, f.path]);
  expect(report.capabilities[1].dependencies[0]).toMatchObject({ id: 'identity.permissions', version: '1.2.0' });
});

it('rejects duplicates, invalid contracts, empty catalogs and escaping or linked directories', async () => {
  const f = fixture();
  mkdirSync(join(f.root, 'capabilities/duplicate'));
  writeFileSync(join(f.root, 'capabilities/duplicate/capability.json'), JSON.stringify(f.contract));
  expect((await cli(['catalog', f.root])).errors).toContain('Duplicate capability ID');
  rmSync(join(f.root, 'capabilities/duplicate'), { recursive: true });
  f.save({ ...f.contract, unexpected: true });
  expect((await cli(['catalog', f.root])).exit).toBe(2);
  rmSync(join(f.root, f.path));
  expect((await cli(['catalog', f.root])).errors).toContain('No capability.json');
  expect((await cli(['verify-catalog', f.root, '--allow-execution'])).exit).toBe(2);
  expect((await cli(['catalog', f.root, '..'])).exit).toBe(2);
  const other = mkdtempSync(join(tmpdir(), 'cod-catalog-outside-')); roots.push(other);
  symlinkSync(other, join(f.root, 'capabilities/outside'));
  expect((await cli(['catalog', f.root])).errors).toContain('symlink');
});

it('verifies the catalog through qualified native checks and rejects a changed promise after fresh review', async () => {
  const f = fixture(); f.review();
  const result = await cli(['verify-catalog', f.root, '--allow-execution', '--json']);
  expect(result.exit).toBe(0);
  expect(JSON.parse(result.text).state).toBe('ready-for-review');
  f.contract.requirements.expected = 'contradiction'; f.save(); f.review();
  const failed = await cli(['verify-catalog', f.root, '--allow-execution', '--json']);
  expect(failed.exit).toBe(1);
  expect(JSON.parse(failed.text).state).toBe('violated');
});

it('prints readable relationships and rejects unknown, repeated and missing execution flags', async () => {
  const f = fixture(); f.review();
  const result = await cli(['catalog', f.root]);
  expect(result.text).toContain('word');
  expect(result.text).toContain('owner.mjs');
  expect(result.text).toContain('consumer.mjs');
  for (const args of [
    ['catalog', f.root, '--unknown'], ['catalog', f.root, '--json', '--json'],
    ['verify-catalog', f.root], ['verify-catalog', f.root, '--allow-execution', '--allow-execution'],
  ]) expect((await cli(args)).exit).toBe(2);
});


it('checks current review without requiring a configured source map or indexer', async () => {
  const f = fixture();
  f.save({ ...f.contract, mapping: {
    producers: [{ command: 'cod-not-installed-indexer', args: ['{output}'] }], symbols: [],
  } });
  f.review();
  const result = await cli(['catalog', f.root, '--check-reviews', '--json']);
  expect(result.exit).toBe(0);
  expect(JSON.parse(result.text).capabilities[0].sourceMap.state).toBe('missing');
  expect((await cli(['verify-catalog', f.root, '--allow-execution'])).exit).toBe(2);
  writeFileSync(join(f.root, 'consumer.mjs'), 'export const run=()=>"shared";');
  expect((await cli(['catalog', f.root, '--json'])).exit).toBe(0);
  expect((await cli(['catalog', f.root, '--check-reviews'])).exit).toBe(2);
});
