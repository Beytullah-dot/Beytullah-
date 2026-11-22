/* Beythaus Cut — proof-aware, stratified commercial capacity experiment.
 * Read-only synthetic fixtures; no Supabase, Auth, stock mutation, or UI change.
 * A canonical three-stage optimum is NOT a global two-dimensional optimum.
 * Production-worker full plans and research exact witnesses must pass TWO audits.
 * A sound GLOBAL proof comes only from the shipped per-objective certifier.
 * All numeric N are measurement strata, never user input limits.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const docs=path.join(__dirname,'../docs');
const objectives=['count','area','cost'];
const sizes=[10,25,50,100,200,500,1000];
const families=['fullspan','strip4','nested8','unique','multimaterial-rotation'];
const source=p=>fs.readFileSync(path.join(docs,p),'utf8');
const common=(material,category='panel',t=18)=>({
 material,category,t,grain:'length',rotate:false
});
function fixture(family,N){
 let parts=[],stocks=[],kerf=2,trim=1;
 const add=(id,l,w,extra)=>parts.push({
  id,label:id,l,w,order:parts.length,...extra
 });
 const sheet=(id,l,w,qty,price,extra)=>stocks.push({
  id,l,w,qty,price,priceUnit:'panel',...extra
 });
 if(family==='fullspan'){
  const attrs=common('panel|capacity-uniform');
  for(let i=0;i<N;i++)add('p'+i,60,20,attrs);
  sheet('uniform',62,66,Math.ceil(N/3),90,attrs);
 }else if(family==='strip4'){
  const attrs=common('panel|capacity-strip');
  const widths=[18,20,22,24],heights=[66,84,100,122];
  for(let i=0;i<N;i++)add('p'+i,60,widths[i%4],attrs);
  heights.forEach((h,i)=>sheet('sheet'+i,62,h,
   i===3?N:Math.ceil(N/4),[90,97,118,151][i],attrs));
 }else if(family==='nested8'){
  const attrs=common('panel|capacity-nested');
  const motif=[8,14,10,12,9,13,7,15];
  for(let i=0;i<N;i++)add('p'+i,motif[i%8],16,attrs);
  const boardCount=Math.ceil(N/8);
  [[52,36,100],[54,38,114],[56,40,129],[60,42,157]]
   .forEach(([l,w,price],i)=>sheet('sheet'+i,l,w,
    Math.floor(boardCount/4)+(i<boardCount%4?1:0),price,attrs));
 }else if(family==='unique'){
  const attrs=common('panel|capacity-unique');
  for(let i=0;i<N;i++)add('p'+i,7+(i%20),(100000+10000*(Math.floor(i/20)%20)+i)/10000,attrs);
  sheet('short',100,100,Math.ceil(N/3),180,attrs);
  sheet('long',110,102,Math.ceil(N/3),214,attrs);
 }else if(family==='multimaterial-rotation'){
  const panel=common('panel|capacity-paint');
  const solid=common('masif|capacity-oak','masif',20);
  for(let i=0;i<N;i++){
   const attrs=i%2?solid:panel;
   add('p'+i,i%4<2?60:20,i%4<2?20:60,
    {...attrs,...(i%4>=2?{grain:'width',rotate:true}:{})});
  }
  const panelQty=Math.ceil(Math.ceil(N/2)/3);
  const solidQty=Math.ceil(Math.floor(N/2)/3);
  sheet('panel-stock',62,66,panelQty,90,panel);
  stocks.push({id:'solid-stock',l:62,w:66,qty:solidQty,
   price:25000,priceUnit:'m3',...solid});
 }else throw Error('unregistered family');
 const K=new Set(parts.map(p=>[
  p.l,p.w,p.material,p.category,p.t,p.grain,p.rotate].join('|'))).size;
 return {family,N,K,parts,stocks,kerf,trim,m3:25000};
}
function runChild(){
 const family=process.argv[3],N=Number(process.argv[4]),objective=process.argv[5];
 assert(families.includes(family)&&sizes.includes(N)&&objectives.includes(objective));
 const data=fixture(family,N);
 const frozen=JSON.stringify(data);
 const window={};
 for(const filename of [
  'engine/material-policy.js','engine/fullspan-strip-exact.js',
  'engine/two-stage-strip-exact.js','engine/three-stage-nested-exact.js',
  'engine/optimality-certificate.js','engine/production-audit.js',
  'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
  'engine/cutting-engine.js']){
  vm.runInNewContext(source(filename),{window},{filename});
 }
 const engine=window.BeythausCutEngine.createEngine({
  getState:()=>({mode:'guillotine',priceMode:'panel'}),
  val:Number,mkey:x=>String(x||'').toLowerCase(),fmt:Number
 });
 const independent=require('./optimization-oracle.cjs').audit;
 const verify=plan=>{
  assert(plan&&Array.isArray(plan.bins),'Missing physical plan');
  assert.equal(plan.placedCount,N,'Partial candidate placed count');
  assert.equal(plan.unplaced.length,0,'Partial candidate leaked');
  const audited=engine.auditCutPlan(plan,data);
  assert.equal(audited.ok,true,'Production audit rejected: '+audited.issues);
  const ref=independent(data,plan,'guillotine');
  assert.equal(ref.ok,true,'Independent tree replay rejected: '+ref.issues);
  return true;
 };
 const scope={out:null,postMessage(msg){this.out=msg}};
 let sandbox;
 sandbox=vm.createContext({self:scope,window:scope,console,
  importScripts(...paths){
   for(const name of paths){
    assert(!name.includes('..'),'Worker attempted parent traversal');
    vm.runInContext(source(name.replace(/^\.\//,'')),sandbox,{filename:name});
   }
  }});
 vm.runInContext(source('constructive-worker.js'),sandbox,
  {filename:'constructive-worker.js'});
 const workerStart=performance.now();
 scope.onmessage({data:{type:'construct',requestId:57,
  mode:'guillotine',objective,priceMode:'panel',m3:25000,data}});
 const workerMs=performance.now()-workerStart;
 const w=scope.out;
 assert(w&&w.type==='construct-finished'&&w.requestId===57,
  'Unexpected deployed Worker response');
 assert.equal(w.proof,'none','Constructive algorithm fabricated proof');
 assert.equal(JSON.stringify(data),frozen,'Worker mutated benchmark fixture');
 let workerAudited=false;
 if(w.status==='feasible-uncertified'){
  workerAudited=verify(w.plan);
 }else{
  assert(['unknown-limit','unknown-no-candidate','unknown-class',
   'unknown-price','unknown-precision','unknown-input'].includes(w.status),
   'Worker unexpected/hidden error: '+w.status);
  assert.equal(w.plan,null,'Incomplete Worker plan leaked as production');
 }
 const solver=family==='nested8'?
  window.BeythausThreeStageNestedExact:
  window.BeythausFullSpanPatternExact;
 const searchStart=performance.now();
 const exact=solver.solve(data.parts,data.stocks,{
  objective,trim:data.trim,kerf:data.kerf,
  m3:data.m3,priceMode:'panel',
  maxMs:850,maxNodes:80000,maxPatterns:12000,maxStates:12000
 });
 const exactMs=performance.now()-searchStart;
 const acceptable=['optimal-physical-class','optimal-three-stage-class',
  'infeasible-class','infeasible-three-stage-class',
  'unknown-class','unknown-limit','unknown-price',
  'unknown-input','unknown-precision'];
 assert(acceptable.includes(exact.status),'Unexpected exact state: '+exact.status);
 const classOptimal=exact.status==='optimal-physical-class'||
  exact.status==='optimal-three-stage-class';
 const classScope=family==='nested8'?'VH-V/HV-H three-stage':'strict full-span';
 let exactAudited=false;
 if(classOptimal)exactAudited=verify(exact.plan);
 else assert.equal(exact.plan,null,'Unproven exact search leaked plan');
 const twoStage=(family==='nested8'||family==='strip4')?
  window.BeythausTwoStageStripExact.solve(data.parts,data.stocks,{
   objective,trim:data.trim,kerf:data.kerf,m3:data.m3,priceMode:'panel',
   maxMs:350,maxNodes:40000,maxPatterns:6000,maxStates:6000}):null;
 const twoStageClassOptimal=twoStage?.status==='optimal-two-stage-class';
 const twoStageAudited=twoStageClassOptimal?verify(twoStage.plan):false;
 const candidate=workerAudited?w.plan:exactAudited?exact.plan:
  twoStageAudited?twoStage.plan:null;
 let globalProof=null,proofMs=null;
 if(candidate){
  const proofStart=performance.now();
  globalProof=window.BeythausOptimalityCertificate.certify(candidate,data,{
   objective,auditOK:true,maxMs:900,maxStates:30000,
   priceMode:'panel',m3:data.m3,allowMaterialAssignment:false});
  proofMs=performance.now()-proofStart;
  assert(!globalProof.proven||globalProof.status==='optimal',
   'Inconsistent proof contract');
  if(globalProof.proven)assert(globalProof.lowerBound!==null,
   'Global proof without a valid lower bound');
 }
 // Independent analytic result for one provably exact physical family:
 // 60mm usable width, 64mm usable height, 20mm item height, 2mm
 // kerf: at most THREE items per stock; ceil(N/3) stocks are necessary.
 // Each stock has identical price and gross dimensions.
 if(family==='fullspan'&&globalProof?.proven){
  const boardMin=Math.ceil(N/3);
  const analytical=objective==='count'?boardMin:
   objective==='area'?boardMin*62*66:boardMin*90;
  assert.equal(globalProof.incumbent,analytical,
   'Global proof contradicts independent fullspan capacity oracle');
  assert.equal(globalProof.lowerBound,analytical,
   'Proof lower bound contradicts independent fullspan oracle');
 }
 const mem=process.memoryUsage();
 const row={
  family,N,K:data.K,objective,materialCount:new Set(data.parts.map(p=>p.material)).size,
  stockTypeCount:data.stocks.length,
  availableStockCount:data.stocks.reduce((a,s)=>a+s.qty,0),
  trimMm:data.trim,kerfMm:data.kerf,
  rotationCount:data.parts.filter(p=>p.rotate).length,
  workerStatus:w.status,workerAudited,workerMs,
  workerNodes:w.nodes??null,
  exactStatus:exact.status,classScope,classOptimal,exactAudited,exactMs,
  exactNodes:exact.nodes??null,exactPatterns:exact.patternsCreated??null,
  exactStates:exact.states??null,exactPeakMemo:exact.peakMemo??null,
  twoStageStatus:twoStage?.status??'not-applicable',
  twoStageClassOptimal,twoStageAudited,
  completePhysicalPlan:!!candidate,
  planOrigin:workerAudited?'deployed-constructive-worker':
   exactAudited?'research-exact-only':twoStageAudited?'research-two-stage':null,
  usedStockCount:candidate?.bins.length??null,
  objectiveValue:globalProof?.incumbent??null,
  globalStatus:globalProof?.status??'no-complete-plan',
  globalProven:globalProof?.proven===true,
  globalLowerBound:globalProof?.lowerBound??null,
  globalGap:globalProof?.gap??null,
  globalGapPercent:globalProof?.gapPercent??null,
  globalProofMethod:globalProof?.method??null,
  proofMs,
  maxRSSKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null,
  rssAtEndBytes:mem.rss,heapUsedAtEndBytes:mem.heapUsed
 };
 console.log(JSON.stringify(row));
}
/* Separate watchdog process for the synchronous, shipped MAIN-THREAD
 * optimizer. Timeouts are UNKNOWN, not infeasible; malformed physical
 * trees FAIL CI.
 */
function baselineChild(){
 const family=process.argv[3],N=Number(process.argv[4]),objective=process.argv[5];
 assert(families.includes(family)&&sizes.includes(N)&&objectives.includes(objective));
 const data=fixture(family,N),window={};
 for(const filename of [
  'engine/material-policy.js','engine/fullspan-strip-exact.js',
  'engine/optimality-certificate.js','engine/production-audit.js',
  'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
  'engine/cutting-engine.js'])
  vm.runInNewContext(source(filename),{window},{filename});
 const engine=window.BeythausCutEngine.createEngine({
  getState:()=>({mode:'guillotine',priceMode:'panel'}),
  val:Number,mkey:x=>String(x||'').toLowerCase(),fmt:Number
 });
 const started=performance.now();
 const plan=engine.optimize(data,false,false,
  objective==='area'?'area':objective==='count'?'minimum':'economic');
 const baselineMs=performance.now()-started;
 const complete=!!plan&&plan.placedCount===N&&
  Array.isArray(plan.unplaced)&&plan.unplaced.length===0;
 let baselineGlobalProven=false,baselineGlobalStatus='no-complete-plan';
 let baselineGapPercent=null,baselineLowerBound=null,baselineUsedStockCount=null;
 if(complete){
  assert.equal(engine.auditCutPlan(plan,data).ok,true,
   'Baseline main engine failed production physical audit');
  const independent=require('./optimization-oracle.cjs').audit(data,plan,'guillotine');
  assert.equal(independent.ok,true,'Baseline main engine failed independent oracle');
  const p=window.BeythausOptimalityCertificate.certify(plan,data,{
   objective,auditOK:true,maxMs:900,maxStates:30000,
   priceMode:'panel',m3:data.m3,allowMaterialAssignment:false});
  baselineGlobalProven=p.proven===true;
  baselineGlobalStatus=p.status;
  baselineGapPercent=p.gapPercent;
  baselineLowerBound=p.lowerBound;
  baselineUsedStockCount=plan.bins.length;
 }
 console.log(JSON.stringify({
  baselineStatus:complete?'complete-audited':'partial-unknown',
  baselineComplete:complete,baselineGlobalProven,baselineGlobalStatus,
  baselineGapPercent,baselineLowerBound,baselineUsedStockCount,
  baselineMs,
  baselineMaxRSSKiB:process.platform==='linux'?
   process.resourceUsage().maxRSS:null
 }));
}

function percentile(a,p){
 if(!a.length)return null;
 const s=[...a].sort((x,y)=>x-y);
 return s[Math.min(s.length-1,Math.ceil(p*s.length)-1)];
}
function main(){
 const started=performance.now(),rows=[];
 for(const family of families){
  for(const N of sizes){
   for(const objective of objectives){
    const child=spawnSync(process.execPath,
     [__filename,'--case',family,String(N),objective],
     {encoding:'utf8',timeout:17000,maxBuffer:3*1024*1024});
    assert.equal(child.error,undefined,
     'Child timeout or launch failure '+family+'/'+N+'/'+objective+' '+child.error);
    assert.equal(child.status,0,
     'Benchmark child failed '+family+'/'+N+'/'+objective+'\n'+
     (child.stderr||'')+'\n'+(child.stdout||''));
    const row=JSON.parse(child.stdout.trim().split('\n').at(-1));
    const baseline=spawnSync(process.execPath,
     [__filename,'--baseline',family,String(N),objective],
     {encoding:'utf8',timeout:4000,maxBuffer:3*1024*1024});
    if(baseline.error?.code==='ETIMEDOUT'){
     Object.assign(row,{baselineStatus:'unknown-watchdog',baselineComplete:false,
      baselineGlobalProven:false,baselineGlobalStatus:'unknown-watchdog',
      baselineMs:null,baselineMaxRSSKiB:null});
    }else{
     assert.equal(baseline.error,undefined,'Baseline process launch error: '+baseline.error);
     assert.equal(baseline.status,0,'Synchronous baseline process failed '+family+'/'+N+'/'+objective+
      '\n'+(baseline.stderr||'')+'\n'+(baseline.stdout||''));
     Object.assign(row,JSON.parse(baseline.stdout.trim().split('\n').at(-1)));
    }
    row.anyCompletePhysical=row.completePhysicalPlan||row.baselineComplete;
    row.anyGlobalProven=row.globalProven||row.baselineGlobalProven;
    rows.push(row);
    console.log('CAPACITY-ROW '+JSON.stringify(row));
   }
  }
 }
 const grouped=families.map(family=>{
  const sample=rows.filter(x=>x.family===family);
  return {family,rows:sample.length,
   completePhysical:sample.filter(x=>x.completePhysicalPlan).length,
   baselineComplete:sample.filter(x=>x.baselineComplete).length,
   combinedComplete:sample.filter(x=>x.anyCompletePhysical).length,
   combinedGlobalProven:sample.filter(x=>x.anyGlobalProven).length,
   baselineTimeout:sample.filter(x=>x.baselineStatus==='unknown-watchdog').length,
   deployedWorkerComplete:sample.filter(x=>x.workerAudited).length,
   globalProven:sample.filter(x=>x.globalProven).length,
   classOptimal:sample.filter(x=>x.classOptimal).length,
   unknownOrNoPlan:sample.filter(x=>!x.completePhysicalPlan).length,
   p50WorkerMs:percentile(sample.map(x=>x.workerMs),.50),
   p95WorkerMs:percentile(sample.map(x=>x.workerMs),.95),
   peakRSSKiB:Math.max(...sample.map(x=>x.maxRSSKiB||0))}
 });
 const report={
  schemaVersion:1,
  scope:'SYNTHETIC measured strata; research-only class proofs never global; no universal N threshold',
  source:'actual production constructive Worker plus actual exact modules and shipped proof certifier',
  environment:{node:process.version,platform:process.platform,
   arch:process.arch,observedRunWallMs:performance.now()-started},
  fixedBudgets:{worker:'deployed code 1300ms/120000 nodes',
   exact:{maxMs:850,maxNodes:80000,maxPatterns:12000,maxStates:12000},
   proof:{maxMs:900,maxStates:30000},childWatchdogMs:17000,
   baselineWatchdogMs:4000},
  sample:{Ns:sizes,families,objectives,rows:rows.length},
  result:{completePhysical:rows.filter(x=>x.completePhysicalPlan).length,
   baselineComplete:rows.filter(x=>x.baselineComplete).length,
   combinedComplete:rows.filter(x=>x.anyCompletePhysical).length,
   combinedGlobalProven:rows.filter(x=>x.anyGlobalProven).length,
   baselineTimeout:rows.filter(x=>x.baselineStatus==='unknown-watchdog').length,
   baselineP50Ms:percentile(rows.filter(x=>x.baselineMs!==null).map(x=>x.baselineMs),.50),
   baselineP95Ms:percentile(rows.filter(x=>x.baselineMs!==null).map(x=>x.baselineMs),.95),
   deployedWorkerComplete:rows.filter(x=>x.workerAudited).length,
   classOptimal:rows.filter(x=>x.classOptimal).length,
   globalProven:rows.filter(x=>x.globalProven).length,
   noCompletePlan:rows.filter(x=>!x.completePhysicalPlan).length,
   p50WorkerMs:percentile(rows.map(x=>x.workerMs),.50),
   p95WorkerMs:percentile(rows.map(x=>x.workerMs),.95),
   peakRSSKiB:Math.max(...rows.map(x=>x.maxRSSKiB||0))},
  grouped,rows};
 assert.equal(rows.length,families.length*sizes.length*objectives.length);
 assert(rows.every(x=>!x.globalProven||x.completePhysicalPlan),
  'An unverified candidate was certified');
 if(process.env.MOTOR_CAPACITY_JSON)
  fs.writeFileSync(process.env.MOTOR_CAPACITY_JSON,
   JSON.stringify(report,null,2)+'\n');
 console.log('CAPACITY-SUMMARY '+JSON.stringify(report.result));
 console.log('CAPACITY-BY-CLASS '+JSON.stringify(grouped));
}
if(process.argv[2]==='--case')runChild();
else if(process.argv[2]==='--baseline')baselineChild();else main();
