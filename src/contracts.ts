import { existsSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { contained, hash, portable, reference, writeOwnedSource } from './filesystem.js';
import { inspectChangeBindings, verifyChangeBindings } from './change-bindings.js';
import { inspectScipMap, refreshScipMap, scipMappingSchema } from './scip.js';
import { runWorkflow } from './workflow.js';
import { dependencySchema, dependencyVersion } from './dependencies.js';
import { sourceReplacementsSchema, replacementSources, type VariantQualification } from './variant-qualification.js';
import { verifyRuntimeContract, withExecutionScope } from './runtime-contracts.js';

const text = z.string().trim().min(1);
const paths = z.array(text).refine(items => new Set(items).size === items.length, 'Duplicate paths');
const alternative = z.union([text, sourceReplacementsSchema]);
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
      wrapper: alternative,
      copy: alternative,
      unusedImport: alternative,
      override: alternative.optional(),
      additional: z.array(z.object({
        name: text,
        source: alternative,
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
  dependencies: z.array(dependencySchema).default([]),
  requirements: z.record(z.string(), z.unknown()).refine(value => Object.keys(value).length > 0, 'Describe the expected results'),
  checks: z.object({ entrypoint: text, files: paths, repeatable: z.boolean().default(false), precompile: z.boolean().default(false), budgetMs: z.number().int().positive().safe().optional() }).strict(),
  mapping: z.object({
    producers: scipMappingSchema.shape.producers,
    symbols: z.array(text).default([]),
    additionalInputs: paths.default([]),
  }).strict().optional(),
}).strict().superRefine((contract, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  if (new Set(contract.dependencies.map(item => item.id)).size !== contract.dependencies.length) issue('Dependency IDs must be unique');
  if (new Set(contract.consumers.map(item => item.id)).size !== contract.consumers.length) issue('Consumer IDs must be unique');
  if (contract.consumers.some(item => item.id === 'owner')) issue('The consumer ID "owner" is reserved');
  if (new Set(contract.consumers.map(item => item.entrypoint)).size !== contract.consumers.length) issue('Consumer entrypoints must be distinct');
  if (contract.consumers.some(item => item.entrypoint === contract.owner.entrypoint)) issue('Consumers must exercise a boundary outside the owner');
  if (contract.profile === 'csharp-library' && extname(contract.checks.entrypoint) !== '.csproj') issue('The C# checker must be a .csproj; its build freshness is established through the native SDK');
  if (contract.checks.precompile && contract.profile !== 'csharp-library') issue('Precompilation is supported only for standalone C# checkers');
  if (contract.profile !== 'csharp-library' && !/\.[cm]?js$/.test(contract.checks.entrypoint)) issue('The JavaScript/Vue checker must be a JavaScript entrypoint');
  if (contract.profile === 'vue-design-system' && contract.consumers.some(item => !item.alternatives.override)) issue('Vue consumers require a local-override counterexample');
  if (contract.mapping?.producers.some(producer => !producer.args.some(arg => arg.includes('{output}')))) issue('Each mapping producer needs a fresh {output} argument');
  if (contract.mapping?.symbols.some(symbol => symbol.startsWith('local '))) issue('Mapping symbols must be global SCIP symbols');
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

/** Shared input inventory for local review and remote source maps. */
export function contractFiles(contract: z.output<typeof contractSchema>, file: string) {
  const ownerFiles = [...new Set([contract.owner.entrypoint, ...contract.owner.files])];
  const consumerFiles = contract.consumers.flatMap(item => [item.entrypoint, ...item.files]);
  const checkerFiles = [...new Set([contract.checks.entrypoint, ...contract.checks.files, ...contract.dependencies.flatMap(item => typeof item.version === 'string' ? [] : [item.version.file])])];
  const fixtureFiles = contract.consumers.flatMap(item => [item.alternatives.wrapper, item.alternatives.copy, item.alternatives.unusedImport,
    ...(item.alternatives.override ? [item.alternatives.override] : []), ...item.alternatives.additional.map(extra => extra.source)]
    .flatMap(source => typeof source === 'string' ? [source] : replacementSources(source.replace)));
  const inputs = [...new Set([file, ...ownerFiles, ...consumerFiles, ...checkerFiles, ...fixtureFiles])];
  return { ownerFiles, consumerFiles, checkerFiles, fixtureFiles, inputs };
}

function loadContract(rootPath: string, file: string) {
  const root = realpathSync(rootPath);
  const contractPath = reference(root, file);
  const contractSource = readFileSync(contractPath, 'utf8');
  const contract = contractSchema.parse(JSON.parse(contractSource));
  if (!file.endsWith('.json')) throw Error('The contract must have a .json filename');
  const reviewFile = file.replace(/\.json$/, '') + '.review.json';
  const { ownerFiles, checkerFiles, fixtureFiles, inputs } = contractFiles(contract, file);
  const cases: VariantQualification['cases'] = [
    { id: 'original', role: 'delegation', overlays: [] },
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
        role: item.role as VariantQualification['cases'][number]['role'],
        overlays: [{ target: consumer.entrypoint, ...(typeof item.source === 'string' ? { source: item.source } : { replace: item.source.replace }) }],
      }));
    }),
  ];
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
    decision: contract.decision, rules: contract.rules, dependencies: contract.dependencies.map(dependency => {
      try { return { ...dependency, resolvedVersion: dependencyVersion(dependency.version, path => readFileSync(reference(loaded.root, path), 'utf8')) }; }
      catch (error) { return { ...dependency, resolvedVersion: null, versionGap: String(error) }; }
    }), requirements: contract.requirements,
    checks: ['behavior', 'ownership', 'changes'].map(mode => ({ mode, ...profileCommand(contract.profile, contract.checks.entrypoint, file, mode) })),
    counterexamples: loaded.qualification.cases.map(item => ({ name: item.id, expected: ['independent-copy', 'dead-owner-decoy', 'policy-override'].includes(item.role) ? 'reject ownership; preserve behavior' : 'accept', replacements: item.overlays })),
    executionPlan: {
      sourceVariants: loaded.qualification.cases.length,
      maximumCheckerInvocations: loaded.qualification.cases.length * 2 + loaded.runtime.obligations.length + (contract.checks.precompile ? 1 : 0),
      expectedCheckerInvocations: loaded.qualification.cases.length * 2 + (contract.checks.repeatable ? 1 : loaded.runtime.obligations.length) + (contract.checks.precompile ? 1 : 0),
      repeatable: contract.checks.repeatable,
      precompile: contract.checks.precompile,
      budgetMs: contract.checks.budgetMs ?? null,
      nativeSubprocesses: 'Owned by the native checker; measure builds, test processes and wall time separately.',
    },
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


type ExecutionOptions = { allowExecution: boolean; timeoutMs?: number; budgetMs?: number | undefined };

async function prepareStandaloneChecker(loaded: ReturnType<typeof loadContract>, commands: { command: string; args: string[]; cwd: string }[], options: ExecutionOptions) {
  const { contract } = loaded;
  const prepared = await verifyRuntimeContract(loaded.root, {
    runtimeContractVersion: 1, id: `${contract.id}.prepare`, responsibility: 'Build the standalone native checker once before source variants.', inputs: loaded.inputs,
    obligations: [{ id: 'prepare', kind: 'behavior', claim: 'The native SDK rebuilt the checker and reported its actual output and source graph.', command: 'dotnet',
      args: ['msbuild', contract.checks.entrypoint, '-restore', '-t:Build', '-getProperty:TargetPath,BaseIntermediateOutputPath', '-getItem:ProjectReference,Compile', '-v:quiet', '-consoleLoggerParameters:ErrorsOnly;NoSummary'] }],
  }, options);
  if (prepared.state !== 'verified') return prepared;
  const metadata = JSON.parse(prepared.results[0]!.stdout) as { Properties: { TargetPath: string; BaseIntermediateOutputPath: string }; Items: { ProjectReference: unknown[]; Compile: { FullPath: string }[] } };
  if (metadata.Items.ProjectReference.length) throw Error('A precompiled checker must not reference mutable production projects; build those from the observer.');
  const knownSources = new Set(contractFiles(contract, loaded.file).checkerFiles.map(path => realpathSync(reference(loaded.root, path))));
  const generated = realpathSync(resolve(dirname(reference(loaded.root, contract.checks.entrypoint)), metadata.Properties.BaseIntermediateOutputPath.replaceAll('\\', '/')));
  if (!contained(loaded.root, generated) || generated === loaded.root) throw Error('Native intermediate output must stay in a generated directory inside the project root.');
  const mutableSources = new Set([
    contract.owner.entrypoint, ...contract.owner.files,
    ...contract.consumers.flatMap(consumer => [consumer.entrypoint, ...consumer.files]),
  ].map(path => realpathSync(reference(loaded.root, path))));
  if (metadata.Items.Compile.some(item => mutableSources.has(realpathSync(item.FullPath)) || (!knownSources.has(realpathSync(item.FullPath)) && !contained(generated, realpathSync(item.FullPath))))) throw Error('Standalone checker sources must be registered witness inputs, outside the mutable production boundary.');
  const assembly = reference(loaded.root, portable(relative(loaded.root, metadata.Properties.TargetPath)));
  for (const command of commands) command.args = [assembly, ...command.args.slice(4)];
  return prepared;
}

/** Compile the authored contract in memory and run the existing strict workflow.
 * No runtime/qualification/binding/workflow JSON files are generated or maintained.
 */
export async function verifyContract(root: string, file: string, options: ExecutionOptions) {
  if (!options.allowExecution) throw Error('Contract checks require explicit execution authorization');
  const started = Date.now();
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
  const originals = new Map([...loaded.inputs, reviewFile].map(path => {
    const canonical = realpathSync(reference(loaded.root, path));
    return [path, { canonical, links: statSync(canonical).nlink, bytes: readFileSync(canonical) }];
  }));
  const restoredInputs: string[] = [];
  const unsafeInputs: string[] = [];
  const limit = Math.min(options.budgetMs ?? Infinity, contract.checks.budgetMs ?? Infinity);
  const result = await withExecutionScope({ repeatable: contract.checks.repeatable, budgetMs: Number.isFinite(limit) ? limit : undefined }, async scope => {
    try {
      return await runWorkflow(loaded.root, workflow, options, (path, kind) => {
        if (kind === 'runtime') return loaded.runtime;
        if (kind === 'qualification') return loaded.qualification;
        if (kind === 'bindings') return loaded.binding;
        return JSON.parse(readFileSync(reference(loaded.root, path), 'utf8'));
      }, contract.checks.precompile ? commands => prepareStandaloneChecker(loaded, commands, options) : undefined);
    } finally {
      if (scope.interrupted) for (const [path, original] of originals) {
        try {
          const current = reference(loaded.root, path);
          if (realpathSync(current) !== original.canonical) { unsafeInputs.push(path); continue; }
          const changed = !readFileSync(current).equals(original.bytes);
          if (changed) {
            if (!writeOwnedSource(original.canonical, original.bytes)) unsafeInputs.push(path);
            else restoredInputs.push(path);
          }
        } catch { unsafeInputs.push(path); }
      }
    }
  });
  for (const [path, original] of originals) {
    try { if (realpathSync(reference(loaded.root, path)) !== original.canonical || statSync(original.canonical).nlink !== original.links) unsafeInputs.push(path); }
    catch { unsafeInputs.push(path); }
  }
  if (unsafeInputs.length) {
    result.state = 'unresolved'; result.gaps.push(`Cannot safely restore interrupted inputs: ${[...new Set(unsafeInputs)].join(', ')}`);
  }
  // The workflow fingerprints the contract and all derived inputs across the run.
  // Include loading in that window as well; a command cannot rewrite its promises.
  if (initial !== hash(readFileSync(reference(loaded.root, file)))) result.state = 'unresolved';
  if (loaded.contract.mapping && inspectContractMap(loaded).state !== 'current') {
    result.state = 'unresolved';
    result.gaps.push('Source map became stale during verification');
  }
  const receipts = [
    ...result.qualifications.flatMap(item => item.report.cases.flatMap(entry => [entry.behavior, entry.conformance])),
    ...result.contracts.flatMap(item => item.report.results),
    ...('preparation' in result && result.preparation ? result.preparation.results : []),
  ];
  return { ...result, restoredInputs, cost: {
    elapsedMs: Date.now() - started, budgetMs: Number.isFinite(limit) ? limit : null,
    checkerInvocations: receipts.filter(receipt => receipt.execution === 'executed').length,
    reusedResults: receipts.filter(receipt => receipt.execution === 'reused').length,
  } };
}
