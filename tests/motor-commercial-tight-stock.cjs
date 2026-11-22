/* Beythaus Cut — scarcity, physical-witness and objective quality research.
 * Synthetic, isolated, read-only. No live database or user records.
 * An independently planted physically complete cutting tree establishes
 * FEASIBILITY, never global OPTIMALITY. A sound area shortage establishes
 * INFEASIBILITY for that fixture, not a generic Worker failure.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const root=path.join(__dirname,'..'),docs=path.join(root,'docs');
const source=p=>fs.readFileSync(path.join(docs,p),'utf8');
const sizes=[10,25,50,100,200],objectives=['count','area','cost'];
const families=['panel-tight','mixed-grain-tight','panel-scarce','mixed-grain-scarce'];
const k=3,trim=2;
function createFixture(family,N){
 const mixed=family.startsWith('mixed');
 const scarce=family.endsWith('-scarce');
 const count=N/5;
 assert(Number.isSafeInteger(count));
 const parts=[],stocks=[],witnessBins=[],byType=new Map();
 const stockAssignments=[];
 for(let j=0;j<count;j++){
  const variant=j%5;
  const material=j%2&&mixed?'masif|beech-sample':'panel|birch-sample';
  const isSolid=material.startsWith('masif');
  const base={material,category:isSolid?'masif':'panel',t:isSolid?32:18};
  const W=96+11*variant,H=88+9*((variant+1)%3);
  const key=variant+'|'+material,id='stock-'+key;
  let stock=byType.get(key);
  if(!stock){
   stock={...base,id,l:W+2*trim,w:H+2*trim,qty:0,
    price:isSolid?23500+variant*900:130+variant*33,
    priceUnit:isSolid?'m3':'panel',order:byType.size};
   byType.set(key,stock);stocks.push(stock)
  }
  stock.qty++;
  stockAssignments.push(id);
  const A=Math.floor(W*0.57),B=Math.floor(H*0.53);
  const C=Math.floor(H*0.43),D=Math.floor(A*0.54);
  const rootRect={x:trim,y:trim,w:W,h:H},cuts=[];
  function split(rect,axis,first){
   const vertical=axis==='vertical';
   const whole=vertical?rect.w:rect.h;
   assert(first>0&&whole-first-k>0);
   const at=(vertical?rect.x:rect.y)+first+k/2;
   cuts.push({number:cuts.length+1,label:'Known independent split',
    axis,at,source:{...rect},
    x1:vertical?at:rect.x,y1:vertical?rect.y:at,
    x2:vertical?at:rect.x+rect.w,y2:vertical?rect.y+rect.h:at});
   const left=vertical?{...rect,w:first}:{...rect,h:first};
   const right=vertical?
    {x:rect.x+first+k,y:rect.y,w:whole-first-k,h:rect.h}:
    {x:rect.x,y:rect.y+first+k,w:rect.w,h:whole-first-k};
   return [left,right];
  }
  const [left,right]=split(rootRect,'vertical',A);
  const [topLeft,bottomLeft]=split(left,'horizontal',B);
  const [topRight,bottomRight]=split(right,'horizontal',C);
  const [bottomA,bottomB]=split(bottomLeft,'vertical',D);
  const final=[topLeft,topRight,bottomRight,bottomA,bottomB];
  const placed=[];
  for(let q=0;q<5;q++){
   const rect=final[q];
   const rotated=mixed&&(q===0||q===3);
   const p={...base,id:'p'+j+'-'+q,label:'Part '+j+'-'+q,
    l:rotated?rect.h:rect.w,w:rotated?rect.w:rect.h,
    grain:rotated?'width':'length',rotate:rotated,
    order:parts.length};
   parts.push(p);
   placed.push({...p,...rect,rotated});
  }
  witnessBins.push({stock,placed,cuts,free:[]});
 }
 if(scarce){
  const allow=Math.max(1,Math.floor(count*.4));
  const counts=new Map();
  for(const id of stockAssignments.slice(0,allow))
   counts.set(id,(counts.get(id)||0)+1);
  for(const s of stocks)s.qty=counts.get(s.id)||0;
 }
 const data={parts,stocks,kerf:k,trim,m3:25000};
 const usableCapacity=stocks.reduce((a,s)=>
  a+s.qty*(s.l-2*trim)*(s.w-2*trim),0);
 const requiredArea=parts.reduce((a,p)=>a+p.l*p.w,0);
 const mathematicallyImpossibleByArea=requiredArea>usableCapacity+1e-6;
 if(scarce)assert(mathematicallyImpossibleByArea,
  'Scarcity fixture must be independently AREA-impossible');
 if(!scarce)assert(!mathematicallyImpossibleByArea,
  'Planted feasible fixture cannot violate area capacity');
 const distinctClasses=new Set(parts.map(p=>[
  p.l,p.w,p.material,p.t,p.grain,p.rotate].join('|'))).size;
 return {data,meta:{family,N,K:distinctClasses,stockTypes:stocks.length,
  availableBoards:stocks.reduce((a,s)=>a+s.qty,0),
  materialClasses:new Set(parts.map(p=>p.material)).size,
  rotatedPieces:parts.filter(p=>p.rotate).length,
  knownFeasible:!scarce,mathematicallyImpossibleByArea,
  requiredArea,usableCapacity},
  witnessBins:scarce?null:witnessBins};
}
function loadEngine(){
 const window={};
 for(const f of ['engine/material-policy.js','engine/optimality-certificate.js',
  'engine/fullspan-strip-exact.js','engine/production-audit.js',
  'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
  'engine/cutting-engine.js'])
  vm.runInNewContext(source(f),{window},{filename:f});
 const engine=window.BeythausCutEngine.createEngine({
  getState:()=>({mode:'guillotine',priceMode:'panel'}),
  val:Number,mkey:v=>String(v||'').toLowerCase(),fmt:Number
 });
 return {window,engine};
}
function complete(plan,N){
 return !!plan&&plan.placedCount===N&&
  Array.isArray(plan.unplaced)&&plan.unplaced.length===0;
}
function metric(plan,objective){
 return objective==='count'?plan.bins.length:
  objective==='area'?plan.stockArea:plan.cost;
}
function verify(plan,data,engine){
 const a=engine.auditCutPlan(plan,data);
 assert.equal(a.ok,true,'Shipped physical audit failed: '+a.issues);
 const b=require('./optimization-oracle.cjs').audit(data,plan,'guillotine');
 assert.equal(b.ok,true,'Independent full-edge audit failed: '+b.issues);
}
function buildWitness(bins,data,window){
 const policy=window.BeythausMaterialPolicy;
 const cost=bins.reduce((a,b)=>a+policy.stockPrice(b.stock,
  {priceMode:'panel',m3:data.m3}),0);
 return {bins,unplaced:[],placedCount:data.parts.length,
  stockArea:bins.reduce((a,b)=>a+b.stock.l*b.stock.w,0),
  partArea:data.parts.reduce((a,p)=>a+p.l*p.w,0),
  cost,unknownCostBins:0};
}
function runWorker(data,objective){
 const scope={result:null,postMessage(msg){this.result=msg}};
 let sandbox;
 sandbox=vm.createContext({self:scope,window:scope,console,
  importScripts(...names){
   for(const n of names){
    assert(!n.includes('..'),'Worker import escaped docs');
    vm.runInContext(source(n.replace(/^\.\//,'')),sandbox,{filename:n});
   }
  }});
 vm.runInContext(source('constructive-worker.js'),sandbox,{filename:'constructive-worker.js'});
 const started=performance.now();
 scope.onmessage({data:{type:'construct',requestId:92,
  mode:'guillotine',objective,priceMode:'panel',m3:25000,data}});
 const ms=performance.now()-started;
 const w=scope.result;
 assert(w&&w.type==='construct-finished'&&w.requestId===92);
 assert.equal(w.proof,'none');
 const allowed=['feasible-uncertified','unknown-limit',
  'unknown-no-candidate','unknown-class','unknown-price',
  'unknown-precision','unknown-input'];
 assert(allowed.includes(w.status),'Worker error: '+w.status);
 return {result:w,ms};
}
function child(){
 const family=process.argv[3],N=Number(process.argv[4]),
  objective=process.argv[5];
 assert(families.includes(family)&&sizes.includes(N)&&objectives.includes(objective));
 const {data,meta,witnessBins}=createFixture(family,N);
 const snapshot=JSON.stringify(data);
 const {window,engine}=loadEngine();
 let witness=null,witnessValue=null;
 if(witnessBins){
  witness=buildWitness(witnessBins,data,window);
  assert(complete(witness,N));
  verify(witness,data,engine);
  witnessValue=metric(witness,objective);
 }
 const started=performance.now();
 const plan=engine.optimize(data,false,false,
  objective==='area'?'area':objective==='count'?'minimum':'economic');
 const baselineMs=performance.now()-started;
 assert(plan&&Array.isArray(plan.unplaced)&&Array.isArray(plan.bins),
  'Main optimizer output malformed');
 verify(plan,data,engine); // audits partial results too; never call them production-ready.
 const baselineComplete=complete(plan,N);
 const enhancedStarted=performance.now();
 // This is the ACTUAL UI-mode first calculation, unlike the baseline
 // above, which deliberately disables the physical repair/refinement.
 const enhanced=engine.optimize(data,true,false,
  objective==='area'?'area':objective==='count'?'minimum':'economic');
 const enhancedMs=performance.now()-enhancedStarted;
 assert(enhanced&&Array.isArray(enhanced.bins)&&Array.isArray(enhanced.unplaced),
  'Enhanced UI-path produced malformed output');
 verify(enhanced,data,engine);
 const enhancedComplete=complete(enhanced,N);
 if(meta.mathematicallyImpossibleByArea){
  assert.equal(baselineComplete,false,
   'Impossible fixture returned a complete baseline plan');
  assert.equal(enhancedComplete,false,
   'Impossible fixture returned a complete enhanced plan');
 }
 const [worker,workerMs]=(()=>{const x=runWorker(data,objective);return [x.result,x.ms]})();
 if(worker.status==='feasible-uncertified'){
  assert(complete(worker.plan,N),'Worker leaked incomplete as full');
  verify(worker.plan,data,engine);
  assert(!meta.mathematicallyImpossibleByArea,
   'Impossible fixture generated physically complete Worker plan');
 }else assert.equal(worker.plan,null,'Worker leaked unverified partial candidate');
 assert.equal(JSON.stringify(data),snapshot,'Engine/Worker mutated fixture');
 let cert=null,certMs=null;
 if(baselineComplete){
  const proofStart=performance.now();
  cert=window.BeythausOptimalityCertificate.certify(plan,data,{
   objective,auditOK:true,priceMode:'panel',m3:25000,
   maxMs:900,maxStates:30000,allowMaterialAssignment:false});
  certMs=performance.now()-proofStart;
  if(cert.proven){
   assert.equal(cert.status,'optimal');
   assert(Number.isFinite(cert.lowerBound));
   assert(Math.abs(cert.incumbent-cert.lowerBound)<1e-4,
    'Claimed certified optimum has nonzero gap');
  }
 }
 let enhancedProof=null,enhancedProofMs=null;
 if(enhancedComplete){
  const proofStart=performance.now();
  enhancedProof=window.BeythausOptimalityCertificate.certify(enhanced,data,{
   objective,auditOK:true,priceMode:'panel',m3:25000,
   maxMs:900,maxStates:30000,allowMaterialAssignment:false});
  enhancedProofMs=performance.now()-proofStart;
  if(enhancedProof.proven){
   assert.equal(enhancedProof.status,'optimal');
   assert(Number.isFinite(enhancedProof.lowerBound));
   assert(Math.abs(enhancedProof.incumbent-enhancedProof.lowerBound)<1e-4,
    'Enhanced claimed proof has nonzero gap');
  }
 }
 const incumbent=baselineComplete?metric(plan,objective):null;
 const witnessDominates=baselineComplete&&witnessValue!==null&&
  incumbent>witnessValue+Math.max(1e-7,Math.abs(witnessValue)*1e-9);
 if(cert?.proven&&witnessValue!==null)
  assert(cert.incumbent<=witnessValue+1e-6,
   'Baseline global OPTIMAL contradicted by known physical alternative');
 if(enhancedProof?.proven&&witnessValue!==null)
  assert(enhancedProof.incumbent<=witnessValue+1e-6,
   'Enhanced global OPTIMAL contradicted by known physical alternative');
 const enhancedIncumbent=enhancedComplete?metric(enhanced,objective):null;
 const enhancedWitnessDominates=enhancedComplete&&witnessValue!==null&&
  enhancedIncumbent>witnessValue+Math.max(1e-7,Math.abs(witnessValue)*1e-9);
 const productionComplete=enhancedComplete||worker.status==='feasible-uncertified';
 const row={...meta,objective,baselineComplete,
  baselineStatus:baselineComplete?'complete-audited':'partial-audited',
  baselineUnplaced:plan.unplaced.length,baselineMs,
  enhancedStatus:enhancedComplete?'complete-audited':'partial-audited',
  enhancedComplete,enhancedUnplaced:enhanced.unplaced.length,enhancedMs,
  productionComplete,enhancedIncumbent,enhancedWitnessDominates,
  enhancedCertifiedOptimal:enhancedProof?.proven===true,
  enhancedCertifiedStatus:enhancedProof?.status??'no-complete-plan',
  enhancedCertifiedGapPercent:enhancedProof?.gapPercent??null,
  enhancedProofMs,
  workerStatus:worker.status,workerComplete:worker.status==='feasible-uncertified',
  workerMs,workerNodes:worker.nodes??null,
  incumbent,witnessValue,witnessDominates,
  minimumKnownRelativeLossPercent:witnessDominates?
   100*(incumbent-witnessValue)/incumbent:0,
  certifiedStatus:cert?.status??'no-complete-plan',
  certifiedOptimal:cert?.proven===true,
  lowerBound:cert?.lowerBound??null,
  certifiedGapPercent:cert?.gapPercent??null,
  certMs,
  maxRSSKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null};
 console.log(JSON.stringify(row));
}
// Independent tiny oracle: heterogeneous prices create different
// optimal physical plans for count, gross area and purchase cost.
function objectiveCounterexample(){
 const common={material:'panel|contrast',category:'panel',
  t:18,rotate:false,grain:'length'};
 const data={parts:[0,1].map(i=>({...common,
  id:'p'+i,label:'p'+i,order:i,l:40,w:60})),
  stocks:[{...common,id:'large',l:88,w:66,qty:1,
   price:150,priceUnit:'panel',order:0},
  {...common,id:'small',l:46,w:66,qty:2,
   price:40,priceUnit:'panel',order:1}],kerf:2,trim:3,m3:25000};
 const {window,engine}=loadEngine();
 const left={x:3,y:3,w:82,h:60};
 const cut={number:1,label:'Independent width split',
  source:left,axis:'vertical',at:44,
  x1:44,y1:3,x2:44,y2:63};
 const big={bins:[{stock:data.stocks[0],cuts:[cut],free:[],
  placed:[{...data.parts[0],x:3,y:3,w:40,h:60,rotated:false},
   {...data.parts[1],x:45,y:3,w:40,h:60,rotated:false}]}],
  unplaced:[],placedCount:2,cost:150,stockArea:5808,
  partArea:4800,unknownCostBins:0};
 const small={bins:data.parts.map(p=>({stock:data.stocks[1],
  cuts:[],free:[],placed:[{...p,x:3,y:3,w:40,h:60,rotated:false}]})),
  unplaced:[],placedCount:2,cost:80,stockArea:6072,
  partArea:4800,unknownCostBins:0};
 verify(big,data,engine);verify(small,data,engine);
 const oracle=require('./optimization-oracle.cjs');
 const candidates=[];
 for(let qBig=0;qBig<=1;qBig++)for(let qSmall=0;qSmall<=2;qSmall++){
  const subset={...data,stocks:[{...data.stocks[0],qty:qBig},
   {...data.stocks[1],qty:qSmall}]};
  const result=oracle.solve(subset,'guillotine',{maxNodes:1200000});
  assert.notEqual(result.status,'unknown','Tiny oracle exhausted budget');
  if(result.status==='optimal')
   candidates.push({count:qBig+qSmall,area:5808*qBig+3036*qSmall,
    cost:150*qBig+40*qSmall});
 }
 const expected={
  count:Math.min(...candidates.map(c=>c.count)),
  area:Math.min(...candidates.map(c=>c.area)),
  cost:Math.min(...candidates.map(c=>c.cost))
 };
 assert.deepEqual(expected,{count:1,area:5808,cost:80});
 for(const objective of objectives){
  const chosen=objective==='cost'?small:big;
  assert.equal(metric(chosen,objective),expected[objective]);
  const proof=window.BeythausOptimalityCertificate.certify(chosen,data,{
   objective,auditOK:true,priceMode:'panel',m3:25000,
   maxMs:900,maxStates:30000});
  if(proof.proven)assert.equal(proof.lowerBound,expected[objective]);
  const wrong=objective==='cost'?big:small;
  assert(metric(wrong,objective)>expected[objective]);
  const other=window.BeythausOptimalityCertificate.certify(wrong,data,{
   objective,auditOK:true,priceMode:'panel',m3:25000,maxMs:900});
  assert(!other.proven,'False proof on objectively inferior valid plan');
 }
 const missing={...data,stocks:data.stocks.map(s=>s.id==='small'?
  {...s,price:null}:s)};
 const costProof=window.BeythausOptimalityCertificate.certify(big,missing,{
  objective:'cost',auditOK:true,priceMode:'panel',m3:25000,maxMs:900});
 assert.equal(costProof.status,'unknown-price');
 const areaProof=window.BeythausOptimalityCertificate.certify(big,missing,{
  objective:'area',auditOK:true,priceMode:'panel',m3:25000,maxMs:900});
 assert.notEqual(areaProof.status,'unknown-price');
 return {expected,knownPhysicalCutTrees:2,oracleStockQuantityCases:6,
  physicallyFeasibleCombinations:candidates.length,
  incompleteAndUnknownNotCertified:true,unknownPriceGuard:true};
}
function percentile(a,p){
 const x=[...a].sort((v,w)=>v-w);
 return x.length?x[Math.min(x.length-1,Math.ceil(p*x.length)-1)]:null;
}
function main(){
 const independentCounterexample=objectiveCounterexample();
 const rows=[];
 for(const family of families)for(const N of sizes)
  for(const objective of objectives){
   const c=spawnSync(process.execPath,[__filename,'--case',family,String(N),objective],
    {encoding:'utf8',timeout:11000,maxBuffer:2*1024*1024});
   assert.equal(c.error,undefined,'Child hang/crash '+family+'/'+N+'/'+objective+' '+c.error);
   assert.equal(c.status,0,'Stress child failed '+family+'/'+N+'/'+objective+
    '\n'+(c.stderr||'')+'\n'+(c.stdout||''));
   const row=JSON.parse(c.stdout.trim().split('\n').at(-1));
   rows.push(row);
   console.log('COMMERCIAL-STRESS-ROW '+JSON.stringify(row));
  }
 const measured=rows.filter(r=>r.knownFeasible);
 const impossible=rows.filter(r=>r.mathematicallyImpossibleByArea);
 assert.equal(rows.length,families.length*sizes.length*objectives.length);
 assert(measured.every(r=>r.witnessValue!==null),'Planted physical witness missing');
 assert(impossible.every(r=>!r.baselineComplete&&!r.enhancedComplete&&!r.workerComplete),
  'Area-impossible job reported production-ready');
 const grouped=families.map(family=>{
  const q=rows.filter(r=>r.family===family);
  return {family,cases:q.length,Ns:sizes,
   baselineComplete:q.filter(r=>r.baselineComplete).length,
   enhancedComplete:q.filter(r=>r.enhancedComplete).length,
   productionComplete:q.filter(r=>r.productionComplete).length,
   enhancedGloballyCertified:q.filter(r=>r.enhancedCertifiedOptimal).length,
   enhancedKnownWitnessLoss:q.filter(r=>r.enhancedWitnessDominates).length,
   workerComplete:q.filter(r=>r.workerComplete).length,
   globallyCertified:q.filter(r=>r.certifiedOptimal).length,
   demonstrablyWorseThanPhysicalWitness:q.filter(r=>r.witnessDominates).length,
   p95BaselineMs:percentile(q.map(r=>r.baselineMs),.95),
   peakRSSKiB:Math.max(...q.map(r=>r.maxRSSKiB||0))};
 });
 const report={schemaVersion:2,environment:{node:process.version,
  platform:process.platform,arch:process.arch},
  source:'shipped production optimizer/constructive Worker and two independent physical auditors',
  fixturePolicy:'positive kerf=3mm, trim=2mm, planted 4-cut full-span trees, 5 stock dimension motifs; no universal input cap',
  objectives,Ns:sizes,families,independentCounterexample,
  result:{cases:rows.length,plantedFeasibleCases:measured.length,
   plantedBaselineComplete:measured.filter(r=>r.baselineComplete).length,
   plantedEnhancedComplete:measured.filter(r=>r.enhancedComplete).length,
   plantedProductionComplete:measured.filter(r=>r.productionComplete).length,
   plantedEnhancedGloballyProven:measured.filter(r=>r.enhancedCertifiedOptimal).length,
   plantedEnhancedWitnessLosses:measured.filter(r=>r.enhancedWitnessDominates).length,
   plantedWorkerComplete:measured.filter(r=>r.workerComplete).length,
   plantedGloballyProven:measured.filter(r=>r.certifiedOptimal).length,
   demonstrableHeuristicLosses:measured.filter(r=>r.witnessDominates).length,
   independentAreaImpossibleCases:impossible.length,
   incorrectImpossibleFullPlans:impossible.filter(r=>r.baselineComplete||r.enhancedComplete||r.workerComplete).length,
   p50BaselineMs:percentile(rows.map(r=>r.baselineMs),.5),
   p95BaselineMs:percentile(rows.map(r=>r.baselineMs),.95),
   maxRSSKiB:Math.max(...rows.map(r=>r.maxRSSKiB||0))},
  grouped,rows};
 if(process.env.MOTOR_COMMERCIAL_STRESS_JSON)
  fs.writeFileSync(process.env.MOTOR_COMMERCIAL_STRESS_JSON,
   JSON.stringify(report,null,2)+'\n');
 console.log('COMMERCIAL-STRESS-SUMMARY '+JSON.stringify(report.result));
 console.log('COMMERCIAL-STRESS-BY-CLASS '+JSON.stringify(grouped));
 console.log('COMMERCIAL-STRESS-ORACLE '+JSON.stringify(independentCounterexample));
}
if(process.argv[2]==='--case')child();else main();
