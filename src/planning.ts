import { discover } from './discovery.js';
import { posix } from 'node:path';
import type { CapabilityIndex, DiscoveryQuery } from './types.js';
/** A concise inspection packet, not a semantic decision or execution plan. */
export function planReuse(index: CapabilityIndex, query: DiscoveryQuery) {
  const found = discover(index, { ...query, limit: Math.min(query.limit ?? 3, 10) });
  const path = (manifest: string, file: string) => posix.normalize(posix.join(posix.dirname(manifest), file));
  return {
    query, validationOk: index.ok, digest: index.digest, revision: index.revision,
    diagnostics: index.diagnostics,
    candidates: found.results.map(c => ({id:c.id, intent:c.intent, owner:c.owner, status:c.status,
      operations:c.operations.map(o => ({name:o.name, file:o.source, export:o.export, signature:o.signature})),
      supportedVariation:c.extensions, constraints:c.invariants, requires:c.requires,
      inspect:c.examples.map(f => path(c.manifest,f)), suggestedTests:c.tests.map(f => path(c.manifest,f)),
      reasons:c.reasons, contractFit:c.contractFit })),
    decisionRequired: ['Check current source against requested inputs, effects and defaults; identify shared invariants below the enclosing service/file. Inspect supported variation even when the request does not name the owner.', 'Reuse fitting shared rules across demonstrated consumers; shared owner/state alone does not prove policy reuse. Keep operation-specific constraints and one-off responsibilities local.' , 'Compare the smallest adequate existing option or composition before extending or creating. State the concrete unmet requirement; do not invent a shared layer for hypothetical consumers.'],
    execution: 'not-established', caveat: 'Candidate selection is lexical. This packet neither proves fit nor executes suggested tests. No match is not proof that new code is needed.'
  };
}
