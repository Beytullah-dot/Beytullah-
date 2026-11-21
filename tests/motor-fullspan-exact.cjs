/* Independent exhaustive sheet-assignment oracle for exact full-span
 * guillotine patterns. The oracle does not share the solver's DP, patterns,
 * memoization or reconstruction. Only the proven fixed-width subclass is
 * claimed physically exact. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {audit:independentAudit}=require('./optimization-oracle.cjs');
const root=path.join(__dirname,'../docs'),win={};
for(const name of ['engine/material-policy.js','engine/fullspan-strip-exact.js',
 'engine/production-audit.js','engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),
  {window:win},{filename:name});
const solver=win.BeythausFullSpanPatternExact;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:2,trim:1}),
 val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|exact-fullspan',category:'panel',t:18,
 grain:'length',rotate:false};
function p(id,w,h,extra={}){return {...base,id,label:id,l:w,w:h,order:0,...extra}}
function s(id,W,H,qty,price,extra={}){
 return {...base,id,l:W,w:H,qty,price,priceUnit:'panel',order:0,...extra}
}
// Fresh exhaustive oracle: assign EACH item to one enumerated physical
// sheet copy, independently recompute all occupied height and trailing
// kerf/scrap feasibility. Bounded stock quantities are not relaxed.
function oracle(parts,stocks,objective,trim,kerf){
 const slots=stocks.flatMap(t=>Array.from({length:t.qty},()=>t));
 let best=Infinity,enumerations=0;
 const groups=slots.map(()=>[]);
 function recurse(i){
  if(i===parts.length){
   enumerations++;
   let amount=0;
   for(let j=0;j<slots.length;j++){
    if(!groups[j].length)continue;
    const board=slots[j],W=board.l-2*trim,H=board.w-2*trim;
    if(groups[j].some(x=>x.l!==W||x.material!==board.material||
       x.t!==board.t))return;
    const used=groups[j].reduce((a,x)=>a+x.w,0)+
       (groups[j].length-1)*kerf;
    const rem=H-used;
    if(rem<0||rem!==0&&rem<kerf)return;
    amount+=objective==='cost'?board.price:
     objective==='area'?board.l*board.w:1;
   }
   best=Math.min(best,amount);
   return
  }
  for(let j=0;j<slots.length;j++){
   groups[j].push(parts[i]);
   recurse(i+1);
   groups[j].pop()
  }
 }
 recurse(0);
 return {best,enumerations}
}
function validate(plan,parts,stocks,trim,kerf){
 const data={parts,stocks,trim,kerf,m3:25000};
 const a=engine.auditCutPlan(plan,data);
 assert.equal(a.ok,true,'Production audit: '+a.issues);
 const b=independentAudit(data,plan,'guillotine');
 assert.equal(b.ok,true,'Independent full-edge tree: '+b.issues);
}
let seedCases=0,comparisons=0,enumerations=0,unknown=0,infeasible=0;
const timer=performance.now();
for(let seed=1;seed<=24;seed++){
 const trim=seed%2,kerf=seed%3,width=20;
 const n=3+seed%3;
 const parts=Array.from({length:n},(_,i)=>
  p('seed'+seed+'-'+i,width,8+(seed*7+i*3)%12));
 const stocks=[
  s('A',width+2*trim,21+seed%11+2*trim,2,30+seed%7),
  s('B',width+2*trim,35+seed%15+2*trim,2,43+seed%11),
  s('C',width+2*trim,60+seed%13+2*trim,1,87+seed%13)
 ];
 seedCases++;
 for(const objective of ['cost','area','count']){
  const ref=oracle(parts,stocks,objective,trim,kerf);
  const result=solver.solve(parts,stocks,{objective,trim,kerf,
   priceMode:'panel',maxNodes:450000,maxStates:16000,maxMs:3000});
  enumerations+=ref.enumerations;
  assert(!['unknown-class','unknown-input','unknown-limit'].includes(result.status),
   'Exact small subclass must complete: '+seed+'/'+objective+'/'+result.status);
  if(!Number.isFinite(ref.best)){
   assert.equal(result.status,'infeasible-class');
   infeasible++;
  }else{
   assert.equal(result.status,'optimal-physical-class');
   assert.equal(result.objectiveValue,ref.best,
    'Independent assignment optimum mismatch: '+seed+'/'+objective);
   validate(result.plan,parts,stocks,trim,kerf);
   if(objective==='cost')assert.equal(result.plan.cost,ref.best);
   if(objective==='area')assert.equal(result.plan.stockArea,ref.best);
  }
  comparisons++;
 }
}
const exactParts=[p('A',60,20),p('B',60,20),p('C',60,20)];
const exactStock=s('exact',62,66,1,90);
const exact=solver.solve(exactParts,[exactStock],{
 trim:1,kerf:2,objective:'cost',maxMs:1000});
assert.equal(exact.status,'optimal-physical-class');
assert.equal(exact.objectiveValue,90);
validate(exact.plan,exactParts,[exactStock],1,2);
assert.equal(exact.plan.bins[0].cuts.length,2);
const forged=JSON.parse(JSON.stringify(exact.plan));
forged.bins[0].cuts[0].x2-=1;
assert.equal(engine.auditCutPlan(forged,
 {parts:exactParts,stocks:[exactStock],trim:1,kerf:2}).ok,false);
assert.equal(independentAudit({parts:exactParts,stocks:[exactStock],
 trim:1,kerf:2},forged,'guillotine').ok,false);
const tooSmall=s('shortScrap',62,12,1,90);
const stranded=solver.solve([p('alone',60,9)],[tooSmall],{
 trim:1,kerf:3,objective:'cost'});
assert.equal(stranded.status,'infeasible-class',
 'A 1mm leftover cannot be separated with 3mm saw kerf');
const enough=s('enoughKerf',62,14,1,90);
const validTrailing=solver.solve([p('alone',60,9)],[enough],{
 trim:1,kerf:3,objective:'cost'});
assert.equal(validTrailing.status,'optimal-physical-class');
validate(validTrailing.plan,[p('alone',60,9)],[enough],1,3);
assert.equal(solver.solve(exactParts,[{...exactStock,price:null}],
 {objective:'cost',trim:1,kerf:2}).status,'unknown-price');
const areaWithoutPrice=solver.solve(exactParts,
 [{...exactStock,price:null}],{objective:'area',trim:1,kerf:2});
assert.equal(areaWithoutPrice.status,'optimal-physical-class');
assert.equal(areaWithoutPrice.plan.cost,null);
assert.equal(solver.solve(exactParts,[exactStock],
 {objective:'cost',trim:1,kerf:2,maxMs:0}).status,'unknown-limit');
assert.equal(solver.solve(exactParts,[exactStock],
 {objective:'cost',trim:1,kerf:2,maxNodes:1}).status,'unknown-limit');
assert.equal(solver.solve(exactParts,
 [exactStock,s('wideAlternative',64,100,1,1)],
 {objective:'cost',trim:1,kerf:2}).status,'unknown-class',
 'A geometrically usable wider board invalidates the special-class theorem');
assert.equal(solver.solve([p('rotates',60,20,{grain:'width',rotate:true})],
 [exactStock],{objective:'cost',trim:1,kerf:2}).status,'unknown-class');
const timber=p('timber',60,20,{material:'masif|mese',category:'masif',t:20});
const timberStock=s('timberStock',62,22,1,50000,
 {material:'masif|mese',category:'masif',t:20,priceUnit:'m3'});
const solid=solver.solve([timber],[timberStock],{
 objective:'cost',trim:1,kerf:2});
assert.equal(solid.status,'optimal-physical-class');
assert.equal(solid.objectiveValue,62*22*20/1e9*50000);
validate(solid.plan,[timber],[timberStock],1,2);
const highVolume={};
for(const n of [44,305]){
 const many=Array.from({length:n},(_,i)=>p('large-'+n+'-'+i,60,20));
 const stock=s('volume',62,66,Math.ceil(n/3),90);
 const entries={};
 for(const objective of ['cost','area']){
  const ts=performance.now();
  const result=solver.solve(many,[stock],{
   objective,trim:1,kerf:2,maxNodes:750000,maxStates:25000,
   maxMs:5000});
  assert.equal(result.status,'optimal-physical-class',
   'Large uniform physical exact class '+n+'/'+objective+'/'+result.status);
  const expected=Math.ceil(n/3)*(objective==='cost'?90:62*66);
  assert.equal(result.objectiveValue,expected);
  validate(result.plan,many,[stock],1,2);
  entries[objective]={optimum:result.objectiveValue,
   bins:result.plan.bins.length,nodes:result.nodes,states:result.states,
   patterns:result.patternsCreated,elapsedMs:performance.now()-ts}
 }
 highVolume[n]=entries;
}
const report={scope:'physically exact only under fixed full-span width class',
 independentOracle:{seedCases,comparisons,enumerations,infeasible,unknown,
  unsafeOverbounds:0,wallMs:performance.now()-timer},
 safeguards:{tamperedFullEdgeRejected:true,unknownPricePreserved:true,
  budgetUnknown:true,unusableKerfSliverRejected:true,rotationClassGuard:true,
  masifPricing:true},highVolume,
 process:{rssBytes:process.memoryUsage().rss,
  heapUsedBytes:process.memoryUsage().heapUsed,
  maxRssKiB:process.platform==='linux'?
   process.resourceUsage().maxRSS:null}};
if(process.env.MOTOR_FULLSPAN_JSON)
 fs.writeFileSync(process.env.MOTOR_FULLSPAN_JSON,JSON.stringify(report,null,2));
console.log('Full-span physical exact study: '+JSON.stringify(report));
