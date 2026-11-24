'use strict';
const L=require('./lib.js'),GB=require('./gen-big.js'),PO=require('./pareto.js');
const seed=+process.argv[2],K=+(process.argv[3]||2);
const data=GB.big(seed,{K});const {window,engine}=L.loadEngine();const W=L.loadWorker('optimization-worker.js');
const groups={};for(const p of data.parts){const k=p.l+'x'+p.w+(p.rotate?'(rot)':'(fixed)');groups[k]=(groups[k]||0)+1}
console.log('INSTANCE parts:',JSON.stringify(groups),'stocks:',data.stocks.map(s=>`${s.id}:${s.l}x${s.w} qty${s.qty} price${s.price}`).join(' | '),'kerf',data.kerf,'trim',data.trim);
const o=PO.solve(data,{sliver:'strict'});console.log('exact optimum (min gross area):',o.area,'min count',o.count,'min cost',o.cost);
const plan=engine.optimize(JSON.parse(JSON.stringify(data)),true,false,'area');const v=L.verifyPlan(data,plan);
console.log('engine (area objective): valid',v.ok,'complete',v.complete,'sheets',v.count,'area',v.area,'| gap',(((v.area-o.area)/o.area)*100).toFixed(1)+'%');
plan.stockProof=engine.certifyStockCount(plan,data,engine.auditCutPlan(plan,data));
const c=window.BeythausOptimalityCertificate.certify(plan,JSON.parse(JSON.stringify(data)),{objective:'area',auditOK:true,priceMode:'panel',m3:25000,maxMs:2500,maxStates:120000});
console.log('certificate:',c.status,'LB',c.lowerBound,'incumbent',c.incumbent);
const t=Date.now();W.onmessage({data:{type:'economy',requestId:3,cutMode:'guillotine',objective:'area',priceMode:'panel',m3:null,data:{parts:data.parts,stocks:data.stocks,kerf:data.kerf,trim:data.trim},incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),timeBudgetMs:3000,maxNodes:300000}});
console.log('economy worker:',W.result.status,JSON.stringify(W.result.groups.map(g=>({s:g.status,best:g.bestArea,init:g.initialArea,checked:g.checked}))),(Date.now()-t)+'ms');
