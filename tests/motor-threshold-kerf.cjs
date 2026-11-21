/* Independent large-mixed-size kerf witness and objective-specific threshold bounds.
 * Big 70 mm squares cannot share one trimmed board, while 20 mm squares can
 * be cut from the remainder. No solver's certificate is used as the oracle.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),window={};
for(const file of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js']){
 vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
  {window},{filename:file});
}
const proof=window.BeythausOptimalityCertificate;
const state={mode:'guillotine',kerf:3,trim:2,priceMode:'panel',
 offcutMinEdgeMm:0,offcutMinAreaCm2:0};
const engine=window.BeythausCutEngine.createEngine({
 getState:()=>state,val:Number,mkey:v=>String(v||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={t:18,category:'panel',material:'panel|oak',rotate:true,grain:''};
const parts=[
 ...Array.from({length:30},(_,i)=>({...base,id:'big-'+i,
  label:'B'+i,order:i,l:70,w:70,grain:i%2?'length':''})),
 ...Array.from({length:30},(_,i)=>({...base,id:'small-'+i,
  label:'S'+i,order:i+30,l:20,w:20,grain:i%3?'':'width'}))
];
const cheap={...base,id:'cheap',l:100,w:100,qty:30,price:100,
 priceUnit:'panel',order:0};
const compact={...base,id:'compact',l:95,w:105,qty:30,price:160,
 priceUnit:'panel',order:1};
const data={parts,stocks:[cheap,compact],trim:2,kerf:3,m3:25000};
// Independent geometric lower bound: two 70mm squares need either
// width or height >= 70+3+70=143mm, and both usable board axes
// are shorter. Therefore every one of 30 big pieces needs its own board.
for(const s of data.stocks){
 const W=s.l-4,H=s.w-4;
 assert(W<143&&H<143,'Big pieces are mutually incompatible');
 assert(Math.max(W,H)>=93,'One big+small is physically possible');
}
const weakAll=proof.cover(data.stocks.map(s=>({...s,_proofCapacity:16})),
 parts.length,{objective:'count'});
assert(weakAll.lowerBound<30,'All-parts smallest-side bound alone is weak');
for(const [objective,stock,expected] of [
 ['cost',cheap,3000],['area',compact,299250]]){
 const one={...data,stocks:[stock]};
 const plan=engine.optimize(one,false,false,objective);
 const audit=engine.auditCutPlan(plan,data);
 assert.equal(plan.unplaced.length,0,'All 60 pieces must be placed first');
 assert.equal(plan.bins.length,30,'Exactly one big per stock');
 assert.equal(audit.ok,true,'Independent full-edge guillotine audit: '+audit.issues);
 const target=objective==='cost'?plan.cost:plan.stockArea;
 assert.equal(target,expected,'Distinct witnessed objective');
 const certificate=proof.certify(plan,data,{objective,auditOK:audit.ok,
  priceMode:'panel',maxMs:2000});
 assert.equal(certificate.status,'optimal',objective+' certified');
 assert.equal(certificate.lowerBound,expected);
 assert.equal(certificate.gap,0);
 assert.equal(certificate.proven,true);
 const other=proof.certify(plan,data,{objective:objective==='cost'?'area':'cost',
  auditOK:audit.ok,priceMode:'panel',maxMs:2000});
 assert.equal(other.proven,false,'Proofs must remain objective-specific');
}
const cardinality=proof.countBoundForGroup(parts,data.stocks,2,3);
assert.equal(cardinality.status,'optimal-relaxation');
assert.equal(cardinality.lowerBound,30);
assert(cardinality.tested>=2,'Multiple size thresholds must be checked');
const withMissing={...data,stocks:[cheap,{...compact,price:null}]};
const chosen=engine.optimize({...data,stocks:[cheap]},false,false,'cost');
const audit=engine.auditCutPlan(chosen,withMissing);
assert.equal(audit.ok,true);
assert.equal(proof.certify(chosen,withMissing,{objective:'cost',
 auditOK:true,priceMode:'panel'}).proven,false,
 'Missing alternate stock price cannot be inferred as zero');
const interrupted=proof.thresholdCardinalityCover(parts,data.stocks,2,3,
 {objective:'area',maxMs:0});
assert.equal(interrupted.status,'unknown-limit');
assert.equal(interrupted.lowerBound,null,'UNKNOWN is not an optimum proof');
console.log('Mixed 60-piece/30-board kerf=3mm: audited physical plans, independent 30-board lower bound, separate cost/area certificates and UNKNOWN guards PASS.');
