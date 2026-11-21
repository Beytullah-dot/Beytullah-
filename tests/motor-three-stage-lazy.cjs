/* Beythaus Cut — lazy three-stage research: independent physical verification.
 * A feasible returned plan is NEVER an optimum proof. This harness also
 * compares resource-bounded exact outcomes without equating UNKNOWN to false.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const source=path.join(__dirname,'../docs');
const window={};
for(const name of ['engine/material-policy.js','engine/three-stage-nested-exact.js',
 'engine/three-stage-lazy-research.js','engine/production-audit.js',
 'engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(source,name),'utf8'),
  {window},{filename:name});
const lazy=window.BeythausThreeStageLazyResearch;
const exact=window.BeythausThreeStageNestedExact;
assert(lazy&&lazy.version===1&&exact);
const material='panel|lazy-three-stage';
const common={category:'panel',material,t:18,grain:'length',rotate:false};
function fixture(family,count){
 const widths=family==='mixed'?[8,14,10,12,9,13,7,15]:
  Array(8).fill(11);
 const parts=Array.from({length:count},(_,i)=>({...common,
  id:'part-'+i,label:'part-'+i,l:widths[i%8],w:16}));
 const dims=[[52,36,100],[54,38,114],[56,40,129],[60,42,157]];
 const boards=count/8;
 const stocks=dims.map(([l,w,price],i)=>({...common,id:'board-'+i,
  l,w,price,priceUnit:'panel',
  qty:Math.floor(boards/4)+(i<boards%4?1:0)}));
 return {parts,stocks,trim:1,kerf:2};
}
const engine=window.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine'}),mkey:s=>String(s||'').toLowerCase(),
 val:Number,fmt:Number});
const independent=require('./optimization-oracle.cjs');
function audit(job,plan){
 assert(plan&&plan.bins.length);
 const production=engine.auditCutPlan(plan,{...job,m3:25000});
 assert.equal(production.ok,true,'production full-edge audit: '+production.issues);
 const oracle=independent.audit(job,plan,'guillotine');
 assert.equal(oracle.ok,true,'independent full-edge audit: '+oracle.issues);
 const ids=new Set(plan.bins.flatMap(bin=>bin.placed.map(p=>p.id)));
 assert.equal(ids.size,job.parts.length);
 assert.equal(plan.placedCount,job.parts.length);
 assert.equal(plan.unplaced.length,0);
 for(const bin of plan.bins)
  for(const cut of bin.cuts){
   const s=cut.source,vertical=cut.axis==='vertical',tol=1e-6;
   assert(Math.abs((vertical?cut.y2-cut.y1:cut.x2-cut.x1)-
    (vertical?s.h:s.w))<tol,'full-edge, never shortened saw line');
  }
}
let cases=0,successful=0,unknown=0,totalUpdates=0,allCuts=0;
const rows=[],began=performance.now();
for(const family of ['mixed','repeated'])
 for(const count of [8,40,200])
  for(const objective of count===200?['cost']:['cost','area']){
   const job=fixture(family,count),snap=JSON.stringify(job);
   let updates=0;
   const started=performance.now();
   const result=lazy.solve(job.parts,job.stocks,{trim:job.trim,
    kerf:job.kerf,objective,maxMs:1000,maxNodes:180000,
    maxCandidates:4,onCandidate:c=>{
     assert.equal(c.status,'feasible-uncertified');
     assert.equal(c.proof,'none');
     audit(job,c.plan);updates++;
    }});
   const wallMs=performance.now()-started;cases++;totalUpdates+=updates;
   assert.equal(JSON.stringify(job),snap,'research must not mutate inputs');
   assert(result.proof==='none'&&result.researchOnly);
   assert(['feasible-uncertified','unknown-limit','unknown-no-candidate'].
    includes(result.status),'never an optimum/infeasible label');
   if(result.status==='feasible-uncertified'){
    assert(result.plan);audit(job,result.plan);
    successful++;allCuts+=result.plan.bins.reduce((n,b)=>n+b.cuts.length,0);
   }else{assert.equal(result.plan,null);unknown++;}
   rows.push({family,count,objective,status:result.status,
    bins:result.plan?.bins.length??null,objectiveValue:result.objectiveValue,cuts:result.plan?.bins.reduce(
     (n,b)=>n+b.cuts.length,0)??null,
    updates,attempts:result.attempts,nodes:result.nodes,
    bands:result.bandsBuilt,strips:result.stripsBuilt,
    wallMs:Math.round(wallMs*1000)/1000,
    resourceExhausted:result.resourceExhausted});
  }
assert(rows.some(r=>r.family==='mixed'&&r.count===8&&
 r.status==='feasible-uncertified'),
 'Mixed 8 must find a fully audited constructive solution');
assert(rows.some(r=>r.family==='repeated'&&r.count===8&&
 r.status==='feasible-uncertified'));
const baseline=fixture('mixed',8);
const old=exact.solve(baseline.parts,baseline.stocks,{trim:1,kerf:2,
 objective:'cost',maxMs:800,maxNodes:12000,
 maxPatterns:1500,maxStates:2500});
assert.equal(old.status,'unknown-limit',
 'Baseline mixed-8 exact should hit the recorded research budget');
const limited=lazy.solve(baseline.parts,baseline.stocks,{
 trim:1,kerf:2,objective:'cost',maxNodes:1,maxMs:1000});
assert.equal(limited.status,'unknown-limit');
assert.equal(limited.plan,null);
assert.equal(limited.proof,'none');
const missing={...baseline,stocks:baseline.stocks.map(s=>({
 ...s,price:null
}))};
assert.equal(lazy.solve(missing.parts,missing.stocks,{trim:1,kerf:2,
 objective:'cost'}).status,'unknown-price');
const areaMissing=lazy.solve(missing.parts,missing.stocks,{
 trim:1,kerf:2,objective:'area'});
if(areaMissing.plan){
 audit(missing,areaMissing.plan);
 assert.equal(areaMissing.plan.cost,null,'unknown price remains unknown');
}
const other={...baseline.parts[0],material:'panel|wrong'};
const incompatible=lazy.solve([other],baseline.stocks,{trim:1,kerf:2});
assert.equal(incompatible.status,'unknown-no-candidate');
assert.equal(lazy.solve([{...baseline.parts[0],grain:'width',rotate:true}],
 baseline.stocks,{trim:1,kerf:2}).status,'unknown-class');
assert.equal(lazy.solve([{...baseline.parts[0],rotate:true,grain:''}],
 baseline.stocks,{trim:1,kerf:2}).status,'unknown-class');
assert.equal(lazy.solve([baseline.parts[0]],
 [{...baseline.stocks[0],t:20}],{trim:1,kerf:2}).status,
 'unknown-no-candidate');
const witness=lazy.solve(baseline.parts,baseline.stocks,{
 trim:1,kerf:2,objective:'cost'});
if(witness.plan?.bins[0]?.cuts.length){
 const tampered=JSON.parse(JSON.stringify(witness.plan));
 tampered.bins[0].cuts[0].y2-=1;
 assert.equal(engine.auditCutPlan(tampered,baseline).ok,false);
 assert.equal(independent.audit(baseline,tampered,'guillotine').ok,false);
}
// Additional policy regressions: category/m3 pricing, fractional exact grid,
// board-count objective, and no oversubscription when every stock qty is zero.
const onePart={...common,id:'one',label:'one',l:20,w:9};
const masifPart={...onePart,category:'masif',material:'masif|mese',t:20};
const masifStock={...masifPart,id:'masif-stock',l:22,w:11,qty:1,
 price:50000,priceUnit:'m3'};
const masifJob={parts:[masifPart],stocks:[masifStock],trim:1,kerf:2};
const masif=lazy.solve(masifJob.parts,masifJob.stocks,{
 trim:1,kerf:2,objective:'cost'});
assert.equal(masif.status,'feasible-uncertified');
audit(masifJob,masif.plan);
assert(Math.abs(masif.plan.cost-22*11*20/1e9*50000)<1e-9);
const fractionalJob={parts:[{...onePart,id:'fractional',label:'fractional',
 l:10.25,w:7.5}],stocks:[{...common,id:'fractional-stock',
 l:12.25,w:9.5,qty:1,price:20,priceUnit:'panel'}],trim:1,kerf:1.5};
const fractional=lazy.solve(fractionalJob.parts,fractionalJob.stocks,{
 trim:1,kerf:1.5,objective:'area'});
assert.equal(fractional.status,'feasible-uncertified');
audit(fractionalJob,fractional.plan);
const byCount=lazy.solve(baseline.parts,baseline.stocks,{
 trim:1,kerf:2,objective:'count'});
assert.equal(byCount.status,'feasible-uncertified');
audit(baseline,byCount.plan);
assert.equal(byCount.objectiveValue,byCount.plan.bins.length);
assert.equal(lazy.solve(baseline.parts,baseline.stocks.map(s=>({
 ...s,qty:0})),{trim:1,kerf:2}).status,'unknown-no-candidate');
const report={scope:'lazy physical feasible three-stage research; NO optimum certificate',
 exactMixed8Baseline:old.status,attempted:cases,feasible:successful,
 unknown,independentlyAuditedUpdates:totalUpdates,totalCuts:allCuts,
 rows,elapsedMs:performance.now()-began,
 maxRSSKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null};
if(process.env.MOTOR_THREE_STAGE_LAZY_JSON)
 fs.writeFileSync(process.env.MOTOR_THREE_STAGE_LAZY_JSON,
  JSON.stringify(report,null,2)+'\n');
for(const row of rows)console.log('LAZY-3ST '+JSON.stringify(row));
console.log('LAZY-3ST-SUMMARY '+JSON.stringify({
 attempted:cases,feasible:successful,unknown,
 independentlyAuditedUpdates:totalUpdates,
 elapsedMs:report.elapsedMs,maxRSSKiB:report.maxRSSKiB}));
