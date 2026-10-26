import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { behavior, dispose, fixture, followsPolicy } from './support.mjs';

// These are semantic disagreement checks. The toolkit separately owns the
// shared review-freshness mechanism, tested in tests/contracts.test.ts.
test('a changed promise fails until the owner implements it', async () => {
  const directory = fixture();
  try {
    const path = join(directory, 'capability.json');
    const contract = JSON.parse(readFileSync(path, 'utf8'));
    contract.requirements.appearance.radius = '24px';
    writeFileSync(path, JSON.stringify(contract));
    await assert.rejects(behavior(directory), { name: 'AssertionError' });

    const theme = join(directory, 'src/theme.mjs');
    writeFileSync(theme, readFileSync(theme, 'utf8').replace("radius: '10px'", "radius: '24px'"));
    await behavior(directory);
    assert.equal(await followsPolicy(directory), true);
  } finally {
    dispose(directory);
  }
});

test('an implementation that ignores disabled state fails the unchanged promise', async () => {
  const directory = fixture();
  try {
    const path = join(directory, 'src/button.mjs');
    writeFileSync(path, readFileSync(path, 'utf8').replace('button.disabled = disabled || busy', 'button.disabled = false'));
    await assert.rejects(behavior(directory), { name: 'AssertionError' });
  } finally {
    dispose(directory);
  }
});
