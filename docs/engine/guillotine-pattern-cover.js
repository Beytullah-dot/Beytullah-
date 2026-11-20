// Bounded constructive search for homogeneous, zero-kerf integer grids.
// A timeout or an unsuccessful cover is never an infeasibility certificate.
(function(root){
'use strict';
function feasible(parts,stocks,target,data,deadline,maxNodes){
 let work=0;
 const limited={status:'unknown',layout:null,nodes:0};
 if(stocks.length!==1||data.kerf!==0||!Number.isSafeInteger(target)||target<1||
    target>stocks[0].qty||!parts.length)return limited;
 const stock=stocks[0],trim=data.trim;
 const width=stock.l-2*trim,height=stock.w-2*trim;
 const integer=n=>Number.isSafeInteger(n)&&n>0;
 if(!integer(width)||!integer(height)||!Number.isSafeInteger(trim)||trim<0)return limited;
 function gcd(a,b){while(b){const r=a%b;a=b;b=r}return a}
 let unit=gcd(width,height);
 const groups=new Map();
 for(const p of parts){
  if(!integer(p.l)||!integer(p.w)||p.material!==stock.material||
    (p.t!=null&&p.t!==stock.t))return limited;
  const rotated=p.grain==='width';
  if(rotated&&!p.rotate)return limited;
  const w=rotated?p.w:p.l,h=rotated?p.l:p.w;
  if(w>width||h>height)return limited;
  unit=gcd(unit,gcd(w,h));
  const key=w+','+h;
  if(!groups.has(key))groups.set(key,{w,h,parts:[]});
  groups.get(key).parts.push({p,rotated})
 }
 const types=Array.from(groups.values()).sort((a,b)=>b.w*b.h-a.w*a.h||b.w-a.w);
 let W=width/unit,H=height/unit;
 if(W*H>1024||Math.max(W,H)>128||target>64)return limited;
 for(const t of types){t.w/=unit;t.h/=unit}
 // Score narrow height bands in integer units. The score guides the
 // heuristic only. Lower-bound proof remains with the independent caller.
 let best=null;
 for(const transpose of [false,true]){
  const side=transpose?W:H,span=transpose?H:W;
  for(let k=1;k<=side/2;k++){
   const n=Math.floor(side/k);
   const weights=Array.from({length:side+1},(_,h)=>2*h===side?n:
    2*h<side?2*Math.floor(h/k):2*(n-Math.floor((side-h)/k)));
   const cap=span*weights[side];
   const total=types.reduce((sum,t)=>sum+t.parts.length*
    (transpose?t.h:t.w)*weights[transpose?t.w:t.h],0);
   const slack=target*cap-total;
   if(slack>=0&&(!best||slack/cap<best.ratio))best={transpose,weights,slack,ratio:slack/cap}
  }
 }
 if(!best||best.slack>16)return limited;
 const {weights,slack,transpose}=best;
 if(transpose){[W,H]=[H,W];for(const t of types)[t.w,t.h]=[t.h,t.w]}
 const core=types.filter(t=>weights[t.h]>0),thin=types.filter(t=>!weights[t.h]);
 if(!core.length||thin.reduce((sum,t)=>sum+t.parts.length,0)>128)return limited;
 let guard=0n,bias=0n,full=0n,shift=0n;
 for(const t of core){
  const n=t.parts.length,bits=BigInt(Math.floor(Math.log2(n))+1);
  t.unit=1n<<shift;t.field=(1n<<bits)-1n;
  guard|=t.unit<<bits;bias+=(t.field-BigInt(n))*t.unit;
  full+=BigInt(n)*t.unit;shift+=bits+1n
 }
 if(shift>256n)return limited;
 if(Date.now()>=deadline||maxNodes<1)return limited;
 const stop={};
 function tick(){
  if((++work&255)===0&&(work/256>=maxNodes||Date.now()>=deadline))throw stop
 }
 const memo=new Map(),empty=new Map();
 let states=0;
 function patterns(w,h,loss){
  if(loss<0||loss>w*weights[h])return empty;
  const key=(w*(H+1)+h)*(slack+1)+loss;
  if(memo.has(key))return memo.get(key);
  tick();
  const out=new Map(),value=w*weights[h]-loss;
  if(value===0)out.set(0n,null);
  for(const t of core)if(t.w<=w&&t.h<=h&&t.w*weights[t.h]===value)out.set(t.unit,{t});
  for(const vertical of [true,false]){
   const side=vertical?w:h;
   for(let k=1;k<=side/2;k++){
    const aw=vertical?k:w,ah=vertical?h:k,bw=vertical?w-k:w,bh=vertical?h:h-k;
    const budget=aw*weights[ah]+bw*weights[bh]-value;
    for(let i=0;i<=budget;i++){
     const left=patterns(aw,ah,i);
     if(!left.size)continue;
     const right=patterns(bw,bh,budget-i);
     for(const [a,l] of left)for(const [b,r] of right){
      tick();
      const m=a+b;
      if(((m+bias)&guard)||out.has(m))continue;
      out.set(m,{vertical,k,l,r});
      if(++states>180000)throw stop
     }
    }
   }
  }
  memo.set(key,out);return out
 }
 function materialize(chosen){
  const positions=new Map(),holes=[];
  function take(t){
   const i=positions.get(t)||0;positions.set(t,i+1);return t.parts[i]
  }
  // Convert normalized rectangles back to stock coordinates at emission.
  function physical({x,y,w,h}){
   if(transpose)[x,y,w,h]=[y,x,h,w];
   return {x:trim+x*unit,y:trim+y*unit,w:w*unit,h:h*unit}
  }
  function split(bin,rect,vertical,k){
   const source=physical(rect),v=transpose?!vertical:vertical;
   const at=(v?source.x:source.y)+k*unit;
   bin.cuts.push({source,axis:v?'vertical':'horizontal',at,number:bin.cuts.length+1,label:'Kesim grubu',
    x1:v?at:source.x,y1:v?source.y:at,x2:v?at:source.x+source.w,y2:v?source.y+source.h:at});
   return vertical?[{...rect,w:k},{...rect,x:rect.x+k,w:rect.w-k}]:
    [{...rect,h:k},{...rect,y:rect.y+k,h:rect.h-k}]
  }
  function place(bin,rect,t,verticalFirst){
   for(const v of [verticalFirst,!verticalFirst]){
    const side=v?'w':'h';
    if(rect[side]>t[side]){
     const [kept,offcut]=split(bin,rect,v,t[side]);rect=kept;holes.push({bin,rect:offcut})
    }
   }
   const {p,rotated}=take(t);
   bin.pieces.push({...p,...physical(rect),rotated})
  }
  const extras=thin.flatMap(t=>Array(t.parts.length).fill(t)).sort((a,b)=>b.w*b.h-a.w*a.h);
  function potential(w,h){return extras.reduce((s,t)=>s+(t.w<=w&&t.h<=h?t.w*t.h:0),0)}
  function emit(bin,rect,node){
   if(!node){holes.push({bin,rect});return}
   if(node.t){
    const t=node.t,dw=rect.w-t.w,dh=rect.h-t.h;
    place(bin,rect,t,potential(dw,rect.h)+potential(t.w,dh)>=potential(rect.w,dh)+potential(dw,t.h));return
   }
   const [a,b]=split(bin,rect,node.vertical,node.k);
   emit(bin,a,node.l);emit(bin,b,node.r)
  }
  const bins=chosen.map(({tree})=>{
   const bin={stock,pieces:[],free:[],cuts:[]};
   emit(bin,{x:0,y:0,w:W,h:H},tree);return bin
  });
  // Try both trim orders for each remaining piece; backtrack all side effects.
  function fill(i){
   tick();
   if(i===extras.length)return true;
   const t=extras[i];
   for(let j=0;j<holes.length;j++){
    const {bin,rect}=holes[j];
    if(t.w>rect.w||t.h>rect.h)continue;
    for(const v of [true,false]){
     const cuts=bin.cuts.length,prev=positions.get(t)||0;
     const [saved]=holes.splice(j,1),length=holes.length;
     place(bin,rect,t,v);
     if(fill(i+1))return true;
     holes.length=length;holes.splice(j,0,saved);bin.cuts.length=cuts;
     bin.pieces.pop();positions.set(t,prev)
    }
   }
   return false
  }
  if(!fill(0))return null;
  for(const {bin,rect} of holes)bin.free.push(physical(rect));
  return bins
 }
 try{
  const all=new Map();
  for(let d=0;d<=slack;d++)for(const [mask,tree] of patterns(W,H,d)){
   if(mask)all.set(mask,{mask,tree,d})
  }
  // Reject most incompatible patterns with a machine-word guard check;
  // the full-width check below still verifies every surviving candidate.
  const lowGuard=Number(guard&0x7fffffffn);
  for(const p of all.values())p.low=Number(p.mask&0x7fffffffn);
  const byType=core.map(()=>[]);
  for(const p of all.values())core.forEach((t,i)=>{if((p.mask/t.unit)&t.field)byType[i].push(p)});
  const order=core.map((_,i)=>i).sort((a,b)=>byType[a].length-byType[b].length);
  // A remainder seen after taking the same number of sheets has exactly
  // the same core-cover choices. Only cache impossible CORE remainders;
  // holes usable by the thin pieces still depend on the chosen trees.
  const dead=new Map();
  const path=[];
  let covers=0;
  function search(rem,num,left){
   if(dead.get(rem)===num)return null;
   tick();
   if(num===1){
    const last=all.get(rem);if(last){covers++;return materialize([...path,last])}return null
   }
   const i=order.find(i=>(rem/core[i].unit)&core[i].field);
   if(i===undefined)return null;
   const before=covers,available=Number(rem&0x7fffffffn)|lowGuard;
   for(const p of byType[i]){
    if(p.d>left)break;
    tick();
    if(((available-p.low)&lowGuard)!==lowGuard)continue;
    if((((rem|guard)-p.mask)&guard)!==guard)continue;
    path.push(p);const result=search(rem-p.mask,num-1,left-p.d);path.pop();
    if(result)return result
   }
   if(before===covers&&dead.size<150000)dead.set(rem,num);
   return null
  }
  const layout=search(full,target,slack);
  return {status:layout?'feasible':'unknown',layout,nodes:Math.ceil(work/256)}
 }catch(error){
  if(error!==stop)throw error;
  return {...limited,nodes:Math.ceil(work/256)}
 }
}
root.BeythausPatternCover={feasible};
})(typeof self!=='undefined'?self:globalThis);
