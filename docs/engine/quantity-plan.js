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
const api={solve,audit};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausQuantityPlan=api;
})(typeof globalThis!=='undefined'?globalThis:this);
