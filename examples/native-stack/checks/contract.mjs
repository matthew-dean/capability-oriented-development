// The toolkit always invokes this entrypoint with one of these three modes.
// It owns review freshness, case substitution and restoration. These native
// assertions own what the app actually promises and what the browser observes.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { behavior, followsPolicy, root } from './support.mjs';

try {
  const mode = process.argv[2];
  // An independent inventory prevents deleting a contract row to hide coverage.
  assert.deepEqual(readdirSync(join(root, 'src')).sort(), [
    'app.mjs', 'button.mjs', 'settings.mjs', 'styles.css', 'team.mjs', 'theme.mjs',
  ]);
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts.verify, 'cod verify . capability.json --allow-execution');

  if (mode === 'behavior') await behavior(root);
  else if (mode === 'ownership') process.exitCode = await followsPolicy(root) ? 0 : 1;
  else if (mode === 'changes') {
    const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'checks/changes.test.mjs'], { cwd: root, stdio: 'inherit' });
    process.exitCode = result.status ?? 2;
  } else throw Error(`Unknown check mode: ${mode}`);
} catch (error) {
  console.error(error);
  process.exitCode = error instanceof assert.AssertionError ? 1 : 2;
}
