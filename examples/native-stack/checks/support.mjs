import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { observe } from './observe.mjs';
export { observe };
export const root = fileURLToPath(new URL('../', import.meta.url));
export const screens = ['settings', 'team'];
export function fixture(screen, variant) {
  const directory = mkdtempSync(join(tmpdir(), 'cod-ui-'));
  for (const name of ['src', 'index.html', 'scenarios.json', '.dependency-cruiser.cjs']) cpSync(join(root, name), join(directory, name), { recursive: true });
  if (variant) cpSync(join(root, 'variants', screen + '-' + variant + '.mjs'), join(directory, 'src', screen + '.mjs'));
  return directory;
}
export const dispose = directory => rmSync(directory, { recursive: true, force: true });
export async function behavior(directory) {
  const values = await observe(directory);
  assert.deepEqual(values, JSON.parse(readFileSync(join(directory, 'scenarios.json'), 'utf8')));
  return values;
}
export async function followsPolicy(directory) {
  const theme = join(directory, 'src/theme.mjs');
  const component = join(directory, 'src/button.mjs');
  const originalTheme = readFileSync(theme);
  const originalComponent = readFileSync(component);
  const baseline = JSON.parse(readFileSync(join(directory, 'scenarios.json'), 'utf8'));
  try {
    await behavior(directory);
    writeFileSync(theme, readFileSync(join(root, 'checks/theme-probe.mjs')));
    const themed = await observe(directory);
    const expectedTheme = baseline.map(row => ({ ...row, background: 'rgb(112, 67, 191)', radius: '24px' }));
    if (JSON.stringify(themed) !== JSON.stringify(expectedTheme)) return false;
    writeFileSync(theme, originalTheme);
    // A clone can share tokens while duplicating the component's rule that maps
    // those tokens to appearance. Change that actual owner rule too, retaining
    // the theme reference and the existing CSS priority.
    const source = originalComponent.toString();
    const rule = "button.style.setProperty('--button-radius', buttonTheme.radius);";
    if (source.split(rule).length !== 2) throw Error('Unsupported shared Button radius rule; requalify its representation');
    writeFileSync(component, source.replace(rule, "button.style.setProperty('--button-radius', `calc(${buttonTheme.radius} + 3px)`);"));
    const refined = await observe(directory);
    const expectedComponent = baseline.map(row => {
      if (!/^\d+(?:\.\d+)?px$/.test(row.radius)) throw Error('Unsupported normative radius representation; requalify the component probe');
      return { ...row, radius: `${Number.parseFloat(row.radius) + 3}px` };
    });
    return JSON.stringify(refined) === JSON.stringify(expectedComponent);
  } finally {
    writeFileSync(theme, originalTheme);
    writeFileSync(component, originalComponent);
  }
}

export function architecture(directory) {
  const entry = fileURLToPath(import.meta.resolve('dependency-cruiser'));
  const cli = join(dirname(entry), '../../bin/dependency-cruiser.mjs');
  const result = spawnSync(process.execPath, [cli, '--config', '.dependency-cruiser.cjs', '--output-type', 'json', 'src'], { cwd: directory, encoding: 'utf8', timeout: 20_000 });
  if (result.error || !result.stdout) throw Error(result.stderr || String(result.error));
  const report = JSON.parse(result.stdout);
  if (!Array.isArray(report.summary?.violations) || (result.status && !report.summary.violations.length)) throw Error('Dependency check unavailable');
  return report.summary.violations;
}
