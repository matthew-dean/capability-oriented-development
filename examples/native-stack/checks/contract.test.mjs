import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  architecture, behavior, dispose, fixture, followsPolicy, root, screens,
} from './support.mjs';

// 1. Does the actual app satisfy the values in capability.json today?
test('both screens render the declared appearance, keyboard access, loading and disabled behavior', async () => {
  await behavior(root);
});

// 2. Does a change to the owner reach both consumers without editing them?
test('shared theme and component rule changes reach both screens; exact sources are restored', async () => {
  const directory = fixture();
  const themeBefore = readFileSync(join(directory, 'src/theme.mjs'));
  const buttonBefore = readFileSync(join(directory, 'src/button.mjs'));

  try {
    assert.equal(await followsPolicy(directory), true);
    assert.deepEqual(readFileSync(join(directory, 'src/theme.mjs')), themeBefore);
    assert.deepEqual(readFileSync(join(directory, 'src/button.mjs')), buttonBefore);
  } finally {
    dispose(directory);
  }
});

test('native dependency rules keep screens behind the shared button boundary', () => {
  const directory = fixture();
  try {
    assert.deepEqual(architecture(directory), []);
  } finally {
    dispose(directory);
  }
});

// 3. Can the SAME checks distinguish legitimate reuse from plausible bypasses?
// These expected outcomes belong to this test, never to followsPolicy itself.
const alternatives = [
  { name: 'delegation', followsOwner: true },
  { name: 'composition', followsOwner: true },
  { name: 'independent-copy', followsOwner: false },
  { name: 'dead-owner-decoy', followsOwner: false },
  { name: 'local-surface', followsOwner: false },
  { name: 'theme-sharing-copy', followsOwner: false },
];

for (const screen of screens) {
  for (const alternative of alternatives) {
    test(`${screen}: ${alternative.name} works today; follows owner = ${alternative.followsOwner}`, async () => {
      // Substitute this screen's real source in a temporary application.
      const directory = fixture(screen, alternative.name);
      try {
        await behavior(directory);
        assert.equal(await followsPolicy(directory), alternative.followsOwner);

        // Dependency checks catch a missing import, but accept an unused import.
        // The rendered owner-change check above must catch that remaining bypass.
        const violations = architecture(directory);
        if (alternative.name === 'independent-copy') {
          assert.ok(violations.some(item => item.rule.name === 'screens-use-shared-button'));
        } else {
          assert.deepEqual(violations, []);
        }
      } finally {
        dispose(directory);
      }
    });
  }
}
