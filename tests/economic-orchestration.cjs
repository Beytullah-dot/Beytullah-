/* Lifecycle regression for sequential stock-count / cost background jobs.
 * Uses actual UI orchestrator source with a fake Worker and tiny DOM controls. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8');
const begin=html.indexOf('let exactWorker=null');
const end=html.indexOf('let autoPlanCache=null;',begin);
assert.ok(begin>0&&end>begin,'Worker UI orchestrator found');
const source=html.slice(begin,end);
function makeHarness({proved=false}={}){
 const controls=new Map(),instances=[];
 const mk=()=>({classList:{add(){},remove(){},toggle(){}},
  dataset:{},textContent:'',onclick:null});
 const byId=id=>{
  if(!controls.has(id))controls.set(id,mk());
  return controls.get(id)
 };
 class FakeWorker{
  constructor(){this.terminated=false;this.job=null;instances.push(this)}
  postMessage(data){this.job=data}
  terminate(){this.terminated=true}
 }
 const state={mode:'nest',priceMode:'panel',offcutValuePerM2:''};
 const parts=[0,1].map(i=>({
  id:'p'+i,l:50,w:100,rotate:false,t:null,material:'MDF'
 }));
 const stocks=[
  {id:'a',l:100,w:100,t:null,qty:1,material:'MDF',price:10},
  {id:'b',l:50,w:100,t:null,qty:2,material:'MDF',price:2}
 ];
 const data={parts,stocks,trim:0,kerf:0,m3:1};
 const initial={bins:[{stock:stocks[0]},{stock:stocks[1]}],
  unplaced:[],stockProof:{proven:proved,details:[{
   material:'mdf',lowerBound:1
  }]},cost:12,economyProof:null};
 const api=new Function('byId','window','Worker','state','solution','dirty','mkey',
  'money','console',source+
  ';return {startExactWorker,cancelExactSearch,cancelEconomySearch};')(
  byId,{addEventListener(){}},FakeWorker,state,initial,false,
  x=>String(x).toLowerCase(),x=>String(x),console
 );
 return {api,initial,data,instances,controls,byId}
}
const proven=makeHarness({proved:true});
proven.api.startExactWorker(proven.data,proven.initial);
assert.equal(proven.instances.length,1,'Known panel optimum should start only economic job');
assert.equal(proven.instances[0].job.type,'economy');
proven.api.cancelEconomySearch(true);
const unproven=makeHarness({proved:false});
unproven.api.startExactWorker(unproven.data,unproven.initial);
assert.equal(unproven.instances.length,1,'Start count job first');
assert.equal(unproven.instances[0].job.type,'solve');
assert.ok(unproven.byId('economySearchText').textContent.includes('sonra'),
 'Economic status should indicate it is queued');
unproven.instances[0].onerror(new Error('synthetic failure'));
assert.equal(unproven.instances.length,2,'Economic Worker starts after count job fails');
assert.equal(unproven.instances[1].job.type,'economy');
unproven.api.cancelEconomySearch(true);
const cancelled=makeHarness({proved:false});
cancelled.api.startExactWorker(cancelled.data,cancelled.initial);
assert.equal(cancelled.instances.length,1);
cancelled.byId('exactSearchCancel').onclick();
assert.equal(cancelled.instances[0].terminated,true,'Cancel terminates count Worker');
assert.equal(cancelled.instances.length,1,'User cancellation must not start economic Worker');
console.log('Sequential Worker lifecycle: known optimum starts economy; otherwise count first, '+
 'then economy; user cancel stops both.');
