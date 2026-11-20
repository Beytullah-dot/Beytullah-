/* Goal selection contract: exact area and cost choose different physical cuts,
 * main-thread acceptance replays the cut tree, UNKNOWN is never a certificate. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const {createEngine}=require('./engine-harness.cjs');
const oracle=require('./optimization-oracle.cjs');
assert.match(html,/id="objectiveSegment"/);
assert.match(html,/data-objective="area"/);
assert.match(html,/data-objective="cost"/);
assert.match(html,/objective,priceMode:state.priceMode/);
const state={mode:'guillotine',objective:'area',materialMode:'single',priceMode:'panel',offcutMinEdgeMm:10,offcutMinAreaCm2:0};
const key=x=>String(x||'').toLocaleLowerCase('tr-TR');
const engine=createEngine(state,Number,key,(x,d)=>Number(x).toFixed(d||0));
const a=html.indexOf('function acceptEconomyWorkerResult('),b=html.indexOf('function launchEconomyAfterCount(',a);
assert.ok(a>0&&b>a,'real acceptance routine');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey','collectOffcuts',
 html.slice(a,b)+';return acceptEconomyWorkerResult;')(
 state,engine.mkBin,engine.binCost,engine.auditCutPlan,key,engine.collectOffcuts);
const ctx={last:null,postMessage(m){this.last=m}};
for(const file of ['guillotine-exact.js','economic-exact.js','optimization-worker.js'])
 new Function('self',fs.readFileSync(path.join(root,'docs',file),'utf8'))(ctx);
const parts=[0,1].map(i=>({id:'p'+i,label:'P'+i,l:50,w:100,t:null,
 rotate:false,material:'MDF',order:i}));
const stockList=[
 {id:'large',l:100,w:100,qty:1,price:100,t:null,material:'MDF',order:0},
 {id:'small',l:60,w:100,qty:2,price:25,t:null,material:'MDF',order:1}
];
const data={parts,stocks:stockList,trim:0,kerf:0,m3:0};
function physicalInitial(input,which){
 const s=input.stocks.find(x=>x.id===which);
 const available=[{...s,qty:which==='large'?1:2}];
 const res=ctx.GuillotineExact.feasible(input.parts,available,available[0].qty,
  {trim:0,kerf:0},Date.now()+3000,300000);
 assert.equal(res.status,'feasible','known physical incumbent exists');
 const bins=res.layout.map(b=>{
  const x=engine.mkBin(b.stock,0);
  x.placed=b.pieces.map(p=>({...input.parts.find(t=>t.id===p.id),
   x:p.x,y:p.y,w:p.w,h:p.h,rotated:p.rotated}));
  x.cuts=b.cuts;x.free=b.free;return x
 });
 const prices=bins.map(b=>engine.binCost(b.stock,{priceMode:'panel'}));
 const initial={bins,unplaced:[],placedCount:input.parts.length,partArea:10000,
  stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  cost:prices.some(p=>p===null)?null:prices.reduce((n,p)=>n+p,0),
  unknownCostBins:prices.filter(x=>x===null).length,search:{savedStockCount:0}};
 assert.ok(engine.auditCutPlan(initial,input).ok,'incumbent has valid physical cut tree');
 return initial
}
function solve(input,which,objective){
 ctx.last=null;
 const init=physicalInitial(input,which);
 ctx.onmessage({data:{type:'economy',requestId:87,cutMode:'guillotine',
  objective,priceMode:'panel',data:input,
  incumbentBins:init.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
  timeBudgetMs:4000,maxNodes:350000}});
 assert.equal(ctx.last.type,'economy-finished');
 assert.equal(ctx.last.objective,objective);
 return {init,response:ctx.last}
}
// Independent oracle checks feasibility for each stock quantity combination.
const possible=[];
for(let a=0;a<=1;a++)for(let b=0;b<=2;b++){
 const normalized={...data,stocks:[{...stockList[0],qty:a},{...stockList[1],qty:b}]};
 const checked=oracle.solve(normalized,'guillotine',{maxNodes:200000});
 assert.notEqual(checked.status,'unknown');
 if(checked.status==='optimal')possible.push({area:a*10000+b*6000,cost:a*100+b*25});
}
assert.equal(Math.min(...possible.map(p=>p.area)),10000);
assert.equal(Math.min(...possible.map(p=>p.cost)),50);
state.objective='area';
let {init,response}=solve(data,'small','area');
assert.equal(response.status,'optimal');
let adopted=accept(data,init,response);
assert.equal(adopted.proposal.stockArea,10000);
assert.equal(adopted.proposal.cost,100,'minimum area may COST MORE');
assert.equal(adopted.proposal.economyProof.minimumArea,10000);
assert.equal(adopted.proposal.economyProof.minimumCost,null);
assert.equal(adopted.proposal.economyProof.proven,true);
assert.ok(engine.auditCutPlan(adopted.proposal,data).ok);
let forged=JSON.parse(JSON.stringify(response));
forged.groups[0].bestArea=10;
assert.throws(()=>accept(data,init,forged),'false area proof rejected');
forged=JSON.parse(JSON.stringify(response));
forged.groups[0].layout[0].cuts[0].at=999;
assert.throws(()=>accept(data,init,forged),'forged cut tree rejected');
state.objective='cost';
assert.throws(()=>accept(data,init,response),'area proof cannot satisfy cost selection');
({init,response}=solve(data,'large','cost'));
assert.equal(response.status,'optimal');
adopted=accept(data,init,response);
assert.equal(adopted.proposal.cost,50);
assert.equal(adopted.proposal.stockArea,12000,'minimum cost may WASTE MORE');
assert.equal(adopted.proposal.economyProof.minimumCost,50);
assert.equal(adopted.proposal.economyProof.minimumArea,null);
assert.equal(adopted.proposal.economyProof.proven,true);
state.materialMode='auto';
assert.equal(accept(data,init,response).proposal.economyProof.proven,false,
 'one automatic assignment cannot prove all assignments');
assert.equal(accept(data,init,response).proposal.economyProof.conditionalProven,true);
state.materialMode='single';
const unpriced={...data,stocks:[{...stockList[0],price:null},stockList[1]]};
state.objective='area';
({init,response}=solve(unpriced,'small','area'));
adopted=accept(unpriced,init,response);
assert.equal(adopted.proposal.cost,null,'unknown stock price stays unknown');
assert.equal(adopted.proposal.unknownCostBins,1);
assert.equal(adopted.proposal.economyProof.proven,true,'area proof is price independent');
state.objective='cost';
const blocked=solve(unpriced,'small','cost').response;
assert.equal(blocked.status,'partial');
assert.equal(blocked.groups[0].status,'unknown-price');
assert.notEqual(blocked.groups[0].proven,true);
console.log('SELECTED OBJECTIVE PASS: independent oracle, opposite trade-offs, physical tree, tamper, price-unknown and auto proof scope.');
