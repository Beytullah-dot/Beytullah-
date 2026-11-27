/* Development-only opt-in search. No stock/auth/production side effects. */
'use strict';
importScripts('./engine/material-policy.js','./engine/production-audit.js',
 './engine/physical-verifier.js','./engine/three-stage-lazy-research.js',
 './engine/multiplicity-search.js','./guillotine-exact.js','./engine/optimality-certificate.js');
const auditor=self.BeythausCutProductionAudit.createAudit({getState:()=>({mode:'guillotine'}),mkey:s=>String(s).toLocaleLowerCase('tr-TR')});
self.onmessage=event=>{
 const job=event.data||{},data=job.data;
 const began=Date.now(),deadline=began+2500;
 const finish=(status,plan,extra={})=>self.postMessage({type:'construct-finished',requestId:job.requestId,status,plan,proof:'none',elapsedMs:Date.now()-began,...extra});
 if(data?.enableMultiplicitySolver!==true||job.mode!=='guillotine')return finish('disabled',null);
 const objective=job.objective==='economic'?'cost':job.objective||'area';
 let best=null,nodes=0,invalid=0,disagreement=0;
 const reasons=new Set();
 const limits=()=>({limitReached:reasons.size>0,limitReason:[...reasons][0]??null,limitReasons:[...reasons]});
 const largest=p=>Math.max(0,...p.bins.flatMap(b=>b.free||[]).filter(r=>r.w>= (data.minEdge??50)&&r.h>=(data.minEdge??50)&&r.w*r.h>=(data.minArea??10000)).map(r=>r.w*r.h));
 const score=p=>objective==='count'?p.bins.length:objective==='cost'?p.cost:p.stockArea;
 function accept(plan){
  if(!plan)return;
  const a=auditor.auditCutPlan(plan,data),v=self.BeythausPhysicalVerifier.verifyPlan(data,plan);
  if(a.ok!==v.ok){disagreement++;return}if(!a.ok||!v.ok){invalid++;return}
  if(!v.complete)return;
  if(objective==='cost'&&plan.cost===null)return;
  if(!best||score(plan)<score(best)-1e-7||Math.abs(score(plan)-score(best))<=1e-7&&largest(plan)>largest(best)+1e-7)best=plan;
 }
 try{
  accept(job.incumbent);
  const opts={objective,priceMode:job.priceMode||'panel',m3:data.m3,trim:data.trim,kerf:data.kerf,enableMultiplicitySolver:true,allowNarrowScrapCuts:data.allowNarrowScrapCuts===true};
  const lazy=self.BeythausThreeStageLazyResearch.solve(data.parts,data.stocks,{...opts,maxMs:250,maxNodes:30000});nodes+=lazy.nodes||0;if(lazy.resourceExhausted||lazy.status==='unknown-limit')reasons.add('lazyBudget');accept(lazy.plan);
  const multi=self.BeythausMultiplicitySearch.solve(data,{...opts,maxMs:1000,...(job.maxStates===undefined?{}:{maxStates:job.maxStates})});nodes+=multi.nodes||0;for(const reason of multi.limitReasons)reasons.add(reason);accept(multi.plan);
  if(!best&&data.parts.length<=8&&Date.now()<deadline){
   // Raw input feasibility, not a prepared witness and not an incumbent proof.
   const r=self.GuillotineExact.feasible(data.parts,data.stocks,Math.min(data.parts.length,data.stocks.reduce((a,s)=>a+s.qty,0)),data,deadline,300000);nodes+=r.nodes||0;if(r.status==='unknown')reasons.add('exactUnknown');
   if(r.layout){const bins=r.layout.map(b=>({stock:b.stock,placed:b.pieces,cuts:b.cuts,free:b.free})),costs=bins.map(b=>self.BeythausMaterialPolicy.stockPrice(b.stock,{priceMode:job.priceMode,m3:data.m3})),unknownCostBins=costs.filter(v=>v===null).length;
    accept({bins,unplaced:[],placedCount:data.parts.length,partArea:data.parts.reduce((a,p)=>a+p.l*p.w,0),stockArea:bins.reduce((a,b)=>a+b.stock.l*b.stock.w,0),cost:unknownCostBins?null:costs.reduce((a,v)=>a+v,0),unknownCostBins});}
  }
  let lowerBound=null,gapPercent=null;
  const cert=self.BeythausOptimalityCertificate.kerfExpandedAreaCover(data.parts,data.stocks,data.trim,data.kerf,{objective,priceMode:job.priceMode,m3:data.m3,maxMs:100,maxStates:10000});
  if(cert.status==='optimal-relaxation')lowerBound=cert.lowerBound;
  if(cert.status==='unknown-limit')reasons.add('lowerBoundBudget');
  if(best&&lowerBound>0)gapPercent=100*(score(best)-lowerBound)/lowerBound;
  if(gapPercent!==null&&gapPercent< -1e-7)throw Error('Lower bound exceeds candidate');
  if(disagreement)throw Error('Physical validators disagree');
  finish(best?'feasible-uncertified':'no-complete-plan',best,{...limits(),nodes,lowerBound,gapPercent,invalidCandidates:invalid,validatorDisagreements:disagreement});
 }catch(e){finish('search-error',null,{...limits(),message:String(e.message),nodes,invalidCandidates:invalid,validatorDisagreements:disagreement})}
};
