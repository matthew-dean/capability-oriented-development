#!/usr/bin/env node
// Small bridge for native indexers; decoding belongs to the official SCIP CLI.
import { spawnSync } from 'node:child_process';
import { openSync, closeSync, rmSync } from 'node:fs';
const [output, indexer, ...args] = process.argv.slice(2);
if (!output || !indexer || !args.some(arg => arg.includes('{index}'))) throw Error('Usage: node scip-producer.mjs <fresh-output.json> <indexer> <args including {index}>');
const binary = `${output}.scip`;
function run(command, argv, stdout) {
  const result = spawnSync(command, argv, { stdio: ['ignore', stdout, 2] });
  if (result.error) throw result.error;
  if (result.signal || result.status !== 0) throw Error(`${command} failed: ${result.signal ?? result.status}`);
}
try {
  run(indexer, args.map(arg => arg.replaceAll('{index}', binary)), 2);
  const descriptor = openSync(output, 'wx');
  try { run(process.env.COD_SCIP_CLI ?? 'scip', ['print', '--json', binary], descriptor); }
  finally { closeSync(descriptor); }
} finally { rmSync(binary, { force: true }); }
