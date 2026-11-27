'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const L=require('../independent-b1/lib.js'),G=require('../independent-b1/gen.js'),B=require('../independent-b1/gen-big.js'),O=require('../independent-b1/pareto.js');
const out=path.join(__dirname,'results');fs.mkdirSync(out,{recursive:true});
if(process.argv[2]==='child'){
 const {data,objective}=JSON.parse(fs.readFileSync(0,'utf8'));const {engine}=L.loadEngine();const start=performance.now();
 const initial=engine.optimize(data,true,false,objective==='cost'?'economic':objective==='count'?'minimum':objective),oldMs=performance.now()-start;
 const legacy=L.loadWorker('constructive-worker.js');
 const job={type:'construct',requestId:1,mode:'guillotine',objective,priceMode:'panel'};
 const baseline={...data,enableMultiplicitySolver:false};
 if(initial.unplaced.length)legacy.onmessage({data:{...job,data:baseline}});
 const old=legacy.result?.plan||initial;
 const w=L.loadWorker('advanced-search-worker.js');w.onmessage({data:{type:'construct',requestId:1,mode:'guillotine',objective,priceMode:'panel',data,incumbent:old}});
 const r=w.result,newPlan=r.plan||old;console.log(JSON.stringify({old,newPlan,response:r,oldMs,totalMs:performance.now()-start,rssMiB:process.resourceUsage().maxRSS/1024}));process.exit();
}
// Project files and omitted API fields must never opt into the research Worker.
for(const flag of [undefined,false,null,'true']){
 const worker=L.loadWorker('advanced-search-worker.js');
 const data=flag===undefined?{}:{enableMultiplicitySolver:flag};
 worker.onmessage({data:{mode:'guillotine',data}});
 assert.equal(worker.result.status,'disabled');
 assert.equal(worker.result.plan,null);
}
{

 // A one-state budget must be hard even while seeding rotated leaves.
 const limitData={...L.mkData([L.mkPart(0,18,5),L.mkPart(1,18,5)],[L.mkStock(0,40,30,2,1200)],1,0),enableMultiplicitySolver:true};
 const limitJob={type:'construct',requestId:42,mode:'guillotine',objective:'count',priceMode:'panel',data:limitData};
 const normal=L.loadWorker('advanced-search-worker.js');normal.onmessage({data:limitJob});
 assert.equal(normal.result.status,'feasible-uncertified');
 const limited=L.loadWorker('advanced-search-worker.js');
 const direct=limited.BeythausMultiplicitySearch.solve(limitData,{maxStates:1,objective:'count'});
 assert.equal(direct.states,1);assert.equal(direct.limitReached,true);assert.equal(direct.limitReason,'maxStates');
 limited.onmessage({data:{...limitJob,maxStates:1,incumbent:normal.result.plan}});
 assert.equal(limited.result.limitReached,true);assert(limited.result.limitReasons.includes('maxStates'));
 assert.equal(limited.result.proof,'none');assert.equal(limited.result.status,'feasible-uncertified');
 assert.equal(L.verifyPlan(limitData,limited.result.plan).complete,true);
 assert(limited.result.plan.bins.length<=normal.result.plan.bins.length);
 console.log('Hard maxStates=1, external limit metadata and incumbent preservation passed.');
}
const failures=[],rows=[],cases=[];
for(const seed of [912041,913243])cases.push({id:String(seed),data:JSON.parse(fs.readFileSync(path.join(__dirname,`../stage1/results/missed-generic-${seed}-area.json`))).data,oracle:'small'});
cases.push({id:'B2',data:L.mkData([...Array.from({length:11},(_,i)=>L.mkPart(i,18,5,{rotate:true})),...Array.from({length:2},(_,i)=>L.mkPart(i+11,18,11,{rotate:true}))],[L.mkStock(0,28,35,6,980),L.mkStock(1,28,29,3,812),L.mkStock(2,25,33,6,825)],0,1),oracle:'big'});
const count=Number(process.env.CASES||20);
for(let i=0;i<count;i++)cases.push({id:'big-'+(980000+i),data:B.big(980000+i),oracle:'big'});
for(let i=0;i<count;i++)cases.push({id:'small-'+(981000+i),data:G.family('generic',981000+i),oracle:'small'});
for(const c of cases)for(const narrow of [false,true]){
 const data={...c.data,allowNarrowScrapCuts:narrow,enableMultiplicitySolver:true};
 const oracle=c.oracle==='small'?L.oracle(data,{sliver:narrow?'relaxed':'strict'}):O.solve(data,{sliver:narrow?'relaxed':'strict'});
 for(const objective of ['count','area','cost']){
  const child=spawnSync(process.execPath,[__filename,'child'],{input:JSON.stringify({data,objective}),encoding:'utf8',timeout:5000,maxBuffer:8*1024*1024});
  let r;try{assert.equal(child.status,0,child.stderr||String(child.error));r=JSON.parse(child.stdout)}catch(e){failures.push({id:c.id,narrow,objective,error:e.message,data});continue}
  const {engine}=L.loadEngine(),v=L.verifyPlan(data,r.newPlan),a=engine.auditCutPlan(r.newPlan,data),oldV=L.verifyPlan(data,r.old);
  const metric=p=>objective==='count'?p.bins.length:objective==='area'?p.stockArea:p.cost;
  const oldU=oldV.complete?metric(r.old):null,newU=v.complete?metric(r.newPlan):null,lb=r.response.lowerBound??null;
  const row={id:c.id,narrow,objective,oracleFeasible:oracle.feasible,oracle:oracle[objective]??null,oldU,newU,lowerBound:lb,
   oldGapLB:oldU!==null&&lb>0?100*(oldU-lb)/lb:null,newGapLB:newU!==null&&lb>0?100*(newU-lb)/lb:null,
   oldGapOracle:oldU!==null&&oracle[objective]>0?100*(oldU-oracle[objective])/oracle[objective]:null,newGapOracle:newU!==null&&oracle[objective]>0?100*(newU-oracle[objective])/oracle[objective]:null,
   valid:v.ok,auditor:a.ok,status:r.response.status,invalidCandidates:r.response.invalidCandidates??0,disagreement:r.response.validatorDisagreements??0,oldMs:r.oldMs,totalMs:r.totalMs,rssMiB:r.rssMiB};rows.push(row);
  if(!v.ok||a.ok!==v.ok||r.response.status==='search-error'||row.disagreement||oldU!==null&&(newU===null||newU>oldU+1e-7)||lb!==null&&oracle.feasible&&lb>oracle[objective]+1e-7||oracle.feasible&&newU===null){const f={...row,data,response:r.response};failures.push(f);fs.writeFileSync(path.join(out,`failure-${c.id}-${narrow}-${objective}.json`),JSON.stringify(f,null,2));}
 }
 fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({rows,failures},null,2));console.log(c.id,narrow,rows.slice(-3).map(r=>[r.objective,r.oldU,r.newU,r.oracle,r.status]));
}
console.log('FAILURES',failures.length);if(failures.length)process.exitCode=1;
