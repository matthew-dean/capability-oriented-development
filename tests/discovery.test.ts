import { expect, it } from 'vitest';
import { discover, planReuse } from '../src/index.js';
import type { CapabilityIndex, CapabilityNode } from '../src/types.js';

const button: CapabilityNode = {
  schemaVersion: 1, id: 'ui.action', intent: 'Render an interactive action', owner: 'design', status: 'stable',
  manifest: 'components/action.capability.json', requires: [], extensions: ['Selected and outline variants'],
  examples: ['action.example.ts'], tests: ['action.test.ts'],
  invariants: ['Keyboard focus and disabled appearance remain owned by this component.'],
  operations: [{ name: 'render', file: 'index.ts', source: 'components/index.ts', export: 'Action', declaration: 'components/action.ts', line: 1, signature: '() => string' }],
};
const index = (capabilities = [button]): CapabilityIndex => ({ indexVersion: 1, compilerVersion: 'test', ok: true, diagnostics: [], capabilities, exports: [], files: {}, revision: { commit: null, dirty: null }, digest: 'test' });

it('finds a responsibility from its documented invariant without naming the design system', () => {
  const result = discover(index(), { intent: 'keyboard focus' });
  expect(result.results.map(c => c.id)).toEqual(['ui.action']);
  expect(result.results[0]?.reasons).toContain('invariant:focus');
  expect(result.results[0]?.contractFit).toBe('unknown');
  expect(planReuse(index(), { intent: 'disabled appearance' }).candidates[0]?.constraints).toEqual(button.invariants);
});

it('finds the owner through its resolved declaration behind a barrel export', () => {
  expect(discover(index(), { intent: 'unrelated', affectedFiles: ['components/action.ts'] }).results[0]?.reasons).toContain('affected-file');
});

it('ranks direct intent ahead of incidental invariant matches and retains domain/lifecycle filters', () => {
  const direct = { ...button, id: 'ui.focus', intent: 'Manage keyboard focus', invariants: [] };
  const retired = { ...button, id: 'ui.retired', status: 'retired' as const };
  expect(discover(index([button, direct, retired]), { intent: 'keyboard focus' }).results.map(c => c.id)).toEqual(['ui.focus', 'ui.action']);
  expect(discover(index(), { intent: 'keyboard focus', domain: 'backend' }).results).toEqual([]);
  expect(discover(index(), { intent: 'keyboard focus', limit: 0 }).results).toEqual([]);
});
