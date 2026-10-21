import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Run each case in a fresh process. Restore the actual owner even on assertion failure.
const owner = resolve('owner.mjs'), before = readFileSync(owner, 'utf8');
const mode = process.argv[2];
assert(['behavior', 'conformance'].includes(mode));
try {
  if (mode === 'conformance') writeFileSync(owner, 'export const formatRelativeTime = () => "OWNER-SENTINEL";');
  const { run } = await import(pathToFileURL(resolve('consumer.mjs')).href);
  const examples = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url), 'utf8'));
  for (const {input, output} of examples) assert.equal(run(input), mode === 'behavior' ? output : 'OWNER-SENTINEL');
} finally { writeFileSync(owner, before); }
