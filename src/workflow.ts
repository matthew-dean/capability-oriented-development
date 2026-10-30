import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { hash, reference } from './filesystem.js';
import { runtimeContractSchema, preflightRuntimeContract, verifyRuntimeContract } from './runtime-contracts.js';
import { witnessSchema, qualificationRuntimeContract, qualifyWitness } from './qualification.js';
import { variantQualificationSchema, variantQualificationRuntimeContract, qualifyVariants } from './variant-qualification.js';
import { buildIndex } from './indexer.js';
import { changeBindingSchema, verifyChangeBindings } from './change-bindings.js';
import { parseIndex, reconcile } from './reconciliation.js';

export const workflowSchema = z.object({
  workflowVersion: z.literal(1), id: z.string().min(1),
  decision: z.object({ action: z.enum(['reuse', 'configure', 'compose', 'extend', 'create']), rationale: z.string().min(1) }).strict(),
  contracts: z.array(z.string().min(1)).min(1).max(20),
  qualifications: z.array(z.object({ file: z.string().min(1), contracts: z.array(z.string().min(1)).min(1) }).strict()).min(1).max(20),
  baseline: z.string().optional(),
  requireChangeBindings: z.boolean().default(false),
  changeBindings: z.array(z.object({ definition: z.string().min(1), review: z.string().min(1) }).strict()).max(20).default([]),
}).strict();
export type CodWorkflow = z.input<typeof workflowSchema>;

/** Produces an evidence packet for review. It never approves architectural fit or stale prose. */
export async function verifyWorkflow(root: string, input: unknown, options: { allowExecution: boolean; timeoutMs?: number }) {
  return runWorkflow(root, input, options, file => JSON.parse(readFileSync(reference(root, file), 'utf8')));
}

/** Shared enforcement engine. A unified contract supplies definitions in memory;
 * legacy integrations load them from files. Both use the same checks below.
 */
export async function runWorkflow(
  root: string,
  input: unknown,
  options: { allowExecution: boolean; timeoutMs?: number },
  read: (file: string, kind: 'runtime' | 'qualification' | 'bindings' | 'review' | 'baseline') => unknown,
  prepare?: (commands: { command: string; args: string[]; cwd: string }[]) => Promise<Awaited<ReturnType<typeof verifyRuntimeContract>>>,
) {
  if (options.allowExecution !== true) throw new Error('Workflow commands require explicit execution authorization');
  const workflow = workflowSchema.parse(input);
  const contracts = workflow.contracts.map(file => ({ file, definition: runtimeContractSchema.parse(read(file, 'runtime')) }));
  const qualifications = workflow.qualifications.map(item => ({ ...item, definition: z.union([witnessSchema, variantQualificationSchema]).parse(read(item.file, 'qualification')) }));
  if (new Set(contracts.map(c => c.definition.id)).size !== contracts.length) throw new Error('Duplicate runtime contract IDs');
  const declared = new Set(contracts.map(c => c.definition.id));
  if (qualifications.some(q => q.contracts.some(id => !declared.has(id)))) throw new Error('Qualification refers to an unknown contract');
  const kinds = new Set(contracts.flatMap(c => c.definition.obligations.map(o => o.kind)));
  const gaps = ['behavior', 'ownership', 'evolution'].filter(kind => !kinds.has(kind as 'behavior' | 'ownership' | 'evolution')).map(kind => `Missing ${kind} obligation`);
  if (workflow.requireChangeBindings && !workflow.changeBindings.length) gaps.push('Missing required two-way change bindings');
  const changeBindings = workflow.changeBindings.map(binding => { const scope=changeBindingSchema.parse(read(binding.definition, 'bindings')); return {...binding,scope,report:verifyChangeBindings(root,scope,read(binding.review, 'review'))}; });
  for (const binding of changeBindings) if (binding.report.state !== 'current') gaps.push(`Stale two-way change binding: ${binding.report.id}`);
  if (workflow.requireChangeBindings) {
    const covered = new Set(changeBindings.flatMap(binding => Object.keys(binding.report.files)));
    const required = [...workflow.contracts, ...qualifications.map(q => q.file), ...contracts.flatMap(c => c.definition.inputs), ...qualifications.flatMap(q => q.definition.inputs)];
    for (const file of new Set(required)) if (!covered.has(file)) gaps.push(`Unbound workflow evidence: ${file}`);
  }
  if(workflow.requireChangeBindings&&qualifications.some(q=>q.definition.qualificationVersion===2)) {
    const variants=qualifications.flatMap(q=>q.definition.qualificationVersion===2?[q.definition]:[]);
    for(const binding of changeBindings)for(const consumer of binding.scope.implementations.filter(i=>i.role==='consumer'))for(const role of ['independent-copy','dead-owner-decoy']) {
      if(!variants.some(q=>q.cases.some(c=>c.role===role&&c.overlays.some(o=>consumer.inputs.includes(o.target)))))gaps.push(`Missing ${role} production variant for consumer ${consumer.id}`);
    }
  }
  for (const { definition: contract } of contracts) {
    if (!contract.obligations.some(o => o.kind !== 'behavior')) continue;
    const bindings = qualifications.filter(q => q.contracts.includes(contract.id));
    if (!bindings.length) gaps.push(`No qualification for ${contract.id}`);
    for (const q of bindings) if (q.definition.witness.some(file => !contract.inputs.includes(file))) gaps.push(`Unbound witness inputs for ${contract.id}: ${q.file}`);
    for (const q of bindings) if (q.definition.qualificationVersion === 2) {
      const signature = (c: {command: string; args: string[]; cwd: string}) => JSON.stringify([c.command, c.args, c.cwd]);
      const liveSignature = signature(q.definition.conformance);
      if (!contract.obligations.some(o => o.kind !== 'behavior' && signature(o) === liveSignature)) gaps.push(`Qualification does not execute the live conformance command for ${contract.id}: ${q.file}`);
    }
    const variants = bindings.flatMap(q => q.definition.qualificationVersion === 2 ? [q.definition] : []);
    if (variants.length) for (const obligation of contract.obligations.filter(o => o.kind !== 'behavior')) {
      const signature = (c: {command: string; args: string[]; cwd: string}) => JSON.stringify([c.command, c.args, c.cwd]);
      if (!variants.some(q => signature(q.conformance) === signature(obligation))) gaps.push(`Live conformance obligation lacks production-variant qualification for ${contract.id}: ${obligation.id}`);
    }
  }
  const files = [...new Set([...workflow.contracts, ...qualifications.map(q => q.file), ...contracts.flatMap(c => c.definition.inputs), ...qualifications.flatMap(q => q.definition.inputs), ...changeBindings.flatMap(binding => [binding.definition, binding.review, ...Object.keys(binding.report.files)]), ...(workflow.baseline ? [workflow.baseline] : [])])];
  const before = Object.fromEntries(files.map(file => [file, hash(readFileSync(reference(root, file)))]));
  const reconciliation = workflow.baseline ? reconcile(parseIndex(read(workflow.baseline, 'baseline')), buildIndex(root)) : null;
  if (reconciliation && !reconciliation.ok) gaps.push('Current structural graph is invalid');
  if (gaps.length) return { workflowVersion: 1 as const, id: workflow.id, state: 'unresolved', gaps, decision: workflow.decision, reconciliation, changeBindings, qualifications: [], contracts: [], definitionDigest: hash(JSON.stringify(workflow)), inputs: before, changedInputs: [] };
  for (const q of qualifications) preflightRuntimeContract(root, q.definition.qualificationVersion === 2 ? variantQualificationRuntimeContract(q.definition) : qualificationRuntimeContract(q.definition));
  for (const c of contracts) preflightRuntimeContract(root, c.definition);
  const preparation = prepare ? await prepare([
    ...contracts.flatMap(c => c.definition.obligations),
    ...qualifications.flatMap(q => q.definition.qualificationVersion === 2 ? [q.definition.behavior, q.definition.conformance] : q.definition.cases.flatMap(c => [c.behavior, c.conformance])),
  ]) : null;
  if (preparation && preparation.state !== 'verified') return { workflowVersion: 1 as const, id: workflow.id, state: 'unresolved' as const, gaps: ['Native checker preparation failed; no calibration was accepted.'], decision: workflow.decision, reconciliation, changeBindings, preparation, qualifications: [], contracts: [], definitionDigest: hash(JSON.stringify(workflow)), inputs: before, changedInputs: [] };
  const qualified = [];
  for (const q of qualifications) qualified.push({ file: q.file, contracts: q.contracts, report: await (q.definition.qualificationVersion === 2 ? qualifyVariants(root, q.definition, options) : qualifyWitness(root, q.definition, options)) });
  const executed = [];
  // A failed calibration cannot close a responsibility; avoid unnecessary further execution.
  if (qualified.every(q => q.report.state === 'qualified')) {
    for (const c of contracts) executed.push({ file: c.file, report: await verifyRuntimeContract(root, c.definition, options) });
  }
  const changedInputs = files.filter(file => { try { return hash(readFileSync(reference(root, file))) !== before[file]; } catch { return true; } });
  const state = changedInputs.length || qualified.some(q => q.report.state === 'unresolved') || executed.some(c => c.report.state === 'unresolved') ? 'unresolved' : qualified.some(q => q.report.state === 'unqualified') || executed.some(c => c.report.state === 'violated') ? 'violated' : 'ready-for-review';
  return { workflowVersion: 1 as const, id: workflow.id, state, gaps, decision: workflow.decision, reconciliation, changeBindings, preparation, qualifications: qualified, contracts: executed, definitionDigest: hash(JSON.stringify(workflow)), inputs: before, changedInputs, review: { contractNecessity: 'required', solutionRestraint: 'required', fit: 'required', consumerCompleteness: 'required', currentRequirementsAndTests: 'required', qualificationCaseSemantics: 'required' }, authority: 'Ready means current registered commands, declared calibration and registered change bindings passed. Missing change bindings are legacy coverage, not complete COD enforcement. It does not approve contract necessity, solution restraint, fit, complete consumer coverage, reconciliation prose or semantic compatibility.' };
}
