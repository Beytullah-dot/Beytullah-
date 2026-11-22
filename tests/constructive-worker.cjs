/* Live constructive Worker/acceptance: physical audit and no-proof contract. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),docs=path.join(root,'docs');
const source=p=>fs.readFileSync(path.join(docs,p),'utf8');
const html=source('index.html'),workerText=source('constructive-worker.js');
assert.match(html,/startConstructiveWorker\(data,sol\)/);
assert.match(html,/function changed\(\)\{cancelConstructiveSearch\(true\)/);
assert.match(html,/function showEmpty\(\)\{cancelConstructiveSearch\(true\)/);
assert.match(html,/pagehide.*cancelConstructiveSearch/);
assert.match(html,/startConstructiveWorker\(item.data,item.plan\)/);
assert.match(html,/autoPlanCache\[chosen\]=\{data,plan\}/);
const scope={last:null,postMessage(message){this.last=message}};
let sandbox;
sandbox=vm.createContext({self:scope,window:scope,console,
 importScripts(...paths){for(const file of paths){
  assert(!file.includes('..'),'no traversal in worker imports');
  vm.runInContext(source(file.replace(/^\.\//,'')),sandbox,{filename:file});
 }}});
vm.runInContext(workerText,sandbox,{filename:'constructive-worker.js'});
const engine=require('./engine-harness.cjs').createEngine(
 {mode:'guillotine',priceMode:'panel',objective:'cost'},
 Number,v=>String(v||'').toLocaleLowerCase('tr-TR'),Number);
const independent=require('./optimization-oracle.cjs');
const widths=[8,14,10,12,9,13,7,15];
const material='panel|constructive-worker';
function job(){
 const common={category:'panel',material,t:18,grain:'length',rotate:false};
 return {parts:widths.map((l,i)=>({...common,id:'p'+i,label:'P'+i,l,w:16})),
  stocks:[[52,36,100],[54,38,114],[56,40,129],[60,42,157]]
   .map(([l,w,price],i)=>({...common,id:'s'+i,l,w,price,priceUnit:'panel',qty:1})),
  kerf:2,trim:1,m3:null};
}
function send(id,data,objective='cost',mode='guillotine'){
 scope.last=null;
 scope.onmessage({data:{type:'construct',requestId:id,mode,objective,
  priceMode:'panel',m3:null,data}});
 assert.equal(scope.last?.type,'construct-finished');
 assert.equal(scope.last.requestId,id);
 assert.equal(scope.last.proof,'none');
 assert.equal(scope.last.researchOnly,true);
 return scope.last
}
const state={mode:'guillotine',materialMode:'single',priceMode:'panel',objective:'cost'};
const autoPlanCache={selected:'economic',economic:null,area:null,minimum:null};
const a=html.indexOf('function acceptConstructiveWorkerResult('),
 b=html.indexOf('function startConstructiveWorker(',a);
assert(a>0&&b>a,'real production candidate acceptance extracted');
const accept=new Function('state','auditCutPlan','binCost','autoPlanCache',
 html.slice(a,b)+';return acceptConstructiveWorkerResult;')(
 state,engine.auditCutPlan,engine.binCost,autoPlanCache);
const data=job(),snapshot=JSON.stringify(data),got=send(1,data);
assert.equal(JSON.stringify(data),snapshot,'worker must not modify user inputs');
assert.equal(got.status,'feasible-uncertified','known physical constructive witness');
assert(got.plan?.bins.length);
assert.equal(got.plan.unplaced.length,0);
assert.equal(engine.auditCutPlan(got.plan,data).ok,true);
assert.equal(independent.audit(data,got.plan,'guillotine').ok,true);
const incomplete={bins:[],unplaced:[data.parts[0]],search:{baselineStockCount:0}};
const candidate=accept(data,incomplete,got);
assert.equal(candidate.search.constructive,'feasible-uncertified');
assert.equal(candidate.exact,null);
assert.equal(candidate.economyProof,null);
assert.equal(candidate.globalCostProof,null);
assert.equal(candidate.unplaced.length,0);
assert.equal(engine.auditCutPlan(candidate,data).ok,true);
function rejected(response,msg){
 assert.throws(()=>accept(data,incomplete,response),msg)
}
rejected({...got,proof:'optimal'},'fake proof label');
rejected({...got,status:'unknown-limit'},'UNKNOWN cannot become plan');
rejected({...got,researchOnly:false},'worker scope');
const tampered=JSON.parse(JSON.stringify(got));
tampered.plan.bins[0].cuts[0].at+=7;
rejected(tampered,'invalid line rejected independently');
const incompletePlan=JSON.parse(JSON.stringify(got));
incompletePlan.plan.bins[0].placed.pop();
rejected(incompletePlan,'silent missing piece rejected');
const wrongStock=JSON.parse(JSON.stringify(got));
wrongStock.plan.bins[0].stock.id='nonexistent';
rejected(wrongStock,'stock not in selected catalog');
const fakePrice=JSON.parse(JSON.stringify(got));
fakePrice.plan.cost=0;
rejected(fakePrice,'cost forgery rejected');
assert.throws(()=>accept(data,{...incomplete,unplaced:[]},got),
 'a complete baseline must not be replaced without objective comparison');
state.materialMode='auto';
rejected(got,'auto material assignment must not be bypassed without matching selection');
autoPlanCache.economic={data,plan:incomplete};
assert.equal(accept(data,incomplete,got).unplaced.length,0,
 'selected automatic assignment can be physically rescued');
autoPlanCache.selected='area';
rejected(got,'switched automatic objective rejects stale candidate');
autoPlanCache.selected='economic';
autoPlanCache.economic={data:{...data},plan:incomplete};
rejected(got,'new assignment data snapshot rejects stale candidate');
autoPlanCache.economic={data,plan:{...incomplete}};
rejected(got,'new assignment plan snapshot rejects stale candidate');
autoPlanCache.economic={data,plan:incomplete};
state.objective='area';
rejected(got,'changed objective rejects stale candidate');
state.objective='cost';
state.materialMode='single';
assert.equal(send(2,data,'cost','nest').status,'unknown-class');
const forbidden=job();forbidden.parts[0].grain='width';
assert.equal(send(3,forbidden).status,'unknown-class');
const removed=job();removed.stocks=removed.stocks.map(s=>({...s,qty:0}));
assert.equal(send(4,removed).status,'unknown-no-candidate');
const unpriced=job();unpriced.stocks=unpriced.stocks.map(s=>({...s,price:null}));
assert.equal(send(5,unpriced).status,'unknown-price');
const area=send(6,unpriced,'area');
if(area.status==='feasible-uncertified'){
 assert.equal(area.plan.cost,null);
 assert.equal(accept(unpriced,incomplete,area).cost,null,'unknown cost is never zero');
 assert.equal(independent.audit(unpriced,area.plan,'guillotine').ok,true);
}
const fractional=job();fractional.parts[0].l=8.1234567;
assert.equal(send(7,fractional).status,'unknown-precision');
console.log('CONSTRUCTIVE-WORKER PASS: real Worker, independent oracle, strict acceptance, forged cuts/price/proof rejection, class/UNKNOWN, no inventory writes.');
