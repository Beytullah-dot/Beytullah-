/* Independent 3-threshold integer-stock oracle and physical guillotine holdouts.
 * The oracle does not use the Pareto optimizer, certification or pruning code.
 * Cost and gross stock area are separate objectives; UNKNOWN is not a proof.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),win={};
for(const file of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
  {window:win},{filename:file});
const proof=win.BeythausOptimalityCertificate;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:3,trim:2}),
 val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|holdout',category:'panel',t:18,
 grain:'length',rotate:false};
function pieces(tag,count,l,w){
 return Array.from({length:count},(_,i)=>({...base,id:tag+'-'+i,
  label:tag+' '+i,l,w,order:i}))
}
function stock(id,l,w,qty,price){
 return {...base,id,l,w,qty,price,priceUnit:'panel',order:0}
}
// The reference enumerates ALL stock multiplicities, recalculates usable
// area and kerf-expanded square slots, and does not use solver capacities.
function oracle(parts,stocks,objective,requiredEdges){
 const demand=parts.reduce((v,p)=>v+p.l*p.w,0);
 const edges=requiredEdges||[...new Set(parts.map(p=>Math.min(p.l,p.w)))];
 const required=edges.map(e=>parts.filter(p=>Math.min(p.l,p.w)>=e).length);
 let best=Infinity,enumerated=0;
 function visit(j,chosen,score){
  if(j<stocks.length){
   const s=stocks[j],unit=objective==='cost'?s.price:
    objective==='area'?s.l*s.w:1;
   for(let q=0;q<=s.qty;q++)visit(j+1,[...chosen,q],score+q*unit);
   return
  }
  enumerated++;
  const supply=stocks.reduce((v,s,i)=>
   v+chosen[i]*Math.max(0,s.l-4)*Math.max(0,s.w-4),0);
  if(supply+1e-7<demand)return;
  for(let j=0;j<edges.length;j++){
   const cap=stocks.reduce((v,s,i)=>{
    const W=s.l-4,H=s.w-4,e=edges[j];
    const slots=W>0&&H>0?
     Math.floor((W+3)/(e+3))*Math.floor((H+3)/(e+3)):0;
    return v+chosen[i]*slots
   },0);
   if(cap<required[j])return
  }
  best=Math.min(best,score)
 }
 visit(0,[],0);
 return {value:best,enumerated}
}
function triple(parts,stocks,objective,maxMs=2000,maxStates=12000){
 return proof.tripleThresholdAreaCover(parts,stocks,2,3,
  {objective,priceMode:'panel',maxMs,maxStates})
}
const strictParts=[...pieces('e80',1,80,80),...pieces('e50',2,50,50),
 ...pieces('e25',25,25,25)];
const strictStock=[
 stock('a',50,240,2,46),stock('b',80,600,3,143),
 stock('c',70,110,1,32),stock('d',60,240,1,122),
 stock('e',130,90,1,84)
];
const strict={};
for(const objective of ['cost','area','count']){
 const ref=oracle(strictParts,strictStock,objective);
 const result=triple(strictParts,strictStock,objective);
 assert.equal(result.status,'optimal-relaxation','strict triple completed '+objective);
 assert.equal(result.complete,true,'all three-threshold sets checked');
 assert.equal(result.lowerBound,ref.value,'independent all-threshold oracle '+objective);
 strict[objective]={bound:result.lowerBound,states:result.peakStates,
  elapsedMs:result.elapsedMs}
}
const pair=proof.multipleThresholdAreaCover(strictParts,strictStock,2,3,
 {objective:'cost',priceMode:'panel',maxMs:2000,maxStates:12000});
assert.equal(pair.status,'optimal-relaxation');
assert.equal(pair.lowerBound,176);
assert.equal(strict.cost.bound,208);
assert(strict.cost.bound>pair.lowerBound,
 'Three simultaneous thresholds must strictly strengthen cost LB');
// Separate independently created PHYSICAL plan, 44 mixed-size pieces
// and five differently sized source sheets, each with full-edge cuts.
const specs=[[80,80,3],[60,50,5],[45,45,8],[30,30,12],[18,18,16]];
const plantedParts=specs.flatMap(([l,w,n],i)=>pieces('P'+i,n,l,w));
const plantedStocks=specs.map(([l,w,n],i)=>
 stock('strip'+i,l+15,n*w+(n-1)*3+15,1,80+10*i));
plantedStocks.push(stock('alternative1',200,200,3,150),
 stock('alternative2',110,330,4,110),
 stock('alternative3',65,900,2,175));
function plantedBin(s,group){
 const bin={stock:s,placed:[],cuts:[],free:[]},kerf=3;
 const leaves=[{x:2,y:2,w:s.l-4,h:s.w-4}];
 const same=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&
  a.w===b.w&&a.h===b.h;
 function take(rect){
  const at=leaves.findIndex(x=>same(x,rect));
  assert(at>=0,'cut must consume an existing leaf');
  return leaves.splice(at,1)[0]
 }
 function split(rect,axis,span){
  const source=take(rect),vertical=axis==='vertical';
  const total=vertical?source.w:source.h;
  assert(total-span>=kerf);
  const at=(vertical?source.x:source.y)+span+kerf/2;
  bin.cuts.push({axis,at,source:{...source},number:bin.cuts.length+1,
   label:'Independent full-edge kerf cut',
   x1:vertical?at:source.x,y1:vertical?source.y:at,
   x2:vertical?at:source.x+source.w,
   y2:vertical?source.y+source.h:at});
  const first=vertical?{...source,w:span}:{...source,h:span};
  const rest=vertical?
   {x:source.x+span+kerf,y:source.y,w:total-span-kerf,h:source.h}:
   {x:source.x,y:source.y+span+kerf,w:source.w,h:total-span-kerf};
  leaves.push(first);
  if(rest.w>0&&rest.h>0)leaves.push(rest);
  return [first,rest]
 }
 const [strip]=split(leaves[0],'vertical',group[0].l);
 let tail=strip;
 for(const p of group){
  const [cell,down]=split(tail,'horizontal',p.w);
  const leaf=take(cell);
  bin.placed.push({...p,x:leaf.x,y:leaf.y,w:leaf.w,h:leaf.h,
   rotated:false});
  tail=down
 }
 bin.free=leaves;
 return bin
}
const bins=specs.map(([l,w,n],i)=>plantedBin(plantedStocks[i],
 plantedParts.filter(p=>p.id.startsWith('P'+i+'-'))));
const physical={bins,unplaced:[],placedCount:plantedParts.length,
 partArea:plantedParts.reduce((v,p)=>v+p.l*p.w,0),
 stockArea:bins.reduce((v,b)=>v+b.stock.l*b.stock.w,0),
 cost:bins.reduce((v,b)=>v+b.stock.price,0),unknownCostBins:0};
const plantedData={parts:plantedParts,stocks:plantedStocks,trim:2,kerf:3,m3:25000};
const audit=engine.auditCutPlan(physical,plantedData);
assert.equal(audit.ok,true,'44-piece physical guillotine tree: '+audit.issues);
assert.equal(audit.checkedParts,44);
const forged=JSON.parse(JSON.stringify(physical));
forged.bins[0].cuts[0].y2-=1;
assert.equal(engine.auditCutPlan(forged,plantedData).ok,false,
 'Shortened full-edge cut must be rejected');
const physicalStats={parts:44,usedSheets:bins.length,fullEdgeCuts:
 bins.reduce((v,b)=>v+b.cuts.length,0),audited:true,objectives:{}};
for(const objective of ['cost','area']){
 const incumbent=objective==='cost'?physical.cost:physical.stockArea;
 const cert=proof.certify(physical,plantedData,{objective,auditOK:true,
  priceMode:'panel',maxStates:12000,maxMs:2200});
 assert(!cert.proven||cert.lowerBound<=incumbent+1e-7);
 assert(cert.gap===null||cert.gap>=0);
 physicalStats.objectives[objective]={incumbent,lowerBound:cert.lowerBound,
  status:cert.status,unprovenGap:cert.gap,relativeUpperGapPercent:cert.gapPercent,
  proven:cert.proven,method:cert.method};
}
assert.equal(triple(strictParts,strictStock,'cost',0).status,'unknown-limit');
assert.equal(triple(strictParts,strictStock,'cost',0).lowerBound,null);
const unknownPrice=strictStock.map((s,i)=>i===1?{...s,price:null}:s);
assert.equal(triple(strictParts,unknownPrice,'cost').status,'unknown-price');
assert.equal(triple(strictParts,unknownPrice,'area').status,'optimal-relaxation');
// Holdout: eight heterogeneous stock types, five part classes,
// positive trim and kerf, 24 independent seeded instances x 3 objectives.
// The exact reference is stock-multiset brute force (NOT physical packing).
let comparable=0,unknown=0,infeasible=0,overbound=0;
let peakStates=0,maxElapsedMs=0,oracleEnumerations=0;
const statuses={};
const started=Date.now(),heapBefore=process.memoryUsage().heapUsed;
for(let seed=1;seed<=24;seed++){
 const sizes=[[80+seed%6,80],[55,48+seed%5],[42+seed%4,40],
  [30,27+seed%3],[18+seed%5,16]];
 const counts=[1+seed%3,3+seed%5,5+seed%7,9+seed%11,18+seed%17];
 const parts=sizes.flatMap(([l,w],i)=>pieces('H'+seed+'-'+i,counts[i],l,w));
 const sc=[
  stock('a',51+seed%7,900,1+seed%2,34+seed%17),
  stock('b',600,78+seed%8,1+seed%2,64+seed%13),
  stock('c',200,200,1+seed%2,83+seed%21),
  stock('d',120+seed%11,300,1+seed%2,76+seed%16),
  stock('e',300,150+seed%9,1+seed%2,88+seed%15),
  stock('f',95+seed%7,500,1+seed%2,67+seed%20),
  stock('g',70+seed%9,700,1+seed%2,53+seed%13),
  stock('h',155+seed%8,220+seed%10,1+seed%2,95+seed%16)
 ];
 for(const objective of ['cost','area','count']){
  const ref=oracle(parts,sc,objective);
  const actual=triple(parts,sc,objective,250,1300);
  oracleEnumerations+=ref.enumerated;
  statuses[actual.status]=(statuses[actual.status]||0)+1;
  peakStates=Math.max(peakStates,actual.peakStates||0);
  maxElapsedMs=Math.max(maxElapsedMs,actual.elapsedMs||0);
  if(actual.status==='optimal-relaxation'&&Number.isFinite(ref.value)){
   comparable++;
   if(actual.lowerBound>ref.value+1e-7)overbound++;
   assert(actual.lowerBound<=ref.value+1e-7,
    'unsafe three-threshold bound '+seed+'/'+objective);
  }else if(!Number.isFinite(ref.value))infeasible++;
  else unknown++;
 }
}
assert.equal(overbound,0);
assert(comparable>0,'At least one all-threshold independent oracle comparison');

// Resource pressure holdout: 305 pieces on five independently constructed
// long-stock guillotine patterns, with twelve additional competing stocks.
// Exponential stock combinations are NOT enumerated here: these are audited
// feasible upper bounds and resource-budget/UNKNOWN measurements only.
const stressSpecs=[[85,85,20],[60,60,35],[40,40,50],
 [22,22,80],[12,12,120]];
const stressParts=stressSpecs.flatMap(([l,w,n],i)=>
 pieces('R'+i,n,l,w));
const stressBase=stressSpecs.map(([l,w,n],i)=>
 stock('long'+i,l+15,n*w+(n-1)*3+15,1,110+45*i));
const competing=[
 [100,230,8,54],[110,270,8,61],[95,330,8,64],
 [125,240,8,70],[155,255,8,88],[180,300,8,103],
 [95,600,8,95],[230,180,8,76],[145,420,8,96],
 [180,400,8,125],[250,350,8,144],[310,240,8,130]
].map(([l,w,qty,price],i)=>stock('competitor'+i,l,w,qty,price));
const stressStocks=[...stressBase,...competing];
const stressBins=stressSpecs.map((_,i)=>plantedBin(stressBase[i],
 stressParts.filter(p=>p.id.startsWith('R'+i+'-'))));
const stressPlan={bins:stressBins,unplaced:[],placedCount:stressParts.length,
 partArea:stressParts.reduce((v,p)=>v+p.l*p.w,0),
 stockArea:stressBins.reduce((v,b)=>v+b.stock.l*b.stock.w,0),
 cost:stressBins.reduce((v,b)=>v+b.stock.price,0),unknownCostBins:0};
const stressData={parts:stressParts,stocks:stressStocks,trim:2,kerf:3,m3:25000};
const stressAudit=engine.auditCutPlan(stressPlan,stressData);
assert.equal(stressAudit.ok,true,'305-part independent physical tree '+stressAudit.issues);
assert.equal(stressAudit.checkedParts,305);
const stressStats={parts:305,stockTypes:17,usedSheets:5,
 objectives:{},
 fullEdgeCuts:stressBins.reduce((v,b)=>v+b.cuts.length,0),
 statuses:[],audited:true};
for(const objective of ['cost','area']){
 const cert=proof.certify(stressPlan,stressData,{objective,auditOK:true,
  priceMode:'panel',maxStates:12000,maxMs:2500});
 assert(cert.status!=='inconsistent-bound','Certified LB exceeds audited UB');
 assert(!cert.proven||cert.lowerBound<=
  (objective==='cost'?stressPlan.cost:stressPlan.stockArea)+1e-7);
 stressStats.objectives[objective]={incumbent:objective==='cost'?
  stressPlan.cost:stressPlan.stockArea,lowerBound:cert.lowerBound,
  status:cert.status,gap:cert.gap,gapPercent:cert.gapPercent,
  proven:cert.proven,method:cert.method};
}
for(const objective of ['cost','area','count']){
 const incumbent=objective==='cost'?stressPlan.cost:
  objective==='area'?stressPlan.stockArea:stressPlan.bins.length;
 for(const [maxMs,maxStates] of [[50,35],[250,700],[1000,3000]]){
  const result=triple(stressParts,stressStocks,objective,maxMs,maxStates);
  assert(['optimal-relaxation','unknown-limit'].includes(result.status));
  assert(result.status!=='optimal-relaxation'||
   result.lowerBound<=incumbent+1e-7,
   'Stress LB must not exceed independently audited physical UB');
  stressStats.statuses.push({objective,maxMs,maxStates,status:result.status,
   lowerBound:result.lowerBound,incumbent,peakStates:result.peakStates,
   elapsedMs:result.elapsedMs,tested:result.tested,total:result.total,
   complete:result.complete});
 }
}

const report={strict,strictPairCost:pair.lowerBound,physical:physicalStats,
 stress:stressStats,
 holdout:{seeds:24,objectives:72,comparable,unknown,infeasible,
  overbound,peakStates,maxElapsedMs,wallMs:Date.now()-started,
  oracleEnumerations,heapBefore,heapAfter:process.memoryUsage().heapUsed,
  statuses}};
if(process.env.MOTOR_TRIPLE_JSON)
 fs.writeFileSync(process.env.MOTOR_TRIPLE_JSON,JSON.stringify(report,null,2));
console.log('Triple threshold independent audit: '+JSON.stringify(report));
