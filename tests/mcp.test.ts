import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { createCodServer } from '../src/mcp.js';
it('negotiates MCP, lists read-only tools, and retrieves fresh evidence', async () => {
  const server = createCodServer(resolve('examples')), client = new Client({ name: 'test', version: '1' }), [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(a), client.connect(b)]);
    expect(client.getServerVersion()?.version).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
    const tools = await client.listTools(); expect(tools.tools).toHaveLength(7); expect(tools.tools.every(t => t.annotations?.readOnlyHint)).toBe(true);
    expect((await client.callTool({ name: 'cod_enforce', arguments: { contract: '../package.json' } })).isError).toBe(true);
    const unified = await client.callTool({ name: 'cod_inspect_contract', arguments: { contract: 'capability.json', project: 'native-stack' } });
    expect(unified.isError).toBe(false);
    expect((unified.structuredContent as { id: string }).id).toBe('shared-button');
    expect((await client.callTool({ name: 'cod_inspect_contract', arguments: { contract: '../package.json' } })).isError).toBe(true);
    const packet=await client.callTool({name:'cod_plan',arguments:{intent:'selection'}}); expect((packet.structuredContent as {candidates:unknown[]}).candidates.length).toBeGreaterThan(0);
    const discovered = await client.callTool({ name: 'cod_discover', arguments: { intent: 'selection' } });
    expect((discovered.structuredContent as { results: unknown[] }).results.length).toBeGreaterThan(0);
    expect((await client.callTool({ name: 'cod_get', arguments: { id: 'ui.selection' } })).isError).toBe(false);
    expect((await client.callTool({ name: 'cod_get', arguments: { id: 'missing.id' } })).isError).toBe(true);
    expect((await client.callTool({ name: 'cod_reconcile', arguments: { baseline: '../package.json' } })).isError).toBe(true);
  } finally { await client.close(); await server.close(); }
});
it('serves a real stdio client without contaminating protocol stdout', async () => {
  const client = new Client({ name: 'stdio-test', version: '1' }), transport = new StdioClientTransport({ command: process.execPath, args: [resolve('dist/cli.js'), 'serve', resolve('examples')], stderr: 'pipe' });
  try { await client.connect(transport); expect((await client.listTools()).tools.map(t => t.name)).toContain('cod_check'); const check = await client.callTool({ name: 'cod_check', arguments: {} }); expect(check.isError).toBe(false); }
  finally { await client.close(); }
});
