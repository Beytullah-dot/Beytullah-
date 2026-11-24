'use strict';
const L=require('./lib.js');
const {window,engine}=L.loadEngine();
const solveW=L.loadWorker('optimization-worker.js');
const data=L.mkData([0,1,2].map(i=>L.mkPart(i,810,1220,{rotate:false})),[L.mkStock(0,2440,1220,5,100)],4,0);
const plan=engine.optimize(JSON.parse(JSON.stringify(data)),true,false,'minimum');
const audit=engine.auditCutPlan(plan,data);plan.stockProof=engine.certifyStockCount(plan,data,audit);
console.log('sheets used:',plan.bins.length,'| audit ok:',audit.ok);
console.log('certifyStockCount.proven =',plan.stockProof.proven,'|',engine.stockProofDescription(plan.stockProof));
for(const o of ['count','area','cost']){const c=window.BeythausOptimalityCertificate.certify(plan,JSON.parse(JSON.stringify(data)),{objective:o,auditOK:true,priceMode:'panel',m3:25000});console.log('certificate',o,'->',c.status,'proven='+c.proven,'LB',c.lowerBound,'incumbent',c.incumbent,c.method)}
solveW.onmessage({data:{type:'solve',requestId:1,mode:'guillotine',data:{parts:data.parts,stocks:data.stocks,kerf:4,trim:0},incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),bounds:plan.stockProof.details,timeBudgetMs:3000,maxNodes:300000}});
console.log('exact worker status:',solveW.result.status,JSON.stringify(solveW.result.groups.map(g=>({s:g.status,proven:g.proven,lb:g.lowerBound,best:g.bestCount}))));
// physical witness: strips at x=0,814,1628 ; last cut blade covers [2438,2442]
console.log('witness: pieces at x=0..810, 814..1624, 1628..2438; leftover 2 mm; 3rd cut blade [2438,2442] overhangs board end (2440) by 2 mm');
console.log('checked:',JSON.stringify(solveW.result.groups[0].checked),'nodes',solveW.result.nodes);
const GE=solveW.GuillotineExact||null;
