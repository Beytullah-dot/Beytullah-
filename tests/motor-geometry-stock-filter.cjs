/* Independent single-piece compatibility oracle plus full-edge physical witness.
 * The reference enumerates stock multiplicities without using the engine's
 * geometry filter or any Pareto pruning; it is NOT a physical packing solver.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {audit:independentAudit}=require('./optimization-oracle.cjs');
const docs=path.join(__dirname,'../docs'),win={};
for(const name of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(docs,name),'utf8'),
  {window:win},{filename:name});
const proof=win.BeythausOptimalityCertificate;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:2,trim:1}),
 val:Number,mkey:x=>String(x||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|geometry',category:'panel',t:18,grain:'length',rotate:false};
function item(id,l,w,extra={}){return {...base,id,label:id,l,w,order:0,...extra}}
function board(id,l,w,qty,price,extra={}){return {...base,id,l,w,qty,price,
 priceUnit:'panel',order:0,...extra}}
// Deliberately independent physical criterion: iterate all explicitly
// permitted (angle, grain) pairs, not the production helper.
function referenceFit(p,s,trim=1){
 if(p.material!==s.material)return false;
 if(typeof p.t==='number'&&Number.isFinite(p.t)&&p.t>0&&
    (s.t===null||(typeof s.t==='number'&&Number.isFinite(s.t)&&
     Math.abs(p.t-s.t)>1e-6)))return false;
 const orientations=[{angle:0,x:p.l,y:p.w},
  ...(!p.rotate?[]:[{angle:90,x:p.w,y:p.l}])];
 for(const o of orientations){
  if(p.grain==='length'&&o.angle!==0)continue;
  if(p.grain==='width'&&o.angle!==90)continue;
  if(o.x<=s.l-2*trim+1e-7&&o.y<=s.w-2*trim+1e-7)return true;
 }
 return false;
}
function referenceCover(parts,stocks,objective,trim=1,kerf=2){
 const included=stocks.filter(s=>s.qty>0&&parts.some(p=>referenceFit(p,s,trim)));
 const need=parts.reduce((a,p)=>a+(p.l+kerf)*(p.w+kerf),0);
 let best=Infinity,enumerated=0;
 function enumerate(i,supply,value){
  if(i===included.length){
   enumerated++;
   if(supply+1e-7>=need)best=Math.min(value,best);
   return;
  }
  const s=included[i],W=s.l-2*trim,H=s.w-2*trim;
  const capacity=W>0&&H>0?(W+kerf)*(H+kerf):0;
  const unit=objective==='cost'?s.price:
   objective==='area'?s.l*s.w:1;
  for(let qty=0;qty<=s.qty;qty++)
   enumerate(i+1,supply+qty*capacity,value+qty*unit);
 }
 enumerate(0,0,0);
 return {best,enumerated,eligible:included.length}
}
const specificParts=[item('fixed',60,20),
 item('widthOnly',50,25,{grain:'width',rotate:true}),
 item('free',32,18,{grain:'',rotate:true})];
const specificStocks=[
 board('exact',62,22,1,50),board('rotatedOnly',27,52,1,80),
 board('narrow',24,300,1,1),board('wrongMaterial',200,200,1,1,
 {material:'panel|different'}),board('wrongThickness',200,200,1,1,{t:12}),
 board('tooShortAfterTrim',61,22,1,1)];
const filter=proof.geometryCompatibleStockTypes(specificParts,specificStocks,1,2);
assert.equal(filter.status,'complete');
assert.deepEqual(Array.from(filter.stocks,x=>x.id),['exact','rotatedOnly']);
const widthOnly=proof.geometryCompatibleStockTypes(
 [item('squareWidth',20,20,{grain:'width',rotate:false})],
 [board('large',100,100,1,5)],1,2);
assert.equal(widthOnly.stocks.length,0,
 'Width grain requires permitted 90-degree orientation, even for squares');
assert.equal(proof.geometryCompatibleStockTypes(specificParts,specificStocks,1,2,
 {deadline:0}).status,'unknown-limit');
assert.equal(proof.geometryCompatibleStockTypes(
 specificParts,specificStocks,1,-1).stocks.length,specificStocks.length);
const testsStart=performance.now();
let comparisons=0,enumerations=0,infeasible=0,maxFilterChecks=0;
for(let seed=1;seed<=72;seed++){
 const parts=[
  item('p0',12+seed%17,18+seed%9,{grain:seed%3===0?'width':
   seed%3===1?'length':'',rotate:seed%2===0||seed%3===0}),
  item('p1',25+seed%11,13+seed%7,{grain:seed%4===0?'width':'',
   rotate:seed%4!==1}),
  item('p2',18+seed%8,24+seed%13,{grain:'length',rotate:false})
 ];
 const stocks=[
  board('s0',18+seed%20,46+seed%15,2,22+seed%13),
  board('s1',50+seed%12,22+seed%13,2,35+seed%11),
  board('s2',28+seed%18,62+seed%10,2,41+seed%13),
  board('s3',45+seed%14,55+seed%14,1,57+seed%13)
 ];
 const got=proof.geometryCompatibleStockTypes(parts,stocks,1,2);
 assert.equal(got.status,'complete');
 maxFilterChecks=Math.max(maxFilterChecks,got.checks);
 assert.deepEqual(Array.from(got.stocks,s=>s.id),
  stocks.filter(s=>parts.some(p=>referenceFit(p,s))).map(s=>s.id),
  'Independent one-piece geometry: seed '+seed);
 for(const objective of ['cost','area','count']){
  const ref=referenceCover(parts,stocks,objective);
  const result=proof.kerfExpandedAreaCover(parts,got.stocks,1,2,
   {objective,priceMode:'panel',maxStates:5000,maxMs:1000});
  enumerations+=ref.enumerated;
  if(!Number.isFinite(ref.best)){
   infeasible++;
   assert.equal(result.status,'infeasible-relaxation',
    'Reference infeasible stock relaxation: '+seed+'/'+objective);
  }else{
   assert.equal(result.status,'optimal-relaxation');
   assert.equal(result.lowerBound,ref.best,
    'Independent stock-multiset objective: '+seed+'/'+objective);
  }
  comparisons++;
 }
}
// Full-edge physical witness: three 60x20 pieces in a 62x66 source,
// kerf 2, trim 1. A 24mm wide cheap stock is not an alternative.
const parts=[item('A',60,20),item('B',60,20),item('C',60,20)];
const source=board('physical',62,66,1,90);
const cheap=board('cannotFit',24,360,90,5);
const stocks=[source,cheap];
const cut=(number,at,sourceRect)=>({axis:'horizontal',at,number,
 source:sourceRect,label:'Independent complete guillotine',
 x1:sourceRect.x,y1:at,x2:sourceRect.x+sourceRect.w,y2:at});
const bin={stock:source,placed:parts.map((p,i)=>({...p,
 x:1,y:1+22*i,w:60,h:20,rotated:false})),cuts:[
 cut(1,22,{x:1,y:1,w:60,h:64}),
 cut(2,44,{x:1,y:23,w:60,h:42})],free:[]};
const plan={bins:[bin],unplaced:[],placedCount:3,partArea:3600,
 stockArea:4092,cost:90,unknownCostBins:0};
const data={parts,stocks,trim:1,kerf:2,m3:25000};
const audit=engine.auditCutPlan(plan,data);
assert.equal(audit.ok,true,'Actual engine full-edge audit '+audit.issues);
const other=independentAudit(data,plan,'guillotine');
assert.equal(other.ok,true,'Independent cut-tree audit '+other.issues);
const forged=JSON.parse(JSON.stringify(plan));forged.bins[0].cuts[0].x2-=1;
assert.equal(engine.auditCutPlan(forged,data).ok,false);
assert.equal(independentAudit(data,forged,'guillotine').ok,false);
const physical={};
for(const objective of ['cost','area']){
 const result=proof.certify(plan,data,{objective,auditOK:true,
  priceMode:'panel',maxStates:20000,maxMs:2500});
 assert.equal(result.status,'optimal');
 assert.equal(result.lowerBound,objective==='cost'?90:4092);
 assert.equal(result.groups[0].excludedStockTypes,1);
 physical[objective]={incumbent:result.incumbent,bound:result.lowerBound,
  status:result.status,excluded:result.groups[0].excludedStockTypes};
}
// Unknown cost on a *physically impossible* source does not invalidate
// minimum registered cost. Unknown cost on a compatible source DOES.
const missingImpossible=proof.certify(plan,{...data,stocks:[
 source,{...cheap,price:null}]},{objective:'cost',auditOK:true,
 priceMode:'panel',maxMs:2500});
assert.equal(missingImpossible.status,'optimal');
const missingCompatible=proof.certify(plan,{...data,stocks:[
 source,{...source,id:'other',price:null}]},{objective:'cost',auditOK:true,
 priceMode:'panel',maxMs:2500});
assert.equal(missingCompatible.status,'unknown-price');
const exhausted=proof.certify(plan,data,{objective:'cost',auditOK:true,
 maxMs:0});
assert.equal(exhausted.status,'unknown-bound');
assert.equal(exhausted.proven,false);
const report={method:'physical-geometry-stock-compatibility',
 independentOracle:{seeds:72,comparisons,enumerations,infeasible,
  maxFilterChecks,elapsedMs:performance.now()-testsStart},
 physicalWitness:{parts:3,fullEdgeCuts:2,doubleAudit:true,
  tamperRejected:true,physical},unknownBudget:'UNKNOWN',
 maxRssKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null};
if(process.env.MOTOR_GEOMETRY_FILTER_JSON)
 fs.writeFileSync(process.env.MOTOR_GEOMETRY_FILTER_JSON,
  JSON.stringify(report,null,2));
console.log('Geometry stock compatibility proof: '+JSON.stringify(report));
