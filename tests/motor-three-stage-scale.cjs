/* Beythaus Cut — isolated three-stage search-budget/RSS research.
 * RESEARCH ONLY: does not connect to production Worker or certificate.
 * Every case has a deliberately constructible physical VH-V pattern.
 * UNKNOWN is allowed, general infeasibility and optimum are NOT inferred.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const {spawnSync}=require('node:child_process');

const MATERIAL='panel|three-stage-scale';
const motifMixed=[[8,16],[14,16],[10,16],[12,16],
 [9,16],[13,16],[7,16],[15,16]];
const motifRepeated=Array.from({length:8},()=>[11,16]);
const stockDims=[[52,36,100],[54,38,114],[56,40,129],[60,42,157]];
const budgets={
 tight:{maxMs:800,maxNodes:12000,maxPatterns:1500,maxStates:2500},
 expanded:{maxMs:1600,maxNodes:80000,maxPatterns:12000,maxStates:12000}
};
function fixture(family,boardCount){
 const motif=family==='mixed'?motifMixed:motifRepeated;
 const common={category:'panel',material:MATERIAL,t:18,grain:'length',rotate:false};
 const parts=[];
 for(let board=0;board<boardCount;board++)
  for(let i=0;i<motif.length;i++)
   parts.push({...common,id:'p'+board+'-'+i,label:'p'+board+'-'+i,
    l:motif[i][0],w:motif[i][1]});
 const stocks=stockDims.map(([l,w,price],i)=>({...common,id:'s'+i,
  l,w,price,priceUnit:'panel',qty:Math.floor(boardCount/4)+(i<boardCount%4?1:0)}));
 assert.equal(stocks.reduce((n,s)=>n+s.qty,0),boardCount);
 // Every stock has at least 50 x 34 usable (1 mm trim per side).
 // V strips: 24+2+24=50; H bands: 16+2+16=34;
 // third-stage V parts: each adjacent pair sums to 22 (+2 kerf).
 return {parts,stocks,opts:{trim:1,kerf:2}};
}
function child(){
 const family=process.argv[3],boardCount=Number(process.argv[4]);
 const objective=process.argv[5],budgetName=process.argv[6];
 assert(['mixed','repeated'].includes(family));
 assert(['cost','area','count'].includes(objective));
 assert(Object.hasOwn(budgets,budgetName));
 assert(Number.isSafeInteger(boardCount)&&boardCount>0);
 const {parts,stocks,opts}=fixture(family,boardCount);
 const window={},docs=path.join(__dirname,'../docs');
 for(const file of ['engine/material-policy.js','engine/three-stage-nested-exact.js',
  'engine/production-audit.js','engine/cutting-engine.js'])
  vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
   {window},{filename:file});
 const solver=window.BeythausThreeStageNestedExact;
 assert(solver&&solver.version===1);
 const started=performance.now();
 const result=solver.solve(parts,stocks,{...opts,objective,...budgets[budgetName]});
 const wallMs=performance.now()-started;
 assert(['optimal-three-stage-class','unknown-limit'].includes(result.status),
  'Planted physical job cannot establish infeasibility: '+result.status);
 let independentlyAudited=false;
 if(result.status==='optimal-three-stage-class'){
  assert(result.plan&&result.plan.bins.length);
  const engine=window.BeythausCutEngine.createEngine({
   getState:()=>({mode:'guillotine'}),mkey:s=>String(s||'').toLowerCase(),
   val:Number,fmt:Number
  });
  const audited=engine.auditCutPlan(result.plan,{parts,stocks,...opts,m3:25000});
  assert.equal(audited.ok,true,'Production tree audit: '+audited.issues);
  const independent=require('./optimization-oracle.cjs').audit({
   parts,stocks,...opts},result.plan,'guillotine');
  assert.equal(independent.ok,true,'Independent tree audit: '+independent.issues);
  independentlyAudited=true;
 }
 const mem=process.memoryUsage(),ru=process.resourceUsage();
 const row={family,boardCount,partCount:parts.length,
  cataloguedStockTypes:stocks.length,
  availableStockTypes:stocks.filter(s=>s.qty>0).length,
  positiveKerfMm:opts.kerf,trimMm:opts.trim,objective,budget:budgetName,
  status:result.status,wallMs:Math.round(wallMs*1000)/1000,
  maxRSSKiB:process.platform==='linux'?ru.maxRSS:null,
  rssAtEndBytes:mem.rss,heapUsedAtEndBytes:mem.heapUsed,
  nodes:result.nodes,patternsCreated:result.patternsCreated,
  shelvesCreated:result.shelvesCreated,stripsCreated:result.stripsCreated,
  boardGenerations:result.boardGenerations,dpTransitions:result.dpTransitions,
  exactDPStates:result.states,peakMemo:result.peakMemo,
  independentlyAudited};
 console.log(JSON.stringify(row));
}
function main(){
 const started=performance.now(),rows=[];
 // Increasing demand; no hard user input ceiling is introduced.
 for(const family of ['repeated','mixed'])
  for(const boardCount of [1,5,25])
   for(const budget of ['tight','expanded'])
    for(const objective of ['cost','area']){
     const args=[__filename,'--case',family,String(boardCount),objective,budget];
     const outcome=spawnSync(process.execPath,args,{encoding:'utf8',
      timeout:12000,maxBuffer:1024*1024});
     assert.equal(outcome.status,0,
      'Isolated process failed: '+args.slice(2).join(' ')+'\n'+
      (outcome.stderr||'')+'\n'+(outcome.stdout||'')+'\n'+outcome.error);
     rows.push(JSON.parse(outcome.stdout.trim().split('\n').at(-1)));
    }
 assert.equal(rows.length,24);
 assert(rows.some(r=>r.status==='optimal-three-stage-class'&&r.independentlyAudited),
  'Must retain at least one physical audited exact solution');
 assert(rows.every(r=>r.status==='optimal-three-stage-class'||r.status==='unknown-limit'));
 const report={
  scope:'canonical VH-V/HV-H only; resource study, never a global proof',
  environment:{platform:process.platform,node:process.version},
  budgets,fixtures:'all 24 planted physical jobs, 2 mm kerf, 1 mm trim',
  exactClassSolved:rows.filter(r=>r.status==='optimal-three-stage-class').length,
  budgetUnknown:rows.filter(r=>r.status==='unknown-limit').length,
  audited:rows.filter(r=>r.independentlyAudited).length,
  rows,elapsedMs:performance.now()-started
 };
 if(process.env.MOTOR_THREE_STAGE_SCALE_JSON)
  fs.writeFileSync(process.env.MOTOR_THREE_STAGE_SCALE_JSON,
   JSON.stringify(report,null,2)+'\n');
 for(const r of rows)
  console.log('3-STAGE-SCALE '+JSON.stringify(r));
 console.log('3-STAGE-SCALE-SUMMARY '+JSON.stringify({
  exactClassSolved:report.exactClassSolved,budgetUnknown:report.budgetUnknown,
  audited:report.audited,elapsedMs:report.elapsedMs}));
}
if(process.argv[2]==='--case')child();else main();
