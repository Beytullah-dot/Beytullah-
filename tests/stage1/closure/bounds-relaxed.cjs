'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const L=require('../../independent-b1/lib.js'),G=require('../../independent-b1/gen.js');
const {engine,window}=L.loadEngine(),C=window.BeythausOptimalityCertificate,rows=[],coverage={};
const methods=['kerfExpandedAreaCover','thresholdCardinalityCover','pairedAreaCardinalityCover','multipleThresholdAreaCover','tripleThresholdAreaCover'];
function check(name,value,optimum,caseId,obj){if(!Number.isFinite(value))return;assert(value<=optimum+1e-7,JSON.stringify({name,value,optimum,caseId,obj}));coverage[name]=(coverage[name]||0)+1;}
const cases=[];
for(const family of ['generic','grain','dense'])for(let seed=970000;seed<970100;seed++)cases.push({caseId:family+'-'+seed,data:G.family(family,seed)});
function fixture(id,spec,W,H,k){return {caseId:id,data:L.mkData(spec.map(([l,w],i)=>L.mkPart(i,l,w,{rotate:false})),[L.mkStock(0,W,H,8,10)],k,0)}}
cases.push(fixture('seven-types',[[2,2],[2,3],[3,3],[3,4],[4,4],[4,5],[5,5]],12,12,1));
for(let n=1;n<=8;n++)cases.push(fixture('fullspan-'+n,Array.from({length:n},()=>[12,8]),12,29,3));
for(const {caseId,data}of cases){
 data.allowNarrowScrapCuts=true;const oracle=L.oracle(data,{sliver:'relaxed'});if(!oracle.feasible)continue;
 const record={caseId,oracle:{count:oracle.count,area:oracle.area,cost:oracle.cost},bounds:{}};
 for(const objective of ['count','area','cost'])for(const method of methods){
  const b=C[method](data.parts,data.stocks,data.trim,data.kerf,{objective,priceMode:'panel',m3:null,maxMs:1000,maxStates:120000});
  if(b.status==='optimal-relaxation'){check(method,b.lowerBound,oracle[objective],caseId,objective);record.bounds[method+'/'+objective]=b.lowerBound;}
 }
 const count=engine.minStockCountLowerBound(data);
 for(const key of ['kerfAreaLowerBound','halfSpanLowerBound','incompatibilityLowerBound','itemCapacityLowerBound']){
  const value=count.details.reduce((n,d)=>n+d[key],0);check(key,value,oracle.count,caseId,'count');record.bounds[key]=value;
 }
 const f=window.BeythausFullSpanPatternExact.solve(data.parts,data.stocks,{trim:data.trim,kerf:data.kerf,allowNarrowScrapCuts:true,objective:'count',priceMode:'panel',maxMs:1000,maxStates:120000});
 if(f.status==='optimal-physical-class'){check('fullSpan',f.objectiveValue,oracle.count,caseId,'count');assert.equal(f.objectiveValue,oracle.count);assert(L.verifyPlan(data,f.plan).ok);record.bounds.fullSpan=f.objectiveValue;}
 rows.push(record);
}
for(const name of [...methods,'kerfAreaLowerBound','halfSpanLowerBound','incompatibilityLowerBound','itemCapacityLowerBound','fullSpan'])assert(coverage[name]>0,name);
fs.writeFileSync(path.join(__dirname,'../results/bounds-relaxed.json'),JSON.stringify({inputCases:cases.length,feasibleCases:rows.length,coverage,violations:0,rows},null,2));console.log({inputCases:cases.length,feasibleCases:rows.length,coverage,violations:0});
