import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { qualifyWitness, type WitnessQualification } from '../src/qualification.js';
import { verifyWorkflow } from '../src/workflow.js';
import { inspectChangeBindings } from '../src/change-bindings.js';
const roots: string[] = [];
afterEach(() => { roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cod-workflow-')); roots.push(root);
  const cases: WitnessQualification['cases'] = [];
  const inputs = ['probe.mjs'];
  writeFileSync(join(root, 'probe.mjs'), `import assert from 'node:assert/strict'; import {readFileSync,writeFileSync} from 'node:fs'; import {pathToFileURL} from 'node:url'; import {resolve} from 'node:path';
const path=resolve('owner.mjs'),before=readFileSync(path,'utf8'),mode=process.argv[2];
try { if(mode==='conformance') writeFileSync(path,'export const protect = () => "OWNER-SENTINEL"'); const {run}=await import(pathToFileURL(resolve('consumer.mjs')).href); assert.equal(run('=1'),mode==='conformance'?'OWNER-SENTINEL':"'=1"); } finally { writeFileSync(path,before); }
`);
  for (const role of ['delegation', 'composition', 'independent-copy', 'dead-owner-decoy'] as const) {
    const cwd = `cases/${role}`; mkdirSync(join(root, cwd), { recursive: true });
    writeFileSync(join(root, cwd, 'owner.mjs'), `export const protect = v => /^[=+@-]/.test(v) ? "'"+v : v;`);
    const source = role === 'delegation' ? 'export const run = protect;' : role === 'composition' ? 'const wrapper = v => protect(v); export const run = wrapper;' : `export const run = v => /^[=+@-]/.test(v) ? "'"+v : v; ${role === 'dead-owner-decoy' ? 'const unusedOptions = { protect };' : ''}`;
    writeFileSync(join(root, cwd, 'consumer.mjs'), `import {protect} from './owner.mjs'; ${source}`);
    inputs.push(`${cwd}/owner.mjs`, `${cwd}/consumer.mjs`);
    cases.push({ id: role, role, behavior: { command: process.execPath, args: ['../../probe.mjs', 'behavior'], cwd }, conformance: { command: process.execPath, args: ['../../probe.mjs', 'conformance'], cwd } });
  }
  const qualification = { qualificationVersion: 1, id: 'policy-witness', responsibility: 'Consumers follow a shared text rule', inputs, witness: ['probe.mjs'], cases };
  const contract = { runtimeContractVersion: 1, id: 'live-policy', responsibility: qualification.responsibility, inputs: ['probe.mjs', 'cases/delegation/owner.mjs', 'cases/delegation/consumer.mjs'], obligations: ['behavior', 'ownership', 'evolution'].map(kind => ({ id: kind, kind, claim: 'Registered consumer follows the policy', command: process.execPath, args: ['../../probe.mjs', kind === 'behavior' ? kind : 'conformance'], cwd: 'cases/delegation' })) };
  const workflow = { workflowVersion: 1, id: 'change-1', decision: { action: 'reuse', rationale: 'The existing text policy fits the requested consumers' }, contracts: ['runtime.json'], qualifications: [{ file: 'qualification.json', contracts: ['live-policy'] }] };
  function save() { writeFileSync(join(root, 'runtime.json'), JSON.stringify(contract)); writeFileSync(join(root, 'qualification.json'), JSON.stringify(qualification)); }
  save(); return { root, qualification, contract, workflow, save };
}
it('qualifies actual consumer propagation while negative copies retain correct behavior', async () => {
  const f = fixture(), result = await qualifyWitness(f.root, f.qualification, { allowExecution: true });
  expect(result.state).toBe('qualified'); expect(result.cases.map(c => c.behavior.exitCode)).toEqual([0, 0, 0, 0]); expect(result.cases.map(c => c.conformance.exitCode)).toEqual([0, 0, 1, 1]);
});
it('rejects an always-passing witness rather than certifying its ownership label', async () => {
  const f = fixture(); f.qualification.cases.forEach(c => { c.conformance = { command: process.execPath, args: ['--eval', 'process.exitCode=0'], cwd: '.' }; });
  expect((await qualifyWitness(f.root, f.qualification, { allowExecution: true })).state).toBe('unqualified');
});
it('requires the dead-owner decoy and explicit execution authorization', async () => {
  const f = fixture(); await expect(qualifyWitness(f.root, f.qualification, { allowExecution: false })).rejects.toThrow('authorization');
  await expect(qualifyWitness(f.root, { ...f.qualification, cases: f.qualification.cases.slice(0, 3) }, { allowExecution: true })).rejects.toThrow();
});
it('retains an unavailable conformance executable as unresolved', async () => {
  const f = fixture(); f.qualification.cases[0]!.conformance.command = 'cod-missing-witness';
  expect((await qualifyWitness(f.root, f.qualification, { allowExecution: true })).state).toBe('unresolved');
});
it('produces a review packet only after qualified and current obligations pass', async () => {
  const f = fixture(), result = await verifyWorkflow(f.root, f.workflow, { allowExecution: true });
  expect(result.state).toBe('ready-for-review'); expect(result.contracts).toHaveLength(1); expect(result.changedInputs).toEqual([]);
  expect(result.review).toMatchObject({ contractNecessity: 'required', solutionRestraint: 'required' });
});
it('rejects a live correct copy even when the calibration fixtures still qualify', async () => {
  const f = fixture(); writeFileSync(join(f.root, 'cases/delegation/consumer.mjs'), `import {protect} from './owner.mjs'; export const run = v => /^[=+@-]/.test(v)?"'"+v:v;`);
  // Keep the positive calibration separate from the live submission.
  mkdirSync(join(f.root, 'live')); for (const file of ['owner.mjs', 'consumer.mjs']) writeFileSync(join(f.root, 'live', file), readFileSync(join(f.root, 'cases/delegation', file)));
  writeFileSync(join(f.root, 'cases/delegation/consumer.mjs'), `import {protect} from './owner.mjs'; export const run = protect;`);
  f.contract.inputs.push('live/owner.mjs', 'live/consumer.mjs'); f.contract.obligations.forEach(o => { o.cwd = 'live'; o.args[0] = '../probe.mjs'; }); f.save();
  const result = await verifyWorkflow(f.root, f.workflow, { allowExecution: true }); expect(result.qualifications[0]?.report.state).toBe('qualified'); expect(result.state).toBe('violated'); expect(result.contracts[0]?.report.results[0]?.exitCode).toBe(0);
});
it('does not execute anything when required claims or witness bindings are missing', async () => {
  const f = fixture(); f.contract.obligations.pop(); f.save();
  const result = await verifyWorkflow(f.root, f.workflow, { allowExecution: true }); expect(result.state).toBe('unresolved'); expect(result.qualifications).toEqual([]);
  f.contract.obligations.push({ ...f.contract.obligations[0]!, id: 'evolution', kind: 'evolution' }); f.contract.inputs.shift(); f.save();
  expect((await verifyWorkflow(f.root, f.workflow, { allowExecution: true })).gaps.join(' ')).toContain('Unbound witness');
});
it('strict workflows cannot become ready without two-way review bindings', async () => {
  const f = fixture();
  const result = await verifyWorkflow(f.root, { ...f.workflow, requireChangeBindings: true }, { allowExecution: true });
  expect(result.state).toBe('unresolved');
  expect(result.gaps).toContain('Missing required two-way change bindings');
  expect(result.qualifications).toEqual([]);
});
it('strict workflows bind actual runtime/qualification evidence and expire after contract edits', async () => {
  const f = fixture();
  const all = [...new Set([...f.contract.inputs, ...f.qualification.inputs])];
  const definition = { bindingVersion: 1, id: 'change', contractInputs: ['runtime.json', 'qualification.json', 'probe.mjs'], implementations: [{ id: 'owner', role: 'provider', inputs: ['cases/delegation/owner.mjs'] }, { id: 'consumers', role: 'consumer', inputs: all.filter(file => file !== 'probe.mjs' && file !== 'cases/delegation/owner.mjs') }] };
  const current = inspectChangeBindings(f.root, definition);
  writeFileSync(join(f.root, 'binding.json'), JSON.stringify(definition));
  writeFileSync(join(f.root, 'review.json'), JSON.stringify({ reviewVersion: 1, id: 'change', definitionDigest: current.definitionDigest, bindings: Object.fromEntries(current.implementations.map(item => [item.id, { contractDigest: current.contractDigest, implementationDigest: item.implementationDigest, rationale: 'Reviewed registered behavior and qualified production delegation.' }])) }));
  const workflow = { ...f.workflow, requireChangeBindings: true, changeBindings: [{ definition: 'binding.json', review: 'review.json' }] };
  expect((await verifyWorkflow(f.root, workflow, { allowExecution: true })).state).toBe('ready-for-review');
  f.contract.responsibility = 'Changed requirement'; f.save();
  const result = await verifyWorkflow(f.root, workflow, { allowExecution: true });
  expect(result.state).toBe('unresolved'); expect(result.qualifications).toEqual([]);
  expect(result.gaps).toContain('Stale two-way change binding: change');
  definition.contractInputs.pop(); writeFileSync(join(f.root, 'binding.json'), JSON.stringify(definition));
  const uncovered = await verifyWorkflow(f.root, workflow, { allowExecution: true });
  expect(uncovered.gaps).toContain('Unbound workflow evidence: probe.mjs');
});
it('preflights later contract directories before running calibration commands', async () => {
  const f = fixture(); f.contract.obligations[0]!.cwd = '..'; f.save();
  writeFileSync(join(f.root, 'probe.mjs'), 'throw Error("Must not execute")');
  await expect(verifyWorkflow(f.root, f.workflow, { allowExecution: true })).rejects.toThrow('escapes');
});
it('does not silently accept fixtures that change registered witness code', async () => {
  const f = fixture(); f.qualification.cases[0]!.behavior = { command: process.execPath, args: ['--eval', 'require("node:fs").writeFileSync("probe.mjs", "")'], cwd: '.' };
  expect((await qualifyWitness(f.root, f.qualification, { allowExecution: true })).state).toBe('unresolved');
});
it('invalidates readiness when an earlier calibration changes later contract inputs', async () => {
  const f = fixture();
  writeFileSync(join(f.root, 'postlude.mjs'), `import {spawnSync} from 'node:child_process'; import {appendFileSync} from 'node:fs'; const result=spawnSync(process.execPath,['../../probe.mjs','behavior'],{stdio:'inherit'}); if(result.status!==0)process.exit(result.status??2); appendFileSync('../../live/consumer.mjs',String.fromCharCode(10)+'// changed during calibration');`);
  mkdirSync(join(f.root, 'live')); for (const file of ['owner.mjs', 'consumer.mjs']) writeFileSync(join(f.root, 'live', file), readFileSync(join(f.root, 'cases/delegation', file)));
  f.contract.inputs.push('live/owner.mjs', 'live/consumer.mjs');
  f.qualification.inputs.push('postlude.mjs'); f.qualification.cases[0]!.behavior.args = ['../../postlude.mjs']; f.save();
  const result = await verifyWorkflow(f.root, f.workflow, { allowExecution: true });
  expect(result.qualifications[0]?.report.state).toBe('qualified'); expect(result.contracts[0]?.report.state).toBe('verified'); expect(result.state).toBe('unresolved'); expect(result.changedInputs).toContain('live/consumer.mjs');
});
it('qualifies the same live checker through harness-controlled variants and rejects checker substitution', async () => {
  const f=fixture();
  const definition={qualificationVersion:2,id:'live-variants',responsibility:f.qualification.responsibility,inputs:f.qualification.inputs,witness:f.qualification.witness,behavior:f.contract.obligations[0]!,conformance:f.contract.obligations[1]!,cases:f.qualification.cases.map(c=>({id:c.id,role:c.role,overlays:c.role==='delegation'?[]:[{target:'cases/delegation/consumer.mjs',source:`cases/${c.role}/consumer.mjs`}]}))};
  const pick=(c: typeof f.contract.obligations[number])=>({command:c.command,args:c.args,cwd:c.cwd});
  const input={...definition,behavior:pick(definition.behavior),conformance:pick(definition.conformance)};
  writeFileSync(join(f.root,'qualification.json'),JSON.stringify(input));
  expect((await verifyWorkflow(f.root,f.workflow,{allowExecution:true})).state).toBe('ready-for-review');
  const savedEvolution=f.contract.obligations[2]!;
  f.contract.obligations[2]={...savedEvolution,args:['--eval','process.exitCode=0'],cwd:'.'};
  writeFileSync(join(f.root,'runtime.json'),JSON.stringify(f.contract));
  expect((await verifyWorkflow(f.root,f.workflow,{allowExecution:true})).gaps.join(' ')).toContain('lacks production-variant qualification');
  f.contract.obligations[2]=savedEvolution;writeFileSync(join(f.root,'runtime.json'),JSON.stringify(f.contract));
  input.conformance={command:process.execPath,args:['--eval','process.exitCode=0'],cwd:'.'};
  writeFileSync(join(f.root,'qualification.json'),JSON.stringify(input));
  const result=await verifyWorkflow(f.root,f.workflow,{allowExecution:true});
  expect(result.state).toBe('unresolved');expect(result.gaps.join(' ')).toContain('live conformance command');expect(result.qualifications).toEqual([]);
});

it('strict production qualification cannot omit a declared consumer from its negative variants', async () => {
 const f=fixture(),q={qualificationVersion:2,id:'actual',responsibility:'Actual consumer follows owner',inputs:f.qualification.inputs,witness:['probe.mjs'],behavior:{command:process.execPath,args:['../../probe.mjs','behavior'],cwd:'cases/delegation'},conformance:{command:process.execPath,args:['../../probe.mjs','conformance'],cwd:'cases/delegation'},cases:f.qualification.cases.map(c=>({id:c.id,role:c.role,overlays:c.role==='delegation'?[]:[{target:'cases/delegation/consumer.mjs',source:`cases/${c.role}/consumer.mjs`}]}))};
 writeFileSync(join(f.root,'qualification.json'),JSON.stringify(q));
 const scope={bindingVersion:1,id:'all',contractInputs:['runtime.json','qualification.json',...f.qualification.inputs],implementations:[{id:'owner',role:'provider',inputs:['cases/delegation/owner.mjs']},{id:'first',role:'consumer',inputs:['cases/delegation/consumer.mjs']},{id:'second',role:'consumer',inputs:['cases/composition/consumer.mjs']}]};
 writeFileSync(join(f.root,'binding.json'),JSON.stringify(scope));const current=inspectChangeBindings(f.root,scope);
 writeFileSync(join(f.root,'review.json'),JSON.stringify({reviewVersion:1,id:current.id,definitionDigest:current.definitionDigest,bindings:Object.fromEntries(current.implementations.map(i=>[i.id,{contractDigest:current.contractDigest,implementationDigest:i.implementationDigest,rationale:'Registered source scope; current qualification still required.'}]))}));
 const r=await verifyWorkflow(f.root,{...f.workflow,requireChangeBindings:true,changeBindings:[{definition:'binding.json',review:'review.json'}]},{allowExecution:true});expect(r.state).toBe('unresolved');expect(r.gaps).toContain('Missing independent-copy production variant for consumer second');expect(r.gaps).toContain('Missing dead-owner-decoy production variant for consumer second');expect(r.qualifications).toEqual([]);
});
