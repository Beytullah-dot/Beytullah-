/* Beythaus Cut — 25-sheet proof and independent integer-cover oracle.
 * Runs against shipped code, including physical guillotine cutting audit.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),win={};
function load(file,context={window:win}){
 vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),context,{filename:file});
}
load('engine/material-policy.js');
load('engine/optimality-certificate.js');
load('engine/production-audit.js');
load('engine/cutting-engine.js');
const certificate=win.BeythausOptimalityCertificate,policy=win.BeythausMaterialPolicy;
assert.equal(certificate.version,1);
assert.equal(policy.grainAllows({grain:''},{grain:'width'},false),true);
assert.equal(policy.grainAllows({grain:'length'},{grain:'width'},false),true);
assert.equal(policy.grainAllows({grain:'length'},{grain:'length'},true),false);
assert.equal(policy.grainAllows({grain:'width'},{grain:'length'},true),true);
assert.equal(policy.grainAllows({grain:'width'},{grain:''},false),false);

const current={mode:'guillotine',kerf:0,trim:0,priceMode:'panel',
 offcutMinEdgeMm:0,offcutMinAreaCm2:0};
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>current,val:Number,mkey:s=>String(s).toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const parts=Array.from({length:100},(_,i)=>({
 id:'part-'+i,origin:'row',label:'P'+(i+1),order:i,
 l:50,w:50,t:18,category:'panel',material:'panel|oak',
 rotate:true,grain:''
}));
const stocks=[{id:'stock-25',l:100,w:100,t:18,category:'panel',
 material:'panel|oak',qty:25,price:1200,priceUnit:'panel',order:0}];
const data={parts,stocks,trim:0,kerf:0,m3:25000};
const plan=engine.optimize(data,false,false);
const audited=engine.auditCutPlan(plan,data);
assert.equal(audited.ok,true,'100 pieces need an independently auditable cut sequence');
assert.equal(plan.unplaced.length,0);
assert.equal(plan.bins.length,25,'Four 50x50 parts per 100x100 stock');
const expected=[['count',25],['area',250000],['cost',30000]];
for(const [objective,value] of expected){
 const proof=certificate.certify(plan,data,{objective,auditOK:audited.ok,
  priceMode:'panel',m3:25000,maxMs:1500});
 assert.equal(proof.status,'optimal',objective+' 25-stock global optimality');
 assert.equal(proof.proven,true,objective+' proof');
 assert.equal(proof.lowerBound,value,objective+' lower bound');
}
assert.equal(certificate.certify(plan,data,{objective:'cost',auditOK:false}).proven,false,
 'No proof without the independent plan audit');

// Harder 25-sheet case: the area bound is only 9, but all 25 parts
// are mutually incompatible on a 100x100 board (60+60 exceeds 100).
// The independent pairwise clique lower bound proves 25 is necessary.
const looseParts=Array.from({length:25},(_,i)=>({
 ...parts[i],id:'loose-'+i,l:60,w:60,order:i
}));
const looseData={...data,parts:looseParts};
const loose=engine.optimize(looseData,false,false);
const looseAudit=engine.auditCutPlan(loose,looseData);
assert.equal(looseAudit.ok,true,'Each oversized part has an audited physical cut tree');
assert.equal(loose.bins.length,25);
loose.stockProof=engine.certifyStockCount(loose,looseData,looseAudit);
assert.equal(loose.stockProof.proven,true,'Pairwise incompatibility certifies 25 sheets');
assert.equal(loose.stockProof.lowerBound,25);
for(const objective of ['area','cost']){
 const proof=certificate.certify(loose,looseData,{objective,auditOK:looseAudit.ok,
  priceMode:'panel'});
 assert.equal(proof.proven,true,'Uniform stock count proves '+objective);
 assert.equal(proof.method,'proven-count-uniform-unit');
}
// A physically unrestricted area-cover relaxation can find cheaper stock
// combinations WITHOUT ever falsely proving the incumbent is cheapest.
const cheaper=[
 {l:100,w:100,qty:1,priceUnit:'panel',price:100},
 {l:50,w:100,qty:2,priceUnit:'panel',price:25}
];
assert.equal(certificate.cover(cheaper,10000,{objective:'cost'}).lowerBound,50);
assert.equal(certificate.cover(cheaper,10000,{objective:'count'}).lowerBound,1);
assert.equal(certificate.cover(cheaper,10000,{objective:'area'}).lowerBound,10000);
assert.equal(certificate.cover([{l:100,w:100,qty:1,price:''}],10000,
 {objective:'cost'}).status,'unknown-price');
assert.equal(certificate.cover([{l:1,w:1,qty:5}],5,
 {objective:'area',maxStates:1}).status,'unknown-limit');

// Never claim that the heuristic's assigned material was the only option.
const fixedData={parts:[{...parts[0],l:100,w:100}],stocks:[
 {...stocks[0],qty:1,price:200},
 {...stocks[0],id:'walnut',material:'panel|walnut',qty:1,price:50}
],trim:0,kerf:0};
const fixedPlan={bins:[{}],placedCount:1,unplaced:[],cost:200,stockArea:10000};
assert.equal(certificate.certify(fixedPlan,fixedData,{objective:'cost',auditOK:true,
 priceMode:'panel'}).proven,true);
assert.equal(certificate.certify(fixedPlan,fixedData,{objective:'cost',auditOK:true,
 priceMode:'panel',allowMaterialAssignment:true}).proven,false);

// Independent exhaustive oracle for the bounded integer-area-cover model.
let seed=94737;function random(n){seed=(seed*1664525+1013904223)>>>0;return seed%n}
function oracle(types,demand,objective){
 let optimum=Infinity;
 function visit(i,capacity,value){
  if(i===types.length){
   if(capacity>=demand)optimum=Math.min(optimum,value);
   return
  }
  const s=types[i],unit=objective==='cost'?s.price:
   objective==='area'?s.l*s.w:1;
  for(let q=0;q<=s.qty;q++)visit(i+1,capacity+q*s.l*s.w,value+q*unit);
 }
 visit(0,0,0);
 return optimum
}
for(let test=0;test<160;test++){
 const n=1+random(4),types=Array.from({length:n},()=>({
  l:1+random(9),w:1+random(8),qty:random(5),
  price:1+random(30),priceUnit:'panel'
 }));
 const demand=1+random(120);
 for(const objective of ['count','area','cost']){
  const got=certificate.cover(types,demand,{objective,maxMs:1500});
  const expectedValue=oracle(types,demand,objective);
  if(expectedValue===Infinity)assert.equal(got.status,'infeasible-relaxation');
  else{
   assert.equal(got.status,'optimal-relaxation',test+' '+objective);
   assert.equal(got.lowerBound,expectedValue,test+' '+objective);
  }
 }
}
const guillotineCtx={self:{},BeythausMaterialPolicy:policy,Date,Math};
load('guillotine-exact.js',guillotineCtx);
const exact=guillotineCtx.self.GuillotineExact.feasible;
const s={id:'s',l:100,w:60,qty:1,material:'oak',t:18};
function one(grain,l=80,w=40){
 return exact([{id:'p',l,w,t:18,material:'oak',rotate:true,grain,label:'P'}],
  [s],1,{kerf:0,trim:0},Date.now()+1000,100000)
}
assert.equal(one('length').status,'feasible','Part length along stock length fits');
assert.equal(one('width').status,'infeasible','Part length along stock width does not fit');
assert.equal(one('').status,'feasible','Free part orientation is allowed');
const square=exact([{id:'square',l:40,w:40,t:18,material:'oak',rotate:true,
 grain:'width',label:'square'}],[s],1,{kerf:0,trim:0},Date.now()+1000,100000);
assert.equal(square.status,'feasible');
assert.equal(square.layout[0].pieces[0].rotated,true,'Square direction still retained');
console.log('Motor proof foundation: physically audited 100-part and 25 oversized-part / 25-sheet optima; 480 exact cover oracles; piece-only direction and unknown guards PASS.');
