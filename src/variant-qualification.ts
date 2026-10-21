import { readFileSync, writeFileSync, realpathSync, statSync } from 'node:fs';
import { z } from 'zod';
import { hash, reference } from './filesystem.js';
import { preflightRuntimeContract, verifyRuntimeContract } from './runtime-contracts.js';

const command = z.object({ command: z.string().min(1), args: z.array(z.string()), cwd: z.string().default('.') }).strict();
/** Runs the same behavior and conformance entrypoints over harness-applied production-source variants. */
export const variantQualificationSchema = z.object({
  qualificationVersion: z.literal(2), id: z.string().min(1), responsibility: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1).max(500), witness: z.array(z.string().min(1)).min(1).max(100),
  behavior: command, conformance: command,
  cases: z.array(z.object({
    id: z.string().min(1), role: z.enum(['delegation', 'composition', 'independent-copy', 'dead-owner-decoy', 'policy-override', 'valid-alternative']),
    overlays: z.array(z.object({ target: z.string().min(1), source: z.string().min(1) }).strict()).max(20),
  }).strict()).min(4).max(16),
}).strict().superRefine((value, context) => {
  for (const role of ['delegation', 'composition', 'independent-copy', 'dead-owner-decoy']) if (!value.cases.some(c => c.role === role)) context.addIssue({ code: 'custom', message: `Missing qualification role: ${role}` });
  if (new Set(value.cases.map(c => c.id)).size !== value.cases.length) context.addIssue({ code: 'custom', message: 'Duplicate case IDs' });
  if (new Set(value.inputs).size !== value.inputs.length) context.addIssue({ code: 'custom', message: 'Duplicate input paths' });
  if (value.witness.some(file => !value.inputs.includes(file))) context.addIssue({ code: 'custom', message: 'Witness files must be registered inputs' });
  for (const c of value.cases) {
    if (new Set(c.overlays.map(o => o.target)).size !== c.overlays.length) context.addIssue({ code: 'custom', message: 'Duplicate overlay targets' });
    if (c.overlays.some(o => !value.inputs.includes(o.target) || !value.inputs.includes(o.source))) context.addIssue({ code: 'custom', message: 'Overlay sources and targets must be registered inputs' });
    if (c.overlays.some(o => value.witness.includes(o.target))) context.addIssue({ code: 'custom', message: 'Variants cannot replace their witness' });
  }
});
export type VariantQualification = z.input<typeof variantQualificationSchema>;

export function variantQualificationRuntimeContract(input: unknown) {
  const definition = variantQualificationSchema.parse(input);
  return { runtimeContractVersion: 1, id: definition.id, responsibility: definition.responsibility, inputs: definition.inputs, obligations: [
    { id: 'behavior', kind: 'behavior', claim: 'The current production variant satisfies the contract', ...definition.behavior },
    { id: 'conformance', kind: 'ownership', claim: 'The current production variant respects the responsibility relationship', ...definition.conformance },
  ] };
}

/** Temporarily writes registered source files; trusted commands execute sequentially, without a case label argument. */
export async function qualifyVariants(root: string, input: unknown, options: { allowExecution: boolean; timeoutMs?: number }) {
  if (options.allowExecution !== true) throw new Error('Variant qualification requires explicit execution authorization');
  const definition = variantQualificationSchema.parse(input), runtime = variantQualificationRuntimeContract(definition);
  const initial = preflightRuntimeContract(root, runtime);
  // Resolve every case before mutation. Canonical aliases must not overwrite fixtures or the observer.
  const fileId = (file: string) => { const stat = statSync(file, {bigint:true}); return `${stat.dev}:${stat.ino}`; };
  const sources = new Set(definition.cases.flatMap(c => c.overlays.map(o => fileId(reference(root, o.source)))));
  const witnesses = new Set(definition.witness.map(file => fileId(reference(root, file))));
  const cases = definition.cases.map(c => ({ ...c, overlays: c.overlays.map(o => ({ ...o, targetPath: realpathSync(reference(root, o.target)), sourcePath: realpathSync(reference(root, o.source)) })) }));
  for (const c of cases) {
    if (new Set(c.overlays.map(o => fileId(o.targetPath))).size !== c.overlays.length) throw new Error('Overlay target aliases overlap');
    if (c.overlays.some(o => sources.has(fileId(o.targetPath)) || witnesses.has(fileId(o.targetPath)))) throw new Error('Overlay targets cannot overwrite fixture sources or witnesses');
  }
  const targets = [...new Set(cases.flatMap(c => c.overlays.map(o => o.targetPath)))];
  const originals = new Map(targets.map(file => [file, readFileSync(file)]));
  const results = [], changedInputs = new Set<string>();
  for (const c of cases) {
    let execution;
    try {
      for (const overlay of c.overlays) writeFileSync(overlay.targetPath, readFileSync(overlay.sourcePath));
      execution = await verifyRuntimeContract(root, runtime, options);
      for (const file of execution.changedInputs) changedInputs.add(file);
    } finally { for (const {targetPath} of c.overlays) writeFileSync(targetPath, originals.get(targetPath)!); }
    for (const file of definition.inputs) {
      try { if (initial.before[file] !== hash(readFileSync(reference(root, file)))) changedInputs.add(file); } catch { changedInputs.add(file); }
    }
    const behavior = execution.results[0]!, conformance = execution.results[1]!;
    const expectedConformanceExit = ['independent-copy', 'dead-owner-decoy', 'policy-override'].includes(c.role) ? 1 : 0;
    results.push({ id: c.id, role: c.role, overlays: c.overlays.map(({target, source}) => ({target, source})), expectedConformanceExit, behavior, conformance, executionState: execution.state, matched: behavior.exitCode === 0 && conformance.exitCode === expectedConformanceExit });
    if (changedInputs.size || execution.state === 'unresolved') break;
  }
  return { qualificationVersion: 2 as const, id: definition.id, state: changedInputs.size || results.some(c => c.executionState === 'unresolved') ? 'unresolved' : results.length === cases.length && results.every(c => c.matched) ? 'qualified' : 'unqualified', inputs: initial.before, witness: definition.witness, cases: results, changedInputs: [...changedInputs], commands: { behavior: definition.behavior, conformance: definition.conformance }, authority: 'One unchanged behavior/conformance command pair executes every production-source overlay. Review fixture semantics, consumer completeness and that the registered witness actually observes the claimed boundary. This is not a sandbox; do not run concurrent verification in this source tree.' };
}
