import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const workspace = mkdtempSync(join(tmpdir(), 'package-consumer-'));
const useCommandShell = process.platform === 'win32';

afterAll(() => rmSync(workspace, { recursive: true, force: true }));

describe('published package contract', () => {
  it('installs from its tarball and exposes the declared import', () => {
    const packed = execFileSync(
      'corepack',
      ['pnpm', 'pack', '--pack-destination', workspace],
      { cwd: root, encoding: 'utf8', shell: useCommandShell },
    )
      .trim()
      .split('\n')
      .at(-1);
    expect(packed).toBeDefined();
    const tarball = isAbsolute(packed!) ? packed! : join(workspace, packed!);
    writeFileSync(
      join(workspace, 'package.json'),
      JSON.stringify({ name: 'package-consumer', private: true, type: 'module' }),
    );
    execFileSync(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
      { cwd: workspace, shell: useCommandShell },
    );
    const installed = JSON.parse(
      readFileSync(join(workspace, 'node_modules', 'capability-oriented-development', 'package.json'), 'utf8'),
    );
    expect(installed.exports).toBeDefined();
    expect(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          "import('capability-oriented-development').then(({inspectChangeBindings, verifyChangeBindings, qualifyVariants, verifyPropagation, inspectSystemMap, inspectContract, verifyContract, recordContractReview, refreshContractMap, syncConnections, inspectConnections, inspectCatalog}) => { if([inspectContract, verifyContract, recordContractReview, refreshContractMap, syncConnections, inspectConnections, inspectCatalog].some(api => typeof api !== 'function') || typeof inspectSystemMap !== 'function' || typeof inspectChangeBindings !== 'function' || typeof verifyChangeBindings !== 'function' || typeof qualifyVariants !== 'function' || typeof verifyPropagation !== 'function') throw Error('Missing public change-binding API'); process.stdout.write('ok'); })",
        ],
        { cwd: workspace, encoding: 'utf8' },
      ),
    ).toBe('ok');
    const demo = join(workspace, 'workflow-demo');
    cpSync(join(workspace, 'node_modules', 'capability-oriented-development', 'examples', 'workflow'), demo, { recursive: true });
    const report = JSON.parse(execFileSync(process.execPath, [join(workspace, 'node_modules', 'capability-oriented-development', 'dist', 'cli.js'), 'workflow', demo, 'workflow.json', '--allow-execution'], { cwd: workspace, encoding: 'utf8' }));
    expect(report.state).toBe('ready-for-review');
    expect(report.changeBindings[0].report.state).toBe('current');
    const propagation=JSON.parse(execFileSync(process.execPath,[join(workspace,'node_modules','capability-oriented-development','dist','cli.js'),'verify-propagation',demo,'propagation.json','--allow-execution'],{cwd:workspace,encoding:'utf8'}));
    expect(propagation.state).toBe('verified');expect(propagation.observed.changed).toEqual({control:'OWNER-SENTINEL',consumer:['OWNER-SENTINEL','OWNER-SENTINEL']});
    expect(report.qualifications[0].report.cases.map((c: { conformance: { exitCode: number } }) => c.conformance.exitCode)).toEqual([0, 0, 1, 1, 1, 0]);
    const consumerFile = join(demo, 'live/consumer.mjs');
    const originalConsumer = readFileSync(consumerFile);
    try {
      writeFileSync(consumerFile, readFileSync(join(demo, 'cases/local-precision.mjs')));
      expect(execFileSync(process.execPath, ['--input-type=module', '--eval', "import('./live/consumer.mjs').then(({run})=>process.stdout.write(run(1.75)))"], { cwd: demo, encoding: 'utf8' })).toBe('1 minute ago');
    } finally { writeFileSync(consumerFile, originalConsumer); }
    expect(readFileSync(join(workspace, 'node_modules', 'capability-oriented-development', 'skills', 'cod-workflow', 'SKILL.md'), 'utf8')).toContain('name: cod-workflow');
    const packageRoot = join(workspace, 'node_modules', 'capability-oriented-development');
    expect(existsSync(join(packageRoot, 'internal'))).toBe(false);
    expect(existsSync(join(packageRoot, 'benchmark'))).toBe(false);
    expect(existsSync(join(packageRoot, 'examples/study-evidence'))).toBe(false);
    expect(JSON.parse(readFileSync(join(packageRoot, 'plugin.json'), 'utf8')).name).toBe('cod');
    expect(JSON.parse(readFileSync(join(packageRoot, '.claude-plugin', 'plugin.json'), 'utf8')).name).toBe('cod');
    expect(existsSync(join(packageRoot, 'skills', 'cod-adopt', 'references', 'tool-stacks.md'))).toBe(true);
    const systemReport = JSON.parse(execFileSync(process.execPath, [join(packageRoot, 'dist/cli.js'), 'inspect-system', join(packageRoot, 'examples/system'), 'system.json'], { encoding: 'utf8' }));
    expect(systemReport.state).toBe('resolved');
    expect(systemReport.conformance).toBe('not-evaluated');
    const nativeDemo = join(workspace, 'native-demo');
    cpSync(join(packageRoot, 'examples', 'native-stack'), nativeDemo, { recursive: true });
    expect(existsSync(join(nativeDemo, 'npm-shrinkwrap.json'))).toBe(true);
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: nativeDemo, shell: useCommandShell });
    const nativeReport = execFileSync('npm', ['run', 'verify'], { cwd: nativeDemo, shell: useCommandShell, encoding: 'utf8' });
    expect(nativeReport).toContain('shared-button: ready-for-review');
    const inspected = JSON.parse(execFileSync(process.execPath, [join(packageRoot, 'dist/cli.js'), 'inspect', nativeDemo, 'capability.json', '--json'], { encoding: 'utf8' }));
    expect(inspected.decision.action).toBe('reuse');
    expect(inspected.review.state).toBe('current');
    for (const profile of ['csharp-library', 'vue-design-system']) {
      expect(existsSync(join(packageRoot, 'examples', profile, 'capability.json'))).toBe(true);
    }
    expect(existsSync(join(packageRoot, 'examples/csharp-library/checks/bin'))).toBe(false);

  }, 180_000);
});
