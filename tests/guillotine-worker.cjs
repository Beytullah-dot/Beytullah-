/* Bounded physical guillotine Worker vs independent exact oracle.
 * Fails on false optimum proofs, malformed cuts and stock violations.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {solve,audit}=require('./optimization-oracle.cjs');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const workerJS=fs.readFileSync(path.join(root,'docs/optimization-worker.js'),'utf8');
const guillotineJS=fs.readFileSync(path.join(root,'docs/guillotine-exact.js'),'utf8');
const {createEngine}=require('./engine-harness.cjs');
const state={mode:'guillotine',kerf:'0',offcutMinEdgeMm:50,
 offcutMinAreaCm2:100,priceMode:'panel'};
const mkey=x=>String(x).trim().toLocaleLowerCase('tr-TR');
const val=x=>Number(String(x).replace(',','.'));
const api=createEngine(state,val,mkey,(x,n)=>Number(x).toFixed(n??0));
const acceptStart=html.indexOf('function acceptExactWorkerResult(');
const acceptEnd=html.indexOf('function startExactWorker(',acceptStart);
assert.ok(acceptStart>=0&&acceptEnd>acceptStart,'Main-thread Worker handler missing');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey',
 html.slice(acceptStart,acceptEnd)+';return acceptExactWorkerResult;')(
 state,api.mkBin,api.binCost,api.auditCutPlan,mkey
);
const context={last:null,postMessage(msg){this.last=msg}};
new Function('self',guillotineJS)(context);
new Function('self',workerJS)(context);
const fixtures=[
 {name:'cost-vs-stock-count',parts:[[50,100],[50,100]],
  stocks:[[100,100,1,100],[50,100,2,25]],kerf:0,expected:1,improve:true},
 {name:'four exact quarters',parts:[[50,50],[50,50],[50,50],[50,50]],
  stocks:[[100,100,5,10]],kerf:0,expected:1},
 {name:'four quarters with 2mm kerf',parts:[[50,50],[50,50],[50,50],[50,50]],
  stocks:[[100,100,5,10]],kerf:2,expected:4},
 {name:'three large squares',parts:[[60,60],[60,60],[60,60]],
  stocks:[[100,100,4,10]],kerf:0,expected:3},
 {name:'rotation and full cuts',parts:[[6,2],[6,3]],
  stocks:[[5,6,4,10]],kerf:0,expected:1},
 {name:'edge trim with kerf',parts:[[4,4],[4,4]],
  stocks:[[10,10,4,10]],kerf:1,trim:1,expected:2}
];
let seed=0x1022026;
function rand(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}
function pick(lo,hi){return lo+Math.floor(rand()*(hi-lo+1))}
for(let i=0;i<22;i++){
 const W=pick(5,8),H=pick(5,8),n=pick(2,4);
 fixtures.push({name:'random-'+i,kerf:pick(0,1),trim:pick(0,1),
  parts:Array.from({length:n},()=>[pick(1,W),pick(1,H),pick(0,1)]),
  stocks:[[W,H,n+1,10]]})
}
let feasibleCases=0,infeasibleCases=0,proven=0,improvements=0,unknown=0,checks=0;
let preAudited=0;
for(let index=0;index<fixtures.length;index++){
 const input=fixtures[index],data={
  parts:input.parts.map((p,i)=>({id:'p'+i,l:p[0],w:p[1],rotate:p[2]===undefined?true:!!p[2],
   material:'MDF',t:null,label:'P'+i,order:i})),
  stocks:input.stocks.map((s,i)=>({id:'s'+i,l:s[0],w:s[1],qty:s[2],price:s[3],
   material:'MDF',t:null,order:i})),
  kerf:input.kerf||0,trim:input.trim||0,m3:1
 };
 state.kerf=String(data.kerf);
 const reference=solve(data,'guillotine',{maxNodes:4500000});
 assert.notEqual(reference.status,'unknown',input.name+' reference oracle must complete');
 if(input.expected!==undefined)assert.equal(reference.minimumBoards,input.expected,input.name+' fixture optimum');
 const first=api.optimize(data,true,false);
 const pre=api.auditCutPlan(first,data);
 assert.ok(pre.ok,input.name+' original cut tree must be valid');
 preAudited++;
 const complete=first.unplaced.length===0&&first.placedCount===data.parts.length;
 if(reference.status==='infeasible'){
  assert.equal(complete,false,input.name+' cannot pack infeasible input');
  infeasibleCases++;continue
 }
 feasibleCases++;
 if(!complete){unknown++;continue}
 const proof=api.certifyStockCount(first,data,pre);
 context.last=null;
 context.onmessage({data:{type:'solve',requestId:index,mode:'guillotine',data,
  incumbentBins:first.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
  bounds:proof.details,timeBudgetMs:2300,maxNodes:400000}});
 const response=context.last;
 assert.ok(response&&response.type==='finished',input.name+' worker must finish');
 assert.equal(response.requestId,index);
 assert.equal(response.groups.length,1);
 const group=response.groups[0];
 let bins=first.bins;
 if(group.status==='improved'){
  assert.ok(Array.isArray(group.layout));
  bins=group.layout.map(x=>({stock:x.stock,placed:x.pieces,free:x.free,cuts:x.cuts}));
  assert.ok(bins.every(x=>Array.isArray(x.cuts)&&Array.isArray(x.free)));
 }
 const merged={...first,bins,placedCount:data.parts.length,unplaced:[],
  stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  partArea:bins.reduce((n,b)=>n+b.placed.reduce((v,p)=>v+p.w*p.h,0),0)};
 const checked=api.auditCutPlan(merged,data);
 assert.ok(checked.ok,input.name+' resulting cut tree: '+checked.issues.join(','));
 const independent=audit(data,merged,'guillotine');
 assert.ok(independent.ok,input.name+' independently replayed cut tree: '+independent.issues.join(','));
 assert.ok(bins.length<=first.bins.length,input.name+' never increase stock count');
 assert.ok(bins.length>=reference.minimumBoards,input.name+' cannot beat exhaustive reference');
 if(response.status==='optimal'){
  assert.equal(bins.length,reference.minimumBoards,input.name+' claimed optimum must match oracle');
  assert.ok(response.groups.every(x=>x.proven),input.name+' all groups proven');
  proven++
 }else unknown++;
 if(bins.length<first.bins.length)improvements++;
 if(input.improve){
  assert.equal(first.bins.length,2);
  assert.equal(bins.length,1);
  assert.ok(bins[0].cuts.length>0);
  assert.equal(response.status,'optimal');
  // Integration: the actual main-thread acceptance function must preserve
  // cut steps, offcuts and a correct optimum certificate.
  const accepted=accept(data,first,response);
  assert.equal(accepted.improvedCount,1);
  assert.ok(accepted.proposal.bins[0].cuts.length>0);
  assert.ok(api.auditCutPlan(accepted.proposal,data).ok);
  assert.equal(api.certifyStockCount(accepted.proposal,data,
    api.auditCutPlan(accepted.proposal,data)).proven,true);
  // A forged cut step is rejected, not silently applied.
  const forged=JSON.parse(JSON.stringify(response));
  forged.groups[0].layout[0].cuts[0].at+=100;
  assert.throws(()=>accept(data,first,forged),
   'Main-thread validation must reject a forged cut');
 }
 checks++
}
// Larger certified instances exceed the original 8-part exact search scope.
// No numerical oracle needed: 40mm squares cannot exceed a 2x2 arrangement
// inside a 100mm board. The Worker must independently exclude two boards.
let largeProofs=0;
for(const n of [9,10,11]){
 const data={parts:Array.from({length:n},(_,i)=>({
  id:'large-'+i,l:40,w:40,t:null,material:'MDF',rotate:false,
  label:'L'+i,order:i
 })),stocks:[{id:'largeStock',l:100,w:100,t:null,material:'MDF',
  price:10,qty:20,order:0}],kerf:0,trim:0,m3:1};
 const initial=api.optimize(data,true,false);
 assert.ok(api.auditCutPlan(initial,data).ok,'Large analytical plan must be valid');
 assert.equal(initial.bins.length,3,'9-11 squares require 3 boards');
 const cert=api.certifyStockCount(initial,data,api.auditCutPlan(initial,data));
 assert.equal(cert.lowerBound,2,'Area lower bound should not prove 3');
 assert.equal(cert.proven,false,'Fast phase should not prove the large instance');
 context.last=null;
 context.onmessage({data:{type:'solve',requestId:100+n,mode:'guillotine',data,
  incumbentBins:initial.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
  bounds:cert.details,timeBudgetMs:3500,maxNodes:250000}});
 assert.equal(context.last.status,'optimal','Large exact guillotine search must prove minimum');
 assert.equal(context.last.groups[0].status,'proved');
 assert.equal(context.last.groups[0].checked[0].boards,2);
 assert.equal(context.last.groups[0].checked[0].status,'infeasible');
 largeProofs++;
}

// A time/node budget never turns an unfinished search into a proof.
const capped=context.GuillotineExact.feasible(
 Array.from({length:4},(_,i)=>({
  id:'cap'+i,l:50,w:50,t:null,material:'MDF',label:'Cap'+i,rotate:true
 })),
 [{id:'cap-stock',l:100,w:100,t:null,material:'MDF',qty:4}],
 1,{kerf:0,trim:0},Date.now()+5000,1
);
assert.equal(capped.status,'unknown','Interrupted search must be unknown');
// A relaxed pattern whose last strip is thinner than the blade must never
// be advertised as a physically feasible or mathematically impossible cut.
const sliver=context.GuillotineExact.feasible(
 [{id:'sliver',l:50,w:99,t:null,material:'MDF',rotate:false,label:'Sliver'}],
 [{id:'stock',l:50,w:100,t:null,material:'MDF',qty:1}],
 1,{kerf:2,trim:0},Date.now()+5000,50000
);
assert.equal(sliver.status,'unknown','Uncuttable residual is not a proof');

assert.ok(improvements>=1,'Must demonstrate at least one guillotine stock saving');
console.log('Exact guillotine validation: '+fixtures.length+' reference scenarios + '+largeProofs+' larger analytical proofs; '+
 feasibleCases+' feasible, '+infeasibleCases+' infeasible, '+
 preAudited+' original plans audited, '+checks+' worker layouts audited, '+
 proven+' optimum claims checked, '+improvements+' improvements, '+
 unknown+' unresolved. No invalid cut tree or false proof.');
