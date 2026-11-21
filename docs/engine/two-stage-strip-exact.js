/* Beythaus Cut — bounded exact TWO-STAGE guillotine strip-pattern class.
 * RESEARCH ONLY. Not imported by the production proof Worker.
 *
 * VH: first vertical cuts form strips, then only horizontal cuts within each
 * strip; each piece spans its strip's full width. HV is the transpose.
 * All parts retain their specified orientation. The generated pattern set is
 * COMPLETE for this canonical two-stage class, not for unrestricted 2D cuts.
 * In particular, an infeasible result is NOT general cutting infeasibility.
 * A budget/precision/class failure is UNKNOWN; never a lower-bound proof.
 */
(function(root){
'use strict';
const POLICY=root.BeythausMaterialPolicy;
const fail=(status,meta={})=>({status,objectiveValue:null,plan:null,...meta});
function solve(parts,stocks,opts={}){
 const {trim=0,kerf=0,objective='cost',priceMode='panel',m3=25000,
  maxMs=2000,maxNodes=500000,maxStates=15000,maxPatterns=18000}=opts;
 const began=Date.now(),deadline=began+maxMs;
 let nodes=0,patternsCreated=0,states=0,peakMemo=0,limited=false;
 const meta=()=>({nodes,patternsCreated,states,peakMemo,elapsedMs:Date.now()-began});
 const bail=status=>fail(status,meta());
 if(!POLICY||!Array.isArray(parts)||!parts.length||!Array.isArray(stocks)||
  !['cost','area','count'].includes(objective)||
  ![trim,kerf,maxMs,maxNodes,maxStates,maxPatterns].every(Number.isFinite)||
  trim<0||kerf<0||maxMs<0||maxNodes<1||maxStates<1||maxPatterns<1)
  return bail('unknown-input');
 if(maxMs===0)return bail('unknown-limit');
 const tick=()=>{
  nodes++;
  if(nodes>maxNodes||((nodes&127)===0&&Date.now()>=deadline)){
   limited=true;return false;
  }
  return true;
 };
 const seen=new Set();
 for(const p of parts){
  if(!p||typeof p.id!=='string'||seen.has(p.id)||
   !Number.isFinite(p.l)||p.l<=0||!Number.isFinite(p.w)||p.w<=0||
   typeof p.material!=='string'||!p.material||
   (p.t!=null&&(!Number.isFinite(p.t)||p.t<=0)))return bail('unknown-input');
  // Width-grain requires 90deg, which is intentionally outside this class.
  // A declared rotation permission is harmless if length-grain forbids use.
  if(p.grain==='width'||(p.rotate&&p.grain!=='length'))return bail('unknown-class');
  seen.add(p.id);
 }
 for(const s of stocks){
  if(!s||typeof s.id!=='string'||!Number.isFinite(s.l)||s.l<=0||
   !Number.isFinite(s.w)||s.w<=0||
   !Number.isSafeInteger(s.qty)||s.qty<0||
   (s.t!=null&&(!Number.isFinite(s.t)||s.t<=0)))return bail('unknown-input');
 }
 // Exact integerization, never round a geometric input into a proof.
 const values=[trim,kerf,...parts.flatMap(p=>[p.l,p.w]),
  ...stocks.flatMap(s=>[s.l,s.w])];
 let scale=1;
 for(const x of values){
  let f=1,ok=false;
  for(let n=0;n<=6;n++,f*=10){
   if(Number.isSafeInteger(Math.round(x*f))&&Math.round(x*f)/f===x){
    scale=Math.max(scale,f);ok=true;break;
   }
  }
  if(!ok)return bail('unknown-precision');
 }
 const integer=x=>{
  const v=Math.round(x*scale);
  return Number.isSafeInteger(v)&&v/scale===x?v:null;
 };
 const k=integer(kerf),t=integer(trim);
 if(k===null||t===null)return bail('unknown-precision');
 const compatible=(p,s)=>p.material===s.material&&
  (p.category==null||s.category==null||p.category===s.category)&&
  (p.t==null||(s.t!=null&&Math.abs(p.t-s.t)<=1e-6));
 const groups=[],byKey=new Map();
 for(const p of parts){
  const l=integer(p.l),w=integer(p.w);
  if(l===null||w===null)return bail('unknown-precision');
  const key=JSON.stringify([l,w,p.material,p.category||null,p.t??null]);
  let g=byKey.get(key);
  if(!g){g={l,w,pieces:[],material:p.material,category:p.category,t:p.t};
   byKey.set(key,g);groups.push(g);}
  g.pieces.push(p);
 }
 const demand=groups.map(g=>g.pieces.length),n=groups.length;
 const boards=[];
 for(const s of stocks){
  if(!s.qty||s.l<=2*trim||s.w<=2*trim)continue;
  const W=integer(s.l)-2*t,H=integer(s.w)-2*t;
  if(!Number.isSafeInteger(W)||!Number.isSafeInteger(H)||W<=0||H<=0)
   return bail('unknown-precision');
  const usable=groups.some(g=>compatible(g.pieces[0],s)&&g.l<=W&&g.w<=H);
  if(!usable)continue;
  const unit=objective==='area'?s.l*s.w:objective==='count'?1:
   POLICY.stockPrice(s,{priceMode,m3});
  if(unit===null)return bail('unknown-price');
  if(!Number.isFinite(unit)||unit<0)return bail('unknown-input');
  boards.push({stock:s,W,H,unit,qty:Math.min(s.qty,parts.length),patterns:[]});
 }
 if(!boards.length)return bail('infeasible-two-stage-class');
 // Exact fixed-denominator rational arithmetic for monetary/area objective:
 // 6 decimal input places per factor; 4 factors and the m³ / 10^9 ratio.
 // No floating-point tie/dominance decisions are allowed to assert optimum.
 const DEN=10n**33n,F=10n**6n;
 const fixed=x=>{
  if(!Number.isFinite(x)||x<0)return null;
  const raw=String(x);
  if(!/^\d+(?:\.\d+)?$/.test(raw))return null;
  const [whole,frac='']=raw.split('.');
  if(frac.length>6)return null;
  return BigInt(whole)*F+BigInt((frac+'000000').slice(0,6));
 };
 const exactUnit=board=>{
  const s=board.stock;
  if(objective==='count')return DEN;
  const L=fixed(s.l),W=fixed(s.w);
  if(L===null||W===null)return null;
  if(objective==='area')return L*W*(DEN/(F*F));
  if(s.isRemnant){const r=fixed(s.bookValue);return r===null?null:r*(DEN/F);}
  const unit=s.priceUnit||priceMode;
  if(unit==='panel'){const p=fixed(s.price);return p===null?null:p*(DEN/F);}
  if(unit==='m3'){
   const T=fixed(s.t),rate=fixed(s.priceUnit?s.price:m3);
   return T===null||rate===null?null:L*W*T*rate;
  }
  return null;
 };
 for(const board of boards){
  const exact=exactUnit(board);
  if(exact===null)return bail('unknown-precision');
  board.unitExact=exact;
 }
 const vectorKey=a=>a.join(',');
 const fitsResidual=r=>r===0||r>=k;
 // Two orientations; an identical count vector on one stock is interchangeable
 // for objective and future demand. Keep one audited construction witness.
 function generate(board){
  const patternSeen=new Set();
  for(const orientation of ['VH','HV']){
   const primary=orientation==='VH'?board.W:board.H;
   const secondary=orientation==='VH'?board.H:board.W;
   const dims=groups.map(g=>({a:orientation==='VH'?g.l:g.w,
    b:orientation==='VH'?g.w:g.l}));
   const stripPatterns=[];
   const primaries=[...new Set(dims.map(d=>d.a))].sort((a,b)=>a-b);
   for(const width of primaries){
    if(width>primary)continue;
    const indices=groups.map((g,i)=>i).filter(i=>
     dims[i].a===width&&compatible(groups[i].pieces[0],board.stock)&&
     dims[i].b<=secondary);
    if(!indices.length)continue;
    const v=Array(n).fill(0);
    function strip(pos,used,count){
     if(!tick())return false;
     if(pos===indices.length){
      if(count&&fitsResidual(secondary-used)){
       stripPatterns.push({width,counts:v.slice(),count});
       if(stripPatterns.length>maxPatterns){limited=true;return false;}
      }
      return true;
     }
     const i=indices[pos],step=dims[i].b+k;
     const max=Math.min(demand[i],Math.floor((secondary+k-used)/step));
     for(let q=0;q<=max;q++){
      v[i]=q;
      if(!strip(pos+1,used+q*step,count+q))return false;
     }
     v[i]=0;return true;
    }
    if(!strip(0,-k,0))return false;
   }
   // Multiset of strips: reordering never changes width or kerf feasibility.
   // This is safe canonical symmetry breaking, not a heuristic dominance cut.
   const counts=Array(n).fill(0),picked=[];
   function visit(start,used,count){
    if(!tick())return false;
    if(count&&fitsResidual(primary-used)){
     const key=vectorKey(counts);
     if(!patternSeen.has(key)){
      patternSeen.add(key);
      board.patterns.push({counts:counts.slice(),orientation,
       strips:picked.map(x=>x),count});
      patternsCreated++;
      if(patternsCreated>maxPatterns){limited=true;return false;}
     }
    }
    for(let i=start;i<stripPatterns.length;i++){
     const strip=stripPatterns[i],next=used+strip.width+k;
     if(next>primary)continue;
     if(strip.counts.some((c,j)=>c+counts[j]>demand[j]))continue;
     strip.counts.forEach((c,j)=>counts[j]+=c);
     picked.push(strip);
     if(!visit(i,next,count+strip.count))return false;
     picked.pop();
     strip.counts.forEach((c,j)=>counts[j]-=c);
    }
    return true;
   }
   // Used is (sum strip widths + (strip count - 1)*kerf).
   if(!visit(0,-k,0))return false;
  }
  return true;
 }
 for(const board of boards){
  if(Date.now()>=deadline||!generate(board))return bail('unknown-limit');
 }
 const memo=new Map(),key=(rest,quantities)=>
  vectorKey(rest)+'|'+vectorKey(quantities);
 function cover(rest,quantities){
  if(!tick()||Date.now()>=deadline){limited=true;return null;}
  const pivot=rest.findIndex(q=>q>0);
  if(pivot<0)return {value:0n,choice:null};
  const tag=key(rest,quantities);
  if(memo.has(tag))return memo.get(tag);
  if(memo.size>=maxStates){limited=true;return null;}
  let best={value:null,choice:null};
  for(let b=0;b<boards.length;b++){
   if(!quantities[b])continue;
   for(const pattern of boards[b].patterns){
    if(!pattern.counts[pivot]||pattern.counts.some((c,j)=>c>rest[j]))continue;
    const next=rest.map((r,j)=>r-pattern.counts[j]),q=quantities.slice();
    q[b]--;
    const sub=cover(next,q);
    if(sub===null)return null;
    if(sub.value===null)continue;
    const val=boards[b].unitExact+sub.value;
    if(best.value===null||val<best.value)best={value:val,choice:{b,pattern}};
   }
  }
  memo.set(tag,best);states++;peakMemo=Math.max(peakMemo,memo.size);
  return best;
 }
 const initialQty=boards.map(b=>b.qty),solution=cover(demand,initialQty);
 if(limited||!solution)return bail('unknown-limit');
 if(solution.value===null)return bail('infeasible-two-stage-class');
 // Reconstruct actual first-stage full-edge strips, then second-stage cuts.
 const remaining=demand.slice(),qty=initialQty.slice(),used=groups.map(()=>0),bins=[];
 const makeCut=(bin,src,axis,span)=>{
  const along=axis==='vertical'?'w':'h';
  const start=axis==='vertical'?'x':'y';
  const at=src[start]+span+kerf/2;
  const before={...src,[along]:span};
  const after={...src,[start]:src[start]+span+kerf,
   [along]:src[along]-span-kerf};
  bin.cuts.push({source:{...src},axis,at,
   number:bin.cuts.length+1,label:'Two-stage exact full-edge',
   x1:axis==='vertical'?at:src.x,y1:axis==='horizontal'?at:src.y,
   x2:axis==='vertical'?at:src.x+src.w,
   y2:axis==='horizontal'?at:src.y+src.h});
  return {before,after};
 };
 while(remaining.some(q=>q>0)){
  const st=memo.get(key(remaining,qty));
  if(!st||!st.choice)return bail('unknown-reconstruction');
  const {b,pattern}=st.choice,board=boards[b],stock=board.stock;
  const bin={stock,placed:[],cuts:[],free:[]};
  let first={x:trim,y:trim,w:board.W/scale,h:board.H/scale};
  const strips=[];
  const primaryAxis=pattern.orientation==='VH'?'vertical':'horizontal';
  const secondaryAxis=pattern.orientation==='VH'?'horizontal':'vertical';
  const sizeKey=primaryAxis==='vertical'?'w':'h';
  for(const strip of pattern.strips){
   const size=strip.width/scale;
   if(first[sizeKey]>size+1e-9){
    const cut=makeCut(bin,first,primaryAxis,size);
    strips.push({rect:cut.before,strip});first=cut.after;
   }else{strips.push({rect:first,strip});first=null;}
  }
  if(first&&first.w>1e-9&&first.h>1e-9)bin.free.push(first);
  for(const {rect,strip}of strips){
   let leaf=rect;
   for(let i=0;i<n;i++)for(let j=0;j<strip.counts[i];j++){
    const piece=groups[i].pieces[used[i]++];
    const size=(pattern.orientation==='VH'?groups[i].w:groups[i].l)/scale;
    const key2=secondaryAxis==='vertical'?'w':'h';
    let target;
    if(leaf[key2]>size+1e-9){
     const cut=makeCut(bin,leaf,secondaryAxis,size);
     target=cut.before;leaf=cut.after;
    }else{target=leaf;leaf=null;}
    bin.placed.push({...piece,x:target.x,y:target.y,
     w:piece.l,h:piece.w,rotated:false});
   }
   if(leaf&&leaf.w>1e-9&&leaf.h>1e-9)bin.free.push(leaf);
  }
  pattern.counts.forEach((c,i)=>remaining[i]-=c);
  qty[b]--;bins.push(bin);
 }
 const cost=bins.reduce((acc,b)=>{
  const c=POLICY.stockPrice(b.stock,{priceMode,m3});
  return acc===null||c===null?null:acc+c;
 },0);
 const plan={bins,unplaced:[],placedCount:parts.length,
  partArea:parts.reduce((acc,p)=>acc+p.l*p.w,0),
  stockArea:bins.reduce((acc,b)=>acc+b.stock.l*b.stock.w,0),cost,
  unknownCostBins:bins.filter(b=>POLICY.stockPrice(b.stock,{priceMode,m3})===null).length};
 return {status:'optimal-two-stage-class',objectiveValue:objective==='cost'?plan.cost:objective==='area'?plan.stockArea:bins.length,plan,
  model:'two-stage-canonical-strips-VH-or-HV',...meta()};
}
const api=Object.freeze({version:1,solve});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausTwoStageStripExact=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
