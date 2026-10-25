import {execFileSync} from 'node:child_process';import {mkdtempSync,mkdirSync,renameSync,writeFileSync,readFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {afterEach,expect,it} from 'vitest';import {buildIndex,planReuse,captureSnapshot,parseIndex,reconcile} from '../src/index.js';
const roots:string[]=[];function fixture(){const root=mkdtempSync(join(tmpdir(),'cod-capture-'));roots.push(root);writeFileSync(join(root,'package.json'),'{"type":"module"}');writeFileSync(join(root,'.gitignore'),'.cod/\n');writeFileSync(join(root,'data.ts'),'export const value=1;');writeFileSync(join(root,'data.test.mjs'),'// linked runtime evidence');writeFileSync(join(root,'data.capability.json'),JSON.stringify({schemaVersion:1,id:'test.data',intent:'Provide shared data values',owner:'platform',status:'experimental',operations:[{name:'value',file:'data.ts',export:'value'}],examples:['data.ts'],tests:['data.test.mjs'],invariants:['Omitted configuration preserves default behavior.']}));return root;}
function commit(root:string){execFileSync('git',['init','-b','main'],{cwd:root,stdio:'ignore'});execFileSync('git',['add','.'],{cwd:root});execFileSync('git',['-c','user.name=Test','-c','user.email=test@localhost','commit','-m','Starting state'],{cwd:root,stdio:'ignore'});}
afterEach(()=>{for(const r of roots.splice(0))rmSync(r,{recursive:true,force:true});});
it('returns a concise bounded current-contract packet without pretending to prove fit or execute evidence',()=>{const root=fixture(),index=buildIndex(root),packet=planReuse(index,{intent:'shared data'});expect(packet.candidates[0]?.inspect).toEqual(['data.ts']);expect(packet.candidates[0]?.suggestedTests).toEqual(['data.test.mjs']);expect(packet.candidates[0]?.contractFit).toBe('unknown');expect(packet.execution).toBe('not-established');expect(packet).not.toHaveProperty('files');expect(planReuse(index,{intent:'absent'}).candidates).toEqual([]);expect(packet.caveat).toContain('No match is not proof');});
it('captures a verified clean starting index once and refuses dirty or overwritten baselines',()=>{const root=fixture();expect(()=>captureSnapshot(root,'.cod/before.json')).toThrow('clean Git');commit(root);const result=captureSnapshot(root,'.cod/before.json');expect(result.cleanAtCapture).toBe(true);const text=readFileSync(join(root,'.cod/before.json'),'utf8'),before=parseIndex(JSON.parse(text));expect(before.digest).toBe(result.digest);expect(()=>captureSnapshot(root,'.cod/before.json')).toThrow('already exists');writeFileSync(join(root,'data.ts'),'export const value=2;');expect(()=>captureSnapshot(root,'.cod/late.json')).toThrow('clean Git');expect(readFileSync(join(root,'.cod/before.json'),'utf8')).toBe(text);expect(reconcile(before,buildIndex(root)).affectedCapabilities).toContain('test.data');});
it('rejects path escapes, symlink parents and invalid graphs before writing',()=>{const root=fixture(),outside=fixture();commit(root);symlinkSync(outside,join(root,'escape'));for(const path of ['../bad.json','.git/unsafe.json',join(outside,'bad.json'),'escape/bad.json'])expect(()=>captureSnapshot(root,path)).toThrow();unlinkSync(join(root,'escape'));writeFileSync(join(root,'data.ts'),'export const missing=1;');commit(root);expect(()=>captureSnapshot(root,'.cod/before.json')).toThrow('invalid capability graph');});

it('surfaces the real declaration and maintained evolution guide, and routes guide changes through reconciliation',()=>{
  const root=fixture();
  writeFileSync(join(root,'growth.md'),'Inspect peer controls before adding an option; preserve defaults and verify consumers.');
  const manifest=JSON.parse(readFileSync(join(root,'data.capability.json'),'utf8'));
  manifest.evolution={guidance:['growth.md']};
  writeFileSync(join(root,'data.capability.json'),JSON.stringify(manifest));
  const before=buildIndex(root);
  expect(before.ok).toBe(true);
  expect(planReuse(before,{intent:'shared data'}).candidates[0]).toMatchObject({
    contract:'data.capability.json',
    operations:[{file:'data.ts',declaration:'data.ts',line:1}],
    evolution:{state:'documented',guidance:['growth.md']},
  });
  expect(parseIndex(JSON.parse(JSON.stringify(before))).digest).toBe(before.digest);
  writeFileSync(join(root,'growth.md'),'Add native API compatibility checks before accepting new options.');
  const after=buildIndex(root), impact=reconcile(before,after);
  expect(after.digest).not.toBe(before.digest);
  expect(impact.affectedCapabilities).toContain('test.data');
  expect(impact.changes).toContainEqual({capability:'test.data',kind:'evolution-guidance-changed',operation:null,review:'semantic-review'});
});

it('reports missing evolution guidance explicitly without invalidating legacy manifests',()=>{
  const root=fixture(),before=buildIndex(root);
  expect(before.ok).toBe(true);
  expect(planReuse(before,{intent:'shared data'}).candidates[0]).toMatchObject({evolution:{state:'not-documented',guidance:[]}});
  expect(parseIndex(JSON.parse(JSON.stringify(before))).digest).toBe(before.digest);
});

it('rejects inaccessible or escaping evolution guides rather than suggesting unverified paths',()=>{
  const root=fixture(),manifest=JSON.parse(readFileSync(join(root,'data.capability.json'),'utf8'));
  for(const file of ['missing.md','../outside.md','/etc/passwd']) {
    writeFileSync(join(root,'data.capability.json'),JSON.stringify({...manifest,evolution:{guidance:[file]}}));
    const index=buildIndex(root), packet=planReuse(index,{intent:'shared data'});
    expect(packet.validationOk).toBe(false);
    expect(packet.diagnostics.some(d=>d.code==='INVALID_EVOLUTION_GUIDANCE')).toBe(true);
    expect(packet.candidates).toEqual([]);
  }
});

it('allows sibling owner guidance, rejects symlink escapes, and routes changes to dependent consumers',()=>{
  const root=fixture(),outside=fixture();
  mkdirSync(join(root,'contracts'));mkdirSync(join(root,'docs'));
  const manifest=JSON.parse(readFileSync(join(root,'data.capability.json'),'utf8'));
  renameSync(join(root,'data.capability.json'),join(root,'contracts/data.capability.json'));
  for(const file of ['data.ts','data.test.mjs'])renameSync(join(root,file),join(root,'contracts',file));
  writeFileSync(join(root,'docs/growth.md'),'Keep native defaults and inspect peer APIs.');
  writeFileSync(join(root,'contracts/data.capability.json'),JSON.stringify({...manifest,evolution:{guidance:['../docs/growth.md']}}));
  writeFileSync(join(root,'consumer.ts'),'export const consume=()=>1;');
  writeFileSync(join(root,'consumer.test.mjs'),'// consumer evidence');
  writeFileSync(join(root,'consumer.capability.json'),JSON.stringify({...manifest,id:'test.consumer',requires:['test.data'],operations:[{name:'consume',file:'consumer.ts',export:'consume'}],examples:['consumer.ts'],tests:['consumer.test.mjs']}));
  const before=buildIndex(root);expect(before.ok).toBe(true);
  expect(planReuse(before,{intent:'shared data'}).candidates.find(c=>c.id==='test.data')?.evolution.guidance).toEqual(['docs/growth.md']);
  writeFileSync(join(root,'docs/growth.md'),'Preserve consumer semantics and native defaults.');
  const impact=reconcile(before,buildIndex(root));
  expect(impact.affectedCapabilities).toEqual(['test.consumer','test.data']);
  expect(impact.recommendedTests).toEqual(['consumer.test.mjs','contracts/data.test.mjs']);
  symlinkSync(join(outside,'data.ts'),join(root,'docs/escaped.md'));
  writeFileSync(join(root,'contracts/data.capability.json'),JSON.stringify({...manifest,evolution:{guidance:['../docs/escaped.md']}}));
  expect(buildIndex(root).diagnostics.some(d=>d.code==='INVALID_EVOLUTION_GUIDANCE')).toBe(true);
});
