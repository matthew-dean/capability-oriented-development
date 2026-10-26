import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { observe } from './observe.mjs';

const [mode, contractPath] = process.argv.slice(2);
const themePath = 'src/theme.mjs';
const buttonPath = 'src/Button.vue';
const originalTheme = readFileSync(themePath);
const originalButton = readFileSync(buttonPath);
const originalContract = readFileSync(contractPath);

function expected() {
  return JSON.parse(readFileSync(contractPath, 'utf8')).requirements.states;
}

async function behavior() {
  assert.deepEqual(await observe(), expected());
}

try {
  if (mode === 'behavior') await behavior();
  else if (mode === 'ownership') {
    await behavior();
    writeFileSync(themePath, "export const theme = { radius: '24px' };\n");
    assert.deepEqual(await observe(), expected().map(row => ({ ...row, radius: '24px' })));

    // Sharing the theme is not enough: consumers must also follow the component.
    writeFileSync(themePath, originalTheme);
    const source = originalButton.toString();
    if (!source.includes('borderRadius: theme.radius')) throw Error('Reconcile the component probe.');
    writeFileSync(buttonPath, source.replace('borderRadius: theme.radius', "borderRadius: `calc(${theme.radius} + 3px)`"));
    assert.deepEqual(await observe(), expected().map(row => ({ ...row, radius: `${Number.parseFloat(row.radius) + 3}px` })));
  } else if (mode === 'changes') {
    const contract = JSON.parse(originalContract);
    contract.requirements.states[0].radius = '99px';
    writeFileSync(contractPath, JSON.stringify(contract));
    await assert.rejects(behavior(), { name: 'AssertionError' });
    writeFileSync(contractPath, originalContract);

    writeFileSync(buttonPath, originalButton.toString().replace(':disabled="busy"', ':disabled="false"'));
    await assert.rejects(behavior(), { name: 'AssertionError' });
  } else throw Error(`Unknown check mode: ${mode}`);
} catch (error) {
  console.error(error);
  process.exitCode = error instanceof assert.AssertionError ? 1 : 2;
} finally {
  writeFileSync(themePath, originalTheme);
  writeFileSync(buttonPath, originalButton);
  writeFileSync(contractPath, originalContract);
}
