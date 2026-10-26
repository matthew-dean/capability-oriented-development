import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { z } from 'zod';
import { hash, reference } from './filesystem.js';
import { inspectChangeBindings, verifyChangeBindings } from './change-bindings.js';
import { inspectScipMap, refreshScipMap, scipMappingSchema } from './scip.js';
import { runWorkflow } from './workflow.js';

const text = z.string().trim().min(1);
const paths = z.array(text).refine(items => new Set(items).size === items.length, 'Duplicate paths');
const implementation = z.object({
  entrypoint: text,
  export: text,
  files: paths.default([]),
}).strict();

/** One authored format for every supported native stack. Expected values remain
 * domain data; the native checker must read them and observe real consumers.
 */
export const contractSchema = z.object({
  contractVersion: z.literal(1),
  id: text.regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, 'Use a stable filename-safe capability ID'),
  profile: z.enum(['javascript-library', 'csharp-library', 'vue-design-system']),
  responsibility: text,
  decision: z.object({
    action: z.enum(['reuse', 'configure', 'compose', 'extend', 'create']),
    need: text,
    considered: z.array(z.object({ candidate: text, finding: text }).strict()).min(1),
    rationale: text,
  }).strict(),
  owner: implementation,
  consumers: z.array(implementation.extend({
    id: text,
    examples: z.record(z.string(), z.unknown()).default({}),
    alternatives: z.object({
      wrapper: text,
      copy: text,
      unusedImport: text,
      override: text.optional(),
      additional: z.array(z.object({
        name: text,
        source: text,
        followsOwner: z.boolean(),
      }).strict()).default([]),
    }).strict(),
  }).strict()).min(1),
  rules: z.object({
    owns: z.array(text).min(1),
    consumerOwns: z.array(text),
    allowed: z.array(text).min(1),
    extend: text,
    forbidden: z.array(text).min(1),
  }).strict(),
  requirements: z.record(z.string(), z.unknown()).refine(value => Object.keys(value).length > 0, 'Describe the expected results'),
  checks: z.object({ entrypoint: text, files: paths }).strict(),
  mapping: z.object({
    producers: scipMappingSchema.shape.producers,
    symbols: z.array(text).default([]),
    additionalInputs: paths.default([]),
  }).strict().optional(),
}).strict().superRefine((contract, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  if (new Set(contract.consumers.map(item => item.id)).size !== contract.consumers.length) issue('Consumer IDs must be unique');
  if (contract.consumers.some(item => item.id === 'owner')) issue('The consumer ID "owner" is reserved');
  if (new Set(contract.consumers.map(item => item.entrypoint)).size !== contract.consumers.length) issue('Consumer entrypoints must be distinct');
  if (contract.consumers.some(item => item.entrypoint === contract.owner.entrypoint)) issue('Consumers must exercise a boundary outside the owner');
  if (contract.profile === 'csharp-library' && extname(contract.checks.entrypoint) !== '.csproj') issue('The C# checker must be a .csproj; it is rebuilt on every invocation');
  if (contract.profile !== 'csharp-library' && !/\.[cm]?js$/.test(contract.checks.entrypoint)) issue('The JavaScript/Vue checker must be a JavaScript entrypoint');
  if (contract.profile === 'vue-design-system' && contract.consumers.some(item => !item.alternatives.override)) issue('Vue consumers require a local-override counterexample');
});
export type CapabilityContract = z.input<typeof contractSchema>;

/** Profiles supply a predictable native command protocol: behavior, ownership,
 * changes. Commands receive the contract path, never a calibration case label.
 */
export function profileCommand(profile: z.infer<typeof contractSchema>['profile'], checker: string, contract: string, mode: string) {
  return profile === 'csharp-library'
    ? { command: 'dotnet', args: ['run', '--project', checker, '--', mode, contract], cwd: '.' }
    : { command: process.execPath, args: [checker, mode, contract], cwd: '.' };
}

function loadContract(rootPath: string, file: string) {
  const root = realpathSync(rootPath);
  const contractPath = reference(root, file);
  const contractSource = readFileSync(contractPath, 'utf8');
  const contract = contractSchema.parse(JSON.parse(contractSource));
  if (!file.endsWith('.json')) throw Error('The contract must have a .json filename');
  const reviewFile = file.replace(/\.json$/, '') + '.review.json';
  const ownerFiles = [...new Set([contract.owner.entrypoint, ...contract.owner.files])];
  const consumerFiles = contract.consumers.flatMap(item => [item.entrypoint, ...item.files]);
  const checkerFiles = [...new Set([contract.checks.entrypoint, ...contract.checks.files])];
  const cases = [
    { id: 'original', role: 'delegation', overlays: [] as { target: string; source: string }[] },
    ...contract.consumers.flatMap(consumer => {
      const alternatives = [
        { name: 'wrapper', role: 'composition', source: consumer.alternatives.wrapper },
        { name: 'copy', role: 'independent-copy', source: consumer.alternatives.copy },
        { name: 'unused-import', role: 'dead-owner-decoy', source: consumer.alternatives.unusedImport },
        ...(consumer.alternatives.override ? [{ name: 'override', role: 'policy-override', source: consumer.alternatives.override }] : []),
        ...consumer.alternatives.additional.map(item => ({
          name: item.name, role: item.followsOwner ? 'valid-alternative' : 'policy-override', source: item.source,
        })),
      ];
      return alternatives.map(item => ({
        id: `${consumer.id}/${item.name}`,
        role: item.role,
        overlays: [{ target: consumer.entrypoint, source: item.source }],
      }));
    }),
  ];
  const fixtureFiles = cases.flatMap(item => item.overlays.map(overlay => overlay.source));
  const inputs = [...new Set([file, ...ownerFiles, ...consumerFiles, ...checkerFiles, ...fixtureFiles])];
  for (const path of inputs) reference(root, path);
  const binding = {
    bindingVersion: 1, id: contract.id,
    contractInputs: [...new Set([file, ...checkerFiles, ...fixtureFiles])],
    implementations: [
      { id: 'owner', role: 'provider', inputs: ownerFiles },
      ...contract.consumers.map(item => ({ id: item.id, role: 'consumer', inputs: [...new Set([item.entrypoint, ...item.files])] })),
    ],
  };
  const command = (mode: string) => profileCommand(contract.profile, contract.checks.entrypoint, file, mode);
  const qualification = {
    qualificationVersion: 2, id: contract.id, responsibility: contract.responsibility,
    inputs, witness: [file, ...checkerFiles],
    behavior: command('behavior'), conformance: command('ownership'), cases,
  };
  const runtime = {
    runtimeContractVersion: 1, id: contract.id, responsibility: contract.responsibility, inputs,
    obligations: [
      { id: 'behavior', kind: 'behavior', claim: 'Actual consumers satisfy requirements', ...command('behavior') },
      { id: 'ownership', kind: 'ownership', claim: 'Real consumers follow owner changes', ...command('ownership') },
      { id: 'evolution', kind: 'evolution', claim: 'Owner changes propagate through the same qualified boundary', ...command('ownership') },
      { id: 'changes', kind: 'behavior', claim: 'Both contract-only and implementation-only disagreement are rejected', ...command('changes') },
    ],
  };
  return { root, file, contract, contractDigest: hash(contractSource), reviewFile, inputs, binding, qualification, runtime };
}

/** A small navigable view, not a generated graph dump. */
export function inspectContract(root: string, file: string) {
  const loaded = loadContract(root, file);
  const { contract, reviewFile, binding } = loaded;
  const review = existsSync(join(loaded.root, reviewFile))
    ? verifyChangeBindings(loaded.root, binding, JSON.parse(readFileSync(reference(loaded.root, reviewFile), 'utf8')))
    : null;
  return {
    id: contract.id, profile: contract.profile, responsibility: contract.responsibility,
    owner: contract.owner, consumers: contract.consumers.map(({ id, entrypoint, export: symbol }) => ({ id, entrypoint, export: symbol })),
    decision: contract.decision, rules: contract.rules, requirements: contract.requirements,
    checks: ['behavior', 'ownership', 'changes'].map(mode => ({ mode, ...profileCommand(contract.profile, contract.checks.entrypoint, file, mode) })),
    counterexamples: loaded.qualification.cases.map(item => ({ name: item.id, expected: ['independent-copy', 'dead-owner-decoy', 'policy-override'].includes(item.role) ? 'reject ownership; preserve behavior' : 'accept', replacements: item.overlays })),
    review: { file: reviewFile, state: review?.state ?? 'missing', findings: review?.findings ?? [] },
    files: loaded.inputs,
    sourceMap: inspectContractMap(loaded),
  };
}

function mapDefinition(loaded: ReturnType<typeof loadContract>) {
  const mapping = loaded.contract.mapping;
  if (!mapping) throw Error('No mapping producers configured in this contract');
  return scipMappingSchema.parse({
    scipMappingVersion: 1,
    producers: mapping.producers,
    additionalInputs: mapping.additionalInputs,
    capabilities: mapping.symbols.length ? [{ id: loaded.contract.id, contract: loaded.file, symbols: mapping.symbols }] : [],
  });
}

function inspectContractMap(loaded: ReturnType<typeof loadContract>) {
  if (!loaded.contract.mapping) return { state: 'not-configured', explanation: 'Owner and consumers are declared above; no generated index is being claimed.' };
  const path = `.cod/cache/${loaded.contract.id}.json`;
  if (!existsSync(join(loaded.root, path))) return { state: 'missing', path };
  const snapshot = JSON.parse(readFileSync(reference(loaded.root, path), 'utf8'));
  if (JSON.stringify(scipMappingSchema.parse(snapshot.mapping)) !== JSON.stringify(mapDefinition(loaded))) {
    return { state: 'stale', path, explanation: 'Map configuration differs from the current contract. Refresh it.' };
  }
  return { ...inspectScipMap(loaded.root, snapshot), path };
}

/** The same capability file owns optional SCIP setup. Only its derived map is
 * written; callers do not maintain a second mapping-definition JSON file.
 */
export async function refreshContractMap(root: string, file: string, options: { allowExecution: boolean; timeoutMs?: number }) {
  const loaded = loadContract(root, file);
  return refreshScipMap(loaded.root, mapDefinition(loaded), `.cod/cache/${loaded.contract.id}.json`, options);
}

/** Record an explicit explanation and current identities, never a test result.
 * The destination is derived from the contract and may not escape through a link.
 */
export function recordContractReview(root: string, file: string, rationale: string) {
  if (!rationale.trim()) throw Error('Explain what was reviewed with --reason');
  const loaded = loadContract(root, file);
  const target = join(loaded.root, loaded.reviewFile);
  // The contract's parent already exists and has been resolved inside root.
  if (realpathSync(dirname(target)) !== dirname(target)) throw Error('Review destination cannot use a symlink directory');
  if (existsSync(target) && lstatSync(target).nlink > 1) throw Error('Review destination cannot be a hard link');
  if (existsSync(target) && reference(loaded.root, loaded.reviewFile) !== realpathSync(target)) throw Error('Review destination cannot be a symlink');
  if (loaded.inputs.some(input => reference(loaded.root, input) === target)) throw Error('Review cannot overwrite a registered input');
  const current = inspectChangeBindings(loaded.root, loaded.binding);
  const review = {
    reviewVersion: 2, id: current.id, definitionDigest: current.definitionDigest,
    contractDigest: current.contractDigest,
    implementations: Object.fromEntries(current.implementations.map(item => [item.id, item.implementationDigest])),
    rationale: rationale.trim(),
  };
  writeFileSync(target, JSON.stringify(review, null, 2) + '\n');
  return { id: current.id, file: loaded.reviewFile, state: 'recorded', next: 'Run cod verify; recording review does not establish conformance.' };
}

/** Compile the authored contract in memory and run the existing strict workflow.
 * No runtime/qualification/binding/workflow JSON files are generated or maintained.
 */
export async function verifyContract(root: string, file: string, options: { allowExecution: boolean; timeoutMs?: number }) {
  if (!options.allowExecution) throw Error('Contract checks require explicit execution authorization');
  const loaded = loadContract(root, file);
  const { contract, reviewFile } = loaded;
  if (!existsSync(join(loaded.root, reviewFile))) {
    return { id: contract.id, state: 'unresolved', gaps: [`Review is missing: ${reviewFile}. Read the contract and record a review with cod review.`] };
  }
  const sourceMap = inspectContractMap(loaded);
  if (loaded.contract.mapping && sourceMap.state !== 'current') {
    return { id: contract.id, state: 'unresolved', gaps: ['Configured source map is missing or stale. Run cod refresh-map after review and before verification.'] };
  }
  const workflow = {
    workflowVersion: 1, id: contract.id,
    decision: { action: contract.decision.action, rationale: contract.decision.rationale },
    contracts: [file], qualifications: [{ file, contracts: [contract.id] }],
    requireChangeBindings: true, changeBindings: [{ definition: file, review: reviewFile }],
  };
  const initial = loaded.contractDigest;
  const result = await runWorkflow(loaded.root, workflow, options, (path, kind) => {
    if (kind === 'runtime') return loaded.runtime;
    if (kind === 'qualification') return loaded.qualification;
    if (kind === 'bindings') return loaded.binding;
    return JSON.parse(readFileSync(reference(loaded.root, path), 'utf8'));
  });
  // The workflow fingerprints the contract and all derived inputs across the run.
  // Include loading in that window as well; a command cannot rewrite its promises.
  if (initial !== hash(readFileSync(reference(loaded.root, file)))) result.state = 'unresolved';
  if (loaded.contract.mapping && inspectContractMap(loaded).state !== 'current') {
    result.state = 'unresolved';
    result.gaps.push('Source map became stale during verification');
  }
  return result;
}
