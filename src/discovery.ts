import type { CapabilityIndex, DiscoveryQuery } from './types.js';
const terms = (s: string): string[] => [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))];
export function discover(index: CapabilityIndex, query: DiscoveryQuery) {
  const tokens = terms(query.intent);
  const results = index.capabilities.filter(c => c.status !== 'retired' && (!query.domain || c.id.startsWith(`${query.domain}.`) || c.id === query.domain)).map(c => {
    const words = [c.id, c.intent, ...c.operations.map(o => o.name), ...c.extensions].map(terms);
    const invariants = terms(c.invariants.join(' '));
    const matches = tokens.filter(t => words.some(w => w.includes(t)) || invariants.includes(t)), proximity = (query.affectedFiles ?? []).some(f => c.operations.some(o => o.source === f || o.declaration === f) || c.manifest === f);
    const score = matches.reduce((n, t) => n + (words[0]!.includes(t) ? 3 : words[1]!.includes(t) ? 2 : 1), 0) + (proximity ? 2 : 0);
    return { ...c, score, reasons: [...matches.map(t => `token:${t}`), ...matches.filter(t => invariants.includes(t)).map(t => `invariant:${t}`), ...(proximity ? ['affected-file'] : [])], contractFit: 'unknown' as const, evidence: { examples: c.examples, tests: c.tests, execution: 'not-established' as const } };
  }).filter(c => c.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, Math.min(100, query.limit ?? 10)));
  return { query, validationOk: index.ok, diagnostics: index.diagnostics, digest: index.digest, revision: index.revision, ranking: 'lexical-with-source-proximity' as const, results, caveat: 'Candidate matches do not prove contract fit, semantic equivalence, or novelty.' };
}
