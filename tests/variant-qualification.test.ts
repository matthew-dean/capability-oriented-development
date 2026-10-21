import {mkdtempSync,writeFileSync,readFileSync,rmSync,symlinkSync,linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it} from 'vitest';
import {qualifyVariants, type VariantQualification} from '../src/variant-qualification.js';
const roots:string[]=[];
afterEach(()=>{for(const r of roots.splice(0))rmSync(r,{recursive:true,force:true})});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'cod-variants-'));roots.push(root);
 writeFileSync(join(root,'owner.mjs'),`export const protect = v => v.startsWith('=') ? "'"+v : v;`);
 const delegation=`import {protect} from './owner.mjs';export const run = protect;`;
 writeFileSync(join(root,'consumer.mjs'),delegation);
 const variants={delegation,composition:`import {protect} from './owner.mjs';export const run = v => protect(v);`,'independent-copy':`export const run = v => v.startsWith('=') ? "'"+v : v;`,'dead-owner-decoy':`import {protect} from './owner.mjs';const unused={protect};export const run = v => v.startsWith('=') ? "'"+v : v;`};
 for(const [id,source]of Object.entries(variants))writeFileSync(join(root,id+'.mjs'),source);
 writeFileSync(join(root,'probe.mjs'),`import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';const before=readFileSync('owner.mjs');try{if(process.argv[2]==='owner')writeFileSync('owner.mjs','export const protect = () => "changed"');const {run}=await import('./consumer.mjs');assert.equal(run('=1'),process.argv[2]==='owner'?'changed':"'=1")}finally{writeFileSync('owner.mjs',before)}`);
 const definition:VariantQualification={qualificationVersion:2,id:'live',responsibility:'Observe real consumer policy delegation',inputs:['owner.mjs','consumer.mjs','probe.mjs',...Object.keys(variants).map(id=>id+'.mjs')],witness:['probe.mjs'],behavior:{command:process.execPath,args:['probe.mjs','behavior']},conformance:{command:process.execPath,args:['probe.mjs','owner']},cases:Object.keys(variants).map(role=>({id:role,role:role as VariantQualification['cases'][number]['role'],overlays:[{target:'consumer.mjs',source:role+'.mjs'}]}))};
 return {root,definition,consumer:readFileSync(join(root,'consumer.mjs'))};
}
it('executes the identical real checker on production overlays, accepts composition and rejects correct copies',async()=>{
 const f=fixture(),r=await qualifyVariants(f.root,f.definition,{allowExecution:true});
 expect(r.state).toBe('qualified');expect(r.cases.map(c=>c.behavior.exitCode)).toEqual([0,0,0,0]);expect(r.cases.map(c=>c.conformance.exitCode)).toEqual([0,0,1,1]);expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('cannot qualify an always-passing conformance checker using negative case labels',async()=>{
 const f=fixture();f.definition.conformance={command:process.execPath,args:['--eval','process.exitCode=0']};
 const r=await qualifyVariants(f.root,f.definition,{allowExecution:true});expect(r.state).toBe('unqualified');expect(r.cases[2]?.conformance.exitCode).toBe(0);expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('restores live source and reports unavailable commands as unresolved',async()=>{
 const f=fixture();f.definition.conformance.command='cod-nonexistent-variant-command';const r=await qualifyVariants(f.root,f.definition,{allowExecution:true});expect(r.state).toBe('unresolved');expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('restores live source after timeout',async()=>{
 const f=fixture();f.definition.behavior={command:process.execPath,args:['--eval','setInterval(()=>{},1000)']};const r=await qualifyVariants(f.root,f.definition,{allowExecution:true,timeoutMs:50});expect(r.state).toBe('unresolved');expect(r.cases[0]?.behavior.timedOut).toBe(true);expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('reports changed fixture/witness inputs and stops further variants',async()=>{
 const f=fixture();f.definition.behavior={command:process.execPath,args:['--eval',`require('node:fs').appendFileSync('probe.mjs','// changed')`]};const r=await qualifyVariants(f.root,f.definition,{allowExecution:true});expect(r.state).toBe('unresolved');expect(r.changedInputs).toContain('probe.mjs');expect(r.cases).toHaveLength(1);expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('preflights every overlay before mutation and rejects outside-root fixtures',async()=>{
 const f=fixture();f.definition.cases[3]!.overlays[0]!.source='../outside.mjs';f.definition.inputs.push('../outside.mjs');await expect(qualifyVariants(f.root,f.definition,{allowExecution:true})).rejects.toThrow();expect(readFileSync(join(f.root,'consumer.mjs'))).toEqual(f.consumer);
});
it('cannot replace the witness directly or through an alias',async()=>{
 const f=fixture();symlinkSync(join(f.root,'probe.mjs'),join(f.root,'probe-alias.mjs'));linkSync(join(f.root,'probe.mjs'),join(f.root,'probe-hardlink.mjs'));
 for(const name of ['probe-alias.mjs','probe-hardlink.mjs']) {f.definition.inputs.push(name);f.definition.cases[0]!.overlays[0]!.target=name;await expect(qualifyVariants(f.root,f.definition,{allowExecution:true})).rejects.toThrow('witness');}
});
it('requires explicit execution and all calibration roles',async()=>{
 const f=fixture();await expect(qualifyVariants(f.root,f.definition,{allowExecution:false})).rejects.toThrow('authorization');f.definition.cases.pop();await expect(qualifyVariants(f.root,f.definition,{allowExecution:true})).rejects.toThrow();
});
