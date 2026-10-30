#!/usr/bin/env node
import { inspectConnections, syncConnections } from './connections.js';
import { inspectCatalog, verifyCatalog } from './catalog.js';
import { inspectContract, recordContractReview, verifyContract, refreshContractMap } from './contracts.js';
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
  const [command, root = '.', ...supplied] = args;
  try {
    const rest = [...supplied];
    let budgetMs: number | undefined;
    if (command === 'verify' || command === 'verify-catalog') {
      const index = rest.indexOf('--budget-ms');
      if (index !== -1) {
        const value = rest[index + 1];
        if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || rest.lastIndexOf('--budget-ms') !== index) throw Error('--budget-ms requires one positive safe integer');
        budgetMs = Number(value); rest.splice(index, 2);
      }
    }
    if (command === 'sync' || command === 'connections') {
      const flags = rest.filter(value => value.startsWith('--'));
      const values = rest.filter(value => !value.startsWith('--'));
      const allowed = command === 'sync' ? ['--json', '--offline', '--report-only'] : ['--json'];
      if (values.length > 1 || new Set(flags).size !== flags.length || flags.some(flag => !allowed.includes(flag))) throw Error('Usage: cod sync <root> [sources.json] [--offline] [--report-only] [--json] | connections <root> [sources.json] [--json]');
      const source = values[0] ?? 'capabilities/sources.json';
      const report = command === 'sync' ? syncConnections(root, source, { offline: flags.includes('--offline') }) : inspectConnections(root, source);
      if (flags.includes('--json')) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(`Connected catalogs: ${report.state}; ${report.freshness}; last sync ${report.syncedAt || 'never'}`);
        for (const edge of report.edges) console.log(`  ${edge.selection}: ${edge.capability}@${edge.version || '?'} → ${edge.revision ?? 'unresolved'} (${edge.state})`);
        for (const update of report.updates) console.log(`  Newer ${update.capability}: inspect affected consumers ${update.affectedConsumers.join(', ')}; no automatic upgrade`);
        for (const gap of report.gaps) console.log(`  ${gap}`);
        console.log('Metadata only; conformance not evaluated. Use --json for contracts, file maps and growth guidance.');
      }
      return flags.includes('--report-only') || report.state === 'current' ? 0 : 2;
    }
    if (command === 'catalog'  || command === 'verify-catalog') {
      const flags = rest.filter(value => value.startsWith('--'));
      const values = rest.filter(value => !value.startsWith('--'));
      const allowed = command === 'catalog' ? ['--json', '--check-reviews'] : ['--json', '--allow-execution'];
      if (values.length > 1 || new Set(flags).size !== flags.length || flags.some(flag => !allowed.includes(flag))
        || (command === 'verify-catalog' && !flags.includes('--allow-execution'))) {
        throw Error('Usage: cod catalog <root> [directory] [--check-reviews] [--json] | verify-catalog <root> [directory] --allow-execution [--budget-ms <milliseconds>] [--json]');
      }
      const directory = values[0] ?? 'capabilities';
      if (command === 'catalog') {
        const report = inspectCatalog(root, directory);
        if (flags.includes('--json')) console.log(JSON.stringify(report, null, 2));
        else {
          for (const capability of report.capabilities) {
            console.log(`${capability.id}: ${capability.responsibility}`);
            console.log(`  Contract: ${capability.contract}`);
            console.log(`  Owner: ${capability.owner.entrypoint} → ${capability.owner.export}`);
            for (const consumer of capability.consumers) console.log(`  Consumer: ${consumer.id} → ${consumer.entrypoint}`);
            console.log(`  Extend: ${capability.rules.extend}`);
            for (const dependency of capability.dependencies) console.log(`  External: ${dependency.id} → ${dependency.repository} → ${dependency.contract}@${dependency.resolvedVersion ?? "unresolved"} (declared)`);
            console.log(`  Review: ${capability.review.state}; source map: ${capability.sourceMap.state}`);
            console.log(`  Planned checker invocations: ${capability.executionPlan.expectedCheckerInvocations}; standalone precompile: ${capability.executionPlan.precompile}; budget: ${capability.executionPlan.budgetMs ?? "unset"}`);
          }
          for (const gap of report.gaps) console.log(`  ${gap}`);
          console.log('Read-only catalog; conformance not evaluated. Use --json for the complete file map and native check commands.');
        }
        return flags.includes('--check-reviews') && report.capabilities.some(capability => capability.review.state !== 'current') ? 2 : 0;
      }
      const started = Date.now();
      const report = await verifyCatalog(root, directory, { allowExecution: true, budgetMs });
      if (flags.includes('--json')) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(`Catalog: ${report.state}`);
        for (const result of report.results) console.log(`  ${result.contract}: ${result.report.state}`);
        for (const gap of report.gaps) console.log(`  ${gap}`);
        if ("notRun" in report && report.notRun.length) console.log(`Not run after failure: ${report.notRun.join(", ")}`);
        console.log(`Verification elapsed: ${Date.now() - started}ms${budgetMs === undefined ? '' : `; budget ${budgetMs}ms`}`);
        if ("cost" in report) console.log(`Checker invocations: ${report.cost.checkerInvocations}; reused: ${report.cost.reusedResults}`);
      }
      return report.state === 'ready-for-review' ? 0 : report.state === 'unresolved' ? 2 : 1;
    }
    if (command === 'refresh-map') {
      if (rest.length !== 2 || rest[1] !== '--allow-execution') throw Error('Usage: cod refresh-map <root> <capability.json> --allow-execution');
      const report = await refreshContractMap(root, rest[0]!, { allowExecution: true });
      console.log(JSON.stringify(report, null, 2));
      return report.state === 'mapped' ? 0 : 2;
    }
    if (command === 'inspect' || command === 'review' || command === 'verify') {
      const json = rest.includes('--json');
      const values = rest.filter(value => value !== '--json');
      const file = values[0] ?? 'capability.json';
      if (command === 'inspect' && values.length > 1) throw Error('Usage: cod inspect <root> [capability.json] [--json]');
      if (command === 'review' && (values.length !== 3 || values[1] !== '--reason')) throw Error('Usage: cod review <root> <capability.json> --reason "What changed and what was reviewed"');
      if (command === 'verify' && (values.length !== 2 || values[1] !== '--allow-execution')) throw Error('Usage: cod verify <root> <capability.json> --allow-execution [--budget-ms <milliseconds>] [--json]');
      if (command === 'inspect') {
        const report = inspectContract(root, file);
        if (json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
        else {
          console.log(`${report.id}: ${report.responsibility}`);
          console.log(`Need: ${report.decision.need}`);
          console.log(`Choice: ${report.decision.action} — ${report.decision.rationale}`);
          for (const item of report.decision.considered) console.log(`  Considered ${item.candidate}: ${item.finding}`);
          console.log(`Owner: ${report.owner.entrypoint} → ${report.owner.export}`);
          for (const consumer of report.consumers) console.log(`Consumer: ${consumer.id} → ${consumer.entrypoint} → ${consumer.export}`);
          console.log('Checks run in this order: current review → test the checks with alternatives → behavior → ownership → change disagreement.');
          for (const check of report.checks) console.log(`  ${check.mode}: ${check.command} ${check.args.join(' ')}`);
          console.log(`Source map: ${report.sourceMap.state}`);
          console.log(`Review: ${report.review.state} (${report.review.file})`);
          console.log(`Open ${file} for the promised values and allowed changes. Use --json for the complete file map.`);
        }
        return report.review.state === 'current' ? 0 : 2;
      }
      if (command === 'review') {
        const report = recordContractReview(root, file, values[2]!);
        console.log(json ? JSON.stringify(report, null, 2) : `${report.file}: ${report.next}`);
        return 0;
      }
      const report = await verifyContract(root, file, { allowExecution: true, budgetMs });
      if (json) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(`${report.id}: ${report.state}`);
        if ("cost" in report) console.log(`Checker invocations: ${report.cost.checkerInvocations}; reused: ${report.cost.reusedResults}; elapsed: ${report.cost.elapsedMs}ms`);
        for (const gap of report.gaps) console.log(`  ${gap}`);
        if ('qualifications' in report) for (const qualification of report.qualifications) {
          for (const item of qualification.report.cases) {
            console.log(`  ${item.id}: ${item.matched ? 'PASS' : 'FAIL'} (behavior ${item.behavior.exitCode}, ownership ${item.conformance.exitCode})`);
            if (!item.matched) console.log(item.behavior.stderr || item.conformance.stderr);
          }
        }
        if ('contracts' in report) for (const contract of report.contracts) for (const result of contract.report.results) {
          console.log(`  ${result.id}: ${result.exitCode === 0 ? 'PASS' : 'FAIL'}`);
          if (result.exitCode !== 0) console.log(result.stderr);
        }
      }
      return report.state === 'ready-for-review' ? 0 : report.state === 'violated' ? 1 : 2;
    }
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
    if (!['check', 'index', 'discover', 'plan', 'reconcile'].includes(command ?? '')) throw new Error('Usage: cod catalog <root> [directory] [--check-reviews] [--json] | verify-catalog <root> [directory] --allow-execution [--budget-ms <milliseconds>] [--json] | inspect <root> [capability.json] | review <root> <capability.json> --reason <explanation> | verify <root> <capability.json> --allow-execution | refresh-map <root> <capability.json> --allow-execution | Advanced: check|index <root> | discover <root> <intent> | reconcile <root> <baseline.json> | plan <root> <intent> | snapshot <root> <new-relative-path> | enforce <root> <contract.json> | verify-contract <root> <contract.json> --allow-execution | qualify-witness <root> <definition.json> --allow-execution | workflow <root> <definition.json> --allow-execution | verify-propagation <root> <definition.json> --allow-execution | qualify-variants <root> <definition.json> --allow-execution | binding-state <root> <definition.json> | verify-bindings <root> <definition.json> <review.json> | serve <root>');
    if (['discover','plan'].includes(command ?? '') && !rest.join(' ').trim()) throw new Error('Discovery requires an intent');
    if (command === 'reconcile' && rest.length !== 1) throw new Error('Reconciliation requires exactly one baseline path');
    const index = buildIndex(root);
    const result = command === 'plan' ? planReuse(index,{intent:rest.join(' ')}) : command === 'discover' ? discover(index, { intent: rest.join(' ') }) : command === 'reconcile' ? reconcile(parseIndex(JSON.parse(readFileSync(rest[0]!, 'utf8'))), index) : index;
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return index.ok ? 0 : 1;
  } catch (error) { process.stderr.write(JSON.stringify({ code: 'INVALID_INPUT', message: String(error) }) + '\n'); return 2; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await runCli(process.argv.slice(2));
