import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { architecture, behavior, dispose, fixture, followsPolicy, root, screens } from './support.mjs';
test('both screens render the declared appearance, keyboard access, loading and disabled behavior', async () => { await behavior(root); });
test('shared theme and component rule changes reach both screens; exact sources are restored', async () => {
  const directory = fixture(), before = readFileSync(join(directory, 'src/theme.mjs')), beforeButton = readFileSync(join(directory, 'src/button.mjs'));
  try { assert.equal(await followsPolicy(directory), true); assert.deepEqual(readFileSync(join(directory, 'src/theme.mjs')), before); assert.deepEqual(readFileSync(join(directory, 'src/button.mjs')), beforeButton); } finally { dispose(directory); }
});
test('native dependency rules keep screens behind the shared button boundary', () => {
  const directory = fixture(); try { assert.deepEqual(architecture(directory), []); } finally { dispose(directory); }
});
for (const screen of screens) for (const [variant, conforming] of [['delegation', true], ['composition', true], ['independent-copy', false], ['dead-owner-decoy', false], ['local-surface', false], ['theme-sharing-copy', false]]) {
  test(screen + ': rendered ' + variant + ' preserves current behavior; propagation=' + conforming, async () => {
    const directory = fixture(screen, variant);
    try {
      await behavior(directory);
      assert.equal(await followsPolicy(directory), conforming);
      if (variant === 'independent-copy') assert.ok(architecture(directory).some(v => v.rule.name === 'screens-use-shared-button'));
      else assert.deepEqual(architecture(directory), []);
    } finally { dispose(directory); }
  });
}
