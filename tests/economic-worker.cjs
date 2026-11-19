/* Independent economic optimization regression.
   Exact references enumerate ALL integer-grid stock combinations and ask a
   separate exhaustive oracle for geometry, not the Worker implementation. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {solve}=require('./optimization-oracle.cjs');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'docs/economic-exact.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'docs/optimization-worker.js'),'utf8');
const guillotine=fs.readFileSync(path.join(root,'docs/guillotine-exact.js'),'utf8');
const ctx={last:null,postMessage(x){this.last=x}};
new Function('self',guillotine)(ctx);
new Function('self',js)(ctx);
new Function('self',worker)(ctx);
function input(def){
 const parts=def.pieces.map(([l,w],i)=>({id:'p'+i,l,w,t:def.t||null,
  material:'MDF',label:'P'+i,rotate:false,order:i}));
 const stocks=def.stocks.map(([l,w,qty,price,isRemnant],i)=>({
  id:'s'+i,l,w,qty,price,t:def.t||null,material:'MDF',
  order:i,isRemnant:!!isRemnant
 }));
 return {parts,stocks,kerf:def.kerf||0,trim:def.trim||0};
}
function workerCost(data,mode,incumbent,priceMode='panel',m3=0,limit=350000){
 ctx.last=null;
 ctx.onmessage({data:{type:'economy',requestId:91,cutMode:mode,data,
  priceMode,m3,incumbentBins:incumbent.map(i=>({
   stockId:'s'+i,material:'MDF'
  })),timeBudgetMs:4500,maxNodes:limit}});
 return ctx.last
}
const ex=[
 {name:'two cheaper small boards',pieces:[[50,100],[50,100]],
  stocks:[[100,100,1,100],[50,100,2,25]],inc:[0],expected:50,boards:2},
 {name:'one cheaper large board',pieces:[[50,100],[50,100]],
  stocks:[[100,100,1,100],[50,100,2,80]],inc:[1,1],expected:100,boards:1},
 {name:'zero incremental price for owned remnant',pieces:[[50,100],[50,100]],
  stocks:[[100,100,1,100],[50,100,2,0,true]],inc:[0],expected:0,boards:2},
 {name:'more boards can be cheaper',pieces:Array.from({length:8},()=>[60,60]),
  stocks:[[200,200,1,100],[60,60,8,1]],inc:[0],expected:8,boards:8}
];
let complete=0,unknown=0,optimal=0,reductions=0;
for(const mode of ['nest','guillotine']){
 for(const entry of ex){
  const data=input(entry),answer=workerCost(data,mode,entry.inc);
  assert.ok(answer&&answer.type==='economy-finished');
  assert.equal(answer.status,'optimal',entry.name+' / '+mode);
  assert.equal(answer.groups[0].bestCost,entry.expected,entry.name+' cost / '+mode);
  assert.equal(answer.groups[0].bestCount,entry.boards,entry.name+' boards / '+mode);
  assert.equal(answer.groups[0].proven,true,entry.name+' certificate / '+mode);
  if(answer.groups[0].layout)assert.equal(
   answer.groups[0].layout.reduce((n,b)=>n+b.pieces.length,0),
   data.parts.length,entry.name+' pieces / '+mode);
  complete++;optimal++;
 }
}
// m³ mode: nominal stock geometry alone is not the price, thickness matters.
// With unspecified piece thickness both stock types are geometrically allowed.
const m3Data=input({pieces:[[50,100],[50,100]],
 stocks:[[100,100,1,0],[50,100,2,0]],t:18});
m3Data.stocks[1].t=24;
for(const mode of ['nest','guillotine']){
 const result=workerCost(m3Data,mode,[1,1],'m3',25000);
 assert.equal(result.status,'optimal','m3 mode must have a cost proof');
 assert.ok(Math.abs(result.groups[0].bestCost-4.5)<1e-9,'m3 optimum includes actual stock thickness');
 assert.equal(result.groups[0].bestCount,1,'m3 lower-cost stock count');
 complete++;optimal++
}
const unknownPrice=input({pieces:[[50,100],[50,100]],
 stocks:[[100,100,1,100],[50,100,2,0]]});
for(const mode of ['nest','guillotine']){
 const result=workerCost(unknownPrice,mode,[0]);
 assert.equal(result.status,'partial','No proof with unpriced stock');
 assert.equal(result.groups[0].status,'unknown-price');
 assert.equal(result.groups[0].proven,false);
 unknown++;
}
function referenceCost(data,mode){
 // Independent oracle searches all bounded stock combinations. A feasible
 // combination's cost is an upper bound; if it uses fewer boards, the exact
 // sub-combination is enumerated too and will supply the true minimum.
 let best=Infinity,incomplete=false;
 function enumerate(i,quantities,cost){
  if(i===data.stocks.length){
   if(!quantities.some(q=>q)||cost>=best)return;
   const stockTypes=data.stocks.map((s,j)=>({...s,qty:quantities[j]}));
   const res=solve({...data,stocks:stockTypes},mode,{maxNodes:1200000});
   if(res.status==='unknown'){incomplete=true;return}
   if(res.status==='optimal')best=Math.min(best,cost);
   return
  }
  for(let n=0;n<=data.stocks[i].qty;n++){
   quantities[i]=n;
   enumerate(i+1,quantities,cost+n*data.stocks[i].price)
  }
 }
 enumerate(0,new Array(data.stocks.length).fill(0),0);
 return incomplete?null:Number.isFinite(best)?best:null
}
let seed=0x419c72;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
const pick=(a,b)=>a+Math.floor(random()*(b-a+1));
for(let i=0;i<13;i++){
 const W=pick(5,8),H=pick(5,8),n=pick(2,4);
 const data=input({pieces:Array.from({length:n},()=>[pick(1,W),pick(1,H)]),
  stocks:[[W,H,n, pick(3,12)],[pick(3,W),pick(3,H),n,pick(1,11)]],
  kerf:pick(0,1)});
 for(const mode of ['nest','guillotine']){
  const ref=referenceCost(data,mode);
  if(ref===null)continue;
  // Establish a valid incumbent as the full-board type repeated once per
  // piece. Some pieces may not fit into the alternative type, but the full
  // stock option is always individually viable.
  const incumbent=new Array(n).fill(0);
  const answer=workerCost(data,mode,incumbent);
  assert.equal(answer.type,'economy-finished');
  if(answer.status==='optimal'){
   assert.equal(answer.groups[0].bestCost,ref,
    'Independent economic optimum mismatch: case '+i+' '+mode);
   optimal++
  }else unknown++;
  complete++
 }
}
// Proof-safety: deliberately interrupted subsearch must not be interpreted
// as no cheaper alternative. The incomplete reference cannot certify cost.
const direct=new Function('self',fs.readFileSync(
 path.join(root,'docs/economic-exact.js'),'utf8')+';return EconomicExact;')({});
const partialData=input({pieces:[[50,100],[50,100]],
 stocks:[[100,100,1,100],[50,100,2,25]]});
const interrupted=direct.solve({
 type:'economy',requestId:70,cutMode:'nest',priceMode:'panel',
 data:partialData,incumbentBins:[{stockId:'s0',material:'MDF'}],
 timeBudgetMs:1000,maxNodes:10000
},()=>({status:'unknown',nodes:10}));
assert.equal(interrupted.status,'partial','Unknown geometry may not prove cost');
assert.equal(interrupted.groups[0].proven,false);
unknown++;
// A truncated candidate enumeration also cannot certify the minimum cost.
const manyParts=Array.from({length:13},(_,i)=>({
 id:'m'+i,l:1,w:1,t:null,material:'MDF',label:'M'+i,rotate:false
}));
const manyStocks=[
 {id:'expensive',l:20,w:20,qty:1,price:2000,t:null,material:'MDF'},
 ...[0,1,2].map(i=>({
  id:'cheap'+i,l:20,w:20,qty:13,price:1,t:null,material:'MDF'
 }))
];
const overScope=direct.solve({
 type:'economy',requestId:71,cutMode:'nest',priceMode:'panel',
 data:{parts:manyParts,stocks:manyStocks,trim:0,kerf:0},
 incumbentBins:[{stockId:'expensive',material:'MDF'}]
},()=>({status:'infeasible',nodes:1}));
assert.equal(overScope.status,'partial','Out-of-scope enumeration cannot certify');
assert.equal(overScope.groups[0].proven,false);
unknown++;

console.log('Economic Worker validation: '+complete+' complete cases, '+
 optimal+' optimum claims checked, '+unknown+
 ' unresolved/price-unknown cases. No false cost optimum in tested problems.');
