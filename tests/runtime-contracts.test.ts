import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { verifyRuntimeContract, withExecutionScope } from '../src/runtime-contracts.js';
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function setup(code = '') {
  const root = mkdtempSync(join(tmpdir(), 'cod-runtime-')); roots.push(root);
  writeFileSync(join(root, 'check.mjs'), code);
  return { root, contract: { runtimeContractVersion: 1, id: 'amounts', responsibility: 'Shared amount policy', inputs: ['check.mjs'], obligations: [{ id: 'propagation', kind: 'evolution', claim: 'The consumer follows its owner', command: process.execPath, args: ['check.mjs'] }] } };
}
it('requires authorization before executing project code', async () => {
  const { root, contract } = setup('throw Error("must not execute")');
  await expect(verifyRuntimeContract(root, contract, { allowExecution: false })).rejects.toThrow('authorization');
  await expect(verifyRuntimeContract(root, contract, { allowExecution: 'true' as unknown as boolean })).rejects.toThrow('authorization');
});
it('records actual success and failed obligations separately', async () => {
  const { root, contract } = setup('console.log("probe ran")');
  const pass = await verifyRuntimeContract(root, contract, { allowExecution: true });
  expect(pass.state).toBe('verified'); expect(pass.verification.semanticReuse).toBe('not-established'); expect(pass.results[0]?.stdout).toContain('probe ran');
  writeFileSync(join(root, 'check.mjs'), 'process.exitCode = 1');
  const fail = await verifyRuntimeContract(root, contract, { allowExecution: true });
  expect(fail.state).toBe('violated'); expect(fail.results[0]?.exitCode).toBe(1);
});
it('does not accept an obligation that changes its own registered evidence', async () => {
  const { root, contract } = setup('import {writeFileSync} from "node:fs"; writeFileSync("check.mjs", "")');
  const result = await verifyRuntimeContract(root, contract, { allowExecution: true });
  expect(result.state).toBe('unresolved'); expect(result.changedInputs).toEqual(['check.mjs']);
});
it('terminates a hanging obligation and retains the timeout', async () => {
  const { root, contract } = setup('setInterval(() => {}, 100)');
  const result = await verifyRuntimeContract(root, contract, { allowExecution: true, timeoutMs: 100 });
  expect(result.state).toBe('unresolved'); expect(result.results[0]?.timedOut).toBe(true);
});
it('rejects an escaping working directory before any command starts', async () => {
  const { root, contract } = setup();
  await expect(verifyRuntimeContract(root, { ...contract, obligations: [{ ...contract.obligations[0], cwd: '..' }] }, { allowExecution: true })).rejects.toThrow('escapes');
});
it('rejects a registered input symlink outside the root', async () => {
  const { root, contract } = setup(); symlinkSync(join(tmpdir(), '..'), join(root, 'outside'));
  await expect(verifyRuntimeContract(root, { ...contract, inputs: ['outside/etc/hosts'] }, { allowExecution: true })).rejects.toThrow();
});
it('retains a missing executable as unresolved instead of a semantic failure', async () => {
  const { root, contract } = setup();
  const result = await verifyRuntimeContract(root, { ...contract, obligations: [{ ...contract.obligations[0], command: 'cod-nonexistent-executable' }] }, { allowExecution: true });
  expect(result.state).toBe('unresolved'); expect(result.results[0]?.stderr).toContain('ENOENT');
});

it('distinguishes registered unresolved exit codes from failed assertions', async () => {
  const { root, contract } = setup('process.exitCode = 2');
  expect((await verifyRuntimeContract(root, contract, { allowExecution: true })).state).toBe('unresolved');
  const withoutUnresolvedCodes = { ...contract, obligations: [{ ...contract.obligations[0], unresolvedExitCodes: [] }] };
  expect((await verifyRuntimeContract(root, withoutUnresolvedCodes, { allowExecution: true })).state).toBe('violated');
});
it('retains deleted registered evidence as unresolved', async () => {
  const { root, contract } = setup('import {unlinkSync} from "node:fs"; unlinkSync("check.mjs")');
  const result = await verifyRuntimeContract(root, contract, { allowExecution: true });
  expect(result.state).toBe('unresolved'); expect(result.changedInputs).toEqual(['check.mjs']);
});
it.each([false, true])('retains missing evidence before the next obligation when repeatable is %s', async repeatable => {
  const { root, contract } = setup('import {unlinkSync} from "node:fs"; unlinkSync("check.mjs")');
  contract.obligations.push({ ...contract.obligations[0]!, id: 'must-not-start', args: ['--eval', 'console.log("unexpected execution")'] });
  const result = await withExecutionScope({ repeatable }, () => verifyRuntimeContract(root, contract, { allowExecution: true }));
  expect(result.state).toBe('unresolved');
  expect(result.changedInputs).toEqual(['check.mjs']);
  expect(result.finalInputs['check.mjs']).toBeNull();
  expect(result.results.map(item => item.execution)).toEqual(['executed', 'not-started']);
  expect(result.verification).toMatchObject({ commandsExecuted: 1, commandsReused: 0 });
});
it('validates all working directories before starting a command', async () => {
  const { root, contract } = setup('import {writeFileSync} from "node:fs"; writeFileSync("check.mjs", "changed")');
  const invalid = { ...contract, obligations: [contract.obligations[0], { ...contract.obligations[0], id: 'invalid-cwd', cwd: 'check.mjs' }] };
  await expect(verifyRuntimeContract(root, invalid, { allowExecution: true })).rejects.toThrow('must be a directory');
  expect((await verifyRuntimeContract(root, contract, { allowExecution: true })).changedInputs).toEqual(['check.mjs']);
});
