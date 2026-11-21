/* Beythaus Cut — exact PHYSICAL full-span horizontal guillotine class.
 * RESEARCH ONLY: not wired to the production optimizer/certifier.
 *
 * All eligible boards MUST have usable width equal to the common,
 * nonrotatable part width. Every feasible physical tree is then a
 * horizontal 1D cutting pattern; no general-2D claim is made.
 * Exhaustive bounded pattern cover proves the minimum registered cost,
 * gross area or count ONLY on completion. Any exceeded state/time/
 * precision budget returns UNKNOWN, never an optimum/infeasibility claim.
 */
(function(root){
'use strict';
const POLICY=root.BeythausMaterialPolicy;
const spent=()=>Date.now();
const unknown=(status,detail={})=>({status,objectiveValue:null,plan:null,...detail});
function solve(parts,stocks,{trim=0,kerf=0,objective='cost',
 priceMode='panel',m3=25000,maxStates=12000,maxNodes=450000,
 maxMs=1500}={}){
 const begun=spent(),end=begun+maxMs;
 let nodes=0,patternsCreated=0,states=0,peakMemo=0;
 const meta=()=>({nodes,patternsCreated,states,peakMemo,elapsedMs:spent()-begun});
 const bail=status=>unknown(status,meta());
 if(!POLICY||!Array.isArray(parts)||!parts.length||
    !Array.isArray(stocks)||!['cost','area','count'].includes(objective)||
    !Number.isFinite(trim)||trim<0||!Number.isFinite(kerf)||kerf<0||
    !Number.isFinite(maxMs)||maxMs<0||!Number.isFinite(maxStates)||
    maxStates<1||!Number.isFinite(maxNodes)||maxNodes<1)
  return bail('unknown-input');
 if(maxMs===0)return bail('unknown-limit');
 const ids=new Set();
 for(const p of parts){
  if(!p||typeof p.id!=='string'||ids.has(p.id)||
     !Number.isFinite(p.l)||p.l<=0||!Number.isFinite(p.w)||p.w<=0||
     p.grain==='width'||(p.rotate&&p.grain!=='length'))
   return bail('unknown-class');
  ids.add(p.id);
 }
 const width=parts[0].l,material=parts[0].material;
 if(parts.some(p=>p.l!==width||p.material!==material))
  return bail('unknown-class');
 for(const s of stocks){
  if(!s||!Number.isFinite(s.l)||!Number.isFinite(s.w)||
     !Number.isSafeInteger(s.qty)||s.qty<0)
   return bail('unknown-input');
 }
 // Exclude a board only when no part can physically fit even once.
 // All retained stock options must have the EXACT full-span width;
 // a wider board would permit general 2D geometry, so no proof here.
 const eligible=[];
 for(const s of stocks){
  if(!s.qty||s.l<=2*trim||s.w<=2*trim)continue;
  const matching=parts.filter(p=>p.material===s.material&&
   (p.t==null||(s.t!=null&&Number.isFinite(s.t)&&
    Math.abs(p.t-s.t)<=1e-6)));
  if(!matching.length)continue;
  if(s.l-2*trim<width||matching.every(p=>p.w>s.w-2*trim))
   continue;
  if(s.l-2*trim!==width||
     matching.length!==parts.length)
   return bail('unknown-class');
  eligible.push(s);
 }
 if(!eligible.length)return bail('infeasible-class');
 // Preserve decimal measurements exactly on a common finite grid.
 // Unsupported precision is a proof-budget UNKNOWN, never rounding.
 const values=[trim,kerf,...parts.flatMap(p=>[p.l,p.w]),
  ...eligible.flatMap(s=>[s.l,s.w])];
 let scale=1;
 for(const x of values){
  if(!Number.isFinite(x)||x<0)return bail('unknown-input');
  let factor=1,found=false;
  for(let n=0;n<=6;n++,factor*=10){
   const v=Math.round(x*factor);
   if(Number.isSafeInteger(v)&&v/factor===x){scale=Math.max(scale,factor);found=true;break}
  }
  if(!found)return bail('unknown-precision');
 }
 const integer=x=>{
  const v=Math.round(x*scale);
  return Number.isSafeInteger(v)&&v/scale===x?v:null;
 };
 const k=integer(kerf),t=integer(trim),W=integer(width);
 if(k===null||t===null||W===null)return bail('unknown-precision');
 const heightMap=new Map();
 for(const p of parts){
  const h=integer(p.w);
  if(h===null||h<=0)return bail('unknown-precision');
  if(!heightMap.has(h))heightMap.set(h,[]);
  heightMap.get(h).push(p);
 }
 const heights=[...heightMap.keys()].sort((a,b)=>b-a);
 const lists=heights.map(h=>heightMap.get(h));
 const demand=lists.map(a=>a.length);
 const totalDemand=demand.reduce((sum,x)=>sum+x,0);
 const boardTypes=[];
 for(const stock of eligible){
  const H=integer(stock.w)-2*t;
  if(!Number.isSafeInteger(H)||H<=0)return bail('unknown-precision');
  const unit=objective==='area'?stock.l*stock.w:
   objective==='count'?1:POLICY.stockPrice(stock,{priceMode,m3});
  if(unit===null)return bail('unknown-price');
  if(!Number.isFinite(unit)||unit<0)return bail('unknown-input');
  boardTypes.push({stock,H,unit,qty:Math.min(stock.qty,totalDemand),patterns:[]});
 }
 let limited=false;
 function tick(){
  nodes++;
  if(nodes>maxNodes||((nodes&127)===0&&spent()>=end)){limited=true;return false}
  return true
 }
 function enumerate(ti){
  const board=boardTypes[ti],vector=demand.map(()=>0);
  function visit(i,occupied,count){
   if(!tick())return false;
   if(i===demand.length){
    if(!count)return true;
    // H = sum(h_i) + (count-1)*k + residual.
    // Positive residual smaller than kerf cannot be separated by a saw.
    const residual=board.H+k-occupied;
    if(residual<0||residual>0&&residual<k)return true;
    board.patterns.push({counts:vector.slice(),used:occupied,residual,count});
    patternsCreated++;
    if(patternsCreated>maxStates*4){limited=true;return false}
    return true
   }
   const step=heights[i]+k;
   const available=Math.floor((board.H+k-occupied)/step);
   if(!Number.isSafeInteger(available))return false;
   const max=Math.min(demand[i],Math.max(0,available));
   for(let q=0;q<=max;q++){
    vector[i]=q;
    if(!visit(i+1,occupied+q*step,count+q))return false;
   }
   vector[i]=0;
   return true
  }
  return visit(0,0,0)
 }
 for(let i=0;i<boardTypes.length;i++){
  if(spent()>=end||!enumerate(i))return bail('unknown-limit');
 }
 const memo=new Map();
 const key=(rest,qty)=>rest.join(',')+'|'+qty.join(',');
 function search(rest,qty){
  if(!tick()||spent()>=end){limited=true;return null}
  const pivot=rest.findIndex(n=>n>0);
  if(pivot<0)return {value:0,choice:null};
  const kk=key(rest,qty);
  if(memo.has(kk))return memo.get(kk);
  if(memo.size>=maxStates){limited=true;return null}
  let best={value:Infinity,choice:null};
  for(let i=0;i<boardTypes.length;i++){
   if(!qty[i])continue;
   for(const pattern of boardTypes[i].patterns){
    if(!pattern.counts[pivot]||
       pattern.counts.some((v,j)=>v>rest[j]))continue;
    const rem=rest.map((v,j)=>v-pattern.counts[j]),left=qty.slice();
    left[i]--;
    const sub=search(rem,left);
    if(sub===null)return null;
    const next=boardTypes[i].unit+sub.value;
    if(next<best.value)
     best={value:next,choice:{type:i,pattern}};
   }
  }
  memo.set(kk,best);states++;
  peakMemo=Math.max(peakMemo,memo.size);
  return best
 }
 const quantities=boardTypes.map(t=>t.qty);
 const solution=search(demand,quantities);
 if(limited||solution===null)return bail('unknown-limit');
 if(!Number.isFinite(solution.value))return bail('infeasible-class');
 // Reconstruct the actual full-edge tree with original piece identities.
 const used=lists.map(()=>0),bins=[],remaining=demand.slice();
 const qty=quantities.slice();
 while(remaining.some(v=>v>0)){
  const solutionState=memo.get(key(remaining,qty));
  if(!solutionState||!solutionState.choice)return bail('unknown-reconstruction');
  const {type,pattern}=solutionState.choice,board=boardTypes[type];
  const stock=board.stock,H=board.H/scale,P=W/scale;
  const chosen=[];
  pattern.counts.forEach((count,i)=>{
   for(let j=0;j<count;j++)chosen.push(lists[i][used[i]++]);
   remaining[i]-=count
  });
  qty[type]--;
  let leaf={x:trim,y:trim,w:P,h:H};
  const bin={stock,placed:[],cuts:[],free:[]};
  const split=(span)=>{
   const at=leaf.y+span+kerf/2,src={...leaf};
   bin.cuts.push({source:src,axis:'horizontal',at,
    number:bin.cuts.length+1,label:'Exact full-span guillotine',
    x1:src.x,y1:at,x2:src.x+src.w,y2:at});
   const kept={x:src.x,y:src.y,w:src.w,h:span};
   leaf={x:src.x,y:src.y+span+kerf,w:src.w,h:src.h-span-kerf};
   return kept
  };
  for(let i=0;i<chosen.length;i++){
   const p=chosen[i],last=i===chosen.length-1;
   let r;
   if(!last||leaf.h>p.w){
    r=split(p.w);
   }else r=leaf;
   bin.placed.push({...p,x:r.x,y:r.y,w:p.l,h:p.w,rotated:false});
  }
  if(leaf.h>0)bin.free.push(leaf);
  bins.push(bin);
 }
 const plan={bins,unplaced:[],placedCount:parts.length,
  partArea:parts.reduce((sum,p)=>sum+p.l*p.w,0),
  stockArea:bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0),
  cost:bins.reduce((sum,b)=>{const v=POLICY.stockPrice(b.stock,{priceMode,m3});
   return sum===null||v===null?null:sum+v},0),
  unknownCostBins:bins.filter(b=>POLICY.stockPrice(b.stock,{priceMode,m3})===null).length};
 return {status:'optimal-physical-class',objectiveValue:solution.value,plan,
  model:'fixed-full-span-horizontal',...meta()};
}
const api=Object.freeze({version:1,solve});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausFullSpanPatternExact=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
