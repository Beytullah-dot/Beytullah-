/* Fractional-mm exact bound and small guillotine oracle regression.
 * The historical case is REGENERATED from the independent audit ZIP seed,
 * not hard-coded as a special packing geometry. Fresh seeds are unused.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
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
function scale(job,divisor){const next=structuredClone(job);
 for(const e of [...next.parts,...next.stocks]){e.l/=divisor;e.w/=divisor}
 next.kerf/=divisor;next.trim/=divisor;return next}
const worker=vm.createContext({last:null,postMessage(message){this.last=message}});
worker.self=worker;
function load(name){vm.runInContext(fs.readFileSync(root+'/docs/'+name,'utf8'),worker,{filename:name})}
worker.importScripts=(...names)=>names.forEach(load);
load('optimization-worker.js');
const html=fs.readFileSync(root+'/docs/index.html','utf8');
const mkey=x=>String(x).trim().toLocaleLowerCase('tr-TR');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey',
 html.slice(html.indexOf('function acceptExactWorkerResult('),html.indexOf('function startExactWorker('))+
 ';return acceptExactWorkerResult;')({mode:'guillotine',priceMode:'panel'},engine.mkBin,
 engine.binCost,engine.auditCutPlan,mkey);
function runWorker(data,initial,lower,requestId){
 worker.last=null;
 worker.onmessage({data:{type:'solve',mode:'guillotine',requestId,data,
  incumbentBins:initial.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
  bounds:[{material:data.parts[0].material,lowerBound:lower}],timeBudgetMs:3500,maxNodes:500000}});
 assert.ok(worker.last&&worker.last.type==='finished');return worker.last
}
const historicalSeed=13793677,historicalIndex=67;
const integer=small(historicalSeed,historicalIndex);
const ref=oracle.solve(integer,'guillotine',{maxNodes:1000000});
assert.equal(ref.status,'optimal');
assert.equal(ref.minimumBoards,2,'Independent oracle must need exactly two sheets');
const job=scale(integer,10);
const fast=engine.optimize(job,true,false,'minimum');
assert.equal(fast.unplaced.length,0);
assert.ok(engine.auditCutPlan(fast,job).ok);
assert.equal(engine.minStockCountLowerBound(job).lowerBound,2,
 'Fractional kerf-area certificate must carry 1/10 units exactly');
if(fast.bins.length>2){
 const response=runWorker(job,fast,2,67);
 assert.equal(response.status,'optimal');
 assert.equal(response.groups[0].bestCount,2);
 assert.equal(response.groups[0].proven,true);
 const accepted=accept(job,fast,response).proposal;
 assert.equal(accepted.bins.length,2);
 assert.ok(engine.auditCutPlan(accepted,job).ok);
 assert.ok(oracle.audit(job,accepted,'guillotine').ok,
  'Independent cut sequence, grain, kerf and stock quantities');
 assert.equal(engine.certifyStockCount(accepted,job,engine.auditCutPlan(accepted,job)).proven,true);
 // Force a deliberately weaker but still sound bound: an UNKNOWN single-board
 // target must not prevent discovering a valid two-board improvement.
 const weak=runWorker(job,fast,1,68);
 assert.equal(weak.status,'partial');
 assert.equal(weak.groups[0].status,'improved');
 assert.equal(weak.groups[0].proven,false);
 assert.equal(weak.groups[0].bestCount,2);
 assert.equal(weak.groups[0].checked[0].status,'unknown');
 assert.equal(weak.groups[0].checked[1].status,'feasible');
 const weakAccepted=accept(job,fast,weak).proposal;
 assert.ok(oracle.audit(job,weakAccepted,'guillotine').ok);
 assert.equal(weakAccepted.exact.proof,false,
  'UNKNOWN target must never become an exact-search proof');
}else assert.equal(fast.bins.length,2);
// Pure geometric scaling must preserve the exact stock-count lower bound.
// The independent integer oracle supplies reference optima for FRESH seeds,
// not drawn from the original 180 tests or development's planted tests.
let feasible=0,infeasible=0,unknown=0,proven=0,improved=0;
for(let i=0;i<36;i++){
 const seed=(0xd45190+104729*i)>>>0;
 const whole=small(seed,i+200),fraction=scale(whole,10);
 const base=engine.minStockCountLowerBound(whole);
 const scaled=engine.minStockCountLowerBound(fraction);
 assert.equal(scaled.lowerBound,base.lowerBound,'Scale-invariant lower bound '+i);
 const reference=oracle.solve(whole,'guillotine',{maxNodes:850000});
 if(reference.status==='unknown'){unknown++;continue}
 const quick=engine.optimize(fraction,true,false,'minimum');
 assert.ok(engine.auditCutPlan(quick,fraction).ok,'Main cut auditor '+i);
 assert.ok(oracle.audit(fraction,quick,'guillotine').ok,'Independent cut auditor '+i);
 if(reference.status==='infeasible'){
  infeasible++;
  assert.ok(quick.unplaced.length>0,'Impossible case must not be complete '+i);
  continue
 }
 feasible++;
 assert.ok(scaled.lowerBound<=reference.minimumBoards,'Invalid lower bound '+i);
 if(quick.unplaced.length){continue}
 const proof=engine.certifyStockCount(quick,fraction,engine.auditCutPlan(quick,fraction));
 const response=proof.proven?null:runWorker(fraction,quick,scaled.details[0].lowerBound,500+i);
 const proposal=response?accept(fraction,quick,response).proposal:quick;
 assert.ok(engine.auditCutPlan(proposal,fraction).ok);
 assert.ok(oracle.audit(fraction,proposal,'guillotine').ok);
 assert.ok(proposal.bins.length>=reference.minimumBoards,'Below independent optimum '+i);
 const certificate=engine.certifyStockCount(proposal,fraction,engine.auditCutPlan(proposal,fraction));
 if(certificate.proven){
  assert.equal(proposal.bins.length,reference.minimumBoards,'False optimum proof '+i);
  proven++
 }
 if(proposal.bins.length<quick.bins.length)improved++
}
assert.equal(unknown,0,'All fresh independent oracle runs must finish');
console.log(JSON.stringify({historical:{seed:historicalSeed,independentMinimum:2,fractionalLowerBound:2,pass:true},
 holdout:{tested:36,feasible,infeasible,unknown,proven,improved}}));
