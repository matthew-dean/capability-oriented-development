#!/usr/bin/env node
import { refreshScipMap, inspectScipMap } from './scip.js';
import { inspectSystemMap } from './system-map.js';
import { reference } from './filesystem.js';
import { readFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildIndex } from './indexer.js';
import { discover } from './discovery.js';
import { parseIndex, reconcile } from './reconciliation.js';
import { planReuse } from './planning.js';
import { captureSnapshot } from './snapshot.js';
import { serve } from './mcp.js';
import { verifyRuntimeContract } from './runtime-contracts.js';
import { qualifyWitness } from './qualification.js';
import { verifyWorkflow } from './workflow.js';
import { enforcePresentation } from './enforcement.js';
import { verifyPropagation } from './propagation.js';
import { qualifyVariants } from './variant-qualification.js';
import { inspectChangeBindings, verifyChangeBindings } from './change-bindings.js';

export async function runCli(args: string[]): Promise<number> {
  const [command, root = '.', ...rest] = args;
  try {
    if (command === 'refresh-scip' || command === 'inspect-scip') {
      if ((command === 'refresh-scip' && (rest.length !== 3 || rest[2] !== '--allow-execution')) || (command === 'inspect-scip' && !(rest.length === 1 || (rest.length === 3 && rest[1] === '--symbol' && rest[2]?.trim())))) throw Error('Usage: cod refresh-scip <root> <mapping.json> <ignored-snapshot.json> --allow-execution | inspect-scip <root> <snapshot.json> [--symbol <query>]');
      const input: unknown = JSON.parse(readFileSync(reference(root, rest[0]!), 'utf8'));
      const result = command === 'refresh-scip' ? await refreshScipMap(root, input, rest[1]!, { allowExecution: true }) : inspectScipMap(root, input, rest[2] ? { symbol: rest[2] } : {});
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return result.state === 'mapped' || result.state === 'current' ? 0 : 2;
    }
    if (command === 'inspect-system') {
      if (rest.length !== 1) throw new Error('Usage: cod inspect-system <root> <system.json>');
      const result = inspectSystemMap(root, JSON.parse(readFileSync(reference(root, rest[0]!), 'utf8')));
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return result.state === 'resolved' ? 0 : 2;
    }
    if (command === 'serve') { await serve(root); return 0; }
    if (command === 'binding-state' || command === 'verify-bindings') {
      if (rest.length !== (command === 'binding-state' ? 1 : 2)) throw new Error('Usage: cod binding-state <root> <definition.json> | verify-bindings <root> <definition.json> <review.json>');
      const definition: unknown = JSON.parse(readFileSync(reference(root, rest[0]!), 'utf8'));
      const result = command === 'binding-state' ? inspectChangeBindings(root, definition) : verifyChangeBindings(root, definition, JSON.parse(readFileSync(reference(root, rest[1]!), 'utf8')));
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return 'state' in result && result.state === 'stale' ? 1 : 0;
    }
    if (command === 'verify-propagation') {
      if(rest.length!==2||rest[1]!=='--allow-execution')throw Error('Usage: cod verify-propagation <root> <definition.json> --allow-execution');
      const result=await verifyPropagation(root,JSON.parse(readFileSync(reference(root,rest[0]!),'utf8')),{allowExecution:true});
      process.stdout.write(JSON.stringify(result,null,2)+'\n');return result.state==='verified'?0:result.state==='violated'?1:2;
    }
    if (command === 'qualify-witness' || command === 'qualify-variants' || command === 'workflow') {
      if (rest.length !== 2 || rest[1] !== '--allow-execution') throw new Error(`Usage: cod ${command} <root> <definition.json> --allow-execution`);
      const input: unknown = JSON.parse(readFileSync(reference(root, rest[0]!), 'utf8'));
      const result = command === 'qualify-witness' ? await qualifyWitness(root, input, { allowExecution: true }) : command === 'qualify-variants' ? await qualifyVariants(root, input, { allowExecution: true }) : await verifyWorkflow(root, input, { allowExecution: true });
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return ['qualified', 'ready-for-review'].includes(result.state) ? 0 : result.state === 'unresolved' ? 2 : 1;
    }
    if (command === 'verify-contract') {
      if (rest.length !== 2 || rest[1] !== '--allow-execution') throw new Error('Usage: cod verify-contract <root> <contract.json> --allow-execution');
      const result = await verifyRuntimeContract(root, JSON.parse(readFileSync(rest[0]!, 'utf8')), { allowExecution: true });
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return result.state === 'verified' ? 0 : result.state === 'violated' ? 1 : 2;
    }
    if (command === 'enforce') {
      if (rest.length !== 1) throw new Error('Enforcement requires exactly one presentation contract path');
      const result = enforcePresentation(root, JSON.parse(readFileSync(rest[0]!, 'utf8')));
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      return result.state === 'verified' ? 0 : result.state === 'violated' ? 1 : 2;
    }
    if (command === 'snapshot') { if(rest.length !== 1)throw new Error('Snapshot requires exactly one new relative path'); process.stdout.write(JSON.stringify(captureSnapshot(root,rest[0]!),null,2)+'\n');return 0; }
    if (!['check', 'index', 'discover', 'plan', 'reconcile'].includes(command ?? '')) throw new Error('Usage: cod check|index <root> | discover <root> <intent> | reconcile <root> <baseline.json> | plan <root> <intent> | snapshot <root> <new-relative-path> | enforce <root> <contract.json> | verify-contract <root> <contract.json> --allow-execution | qualify-witness <root> <definition.json> --allow-execution | workflow <root> <definition.json> --allow-execution | verify-propagation <root> <definition.json> --allow-execution | qualify-variants <root> <definition.json> --allow-execution | binding-state <root> <definition.json> | verify-bindings <root> <definition.json> <review.json> | serve <root>');
    if (['discover','plan'].includes(command ?? '') && !rest.join(' ').trim()) throw new Error('Discovery requires an intent');
    if (command === 'reconcile' && rest.length !== 1) throw new Error('Reconciliation requires exactly one baseline path');
    const index = buildIndex(root);
    const result = command === 'plan' ? planReuse(index,{intent:rest.join(' ')}) : command === 'discover' ? discover(index, { intent: rest.join(' ') }) : command === 'reconcile' ? reconcile(parseIndex(JSON.parse(readFileSync(rest[0]!, 'utf8'))), index) : index;
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return index.ok ? 0 : 1;
  } catch (error) { process.stderr.write(JSON.stringify({ code: 'INVALID_INPUT', message: String(error) }) + '\n'); return 2; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await runCli(process.argv.slice(2));
