'use strict';
// Actual browser run button, legacy chain and advanced Worker; isolated synthetic stock.
// Count is injected as an experimental goal, not exposed as a public UI button.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webkit,devices}=require('playwright');
const url=process.env.BEYTHAUS_TEST_URL||'http://127.0.0.1:8765/index.html';
const dest=path.join(__dirname,'results','browser-matrix.json');
const rows=[];fs.mkdirSync(path.dirname(dest),{recursive:true});
function record(row){rows.push(row);fs.writeFileSync(dest,JSON.stringify(rows,null,2));console.log('STAGE2_BROWSER '+JSON.stringify(row))}
async function run(browser,enabled,narrow,objective,forceLimit=false){
 const context=await browser.newContext({...devices['iPhone 13'],serviceWorkers:'block',permissions:[]});
 const origin=new URL(url).origin;
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.origin===origin)return route.continue();
  if(u.href.startsWith('https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/')){
   const asset=u.pathname.split('/').pop();
   return route.fulfill({path:require.resolve('pdfmake/build/'+asset),contentType:'application/javascript'});
  }
  return route.abort();
 });
 await context.addInitScript(({forceLimit})=>{
  const NativeWorker=window.Worker,active=new Set(),calls=[];
  window.__s2={active,calls};
  window.Worker=function(url,options){
   const w=new NativeWorker(url,options),name=String(url),call={name};
   calls.push(call);active.add(w);
   const send=w.postMessage.bind(w),terminate=w.terminate.bind(w);
   w.postMessage=(job,...rest)=>{
    if(forceLimit&&name.includes('advanced-search-worker.js'))job={...job,maxStates:1};
    call.job=job;return send(job,...rest);
   };
   w.terminate=()=>{active.delete(w);return terminate()};
   w.addEventListener('message',e=>{call.response=e.data});
   return w;
  };
 },{forceLimit});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>!!window.BeythausCut,null,{timeout:20000});
  await page.evaluate(({enabled,narrow,objective})=>{
   const app=window.BeythausCut,d=app.defaultData(),base={t:18,category:'panel',material:'STAGE2-SYNTHETIC'};
   Object.assign(d,{unit:'mm',mode:'guillotine',materialMode:'single',singleCategory:'panel',
    singleMaterial:base.material,useRemnantStock:false,kerf:2,trim:0,allowNarrowScrapCuts:narrow,
    offcutMinEdgeMm:1,offcutMinAreaCm2:0,objective:objective==='area'?'area':'cost'});
   d.parts=[{...base,id:'a',label:'A',l:10,w:20,qty:3,rotate:false,grain:'length'},
    {...base,id:'b',label:'B',l:5,w:10,qty:2,rotate:true,grain:''}];
   d.stocks=[{...base,id:'x',l:35,w:20,qty:4,price:90,priceUnit:'panel'},
    {...base,id:'y',l:12,w:20,qty:4,price:35,priceUnit:'panel'}];
   app.setState(d);
   const state=app.getState();state.enableMultiplicitySolver=enabled;
   // The public count selector is deliberately not part of this release.
   if(objective==='count')state.objective='count';
  },{enabled,narrow,objective});
  await page.locator('#mobileRunBtn').click();
  await page.waitForFunction(enabled=>{
   const app=window.BeythausCut,line=document.querySelector('#multiplicitySearchLine');
   return app.getLastAudit()?.ok&&window.__s2.active.size===0&&
    (!enabled||(!line.classList.contains('hidden')&&['done','warning'].includes(line.dataset.state)));
  },enabled,{timeout:40000});
  const result=await page.evaluate(()=>{
   const app=window.BeythausCut,plan=app.getPlanSnapshot(),data=app.normalize(),
    calls=window.__s2.calls.filter(x=>x.name.includes('advanced-search-worker.js')),
    response=calls[0]?.response,job=calls[0]?.job,line=document.querySelector('#multiplicitySearchLine');
   const metrics=p=>p?{count:p.bins.length,area:p.stockArea,cost:p.cost,missing:p.unplaced.length}:null;
   return {metrics:metrics(plan),incumbent:metrics(job?.incumbent),advancedCalls:calls.length,
    response:response?{status:response.status,proof:response.proof,limitReached:response.limitReached,
     limitReason:response.limitReason,limitReasons:response.limitReasons}:null,
    ui:line.textContent.trim(),hidden:line.classList.contains('hidden'),
    audit:app.auditCutPlan(plan,data).ok,independent:window.BeythausPhysicalVerifier.verifyPlan(data,plan).ok,
    quantities:app.getState().stocks.map(s=>s.qty),workerObjective:job?.objective??null,
    workerNarrow:job?.data?.allowNarrowScrapCuts??null};
  });
  const row={enabled,narrow,objective,forceLimit,...result,errors};
  record(row);
  assert.deepEqual(errors,[]);assert.equal(result.audit,true);assert.equal(result.independent,true);
  assert.deepEqual(result.quantities,[4,4]);assert.equal(result.metrics.missing,0);
  assert.equal(result.advancedCalls,enabled?1:0);
  if(!enabled){assert.equal(result.hidden,true);return row;}
  assert.equal(result.workerObjective,objective);assert.equal(result.workerNarrow,narrow);
  assert.equal(result.response?.proof,'none');assert.equal(typeof result.response?.limitReached,'boolean');
  assert.equal(result.hidden,false);assert.ok(result.metrics[objective]<=result.incumbent[objective]+1e-7);
  if(result.response.limitReached){assert.match(result.ui,/Sınırlı arama, optimum iddiası yok/);assert.doesNotMatch(result.ui,/Tam sonuç/)}
  else if(result.response.status==='feasible-uncertified')assert.match(result.ui,/Tam sonuç/);
  if(forceLimit){assert.equal(result.response.limitReached,true);assert(result.response.limitReasons.includes('maxStates'))}
  return row;
 }finally{await context.close()}
}
(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  for(const narrow of [false,true])for(const objective of ['count','area','cost']){
   const old=await run(browser,false,narrow,objective),now=await run(browser,true,narrow,objective);
   assert.ok(now.metrics[objective]<=old.metrics[objective]+1e-7,'old-chain regression '+objective+' '+narrow);
  }
  await run(browser,true,false,'count',true);
  console.log('STAGE2_BROWSER PASS: 12 combinations, extra maxStates=1, no regressions on this fixture.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
