'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../independent-b1/lib.js'),V=require('../physical-guillotine-verifier.cjs');
const {stripes,previousKerf,neighbors}=require('../narrow-scrap-verifier.cjs');
const {engine}=L.loadEngine();
const sample=stripes();
sample.data.stocks[0].qty=2;
for(const enabled of [false,true]){
 const data={...sample.data,allowNarrowScrapCuts:enabled};
 const plan=engine.optimize(data,true,false,'minimum');
 assert.equal(plan.bins.length,enabled?1:2);
 assert.equal(engine.auditCutPlan(plan,data).ok,true);
 assert.equal(V.verifyPlan(data,plan).ok,true);
 assert.equal(plan.bins.some(b=>b.cuts.some(c=>c.overhang===true)),enabled);
}
for(const axis of ['vertical','horizontal']){
 const bin=previousKerf(axis);bin.cuts.forEach((c,i)=>c.number=i+1);
 assert.equal(engine.auditGuillotineCuts(bin,{trim:0,kerf:4,allowNarrowScrapCuts:true}).length,0);
}
for(const [axis,x,y,w,h] of neighbors){
 const bin=previousKerf(axis);bin.cuts.forEach((c,i)=>c.number=i+1);bin.placed.push({id:'neighbor',x,y,w,h});
 const audit=engine.auditGuillotineCuts(bin,{trim:0,kerf:4,allowNarrowScrapCuts:true});
 assert(audit.some(e=>e.includes('komşu')),JSON.stringify({axis,x,y,w,h}));
}
const browser={};vm.createContext(browser);
vm.runInContext(fs.readFileSync(require.resolve('../../docs/engine/physical-verifier.js'),'utf8'),browser);
assert.equal(browser.BeythausPhysicalVerifier.verifyPlan(sample.data,sample.plan).ok,true);
const independent=fs.readFileSync(require.resolve('../physical-guillotine-verifier.cjs'),'utf8');
const expected='(function(root){\n'+independent.replace('module.exports =','root.BeythausPhysicalVerifier =')+"\n})(typeof window!=='undefined'?window:globalThis);\n";
assert.equal(fs.readFileSync(require.resolve('../../docs/engine/physical-verifier.js'),'utf8'),expected);
console.log('B1 engine: strict=2/relaxed=1, both audits, 10 negative production-audit cases, identical independent browser gate passed.');
