/* The shipped proof Worker may use the exact FULL-SPAN physical result
 * ONLY within its independently verified strict class. Every physical
 * witness is independently audited; no fake global 2D claim.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {audit:referenceAudit}=require('./optimization-oracle.cjs');
const docs=path.join(__dirname,'../docs'),win={};
const files=['engine/material-policy.js','engine/fullspan-strip-exact.js',
 'engine/optimality-certificate.js','engine/production-audit.js',
 'engine/cutting-engine.js'];
for(const file of files)vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
 {window:win},{filename:file});
const exact=win.BeythausFullSpanPatternExact;
const proof=win.BeythausOptimalityCertificate;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',trim:1,kerf:2,priceMode:'panel'}),
 val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|full-span-integrated',category:'panel',
 t:18,rotate:false,grain:'length'};
const piece=(id,h)=>({...base,id,label:id,l:60,w:h,order:0});
const stock=(id,H,qty,price)=>({...base,id,l:62,w:H+2,qty,price,priceUnit:'panel'});
const audit=(plan,data)=>{
 const engineResult=engine.auditCutPlan(plan,data);
 assert.equal(engineResult.ok,true,'Production audit '+engineResult.issues);
 const fresh=referenceAudit(data,plan,'guillotine');
 assert.equal(fresh.ok,true,'Independent audit '+fresh.issues)
};
const budget={maxMs:2500,maxStates:120000,objective:'cost',
 auditOK:true,priceMode:'panel'};
const data={parts:[
 piece('H1',45),piece('H2',45),piece('H3',45),
 piece('L1',35),piece('L2',35),piece('L3',35)],
 stocks:[stock('sheet',80,6,80)],trim:1,kerf:2,m3:25000};
const fitted=exact.solve(data.parts,data.stocks,{
 objective:'cost',trim:1,kerf:2,maxMs:1500});
assert.equal(fitted.status,'optimal-physical-class');
assert.equal(fitted.plan.bins.length,5);
audit(fitted.plan,data);
// Independent analytic lower bound: each 45-mm piece cannot share a
// sheet with any other 45- or 35-mm piece, kerf=2 and H=80.
// All three 45s require distinct sheets; three 35s need two sheets:
// minimum 5. But expanded area alone admits 4: ceil(252/82) = 4.
assert.equal(Math.ceil((3*47+3*37)/82),4);
const objectives={};
for(const objective of ['cost','area','count']){
 const start=performance.now();
 const result=proof.certify(fitted.plan,data,{...budget,objective});
 const desired=objective==='cost'?400:objective==='area'?5*62*82:5;
 assert.equal(result.status,'optimal','Physical class certificate '+objective);
 assert.equal(result.lowerBound,desired);
 assert.equal(result.incumbent,desired);
 assert.equal(result.groups[0].fullSpanPhysicalRelaxation.status,
  'optimal-physical-class');
 assert.equal(result.groups[0].fullSpanPhysicalRelaxation.lowerBound,desired);
 objectives[objective]={optimum:desired,method:result.method,
  elapsedMs:performance.now()-start,
  fullSpanStates:result.groups[0].fullSpanPhysicalRelaxation.states,
  oldKerfExpanded:result.groups[0].kerfExpandedAreaRelaxation?.lowerBound};
}
const unknownCostData={...data,stocks:[...data.stocks,stock('unpriced',90,1,null)]};
const unknownCost=proof.certify(fitted.plan,unknownCostData,{
 ...budget,objective:'cost'});
assert.equal(unknownCost.status,'unknown-price');
const areaPriceMissing=proof.certify(fitted.plan,unknownCostData,{
 ...budget,objective:'area'});
assert.equal(areaPriceMissing.groups[0].fullSpanPhysicalRelaxation.status,
 'optimal-physical-class');
const outsideClass={...data,stocks:[...data.stocks,
 {...stock('wider',90,1,1),l:64}]};
const outside=proof.certify(fitted.plan,outsideClass,{
 ...budget,objective:'cost'});
assert.equal(outside.groups[0].fullSpanPhysicalRelaxation.status,'unknown-class');
assert.notEqual(outside.method,'physical-fullspan-strip-exact');
// Optional solver errors fail closed and leave existing proofs usable.
const normalSolver=win.BeythausFullSpanPatternExact;
win.BeythausFullSpanPatternExact={solve(){throw Error('simulated isolated failure')}};
const retained=proof.certify(fitted.plan,data,{...budget,objective:'cost'});
assert.equal(retained.groups[0].fullSpanPhysicalRelaxation.status,'unknown-limit');
assert(retained.groups[0].kerfExpandedAreaRelaxation,
 'Existing safe bounds continue after strict-solver exception');
win.BeythausFullSpanPatternExact=normalSolver;
const auto=proof.certify(fitted.plan,data,{...budget,objective:'cost',
 allowMaterialAssignment:true});
assert.equal(auto.groups[0].fullSpanPhysicalRelaxation.status,'unknown-class');
const zeroBudget=proof.certify(fitted.plan,data,{
 ...budget,objective:'cost',maxMs:0});
assert.equal(zeroBudget.proven,false);
assert.equal(zeroBudget.status,'unknown-bound');
// Emulate actual deployed worker's importScripts and message boundary.
const self={last:null,postMessage(v){this.last=v}};
const context={self,importScripts:(...scripts)=>{
 for(const script of scripts)vm.runInNewContext(fs.readFileSync(path.join(docs,script),'utf8'),
 {self},{filename:script});
}};
vm.runInNewContext(fs.readFileSync(path.join(docs,'optimality-worker.js'),'utf8'),
 context,{filename:'optimality-worker.js'});
self.onmessage({data:{type:'certify',requestId:77,plan:fitted.plan,data,
 priceMode:'panel',m3:25000,allowMaterialAssignment:false}});
assert.equal(self.last.type,'certificate');
assert.equal(self.last.requestId,77);
assert.equal(self.last.cost.lowerBound,400);
assert.equal(self.last.cost.proven,true);
assert.equal(self.last.area.proven,true);
// Deliberately conflicting exact objectives on the SAME physical job:
// 4 small pieces fit one longer, cheaper sheet, but more compact gross
// area is achieved with three-plus-one short boards.
const choices={parts:Array.from({length:4},(_,i)=>piece('Q'+i,20)),
 stocks:[stock('three',64,2,90),stock('four',88,1,96),
  stock('one',20,4,50)],trim:1,kerf:2,m3:25000};
const cheap=exact.solve(choices.parts,choices.stocks,
 {objective:'cost',trim:1,kerf:2,maxMs:1500});
const compact=exact.solve(choices.parts,choices.stocks,
 {objective:'area',trim:1,kerf:2,maxMs:1500});
assert.equal(cheap.objectiveValue,96);
assert.equal(compact.objectiveValue,4*62*22);
assert.equal(cheap.plan.stockArea,62*90);
assert.equal(compact.plan.stockArea,4*62*22);
assert(cheap.plan.cost<compact.plan.cost,
 'Minimum cost must be a different physical plan from minimum area');
audit(cheap.plan,choices);audit(compact.plan,choices);
const costChoice=proof.certify(cheap.plan,choices,{...budget,objective:'cost'});
const areaChoice=proof.certify(compact.plan,choices,{...budget,objective:'area'});
const costIsNotArea=proof.certify(cheap.plan,choices,{...budget,objective:'area'});
const areaIsNotCost=proof.certify(compact.plan,choices,{...budget,objective:'cost'});
assert.equal(costChoice.status,'optimal');
assert.equal(areaChoice.status,'optimal');
assert.equal(costIsNotArea.status,'gap');
assert.equal(areaIsNotCost.status,'gap');
const distinctObjectives={minimumCost:costChoice.lowerBound,
 minimumArea:areaChoice.lowerBound,
 costPlanArea:cheap.plan.stockArea,areaPlanCost:compact.plan.cost,
 costPlanAreaUnproven:costIsNotArea.status,
 areaPlanCostUnproven:areaIsNotCost.status};
const largeResults={};
for(const size of [44,305]){
 const big={parts:Array.from({length:size},(_,i)=>piece('p'+size+'-'+i,20)),
 stocks:[stock('long',64,Math.ceil(size/3),90)],
 trim:1,kerf:2,m3:25000};
 const built=exact.solve(big.parts,big.stocks,
 {objective:'cost',trim:1,kerf:2,maxMs:3000,maxStates:25000});
 assert.equal(built.status,'optimal-physical-class');
 audit(built.plan,big);
 const certs={};
 for(const objective of ['cost','area']){
  const started=performance.now();
  const value=proof.certify(built.plan,big,{...budget,objective,
   maxMs:3000,maxStates:30000});
  assert.equal(value.proven,true,'Large physical fullspan '+size+'/'+objective);
  const expected=Math.ceil(size/3)*(objective==='cost'?90:62*66);
  assert.equal(value.lowerBound,expected);
  assert.equal(value.groups[0].fullSpanPhysicalRelaxation.lowerBound,expected);
  certs[objective]={exact:expected,status:value.status,
   elapsedMs:performance.now()-started}
 }
 largeResults[size]=certs;
}
const report={class:'fixed non-rotatable pieces spanning all eligible boards',
 distinctObjectives,
 sixPartPhysical:{parts:6,physicalMinimumBoards:5,expandedAreaMinimumBoards:4,
 objectives,independentFullEdgeAudit:true,workerRoundTrip:true},
 safeguards:{unknownPriceGuard:unknownCost.status,
 widerStockFallback:outside.groups[0].fullSpanPhysicalRelaxation.status,
 assignmentFallback:auto.groups[0].fullSpanPhysicalRelaxation.status,
 zeroBudget:zeroBudget.status},
 largeResults,
 process:{rssBytes:process.memoryUsage().rss,
  maxRssKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null}};
if(process.env.MOTOR_FULLSPAN_CERT_JSON)
 fs.writeFileSync(process.env.MOTOR_FULLSPAN_CERT_JSON,JSON.stringify(report,null,2));
console.log('Full-span integrated physical certificate: '+JSON.stringify(report));
