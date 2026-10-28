import { lstatSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { contained, portable } from './filesystem.js';
import { inspectContract, verifyContract } from './contracts.js';

/** Derive discovery from the contracts themselves, never a parallel registry. */
export function inspectCatalog(rootPath: string, directory = 'capabilities') {
  const root = realpathSync(rootPath);
  if (!directory || isAbsolute(directory) || /^[a-z]:|\\/i.test(directory)) throw Error(`Unsafe catalog directory: ${directory}`);
  const folder = resolve(root, directory);
  if (!contained(root, folder) || !contained(root, realpathSync(folder))) throw Error('Catalog directory escapes the project root');
  if (realpathSync(folder) !== folder || !lstatSync(folder).isDirectory()) throw Error('Catalog directory must be a regular directory without symlinks');
  const contracts: string[] = [];
  function walk(path: string): void {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const file = join(path, entry.name);
      if (entry.isSymbolicLink()) throw Error(`Catalog cannot traverse a symlink: ${portable(relative(root, file))}`);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name === 'capability.json') contracts.push(portable(relative(root, file)));
    }
  }
  walk(folder);
  if (!contracts.length) throw Error(`No capability.json contracts found in ${directory}`);
  const capabilities = contracts.map(contract => ({ contract, ...inspectContract(root, contract) }));
  const ids = new Set<string>();
  for (const capability of capabilities) {
    if (ids.has(capability.id)) throw Error(`Duplicate capability ID: ${capability.id}`);
    ids.add(capability.id);
  }
  const gaps = capabilities.flatMap(capability => [
    ...(capability.review.state === 'current' ? [] : [`${capability.id}: review is ${capability.review.state}`]),
    ...(['current', 'not-configured'].includes(capability.sourceMap.state) ? [] : [`${capability.id}: source map is ${capability.sourceMap.state}`]),
  ]);
  return {
    catalogVersion: 1 as const, directory: portable(relative(root, folder)) || '.',
    state: gaps.length ? 'unresolved' as const : 'current' as const,
    capabilities, gaps, conformance: 'not-evaluated' as const,
    authority: 'Derived from local standard contracts. External dependencies are declared references, not fetched, authenticated or verified. Review and map currency are not passing conformance.',
  };
}

/** One serial verification path for every discovered contract and native profile. */
export async function verifyCatalog(root: string, directory = 'capabilities', options: { allowExecution: boolean; timeoutMs?: number }) {
  if (!options.allowExecution) throw Error('Catalog checks require explicit execution authorization');
  const catalog = inspectCatalog(root, directory);
  if (catalog.gaps.length) return { catalogVersion: 1 as const, state: 'unresolved' as const, gaps: catalog.gaps, results: [] };
  const results = [];
  for (const capability of catalog.capabilities) results.push({ contract: capability.contract, report: await verifyContract(root, capability.contract, options) });
  const state: 'unresolved' | 'ready-for-review' | 'violated' = results.some(item => item.report.state === 'unresolved') ? 'unresolved'
    : results.every(item => item.report.state === 'ready-for-review') ? 'ready-for-review' : 'violated';
  return { catalogVersion: 1 as const, state, gaps: results.flatMap(item => item.report.gaps), results };
}
