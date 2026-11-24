'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const L=require('../../independent-b1/lib.js');const {stripes}=require('../../narrow-scrap-verifier.cjs');
const variants=['false','missing','undefined'];const results=[];
function dataFor(v){const {data}=stripes();data.stocks[0].qty=2;delete data.allowNarrowScrapCuts;if(v==='false')data.allowNarrowScrapCuts=false;if(v==='undefined')data.allowNarrowScrapCuts=undefined;return data;}
function stable(x){return JSON.parse(JSON.stringify(x,(k,v)=>['elapsedMs','offcutElapsedMs'].includes(k)?undefined:v));}
for(const v of variants){
 const data=dataFor(v);
 // Even stale TRUE UI state must not silently enable an omitted API field.
 const {engine}=L.loadEngine({allowNarrowScrapCuts:true});
 const plan=engine.optimize(data,true,false,'minimum');assert.equal(plan.bins.length,2);assert(L.verifyPlan(data,plan).ok);
 const snapshot={bins:plan.bins,unplaced:plan.unplaced,cost:plan.cost,stockArea:plan.stockArea};
 const bound=engine.certifyStockCount(plan,data,engine.auditCutPlan(plan,data));
 const workerResults={};
 for(const type of ['solve','economy','construct']){
  const w=L.loadWorker(type==='construct'?'constructive-worker.js':'optimization-worker.js');
  w.onmessage({data:{type,requestId:1,mode:'guillotine',cutMode:'guillotine',objective:'area',priceMode:'panel',data:structuredClone(data),incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),bounds:bound.details,timeBudgetMs:3000,maxNodes:300000}});
  workerResults[type]=stable(w.result);
 }
 results.push(stable({snapshot,workerResults}));
}
assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);
assert.equal(L.mkData([],[],4,0).allowNarrowScrapCuts,false,'test generator defaults off');
const html=fs.readFileSync(path.join(__dirname,'../../../docs/index.html'),'utf8');
assert(html.includes('allowNarrowScrapCuts:false'));
assert.equal((html.match(/planSnapshot:\{kerf:val\(state.kerf\),trim:val\(state.trim\),allowNarrowScrapCuts:state.allowNarrowScrapCuts===true/g)||[]).length,2,'both snapshot builders normalize to false');
console.log('Default OFF: false / missing / undefined produce identical cut plans and solve/economy/construct responses (elapsed clocks excluded); stale state true cannot enable API; test fixtures and snapshots default false.');
