/* Independent integer-grid oracle for Beythaus Cut regression tests.
 * No imports or shared geometry/packing code from the application.
 * Exact for the discretized, integer-coordinate test domain (free/guillotine).
 * A node cap always yields UNKNOWN, never an invented optimum.
 */
'use strict';

const EPS=1e-7;
const finite=v=>Number.isFinite(v);
const same=(a,b)=>Math.abs(a-b)<=EPS;
const material=x=>String(x||'').trim().toLocaleLowerCase('tr-TR');
const bitcount=x=>{let n=0;while(x){n++;x&=x-1}return n};
const onebit=x=>x>0&&(x&(x-1))===0;
const options=p=>p.rotate&&p.l!==p.w?[[p.l,p.w],[p.w,p.l]]:[[p.l,p.w]];
const compatible=(part,stock)=>material(part.material)===material(stock.material)&&
 (part.t==null||(stock.t!=null&&same(part.t,stock.t)));

function solve(data,mode,{maxNodes=4500000}={}){
 if(!['nest','guillotine'].includes(mode))throw Error('Unsupported mode');
 const parts=data.parts,stocks=data.stocks,k=data.kerf,trim=data.trim;
 if(parts.length>12)throw Error('Oracle intended for at most 12 pieces');
 if(![k,trim,...parts.flatMap(p=>[p.l,p.w]),...stocks.flatMap(s=>[s.l,s.w,s.qty])]
     .every(x=>Number.isSafeInteger(x)&&x>=0))
  throw Error('Integer-coordinate oracle requires nonnegative integer values');
 const full=(1<<parts.length)-1,budget={nodes:0,maxNodes,limited:false};
 const tick=()=>{
  budget.nodes++;
  if(budget.nodes>budget.maxNodes){budget.limited=true;return false}
  return true;
 };
 const usable=stocks.map(s=>({w:s.l-2*trim,h:s.w-2*trim}));
 const masksArea=new Array(full+1).fill(0);
 for(let mask=1;mask<=full;mask++){
  const bit=mask&-mask,index=31-Math.clz32(bit);
  masksArea[mask]=masksArea[mask^bit]+parts[index].l*parts[index].w;
 }
 const freeCache=stocks.map(()=>new Map()),guillotineCache=new Map();
 function freeFits(mask,t){
  const memo=freeCache[t];
  if(memo.has(mask))return memo.get(mask);
  const {w:W,h:H}=usable[t],stock=stocks[t];
  if(W<=0||H<=0||masksArea[mask]>W*H||!tick())return budget.limited?null:false;
  const pieces=[];
  for(let i=0;i<parts.length;i++)if(mask&(1<<i)){
   const p=parts[i];
   if(!compatible(p,stock)){memo.set(mask,false);return false}
   const variants=options(p).filter(([w,h])=>w<=W&&h<=H);
   if(!variants.length){memo.set(mask,false);return false}
   pieces.push({p,variants});
  }
  pieces.sort((a,b)=>b.p.l*b.p.w-a.p.l*a.p.w);
  if(pieces.length===1){memo.set(mask,true);return true}
  const placed=[];
  function place(index){
   if(!tick())return null;
   if(index===pieces.length)return true;
   for(const [w,h] of pieces[index].variants){
    for(let y=0;y<=H-h;y++)for(let x=0;x<=W-w;x++){
     let blocked=false;
     for(const q of placed)if(!(x+w+k<=q.x||q.x+q.w+k<=x||
      y+h+k<=q.y||q.y+q.h+k<=y)){blocked=true;break}
     if(blocked)continue;
     placed.push({x,y,w,h});
     const next=place(index+1);
     placed.pop();
     if(next===true)return true;
     if(next===null)return null;
    }
   }
   return false;
  }
  const outcome=place(0);
  if(outcome!==null)memo.set(mask,outcome);
  return outcome;
 }
 function guillotineFits(mask,t){
  const {w,h}=usable[t],stock=stocks[t];
  if(w<=0||h<=0)return false;
  for(let i=0;i<parts.length;i++)if(mask&(1<<i)&&!compatible(parts[i],stock))return false;
  function cut(sub,W,H){
   const key=t+':'+sub+':'+W+':'+H;
   if(guillotineCache.has(key))return guillotineCache.get(key);
   if(!tick())return null;
   if(sub===0)return true;
   if(W<=0||H<=0||masksArea[sub]>W*H){guillotineCache.set(key,false);return false}
   if(onebit(sub)){
    const i=31-Math.clz32(sub);
    const yes=options(parts[i]).some(([l,w])=>l<=W&&w<=H);
    guillotineCache.set(key,yes);return yes;
   }
   // Every full guillotine tree partitions the remaining items across
   // a first nonempty vertical or horizontal cut, possibly after scrap trimming.
   for(const vertical of [true,false]){
    const bound=vertical?W:H;
    for(let at=1;at+k<bound;at++){
     let left=(sub-1)&sub;
     while(left){
      const right=sub^left;
      if(right){
       const first=vertical?cut(left,at,H):cut(left,W,at);
       if(first===null)return null;
       if(first){
        const second=vertical?cut(right,W-at-k,H):cut(right,W,H-at-k);
        if(second===null)return null;
        if(second){guillotineCache.set(key,true);return true}
       }
      }
      left=(left-1)&sub;
     }
    }
   }
   guillotineCache.set(key,false);return false;
  }
  return cut(mask,w,h);
 }
 const fits=(mask,t)=>mode==='nest'?freeFits(mask,t):guillotineFits(mask,t);
 const cache=new Map();
 function cover(mask,remaining){
  if(!tick())return null;
  if(mask===0)return {count:0,area:0};
  const key=mask+':'+remaining.join(',');
  if(cache.has(key))return cache.get(key);
  const first=mask&-mask;
  let best=false;
  for(let t=0;t<stocks.length;t++){
   if(remaining[t]===0)continue;
   let sub=mask;
   while(sub){
    if(sub&first){
     const good=fits(sub,t);
     if(good===null)return null;
     if(good){
      remaining[t]--;
      const rest=cover(mask^sub,remaining);
      remaining[t]++;
      if(rest===null)return null;
      if(rest!==false){
       const candidate={count:rest.count+1,area:rest.area+stocks[t].l*stocks[t].w};
       if(!best||candidate.count<best.count||
        candidate.count===best.count&&candidate.area<best.area)best=candidate;
      }
     }
    }
    sub=(sub-1)&mask;
   }
  }
  cache.set(key,best);return best;
 }
 const optimum=cover(full,stocks.map(s=>s.qty));
 return {
  status:budget.limited?'unknown':optimum?'optimal':'infeasible',
  minimumBoards:budget.limited||!optimum?null:optimum.count,
  minimumAreaAtMinBoards:budget.limited||!optimum?null:optimum.area,
  nodes:budget.nodes,mode
 };
}

function audit(data,result,mode){
 const issues=[],seen=new Set(),usage=new Map(),byPart=new Map(data.parts.map(p=>[p.id,p])),
  byStock=new Map(data.stocks.map(s=>[s.id,s])),k=data.kerf,trim=data.trim;
 const fail=s=>{if(issues.length<25)issues.push(s)};
 const eq=(a,b)=>finite(a)&&finite(b)&&same(a,b);
 const rectEq=(a,b)=>eq(a.x,b.x)&&eq(a.y,b.y)&&eq(a.w,b.w)&&eq(a.h,b.h);
 if(!Array.isArray(result?.bins)||!Array.isArray(result?.unplaced))
  return {ok:false,issues:['Malformed output']};
 for(const bin of result.bins){
  const stock=byStock.get(bin?.stock?.id);
  if(!stock){fail('Unknown stock');continue}
  usage.set(stock.id,(usage.get(stock.id)||0)+1);
  if(!eq(bin.stock.l,stock.l)||!eq(bin.stock.w,stock.w))fail('Stock dimensions modified');
  if(!Array.isArray(bin.placed)){fail('Malformed placed list');continue}
  for(const piece of bin.placed){
   const original=byPart.get(piece.id);
   if(!original||seen.has(piece.id)){fail('Missing or duplicate piece');continue}
   seen.add(piece.id);
   if(!compatible(original,stock))fail('Material/thickness incompatible');
   const expected=options(original).some(([w,h])=>eq(w,piece.w)&&eq(h,piece.h));
   if(!expected)fail('Piece geometry changed');
   if(![piece.x,piece.y,piece.w,piece.h].every(finite)||
    piece.x<trim-EPS||piece.y<trim-EPS||
    piece.x+piece.w>stock.l-trim+EPS||piece.y+piece.h>stock.w-trim+EPS)
    fail('Placement exceeds stock');
  }
  for(let i=0;i<bin.placed.length;i++)for(let j=i+1;j<bin.placed.length;j++){
   const a=bin.placed[i],b=bin.placed[j];
   if(!(a.x+a.w+k<=b.x+EPS||b.x+b.w+k<=a.x+EPS||
    a.y+a.h+k<=b.y+EPS||b.y+b.h+k<=a.y+EPS))fail('Overlap or kerf violation');
  }
  if(mode==='guillotine'){
   const leaves=[{x:trim,y:trim,w:stock.l-2*trim,h:stock.w-2*trim}];
   for(const step of bin.cuts||[]){
    const idx=leaves.findIndex(r=>rectEq(r,step.source||{}));
    if(idx<0){fail('Cut source not a live leaf');continue}
    const origin=leaves.splice(idx,1)[0];
    if(step.axis==='vertical'){
     const left=step.at-origin.x-k/2,right=origin.x+origin.w-step.at-k/2;
     if(left<-EPS||right<-EPS||!eq(step.x1,step.at)||!eq(step.x2,step.at)||
       !eq(step.y1,origin.y)||!eq(step.y2,origin.y+origin.h)){fail('Invalid vertical cut');continue}
     if(left>EPS)leaves.push({x:origin.x,y:origin.y,w:left,h:origin.h});
     if(right>EPS)leaves.push({x:step.at+k/2,y:origin.y,w:right,h:origin.h});
    }else if(step.axis==='horizontal'){
     const top=step.at-origin.y-k/2,bottom=origin.y+origin.h-step.at-k/2;
     if(top<-EPS||bottom<-EPS||!eq(step.y1,step.at)||!eq(step.y2,step.at)||
       !eq(step.x1,origin.x)||!eq(step.x2,origin.x+origin.w)){fail('Invalid horizontal cut');continue}
     if(top>EPS)leaves.push({x:origin.x,y:origin.y,w:origin.w,h:top});
     if(bottom>EPS)leaves.push({x:origin.x,y:step.at+k/2,w:origin.w,h:bottom});
    }else fail('Unknown cut direction');
   }
   for(const piece of bin.placed){
    const idx=leaves.findIndex(r=>rectEq(r,piece));
    if(idx<0)fail('Piece not generated by guillotine cuts');
    else leaves.splice(idx,1);
   }
   for(const free of bin.free||[]){
    const idx=leaves.findIndex(r=>rectEq(r,free));
    if(idx<0)fail('Residual stock differs from cut tree');
    else leaves.splice(idx,1);
   }
   if(leaves.length)fail('Guillotine tree has unaccounted leaves');
  }
 }
 for(const [id,count]of usage)if(count>byStock.get(id).qty)fail('Stock quantity exceeded');
 for(const missing of result.unplaced){
  if(!byPart.has(missing.id)||seen.has(missing.id))fail('Invalid unplaced piece');
  else seen.add(missing.id);
 }
 if(seen.size!==byPart.size)fail('Input pieces disappeared');
 if(result.placedCount!==result.bins.reduce((n,b)=>n+b.placed.length,0))fail('Placed count mismatch');
 return {ok:issues.length===0,issues};
}
module.exports={solve,audit};
