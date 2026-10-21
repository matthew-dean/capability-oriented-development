import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { hash, reference } from './filesystem.js';

const text = z.string().trim().min(1);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const checks = z.object({ behavior: text.optional(), ownership: text.optional(), evolution: text.optional(), compatibility: text.optional(), twoWay: text.optional() }).strict();
const revision = text.refine(v => !/^(?:refs\/heads\/)?(?:main|master|head|latest|develop)$/i.test(v), 'Use an immutable contract revision, not a floating branch/tag');
export const systemMapSchema = z.object({
  systemVersion: z.literal(1), id: text,
  repositories: z.array(z.object({ id: text, location: text, inspectedRevision: text.optional() }).strict()).min(1).max(200),
  capabilities: z.array(z.object({
    id: text, responsibility: text,
    owner: z.object({ repository: text, team: text.optional() }).strict(),
    implementations: z.array(z.object({ repository: text, reference: text, role: z.enum(['current', 'candidate', 'retired']) }).strict()).max(100),
    contract: z.object({ repository: text, revision, artifact: text, sha256: digest, source: text }).strict().optional(),
    dependsOn: z.array(text).max(200).default([]),
    consumers: z.array(z.object({ id: text, repository: text, entrypoint: text, contractSha256: digest.optional(), checks }).strict()).max(200),
  }).strict()).min(1).max(1000),
}).strict().superRefine((v, c) => {
  for (const [name, ids] of [['repository', v.repositories.map(r => r.id)], ['capability', v.capabilities.map(r => r.id)]] as const) {
    if (new Set(ids).size !== ids.length) c.addIssue({ code: 'custom', message: `Duplicate ${name} IDs` });
  }
  for (const cap of v.capabilities) {
    if (new Set(cap.consumers.map(r => r.id)).size !== cap.consumers.length) c.addIssue({ code: 'custom', message: `Duplicate consumer IDs in ${cap.id}` });
    if (new Set(cap.dependsOn).size !== cap.dependsOn.length) c.addIssue({ code: 'custom', message: `Duplicate dependencies in ${cap.id}` });
  }
});
export type SystemMap = z.input<typeof systemMapSchema>;

/** Resolves a supplied cross-repository inventory and exported contract identities. Never fetches, executes or certifies conformance. */
export function inspectSystemMap(root: string, input: unknown) {
  const map = systemMapSchema.parse(input), repos = new Set(map.repositories.map(r => r.id)), capabilities = new Set(map.capabilities.map(c => c.id));
  const gaps: { capability: string; code: string; message: string }[] = [];
  const add = (capability: string, code: string, message: string) => gaps.push({ capability, code, message });
  const repo = (id: string, cap: string) => { if (!repos.has(id)) add(cap, 'unknown-repository', `Repository ${id} is not registered`); };
  for (const cap of map.capabilities) {
    repo(cap.owner.repository, cap.id);
    if (!cap.owner.team) add(cap.id, 'unassigned-owner', 'Name an accountable owner; a repository alone cannot accept a change');
    if (!cap.implementations.some(i => i.role === 'current')) add(cap.id, 'no-current-implementation', 'Candidate/retired source does not establish a current implementation');
    for (const implementation of cap.implementations) repo(implementation.repository, cap.id);
    for (const dep of cap.dependsOn) {
      if (!capabilities.has(dep)) add(cap.id, 'unknown-capability', `Dependency ${dep} is not mapped`);
      if (dep === cap.id) add(cap.id, 'self-dependency', 'A capability cannot name itself as a dependency');
    }
    let artifactMatches = false;
    if (!cap.contract) add(cap.id, 'missing-contract-lock', 'Export and pin the authoritative contract artifact');
    else {
      repo(cap.contract.repository, cap.id);
      if (cap.contract.repository !== cap.owner.repository) add(cap.id, 'contract-authority-mismatch', 'The contract must come from the authoritative owner; model an adapter as its own capability');
      try {
        artifactMatches = hash(readFileSync(reference(root, cap.contract.artifact))) === cap.contract.sha256;
        if (!artifactMatches) add(cap.id, 'contract-digest-mismatch', 'Exported bytes do not match the pinned authoritative contract');
      } catch { add(cap.id, 'unavailable-contract', 'Contract artifact is missing, unsafe or outside the supplied root'); }
    }
    if (!cap.consumers.length) add(cap.id, 'unmapped-consumers', 'Consumer completeness has not been established');
    for (const consumer of cap.consumers) {
      repo(consumer.repository, cap.id);
      if (!cap.contract || !artifactMatches || consumer.contractSha256 !== cap.contract.sha256) add(cap.id, 'unreconciled-consumer', `${consumer.id} is not bound to the available contract bytes`);
      for (const kind of ['behavior', 'ownership', 'evolution', 'twoWay'] as const) if (!consumer.checks[kind]) add(cap.id, 'missing-check-reference', `${consumer.id}: missing ${kind} verification reference`);
      if (consumer.repository !== cap.owner.repository && !consumer.checks.compatibility) add(cap.id, 'missing-compatibility-reference', `${consumer.id}: cross-repository compatibility evidence is not linked`);
    }
  }
  return { systemVersion: 1 as const, id: map.id, state: gaps.length ? 'unresolved' : 'resolved', conformance: 'not-evaluated' as const,
    repositories: map.repositories, capabilities: map.capabilities, gaps,
    authority: 'Read-only inventory and exported-byte inspection. Check references, source roles, revision labels and owner names are declarations, not executed tests, authenticated provenance or deployment proof. No network access or project commands are run. A resolved map is not COD conformance or deployment approval.' };
}
