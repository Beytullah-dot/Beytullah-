/* Beythaus Cut — bounded exact guillotine (slicing-tree) search.
   Mathematical model: each internal cut is full-width/full-height, separating
   two non-empty part sets with kerf; waste may be removed at any node.
   Every candidate is a physical cut tree. If the exhaustive relaxed search
   has no solution, "infeasible" is a valid lower-bound certificate. If the
   cut-tree construction or search budget cannot complete: "unknown".
   No UI, DOM, or main optimizer dependencies. */
'use strict';
const GuillotineExact=(()=>{
 const EPS=1e-7;
 const orientations=p=>(p.rotate&&(Math.abs(p.l-p.w)>EPS||!!p.grain)?
  [{w:p.l,h:p.w,rotated:false},{w:p.w,h:p.l,rotated:true}]:
  [{w:p.l,h:p.w,rotated:false}]).filter(o=>
   typeof BeythausMaterialPolicy==='undefined'||BeythausMaterialPolicy.grainAllows(p,null,o.rotated));
 const canon=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
 const compatible=(p,s)=>canon(p.material)===canon(s.material)&&
  (p.t===null||(s.t!==null&&Math.abs(p.t-s.t)<1e-6));

 function cutPlan(pattern,stock,cfg){
  const k=cfg.kerf,trim=cfg.trim,placed=[],cuts=[],free=[];
  const width=stock.l-2*trim,height=stock.w-2*trim;
  const root={x:trim,y:trim,w:width,h:height};
  const tolerance=1e-6;
  function firstLabel(node){
   return node.index!==undefined?String(node.piece.label||'Parça'):firstLabel(node.a)
  }
  function perform(rect,axis,firstSize,label){
   const alongX=axis==='vertical',total=alongX?rect.w:rect.h;
   const secondSize=total-firstSize-k;
   if(firstSize<=tolerance||firstSize>=total-tolerance)return null;
   if(secondSize< -tolerance&&cfg.allowNarrowScrapCuts!==true)return null;
   const at=(alongX?rect.x:rect.y)+firstSize+k/2;
   cuts.push({axis,at,source:{...rect},number:cuts.length+1,
    ...(secondSize < -tolerance ? {overhang:true} : {}),
    label:label||'Kesim grubu',
    x1:alongX?at:rect.x,y1:alongX?rect.y:at,
    x2:alongX?at:rect.x+rect.w,y2:alongX?rect.y+rect.h:at});
   const a=alongX?{x:rect.x,y:rect.y,w:firstSize,h:rect.h}:
    {x:rect.x,y:rect.y,w:rect.w,h:firstSize};
   const b=alongX?{x:rect.x+firstSize+k,y:rect.y,
    w:Math.max(0,secondSize),h:rect.h}:
    {x:rect.x,y:rect.y+firstSize+k,w:rect.w,h:Math.max(0,secondSize)};
   return {a,b}
  }
  function emit(node,box){
   if(node.w>box.w+tolerance||node.h>box.h+tolerance)return false;
   if(node.index!==undefined){
    let active=box;
    if(active.w>node.w+tolerance){
     const cut=perform(active,'vertical',node.w,node.piece.label);
     if(!cut)return false;
     active=cut.a;
     if(cut.b.w>tolerance)free.push(cut.b);
    }
    if(active.h>node.h+tolerance){
     const cut=perform(active,'horizontal',node.h,node.piece.label);
     if(!cut)return false;
     active=cut.a;
     if(cut.b.h>tolerance)free.push(cut.b)
    }
    if(Math.abs(active.w-node.w)>tolerance||
       Math.abs(active.h-node.h)>tolerance)return false;
    placed.push({...node.piece,x:active.x,y:active.y,w:node.w,
     h:node.h,rotated:node.rotated});
    return true
   }
   const vertical=node.axis==='x';
   const cut=perform(box,vertical?'vertical':'horizontal',
    vertical?node.a.w:node.a.h,firstLabel(node.a));
   if(!cut)return false;
   return emit(node.a,cut.a)&&emit(node.b,cut.b)
  }
  if(!emit(pattern,root))return null;
  return {stock,pieces:placed,free,cuts}
 }


 // Exhaustive physical-grid fallback for ambiguous relaxed patterns.
 // INFEASIBLE is emitted only after all full cuts and scrap trims are
 // exhausted. Unrepresentable precision or budget exhaustion => UNKNOWN.
 function physicalDecision(parts,stocks,limit,cfg,deadline,maxNodes){
  let nodes=0,interrupted=false;
  const done=status=>({status,nodes});
  const values=[cfg.kerf,cfg.trim,...parts.flatMap(p=>[p.l,p.w]),
   ...stocks.flatMap(s=>[s.l,s.w])];
  let scale=1;
  for(const v of values){
   if(!Number.isFinite(v)||v<0)return done('unknown');
   let d=1;
   while(d<=1000000&&Math.round(v*d)!==v*d)d*=10;
   if(d>1000000)return done('unknown');
   scale=Math.max(scale,d);
  }
  const grid=values.map(v=>Math.round(v*scale));
  if(grid.some((v,i)=>!Number.isSafeInteger(v)||v/scale!==values[i]))
   return done('unknown');
  let at=0;const k=grid[at++],trim=grid[at++];
  const pieces=parts.map(p=>({p,l:grid[at++],w:grid[at++]}));
  const types=stocks.map((s,i)=>({s,W:grid[at+i*2]-2*trim,
   H:grid[at+i*2+1]-2*trim})).filter(t=>t.s.qty>0&&t.W>0&&t.H>0);
  const n=pieces.length;
  if(!n||n>12||limit<1)return done('unknown');
  const full=(1<<n)-1,area=new Array(full+1).fill(0);
  for(let m=1;m<=full;m++){
   const bit=m&-m,i=31-Math.clz32(bit);
   area[m]=area[m^bit]+pieces[i].l*pieces[i].w;
  }
  function tick(){
   nodes++;
   if(nodes>maxNodes||(nodes%128===0&&Date.now()>=deadline)){
    interrupted=true;return false
   }
   return true
  }
  const cutMemo=types.map(()=>new Map()),coverMemo=new Map();
  function fits(mask,t){
   const type=types[t],memo=cutMemo[t];
   if(area[mask]>type.W*type.H)return false;
   for(let i=0;i<n;i++)if(mask&(1<<i)&&!compatible(pieces[i].p,type.s))
    return false;
   function cut(sub,W,H){
    const key=sub+':'+W+':'+H;
    if(memo.has(key))return memo.get(key);
    if(!tick())return null;
    if(W<=0||H<=0||area[sub]>W*H){memo.set(key,false);return false}
    if((sub&(sub-1))===0){
     const i=31-Math.clz32(sub),p=pieces[i];
     const yes=orientations(p.p).some(o=>{
      const w=o.rotated?p.w:p.l,h=o.rotated?p.l:p.w;
      return w<=W&&h<=H&&(cfg.allowNarrowScrapCuts===true||
       (w===W||W-w>=k)&&(h===H||H-h>=k))
     });
     memo.set(key,yes);return yes
    }
    for(let axis=0;axis<2;axis++){
     const side=axis===0?W:H;
     for(let x=1;x+k<side;x++)
      for(let a=(sub-1)&sub;a;a=(a-1)&sub){
       const b=sub^a;
       if(!b)continue;
       const left=axis===0?cut(a,x,H):cut(a,W,x);
       if(left===null)return null;
       if(!left)continue;
       const right=axis===0?cut(b,W-x-k,H):cut(b,W,H-x-k);
       if(right===null)return null;
       if(right){memo.set(key,true);return true}
      }
    }
    // Leading scrap strips are necessary for exhaustive physical search.
    for(let axis=0;axis<2;axis++){
     const side=axis===0?W:H;
     for(let kept=side-k-1;kept>0;kept--){
      const found=axis===0?cut(sub,kept,H):cut(sub,W,kept);
      if(found===null)return null;
      if(found){memo.set(key,true);return true}
     }
    }
    memo.set(key,false);return false
   }
   return cut(mask,type.W,type.H)
  }
  function cover(mask,qty,left){
   if(!tick())return null;
   if(!mask)return true;
   if(!left)return false;
   const key=mask+':'+left+':'+qty.join(',');
   if(coverMemo.has(key))return coverMemo.get(key);
   const first=mask&-mask;
   for(let t=0;t<types.length;t++)if(qty[t]>0)
    for(let sub=mask;sub;sub=(sub-1)&mask){
     if(!(sub&first))continue;
     const fit=fits(sub,t);
     if(fit===null)return null;
     if(!fit)continue;
     qty[t]--;
     const rest=cover(mask^sub,qty,left-1);
     qty[t]++;
     if(rest===null)return null;
     if(rest){coverMemo.set(key,true);return true}
    }
   coverMemo.set(key,false);return false
  }
  const answer=cover(full,types.map(t=>Math.min(t.s.qty,limit)),limit);
  return done(interrupted||answer===null?'unknown':answer?'feasible':'infeasible')
 }

 // Finite exhaustive subset dynamic programming, using a sound Pareto skyline
 // of (width,height). Dominated patterns can be deleted for *feasibility*
 // proofs, but construction failure cannot be used as infeasibility evidence.
 function feasible(parts,stocks,boardLimit,cfg,deadline,maxNodes){
  const started=Date.now(),n=parts.length,full=(1<<n)-1;
  let nodes=0,limited=false,ambiguous=false;
  const end=status=>({status,nodes,elapsedMs:Date.now()-started,layout:null});
  if(n<1||n>12||boardLimit<1)return end('unknown');
  if(!Number.isFinite(cfg.kerf)||cfg.kerf<0||
     !Number.isFinite(cfg.trim)||cfg.trim<0)return end('unknown');
  const usable=stocks.filter(s=>s.qty>0&&s.l>2*cfg.trim&&s.w>2*cfg.trim);
  if(!usable.length)return end('infeasible');
  const maxW=Math.max(...usable.map(s=>s.l-2*cfg.trim));
  const maxH=Math.max(...usable.map(s=>s.w-2*cfg.trim));
  function tick(){
   nodes++;
   if(nodes>maxNodes||(nodes%128===0&&Date.now()>=deadline)){
    limited=true;return false
   }
   return true
  }
  const subsetArea=new Float64Array(full+1);
  for(let mask=1;mask<=full;mask++){
   const bit=mask&-mask,idx=31-Math.clz32(bit);
   subsetArea[mask]=subsetArea[mask^bit]+parts[idx].l*parts[idx].w
  }
  const maxCapacity=usable.flatMap(s=>Array.from({length:Math.min(boardLimit,s.qty)},
   ()=>Math.max(0,s.l-2*cfg.trim)*Math.max(0,s.w-2*cfg.trim)))
   .sort((a,b)=>b-a).slice(0,boardLimit).reduce((a,b)=>a+b,0);
  if(subsetArea[full]>maxCapacity+EPS)return end('infeasible');
  if(parts.some(p=>!usable.some(s=>compatible(p,s)&&orientations(p).some(o=>
   o.w<=s.l-2*cfg.trim+EPS&&o.h<=s.w-2*cfg.trim+EPS))))
   return end('infeasible');
  const patterns=new Map(),fitness=new Map(),memo=new Map();
  function insert(front,node){
   if(node.w>maxW+EPS||node.h>maxH+EPS)return;
   for(const previous of front)
    if(previous.w<=node.w+EPS&&previous.h<=node.h+EPS)return;
   for(let i=front.length-1;i>=0;i--)
    if(node.w<=front[i].w+EPS&&node.h<=front[i].h+EPS)front.splice(i,1);
   front.push(node)
  }
  function get(mask){
   if(patterns.has(mask))return patterns.get(mask);
   if(!tick())return null;
   const front=[];
   if((mask&(mask-1))===0){
    const index=31-Math.clz32(mask),piece=parts[index];
    for(const o of orientations(piece))insert(front,{...o,index,piece})
   }else{
    const first=mask&-mask;
    for(let a=(mask-1)&mask;a;a=(a-1)&mask){
     if(!(a&first))continue;
     const b=mask^a;
     const aa=get(a),bb=get(b);
     if(aa===null||bb===null)return null;
     for(const left of aa)for(const right of bb){
      if(!tick())return null;
      insert(front,{axis:'x',w:left.w+cfg.kerf+right.w,
       h:Math.max(left.h,right.h),a:left,b:right});
      insert(front,{axis:'y',w:Math.max(left.w,right.w),
       h:left.h+cfg.kerf+right.h,a:left,b:right})
     }
    }
   }
   patterns.set(mask,front);
   return front
  }
  function boardFit(mask,t){
   const key=mask+':'+t;
   if(fitness.has(key))return fitness.get(key);
   if(!tick())return null;
   const stock=usable[t],W=stock.l-2*cfg.trim,H=stock.w-2*cfg.trim;
   if(subsetArea[mask]>W*H+EPS){fitness.set(key,false);return false}
   for(let i=0;i<n;i++)if(mask&(1<<i)&&!compatible(parts[i],stock)){
    fitness.set(key,false);return false
   }
   const list=get(mask);
   if(list===null)return null;
   let possible=false;
   for(const p of list){
    if(p.w>W+EPS||p.h>H+EPS)continue;
    possible=true;
    const constructed=cutPlan(p,stock,cfg);
    if(constructed){
     fitness.set(key,constructed);
     return constructed
    }
   }
   // A pattern may fit in the relaxed geometric model while its isolated
   // leaves cannot all be cut on this stock (e.g. a <kerf trailing sliver).
   // This is UNKNOWN, not an infeasibility proof.
   if(possible){ambiguous=true;fitness.set(key,'unknown');return 'unknown'}
   fitness.set(key,false);return false
  }
  function cover(mask,quantities,left){
   if(!tick())return null;
   if(mask===0)return [];
   if(left===0)return false;
   const key=mask+':'+left+':'+quantities.join(',');
   if(memo.has(key))return memo.get(key);
   const first=mask&-mask;
   let uncertain=false;
   for(let t=0;t<usable.length;t++){
    if(!quantities[t])continue;
    for(let sub=mask;sub;sub=(sub-1)&mask){
     if(!(sub&first))continue;
     const fit=boardFit(sub,t);
     if(fit===null)return null;
     if(fit==='unknown'){uncertain=true;continue}
     if(fit===false)continue;
     quantities[t]--;
     const rest=cover(mask^sub,quantities,left-1);
     quantities[t]++;
     if(rest===null)return null;
     if(Array.isArray(rest)){const result=[fit,...rest];memo.set(key,result);return result}
     if(rest==='unknown')uncertain=true
    }
   }
   const result=uncertain?'unknown':false;
   memo.set(key,result);
   return result
  }
  const quantities=usable.map(s=>Math.min(s.qty,boardLimit));
  const answer=cover(full,quantities,boardLimit);
  if(limited||answer===null)return end('unknown');
  if(answer==='unknown'){
   if(Date.now()>=deadline||nodes>=maxNodes)return end('unknown');
   const physical=physicalDecision(parts,stocks,boardLimit,cfg,deadline,maxNodes-nodes);
   return {status:physical.status==='infeasible'?'infeasible':'unknown',
    nodes:nodes+physical.nodes,elapsedMs:Date.now()-started,layout:null};
  }
  if(answer===false)return {status:'infeasible',nodes,elapsedMs:Date.now()-started,layout:null};
  return {status:'feasible',nodes,elapsedMs:Date.now()-started,layout:answer}
 }
 return {feasible,cutPlan};
})();
if(typeof self!=='undefined')self.GuillotineExact=GuillotineExact;
