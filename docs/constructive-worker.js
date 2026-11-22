/* Beythaus Cut — bounded, unproven three-stage physical candidate Worker.
 * Construction never proves optimality. The independent production cut-tree
 * auditor runs INSIDE this Worker and is repeated on the main thread.
 * No DOM, inventory, auth, SQL or production-completion side effects.
 */
'use strict';
importScripts('./engine/material-policy.js',
 './engine/three-stage-lazy-research.js','./engine/production-audit.js');
const cutter=self.BeythausThreeStageLazyResearch;
const audit=self.BeythausCutProductionAudit.createAudit({
 getState:()=>({mode:'guillotine'}),
 mkey:value=>String(value??'').toLocaleLowerCase('tr-TR')
});
self.onmessage=event=>{
 const job=event.data||{};
 if(job.type!=='construct')return;
 const finish=(status,meta={})=>self.postMessage({
  type:'construct-finished',requestId:job.requestId,status,plan:null,
  proof:'none',researchOnly:true,...meta
 });
 if(job.mode!=='guillotine')return finish('unknown-class');
 const data=job.data;
 if(!data||!Array.isArray(data.parts)||!Array.isArray(data.stocks))
  return finish('unknown-input');
 try{
  // These are runtime resource budgets, NOT limits on user part/board counts.
  const opts={trim:data.trim,kerf:data.kerf,
   objective:job.objective,priceMode:job.priceMode,m3:job.m3,
   maxMs:1300,maxNodes:120000,maxCandidates:4,maxSeeds:12};
  const out=cutter.solve(data.parts,data.stocks,opts);
  if(out.status!=='feasible-uncertified'){
   return finish(out.status,{nodes:out.nodes,elapsedMs:out.elapsedMs,
    resourceExhausted:out.resourceExhausted===true})
  }
  if(!out.plan||out.plan.unplaced?.length!==0||
   out.plan.placedCount!==data.parts.length)
   return finish('unknown-invalid-candidate');
  const checked=audit.auditCutPlan(out.plan,data);
  if(!checked.ok)return finish('unknown-invalid-candidate');
  self.postMessage({type:'construct-finished',requestId:job.requestId,
   status:'feasible-uncertified',proof:'none',researchOnly:true,
   plan:out.plan,nodes:out.nodes,elapsedMs:out.elapsedMs,
   resourceExhausted:out.resourceExhausted===true});
 }catch(error){
  // Never send a partial plan on errors, precision failures or exhaustion.
  finish('unknown-error',{message:String(error?.message||error).slice(0,180)})
 }
};
