/* Beythaus Cut v1 B — isolated real Node/Linux RSS for the DEPLOYED
 * bounded constructive Worker. This is not a mobile/iPhone measurement.
 * UNKNOWN is never counted as an infeasible or optimum certificate.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const root=path.join(__dirname,'..'),docs=path.join(root,'docs');
const source=p=>fs.readFileSync(path.join(docs,p),'utf8');
const widths=[8,14,10,12,9,13,7,15];
function fixture(family,count,priceKnown=true){
 const material='panel|live-benchmark',common={
  material,category:'panel',t:18,grain:'length',rotate:false};
 const parts=Array.from({length:count},(_,i)=>({...common,
  id:'part-'+i,label:'Part '+i,l:family==='mixed'?widths[i%8]:11,w:16}));
 const dims=[[52,36,100],[54,38,114],[56,40,129],[60,42,157]];
 const boards=Math.ceil(count/8);
 const stocks=dims.map(([l,w,price],i)=>({...common,id:'stock-'+i,l,w,
  price:priceKnown?price:null,priceUnit:'panel',
  qty:Math.floor(boards/4)+(i<boards%4?1:0)}));
 return {parts,stocks,trim:1,kerf:2,m3:null};
}
if(process.argv[2]==='--child'){
 const [, , ,family,countRaw,objective,priceKnownRaw]=process.argv;
 const data=fixture(family,Number(countRaw),priceKnownRaw==='true');
 const snapshot=JSON.stringify(data);
 const scope={out:null,postMessage(message){this.out=message}};
 let sandbox;
 sandbox=vm.createContext({self:scope,window:scope,console,
  importScripts(...paths){
   for(const file of paths){
    assert(!file.includes('..'));
    vm.runInContext(source(file.replace(/^\.\//,'')),sandbox,{filename:file});
   }
  }});
 vm.runInContext(source('constructive-worker.js'),sandbox,{filename:'constructive-worker.js'});
 const started=performance.now();
 scope.onmessage({data:{type:'construct',requestId:17,mode:'guillotine',
  objective,priceMode:'panel',m3:null,data}});
 const wallMs=performance.now()-started,output=scope.out;
 assert(output&&output.type==='construct-finished');
 assert.equal(output.requestId,17);
 assert.equal(output.proof,'none');
 assert.equal(output.researchOnly,true);
 assert.equal(JSON.stringify(data),snapshot,'deployed Worker must not mutate input');
 const legitimate=['feasible-uncertified','unknown-limit','unknown-no-candidate',
  'unknown-class','unknown-price','unknown-precision','unknown-input'];
 assert(legitimate.includes(output.status),'unknown-error would be a test failure: '+output.status);
 let productionAudit=null,independentAudit=null,cuts=0;
 if(output.status==='feasible-uncertified'){
  assert(output.plan&&output.plan.unplaced.length===0);
  assert.equal(output.plan.placedCount,data.parts.length);
  const engine=require('./engine-harness.cjs').createEngine(
   {mode:'guillotine',priceMode:'panel'},Number,
   v=>String(v||'').toLocaleLowerCase('tr-TR'),Number);
  productionAudit=engine.auditCutPlan(output.plan,data);
  independentAudit=require('./optimization-oracle.cjs').audit(data,output.plan,'guillotine');
  assert.equal(productionAudit.ok,true,'physical production audit: '+productionAudit.issues);
  assert.equal(independentAudit.ok,true,'independent oracle: '+independentAudit.issues);
  cuts=output.plan.bins.reduce((n,b)=>n+b.cuts.length,0);
  if(!priceKnown)assert.equal(output.plan.cost,null);
 }else assert.equal(output.plan,null,'UNKNOWN may not leak partial plan');
 const measured={family,count:data.parts.length,objective,priceKnown,
  status:output.status,proof:output.proof,physicalAudit:productionAudit?.ok??null,
  independentAudit:independentAudit?.ok??null,
  bins:output.plan?.bins.length??null,cuts,
  nodes:output.nodes??null,elapsedMs:output.elapsedMs??null,
  workerAndAuditWallMs:Math.round(wallMs*1000)/1000,
  maxRSSKiB:process.platform==='linux'?process.resourceUsage().maxRSS:null,
  nodeVersion:process.version,platform:process.platform,arch:process.arch};
 process.stdout.write(JSON.stringify(measured)+'\n');
 process.exit(0);
}
const cases=[];
for(const family of ['repeated','mixed'])
 for(const count of [8,40,200,500,1000]){
  cases.push({family,count,objective:'cost',priceKnown:true});
  if(count<=40)cases.push({family,count,objective:'area',priceKnown:true});
 }
cases.push({family:'mixed',count:8,objective:'area',priceKnown:false});
cases.push({family:'mixed',count:8,objective:'cost',priceKnown:false});
const rows=[],t0=performance.now();
for(const c of cases){
 const params=['--child',c.family,String(c.count),c.objective,String(c.priceKnown)];
 const child=spawnSync(process.execPath,[__filename,...params],{
  encoding:'utf8',timeout:8500,maxBuffer:2*1024*1024});
 assert.equal(child.error,undefined,'isolated worker hung/crashed: '+JSON.stringify(c));
 assert.equal(child.status,0,'isolated worker failed for '+JSON.stringify(c)+
  '\n'+(child.stderr||'')+'\n'+(child.stdout||''));
 const row=JSON.parse(child.stdout.trim().split('\n').at(-1));
 assert.equal(row.count,c.count);
 assert(row.maxRSSKiB===null||row.maxRSSKiB>0);
 if(!c.priceKnown&&c.objective==='cost')
  assert.equal(row.status,'unknown-price');
 rows.push(row);
 console.log('LIVE-WORKER-SCALE '+JSON.stringify(row));
}
const feasible=rows.filter(r=>r.status==='feasible-uncertified');
const unknown=rows.filter(r=>r.status.startsWith('unknown'));
assert(feasible.length>=2,'small regression candidates must remain constructible');
assert.equal(feasible.length+unknown.length,rows.length,'no new status class');
const report={scope:'deployed constructed Worker + independent production and separate oracle; no global optimum proof',
 runKind:'synthetic isolated Node child processes, not Safari or physical workshop',
 fixedResourceBudget:{maxMs:1300,maxNodes:120000,maxCandidates:4,maxSeeds:12,
  watchdogMs:8500,positiveKerfMm:2,trimPerEdgeMm:1},
 platform:process.platform,node:process.version,
 cases:rows.length,feasible:feasible.length,unknown:unknown.length,
 totalWallMs:Math.round((performance.now()-t0)*1000)/1000,
 observedMaxRSSKiB:Math.max(...rows.map(r=>r.maxRSSKiB||0)),
 rows};
if(process.env.MOTOR_LIVE_CONSTRUCTIVE_SCALE_JSON)
 fs.writeFileSync(process.env.MOTOR_LIVE_CONSTRUCTIVE_SCALE_JSON,JSON.stringify(report,null,2)+'\n');
console.log('LIVE-WORKER-SCALE-SUMMARY '+JSON.stringify({
 cases:report.cases,feasible:report.feasible,unknown:report.unknown,
 totalWallMs:report.totalWallMs,observedMaxRSSKiB:report.observedMaxRSSKiB
}));
