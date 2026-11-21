/* Beythaus Cut — lazy/anytime THREE-STAGE physical constructive research.
 * RESEARCH ONLY. No Worker, production, certificate or inventory integration.
 * Emits feasible (NOT optimal) complete VH-V / HV-H nested cut-tree candidates.
 * Builds bands/strips on demand; it never enumerates all board patterns.
 * Resource exhaustion with no complete plan is UNKNOWN, not infeasibility.
 */
(function(root){
'use strict';
const POLICY=root.BeythausMaterialPolicy;
const fail=(status,meta={})=>({status,plan:null,objectiveValue:null,...meta});
function solve(parts,stocks,opts={}){
 const {trim=0,kerf=0,objective='cost',priceMode='panel',m3=25000,
  maxMs=1200,maxNodes=120000,maxCandidates=6,maxSeeds=12,
  onCandidate=null}=opts;
 const began=Date.now(),deadline=began+maxMs;
 let nodes=0,attempts=0,completeCandidates=0,boardProbes=0,
  bandsBuilt=0,stripsBuilt=0,resourceExhausted=false,best=null;
 const meta=()=>({nodes,attempts,completeCandidates,boardProbes,
  bandsBuilt,stripsBuilt,elapsedMs:Date.now()-began,resourceExhausted,
  proof:'none',researchOnly:true});
 const bail=status=>fail(status,meta());
 if(!POLICY||!Array.isArray(parts)||!parts.length||!Array.isArray(stocks)||
  !['cost','area','count'].includes(objective)||
  ![trim,kerf,maxMs,maxNodes,maxCandidates,maxSeeds].every(Number.isFinite)||
  trim<0||kerf<0||maxMs<0||!Number.isSafeInteger(maxNodes)||maxNodes<1||
  !Number.isSafeInteger(maxCandidates)||maxCandidates<1||
  !Number.isSafeInteger(maxSeeds)||maxSeeds<1||
  (onCandidate!==null&&typeof onCandidate!=='function'))return bail('unknown-input');
 if(maxMs===0)return bail('unknown-limit');
 const LIMIT={};
 const tick=()=>{
  nodes++;
  if(nodes>maxNodes||((nodes&127)===0&&Date.now()>=deadline)){
   resourceExhausted=true;throw LIMIT;
  }
 };
 const ids=new Set();
 for(const p of parts){
  if(!p||typeof p.id!=='string'||ids.has(p.id)||
   !Number.isFinite(p.l)||p.l<=0||!Number.isFinite(p.w)||p.w<=0||
   typeof p.material!=='string'||!p.material||
   (p.t!=null&&(!Number.isFinite(p.t)||p.t<=0)))return bail('unknown-input');
  ids.add(p.id);
  // This restricted model never rotates pieces (including square pieces).
  if(p.grain==='width'||(p.rotate&&p.grain!=='length'))
   return bail('unknown-class');
 }
 for(const s of stocks){
  if(!s||typeof s.id!=='string'||!Number.isFinite(s.l)||s.l<=0||
   !Number.isFinite(s.w)||s.w<=0||
   !Number.isSafeInteger(s.qty)||s.qty<0||
   (s.t!=null&&(!Number.isFinite(s.t)||s.t<=0)))return bail('unknown-input');
 }
 // All dimensions are integerized WITHOUT rounding physical constraints.
 const values=[trim,kerf,...parts.flatMap(p=>[p.l,p.w]),
  ...stocks.flatMap(s=>[s.l,s.w])];
 let scale=1;
 for(const x of values){
  let found=false,f=1;
  for(let d=0;d<=6;d++,f*=10){
   if(Number.isSafeInteger(Math.round(x*f))&&Math.round(x*f)/f===x){
    scale=Math.max(scale,f);found=true;break;
   }
  }
  if(!found)return bail('unknown-precision');
 }
 const integer=x=>{
  const v=Math.round(x*scale);
  return Number.isSafeInteger(v)&&v/scale===x?v:null;
 };
 const k=integer(kerf),t=integer(trim);
 if(k===null||t===null)return bail('unknown-precision');
 const ps=parts.map((p,i)=>({p,i,l:integer(p.l),w:integer(p.w)}));
 const compatible=(p,s)=>p.material===s.material&&
  (p.category==null||s.category==null||p.category===s.category)&&
  (p.t==null||(s.t!=null&&Math.abs(p.t-s.t)<=1e-6));
 const bs=[];
 for(const s of stocks){
  if(!s.qty||s.l<=2*trim||s.w<=2*trim)continue;
  const W=integer(s.l)-2*t,H=integer(s.w)-2*t;
  if(W<=0||H<=0)return bail('unknown-precision');
  const candidates=ps.filter(x=>compatible(x.p,s)&&x.l<=W&&x.w<=H);
  if(!candidates.length)continue;
  const unit=POLICY.stockPrice(s,{priceMode,m3});
  if(objective==='cost'&&unit===null)return bail('unknown-price');
  if(unit!==null&&(!Number.isFinite(unit)||unit<0))return bail('unknown-input');
  bs.push({s,W,H,unit,candidates,qty:s.qty});
 }
 if(!bs.length)return bail('unknown-no-candidate');
 const validResidual=x=>x===0||x>=k;
 const toMm=x=>x/scale;
 const compare=(a,b)=>{
  if(!b)return true;
  if(a.value!==b.value)return a.value<b.value;
  return a.plan.bins.length<b.plan.bins.length;
 };
 function constructBin(board,available,VH,half,reverse){
  boardProbes++;
  const A=VH?board.W:board.H,B=VH?board.H:board.W;
  const pool=board.candidates.filter(x=>available.has(x.i)).map(x=>({
   ...x,a:VH?x.l:x.w,b:VH?x.w:x.l
  }));
  if(!pool.length)return null;
  const taken=new Set(),strips=[];
  let remA=A;
  // On-demand band choice, not an exhaustive list of patterns.
  function chooseBand(target,roomB,exactResidual){
   const usable=pool.filter(x=>!taken.has(x.i)&&x.a<=target&&
    x.b<=roomB&&validResidual(roomB-x.b));
   if(!usable.length)return null;
   usable.sort((x,y)=>reverse?x.a-y.a||x.b-y.b||x.i-y.i:
    y.a-x.a||y.b-x.b||x.i-y.i);
   const seeds=[],distinct=new Set();
   for(const p of usable){
    const key=p.a+':'+p.b;
    if(!distinct.has(key)){seeds.push(p);distinct.add(key);}
    if(seeds.length>=maxSeeds)break;
   }
   let winner=null;
   for(const seed of seeds){
    tick();
    const chosen=[seed],local=new Set([seed.i]);
    let used=seed.a;
    for(;;){
     let add=null;
     for(const p of usable){
      tick();
      if(p.b!==seed.b||local.has(p.i))continue;
      const next=used+k+p.a,rest=target-next;
      if(next>target||rest!==0&&rest<k)continue;
      if(!add||p.a>add.a||(p.a===add.a&&p.i<add.i))add=p;
     }
     if(!add)break;
     chosen.push(add);local.add(add.i);used+=k+add.a;
    }
    if(exactResidual&&!validResidual(target-used))continue;
    const score=used*seed.b;
    if(!winner||score>winner.score||
      score===winner.score&&chosen.length>winner.pieces.length)
     winner={pieces:chosen,height:seed.b,used,score};
   }
   return winner;
  }
  while(remA>0){
   tick();
   // Half-width seeding is particularly useful for heterogeneous widths.
   const target=half&&remA>2*k?
    Math.floor((remA-k)/2):remA;
   let first=chooseBand(target,B,false);
   if(!first&&target!==remA)first=chooseBand(remA,B,false);
   if(!first)break;
   let width=first.used;
   if(!validResidual(remA-width)){
    // Consume the whole current leaf only if the bands can still be cut.
    if(!validResidual(remA-first.used))break;
    width=remA;
   }
   const bands=[first];
   first.pieces.forEach(x=>taken.add(x.i));bandsBuilt++;
   let remB=B-first.height;
   while(remB>=k){
    tick();
    const room=remB-k;
    if(room<=0)break;
    const next=chooseBand(width,room,true);
    if(!next)break;
    bands.push(next);next.pieces.forEach(x=>taken.add(x.i));bandsBuilt++;
    remB=room-next.height;
   }
   strips.push({width,bands});stripsBuilt++;
   const rest=remA-width;
   if(rest===0)break;
   if(rest<k)break;
   remA=rest-k;
  }
  if(!strips.length)return null;
  // Materialize a live-leaf cut tree. All geometry uses exact integer units.
  const rect=(x,y,w,h)=>({x:toMm(x),y:toMm(y),w:toMm(w),h:toMm(h)});
  const bin={stock:board.s,placed:[],cuts:[],free:[]};
  const cut=(src,axis,length)=>{
   const vertical=axis==='vertical',extent=vertical?src.w:src.h;
   const left=extent-length-k;
   if(length<=0||left<0)throw new Error('Invalid constructed full-edge cut');
   const before=vertical?{x:src.x,y:src.y,w:length,h:src.h}:
    {x:src.x,y:src.y,w:src.w,h:length};
   const after=vertical?{x:src.x+length+k,y:src.y,w:left,h:src.h}:
    {x:src.x,y:src.y+length+k,w:src.w,h:left};
   const at=toMm((vertical?src.x:src.y)+length+k/2);
   const source=rect(src.x,src.y,src.w,src.h);
   bin.cuts.push({source,axis,at,number:bin.cuts.length+1,
    label:'Lazy research full-edge',
    x1:vertical?at:source.x,y1:vertical?source.y:at,
    x2:vertical?at:source.x+source.w,
    y2:vertical?source.y+source.h:at});
   return {before,after};
  };
  const firstAxis=VH?'vertical':'horizontal';
  const bandAxis=VH?'horizontal':'vertical';
  const dimension=(r,axis)=>axis==='vertical'?r.w:r.h;
  const addFree=r=>{if(r&&r.w>0&&r.h>0)
   bin.free.push(rect(r.x,r.y,r.w,r.h));};
  function take(src,axis,length){
   const delta=dimension(src,axis)-length;
   if(delta===0)return {piece:src,rest:null};
   if(delta<k)throw new Error('Kerf sliver in constructed plan');
   const v=cut(src,axis,length);
   return {piece:v.before,rest:dimension(v.after,axis)>0?v.after:null};
  }
  let outer={x:t,y:t,w:board.W,h:board.H};
  for(const strip of strips){
   const stage1=take(outer,firstAxis,strip.width);
   let bandLeaf=stage1.piece;
   for(const band of strip.bands){
    const stage2=take(bandLeaf,bandAxis,band.height);
    let partLeaf=stage2.piece;
    for(const x of band.pieces){
     const pieceStage=take(partLeaf,firstAxis,x.a);
     const r=pieceStage.piece;
     bin.placed.push({...x.p,x:toMm(r.x),y:toMm(r.y),
      w:x.p.l,h:x.p.w,rotated:false});
     partLeaf=pieceStage.rest;
    }
    addFree(partLeaf);bandLeaf=stage2.rest;
   }
   addFree(bandLeaf);outer=stage1.rest;
  }
  addFree(outer);
  return {bin,taken,area:bin.placed.reduce((v,p)=>v+p.l*p.w,0)};
 }
 function attempt(style){
  const available=new Set(ps.map(p=>p.i));
  const quantities=bs.map(x=>x.qty),bins=[];
  const half=style%2===0,reverse=style%3===2;
  while(available.size){
   tick();
   let choice=null;
   for(let j=0;j<bs.length;j++){
    if(!quantities[j])continue;
    const board=bs[j];
    for(const VH of [true,false]){
     const r=constructBin(board,available,VH,half,reverse);
     if(!r)continue;
     const n=r.taken.size;
     const density=r.area/(board.s.l*board.s.w);
     const price=board.unit===null?Number.POSITIVE_INFINITY:board.unit;
     // Search priority only. Neither an exact ordering nor a certificate.
     const priority=objective==='cost'?n/(1+price):
      objective==='area'?n/(board.s.l*board.s.w):n;
     const score=priority+1e-9*density;
     if(!choice||score>choice.score)choice={...r,j,score};
    }
   }
   if(!choice)return null;
   bins.push(choice.bin);
   choice.taken.forEach(i=>available.delete(i));
   quantities[choice.j]--;
  }
  const cost=bins.reduce((sum,b)=>{
   const v=POLICY.stockPrice(b.stock,{priceMode,m3});
   return sum===null||v===null?null:sum+v;
  },0);
  const plan={bins,unplaced:[],placedCount:parts.length,
   partArea:parts.reduce((sum,p)=>sum+p.l*p.w,0),
   stockArea:bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0),
   cost,unknownCostBins:bins.filter(b=>POLICY.stockPrice(b.stock,
    {priceMode,m3})===null).length};
  return {plan,value:objective==='cost'?cost:
   objective==='area'?plan.stockArea:bins.length};
 }
 try{
  for(let style=0;style<maxCandidates;style++){
   tick();attempts++;
   const c=attempt(style);
   if(!c)continue;
   completeCandidates++;
   if(compare(c,best)){
    best=c;
    if(onCandidate)onCandidate({status:'feasible-uncertified',
     plan:c.plan,objectiveValue:c.value,proof:'none',
     researchOnly:true,attempt:attempts});
   }
  }
 }catch(e){if(e!==LIMIT)throw e;}
 if(!best)return bail(resourceExhausted?'unknown-limit':'unknown-no-candidate');
 return {status:'feasible-uncertified',plan:best.plan,
  objectiveValue:best.value,model:'lazy-three-stage-VH-V-or-HV-H',
  ...meta()};
}
const api=Object.freeze({version:1,solve});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausThreeStageLazyResearch=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
