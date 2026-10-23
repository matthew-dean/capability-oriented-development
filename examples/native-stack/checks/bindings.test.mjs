import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bindingProblems, reviewState } from './bindings.mjs';
import { behavior, dispose, fixture, followsPolicy, root } from './support.mjs';
function completeFixture() {
  const directory = fixture();
  for (const name of ['CAPABILITY.md', 'checks', 'variants', 'serve.mjs', 'package.json']) cpSync(join(root, name), join(directory, name), {recursive:true});
  return directory;
}
function reaffirm(directory) {
  writeFileSync(join(directory, 'checks/review.json'), JSON.stringify({ ...reviewState(directory), rationale: 'Explicit scoped fixture review; native behavior and ownership remain required.' }));
}
test('current source has explicit contract review for component, theme and screens', () => assert.deepEqual(bindingProblems(root), []));
for (const file of ['CAPABILITY.md','src/button.mjs','src/settings.mjs','src/team.mjs','src/theme.mjs','variants/settings-local-surface.mjs']) {
  test(file + ': an edit expires the affected review', () => {
    const directory = completeFixture();
    try { writeFileSync(join(directory, file), readFileSync(join(directory, file), 'utf8') + '\n'); assert.ok(bindingProblems(directory).length > 0); reaffirm(directory); assert.deepEqual(bindingProblems(directory), []); } finally { dispose(directory); }
  });
}
test('fresh review cannot excuse a button that ignores disabled state', async () => {
  const directory = completeFixture();
  try { const path=join(directory,'src/button.mjs'); writeFileSync(path,readFileSync(path,'utf8').replace('button.disabled = disabled || busy','button.disabled = false')); reaffirm(directory); assert.deepEqual(bindingProblems(directory),[]); await assert.rejects(behavior(directory)); } finally { dispose(directory); }
});
test('changed contract needs matching implementation, even after review is refreshed', async () => {
  const directory = completeFixture();
  try {
    const path=join(directory,'scenarios.json'); const rows=JSON.parse(readFileSync(path,'utf8'));
    const previousRadius=rows[0].radius;
    const nextRadius=`${Number.parseFloat(previousRadius) + 14}px`;
    rows.forEach(row=>row.radius=nextRadius); writeFileSync(path,JSON.stringify(rows)); reaffirm(directory);
    assert.deepEqual(bindingProblems(directory),[]); await assert.rejects(behavior(directory));
    const theme=join(directory,'src/theme.mjs'); writeFileSync(theme,readFileSync(theme,'utf8').replace(`radius: '${previousRadius}'`, `radius: '${nextRadius}'`)); await behavior(directory); assert.equal(await followsPolicy(directory), true); assert.ok(bindingProblems(directory).length>0); reaffirm(directory); assert.deepEqual(bindingProblems(directory),[]);
  } finally { dispose(directory); }
});
test('unregistered source requires explicit inventory reconciliation', () => {
  const directory = completeFixture();
  try { writeFileSync(join(directory,'src/local-button.mjs'),'export const duplicate = true;'); assert.ok(bindingProblems(directory).some(p=>p.includes('source inventory'))); } finally { dispose(directory); }
});

test('a compact review cannot drop an actual screen binding', () => {
  const directory = completeFixture();
  try {
    const path = join(directory, 'checks/bindings.json');
    const value = JSON.parse(readFileSync(path, 'utf8'));
    value.implementations = value.implementations.filter(item => item.id !== 'team');
    writeFileSync(path, JSON.stringify(value));
    reaffirm(directory);
    assert.ok(bindingProblems(directory).some(problem => problem.includes('implementation inventory')));
  } finally { dispose(directory); }
});

test('fresh review cannot disconnect the normal delivery command from behavior or binding checks', () => {
  for (const verify of ['node --test checks/contract.test.mjs', 'node --test checks/bindings.test.mjs', 'echo passed']) {
    const directory = completeFixture();
    try {
      const path = join(directory, 'package.json');
      const value = JSON.parse(readFileSync(path, 'utf8'));
      value.scripts.verify = verify;
      writeFileSync(path, JSON.stringify(value));
      reaffirm(directory);
      assert.ok(bindingProblems(directory).some(problem => problem.includes('delivery command')));
    } finally { dispose(directory); }
  }
});
