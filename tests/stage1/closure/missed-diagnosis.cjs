'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const L=require('../../independent-b1/lib.js');const rows=[];
for(const seed of [912041,913243]){
 const {data}=JSON.parse(fs.readFileSync(path.join(__dirname,`../results/missed-generic-${seed}-area.json`)));
 for(const enabled of [false,true]){
  const d={...data,allowNarrowScrapCuts:enabled},{engine}=L.loadEngine();
  const plan=engine.optimize(d,true,false,'area');
  const c=L.loadWorker('constructive-worker.js');const message={type:'construct',requestId:1,mode:'guillotine',objective:'area',priceMode:'panel',m3:null,data:structuredClone(d)};
  c.onmessage({data:message});assert.equal(message.data.allowNarrowScrapCuts,enabled);
  const w=L.loadWorker('optimization-worker.js');
  // Diagnostic raw feasibility call: only original parts/stocks, NO witness/incumbent.
  const exact=w.GuillotineExact.feasible(d.parts,d.stocks,d.stocks.reduce((a,s)=>a+s.qty,0),d,Date.now()+4000,600000);
  let audit=null;
  if(exact.layout){const bins=exact.layout.map(b=>({stock:b.stock,cuts:b.cuts,free:b.free,placed:b.pieces}));audit=L.verifyPlan(d,{bins,unplaced:[]});assert(audit.ok&&audit.complete);}
  rows.push({seed,enabled,initialUnplaced:plan.unplaced.length,constructive:c.result,receivedFlag:message.data.allowNarrowScrapCuts,exactStatus:exact.status,exactNodes:exact.nodes,independentAudit:audit,classification:'B3 heuristic search miss; constructive fixed-orientation class excludes rotatable parts; solve/economy not launched without complete incumbent'});
 }
}
fs.writeFileSync(path.join(__dirname,'../results/missed-diagnosis.json'),JSON.stringify(rows,null,2));console.log(rows.map(r=>({seed:r.seed,flag:r.enabled,missing:r.initialUnplaced,constructive:r.constructive.status,exact:r.exactStatus})));
