// A guided demonstration of the SAME assertions used by normal verification.
// All edits happen in disposable application fixtures, never in your checkout.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { behavior, dispose, fixture, followsPolicy } from './support.mjs';

const directory = fixture();
try {
  console.log('1. Read capability.json: both screens promise a 10px button radius.');
  await behavior(directory);
  console.log('   PASS: the browser observes that appearance and all declared states.\n');

  console.log('2. Change only requirements.appearance.radius to 24px.');
  const contractPath = join(directory, 'capability.json');
  const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
  contract.requirements.appearance.radius = '24px';
  writeFileSync(contractPath, JSON.stringify(contract));
  // A browser crash is not the expected rejection: require an assertion failure.
  await assert.rejects(behavior(directory), {
    name: 'AssertionError',
    message: /settings\/idle: violates capability.json/,
  });
  console.log('   REJECTED as intended: Settings still renders the old 10px radius.\n');

  console.log('3. Change the owner token in src/theme.mjs to 24px too.');
  const themePath = join(directory, 'src/theme.mjs');
  writeFileSync(themePath, readFileSync(themePath, 'utf8').replace("radius: '10px'", "radius: '24px'"));
  await behavior(directory);
  assert.equal(await followsPolicy(directory), true);
  console.log('   PASS: both screens match, and both follow another owner change.');
  console.log('   Neither screen source was edited.\n');
} finally {
  dispose(directory);
}

const copy = fixture('settings', 'dead-owner-decoy');
try {
  console.log('4. Start again at 10px. Replace Settings with a copy plus an unused Button import.');
  await behavior(copy);
  console.log('   Behavior PASS: it looks and works correctly today.');
  assert.equal(await followsPolicy(copy), false);
  console.log('   Ownership REJECTED as intended: the copy ignores the changed owner.\n');
} finally {
  dispose(copy);
}

console.log('All temporary apps removed. The checked-in app was unchanged.');
console.log('Next: read checks/contract.test.mjs, then checks/changes.test.mjs.');
console.log('Run cod verify <example-root> capability.json --allow-execution for the complete delivery checks.');
