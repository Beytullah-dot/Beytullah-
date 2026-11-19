/* Background exact Web Worker regression; uses its actual source in a fake
 * Worker context and compares claims with the independent integer oracle. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {solve,audit}=require('./optimization-oracle.cjs');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'docs/index.html'),'utf8');
const workerScript=fs.readFileSync(path.join(ROOT,'docs/optimization-worker.js'),'utf8');
const first=html.indexOf('function intersect('),last=html.indexOf('const colors=',first);
assert.ok(first>=0&&last>first);
const state={mode:'nest',kerf:'0',offcutMinEdgeMm:50,offcutMinAreaCm2:100,priceMode:'panel'};
const engine=new Function('state','val','mkey','fmt',html.slice(first,last)+
 ';return {optimize,auditCutPlan,certifyStockCount};')(
 state,v=>Number(String(v).replace(',','.')),
 v=>String(v).trim().toLocaleLowerCase('tr-TR'),(v,n)=>Number(v).toFixed(n??0)
);
const ctx={onmessage:null,last:null,postMessage(message){this.last=message}};
new Function('self',workerScript)(ctx);
const tests=[
 {name:'cost-versus-count',parts:[[50,100],[50,100]],stocks:[
  [100,100,1,100],[50,100,2,25]],kerf:0,expectImprovement:true},
 {name:'3 large squares',parts:[[60,60],[60,60],[60,60]],stocks:[[100,100,4,10]],kerf:0},
 {name:'4 quarter panels',parts:[[50,50],[50,50],[50,50],[50,50]],stocks:[[100,100,4,10]],kerf:0},
 {name:'4 quarter panels with kerf',parts:[[50,50],[50,50],[50,50],[50,50]],stocks:[[100,100,4,10]],kerf:2},
 {name:'two materials',parts:[[60,60,1,'A'],[60,60,1,'A'],[50,50,1,'B']],stocks:[
  [100,100,3,10,'A'],[100,100,3,10,'B']],kerf:0}
];
let seed=0x42bd67;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
function between(a,b){return a+Math.floor(random()*(b-a+1))}
for(let i=0;i<24;i++){
 const W=between(5,9),H=between(5,9),n=between(2,5);
 tests.push({name:'random-'+i,parts:Array.from({length:n},()=>[
  between(1,W),between(1,H),random()>.5?1:0]),
  stocks:[[W,H,n+2,10]],kerf:between(0,1),trim:between(0,1)})
}
let checks=0,verified=0,improvements=0,skipped=0;
for(let index=0;index<tests.length;index++){
 const t=tests[index];
 const data={parts:t.parts.map((p,i)=>({
  id:'p'+i,l:p[0],w:p[1],t:null,material:p[3]||'MDF',
  rotate:p[2]===undefined?true:!!p[2],label:'P'+i,order:i
 })),stocks:t.stocks.map((s,i)=>({
  id:'s'+i,l:s[0],w:s[1],t:null,material:s[4]||'MDF',qty:s[2],
  price:s[3],order:i
 })),kerf:t.kerf||0,trim:t.trim||0,m3:1};
 state.kerf=String(data.kerf);
 const initial=engine.optimize(data,true,false);
 const checked=engine.auditCutPlan(initial,data);
 assert.ok(checked.ok,t.name+' initial geometry');
 if(initial.unplaced.length){skipped++;continue}
 const bound=engine.certifyStockCount(initial,data,checked);
 ctx.last=null;
 ctx.onmessage({data:{type:'solve',requestId:index,mode:'nest',
  data,incumbentBins:initial.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
  bounds:bound.details,timeBudgetMs:1500,maxNodes:150000}});
 const message=ctx.last;
 assert.ok(message&&message.type==='finished',t.name+' worker result');
 assert.equal(message.requestId,index);
 const byStock=new Map(data.stocks.map(s=>[s.id,s]));
 const bins=[];
 for(const group of message.groups){
  if(group.status==='improved'){
   for(const layout of group.layout){
    const original=byStock.get(layout.stock.id);
    assert.ok(original,t.name+' known stock');
    bins.push({stock:original,placed:layout.pieces,free:[],cuts:[]})
   }
  }else bins.push(...initial.bins.filter(b=>b.stock.material.toLowerCase()===group.material))
 }
 const combined={...initial,bins,unplaced:[],placedCount:data.parts.length,
  stockArea:bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0),
  partArea:bins.reduce((sum,b)=>sum+b.placed.reduce((a,p)=>a+p.w*p.h,0),0)};
 assert.ok(engine.auditCutPlan(combined,data).ok,t.name+' merged geometry');
 assert.ok(audit(data,combined,'nest').ok,t.name+' independent audit');
 assert.ok(bins.length<=initial.bins.length,t.name+' cannot use more boards');
 const oracle=solve(data,'nest',{maxNodes:1200000});
 if(oracle.status==='optimal'){
  assert.ok(bins.length>=oracle.minimumBoards,t.name+' cannot beat exhaustive oracle');
  if(message.status==='optimal')assert.equal(bins.length,oracle.minimumBoards,t.name+' proof must match oracle');
 }
 if(t.expectImprovement){
  assert.equal(message.status,'optimal');
  assert.equal(initial.bins.length,2);
  assert.equal(bins.length,1);
  assert.equal(combined.bins[0].stock.id,'s0');
 }
 if(bins.length<initial.bins.length)improvements++;
 verified++;checks++
}
ctx.last=null;ctx.onmessage({data:{type:'solve',requestId:99,mode:'guillotine',data:{
 parts:[],stocks:[],kerf:0,trim:0},incumbentBins:[],bounds:[]}});
assert.equal(ctx.last.status,'skipped','guillotine must not claim free-layout proof');
checks++;
console.log('Web Worker proofs validated: '+verified+' complete problems, '+
 improvements+' count reductions, '+skipped+' unfinished inputs, '+
 checks+' checks. No false proof or invalid geometry.');
