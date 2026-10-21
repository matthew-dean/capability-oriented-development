import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';

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
  for (const [index, obligation] of contract.obligations.entries()) {
    const started = Date.now();
    const result = await new Promise<{ exitCode: number | null; timedOut: boolean; stdout: string; stderr: string }>(done => {
      let stdout = '', stderr = '', timedOut = false, spawnFailed = false;
      const child = spawn(obligation.command, obligation.args, { cwd: directories[index], shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => {
        timedOut = true;
        try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid!, 'SIGKILL'); } catch { /* Process already exited. */ }
      }, timeoutMs);
      child.stdout.on('data', data => { stdout = (stdout + String(data)).slice(-65_536); });
      child.stderr.on('data', data => { stderr = (stderr + String(data)).slice(-65_536); });
      child.on('error', error => { spawnFailed = true; stderr += String(error); });
      child.on('close', exitCode => { clearTimeout(timer); done({ exitCode: spawnFailed ? null : exitCode, timedOut, stdout, stderr }); });
    });
    results.push({ id: obligation.id, kind: obligation.kind, claim: obligation.claim, elapsedMs: Date.now() - started, ...result });
  }
  const after: Record<string, string | null> = {};
  for (const file of contract.inputs) { try { after[file] = fingerprints(root, [file])[file]!; } catch { after[file] = null; } }
  const changedInputs = contract.inputs.filter(file => before[file] !== after[file]);
  const state = changedInputs.length || results.some((r, index) => r.timedOut || r.exitCode === null || contract.obligations[index]!.unresolvedExitCodes.includes(r.exitCode)) ? 'unresolved' : results.some(r => r.exitCode !== 0) ? 'violated' : 'verified';
  return { runtimeContractVersion: 1 as const, id: contract.id, state, inputs: before, finalInputs: after, changedInputs, results, verification: { commandsExecuted: results.length, claimSemantics: 'not-independently-validated' as const, semanticReuse: 'not-established' as const }, coverage: 'Only the registered executable claims; passing does not establish universal correctness or reuse.' };
}
