import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { contained, hash, portable, reference } from './filesystem.js';
import { verifyRuntimeContract } from './runtime-contracts.js';

const commandSchema = z.object({ command: z.string().min(1), args: z.array(z.string()), cwd: z.string().default('.') }).strict();
/** Producer commands write official `scip print --json` output to a fresh {output} argument. */
export const scipMappingSchema = z.object({
  scipMappingVersion: z.literal(1),
  additionalInputs: z.array(z.string().min(1)).default([]),
  producers: z.array(commandSchema).min(1),
  capabilities: z.array(z.object({
    id: z.string().min(1), contract: z.string().min(1),
    symbols: z.array(z.string().min(1).refine(s => !s.startsWith('local '), 'Capability bindings require global symbols')).min(1),
  }).strict()).default([]),
}).strict().superRefine((value, context) => {
  if (new Set(value.capabilities.map(c => c.id)).size !== value.capabilities.length) context.addIssue({ code: 'custom', message: 'Duplicate capability IDs' });
  if (value.producers.some(p => !p.args.some(a => a.includes('{output}')))) context.addIssue({ code: 'custom', message: 'Each producer needs a fresh {output} argument' });
});
export type ScipMapping = z.input<typeof scipMappingSchema>;
const occurrenceSchema = z.object({ symbol: z.string().default(''), symbol_roles: z.number().int().nonnegative().default(0), range: z.array(z.number().int().nonnegative()).default([]) }).passthrough();
const indexSchema = z.object({
  metadata: z.object({ project_root: z.string(), tool_info: z.object({ name: z.string(), version: z.string().default('') }).passthrough() }).passthrough(),
  documents: z.array(z.object({ relative_path: z.string(), language: z.string().default(''), text: z.string().optional(), position_encoding: z.number().int().default(0), occurrences: z.array(occurrenceSchema).default([]) }).passthrough()).default([]),
}).passthrough();
const locationSchema = z.object({ file: z.string(), range: z.array(z.number().int().nonnegative()), positionEncoding: z.number().int() });
const graphSchema = z.object({
  definitions: z.record(z.string(), z.array(locationSchema)),
  references: z.array(z.object({ file: z.string(), symbol: z.string(), definitions: z.array(z.string()) })),
  documents: z.array(z.string()),
  producers: z.array(z.object({ name: z.string(), version: z.string(), indexDigest: z.string() })),
});
export const scipSnapshotSchema = z.object({
  scipSnapshotVersion: z.literal(1), mapping: scipMappingSchema,
  sources: z.record(z.string(), z.string().nullable()), graph: graphSchema,
}).strict();
export type ScipSnapshot = z.infer<typeof scipSnapshotSchema>;

function sourceState(root: string, additionalInputs: string[] = []): Record<string, string | null> {
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--deduplicate', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
  const names = [...new Set([...tracked, ...additionalInputs])].sort();
  return Object.fromEntries(names.map(name => {
    if (isAbsolute(name) || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..' || part === '.git')) throw Error('Noncanonical source input');
    const path = resolve(root, name);
    if (!contained(root, path)) throw Error('Git source path escapes root');
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat) return [name, null]; // A tracked deletion is part of the source state.
    if (!stat.isFile() || !contained(root, realpathSync(path))) throw Error(`Unsupported source entry: ${name}`);
    return [name, hash(readFileSync(path))];
  }));
}
function changes(before: Record<string, string | null>, after: Record<string, string | null>) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(file => before[file] !== after[file]).sort();
}
function globalKey(symbol: string, file: string) {
  // A local SCIP identifier has meaning only within its document.
  return symbol.startsWith('local ') ? JSON.stringify([file, symbol]) : symbol;
}
/** Import only indexed occurrences; a reference is not a call, policy delegation or a complete consumer inventory. */
export function importScipIndexes(rootPath: string, inputs: unknown[]) {
  const root = realpathSync(rootPath);
  const graph: z.infer<typeof graphSchema> = { definitions: {}, references: [], documents: [], producers: [] };
  const occurrences: { file: string; symbol: string }[] = [];
  for (const input of inputs) {
    const index = indexSchema.parse(input);
    const project = realpathSync(fileURLToPath(index.metadata.project_root));
    if (!contained(root, project)) throw Error('SCIP project_root is outside the repository');
    graph.producers.push({ name: index.metadata.tool_info.name, version: index.metadata.tool_info.version, indexDigest: hash(JSON.stringify(input)) });
    const seen = new Set<string>();
    for (const document of index.documents) {
      const path = document.relative_path;
      if (!path || isAbsolute(path) || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..') || /^[a-z]:/i.test(path)) throw Error(`Noncanonical SCIP document path: ${path}`);
      if (seen.has(path)) throw Error(`Duplicate SCIP document: ${path}`);
      seen.add(path);
      const absolute = reference(project, path);
      if (!lstatSync(absolute).isFile() || realpathSync(absolute) !== absolute) throw Error('SCIP documents cannot be symlinks');
      const file = portable(relative(root, absolute));
      if (document.text !== undefined && document.text !== readFileSync(absolute, 'utf8')) throw Error(`Indexed text differs from current source: ${file}`);
      graph.documents.push(file);
      for (const occurrence of document.occurrences) {
        if (!occurrence.symbol) continue;
        const range = occurrence.range;
        if ((range.length !== 3 && range.length !== 4) || (range.length === 3 && range[2]! < range[1]!) || (range.length === 4 && (range[2]! < range[0]! || (range[2] === range[0] && range[3]! < range[1]!)))) throw Error('Invalid SCIP occurrence range');
        const symbol = globalKey(occurrence.symbol, file);
        if (occurrence.symbol_roles & 1) {
          const definitions = Object.hasOwn(graph.definitions, symbol) ? graph.definitions[symbol]! : [];
          definitions.push({ file, range, positionEncoding: document.position_encoding });
          Object.defineProperty(graph.definitions, symbol, { value: definitions, enumerable: true, writable: true, configurable: true });
        } else occurrences.push({ file, symbol });
      }
    }
  }
  if (!graph.documents.length) throw Error('No indexed source documents');
  graph.documents = [...new Set(graph.documents)].sort();
  for (const occurrence of occurrences) graph.references.push({ ...occurrence, definitions: [...new Set((Object.hasOwn(graph.definitions, occurrence.symbol) ? graph.definitions[occurrence.symbol] : undefined)?.map(d => d.file) ?? [])].sort() });
  return graph;
}

function destination(root: string, path: string) {
  if (!path || isAbsolute(path) || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..' || p === '.git')) throw Error('Snapshot destination must be a canonical repository-relative path');
  const file = resolve(root, path);
  let parent = dirname(file);
  while (!existsSync(parent)) parent = dirname(parent);
  if (!contained(root, realpathSync(parent)) || (existsSync(file) && (!lstatSync(file).isFile() || !contained(root, realpathSync(file))))) throw Error('Unsafe snapshot destination');
  // Generated maps are caches, not authored contracts or per-change Git ledgers.
  execFileSync('git', ['check-ignore', '-q', '--', path], { cwd: root });
  if (Object.hasOwn(sourceState(root), path)) throw Error('Snapshot destination must be ignored and untracked');
  return file;
}
/** Refresh producers against a stable Git source inventory; this executes trusted commands, not a sandbox. */
export async function refreshScipMap(rootPath: string, input: unknown, output: string, options: { allowExecution: boolean; timeoutMs?: number }) {
  if (!options.allowExecution) throw Error('SCIP refresh requires explicit execution authorization');
  const root = realpathSync(rootPath), mapping = scipMappingSchema.parse(input), file = destination(root, output);
  for (const capability of mapping.capabilities) reference(root, capability.contract);
  const sources = sourceState(root, mapping.additionalInputs), inputs = Object.keys(sources).filter(path => sources[path] !== null);
  if (!inputs.length) throw Error('No repository source inputs');
  if (mapping.additionalInputs.some(path => sources[path] === null)) throw Error('Additional source inputs must exist before indexing');
  if (mapping.capabilities.some(c => !Object.hasOwn(sources, c.contract) || sources[c.contract] === null)) throw Error('Capability contracts must be nonignored repository source inputs');
  const scratch = mkdtempSync(join(tmpdir(), 'cod-scip-'));
  try {
    const outputs = mapping.producers.map((_, i) => join(scratch, `${i}.json`));
    const execution = await verifyRuntimeContract(root, { runtimeContractVersion: 1, id: 'scip-production', responsibility: 'Produce source mapping data', inputs,
      obligations: mapping.producers.map((producer, i) => ({ ...producer, args: producer.args.map(a => a.replaceAll('{output}', outputs[i]!)), id: String(i), kind: 'behavior', claim: 'Produce SCIP JSON from current source' })) }, options);
    const changed = changes(sources, sourceState(root, mapping.additionalInputs));
    if (execution.state !== 'verified' || changed.length) return { state: 'unresolved' as const, changedFiles: changed, execution, reason: 'Producer failed or source changed during indexing; previous snapshot retained' };
    const graph = importScipIndexes(root, outputs.map(path => JSON.parse(readFileSync(path, 'utf8'))));
    const unboundDocuments = graph.documents.filter(path => !Object.hasOwn(sources, path) || sources[path] === null);
    if (unboundDocuments.length) return { state: 'unresolved' as const, unboundDocuments, reason: 'Indexed documents outside the captured Git input inventory; previous snapshot retained' };
    const finalChanges = changes(sources, sourceState(root, mapping.additionalInputs));
    if (finalChanges.length) return { state: 'unresolved' as const, changedFiles: finalChanges, reason: 'Source changed while importing; previous snapshot retained' };
    const snapshot: ScipSnapshot = { scipSnapshotVersion: 1, mapping, sources, graph };
    mkdirSync(dirname(file), { recursive: true });
    const staging = mkdtempSync(join(dirname(file), '.scip-'));
    try { const temporary = join(staging, 'snapshot.json'); writeFileSync(temporary, JSON.stringify(snapshot) + '\n', { flag: 'wx' }); renameSync(temporary, file); } finally { rmSync(staging, { recursive: true, force: true }); }
    return { state: 'mapped' as const, diagnostics: execution.results.map(result => ({ producer: result.id, stderr: result.stderr })), path: output, documents: graph.documents.length, capabilities: mapping.capabilities.length, unresolvedBindings: mapping.capabilities.filter(c => c.symbols.some(s => !Object.hasOwn(graph.definitions, s))).map(c => c.id), authority: 'Configured producers executed against stable captured source inputs. Mapping does not establish contract conformance, complete coverage or semantic reuse.' };
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

/** Read-only invalidation and reverse-reference impact, including unchanged consumers. */
export function inspectScipMap(rootPath: string, input: unknown, options: { symbol?: string } = {}) {
  const root = realpathSync(rootPath), snapshot = scipSnapshotSchema.parse(input), changedFiles = changes(snapshot.sources, sourceState(root, snapshot.mapping.additionalInputs));
  const affected = new Set(changedFiles), documents = new Set(snapshot.graph.documents);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const reference of snapshot.graph.references) if (reference.definitions.some(file => affected.has(file)) && !affected.has(reference.file)) { affected.add(reference.file); expanded = true; }
  }
  const unknownScope = changedFiles.some(file => !documents.has(file));
  const capabilities = snapshot.mapping.capabilities.map(capability => {
    const definitions = capability.symbols.flatMap(symbol => Object.hasOwn(snapshot.graph.definitions, symbol) ? snapshot.graph.definitions[symbol]! : []);
    const files = [...new Set(definitions.map(d => d.file))].sort();
    const consumers = [...new Set(snapshot.graph.references.filter(r => capability.symbols.includes(r.symbol)).map(r => r.file))].sort();
    return { ...capability, definitions, consumers, unresolvedSymbols: capability.symbols.filter(s => !Object.hasOwn(snapshot.graph.definitions, s)), needsReconciliation: unknownScope || affected.has(capability.contract) || [...files, ...consumers].some(f => affected.has(f)) };
  });
  const matchingDefinitions = options.symbol === undefined ? undefined : Object.fromEntries(Object.entries(snapshot.graph.definitions).filter(([symbol]) => !symbol.startsWith('[') && symbol.includes(options.symbol!)));
  return { ...(matchingDefinitions === undefined ? {} : { matchingDefinitions, matchingReferences: snapshot.graph.references.filter(r => r.symbol.includes(options.symbol!)) }), state: changedFiles.length ? 'stale' as const : 'current' as const, changedFiles, affectedFiles: [...affected].sort(), unknownScope, capabilities, unresolvedReferenceCount: snapshot.graph.references.filter(r => !r.definitions.length).length, producers: snapshot.graph.producers,
    authority: 'Freshness is relative to the recorded producer run and Git input inventory. Reindex stale maps; review capability meaning and unknown coverage. References are not calls or proof of policy reuse. No contracts or reviews were modified.' };
}
