import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript-api';
import { contained, hash, portable, reference, scan, sourcePattern } from './filesystem.js';
import { parseCapability } from './schema.js';
import type { CapabilityIndex, CapabilityNode, Diagnostic, SourceExport } from './types.js';

export function indexDigest(index: Omit<CapabilityIndex, 'digest'> | CapabilityIndex): string {
  const { revision: _revision, ...facts } = index;
  const { digest: _digest, ...content } = facts as Omit<CapabilityIndex, 'revision'>;
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
  return hash(JSON.stringify(canonical(content)));
}
export function buildIndex(directory: string): CapabilityIndex {
  const root = realpathSync(resolve(directory)), rel = (file: string): string => portable(relative(root, file));
  const diagnostics: Diagnostic[] = [];
  const emit = (code: string, file: string, message: string, severity: 'error' | 'warning' = 'error'): void => { diagnostics.push({ code, file: rel(file), message, severity }); };
  const inventory = scan(root);
  for (const file of inventory.symlinks) emit('SYMLINK_SKIPPED', file, 'Symlinks are excluded from the scan', 'warning');
  const contents = new Map<string, string>();
  const read = (file: string): string => {
    let content = contents.get(file);
    if (content === undefined) { content = readFileSync(file, 'utf8'); contents.set(file, content); }
    return content;
  };
  const caps: CapabilityNode[] = [], evidence = new Set<string>();
  for (const file of inventory.files.filter(f => f.endsWith('.capability.json'))) {
    let raw: unknown;
    try { raw = JSON.parse(read(file)); } catch (e) { emit('INVALID_JSON', file, String(e)); continue; }
    const parsed = parseCapability(raw);
    if (!parsed.capability) { for (const error of parsed.errors) emit('INVALID_MANIFEST', file, error); continue; }
    const c = parsed.capability, names = new Set<string>(), bindings = new Set<string>();
    const operations = c.operations.map(op => {
      if (names.has(op.name)) emit('DUPLICATE_OPERATION', file, `Repeated operation ${op.name}`);
      names.add(op.name); let source = '';
      try {
        const target = reference(dirname(file), op.file); source = rel(target);
        if (!sourcePattern.test(target)) emit('UNSUPPORTED_SOURCE', file, op.file); else read(target);
        const binding = `${source}#${op.export}`;
        if (bindings.has(binding)) emit('DUPLICATE_BINDING', file, binding);
        bindings.add(binding);
      } catch (e) { emit('INVALID_REFERENCE', file, `${op.name}: ${String(e)}`); }
      return { ...op, source, declaration: null, line: null, signature: null };
    });
    for (const kind of ['examples', 'tests'] as const) {
      if (c.status === 'stable' && !c[kind].length) emit('INSUFFICIENT_EVIDENCE', file, `Stable capability needs ${kind}`);
      for (const path of c[kind]) try { const target = reference(dirname(file), path); read(target); evidence.add(target); } catch (e) { emit('INVALID_EVIDENCE', file, `${kind}: ${String(e)}`); }
    }
    for (const guide of c.evolution?.guidance ?? []) {
      try { read(reference(dirname(file), guide, root)); }
      catch (error) { emit('INVALID_EVOLUTION_GUIDANCE', file, `${guide}: ${String(error)}`); }
    }
    caps.push({ ...c, manifest: rel(file), operations });
  }
  caps.sort((a, b) => a.id.localeCompare(b.id) || a.manifest.localeCompare(b.manifest));
  const ids = new Map<string, CapabilityNode>();
  for (const c of caps) { if (ids.has(c.id)) emit('DUPLICATE_ID', join(root, c.manifest), c.id); else ids.set(c.id, c); }
  for (const c of caps) for (const dep of c.requires) {
    const target = ids.get(dep);
    if (!target) emit('MISSING_DEPENDENCY', join(root, c.manifest), `${c.id} requires ${dep}`);
    else if (target.status === 'retired') emit('RETIRED_DEPENDENCY', join(root, c.manifest), dep);
    else if (target.status === 'deprecated') emit('DEPRECATED_DEPENDENCY', join(root, c.manifest), dep, 'warning');
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  const visit = (id: string, chain: string[]): void => {
    if (visiting.has(id)) { emit('DEPENDENCY_CYCLE', join(root, ids.get(id)!.manifest), [...chain, id].join(' -> ')); return; }
    if (visited.has(id)) return;
    visiting.add(id); for (const dep of ids.get(id)?.requires ?? []) if (ids.has(dep)) visit(dep, [...chain, id]);
    visiting.delete(id); visited.add(id);
  };
  for (const id of ids.keys()) visit(id, []);
  let options: ts.CompilerOptions = { strict: true, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true, noEmit: true };
  const configFile = join(root, 'tsconfig.json');
  if (existsSync(configFile)) {
    const config = ts.parseConfigFileTextToJson(configFile, read(configFile));
    if (config.error) emit('INVALID_TSCONFIG', configFile, ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    else {
      const configHost: ts.ParseConfigHost = { ...ts.sys, readFile: file => existsSync(file) && contained(root, resolve(file)) ? read(resolve(file)) : ts.sys.readFile(file) };
      const parsed = ts.parseJsonConfigFileContent(config.config, configHost, root); options = { ...parsed.options, noEmit: true };
      for (const error of parsed.errors) emit('INVALID_TSCONFIG', configFile, ts.flattenDiagnosticMessageText(error.messageText, '\n'));
    }
  }
  const sources = inventory.files.filter(f => sourcePattern.test(f)), host = ts.createCompilerHost(options), hostRead = host.readFile;
  host.readFile = file => {
    const absolute = resolve(file);
    if (contained(root, absolute) && !absolute.includes('/node_modules/') && existsSync(absolute)) return read(absolute);
    return hostRead(file);
  };
  // Check all scoped source/evidence, including files excluded by a consuming tsconfig.
  const program = ts.createProgram(sources, options, host), checker = program.getTypeChecker();
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const file = diagnostic.file?.fileName ?? configFile;
    const position = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : null;
    emit('TYPE_ERROR', file, `TS${diagnostic.code}${position ? `:${position.line + 1}:${position.character + 1}` : ''} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
  }
  const sourceExports: SourceExport[] = [], resolved = new Map<string, { signature: string; declaration: string | null; line: number | null }>(), identities = new Map<string, ts.Symbol>();
  for (const source of program.getSourceFiles()) {
    if (source.isDeclarationFile || source.fileName.includes('/node_modules/')) continue;
    if (!contained(root, resolve(source.fileName))) { emit('SOURCE_OUTSIDE_ROOT', source.fileName, 'Imported project source is outside the scan root'); continue; }
    read(source.fileName); const module = checker.getSymbolAtLocation(source);
    if (!module) continue;
    for (const exp of checker.getExportsOfModule(module)) {
      const target = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
      const declaration = target.valueDeclaration ?? target.declarations?.[0];
      if (!declaration) { emit('UNRESOLVED_EXPORT', source.fileName, exp.name); continue; }
      const type = checker.getTypeOfSymbolAtLocation(target, declaration);
      const signature = target.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)
        ? checker.typeToString(checker.getDeclaredTypeOfSymbol(target), declaration, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias)
        : checker.typeToString(type, declaration, ts.TypeFormatFlags.NoTruncation);
      const origin = declaration.getSourceFile(), binding = `${rel(source.fileName)}#${exp.name}`;
      resolved.set(binding, { signature, declaration: rel(origin.fileName), line: origin.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 });
      identities.set(binding, target);
      sourceExports.push({ file: rel(source.fileName), export: exp.name, signature, owners: [] });
    }
  }
  const ownership = new Map<ts.Symbol, string[]>();
  for (const c of caps) for (const op of c.operations) {
    const fact = resolved.get(`${op.source}#${op.export}`);
    if (!fact) emit('MISSING_EXPORT', join(root, c.manifest), `${op.file} does not resolve ${op.export}`);
    else {
      Object.assign(op, fact);
      // Aliases share declaration identity; ownership applies to the canonical symbol.
      const canonical = identities.get(`${op.source}#${op.export}`)!, owners = ownership.get(canonical) ?? [];
      if (!owners.includes(c.id)) owners.push(c.id); ownership.set(canonical, owners);
    }
  }
  for (const binding of resolved.keys()) {
    const exp = sourceExports.find(e => `${e.file}#${e.export}` === binding)!;
    exp.owners = (ownership.get(identities.get(binding)!) ?? []).sort();
    if (exp.owners.length > 1) emit('CONFLICTING_OWNERSHIP', join(root, exp.file), `${exp.export}: ${exp.owners.join(', ')}`);
    if (!exp.owners.length && !evidence.has(join(root, exp.file))) emit('UNOWNED_EXPORT', join(root, exp.file), exp.export, 'warning');
  }
  sourceExports.sort((a, b) => a.file.localeCompare(b.file) || a.export.localeCompare(b.export));
  diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  const files = Object.fromEntries([...contents].sort(([a], [b]) => rel(a).localeCompare(rel(b))).map(([file, content]) => [rel(file), hash(content)]));
  let commit: string | null = null, dirty: boolean | null = null;
  try {
    commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = execFileSync('git', ['-C', root, 'status', '--porcelain', '--', '.'], { encoding: 'utf8' }).trim().length > 0;
  } catch { /* Non-Git directories and unborn repositories have unknown revision. */ }
  const facts = { indexVersion: 1 as const, compilerVersion: ts.version, ok: !diagnostics.some(d => d.severity === 'error'), diagnostics, capabilities: caps, exports: sourceExports, files, revision: { commit, dirty } };
  return { ...facts, digest: indexDigest(facts) };
}
