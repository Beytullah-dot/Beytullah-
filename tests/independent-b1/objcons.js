'use strict';
const L=require('./lib.js'),G=require('./gen.js'),GB=require('./gen-big.js');
const {engine}=L.loadEngine();let n=0,areaWorse=0,costWorse=0,countWorse=0,ex=[];
const clone=o=>JSON.parse(JSON.stringify(o));
function go(data,tag){
  const P={};for(const [k,o] of [['count','minimum'],['area','area'],['cost','economic']]){const p=engine.optimize(clone(data),true,false,o);const v=L.verifyPlan(data,p);if(!v.ok||!v.complete)return;P[k]=v}
  n++;
  if(P.cost.area<P.area.area-1e-9){areaWorse++;if(ex.length<3)ex.push({tag,kind:'area-objective plan has more area than cost-objective plan',a:P.area.area,c:P.cost.area})}
  if(P.area.cost<P.cost.cost-1e-9){costWorse++;if(ex.length<6)ex.push({tag,kind:'cost-objective plan costs more than area-objective plan',a:P.area.cost,c:P.cost.cost})}
  for(const o of ['area','cost'])if(P[o].count<P.count.count){countWorse++;}
}
for(const f of ['generic','hetero','dense'])for(let s=0;s<600;s++)go(G.family(f,930000+s),f+s);
for(let s=0;s<80;s++)go(GB.big(6000+s,{K:2}),'k2-'+(6000+s));
console.log(JSON.stringify({n,areaWorse,costWorse,minimumPlanUsesMoreSheetsThanAnother:countWorse,ex}));
