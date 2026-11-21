/* Beythaus Cut — independent two-stage exact research oracle.
 * Assignment and set-partition feasibility are separate from the solver's
 * strip enumeration, memoization, symmetry reduction and cut reconstruction.
 * The tested optimum is ONLY within the canonical VH/HV two-stage class.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const baseDir=path.join(__dirname,'../docs');
const window={};
for(const name of ['engine/material-policy.js','engine/two-stage-strip-exact.js',
 'engine/production-audit.js','engine/cutting-engine.js']){
 const file=path.join(baseDir,name);
 if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),
  {window},{filename:name});
}
const solver=window.BeythausTwoStageStripExact;
assert(solver,'Expected new two-stage exact solver module');
const base={category:'panel',material:'panel|two-stage',t:18,grain:'length',rotate:false};
const part=(id,l,w,extra={})=>({...base,id,label:id,l,w,order:0,...extra});
const stock=(id,l,w,qty,price,extra={})=>({...base,id,l,w,qty,price,
 priceUnit:'panel',order:0,...extra});
const residualOk=(remaining,k)=>remaining===0||remaining>=k;
let oracleAssignments=0,oraclePartitions=0;
function fitsTwoStage(pieces,board,trim,kerf){
 const W=board.l-2*trim,H=board.w-2*trim,n=pieces.length;
 if(!n||n>9||W<=0||H<=0)return false;
 if(pieces.some(p=>p.material!==board.material||p.t!==board.t||
  p.grain==='width'||(p.rotate&&p.grain!=='length')))return false;
 const full=(1<<n)-1;
 // Independently enumerate ALL set partitions of assigned pieces into strips.
 // Set-partition enumeration, unlike solver's multidimensional-count DP, is
 // identity-based and does not depend on strip ordering or dominance.
 for(const VH of [true,false]){
  const A=VH?W:H,B=VH?H:W;
  const a=pieces.map(p=>VH?p.l:p.w),b=pieces.map(p=>VH?p.w:p.l);
  function partition(left,occupied,count){
   oraclePartitions++;
   if(!left)return residualOk(A-occupied,kerf);
   const first=left&-left;
   for(let subset=left;subset;subset=(subset-1)&left){
    if(!(subset&first))continue;
    let width=null,used=0,number=0,valid=true;
    for(let i=0;i<n;i++)if(subset&(1<<i)){
     if(width!==null&&width!==a[i]){valid=false;break;}
     width=a[i];used+=b[i];number++;
    }
    if(!valid)continue;
    used+=(number-1)*kerf;
    if(used>B||!residualOk(B-used,kerf))continue;
    const next=occupied+width+(count?kerf:0);
    if(next>A)continue;
    if(partition(left^subset,next,count+1))return true;
   }
   return false;
  }
  if(partition(full,0,0))return true;
 }
 return false;
}
function oracle(parts,stocks,objective,trim,kerf){
 const copies=stocks.flatMap(s=>Array.from({length:s.qty},()=>s));
 const bins=copies.map(()=>[]);let best=Infinity;
 function enumerate(index){
  if(index===parts.length){
   oracleAssignments++;
   let objectiveValue=0;
   for(let i=0;i<copies.length;i++){
    if(!bins[i].length)continue;
    if(!fitsTwoStage(bins[i],copies[i],trim,kerf))return;
    objectiveValue+=objective==='cost'?copies[i].price:
     objective==='area'?copies[i].l*copies[i].w:1;
   }
   best=Math.min(best,objectiveValue);return;
  }
  for(let j=0;j<copies.length;j++){
   bins[j].push(parts[index]);enumerate(index+1);bins[j].pop();
  }
 }
 enumerate(0);return best;
}
function auditFullEdge(plan,parts,stocks,trim,kerf){
 const equal=(a,b)=>Math.abs(a-b)<1e-6;
 const rectEq=(a,b)=>a&&b&&['x','y','w','h'].every(k=>equal(a[k],b[k]));
 const byPart=new Map(parts.map(p=>[p.id,p])),byStock=new Map(stocks.map(s=>[s.id,s]));
 const seen=new Set(),used=new Map();let partArea=0,boardArea=0;
 for(const bin of plan.bins){
  const board=byStock.get(bin.stock.id);
  assert(board);
  used.set(board.id,(used.get(board.id)||0)+1);
  boardArea+=board.l*board.w;
  const leaves=[{x:trim,y:trim,w:board.l-2*trim,h:board.w-2*trim}];
  for(const [index,cut] of bin.cuts.entries()){
   assert.equal(cut.number,index+1);
   const at=leaves.findIndex(r=>rectEq(r,cut.source));
   assert(at>=0,'Every cut must act on a live physical leaf');
   const source=leaves.splice(at,1)[0];
   const vertical=cut.axis==='vertical';
   assert(vertical||cut.axis==='horizontal');
   assert(equal(vertical?cut.x1:cut.y1,cut.at));
   assert(equal(vertical?cut.x2:cut.y2,cut.at));
   assert(equal(vertical?cut.y1:cut.x1,vertical?source.y:source.x));
   assert(equal(vertical?cut.y2:cut.x2,
    vertical?source.y+source.h:source.x+source.w),
    'The saw must cross the COMPLETE current leaf');
   const distance=cut.at-(vertical?source.x:source.y)-kerf/2;
   const tail=(vertical?source.w:source.h)-distance-kerf;
   assert(distance>=-1e-6&&tail>=-1e-6);
   if(distance>1e-6)leaves.push(vertical?
    {x:source.x,y:source.y,w:distance,h:source.h}:
    {x:source.x,y:source.y,w:source.w,h:distance});
   if(tail>1e-6)leaves.push(vertical?
    {x:cut.at+kerf/2,y:source.y,w:tail,h:source.h}:
    {x:source.x,y:cut.at+kerf/2,w:source.w,h:tail});
  }
  for(const piece of bin.placed){
   const original=byPart.get(piece.id);
   assert(original&&!seen.has(piece.id));seen.add(piece.id);
   assert.equal(piece.rotated,false);
   assert(equal(piece.w,original.l)&&equal(piece.h,original.w));
   assert.equal(piece.material,board.material);
   assert.equal(piece.t,board.t);
   partArea+=piece.w*piece.h;
   const ix=leaves.findIndex(x=>rectEq(x,piece));
   assert(ix>=0,'Every placed part must be a complete final cut-tree leaf');
   leaves.splice(ix,1);
  }
  for(const rem of bin.free){
   const ix=leaves.findIndex(x=>rectEq(x,rem));
   assert(ix>=0,'Every residual must be a complete final cut-tree leaf');
   leaves.splice(ix,1);
  }
  assert.equal(leaves.length,0,'No unaccounted physical leaves');
 }
 for(const [id,n]of used)assert(n<=byStock.get(id).qty);
 assert.equal(seen.size,parts.length);
 assert.equal(plan.placedCount,parts.length);
 assert(equal(plan.partArea,partArea));assert(equal(plan.stockArea,boardArea));
 // Also run both EXISTING production and external independent auditors in CI.
 const engineModule=window.BeythausCutEngine;
 assert(engineModule,'Production auditor must load in CI');
 {
  const engine=engineModule.createEngine({getState:()=>({mode:'guillotine'}),
   mkey:s=>String(s||'').toLowerCase(),val:Number,fmt:Number});
  const check=engine.auditCutPlan(plan,{parts,stocks,trim,kerf,m3:25000});
  assert.equal(check.ok,true,'Production audit: '+check.issues);
 }
 {
  const independent=require('./optimization-oracle.cjs').audit;
  const check=independent({parts,stocks,trim,kerf},plan,'guillotine');
  assert.equal(check.ok,true,'Independent production-tree audit: '+check.issues);
 }
}
function check(parts,stocks,trim,kerf,objective){
 const expected=oracle(parts,stocks,objective,trim,kerf);
 const actual=solver.solve(parts,stocks,{trim,kerf,objective,
  maxMs:10000,maxNodes:2500000,maxPatterns:40000,maxStates:40000});
 assert(!actual.status.startsWith('unknown'),actual.status);
 if(!Number.isFinite(expected)){
  assert.equal(actual.status,'infeasible-two-stage-class');
 }else{
  assert.equal(actual.status,'optimal-two-stage-class');
  assert.equal(actual.objectiveValue,expected,
   'Independent identity-based set-partition oracle mismatch');
  auditFullEdge(actual.plan,parts,stocks,trim,kerf);
  if(objective==='cost')assert.equal(actual.plan.cost,expected);
  if(objective==='area')assert.equal(actual.plan.stockArea,expected);
 }
 return actual;
}
const started=performance.now();let comparisons=0,seedCases=0;
for(let seed=1;seed<=16;seed++){
 const trim=seed%2,kerf=seed%3;
 const ps=Array.from({length:3+seed%3},(_,i)=>
  part('s'+seed+'-'+i,7+(seed+i*3)%4*3,5+(seed*2+i)%3*4));
 const ss=[stock('narrow'+seed,16+2*trim,17+2*trim,1,30+seed%5),
  stock('wide'+seed,28+2*trim,22+2*trim,2,54+seed%7),
  stock('tall'+seed,20+2*trim,32+2*trim,1,47+seed%4)];
 seedCases++;
 for(const objective of ['cost','area','count']){
  check(ps,ss,trim,kerf,objective);comparisons++;
 }
}
const job=[part('A',30,12),part('B',30,14),
 part('C',20,12),part('D',20,14)];
const large=stock('large',56,32,1,70);
const small1=stock('smallA',32,30,1,45);
const small2=stock('smallB',22,30,1,45);
const sources=[large,small1,small2];
const byCost=check(job,sources,1,2,'cost');
const byArea=check(job,sources,1,2,'area');
assert.equal(byCost.objectiveValue,70);
assert.equal(byArea.objectiveValue,32*30+22*30);
assert.equal(byCost.plan.bins.length,1);
assert.equal(byArea.plan.bins.length,2);
assert(byCost.plan.bins[0].cuts.some(x=>x.axis==='vertical'));
assert(byCost.plan.bins[0].cuts.some(x=>x.axis==='horizontal'));
const corrupted=JSON.parse(JSON.stringify(byCost.plan));
corrupted.bins[0].cuts[0].y2-=1;
assert.throws(()=>auditFullEdge(corrupted,job,sources,1,2),
 'Shortened full-edge cut must be rejected');
const onlyUnknown=stock('missingPrice',56,32,1,null);
assert.equal(solver.solve(job,[onlyUnknown],{trim:1,kerf:2,objective:'cost'}).status,'unknown-price');
const areaUnknown=solver.solve(job,[onlyUnknown],{trim:1,kerf:2,objective:'area'});
assert.equal(areaUnknown.status,'optimal-two-stage-class');
assert.equal(areaUnknown.plan.cost,null);
assert.equal(solver.solve(job,[{...large,price:0.1234567}],
 {trim:1,kerf:2,objective:'cost'}).status,'unknown-precision');
assert.equal(solver.solve(job,[large],{trim:1,kerf:2,maxMs:0}).status,'unknown-limit');
assert.equal(solver.solve(job,[large],{trim:1,kerf:2,maxNodes:1}).status,'unknown-limit');
assert.equal(solver.solve(job.map(p=>({...p,rotate:true,grain:''})),[large],
 {trim:1,kerf:2}).status,'unknown-class');
assert.equal(solver.solve(job.map(p=>({...p,grain:'width',rotate:true})),[large],
 {trim:1,kerf:2}).status,'unknown-class');
const sliver=[part('sliver',20,9)];
assert.equal(solver.solve(sliver,[stock('tooLittleWaste',22,12,1,60)],
 {trim:1,kerf:3}).status,'infeasible-two-stage-class');
const solid=[part('m',20,9,{category:'masif',material:'masif|mese',t:20})];
const solidStock=stock('wood',22,11,1,50000,
 {category:'masif',material:'masif|mese',t:20,priceUnit:'m3'});
const solidPlan=solver.solve(solid,[solidStock],{objective:'cost',trim:1,kerf:2});
assert.equal(solidPlan.status,'optimal-two-stage-class');
assert.equal(solidPlan.objectiveValue,22*11*20/1e9*50000);
auditFullEdge(solidPlan.plan,solid,[solidStock],1,2);
const report={scope:'exact only within canonical two-stage VH/HV strips, NOT general guillotine',
 independentOracle:{seedCases,comparisons,assignments:oracleAssignments,
  partitions:oraclePartitions,unsafeClaims:0},
 deliberateWitness:{costOptimum:byCost.objectiveValue,
  areaOptimum:byArea.objectiveValue,nestedFullEdgeCuts:byCost.plan.bins[0].cuts.length},
 safeguards:{unknownPrice:true,rotationExcluded:true,kerfSliverRejected:true,
  tamperedCutRejected:true,materialThickness:true,masifPrice:true},
 elapsedMs:performance.now()-started,
 peakRSSKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null};
if(process.env.MOTOR_TWO_STAGE_JSON)
 fs.writeFileSync(process.env.MOTOR_TWO_STAGE_JSON,JSON.stringify(report,null,2));
console.log('Exact two-stage independently audited research: '+JSON.stringify(report));
