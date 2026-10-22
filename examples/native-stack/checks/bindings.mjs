import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fixed coverage prevents editing the receipt to silently drop a required consumer.
export const implementationFiles = ['src/app.mjs', 'src/button.mjs', 'src/settings.mjs', 'src/styles.css', 'src/team.mjs', 'src/theme.mjs'];
export const contractFiles = ['package.json', 'src/app.mjs', 'CAPABILITY.md', 'scenarios.json', '.dependency-cruiser.cjs', 'checks/contract.test.mjs', 'checks/support.mjs', 'checks/bindings.mjs', 'checks/bindings.test.mjs', 'checks/observe.mjs', 'checks/behavior.mjs', 'checks/conformance.mjs', 'checks/theme-probe.mjs', 'serve.mjs', 'index.html', 'checks/qualification.json', 'checks/runtime.json', 'checks/workflow.json', 'checks/bindings.json',
  ...['settings', 'team'].flatMap(screen => ['delegation', 'composition', 'independent-copy', 'dead-owner-decoy', 'local-surface', 'theme-sharing-copy'].map(variant => `variants/${screen}-${variant}.mjs`))];
const digest = content => createHash('sha256').update(content).digest('hex');
const definition = directory => JSON.parse(readFileSync(join(directory, 'checks/bindings.json'), 'utf8'));
const identify = (directory, names) => digest(JSON.stringify([...names].sort().map(file => [file, digest(readFileSync(join(directory, file)))])));
export const contractDigest = directory => identify(directory, definition(directory).contractInputs);

// Read-only identities, shared with the toolkit format; this does not accept a review.
export function reviewState(directory) {
  const value = definition(directory);
  return { reviewVersion: 2, id: value.id, definitionDigest: digest(JSON.stringify(value)),
    contractDigest: contractDigest(directory),
    implementations: Object.fromEntries(value.implementations.map(item => [item.id, identify(directory, item.inputs)])) };
}

/** Checks declared review currency, not the truth or quality of the review. */
export function bindingProblems(directory) {
  const value = definition(directory);
  const receipt = JSON.parse(readFileSync(join(directory, 'checks/review.json'), 'utf8'));
  const problems = [];
  // This example has one supported native delivery entrypoint. Reconcile any
  // replacement deliberately; a refreshed review cannot remove required suites.
  const verify = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).scripts?.verify;
  if (verify !== 'node --test --test-concurrency=1 checks/contract.test.mjs checks/bindings.test.mjs') problems.push('Reconcile the native delivery command and its behavior/binding checks');
  const expected = { button: ['src/button.mjs', 'src/theme.mjs', 'src/styles.css'], settings: ['src/settings.mjs'], team: ['src/team.mjs'] };
  const scope = Object.fromEntries(value.implementations.map(item => [item.id, [...item.inputs].sort()]));
  if (JSON.stringify(Object.entries(scope).sort()) !== JSON.stringify(Object.entries(expected).map(([id, files]) => [id, [...files].sort()]).sort())
      || value.implementations.length !== 3
      || value.implementations.some(item => item.role !== (item.id === 'button' ? 'provider' : 'consumer'))) problems.push('Reconcile the actual provider/consumer implementation inventory');
  const current = reviewState(directory);
  const required = contractFiles.filter(file => file !== 'checks/bindings.json').sort();
  if (JSON.stringify([...value.contractInputs].sort()) !== JSON.stringify(required)) problems.push('Reconcile the contract/check inventory');
  if (receipt.reviewVersion !== 2 || receipt.id !== current.id || receipt.definitionDigest !== current.definitionDigest) problems.push('Reconcile the responsibility and implementation inventory');
  if (receipt.contractDigest !== current.contractDigest) problems.push('Contract changed; reconcile and verify the declared implementations');
  if (JSON.stringify(Object.entries(receipt.implementations ?? {}).sort()) !== JSON.stringify(Object.entries(current.implementations).sort())) problems.push('Implementation changed; reframe or reaffirm its contract and reverify');
  if (typeof receipt.rationale !== 'string' || !receipt.rationale.trim()) problems.push('An explicit contract review explanation is required');
  const sources = readdirSync(join(directory, 'src')).sort();
  if (JSON.stringify(sources) !== JSON.stringify(implementationFiles.map(file => file.slice(4)).sort())) problems.push('Reconcile the source inventory before adding or removing implementations');
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const problems = bindingProblems(fileURLToPath(new URL('../', import.meta.url)));
    for (const problem of problems) console.error(problem);
    if (problems.length) process.exitCode = 1;
    else console.log('Component and screen contract bindings are current; run behavior and qualified ownership checks too.');
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
