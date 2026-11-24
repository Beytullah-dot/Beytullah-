'use strict';
const L=require('./lib.js'),G=require('./gen.js');
const [,, fam='generic', seedS='910672']=process.argv;
const data=fam==='planted'?G.planted(+seedS):G.family(fam,+seedS);
const {engine}=L.loadEngine();
const strictO=L.oracle(data,{sliver:'strict',wantLayout:true});
const relO=L.oracle(data,{sliver:'relaxed'});
console.log('INSTANCE',JSON.stringify({kerf:data.kerf,trim:data.trim,
  parts:data.parts.map(p=>[p.l,p.w,p.rotate===false?'norot':'',p.grain||'',p.material,p.t].filter(x=>x!=='')),
  stocks:data.stocks.map(s=>({id:s.id,l:s.l,w:s.w,qty:s.qty,price:s.price,m:s.material,t:s.t}))}));
console.log('oracle strict count/area/cost:',strictO.count,strictO.area,strictO.cost,'| relaxed:',relO.count,relO.area,relO.cost);
const eng=engine.optimize(JSON.parse(JSON.stringify(data)),true,false,'minimum');
console.log('engine: bins',eng.bins.length,'unplaced',eng.unplaced.length,'-> ',eng.unplaced.map(u=>u.id+':'+u.l+'x'+u.w).join(','));
if(strictO.feasible){
  const bins=strictO.plan_count.map(({ti,mask})=>{const T=strictO.types[ti],lay=strictO.layoutFor(ti,mask);
    return{stock:T,placed:lay.placed.map(p=>({...data.parts.find(q=>q.id===p.id),...p})),cuts:lay.cuts,free:lay.free}});
  const plan={bins,unplaced:[],placedCount:data.parts.length,partArea:data.parts.reduce((a,p)=>a+p.l*p.w,0),
    stockArea:bins.reduce((a,b)=>a+b.stock.l*b.stock.w,0),cost:null,unknownCostBins:0};
  const a=engine.auditCutPlan(plan,data),v=L.verifyPlan(data,plan);
  console.log('ORACLE WITNESS accepted by SHIPPED auditor:',a.ok,a.issues,' by independent verifier:',v.ok,v.errors);
  console.log('witness bins:',JSON.stringify(bins.map(b=>({stock:b.stock.id,placed:b.placed.map(p=>[p.id,p.x,p.y,p.w,p.h,p.rotated?'R':''])}))));
}
