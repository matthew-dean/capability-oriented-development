import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { AsyncLocalStorage } from 'node:async_hooks';

type CommandResult = { exitCode: number | null; timedOut: boolean; stdout: string; stderr: string };
type Evidence = CommandResult & { evidenceId: string };
type Scope = { deadline: number; repeatable: boolean; evidence: Map<string, Evidence>; interrupted: boolean };
const scopes = new AsyncLocalStorage<Scope>();

/** Internal invocation-local evidence, never a persisted proof or cross-run cache. */
export async function withExecutionScope<T>(options: { budgetMs?: number | undefined; repeatable?: boolean }, run: (scope: Scope) => Promise<T>): Promise<T> {
  if (options.budgetMs !== undefined && (!Number.isSafeInteger(options.budgetMs) || options.budgetMs < 1)) throw Error('Execution budget must be a positive safe integer');
  const parent = scopes.getStore();
  const scope: Scope = { deadline: Math.min(parent?.deadline ?? Infinity, options.budgetMs === undefined ? Infinity : Date.now() + options.budgetMs), repeatable: options.repeatable === true, evidence: new Map(), interrupted: false };
  return scopes.run(scope, () => run(scope));
}

export const runtimeContractSchema = z.object({
  runtimeContractVersion: z.literal(1),
  id: z.string().min(1),
  responsibility: z.string().min(1),
  inputs: z.array(z.string().min(1)).min(1),
  obligations: z.array(z.object({
    id: z.string().min(1),
    claim: z.string().min(1),
    kind: z.enum(['behavior', 'ownership', 'evolution']),
    cwd: z.string().default('.'),
    command: z.string().min(1),
    args: z.array(z.string()),
    unresolvedExitCodes: z.array(z.number().int().min(1).max(255)).default([2]),
  }).strict()).min(1),
}).strict();
export type RuntimeContract = z.input<typeof runtimeContractSchema>;

function within(root: string, file: string): string {
  if (isAbsolute(file)) throw new Error('Contract paths must be relative');
  const result = realpathSync(resolve(root, file));
  const rel = relative(root, result);
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Contract path escapes root');
  return result;
}
function fingerprints(root: string, inputs: string[]): Record<string, string> {
  return Object.fromEntries(inputs.map(file => [file, createHash('sha256').update(readFileSync(within(root, file))).digest('hex')]));
}

/** Validate all evidence and command directories without executing project code. */
export function preflightRuntimeContract(rootPath: string, input: unknown) {
  const root = realpathSync(resolve(rootPath));
  const contract = runtimeContractSchema.parse(input);
  if (new Set(contract.obligations.map(o => o.id)).size !== contract.obligations.length) throw new Error('Duplicate obligation IDs');
  const before = fingerprints(root, contract.inputs);
  const directories = contract.obligations.map(o => { const directory = within(root, o.cwd); if (!statSync(directory).isDirectory()) throw new Error('Obligation working directory must be a directory'); return directory; });
  return { root, contract, before, directories };
}

/** Executes explicitly trusted local commands. This is not a sandbox or a semantic equivalence proof. */
export async function verifyRuntimeContract(rootPath: string, input: unknown, options: { allowExecution: boolean; timeoutMs?: number }) {
  if (options.allowExecution !== true) throw new Error('Runtime contracts require explicit execution authorization');
  const timeoutMs = options.timeoutMs ?? 300_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 3_600_000) throw new Error('Invalid timeout');
  const { root, contract, before, directories } = preflightRuntimeContract(rootPath, input);
  const results = [];
  let interrupted = false;
  for (const [index, obligation] of contract.obligations.entries()) {
    const scope = scopes.getStore();
    if (interrupted || scope?.interrupted || (scope && scope.deadline <= Date.now())) {
      if (scope) scope.interrupted = true;
      results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: 0, exitCode: null, timedOut: true, stdout: '', stderr: 'Verification interrupted or its execution budget was exhausted; this command was not started.', evidenceId: '', execution: 'not-started' as const });
      continue;
    }
    let current: Record<string, string>, identities: (string | number)[][];
    try {
      current = fingerprints(root, contract.inputs);
      identities = contract.inputs.map(file => {
        const path = within(root, file), stat = statSync(path);
        return [file, path, stat.dev, stat.ino, stat.nlink];
      }).sort();
    } catch {
      interrupted = true; if (scope) scope.interrupted = true;
      results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: 0, exitCode: null, timedOut: false, stdout: '', stderr: 'A registered input could not be read; this command was not started.', evidenceId: '', execution: 'not-started' as const });
      continue;
    }
    const evidenceId = createHash('sha256').update(JSON.stringify([
      root, directories[index], obligation.command, obligation.args,
      Object.entries(current).sort(), identities, Object.entries(process.env).sort(),
    ])).digest('hex');
    const cached = scope?.repeatable ? scope.evidence.get(evidenceId) : undefined;
    if (cached) {
      results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: 0, ...cached, execution: 'reused' as const });
      continue;
    }
    const remaining = scope ? scope.deadline - Date.now() : Infinity;
    if (remaining <= 0) {
      scope!.interrupted = true;
      results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: 0, exitCode: null, timedOut: true, stdout: '', stderr: 'Verification execution budget exhausted before starting this command.', evidenceId, execution: 'not-started' as const });
      continue;
    }
    const started = Date.now();
    const result = await new Promise<CommandResult>(done => {
      let stdout = '', stderr = '', timedOut = false, spawnFailed = false;
      const child = spawn(obligation.command, obligation.args, { cwd: directories[index], shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => {
        timedOut = true;
        try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid!, 'SIGKILL'); } catch { /* Process already exited. */ }
        child.stdout.destroy(); child.stderr.destroy();
      }, Math.min(timeoutMs, remaining));
      child.stdout.on('data', data => { stdout = (stdout + String(data)).slice(-65_536); });
      child.stderr.on('data', data => { stderr = (stderr + String(data)).slice(-65_536); });
      child.on('error', error => { spawnFailed = true; stderr += String(error); });
      child.on('close', exitCode => { clearTimeout(timer); done({ exitCode: spawnFailed ? null : exitCode, timedOut, stdout, stderr }); });
    });
    results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: Date.now() - started, ...result, evidenceId, execution: 'executed' as const });
    if (result.timedOut) { interrupted = true; if (scope) scope.interrupted = true; }
    if (scope?.repeatable && !result.timedOut && result.exitCode !== null) {
      try {
        if (contract.inputs.every(file => current[file] === fingerprints(root, [file])[file])) scope.evidence.set(evidenceId, { ...result, evidenceId });
      } catch { interrupted = true; scope.interrupted = true; }
    }
  }
  const after: Record<string, string | null> = {};
  for (const file of contract.inputs) { try { after[file] = fingerprints(root, [file])[file]!; } catch { after[file] = null; } }
  const changedInputs = contract.inputs.filter(file => before[file] !== after[file]);
  const state = changedInputs.length || results.some((r, index) => r.timedOut || r.exitCode === null || contract.obligations[index]!.unresolvedExitCodes.includes(r.exitCode)) ? 'unresolved' : results.some(r => r.exitCode !== 0) ? 'violated' : 'verified';
  return { runtimeContractVersion: 1 as const, id: contract.id, state, inputs: before, finalInputs: after, changedInputs, results, verification: { commandsExecuted: results.filter(result => result.execution === 'executed').length, commandsReused: results.filter(result => result.execution === 'reused').length, claimSemantics: 'not-independently-validated' as const, semanticReuse: 'not-established' as const }, coverage: 'Only the registered executable claims; passing does not establish universal correctness or reuse.' };
}
