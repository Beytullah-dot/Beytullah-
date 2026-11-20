// Straight guillotine strips. Counts stay exact even when their products exceed Number precision.
(function(root){
'use strict';
const natural=n=>Number.isSafeInteger(n)&&n>0;
function capacity(span,size,kerf){
 const n=(span+kerf)/(size+kerf);
 const rest=span-n*size-(n-1n)*kerf;
 return rest>0n&&rest<kerf?n-1n:n;
}
function canSeparate(span,size,count,kerf){
 if(count===0n)return true;
 const leftover=span-count*size-(count-1n)*kerf;
 return leftover===0n||leftover>=kerf;
}
function dimensions(job,turned){
 const {part,stock,trim,kerf}=job;
 if(![stock.l,stock.w,part.l,part.w,part.qty,stock.qty].every(natural)||
    ![trim,kerf].every(n=>Number.isSafeInteger(n)&&n>=0)||
    part.material!==stock.material||part.category!==stock.category||stock.isRemnant||
    (part.t!==null&&part.t!==stock.t)||turned&&!part.rotate||
    !root.BeythausMaterialPolicy.grainAllows(part,stock,turned))return null;
 const k=BigInt(kerf),a=BigInt(stock.l)-2n*BigInt(trim),b=BigInt(stock.w)-2n*BigInt(trim);
 if(a<=0n||b<=0n)return null;
 return {a,b,k,w:BigInt(turned?part.w:part.l),h:BigInt(turned?part.l:part.w)};
}
// Replay the strip sequence algebraically. Each horizontal cut spans the remaining
// board and each vertical cut spans one detached strip. A final exact edge needs no cut.
function audit(job,plan){
 const d=dimensions(job,plan.turned);
 if(!d||!plan.patterns.length)return false;
 let placed=0n,sheets=0n;
 for(const p of plan.patterns){
  if(!natural(p.repeat)||![p.rows,p.columns,p.tail].every(n=>Number.isSafeInteger(n)&&n>=0)||
     (p.rows>0)!==(p.columns>0)||!(p.rows||p.tail))return false;
  const rows=BigInt(p.rows),cols=BigInt(p.columns),tail=BigInt(p.tail),repeat=BigInt(p.repeat);
  if(!canSeparate(d.b,d.h,rows+(tail?1n:0n),d.k)||
     !canSeparate(d.a,d.w,cols,d.k)||!canSeparate(d.a,d.w,tail,d.k))return false;
  placed+=repeat*(rows*cols+tail);sheets+=repeat;
 }
 return sheets===BigInt(plan.sheets)&&sheets<=BigInt(job.stock.qty)&&placed===BigInt(job.part.qty);
}
function solve(job){
 let best=null;
 for(const turned of [false,true]){
  const d=dimensions(job,turned);
  if(!d)continue;
  const cols=capacity(d.a,d.w,d.k),rows=capacity(d.b,d.h,d.k);
  if(cols<=0n||rows<=0n)continue;
  const per=cols*rows,qty=BigInt(job.part.qty),whole=qty/per,remain=qty%per;
  const sheets=whole+(remain?1n:0n);
  if(sheets>BigInt(job.stock.qty)||best&&sheets>=BigInt(best.sheets))continue;
  const patterns=[];
  function add(count,repeat){
   const full=count/cols;
   patterns.push({repeat:Number(repeat),rows:Number(full),columns:full?Number(cols):0,tail:Number(count%cols)});
  }
  if(whole)add(per,whole);
  if(remain)add(remain,1n);
  // Kerf-inflated area bounds every guillotine cut by induction over its two children.
  const upper=(d.a+d.k)*(d.b+d.k)/((d.w+d.k)*(d.h+d.k));
  const plan={turned,patterns,sheets:Number(sheets),proven:(qty+upper-1n)/upper===sheets};
  if(audit(job,plan))best=plan;
 }
 return best;
}
// A block is a run of identical horizontal strips, cut vertically for one demand row.
function auditMixed(job,plan){
 if(!Array.isArray(job.parts)||!job.parts.length||!plan||!natural(plan.sheets)||
    plan.sheets>job.stock.qty||!Array.isArray(plan.patterns))return false;
 const counts=job.parts.map(()=>0n);
 let sheets=0n;
 for(const pattern of plan.patterns){
  if(!natural(pattern.repeat)||!Array.isArray(pattern.blocks)||!pattern.blocks.length)return false;
  let used=0n;
  for(const block of pattern.blocks){
   if(!Number.isSafeInteger(block.index)||!job.parts[block.index]||typeof block.turned!=='boolean'||
      !natural(block.rows)||!natural(block.columns))return false;
   const part=job.parts[block.index],d=dimensions({...job,part},block.turned);
   if(!d)return false;
   const rows=BigInt(block.rows),cols=BigInt(block.columns);
   if(!canSeparate(d.a,d.w,cols,d.k)||!canSeparate(d.b-used,d.h,rows,d.k))return false;
   used+=rows*(d.h+d.k);
   counts[block.index]+=rows*cols*BigInt(pattern.repeat);
  }
  sheets+=BigInt(pattern.repeat);
 }
 return sheets===BigInt(plan.sheets)&&counts.every((n,i)=>n===BigInt(job.parts[i].qty));
}
function solveMixed(job){
 const options=job.parts.map(part=>[false,true].flatMap(turned=>{
  const d=dimensions({...job,part},turned);
  if(!d)return [];
  const cols=capacity(d.a,d.w,d.k);
  return cols>0n&&capacity(d.b,d.h,d.k)>0n?[{...d,cols,turned}]:[];
 }));
 if(!options.length||options.some(o=>!o.length))return null;
 // Tall strips first allow shorter strips to reuse the bottom of the same board.
 const order=options.map((o,i)=>i).sort((i,j)=>Number(options[j][0].h-options[i][0].h));
 const left=job.parts.map(p=>BigInt(p.qty)),patterns=[];
 const {a,b,k}=options[0][0];
 const boardArea=(a+k)*(b+k);
 const demandArea=options.reduce((sum,[d],i)=>sum+left[i]*(d.w+k)*(d.h+k),0n);
 let sheets=0n;
 while(left.some(n=>n>0n)){
  const blocks=[],usage=new Map();
  let height=b;
  for(const index of order){
   if(!left[index]||height<=0n)continue;
   let best=null;
   for(const d of options[index]){
    const rows=capacity(height,d.h,k);
    if(rows<=0n)continue;
    const count=left[index]<rows*d.cols?left[index]:rows*d.cols;
    const usedHeight=((count+d.cols-1n)/d.cols)*(d.h+k);
    if(!best||count>best.count||count===best.count&&usedHeight<best.usedHeight)
     best={d,count,usedHeight};
   }
   if(!best)continue;
   const {d,count,usedHeight}=best,full=count/d.cols,tail=count%d.cols;
   if(full)blocks.push({index,turned:d.turned,rows:Number(full),columns:Number(d.cols)});
   if(tail)blocks.push({index,turned:d.turned,rows:1,columns:Number(tail)});
   height-=usedHeight;usage.set(index,count);
  }
  if(!blocks.length)return null;
  let repeat=BigInt(job.stock.qty)-sheets;
  for(const [index,count] of usage)if(left[index]/count<repeat)repeat=left[index]/count;
  if(repeat<=0n)return null;
  for(const [index,count] of usage)left[index]-=repeat*count;
  sheets+=repeat;
  patterns.push({repeat:Number(repeat),blocks});
 }
 const plan={patterns,sheets:Number(sheets),proven:(demandArea+boardArea-1n)/boardArea===sheets};
 return auditMixed(job,plan)?plan:null;
}
const api={solve,audit,solveMixed,auditMixed};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausQuantityPlan=api;
})(typeof globalThis!=='undefined'?globalThis:this);
