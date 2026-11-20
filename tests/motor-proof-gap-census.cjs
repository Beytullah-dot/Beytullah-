/* Proof-gap census: original independent small-job seeds, not a new oracle.
 * Classify why a valid optimum is not certified; never count an UNKNOWN as proof.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const {engine}=require('./motor-scalability-profile.cjs');
const oracle=require('./optimization-oracle.cjs');
const common={material:'panel|audit',category:'panel',t:18};
function random(seed){let x=seed>>>0;return(lo,hi)=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return lo+Math.floor((hi-lo+1)*x/4294967296)}}
function small(seed,i){
 const r=random(seed),trim=r(0,2),kerf=r(0,2);
 const stocks=Array.from({length:1+i%2},(_,j)=>({...common,id:'s'+j,order:j,
  l:r(8,15)+2*trim,w:r(8,15)+2*trim,qty:r(1,4),price:10+j,priceUnit:'panel'}));
 const parts=Array.from({length:r(4,7)},(_,j)=>({...common,id:'p'+j,label:'P'+j,order:j,
  l:r(2,9),w:r(2,9),grain:['length','width',''][r(0,2)],rotate:true}));
 return {parts,stocks,kerf,trim}
}
const ctx=vm.createContext({last:null,postMessage(m){this.last=m}});ctx.self=ctx;
function load(name){vm.runInContext(fs.readFileSync(root+'/docs/'+name,'utf8'),ctx,{filename:name})}
ctx.importScripts=(...names)=>names.forEach(load);load('optimization-worker.js');
const html=fs.readFileSync(root+'/docs/index.html','utf8');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey',
 html.slice(html.indexOf('function acceptExactWorkerResult('),html.indexOf('function startExactWorker('))+
 ';return acceptExactWorkerResult;')({mode:'guillotine',priceMode:'panel'},engine.mkBin,
 engine.binCost,engine.auditCutPlan,s=>String(s).trim().toLocaleLowerCase('tr-TR'));
let referenceOptimal=0,proven=0,foundOptimum=0,oracleUnknown=0;
const gaps=[];
for(let i=0;i<180;i++){
 const seed=(0xca6100+7919*i)>>>0;
 const whole=small(seed,i),scale=i%2?10:1;
 const reference=oracle.solve(whole,'guillotine',{maxNodes:600000});
 if(reference.status==='unknown'){oracleUnknown++;continue}
 if(reference.status==='infeasible')continue;
 referenceOptimal++;
 const job=structuredClone(whole);
 for(const item of [...job.parts,...job.stocks]){item.l/=scale;item.w/=scale}
 job.kerf/=scale;job.trim/=scale;
 const initial=engine.optimize(job,true,false,'minimum');
 assert.ok(engine.auditCutPlan(initial,job).ok,'invalid motor cut tree '+i);
 assert.ok(oracle.audit(job,initial,'guillotine').ok,'independent cut audit '+i);
 let proposal=initial,worker=null,details=null;
 const initialProof=engine.certifyStockCount(initial,job,engine.auditCutPlan(initial,job));
 if(!initial.unplaced.length&&!initialProof.proven&&job.parts.length<=11&&job.stocks.length<=4&&initial.bins.length<=5){
  ctx.last=null;
  ctx.onmessage({data:{type:'solve',mode:'guillotine',requestId:i,data:job,
   incumbentBins:initial.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
   bounds:initialProof.details,timeBudgetMs:6500,maxNodes:500000}});
  worker=ctx.last;
  assert.equal(worker?.type,'finished','worker error '+i);
  details=worker.groups?.map(g=>({status:g.status,proven:g.proven,checked:g.checked,
   nodes:g.nodes,initialCount:g.initialCount,bestCount:g.bestCount}));
  proposal=accept(job,initial,worker).proposal;
 }
 const audit=engine.auditCutPlan(proposal,job);
 assert.ok(audit.ok&&oracle.audit(job,proposal,'guillotine').ok,'invalid final '+i);
 const cert=engine.certifyStockCount(proposal,job,audit);
 if(cert.proven){
  assert.equal(proposal.bins.length,reference.minimumBoards,'false optimality proof '+i);
  proven++;
 }
 if(proposal.bins.length===reference.minimumBoards)foundOptimum++;
 if(!cert.proven)gaps.push({i,seed,scale,parts:job.parts.length,kerf:job.kerf,trim:job.trim,
  independentMinimum:reference.minimumBoards,used:proposal.bins.length,
  lowerBound:cert.lowerBound,lowerGap:proposal.bins.length-cert.lowerBound,
  workerStatus:worker?.status||'not-run',worker:details,
  cause:proposal.bins.length>reference.minimumBoards?'solution-quality':
   worker?.groups?.some(g=>g.checked?.some(c=>c.status==='unknown'))?'exact-unknown':
   worker?.groups?.some(g=>g.status==='scope-limited')?'scope-limited':'bound-or-search'});
}
const result={referenceOptimal,foundOptimum,proven,unproven:gaps.length,oracleUnknown,gaps};
console.log(JSON.stringify(result,null,2));
if(process.env.MOTOR_GAP_JSON)fs.writeFileSync(process.env.MOTOR_GAP_JSON,JSON.stringify(result,null,2));
assert.equal(oracleUnknown,0,'reference oracle must finish all original cases');
assert.equal(referenceOptimal,133,'independent reference case count changed');
assert.equal(foundOptimum,133,'previously achieved solution quality regressed');
assert.ok(proven>=120,'previously achieved proofs regressed');
