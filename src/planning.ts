import { discover } from './discovery.js';
import { posix } from 'node:path';
import type { CapabilityIndex, DiscoveryQuery } from './types.js';
/** A concise inspection packet, not a semantic decision or execution plan. */
export function planReuse(index: CapabilityIndex, query: DiscoveryQuery) {
  const candidates = index.ok ? discover(index, { ...query, limit: Math.min(query.limit ?? 3, 10) }).results : [];
  const path = (manifest: string, file: string) => posix.normalize(posix.join(posix.dirname(manifest), file));
  return {
    query, validationOk: index.ok, digest: index.digest, revision: index.revision,
    diagnostics: index.diagnostics,
    candidates: candidates.map(c => ({id:c.id, intent:c.intent, owner:c.owner, status:c.status, contract:c.manifest,
      operations:c.operations.map(o => ({name:o.name, file:o.source, export:o.export, declaration:o.declaration, line:o.line, signature:o.signature})),
      supportedVariation:c.extensions, constraints:c.invariants, requires:c.requires,
      evolution: { state: c.evolution ? 'documented' as const : 'not-documented' as const, guidance: (c.evolution?.guidance ?? []).map(file => path(c.manifest, file)) },
      inspect:c.examples.map(f => path(c.manifest,f)), suggestedTests:c.tests.map(f => path(c.manifest,f)),
      reasons:c.reasons, contractFit:c.contractFit })),
    decisionRequired: ['Check current source against requested inputs, effects and defaults; identify shared invariants below the enclosing service/file. Inspect supported variation even when the request does not name the owner.', 'Reuse fitting shared rules across demonstrated consumers; shared owner/state alone does not prove policy reuse. Keep operation-specific constraints and one-off responsibilities local.' , 'If the option is missing, read the owner’s evolution guidance and inspect related controls and native conventions before adding an API. An absent option does not permit a local bypass.', 'Compare the smallest adequate existing option or composition before extending or creating. State the concrete unmet requirement; do not invent a shared layer for hypothetical consumers.'],
    execution: 'not-established', caveat: 'Candidate selection is lexical. This packet neither proves fit nor executes suggested tests. No match is not proof that new code is needed.'
  };
}
