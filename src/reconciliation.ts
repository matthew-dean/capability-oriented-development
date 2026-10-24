import { posix } from 'node:path';
import { z } from 'zod';
import { indexDigest } from './indexer.js';
import type { CapabilityIndex } from './types.js';
const operation = z.object({ name: z.string(), file: z.string(), export: z.string(), source: z.string(), declaration: z.string().nullable(), line: z.number().nullable(), signature: z.string().nullable() });
const snapshot = z.object({ indexVersion: z.literal(1), compilerVersion: z.string(), ok: z.boolean(), diagnostics: z.array(z.object({ code: z.string(), severity: z.enum(['error', 'warning']), file: z.string(), message: z.string() })), capabilities: z.array(z.object({ schemaVersion: z.literal(1), id: z.string(), intent: z.string(), owner: z.string(), status: z.enum(['proposed', 'experimental', 'stable', 'deprecated', 'retired']), operations: z.array(operation), requires: z.array(z.string()), extensions: z.array(z.string()), examples: z.array(z.string()), tests: z.array(z.string()), invariants: z.array(z.string()), evolution: z.object({guidance:z.array(z.string()).min(1)}).optional(), manifest: z.string() })), exports: z.array(z.object({ file: z.string(), export: z.string(), signature: z.string(), owners: z.array(z.string()) })), files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)), revision: z.object({ commit: z.string().nullable(), dirty: z.boolean().nullable() }), digest: z.string().regex(/^[a-f0-9]{64}$/) });
export function parseIndex(value: unknown): CapabilityIndex {
  const parsed = snapshot.parse(value);
  const index = {...parsed, capabilities: parsed.capabilities.map(({evolution, ...capability}) => evolution ? {...capability, evolution} : capability)};
  if (indexDigest(index) !== index.digest) throw new Error('Index digest does not match its contents');
  return index;
}
export function reconcile(before: CapabilityIndex, after: CapabilityIndex) {
  const changedFiles = [...new Set([...Object.keys(before.files), ...Object.keys(after.files)])].filter(f => before.files[f] !== after.files[f]).sort();
  const old = new Map(before.capabilities.map(c => [c.id, c])), current = new Map(after.capabilities.map(c => [c.id, c]));
  const changes: { capability: string; kind: string; operation: string | null; review: string }[] = [];
  for (const id of [...new Set([...old.keys(), ...current.keys()])].sort()) {
    const a = old.get(id), b = current.get(id);
    if (!a || !b) { changes.push({ capability: id, kind: a ? 'removed-capability' : 'added-capability', operation: null, review: a ? 'potentially-breaking' : 'ownership-and-cohesion' }); continue; }
    if (a.owner !== b.owner || a.intent !== b.intent || a.status !== b.status || JSON.stringify([a.requires, a.extensions, a.invariants, a.examples, a.tests, a.evolution]) !== JSON.stringify([b.requires, b.extensions, b.invariants, b.examples, b.tests, b.evolution])) changes.push({ capability: id, kind: 'metadata-changed', operation: null, review: 'semantic-review' });
    const ao = new Map(a.operations.map(o => [o.name, o])), bo = new Map(b.operations.map(o => [o.name, o]));
    for (const name of [...new Set([...ao.keys(), ...bo.keys()])].sort()) {
      const x = ao.get(name), y = bo.get(name);
      if (!x || !y) changes.push({ capability: id, kind: x ? 'removed-operation' : 'added-operation', operation: name, review: x ? 'potentially-breaking' : 'dependent-evidence' });
      else if (x.signature !== y.signature) changes.push({ capability: id, kind: 'signature-changed', operation: name, review: 'potentially-breaking' });
      else if (x.source !== y.source || x.export !== y.export || x.declaration !== y.declaration) changes.push({ capability: id, kind: 'implementation-moved', operation: name, review: 'structural' });
    }
  }
  // Authored contracts and executable evidence can live outside TypeScript.
  // Fingerprinting them must also route impact back to their declared owner.
  for (const id of [...new Set([...old.keys(), ...current.keys()])].sort()) {
    const evidence = [old.get(id), current.get(id)].flatMap(c => c ?
      [...c.examples, ...c.tests].map(path => posix.normalize(posix.join(posix.dirname(c.manifest), path))) : []);
    if (evidence.some(path => changedFiles.includes(path))) changes.push({ capability: id, kind: 'evidence-changed', operation: null, review: 'semantic-review' });
    const guides = [old.get(id), current.get(id)].flatMap(c => c ? (c.evolution?.guidance ?? []).map(file => posix.normalize(posix.join(posix.dirname(c.manifest), file))) : []);
    if (guides.some(file => changedFiles.includes(file))) changes.push({ capability: id, kind: 'evolution-guidance-changed', operation: null, review: 'semantic-review' });
  }
  const affected = new Set(changes.map(c => c.capability));
  // Without an import graph, source changes conservatively invalidate all capabilities.
  if (changedFiles.some(f => /\.(?:[cm]?ts|tsx)$/.test(f))) for (const c of [...before.capabilities, ...after.capabilities]) affected.add(c.id);
  for (const c of [...before.capabilities, ...after.capabilities]) if (changedFiles.includes(c.manifest)) affected.add(c.id);
  let grew = true;
  while (grew) { grew = false; for (const c of [...before.capabilities, ...after.capabilities]) if (!affected.has(c.id) && c.requires.some(d => affected.has(d))) { affected.add(c.id); grew = true; } }
  const unownedExports = after.exports.filter(e => e.owners.length === 0);
  const newlyUnowned = unownedExports.some(e => !before.exports.some(oldExport => oldExport.file === e.file && oldExport.export === e.export && oldExport.owners.length === 0));
  return { ok: after.ok, before: before.digest, after: after.digest, changedFiles, changes, affectedCapabilities: [...affected].sort(), recommendedTests: [...new Set([...affected].flatMap(id => { const c = current.get(id); return c ? c.tests.map(t => `${c.manifest.slice(0, c.manifest.lastIndexOf('/') + 1)}${t.replace(/^\.\//, '')}`) : []; }))].sort(), unownedExports, diagnostics: after.diagnostics, verification: { scan: 'full', testsExecuted: false, semanticCompatibility: 'unknown' }, reviewRequired: changes.some(c => c.review !== 'structural') || newlyUnowned || !after.ok, caveat: 'Signature differences flag potential breakage; equal signatures do not prove behavioral compatibility.' };
}
