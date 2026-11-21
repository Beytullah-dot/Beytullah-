/* Heterogeneous min-edge kerf capacity: two stock sizes, different prices,
 * different item sizes, positive kerf/trim, 27 required sheets.
 * All feasible witnesses are independently audited physical cut trees.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),win={};
for(const file of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js']){
 vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
  {window:win},{filename:file});
}
const proof=win.BeythausOptimalityCertificate;
const state={mode:'guillotine',objective:'cost',kerf:3,trim:2,
 priceMode:'panel',offcutMinEdgeMm:0,offcutMinAreaCm2:0};
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>state,val:Number,mkey:x=>String(x||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const dims=[[70,70],[71,70],[70,71],[71,71]];
const parts=Array.from({length:27},(_,i)=>({
 id:'hetero-'+i,origin:'row',label:'H'+i,order:i,
 l:dims[i%4][0],w:dims[i%4][1],t:18,
 category:'panel',material:'panel|oak',rotate:true,
 grain:i%3===0?'':i%3===1?'length':'width'
}));
const affordable={id:'affordable',l:100,w:100,t:18,qty:27,
 category:'panel',material:'panel|oak',price:100,priceUnit:'panel',order:0};
const compact={id:'compact',l:95,w:105,t:18,qty:27,
 category:'panel',material:'panel|oak',price:160,priceUnit:'panel',order:1};
const all={parts,stocks:[affordable,compact],trim:2,kerf:3,m3:25000};
// Independent two-piece incompatibility witness: even the smallest
// part side (70) cannot share either trimmed stock axis with another
// under the 3mm kerf. No rotations or grain choices weaken this bound.
for(const stock of all.stocks){
 const W=stock.l-2*all.trim,H=stock.w-2*all.trim;
 assert(W<2*70+all.kerf&&H<2*70+all.kerf);
}
const count=proof.countBoundForGroup(parts,all.stocks,all.trim,all.kerf);
assert.equal(count.status,'optimal-relaxation');
assert.equal(count.lowerBound,27,'Mixed parts require at least 27 sheets');
function planWith(stock){
 const data={...all,stocks:[stock]};
 const plan=engine.optimize(data,false,false);
 assert.equal(plan.unplaced.length,0,'Construct complete plan');
 assert.equal(plan.bins.length,27,'Physical witness has 27 separate sheets');
 const audit=engine.auditCutPlan(plan,all);
 assert.equal(audit.ok,true,'Independent edge-to-edge cut-tree audit');
 return plan;
}
const costPlan=planWith(affordable);
const areaPlan=planWith(compact);
assert.equal(costPlan.cost,2700);
assert.equal(costPlan.stockArea,270000);
assert.equal(areaPlan.cost,4320);
assert.equal(areaPlan.stockArea,269325);
function certify(plan,objective){
 return proof.certify(plan,all,{objective,auditOK:true,
  priceMode:'panel',m3:25000,maxMs:2500});
}
const cheapest=certify(costPlan,'cost');
const smallest=certify(areaPlan,'area');
assert.equal(cheapest.status,'optimal');
assert.equal(cheapest.lowerBound,2700);
assert.equal(cheapest.proven,true);
assert.equal(smallest.status,'optimal');
assert.equal(smallest.lowerBound,269325);
assert.equal(smallest.proven,true);
assert.equal(certify(costPlan,'area').proven,false,
 'Cheap stock is not minimum gross area');
assert.equal(certify(areaPlan,'cost').proven,false,
 'Smallest gross area is not cheapest stock');
assert.equal(proof.certify(costPlan,all,{objective:'cost',auditOK:false}).proven,
 false,'Unverified witness cannot be certified');
const unknownPrice={...all,stocks:[affordable,{...compact,price:null}]};
assert.equal(proof.certify(costPlan,unknownPrice,{
 objective:'cost',auditOK:true,priceMode:'panel'}).proven,false,
 'Unknown alternative price must block cost proof');
// An enlarged stock can contain more than one piece; the cardinality
// bound must NOT blindly force one part per sheet for every stock.
const enlarged={...affordable,l:160,w:160,qty:27};
const loose=proof.countBoundForGroup(parts,[enlarged],all.trim,all.kerf);
assert(loose.lowerBound<27,'No false one-piece-per-stock generalization');
console.log('Heterogeneous 27-sheet kerf=3mm: two physical plans, distinct area/cost optima, conservative bounds and unknown-price guards PASS.');
