'use strict';
const L=require('./lib.js'),G=require('./gen.js'),fs=require('fs');
const [,, famArg='generic', seed0s='1000', countS='200', outFile]=process.argv;
const seed0=Number(seed0s),count=Number(countS);
const {window,engine,state}=L.loadEngine();
const CERT=window.BeythausOptimalityCertificate;
const engObj={count:'minimum',area:'area',cost:'economic'};
const sum={n:0,oracleFeasible:0,oracleInfeasible:0,engineCompleteWhenInfeasible:0,invalidPlans:0,
  missed:{strict:0,relaxed:0},
  suboptimal:{count:0,area:0,cost:0},suboptimalStrict:{count:0,area:0,cost:0},
  claims:{count:0,area:0,cost:0},falseOptimal:[],falseOptimalRelaxedOnly:[],auditDisagree:0,exceptions:0,
  stockProofClaims:0,stockProofFalse:[]};
const out=[];const t0=Date.now();
function clone(o){return JSON.parse(JSON.stringify(o))}
for(let i=0;i<count;i++){
  const seed=seed0+i,data=family_(seed);
  function family_(s){return famArg==='planted'?G.planted(s):G.family(famArg,s)}
  sum.n++;
  const rel=L.oracle(data,{sliver:'relaxed'}),str=L.oracle(data,{sliver:'strict'});
  if(rel.feasible)sum.oracleFeasible++;else sum.oracleInfeasible++;
  for(const obj of ['count','area','cost']){
    let plan,d=clone(data);
    try{plan=engine.optimize(d,true,false,engObj[obj])}catch(e){sum.exceptions++;out.push({seed,fam:famArg,obj,kind:'exception',msg:String(e.stack||e).slice(0,300)});continue}
    const v=L.verifyPlan(data,plan);
    const eaudit=engine.auditCutPlan(plan,data);
    if(eaudit.ok!==v.ok&&plan.bins.length){ // disagreement between shipped audit and independent verifier
      sum.auditDisagree++;out.push({seed,fam:famArg,obj,kind:'audit-disagree',shipped:eaudit.ok,mine:v.ok,mineErr:v.errors.slice(0,3),shippedErr:eaudit.issues.slice(0,3)});
    }
    if(!v.ok){sum.invalidPlans++;out.push({seed,fam:famArg,obj,kind:'invalid-plan',errors:v.errors.slice(0,4)});continue}
    if(v.complete&&!rel.feasible){sum.engineCompleteWhenInfeasible++;out.push({seed,fam:famArg,obj,kind:'oracle-says-infeasible-but-engine-complete'});}
    if(!v.complete){
      if(str.feasible){sum.missed.strict++;out.push({seed,fam:famArg,obj,kind:'missed-feasible-strict',unplaced:plan.unplaced.length})}
      else if(rel.feasible){sum.missed.relaxed++;out.push({seed,fam:famArg,obj,kind:'missed-feasible-relaxed-only',unplaced:plan.unplaced.length})}
      continue;
    }
    const val=obj==='count'?v.count:obj==='area'?v.area:v.cost;
    const optRel=rel[obj],optStr=str[obj];
    if(optStr!==null&&optStr!==undefined&&val>optStr+1e-9)sum.suboptimalStrict[obj]++;
    if(optRel!==null&&optRel!==undefined&&val>optRel+1e-9)sum.suboptimal[obj]++;
    // ---- certificate claims exactly as the UI path builds them
    const audit=eaudit;plan.stockProof=engine.certifyStockCount(plan,data,audit);
    if(obj==='count'&&plan.stockProof.proven){
      sum.stockProofClaims++;
      if(optStr!==null&&val>optStr+1e-9)sum.stockProofFalse.push({seed,fam:famArg,val,optStr,optRel});
    }
    const c=CERT.certify(plan,clone(data),{objective:obj,auditOK:true,priceMode:'panel',m3:25000,maxMs:2500,maxStates:120000,allowMaterialAssignment:false});
    if(c.proven){
      sum.claims[obj]++;
      const o={seed,fam:famArg,obj,claimedOptimum:val,oracleStrict:optStr,oracleRelaxed:optRel,method:c.method};
      if(optStr!==null&&optStr!==undefined&&val>optStr+1e-9)sum.falseOptimal.push(o);
      else if(optRel!==null&&optRel!==undefined&&val>optRel+1e-9)sum.falseOptimalRelaxedOnly.push(o);
    }
  }
}
sum.ms=Date.now()-t0;
console.log(JSON.stringify({fam:famArg,seed0,...sum,falseOptimal:sum.falseOptimal.length,falseOptimalRelaxedOnly:sum.falseOptimalRelaxedOnly.length,stockProofFalse:sum.stockProofFalse.length}));
if(sum.falseOptimal.length)console.log('FALSE-OPTIMAL(strict):',JSON.stringify(sum.falseOptimal.slice(0,5)));
if(sum.falseOptimalRelaxedOnly.length)console.log('false-optimal vs relaxed only:',JSON.stringify(sum.falseOptimalRelaxedOnly.slice(0,3)));
if(outFile)fs.writeFileSync(outFile,out.map(x=>JSON.stringify(x)).join('\n'));
