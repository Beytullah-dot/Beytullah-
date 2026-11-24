'use strict';
const L=require('../../independent-b1/lib.js'),G=require('../../independent-b1/gen.js'),fs=require('fs'),path=require('path');
const {engine}=L.loadEngine();const out=path.resolve(__dirname,'../results');
let checked=0,found=0;
for(const fam of ['generic','dense','hetero','grain'])for(let seed=910000;seed<915000;seed++){
 const data=G.family(fam,seed);data.allowNarrowScrapCuts=true;
 for(const objective of ['area','cost']){
  const plan=engine.optimize(structuredClone(data),true,false,objective==='area'?'area':'economic');checked++;
  if(!plan.unplaced.length)continue;
  const oracle=L.oracle(data,{sliver:'relaxed'});if(!oracle.feasible)continue;
  const w=L.loadWorker('constructive-worker.js');w.onmessage({data:{type:'construct',requestId:1,mode:'guillotine',objective,priceMode:'panel',m3:null,data:structuredClone(data)}});
  const r=w.result;if(r?.plan&&!r.plan.unplaced.length&&L.verifyPlan(data,r.plan).ok)continue;
  const record={seed,family:fam,objective,data,initialPlan:plan,constructive:r,oracle:{count:oracle.count,area:oracle.area,cost:oracle.cost},solve:'not launched: no complete incumbent',economy:'not launched: no complete incumbent'};
  fs.writeFileSync(path.join(out,`missed-${fam}-${seed}-${objective}.json`),JSON.stringify(record,null,2));console.log(JSON.stringify({fam,seed,objective,unplaced:plan.unplaced.length,constructive:r?.status}),{flush:true});found++;
 }
 if(checked%1000===0)console.log(JSON.stringify({checked,found,fam,seed}));
 if(found>=4)process.exit(0);
}
console.log(JSON.stringify({checked,found}));
