import { z } from 'zod';
import { verifyRuntimeContract } from './runtime-contracts.js';

const command = z.object({ command: z.string().min(1), args: z.array(z.string()), cwd: z.string().default('.') }).strict();
export const witnessSchema = z.object({
  qualificationVersion: z.literal(1), id: z.string().min(1), responsibility: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1), witness: z.array(z.string().min(1)).min(1),
  cases: z.array(z.object({
    id: z.string().min(1), role: z.enum(['delegation', 'composition', 'independent-copy', 'dead-owner-decoy', 'policy-override', 'valid-alternative']),
    behavior: command, conformance: command,
  }).strict()).min(4).max(16),
}).strict().superRefine((value, context) => {
  for (const role of ['delegation', 'composition', 'independent-copy', 'dead-owner-decoy']) {
    if (!value.cases.some(c => c.role === role)) context.addIssue({ code: 'custom', message: `Missing qualification role: ${role}` });
  }
  if (new Set(value.cases.map(c => c.id)).size !== value.cases.length) context.addIssue({ code: 'custom', message: 'Duplicate case IDs' });
  if (value.witness.some(file => !value.inputs.includes(file))) context.addIssue({ code: 'custom', message: 'Witness files must be registered inputs' });
});
export type WitnessQualification = z.input<typeof witnessSchema>;

export function qualificationRuntimeContract(input: unknown) {
  const definition = witnessSchema.parse(input);
  return { runtimeContractVersion: 1, id: definition.id, responsibility: definition.responsibility, inputs: definition.inputs,
    obligations: definition.cases.flatMap((c, i) => [
      { id: `${i}:behavior`, kind: 'behavior', claim: `${c.id}: required output`, ...c.behavior },
      { id: `${i}:conformance`, kind: 'ownership', claim: `${c.id}: responsibility relationship`, ...c.conformance },
    ]),
  };
}
/** Tests a declared calibration matrix; case semantics still require independent review. */
export async function qualifyWitness(root: string, input: unknown, options: { allowExecution: boolean; timeoutMs?: number }) {
  const definition = witnessSchema.parse(input);
  const execution = await verifyRuntimeContract(root, qualificationRuntimeContract(definition), options);
  const cases = definition.cases.map((c, i) => {
    const expectedExit = ['independent-copy', 'dead-owner-decoy', 'policy-override'].includes(c.role) ? 1 : 0;
    const behavior = execution.results[i * 2]!, conformance = execution.results[i * 2 + 1]!;
    return { id: c.id, role: c.role, expectedConformanceExit: expectedExit, behavior, conformance, matched: behavior.exitCode === 0 && conformance.exitCode === expectedExit };
  });
  return { qualificationVersion: 1 as const, id: definition.id, state: execution.state === 'unresolved' ? 'unresolved' : cases.every(c => c.matched) ? 'qualified' : 'unqualified', inputs: execution.inputs, witness: definition.witness, cases, execution, authority: 'Executed declared cases only; review that fixtures represent actual delegation, composition and behavior-correct duplication. No universal semantic certificate.' };
}
