import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { compileTemplate, parse } from '@vue/compiler-sfc';
import postcss from 'postcss';
import ts from 'typescript-api';
import { z } from 'zod';

const contractSchema = z.object({
  enforcementVersion: z.literal(1),
  id: z.string().min(1),
  responsibility: z.string().min(1),
  authority: z.string().min(1),
  externalStyles: z.array(z.object({ file: z.string().min(1), className: z.string().regex(/^[A-Za-z_][\w-]*$/), placementProperties: z.array(z.string().regex(/^[a-z-]+$/)) }).strict()).default([]),
  consumers: z.array(z.object({
    file: z.string().min(1),
    provider: z.object({ module: z.string().min(1), export: z.string().min(1) }).strict(),
    placementProperties: z.array(z.string().regex(/^[a-z-]+$/)),
    styleBindings: z.array(z.object({ variable: z.string().regex(/^[A-Za-z_$][\w$]*$/), properties: z.array(z.string().min(1)) }).strict()),
  }).strict()).min(1),
}).strict();
export type PresentationContract = z.input<typeof contractSchema>;
export type EnforcementFinding = { file: string; obligation: 'provider' | 'presentation' | 'coverage'; state: 'violated' | 'unresolved'; message: string };
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

function boundedFile(root: string, file: string): string {
  if (isAbsolute(file)) throw new Error('Contract files must be relative');
  const realRoot = realpathSync(root), full = realpathSync(resolve(realRoot, file)), rel = relative(realRoot, full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Contract file escapes root');
  return readFileSync(full, 'utf8');
}

/** Explicit, bounded source obligations. This is not an arbitrary semantic duplicate detector. */
export function enforcePresentation(root: string, input: unknown) {
  const contract = contractSchema.parse(input), findings: EnforcementFinding[] = [], sources: Record<string, string> = {};
  const add = (file: string, obligation: EnforcementFinding['obligation'], state: EnforcementFinding['state'], message: string) => findings.push({ file, obligation, state, message });
  try { sources[contract.authority] = hash(boundedFile(root, contract.authority)); }
  catch (e) { add(contract.authority, 'coverage', 'unresolved', `Authority is inaccessible: ${String(e)}`); }
  for (const consumer of contract.consumers) {
    const file = consumer.file;
    try {
      const source = boundedFile(root, file); sources[file] = hash(source);
      const parsed = parse(source, { filename: file });
      if (parsed.errors.length || !parsed.descriptor.template || !parsed.descriptor.scriptSetup || parsed.descriptor.script) {
        add(file, 'coverage', 'unresolved', 'Requires an inline template and script setup with no separate script block'); continue;
      }
      const descriptor = parsed.descriptor;
      if ([descriptor.template, descriptor.scriptSetup, ...descriptor.styles].some(b => b?.src) || descriptor.styles.some(b => b.lang && b.lang !== 'css')) {
        add(file, 'coverage', 'unresolved', 'External blocks and non-CSS style languages are not covered'); continue;
      }
      if (descriptor.scriptSetup!.lang && !['ts','js'].includes(descriptor.scriptSetup!.lang)) { add(file, 'coverage', 'unresolved', 'Unsupported script language'); continue; }
      // Parse import bindings directly. Compiler macro/type resolution must not read
      // repository imports beyond this root or execute a repository configuration.
      const ast = ts.createSourceFile(file + '.ts', descriptor.scriptSetup!.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      if ((ast as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics.length) { add(file, 'coverage', 'unresolved', 'Script syntax could not be parsed'); continue; }
      const imports: Array<{ source: string; imported: string; local: string }> = [];
      for (const statement of ast.statements) {
        if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.importClause?.isTypeOnly) continue;
        const clause = statement.importClause;
        if (clause?.name) imports.push({ source: statement.moduleSpecifier.text, imported: 'default', local: clause.name.text });
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const binding of clause.namedBindings.elements) {
          if (!binding.isTypeOnly) imports.push({ source: statement.moduleSpecifier.text, imported: binding.propertyName?.text ?? binding.name.text, local: binding.name.text });
        }
      }
      const refs = imports.filter(i => i.source === 'vue' && ['ref','shallowRef'].includes(i.imported)).map(i => i.local);
      const aliases = imports.filter(i => i.source === consumer.provider.module && i.imported === consumer.provider.export).map(i => i.local);
      const ownsTag = (tag: string) => aliases.some(a => tag === a || tag === a.replace(/\B([A-Z])/g, '-$1').toLowerCase());
      const compiled = compileTemplate({ source: descriptor.template!.content, filename: file, id: contract.id });
      if (compiled.errors.length || !compiled.ast) { add(file, 'coverage', 'unresolved', 'Template compilation failed'); continue; }
      const templateAst = descriptor.template!.ast;
      if (!templateAst) { add(file, 'coverage', 'unresolved', 'Template source AST is unavailable'); continue; }
      const roots = templateAst.children.filter(n => n.type === 1);
      if (roots.length !== 1 || !ownsTag(roots[0]!.tag)) add(file, 'coverage', 'unresolved', 'The declared wrapper must have one provider element as its template root');
      let used = 0;
      // Compiler AST, not text matching: comments and unused imports cannot satisfy ownership.
      function visit(node: unknown): void {
        if (!node || typeof node !== 'object') return;
        const n = node as { type?: number; tag?: string; props?: Array<{ type: number; name: string; arg?: { content?: string; isStatic?: boolean }; exp?: { content?: string }; value?: { content: string } }>; children?: unknown[]; branches?: unknown[] };
        if (n.type === 1 && n.tag === 'component') add(file, 'coverage', 'unresolved', 'Dynamic components require additional binding analysis');
        if (n.type === 1 && n.tag && ownsTag(n.tag)) {
          used++;
          for (const p of n.props ?? []) {
            if (p.type === 7 && p.name === 'bind' && !p.arg) add(file, 'coverage', 'unresolved', 'Spread bindings may introduce styling; not covered');
            if (p.type === 7 && p.name === 'bind' && p.arg?.isStatic === false) add(file, 'coverage', 'unresolved', 'Dynamic attribute names may introduce styling; not covered');
            if (p.type === 6 && p.name === 'style') {
              const css = postcss.parse(`x{${p.value?.content ?? ''}}`);
              css.walkDecls(d => { if (!consumer.placementProperties.includes(d.prop)) add(file, 'presentation', 'violated', `Provider appearance is locally overridden by ${d.prop}`); });
            }
            if (p.type === 7 && p.name === 'bind' && p.arg?.content === 'style') {
              if (!consumer.styleBindings.some(b => b.variable === p.exp?.content)) add(file, 'coverage', 'unresolved', 'Unregistered dynamic style expression');
            }
          }
        }
        for (const child of [...(n.children ?? []), ...(n.branches ?? [])]) visit(child);
      }
      visit(templateAst);
      if (!used) add(file, 'provider', 'violated', `Render ${consumer.provider.export} from ${consumer.provider.module}; an unused import or another control does not satisfy this responsibility`);
      // Conservative coverage: only placement declarations are allowed anywhere in the wrapper.
      for (const block of descriptor.styles) {
        const css = postcss.parse(block.content);
        css.walkDecls(d => { if (!consumer.placementProperties.includes(d.prop)) add(file, 'presentation', 'violated', `Local ${d.prop} duplicates presentation owned by ${contract.authority}; use supported provider options or extend the owner`); });
        css.walkAtRules(r => { if (!['media','supports'].includes(r.name)) add(file, 'coverage', 'unresolved', `Unsupported CSS at-rule ${r.name}`); });
      }
      for (const binding of consumer.styleBindings) {
        let assignments = 0;
        function checkObject(expression: ts.Expression, initialization = false): void {
          if (initialization && ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) && refs.includes(expression.expression.text) && expression.arguments.length === 1 && expression.arguments[0]) { checkObject(expression.arguments[0]); return; }
          if (!ts.isObjectLiteralExpression(expression)) { add(file, 'coverage', 'unresolved', `${binding.variable} is assigned a nonliteral object`); return; }
          assignments++;
          for (const prop of expression.properties) {
            if (!ts.isPropertyAssignment(prop) || !(ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))) { add(file, 'coverage', 'unresolved', `${binding.variable} contains dynamic or spread properties`); continue; }
            const cssProperty = prop.name.text.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            if (!binding.properties.includes(prop.name.text) || !consumer.placementProperties.includes(cssProperty)) add(file, 'presentation', 'violated', `${binding.variable}.${prop.name.text} overrides owner presentation`);
          }
        }
        function walk(n: ts.Node): void {
          if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === binding.variable && n.initializer) checkObject(n.initializer, true);
          if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left) && ts.isIdentifier(n.left.expression) && n.left.expression.text === binding.variable && n.left.name.text === 'value') checkObject(n.right);
          if (ts.isPropertyAccessExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === binding.variable && n.expression.name.text === 'value') add(file, 'coverage', 'unresolved', 'Individual style-property mutation is not covered');
          if (ts.isIdentifier(n) && n.text === binding.variable && !(ts.isVariableDeclaration(n.parent) && n.parent.name === n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n)) add(file, 'coverage', 'unresolved', `${binding.variable} escapes the covered assignment pattern`);
          if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === binding.variable && n.name.text === 'value' && !(ts.isBinaryExpression(n.parent) && n.parent.left === n && n.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken)) add(file, 'coverage', 'unresolved', `${binding.variable}.value is used outside covered literal assignment`);
          ts.forEachChild(n, walk);
        }
        walk(ast);
        if (!assignments) add(file, 'coverage', 'unresolved', `No covered assignments found for ${binding.variable}`);
      }
    } catch (e) { add(file, 'coverage', 'unresolved', String(e)); }
  }
  for (const external of contract.externalStyles) {
    try {
      const source = boundedFile(root, external.file); sources[external.file] = hash(source);
      const css = postcss.parse(source);
      css.walkRules(rule => {
        if (rule.selector.includes('\\')) add(external.file, 'coverage', 'unresolved', 'Escaped external selectors need additional analysis');
        if (new RegExp(`\\.${external.className}(?![\\w-])`).test(rule.selector)) rule.walkDecls(d => {
          if (!external.placementProperties.includes(d.prop)) add(external.file, 'presentation', 'violated', `${rule.selector} locally overrides ${d.prop}; moving a consumer skin into a theme file does not transfer ownership to ${contract.authority}`);
        });
      });
      css.walkAtRules(rule => { if (rule.name === 'import') add(external.file, 'coverage', 'unresolved', 'External CSS imports are not analyzed'); });
    } catch (e) { add(external.file, 'coverage', 'unresolved', String(e)); }
  }
  const violations = findings.some(f => f.state === 'violated'), unresolved = findings.some(f => f.state === 'unresolved');
  return { enforcementVersion: 1 as const, contract: contract.id, contractDigest: hash(JSON.stringify(contract)), state: violations ? 'violated' as const : unresolved ? 'unresolved' as const : 'verified' as const, findings, sources, coverage: 'Declared Vue script-setup wrappers only; no transitive consumer discovery, arbitrary alias/dataflow analysis, behavioral equivalence or visual proof. Verification applies only to these source obligations.' };
}
