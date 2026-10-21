import {readFileSync,writeFileSync,realpathSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {z} from 'zod';
import {hash,reference} from './filesystem.js';
import {preflightRuntimeContract,verifyRuntimeContract} from './runtime-contracts.js';

function observationAt(value: unknown, path: string[]): unknown {
 for(const key of path){
  if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;
  value=(value as Record<string,unknown>)[key];
 }
 return value;
}

export const propagationSchema=z.object({
  propagationVersion:z.literal(1),id:z.string().min(1),responsibility:z.string().min(1),
  inputs:z.array(z.string().min(1)).min(1).max(500),
  provider:z.object({target:z.string().min(1),probe:z.string().min(1)}).strict(),
  observe:z.object({command:z.string().min(1),args:z.array(z.string()),cwd:z.string().default('.')}).strict(),
  expected:z.object({baseline:z.json(),changed:z.json()}).strict(),
  controlPath:z.array(z.string().min(1)).min(1).optional(),
}).strict().superRefine((v,c)=>{
  if(!v.inputs.includes(v.provider.target)||!v.inputs.includes(v.provider.probe))c.addIssue({code:'custom',message:'Provider and probe must be registered inputs'});
  if(new Set(v.inputs).size!==v.inputs.length)c.addIssue({code:'custom',message:'Duplicate input paths'});
  if(isDeepStrictEqual(v.expected.baseline,v.expected.changed))c.addIssue({code:'custom',message:'Expected observations must demonstrate a change'});
  if(v.controlPath){
   const baseline=observationAt(v.expected.baseline,v.controlPath),changed=observationAt(v.expected.changed,v.controlPath);
   if(baseline===undefined||changed===undefined||isDeepStrictEqual(baseline,changed))c.addIssue({code:'custom',message:'Provider control must exist in both expected observations and demonstrate a change'});
  }
});
export type PropagationDefinition=z.input<typeof propagationSchema>;

/** Compares actual observer JSON before/after a registered provider substitution, never a checker-authored pass label. */
export async function verifyPropagation(root:string,input:unknown,options:{allowExecution:boolean;timeoutMs?:number}){
 if(options.allowExecution!==true)throw Error('Propagation observations require explicit execution authorization');
 const d=propagationSchema.parse(input),target=realpathSync(reference(root,d.provider.target)),probe=realpathSync(reference(root,d.provider.probe)),original=readFileSync(target),replacement=readFileSync(probe);
 if(target===probe||original.equals(replacement))throw Error('Provider probe must change a distinct source file');
 const runtime={runtimeContractVersion:1,id:d.id,responsibility:d.responsibility,inputs:d.inputs,obligations:[{id:'observe',kind:'behavior',claim:'Observe real production consumers as JSON',...d.observe}]};
 const before=preflightRuntimeContract(root,runtime).before,changedInputs=new Set<string>(),executions=[];
 let baseline:unknown,changed:unknown,problem:string|undefined;
 try{
  for(const phase of ['baseline','changed']as const){
   if(phase==='changed')writeFileSync(target,replacement);
   const report=await verifyRuntimeContract(root,runtime,options);executions.push({phase,report});
   for(const f of report.changedInputs)changedInputs.add(f);
   // A failed/unavailable observer is not a successful negative ownership result.
   if(report.state!=='verified'){problem='Observer failed, timed out or changed registered inputs';break;}
   try{const value:unknown=JSON.parse(report.results[0]!.stdout);if(phase==='baseline')baseline=value;else changed=value;}catch{problem='Observer must emit exactly one JSON value on stdout';break;}
   if(phase==='baseline'&&!isDeepStrictEqual(baseline,d.expected.baseline)){problem='Baseline observation does not match the declared examples';break;}
   if(phase==='changed'&&d.controlPath&&!isDeepStrictEqual(observationAt(changed,d.controlPath),observationAt(d.expected.changed,d.controlPath))){problem='Provider control did not establish that the changed policy reached execution';break;}
  }
 }finally{writeFileSync(target,original);}
 for(const f of d.inputs){try{if(hash(readFileSync(reference(root,f)))!==before[f])changedInputs.add(f);}catch{changedInputs.add(f);}}
 const baselineMatches=isDeepStrictEqual(baseline,d.expected.baseline),changedMatches=isDeepStrictEqual(changed,d.expected.changed);
 const state=problem||changedInputs.size?'unresolved':baselineMatches&&changedMatches?'verified':'violated';
 return {propagationVersion:1 as const,id:d.id,state,baselineMatches,changedMatches,observed:{baseline,changed},expected:d.expected,problem,inputs:before,changedInputs:[...changedInputs],executions,authority:'Observed consumer JSON under the original and substituted provider. Review that the observer executes actual consumers, the probe represents the declared policy change, and the observation covers all claimed consumers. Commands are trusted project code, not sandboxed. Source access must be exclusive.'};
}
