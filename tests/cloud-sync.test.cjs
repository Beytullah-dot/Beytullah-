// Cloud client contract tests. No real Supabase project is provisioned by CI.
// A deterministic two-device server mock checks auth, optimistic versioning,
// serialization expectations and local/cloud inventory isolation.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const cloudSource=fs.readFileSync(path.join(__dirname,'../docs/cloud-inventory.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../docs/index.html'),'utf8');
const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261118_000001_cloud_inventory.sql'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../docs/sw.js'),'utf8');
let checks=0;
for(const re of [
 /create table if not exists public\.beythaus_workspaces/,
 /create table if not exists public\.beythaus_members/,
 /create table if not exists public\.beythaus_stock/,
 /create table if not exists public\.beythaus_operations/,
 /create table if not exists public\.beythaus_events/,
 /enable row level security/g,
 /security definer set search_path=''/g,
 /for update/gi,
 /v_old\.version<>v_expected/,
 /v_expected is null/,
 /grant execute on function public\.beythaus_cloud_mutate.*authenticated/i,
 /revoke all on public\.beythaus_workspaces/,
 /create or replace function public\.beythaus_cloud_join/,
 /create or replace function public\.beythaus_cloud_snapshot/,
 /create or replace function public\.beythaus_cloud_mutate/
]){
 assert.match(migration,re);checks++;
}
assert.ok(html.includes('id="cloudSettingsRoot"'));
assert.ok(html.includes('src="./cloud-inventory.js"'));
assert.ok(html.includes('href="./cloud-inventory.css"'));
assert.ok(sw.includes('./cloud-inventory.js')&&sw.includes('./cloud-inventory.css'));
checks+=4;
const clone=x=>JSON.parse(JSON.stringify(x));
const server={items:[
 {id:'R-shared-1',l:150,w:90,t:18,material:'Wood',location:'Raf A',
 notes:'',status:'available',version:1,sourceKey:'existing:1',projectName:'Başlangıç',
 createdAt:1700000000000,updatedAt:1700000000000,usedAt:null}
],movements:[],workspace:{id:'w1',name:'Beythaus Atölye',defaultLocation:'Raf A'},
 operations:new Map(),failNext:false};
let totalRequests=0,idCounter=0;
function fakeFetch(url,options){
 totalRequests++;
 const ending=new URL(url).pathname,request=options.body?JSON.parse(options.body):{};
 const okay=data=>({ok:true,status:200,json:async()=>clone(data)});
 const fail=(status,msg)=>({ok:false,status,json:async()=>({message:msg})});
 if(ending==='/auth/v1/token')return Promise.resolve(okay({
   access_token:'signed-in-token',refresh_token:'refresh-token',expires_in:3600}));
 if(ending==='/auth/v1/signup')return Promise.resolve(okay({user:{id:'test-user'}}));
 if(ending==='/auth/v1/logout')return Promise.resolve(okay({}));
 if(!options.headers.Authorization?.startsWith('Bearer '))return Promise.resolve(fail(401,'Login required'));
 if(ending.endsWith('/beythaus_cloud_workspaces'))return Promise.resolve(okay([
  {id:'w1',name:'Beythaus Atölye',role:'owner'}]));
 if(ending.endsWith('/beythaus_cloud_snapshot')){
  if(request.p_workspace!=='w1')return Promise.resolve(fail(403,'No membership'));
  return Promise.resolve(okay({workspace:server.workspace,pieces:server.items,
   batches:[],movements:server.movements}));
 }
 if(ending.endsWith('/beythaus_cloud_mutate')){
  if(request.p_workspace!=='w1')return Promise.resolve(fail(403,'No workspace access'));
  const op=request.p_operation;
  if(server.operations.has(op))return Promise.resolve(okay(server.operations.get(op)));
  const kind=request.p_kind,p=request.p_payload;
  // Simulates the locked-workspace RPC with precondition checks before changes.
  const temp=clone(server.items);
  if(['consume','restore','update','delete'].includes(kind)){
   const old=temp.find(x=>x.id===p.id);
   if(!old||old.version!==p.expectedVersion)return Promise.resolve(fail(409,'Stock changed on another device; refresh'));
   if(kind==='consume'||kind==='restore'){
    const next=kind==='consume'?'used':'available';
    if(old.status===next)return Promise.resolve(fail(400,'Already '+next));
    old.status=next;old.version++
   }else if(kind==='update'){Object.assign(old,p.changes);old.version++}
   else temp.splice(temp.indexOf(old),1);
  }else if(kind==='production'){
   for(const c of p.consumed){
    const old=temp.find(x=>x.id===c.id);
    if(!old||old.version!==c.expectedVersion||old.status!=='available')
     return Promise.resolve(fail(409,'Stock changed on another device'));
   }
   for(const c of p.consumed){
    const old=temp.find(x=>x.id===c.id);old.status='used';old.version++;
   }
   for(const x of p.created){
    if(temp.some(y=>y.id===x.id))return Promise.resolve(fail(409,'Duplicate item'));
    temp.push({...x,version:1})
   }
  }else if(kind==='import'){
   for(const item of p.created)if(!temp.some(x=>x.id===item.id))temp.push({...item,version:1})
  }else if(kind==='settings')server.workspace.defaultLocation=p.defaultLocation;
  else return Promise.resolve(fail(400,'Invalid mutation'));
  if(server.failNext){server.failNext=false;return Promise.resolve(fail(500,'Atomic rollback simulation'))}
  server.items=temp;
  const outcome={ok:true,operationId:op,kind};
  server.operations.set(op,outcome);
  return Promise.resolve(okay(outcome))
 }
 return Promise.resolve(fail(404,'Unknown mock route '+ending))
}
function createClient(device){
 const nodes=new Map(),className=()=>({toggle(){},add(){},remove(){},contains(){return false}});
 const el=id=>{
  if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',textContent:'',
   dataset:{},style:{},classList:className(),disabled:false,
   appendChild(child){this.lastAppended=child},click(){},select(){},focus(){},
   closest(){return null}});
  return nodes.get(id)
 };
 const listeners={},doc={getElementById:el,addEventListener(type,handler,capture){
  (listeners[type]??=[]).push({handler,capture})},visibilityState:'visible',createElement:()=>el('created'+(++idCounter))};
 const localMap=new Map([['beythaus-cut-remnant-library-v1',JSON.stringify({version:1,
  pieces:[{id:'LOCAL-ONLY-'+device,l:20,w:30,material:'Local',status:'available'}],batches:[]})]]);
 const sessionMap=new Map(),store=map=>({
  getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)});
 const localStorage=store(localMap),sessionStorage=store(sessionMap);
 const app={
  active:false,pieces:[],events:[],localResets:0,mutations:0,
  enterCloudInventory(snapshot){this.active=true;this.pieces=clone(snapshot.pieces);this.events=clone(snapshot.movements);return true},
  exitCloudInventory(){this.active=false;this.localResets++;return true},
  getRemnantDB(){return{version:1,pieces:clone(this.pieces),movements:clone(this.events)}},
  cloudProductionPayload(){return null},markCloudProductionComplete(){},
  openRemnantEditor(){},getSelectedRemnantSource(){return 'qr'}
 };
 let nonce=0;
 const window={BeythausCut:app,sessionStorage,
  location:{protocol:'https:'},crypto:{randomUUID:()=>'00000000-0000-4000-8000-'+String(++nonce).padStart(12,'0')},
  addEventListener(){},print(){}};
 const context={document:doc,window,localStorage,navigator:{},URL,fetch:fakeFetch,
  setInterval(){return 1},clearInterval(){},setTimeout(){},console,Date,JSON,Number,String,
  Map,Array,Object,Math,Intl,Error,confirm(){return true},atob};
 vm.runInNewContext(cloudSource,context,{filename:'docs/cloud-inventory.js',timeout:10000});
 return {api:window.BeythausCloud,el,window,app,localStorage,listeners}
}
(async()=>{
 const a=createClient('A'),b=createClient('B');
 for(const c of [a,b]){
  c.el('cloudUrl').value='https://someproject.supabase.co';
  c.el('cloudKey').value='sb_publishable_test-only';
  c.el('cloudEmail').value='test@example.com';
  c.el('cloudPassword').value='test-password';
  await c.api.login();
  await c.api.selectWorkspace('w1');
  assert.equal(c.api.active(),true);
  assert.equal(c.app.pieces[0].version,1);
  assert.equal(c.app.pieces[0].status,'available');
  checks+=3;
 }
 assert.throws(()=>a.api.normalizeConfig('https://attacker.example','sb_publishable_key'),/supabase/);
 assert.throws(()=>a.api.normalizeConfig('http://someproject.supabase.co','sb_publishable_key'),/HTTPS/);
 assert.throws(()=>a.api.normalizeConfig('https://someproject.supabase.co','sb_secret_abc'),/Gizli/);
 checks+=3;
 // First phone consumes the unique physical board. Second phone is stale.
 await a.api.mutate('consume',{id:'R-shared-1',expectedVersion:1,source:'qr'});
 assert.equal(server.items[0].status,'used');
 assert.equal(server.items[0].version,2);
 await assert.rejects(()=>b.api.mutate('consume',{id:'R-shared-1',expectedVersion:1,source:'manual'}),
  /Stock changed/);
 assert.equal(server.items.filter(x=>x.status==='used').length,1);
 checks+=4;
 await b.api.synchronize(true);
 assert.equal(b.app.pieces[0].version,2);
 await b.api.mutate('restore',{id:'R-shared-1',expectedVersion:2});
 assert.equal(server.items[0].version,3);
 checks+=3;
 // Server must refuse a stale production atomically (no phantom offcut).
 await assert.rejects(()=>a.api.mutate('production',{consumed:[
  {id:'R-shared-1',expectedVersion:1}],created:[{
  id:'R-new-1',l:70,w:40,t:18,material:'Wood',location:'Raf B',status:'available'
 }],batchId:'B-01',projectName:'Cloud A',signature:'proof'},'11111111-1111-4111-8111-111111111111'),/Stock changed/);
 assert.equal(server.items.length,1);checks+=2;
 await b.api.mutate('production',{consumed:[{id:'R-shared-1',expectedVersion:3}],
  created:[{id:'R-new-1',l:70,w:40,t:18,material:'Wood',location:'Raf B',
  notes:'',status:'available',projectName:'Cloud B'}],batchId:'B-01',
  projectName:'Cloud B',signature:'proof'},'22222222-2222-4222-8222-222222222222');
 assert.equal(server.items.length,2);
 assert.equal(server.items.find(x=>x.id==='R-shared-1').status,'used');
 assert.equal(server.items.find(x=>x.id==='R-new-1').status,'available');
 checks+=3;
 // Exact operation ID is idempotent, no duplicate stock.
 await b.api.mutate('production',{consumed:[{id:'R-shared-1',expectedVersion:3}],
  created:[{id:'R-new-1',l:70,w:40}],batchId:'B-01'},'22222222-2222-4222-8222-222222222222');
 assert.equal(server.items.length,2);checks++;
 // Simulated server error never changes local stock copies nor cloud state.
 server.failNext=true;
 const version=server.items.find(x=>x.id==='R-new-1').version;
 await assert.rejects(()=>b.api.mutate('consume',{id:'R-new-1',expectedVersion:version}),/Atomic rollback/);
 assert.equal(server.items.find(x=>x.id==='R-new-1').status,'available');checks+=2;
 await a.api.synchronize(true);assert.equal(a.app.pieces.length,2);
 a.api.leave();assert.equal(a.api.active(),false);assert.equal(a.app.localResets,1);
 const localCopy=JSON.parse(a.localStorage.getItem('beythaus-cut-remnant-library-v1'));
 assert.equal(localCopy.pieces[0].id,'LOCAL-ONLY-A');
 checks+=4;
 assert.ok(totalRequests>=13);checks++;
 console.log('Cloud sync contracts: '+checks+' checks passed; two-client stale consume and production blocked, idempotent RPC, local isolation and auth validation.');
})().catch(e=>{console.error(e);process.exitCode=1});
