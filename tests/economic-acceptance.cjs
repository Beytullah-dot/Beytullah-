/* Main-thread economic candidate validation: authentic Worker response,
 * independent geometry audit, tampering rejection, and proof separation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const workerJS=fs.readFileSync(path.join(root,'docs/optimization-worker.js'),'utf8');
const economyJS=fs.readFileSync(path.join(root,'docs/economic-exact.js'),'utf8');
const guillotineJS=fs.readFileSync(path.join(root,'docs/guillotine-exact.js'),'utf8');
const first=html.indexOf('function intersect('),last=html.indexOf('const colors=',first);
const state={mode:'nest',kerf:'0',offcutMinEdgeMm:10,offcutMinAreaCm2:0,priceMode:'panel'};
const mkey=x=>String(x||'').trim().toLocaleLowerCase('tr-TR');
const engine=new Function('state','val','mkey','fmt',html.slice(first,last)+
 ';return {mkBin,binCost,auditCutPlan,collectOffcuts,certifyStockCount};')(
 state,x=>Number(x),mkey,(x,d)=>Number(x).toFixed(d??0));
const a=html.indexOf('function acceptEconomyWorkerResult(');
const b=html.indexOf('function startEconomyWorker(',a);
assert.ok(a>0&&b>a,'Economic acceptance hook must be present');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey','collectOffcuts',
 html.slice(a,b)+';return acceptEconomyWorkerResult;')(
 state,engine.mkBin,engine.binCost,engine.auditCutPlan,mkey,engine.collectOffcuts);
const ctx={last:null,postMessage(x){this.last=x}};
new Function('self',guillotineJS)(ctx);
new Function('self',economyJS)(ctx);
new Function('self',workerJS)(ctx);
const parts=[0,1].map(i=>({
 id:'p'+i,l:50,w:100,t:null,material:'MDF',label:'P'+i,
 rotate:false,order:i
}));
const stocks=[
 {id:'large',l:100,w:100,t:null,material:'MDF',qty:1,price:100,order:0},
 {id:'small',l:50,w:100,t:null,material:'MDF',qty:2,price:25,order:1}
];
const data={parts,stocks,kerf:0,trim:0,m3:1};
const initialCuts=[{
 axis:'vertical',at:50,source:{x:0,y:0,w:100,h:100},
 x1:50,x2:50,y1:0,y2:100,number:1,label:'P0'
}];
let checks=0;
for(const mode of ['nest','guillotine']){
 state.mode=mode;
 const initial={bins:[{
  stock:stocks[0],placed:parts.map((p,i)=>({
   ...p,x:i*50,y:0,w:50,h:100,rotated:false
  })),cuts:mode==='guillotine'?initialCuts:[],free:[]
 }],unplaced:[],placedCount:2,partArea:10000,stockArea:10000,
 cost:100,unknownCostBins:0,search:{savedStockCount:0}};
 assert.ok(engine.auditCutPlan(initial,data).ok,'original '+mode);
 ctx.last=null;
 ctx.onmessage({data:{
  type:'economy',requestId:50,cutMode:mode,priceMode:'panel',m3:0,data,
  incumbentBins:[{stockId:'large',material:'MDF'}],
  timeBudgetMs:2500,maxNodes:150000
 }});
 const response=ctx.last;
 assert.equal(response.type,'economy-finished');
 assert.equal(response.status,'optimal');
 const outcome=accept(data,initial,response);
 assert.ok(outcome.improved,'candidate reduces monetary cost');
 assert.equal(outcome.proposal.cost,50);
 assert.equal(outcome.proposal.bins.length,2,'more panels but cheaper');
 assert.equal(outcome.boardDelta,1);
 assert.equal(outcome.proposal.economyProof.proven,true);
 assert.equal(outcome.proposal.exact.proof,false,'cost proof must NOT claim minimum panels');
 assert.ok(engine.auditCutPlan(outcome.proposal,data).ok,'candidate geometry and cut tree');
 const forged=JSON.parse(JSON.stringify(response));
 forged.groups[0].layout[0].pieces[0].x=9999;
 assert.throws(()=>accept(data,initial,forged),'invalid coordinates rejected');
 const falsePrice=JSON.parse(JSON.stringify(response));
 falsePrice.groups[0].bestCost=0;
 assert.throws(()=>accept(data,initial,falsePrice),'false price certificates rejected');
 if(mode==='guillotine'){
  const cutTamper=JSON.parse(JSON.stringify(response));
  // This candidate has no cuts: use the large-board-cost alternative instead
  // in a separate source to exercise physical cut replay.
  const otherStock={...stocks[0],price:20};
  const otherData={...data,stocks:[otherStock,{...stocks[1],price:80}]};
  const otherInitial={...initial,bins:[
   {stock:otherData.stocks[1],placed:[{...parts[0],x:0,y:0,w:50,h:100,rotated:false}],free:[],cuts:[]},
   {stock:otherData.stocks[1],placed:[{...parts[1],x:0,y:0,w:50,h:100,rotated:false}],free:[],cuts:[]}
  ],stockArea:10000,cost:160};
  ctx.last=null;
  ctx.onmessage({data:{type:'economy',requestId:51,cutMode:'guillotine',
   priceMode:'panel',data:otherData,incumbentBins:[
    {stockId:'small',material:'MDF'},{stockId:'small',material:'MDF'}
   ],timeBudgetMs:2500,maxNodes:150000}});
  const response2=ctx.last;
  assert.equal(response2.status,'optimal');
  const accepted=accept(otherData,otherInitial,response2);
  assert.equal(accepted.proposal.bins[0].cuts.length,1);
  const bad=JSON.parse(JSON.stringify(response2));
  bad.groups[0].layout[0].cuts[0].at=999;
  assert.throws(()=>accept(otherData,otherInitial,bad),'cut tree tamper rejected');
 }
 checks++;
}
console.log('Economic plan acceptance: '+checks+
 ' cut modes passed; forged coordinates, prices and cuts rejected.');
