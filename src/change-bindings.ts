import { readFileSync, realpathSync } from 'node:fs';
import { z } from 'zod';
import { hash, reference } from './filesystem.js';

const paths = z.array(z.string().min(1)).min(1).max(200).refine(values => new Set(values).size === values.length, 'Duplicate input paths');
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const changeBindingSchema = z.object({
  bindingVersion: z.literal(1), id: z.string().min(1),
  contractInputs: paths,
  implementations: z.array(z.object({
    id: z.string().min(1), role: z.enum(['provider', 'consumer']), inputs: paths,
  }).strict()).min(2).max(200),
}).strict().superRefine((value, context) => {
  if (new Set(value.implementations.map(item => item.id)).size !== value.implementations.length) context.addIssue({ code: 'custom', message: 'Duplicate implementation IDs' });
  for (const role of ['provider', 'consumer']) if (!value.implementations.some(item => item.role === role)) context.addIssue({ code: 'custom', message: `At least one ${role} binding is required` });
});
const detailedReviewSchema = z.object({
  reviewVersion: z.literal(1), id: z.string().min(1), definitionDigest: digest,
  bindings: z.record(z.string(), z.object({ contractDigest: digest, implementationDigest: digest, rationale: z.string().trim().min(1) }).strict()),
}).strict();
// One shared contract identity and explanation avoid repeating them per consumer.
const compactReviewSchema = z.object({
  reviewVersion: z.literal(2), id: z.string().min(1), definitionDigest: digest,
  contractDigest: digest, implementations: z.record(z.string(), digest),
  rationale: z.string().trim().min(1),
}).strict();
export const changeReviewSchema = z.discriminatedUnion('reviewVersion', [detailedReviewSchema, compactReviewSchema]);
export type ChangeBindingDefinition = z.input<typeof changeBindingSchema>;
export type ChangeReview = z.input<typeof changeReviewSchema>;

/** Computes identities only. It neither writes nor approves a reconciliation record. */
export function inspectChangeBindings(rootPath: string, input: unknown) {
  const root = realpathSync(rootPath), definition = changeBindingSchema.parse(input);
  const inputs = [...new Set([...definition.contractInputs, ...definition.implementations.flatMap(item => item.inputs)])].sort();
  const files = Object.fromEntries(inputs.map(file => [file, hash(readFileSync(reference(root, file)))]));
  const identify = (names: string[]) => hash(JSON.stringify([...names].sort().map(file => [file, files[file]])));
  return {
    bindingVersion: 1 as const, id: definition.id, definitionDigest: hash(JSON.stringify(definition)),
    contractDigest: identify(definition.contractInputs), files,
    implementations: definition.implementations.map(item => ({ id: item.id, role: item.role, implementationDigest: identify(item.inputs) })),
    authority: 'Input identities only; review meaning and declared coverage are not independently validated.' as const,
  };
}

/** Requires explicit reconciliation in both directions; current records still need behavioral evidence. */
export function verifyChangeBindings(root: string, input: unknown, reviewInput: unknown) {
  const current = inspectChangeBindings(root, input), parsed = changeReviewSchema.parse(reviewInput);
  const review = parsed.reviewVersion === 1 ? parsed : {
    ...parsed,
    bindings: Object.fromEntries(Object.entries(parsed.implementations).map(([id, implementationDigest]) =>
      [id, { contractDigest: parsed.contractDigest, implementationDigest, rationale: parsed.rationale }])),
  };
  const findings: { id: string; code: string; message: string }[] = [];
  if (review.id !== current.id) findings.push({ id: current.id, code: 'wrong-contract', message: 'Review belongs to a different responsibility' });
  if (review.definitionDigest !== current.definitionDigest) findings.push({ id: current.id, code: 'scope-changed', message: 'Reconcile the changed owner/consumer/input inventory' });
  for (const implementation of current.implementations) {
    const binding = review.bindings[implementation.id];
    if (!binding) { findings.push({ id: implementation.id, code: 'missing-review', message: 'This implementation requires a reviewed contract binding' }); continue; }
    if (binding.contractDigest !== current.contractDigest) findings.push({ id: implementation.id, code: 'contract-changed', message: 'Reconcile and verify this implementation against the changed contract and evidence' });
    if (binding.implementationDigest !== implementation.implementationDigest) findings.push({ id: implementation.id, code: 'implementation-changed', message: 'Reframe changed requirements or explicitly reaffirm the unchanged contract, then verify' });
  }
  for (const id of Object.keys(review.bindings)) if (!current.implementations.some(item => item.id === id)) findings.push({ id, code: 'unknown-review', message: 'Review refers to an implementation absent from the current inventory' });
  return { ...current, state: findings.length ? 'stale' as const : 'current' as const, findings,
    review: { semantics: 'required', completeness: 'required', behaviorAndOwnership: 'separate-required-evidence' } };
}
