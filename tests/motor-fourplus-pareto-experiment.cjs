/* Four- and five-threshold Pareto frontier RESEARCH ONLY.
 * This deliberately is not imported by the production certificate.
 * Pairwise dominance requires ALL resource dimensions plus objective,
 * never a weighted sum. Any incomplete search returns UNKNOWN.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const win={};
for(const name of ['engine/material-policy.js','engine/optimality-certificate.js'])
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../docs',name),'utf8'),
  {window:win},{filename:name});
const proof=win.BeythausOptimalityCertificate;
const base={material:'panel|pareto',category:'panel',t:18,rotate:false,grain:'length'};
const item=(id,l,w)=>({...base,id,l,w});
const board=(id,l,w,qty,price)=>({...base,id,l,w,qty,price,priceUnit:'panel'});
const rss=()=>process.platform==='linux'?process.resourceUsage().maxRSS:null;
const mem=()=>({heapUsedBytes:process.memoryUsage().heapUsed,rssBytes:process.memoryUsage().rss,maxRssKiB:rss()});
function model(parts,stocks,k,trim=2,kerf=3){
 const edges=[...new Set(parts.map(p=>Math.min(p.l,p.w)))].sort((a,b)=>b-a).slice(0,k);
 if(edges.length<k)return null;
 const need=[parts.reduce((a,p)=>a+p.l*p.w,0),
  ...edges.map(t=>parts.filter(p=>Math.min(p.l,p.w)>=t).length)];
 const types=stocks.map(s=>{
  const W=s.l-2*trim,H=s.w-2*trim;
  const capacity=[W>0&&H>0?W*H:0,
   ...edges.map(t=>W>0&&H>0?Math.floor((W+kerf)/(t+kerf))*
    Math.floor((H+kerf)/(t+kerf)):0)];
  return {...s,capacity};
 });
 return {need,types,edges}
}
function objectiveUnit(s,objective){
 return objective==='area'?s.l*s.w:objective==='cost'?s.price:1;
}
function exhaustive(m,objective){
 let best=Infinity,enumerated=0;
 function visit(i,resources,cost){
  if(i===m.types.length){
   enumerated++;
   if(resources.every((x,j)=>x>=m.need[j]))best=Math.min(cost,best);
   return
  }
  const t=m.types[i],unit=objectiveUnit(t,objective);
  for(let q=0;q<=t.qty;q++)
   visit(i+1,resources.map((x,j)=>x+q*t.capacity[j]),
    cost+q*unit)
 }
 visit(0,m.need.map(()=>0),0);
 return {best,enumerated}
}
function solve(m,objective,{maxStates=10000,maxMs=2000}={}){
 const start=performance.now(),before=mem(),deadline=start+maxMs;
 const unknown=(reason,peakStates=0,peakRaw=0,comparisons=0)=>
  ({status:reason,lowerBound:null,peakStates,peakRaw,comparisons,
   elapsedMs:performance.now()-start,memoryBefore:before,memoryAfter:mem()});
 if(!m||!['cost','area','count'].includes(objective))return unknown('invalid');
 if(maxMs<=0)return unknown('unknown-limit');
 if(m.types.some(t=>t.qty<0||!Number.isSafeInteger(t.qty)||
  !Number.isFinite(objectiveUnit(t,objective))||
  objectiveUnit(t,objective)<0))return unknown('invalid');
 // For proof of optimality it is enough to explore bounded exact stock
 // multiplicities. Capped resource coordinates preserve dominance.
 let states=[{r:m.need.map(()=>0),v:0}],peakStates=1,peakRaw=1,comparisons=0;
 const dominates=(a,b)=>a.v<=b.v&&
  a.r.every((v,j)=>v>=b.r[j]);
 for(const t of m.types){
  if(performance.now()>=deadline)return unknown('unknown-limit',
    peakStates,peakRaw,comparisons);
  const expanded=[];
  for(const st of states)for(let q=0;q<=t.qty;q++){
   expanded.push({r:st.r.map((v,j)=>Math.min(m.need[j],v+q*t.capacity[j])),
    v:st.v+q*objectiveUnit(t,objective)});
   if(expanded.length>maxStates*8)return unknown('unknown-limit',
    peakStates,expanded.length,comparisons);
  }
  peakRaw=Math.max(peakRaw,expanded.length);
  expanded.sort((a,b)=>a.v-b.v);
  const frontier=[];
  for(const st of expanded){
   let isDominated=false;
   for(let i=0;i<frontier.length;i++){
    comparisons++;
    if(dominates(frontier[i],st)){isDominated=true;break}
    if((comparisons&1023)===0&&performance.now()>=deadline)
     return unknown('unknown-limit',peakStates,peakRaw,comparisons);
   }
   if(isDominated)continue;
   // Needed for theoretical correctness when a later state dominates
   // an earlier one, though ascending objective order reduces it.
   for(let i=frontier.length-1;i>=0;i--){
    comparisons++;
    if(dominates(st,frontier[i]))frontier.splice(i,1);
   }
   frontier.push(st);
   if(frontier.length>maxStates||performance.now()>=deadline)
    return unknown('unknown-limit',
     Math.max(peakStates,frontier.length),peakRaw,comparisons);
  }
  states=frontier;peakStates=Math.max(peakStates,states.length);
 }
 let optimal=Infinity;
 for(const st of states)if(st.r.every((v,j)=>v>=m.need[j]))
  optimal=Math.min(optimal,st.v);
 return {status:Number.isFinite(optimal)?'optimal-relaxation':
  'infeasible-relaxation',lowerBound:Number.isFinite(optimal)?optimal:null,
  peakStates,peakRaw,comparisons,elapsedMs:performance.now()-start,
  memoryBefore:before,memoryAfter:mem()};
}
let matches=0,unsafe=0,oracleEnumerations=0,unknownSmall=0;
const smallStatus={};
for(let seed=1;seed<=18;seed++){
 const specs=[[65+seed%3,60],[50,48+seed%3],[40,35+seed%3],
  [30+seed%4,27],[20,18+seed%3]];
 const parts=specs.flatMap(([l,w],i)=>Array.from({length:1+(seed+i)%3},
  (_,j)=>item('p'+i+'-'+j,l,w)));
 const original=[
  board('A',110+seed%13,80+seed%9,2,45+seed%11),
  board('B',90+seed%6,125+seed%8,2,50+seed%12),
  board('C',58+seed%9,140+seed%10,2,39+seed%10),
  board('D',155+seed%8,95+seed%7,2,69+seed%13),
  board('E',80+seed%13,180+seed%11,2,63+seed%14)
 ];
 const fit=proof.geometryCompatibleStockTypes(parts,original,2,3);
 assert.equal(fit.status,'complete');
 for(const k of [4,5]){
  const m=model(parts,fit.stocks,k);
  for(const objective of ['cost','area','count']){
   const ref=exhaustive(m,objective);
   const got=solve(m,objective,{maxStates:15000,maxMs:2000});
   oracleEnumerations+=ref.enumerated;
   smallStatus[got.status]=(smallStatus[got.status]||0)+1;
   if(got.status==='optimal-relaxation'){
    if(got.lowerBound>ref.best)unsafe++;
    assert.equal(got.lowerBound,ref.best,
     'Pareto exact stock multiset '+seed+'/'+k+'/'+objective);
    matches++;
   }else if(got.status==='infeasible-relaxation'){
    assert.equal(ref.best,Infinity);
    matches++;
   }else unknownSmall++;
  }
 }
}
assert.equal(unsafe,0);
assert(matches>0,'Research must independently confirm some finished relaxations');
// The historical 44/305 scenarios are physically audited elsewhere.
// This is only a new stock-cover stress. Their physical incumbents supply
// upper bounds for any fully completed relaxation, never optimum claims.
const s44=[[80,80,3],[60,50,5],[45,45,8],[30,30,12],[18,18,16]];
const p44=s44.flatMap(([l,w,n],i)=>Array.from({length:n},
 (_,j)=>item('P'+i+'-'+j,l,w)));
const b44=s44.map(([l,w,n],i)=>board('strip'+i,l+15,n*w+(n-1)*3+15,1,80+10*i));
b44.push(board('alternative1',200,200,3,150),board('alternative2',110,330,4,110),
 board('alternative3',65,900,2,175));
const s305=[[85,85,20],[60,60,35],[40,40,50],[22,22,80],[12,12,120]];
const p305=s305.flatMap(([l,w,n],i)=>Array.from({length:n},
 (_,j)=>item('R'+i+'-'+j,l,w)));
const b305=s305.map(([l,w,n],i)=>board('long'+i,l+15,n*w+(n-1)*3+15,1,110+45*i));
const competing=[[100,230,8,54],[110,270,8,61],[95,330,8,64],
 [125,240,8,70],[155,255,8,88],[180,300,8,103],
 [95,600,8,95],[230,180,8,76],[145,420,8,96],
 [180,400,8,125],[250,350,8,144],[310,240,8,130]];
competing.forEach(([l,w,qty,price],i)=>b305.push(board('comp'+i,l,w,qty,price)));
const stress=[];
for(const test of [{name:'old44',parts:p44,stocks:b44,trim:2,kerf:3,
 incumbents:{cost:500,area:99174}},
 {name:'old305',parts:p305,stocks:b305,trim:2,kerf:3,
 incumbents:{cost:1000,area:585753}}]){
 const kept=proof.geometryCompatibleStockTypes(test.parts,test.stocks,
  test.trim,test.kerf);
 const row={name:test.name,parts:test.parts.length,
  originalTypes:test.stocks.length,eligibleTypes:kept.stocks.length,
  discarded:kept.removed,objectives:{}};
 for(const k of [4,5])for(const objective of ['cost','area']){
  const m=model(test.parts,kept.stocks,k,test.trim,test.kerf);
  const runs=[];
  for(const [maxStates,maxMs] of [[100,70],[600,300],[2000,900]]){
   const result=solve(m,objective,{maxStates,maxMs});
   if(result.status==='optimal-relaxation')
    assert(result.lowerBound<=test.incumbents[objective],
     'Completed relaxation cannot exceed verified physical incumbent');
   runs.push({maxStates,maxMs,status:result.status,
    lowerBound:result.lowerBound,peakStates:result.peakStates,
    peakRaw:result.peakRaw,comparisons:result.comparisons,
    elapsedMs:result.elapsedMs,maxRssKiB:result.memoryAfter.maxRssKiB});
  }
  row.objectives[k+'-'+objective]=runs;
 }
 stress.push(row);
}
const report={scope:'EXPERIMENT ONLY — no production certificate changes',
 independentOracle:{cases:18,objectives:108,matches,unsafe,
  unknownSmall,oracleEnumerations,statuses:smallStatus},
 stress,process:mem(),safety:'All resource coordinates + objective are required for dominance. Timeout and state overflow are UNKNOWN.'};
if(process.env.MOTOR_FOURPLUS_JSON)
 fs.writeFileSync(process.env.MOTOR_FOURPLUS_JSON,JSON.stringify(report,null,2));
console.log('Four-plus Pareto study: '+JSON.stringify(report));
