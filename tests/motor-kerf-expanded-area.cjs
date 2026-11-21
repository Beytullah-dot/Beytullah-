/* Independent kerf-expanded-area relaxation oracle and physically optimal
 * large guillotine holdouts. No production inventory or cloud access.
 * The OPTIMAL physical witnesses are proved by a separate analytical dual
 * certificate, not inferred from the application's relaxation or heuristic.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {audit: independentAudit}=require('./optimization-oracle.cjs');
const root=path.join(__dirname,'../docs'),win={};
for(const p of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,p),'utf8'),
  {window:win},{filename:p});
const proof=win.BeythausOptimalityCertificate;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:2,trim:1}),
 val:Number,mkey:x=>String(x||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|exact-kerf-holdout',category:'panel',t:18,
 grain:'length',rotate:false};
const part=(id,l,w)=>({...base,id,label:id,l,w,order:0});
const stock=(id,l,w,qty,price)=>({...base,id,l,w,qty,price,
 priceUnit:'panel',order:0});
const tri=['cost','area','count'];
// Fresh exhaustive bounded multiset oracle: no DP, no shared capacities.
function reference(parts,stocks,objective,trim=1,kerf=2){
 const need=parts.reduce((s,p)=>s+(p.l+kerf)*(p.w+kerf),0);
 let best=Infinity,enumerations=0;
 function visit(i,capacity,value){
  if(i===stocks.length){
   enumerations++;
   if(capacity+1e-7>=need)best=Math.min(best,value);
   return;
  }
  const s=stocks[i],W=s.l-2*trim,H=s.w-2*trim;
  const cap=W>0&&H>0?(W+kerf)*(H+kerf):0;
  const unit=objective==='cost'?s.price:
   objective==='area'?s.l*s.w:1;
  for(let q=0;q<=s.qty;q++)visit(i+1,capacity+q*cap,value+q*unit);
 }
 visit(0,0,0);
 return {value:best,enumerations};
}
let comparisons=0,oracleEnumerations=0,overbounds=0,maxStates=0;
const oracleStart=performance.now();
for(let seed=1;seed<=28;seed++){
 const parts=[
  part('x'+seed,16+seed%8,18+seed%7),
  part('y'+seed,23+seed%6,12+seed%5),
  part('z'+seed,11+seed%9,29+seed%4),
  part('v'+seed,18+seed%10,15+seed%8),
  part('w'+seed,30+seed%5,9+seed%6)
 ];
 const stocks=[
  stock('A',40+seed%12,40+seed%9,2,25+seed%11),
  stock('B',55+seed%6,51+seed%8,2,42+seed%10),
  stock('C',30+seed%7,85+seed%12,2,35+seed%9),
  stock('D',85+seed%9,37+seed%7,1,46+seed%13),
  stock('E',62+seed%11,70+seed%12,1,62+seed%17)
 ];
 for(const objective of tri){
  const ref=reference(parts,stocks,objective);
  const got=proof.kerfExpandedAreaCover(parts,stocks,1,2,
   {objective,priceMode:'panel',maxStates:18000,maxMs:2000});
  oracleEnumerations+=ref.enumerations;
  assert.equal(got.status,'optimal-relaxation',
   'Expanded relaxation must complete: '+seed+'/'+objective);
  comparisons++;
  maxStates=Math.max(maxStates,got.states||0);
  if(got.lowerBound>ref.value+1e-7)overbounds++;
  assert(Math.abs(got.lowerBound-ref.value)<1e-7,
   'Independent exact multiset oracle mismatch '+seed+'/'+objective);
 }
}
const oracleMs=performance.now()-oracleStart;
assert.equal(overbounds,0);
const tempParts=[part('s',60,20)],tempStocks=[stock('s',62,66,1,90)];
assert.equal(proof.kerfExpandedAreaCover(tempParts,tempStocks,1,2,
 {objective:'cost',maxMs:0}).status,'unknown-limit',
 'Exhausted proof budget must not assert a certificate');
assert.equal(proof.kerfExpandedAreaCover(tempParts,
 [{...tempStocks[0],price:null}],1,2,
 {objective:'cost',priceMode:'panel',maxMs:100}).status,'unknown-price',
 'Unknown registered cost must not be assumed zero');

// Analytic physical exactness family: items 60x20 (1 slot) and
// 60x42 (2 slots), saw kerf 2, trim 1. Every completed item may be
// expanded by 2 in both axes: areas are respectively 62*22=1,364 and
// 62*44=2,728 mm^2. Every stock's expanded usable board area is EXACTLY
// its gross stock area (since trim=kerf/2). Thus ANY physically valid
// full-edge or free orthogonal plan costs at least 1,364 mm^2 per slot.
const SLOT_AREA=1364,PRICE_PER_SLOT=30;
const alternative=[
 stock('narrowCheap1',24,240,200,5),
 stock('narrowCheap2',24,360,200,7),
 stock('wide',124,70,200,220),
 stock('tall',70,100,200,180),
 stock('large',62,110,200,180)
];
function testExact(mixedGroups,smallGroups){
 const groupCount=mixedGroups+smallGroups;
 const source=stock('exactSource',62,66,groupCount,90);
 const stocks=[source,...alternative];
 const groups=[];
 for(let i=0;i<mixedGroups;i++)groups.push([
  part('M'+i+'-large',60,42),part('M'+i+'-small',60,20)]);
 for(let i=0;i<smallGroups;i++)groups.push([
  part('S'+i+'-0',60,20),part('S'+i+'-1',60,20),
  part('S'+i+'-2',60,20)]);
 const parts=groups.flat();
 const weightedSlots=parts.reduce((s,p)=>s+(p.w+2)/22,0);
 assert.equal(weightedSlots,3*groupCount);
 // Independently check the per-stock cost inequality. Narrow stocks
 // cannot accept any part because grain fixes 60 mm along the x axis.
 for(const s of stocks){
  const W=s.l-2,H=s.w-2,physicallyCompatible=W>=60&&H>=20;
  if(!physicallyCompatible)continue;
  const upperSlots=Math.floor(s.l*s.w/SLOT_AREA);
  assert(s.price+1e-7>=PRICE_PER_SLOT*upperSlots,
   'Cost dual certificate would be invalid for '+s.id);
 }
 // Explicit full-edge tree; neither heuristic optimizer nor proof DP
 // chooses these cuts. Every leaf is an exact item or an actual remnant.
 function makeBin(group){
  const b={stock:source,placed:[],cuts:[],free:[]};
  let leaf={x:1,y:1,w:60,h:64};
  for(let i=0;i<group.length;i++){
   const p=group[i],last=i===group.length-1;
   assert.equal(p.l,leaf.w);
   assert(last?leaf.h===p.w:leaf.h>=p.w+2);
   if(!last){
    const at=leaf.y+p.w+1,rect={...leaf};
    b.cuts.push({source:rect,axis:'horizontal',at,
     number:b.cuts.length+1,label:'Independent full-edge cut',
     x1:leaf.x,y1:at,x2:leaf.x+leaf.w,y2:at});
    leaf={x:leaf.x,y:leaf.y+p.w+2,w:leaf.w,h:leaf.h-p.w-2};
   }
   b.placed.push({...p,x:1,y:last?leaf.y:(leaf.y-p.w-2),
    w:60,h:p.w,rotated:false});
  }
  return b;
 }
 const bins=groups.map(makeBin);
 const plan={bins,unplaced:[],placedCount:parts.length,
  partArea:parts.reduce((s,p)=>s+p.l*p.w,0),
  stockArea:bins.reduce((s,b)=>s+b.stock.l*b.stock.w,0),
  cost:bins.reduce((s,b)=>s+b.stock.price,0),
  unknownCostBins:0};
 const data={parts,stocks,trim:1,kerf:2,m3:25000};
 const production=engine.auditCutPlan(plan,data);
 assert.equal(production.ok,true,'App full-edge audit: '+production.issues);
 assert.equal(production.checkedParts,parts.length);
 const independent=independentAudit(data,plan,'guillotine');
 assert.equal(independent.ok,true,'Independent cut tree audit: '+independent.issues);
 const forged=JSON.parse(JSON.stringify(plan));
 forged.bins[0].cuts[0].x2-=1;
 assert.equal(engine.auditCutPlan(forged,data).ok,false);
 assert.equal(independentAudit(data,forged,'guillotine').ok,false);
 const exactCost=PRICE_PER_SLOT*weightedSlots;
 const exactArea=SLOT_AREA*weightedSlots;
 assert.equal(plan.cost,exactCost);
 assert.equal(plan.stockArea,exactArea);
 const objectives={};
 for(const objective of ['cost','area']){
  const started=performance.now();
  const result=proof.certify(plan,data,{objective,
   auditOK:true,priceMode:'panel',maxStates:12000,maxMs:1800});
  const incumbent=objective==='cost'?exactCost:exactArea;
  assert(!Number.isFinite(result.lowerBound)||
   result.lowerBound<=incumbent+1e-7,'Unsafe bound on optimal physical plan');
  assert.notEqual(result.status,'inconsistent-bound');
  objectives[objective]={physicalOptimum:incumbent,
   certifiedLowerBound:result.lowerBound,status:result.status,
   relativeGapPercent:result.gapPercent,elapsedMs:performance.now()-started,
   components:result.groups.map(g=>({
    area:g.areaRelaxation?.lowerBound,
    expanded:g.kerfExpandedAreaRelaxation?.lowerBound,
    cardinality:g.cardinalityRelaxation?.lowerBound,
    paired:g.pairedRelaxation?.lowerBound,
    double:g.multiThresholdRelaxation?.lowerBound,
    triple:g.tripleThresholdRelaxation?.lowerBound
   }))};
 }
 return {parts:parts.length,weightedSlots,usedSheets:bins.length,
  fullEdgeCuts:bins.reduce((s,b)=>s+b.cuts.length,0),
  doubleAudit:true,independentPhysicalOptimum:true,objectives,
  maxRssKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null};
}
const physical44=testExact(7,10);
const physical305=testExact(61,61);
assert.equal(physical44.parts,44);
assert.equal(physical305.parts,305);
const report={method:'kerf-expanded-area-cover',comparisonScope:
 'exact integer-stock relaxation (NOT physical placement)',
 oracle:{cases:28,objectives:84,comparisons,overbounds,
  enumerations:oracleEnumerations,maxStates,wallMs:oracleMs},
 physicalExactCases:[physical44,physical305],
 process:{heapUsedBytes:process.memoryUsage().heapUsed,
  rssBytes:process.memoryUsage().rss,
  maxRssKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null},
 note:'Exact physical witnesses rely on independent expanded-rectangle area and registered-cost dual certificates. Other 44/305 cases are not certified physically optimal. Nonzero apparent gap on these proven-optimal instances is entirely lower-bound weakness; it is never a savings prediction.'};
if(process.env.MOTOR_EXPANDED_JSON)
 fs.writeFileSync(process.env.MOTOR_EXPANDED_JSON,JSON.stringify(report,null,2));
console.log('Kerf-expanded independent proof report: '+JSON.stringify(report));
