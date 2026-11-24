'use strict';
const L=require('./lib.js');
const r=L.rng(0xC0FFEE01);
let n=0,bad=0,feas=0,strictWorse=0;
const t0=Date.now();
for(let it=0;it<300;it++){
  const kerf=r.pick([0,1,2]),trim=r.pick([0,0,1]);
  const nStocks=r.int(1,3),np=r.int(2,5);
  const stocks=[];for(let i=0;i<nStocks;i++)stocks.push(L.mkStock(i,r.int(10,22),r.int(10,22),r.int(1,3),r.int(5,50)));
  const parts=[];for(let i=0;i<np;i++)parts.push(L.mkPart(i,r.int(2,12),r.int(2,12),{rotate:r.int(0,3)>0}));
  const data=L.mkData(parts,stocks,kerf,trim);
  const o=L.oracle(data,{sliver:'relaxed',wantLayout:true}),s=L.oracle(data,{sliver:'strict'});
  n++;
  if(s.feasible&&!o.feasible){bad++;console.log('strict feasible but relaxed not?!',it)}
  if(o.feasible&&s.feasible&&(s.count<o.count||s.area<o.area-1e-9))console.log('monotonic violation',it);
  if(o.feasible&&!s.feasible||o.feasible&&s.count>o.count)strictWorse++;
  if(!o.feasible)continue; feas++;
  // build count-optimal plan and verify
  const bins=o.plan_count.map(({ti,mask})=>{const T=o.types[ti];const placed=o.layoutFor(ti,mask).placed.map(p=>({...parts.find(q=>q.id===p.id),...p}));return{stock:T,placed,cuts:[],free:[]}});
  const plan={bins,unplaced:[]};
  const v=L.verifyPlan(data,plan,{checkCuts:false});
  if(!v.ok){bad++;console.log('ORACLE LAYOUT INVALID',it,v.errors,JSON.stringify(data))}
  else if(v.count!==o.count){bad++;console.log('count mismatch',v.count,o.count)}
}
console.log({n,feas,bad,strictWorse,ms:Date.now()-t0});
