import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { contractSchema, inspectContract, recordContractReview, refreshContractMap, verifyContract } from '../src/contracts.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-one-contract-'));
  roots.push(root);
  writeFileSync(join(root, 'owner.mjs'), 'export const value = () => "shared";');
  writeFileSync(join(root, 'consumer.mjs'), 'export {value as run} from "./owner.mjs";');
  writeFileSync(join(root, 'wrapper.mjs'), 'import {value} from "./owner.mjs"; export const run = () => value();');
  writeFileSync(join(root, 'copy.mjs'), 'export const run = () => "shared";');
  writeFileSync(join(root, 'decoy.mjs'), 'import {value} from "./owner.mjs"; export const run = () => { value(); return "shared"; };');
  // Both modes observe the real consumer. The mode, not the fixture label, is
  // passed by the toolkit. The owner is restored even when the assertion fails.
  writeFileSync(join(root, 'check.mjs'), `
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const mode=process.argv[2];
const contract=JSON.parse(readFileSync(process.argv[3],'utf8'));
const original=readFileSync('owner.mjs');
try {
  if(mode==='ownership') writeFileSync('owner.mjs','export const value = () => "changed-owner";');
  const {run}=await import('./consumer.mjs');
  if(mode!=='changes') assert.equal(run(),mode==='ownership'?'changed-owner':contract.requirements.expected);
} catch(error) { console.error(error); process.exitCode=error instanceof assert.AssertionError?1:2; }
finally {writeFileSync('owner.mjs',original);}
`);
  const contract = {
    contractVersion: 1, id: 'word', profile: 'javascript-library',
    responsibility: 'Consumers use the shared wording',
    decision: { action: 'reuse' as const, need: 'The screen needs shared wording.', considered: [{ candidate: 'owner.mjs', finding: 'Already owns the wording.' }], rationale: 'Use the existing owner instead of copying its wording.' },
    owner: { entrypoint: 'owner.mjs', export: 'value' },
    consumers: [{ id: 'screen', entrypoint: 'consumer.mjs', export: 'run', alternatives: { wrapper: 'wrapper.mjs', copy: 'copy.mjs', unusedImport: 'decoy.mjs' } }],
    rules: { owns: ['wording'], consumerOwns: [], allowed: ['wrapping'], extend: 'Extend the owner', forbidden: ['local wording copies'] },
    requirements: { expected: 'shared' },
    checks: { entrypoint: 'check.mjs', files: [] },
  };
  const save = () => writeFileSync(join(root, 'capability.json'), JSON.stringify(contract));
  const review = () => recordContractReview(root, 'capability.json', 'Reviewed the shared wording and real consumer checks.');
  save();
  return { root, contract, save, review };
}
const execute = (root: string) => verifyContract(root, 'capability.json', { allowExecution: true });

it('executes repeatable current-source evidence once without reusing another variant', async () => {
  const f = fixture();
  const checker = join(f.root, 'check.mjs');
  writeFileSync(checker, readFileSync(checker, 'utf8').replace(
    "const mode=process.argv[2];",
    `const mode=process.argv[2];
const {appendFileSync}=await import('node:fs');
appendFileSync('executions.jsonl', JSON.stringify({mode, consumer:readFileSync('consumer.mjs','utf8')})+'\\n');`,
  ));
  Object.assign(f.contract.checks, { repeatable: true }); f.save(); f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('ready-for-review');
  const calls = readFileSync(join(f.root, 'executions.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  expect(calls).toHaveLength(9); // Four distinct source variants, then change disagreement.
  expect(new Set(calls.filter(call => call.mode === 'ownership').map(call => call.consumer)).size).toBe(4);
  expect('contracts' in result && result.contracts[0]!.report.verification).toMatchObject({ commandsExecuted: 1, commandsReused: 3 });
});

it.skipIf(process.platform === 'win32')('prepares a standalone C# checker once and still executes every source variant', async () => {
  const f = fixture(), previousPath = process.env.PATH;
  writeFileSync(join(f.root, 'Harness.csproj'), '<Project />');
  const dotnet = join(f.root, 'dotnet');
  writeFileSync(dotnet, `#!${process.execPath}
import {appendFileSync,mkdirSync,writeFileSync} from 'node:fs';
appendFileSync('native-commands.jsonl',JSON.stringify(process.argv.slice(2))+'\\n');
if(process.argv[2]==='msbuild') {
 mkdirSync('obj',{recursive:true}); writeFileSync('Harness.dll','native SDK output');
 console.log(JSON.stringify({Properties:{TargetPath:process.cwd()+'/Harness.dll',BaseIntermediateOutputPath:'obj\\\\'},Items:{ProjectReference:[],Compile:[]}}));
} else { process.argv.splice(1,1); await import('./check.mjs'); }
`);
  const { chmodSync } = await import('node:fs'); chmodSync(dotnet, 0o755);
  Object.assign(f.contract, { profile: 'csharp-library' });
  Object.assign(f.contract.checks, { entrypoint: 'Harness.csproj', files: ['check.mjs'], repeatable: true, precompile: true });
  f.save(); f.review();
  process.env.PATH = `${f.root}:${previousPath}`;
  try {
    const result = await execute(f.root);
    expect(result.state).toBe('ready-for-review');
    const calls = readFileSync(join(f.root, 'native-commands.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    expect(calls.filter(call => call[0] === 'msbuild')).toHaveLength(1);
    expect(calls.filter(call => call[0].endsWith('Harness.dll'))).toHaveLength(9);
  } finally { if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath; }
});

it('stops at its total budget, reports unresolved and restores an interrupted owner probe', async () => {
  const f = fixture(), original = readFileSync(join(f.root, 'owner.mjs'));
  writeFileSync(join(f.root, 'check.mjs'), `import {writeFileSync} from 'node:fs';
writeFileSync('owner.mjs','interrupted probe'); console.log('owner-mutated'); setInterval(()=>{},100);`);
  Object.assign(f.contract.checks, { repeatable: true, budgetMs: 1500 }); f.save(); f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('unresolved');
  expect(readFileSync(join(f.root, 'owner.mjs'))).toEqual(original);
  expect('qualifications' in result && result.qualifications[0]!.report.cases[0]!.behavior.stdout).toContain('owner-mutated');
  expect('qualifications' in result && result.qualifications[0]!.report.cases).toHaveLength(1);
});

it.skipIf(process.platform === 'win32').each(['symlinkSync', 'linkSync'])('does not restore an interrupted overlay through a replacement %s', async link => {
  const f = fixture();
  writeFileSync(join(f.root, 'innocent.mjs'), 'must remain untouched');
  writeFileSync(join(f.root, 'check.mjs'), `import {readFileSync,unlinkSync,${link}} from 'node:fs';
if(!readFileSync('consumer.mjs','utf8').includes('export {value as run}')) {
 unlinkSync('consumer.mjs'); ${link}('innocent.mjs','consumer.mjs');
 console.log('replacement-installed'); setInterval(()=>{},100);
}`);
  Object.assign(f.contract.checks, { budgetMs: 1500 }); f.save(); f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('unresolved');
  expect(readFileSync(join(f.root, 'innocent.mjs'), 'utf8')).toBe('must remain untouched');
  expect(result.gaps.join(' ')).toContain('Cannot safely restore');
});

it.skipIf(process.platform === 'win32')('rejects production source disguised as a native generated intermediate', async () => {
  const f = fixture(), previousPath = process.env.PATH;
  mkdirSync(join(f.root, 'mutable'));
  writeFileSync(join(f.root, 'mutable/Checkout.cs'), 'class Checkout {}');
  writeFileSync(join(f.root, 'Harness.csproj'), '<Project />');
  const dotnet = join(f.root, 'dotnet');
  writeFileSync(dotnet, `#!${process.execPath}
import {writeFileSync} from 'node:fs';
writeFileSync('Harness.dll','native SDK output');
console.log(JSON.stringify({Properties:{TargetPath:process.cwd()+'/Harness.dll',BaseIntermediateOutputPath:'mutable/'},Items:{ProjectReference:[],Compile:[{FullPath:process.cwd()+'/mutable/Checkout.cs'}]}}));`);
  const { chmodSync } = await import('node:fs'); chmodSync(dotnet, 0o755);
  Object.assign(f.contract, { profile: 'csharp-library' });
  f.contract.consumers[0]!.entrypoint = 'mutable/Checkout.cs';
  Object.assign(f.contract.checks, { entrypoint: 'Harness.csproj', files: ['check.mjs'], precompile: true });
  f.save(); f.review(); process.env.PATH = `${f.root}:${previousPath}`;
  try { await expect(execute(f.root)).rejects.toThrow('Standalone checker sources'); }
  finally { if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath; }
});

it('runs one contract through the strict engine without auxiliary definition files', async () => {
  const f = fixture();
  expect((await execute(f.root)).state).toBe('unresolved');
  f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('ready-for-review');
  expect('qualifications' in result && result.qualifications[0]!.report.cases.map(item => item.conformance.exitCode)).toEqual([0, 0, 1, 1]);
  expect(inspectContract(f.root, 'capability.json').review.state).toBe('current');
});

it('rejects a live correct copy with fresh review and restores production source', async () => {
  const f = fixture();
  cpSync(join(f.root, 'copy.mjs'), join(f.root, 'consumer.mjs'));
  const before = readFileSync(join(f.root, 'consumer.mjs'));
  f.review();
  expect((await execute(f.root)).state).toBe('violated');
  expect(readFileSync(join(f.root, 'consumer.mjs'))).toEqual(before);
});

it('rejects an always-passing ownership checker with fresh review', async () => {
  const f = fixture();
  writeFileSync(join(f.root, 'check.mjs'), 'process.exitCode = 0;');
  f.review();
  expect((await execute(f.root)).state).toBe('violated');
});

it('expires reviews after source or requirements change and still rejects disagreement after recording review', async () => {
  const f = fixture();
  f.review();
  f.contract.requirements.expected = 'different';
  f.save();
  expect(inspectContract(f.root, 'capability.json').review.state).toBe('stale');
  expect((await execute(f.root)).state).toBe('unresolved');
  f.review();
  expect((await execute(f.root)).state).toBe('violated');
  f.contract.requirements.expected = 'shared';
  f.save();
  f.review();
  writeFileSync(join(f.root, 'owner.mjs'), 'export const value = () => "broken";');
  expect(inspectContract(f.root, 'capability.json').review.state).toBe('stale');
  f.review();
  expect((await execute(f.root)).state).toBe('violated');
});

it('refuses execution without authorization and cannot omit required bypass cases', async () => {
  const f = fixture();
  await expect(verifyContract(f.root, 'capability.json', { allowExecution: false })).rejects.toThrow('authorization');
  const broken = JSON.parse(JSON.stringify(f.contract));
  delete broken.consumers[0].alternatives.unusedImport;
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(broken));
  expect(() => f.review()).toThrow();
});

it('treats checker crashes as unresolved rather than a successfully rejected bypass', async () => {
  const f = fixture();
  writeFileSync(join(f.root, 'check.mjs'), 'process.exitCode = 2;');
  f.review();
  expect((await execute(f.root)).state).toBe('unresolved');
});

it('binds fixtures and check source to review and fingerprints changes across execution', async () => {
  const f = fixture();
  f.review();
  writeFileSync(join(f.root, 'wrapper.mjs'), readFileSync(join(f.root, 'wrapper.mjs'), 'utf8') + '\n');
  expect((await execute(f.root)).state).toBe('unresolved');
  writeFileSync(join(f.root, 'check.mjs'), 'import {appendFileSync} from "node:fs"; appendFileSync("owner.mjs", "\\n");');
  f.review();
  expect((await execute(f.root)).state).toBe('unresolved');
});

it('the published schema describes the actual common contract parser', () => {
  expect(JSON.parse(readFileSync('schemas/contract.schema.json', 'utf8'))).toEqual(z.toJSONSchema(contractSchema, { io: 'input' }));
});

it('uses the same contract for optional source mapping and blocks stale maps', async () => {
  const f = fixture();
  execFileSync('git', ['init', '-q'], { cwd: f.root });
  writeFileSync(join(f.root, '.gitignore'), '.cod/\n');
  const symbol = 'scip-typescript npm demo 1 owner.mjs/value().';
  writeFileSync(join(f.root, 'indexer.mjs'), `
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
writeFileSync(process.argv[2], JSON.stringify({
 metadata:{project_root:pathToFileURL(process.cwd()+'/').href,tool_info:{name:'test-indexer',version:'1'}},
 documents:[{relative_path:'owner.mjs',occurrences:[{symbol:${JSON.stringify(symbol)},symbol_roles:1,range:[0,13,18]}]}]
}));
`);
  const value = { ...f.contract, mapping: { producers: [{ command: process.execPath, args: ['indexer.mjs', '{output}'] }], symbols: [symbol] } };
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(value));
  f.review();
  expect((await execute(f.root)).state).toBe('unresolved');
  expect((await refreshContractMap(f.root, 'capability.json', { allowExecution: true })).state).toBe('mapped');
  expect(inspectContract(f.root, 'capability.json').sourceMap.state).toBe('current');
  expect((await execute(f.root)).state).toBe('ready-for-review');
  writeFileSync(join(f.root, 'new-source.mjs'), 'export const other = true;');
  expect(inspectContract(f.root, 'capability.json').sourceMap.state).toBe('stale');
  expect((await execute(f.root)).state).toBe('unresolved');
});

it('requires an explicit need and reuse decision and expires review when it changes', () => {
  const f = fixture();
  const { decision, ...missing } = f.contract;
  expect(contractSchema.safeParse(missing).success).toBe(false);
  expect(contractSchema.safeParse({ ...f.contract, decision: { ...decision, considered: [] } }).success).toBe(false);
  f.review();
  f.contract.decision.rationale = 'Extend the owner after reviewing a new requirement.';
  f.save();
  expect(inspectContract(f.root, 'capability.json').review.state).toBe('stale');
});

it('rejects invalid mapping settings before review or cache files exist', async () => {
  const f = fixture();
  for (const mapping of [
    { producers: [{ command: 'node', args: ['indexer.mjs'] }], symbols: [] },
    { producers: [{ command: 'node', args: ['indexer.mjs', '{output}'] }], symbols: ['local 1'] },
  ]) {
    writeFileSync(join(f.root, 'capability.json'), JSON.stringify({ ...f.contract, mapping }));
    expect(() => inspectContract(f.root, 'capability.json')).toThrow();
    expect(() => f.review()).toThrow();
    await expect(execute(f.root)).rejects.toThrow();
  }
});

it('uses compact source replacements for real consumers and keeps complete consumer coverage above sixteen cases', async () => {
  const f = fixture();
  const original = readFileSync(join(f.root, 'consumer.mjs'), 'utf8');
  const consumers = Array.from({ length: 6 }, (_, index) => {
    const entrypoint = `consumer-${index}.mjs`;
    writeFileSync(join(f.root, entrypoint), original);
    return { id: `screen-${index}`, entrypoint, export: 'run', alternatives: {
      wrapper: { replace: [{ from: original, to: 'import {value} from "./owner.mjs"; export const run = () => value();' }] },
      copy: { replace: [{ from: original, to: 'export const run = () => "shared";' }] },
      unusedImport: { replace: [{ from: original, to: 'import {value} from "./owner.mjs"; export const run = () => {value(); return "shared";};' }] },
    } };
  });
  // Each check executes every real consumer, not a case label or the provider alone.
  writeFileSync(join(f.root, 'check.mjs'), `
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const mode=process.argv[2], contract=JSON.parse(readFileSync(process.argv[3],'utf8'));
const original=readFileSync('owner.mjs');
try {
 if(mode==='ownership') writeFileSync('owner.mjs','export const value = () => "changed-owner";');
 if(mode!=='changes') for(const consumer of contract.consumers) {
  const {run}=await import('./'+consumer.entrypoint);
  assert.equal(run(),mode==='ownership'?'changed-owner':contract.requirements.expected);
 }
} catch(error) { process.exitCode=error instanceof assert.AssertionError?1:2; }
finally {writeFileSync('owner.mjs',original);}
`);
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify({ ...f.contract, consumers }));
  f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('ready-for-review');
  expect('qualifications' in result && result.qualifications[0]!.report.cases).toHaveLength(19);
  for (const consumer of consumers) expect(readFileSync(join(f.root, consumer.entrypoint), 'utf8')).toBe(original);
});

it('rejects ambiguous compact replacements before running commands or changing any source', async () => {
  const f = fixture();
  const original = readFileSync(join(f.root, 'consumer.mjs'));
  const consumer = f.contract.consumers[0]!;
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify({ ...f.contract, consumers: [{ ...consumer,
    alternatives: { ...consumer.alternatives, unusedImport: { replace: [{ from: 'not in the actual consumer', to: 'replacement' }] } },
  }] }));
  f.review();
  await expect(execute(f.root)).rejects.toThrow(/exactly once/);
  expect(readFileSync(join(f.root, 'consumer.mjs'))).toEqual(original);
});

it('restores compact source alternatives when a native checker cannot execute the variant', async () => {
  const f = fixture();
  const original = readFileSync(join(f.root, 'consumer.mjs'), 'utf8');
  const consumer = f.contract.consumers[0]!;
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify({ ...f.contract, consumers: [{ ...consumer,
    alternatives: { ...consumer.alternatives, wrapper: { replace: [{ from: original, to: 'export const run = ;' }] } },
  }] }));
  f.review();
  const result = await execute(f.root);
  expect(result.state).toBe('unresolved');
  expect(readFileSync(join(f.root, 'consumer.mjs'), 'utf8')).toBe(original);
});

it('applies replacements sequentially and rejects repeated source matches without running a checker', async () => {
  const f = fixture();
  const original = readFileSync(join(f.root, 'consumer.mjs'), 'utf8');
  const consumer = f.contract.consumers[0]!;
  const value = { ...f.contract, consumers: [{ ...consumer,
    alternatives: { ...consumer.alternatives, wrapper: { replace: [
      { from: original, to: 'import {value} from "./owner.mjs"; const delegate=()=>value(); export const run=()=>delegate();' },
      { from: 'run=()=>delegate()', to: 'run=delegate' },
    ] } },
  }] };
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(value));
  f.review();
  expect((await execute(f.root)).state).toBe('ready-for-review');
  // A later invalid case must be found before even the original case executes.
  value.consumers[0]!.alternatives.wrapper.replace = [{ from: 'e', to: 'x' }];
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(value));
  writeFileSync(join(f.root, 'check.mjs'), 'import {writeFileSync} from "node:fs"; writeFileSync("started", "yes");');
  f.review();
  await expect(execute(f.root)).rejects.toThrow(/exactly once/);
  expect(() => readFileSync(join(f.root, 'started'))).toThrow();
  expect(readFileSync(join(f.root, 'consumer.mjs'), 'utf8')).toBe(original);
});

it('shares readable source fragments across replacement cases and binds their changes to review', async () => {
  const f = fixture(); const original = readFileSync(join(f.root, 'consumer.mjs'), 'utf8');
  const value = { ...f.contract, consumers: [{ ...f.contract.consumers[0]!, alternatives: {
    wrapper: { replace: [{ from: original, toFile: 'wrapper.mjs' }] },
    copy: { replace: [{ from: original, toFile: 'copy.mjs' }] },
    unusedImport: { replace: [{ from: original, toFile: 'decoy.mjs' }] },
  } }] };
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(value));
  f.review();
  expect(inspectContract(f.root, 'capability.json').files).toContain('copy.mjs');
  expect((await execute(f.root)).state).toBe('ready-for-review');
  expect(readFileSync(join(f.root, 'consumer.mjs'), 'utf8')).toBe(original);
  writeFileSync(join(f.root, 'copy.mjs'), 'export const run=()=>"different";');
  expect(inspectContract(f.root, 'capability.json').review.state).toBe('stale');
  const invalid = structuredClone(value); invalid.consumers[0]!.alternatives.copy.replace[0]!.toFile = '../escape';
  writeFileSync(join(f.root, 'capability.json'), JSON.stringify(invalid));
  expect(() => f.review()).toThrow();
});
