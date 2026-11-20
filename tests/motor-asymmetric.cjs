'use strict';
const assert=require('node:assert/strict');
const {engine}=require('./motor-scalability-profile.cjs');
const oracle=require('./optimization-oracle.cjs');
const common={material:'panel|audit',category:'panel',t:18};
function random(seed){let x=seed>>>0;return (lo,hi)=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return lo+Math.floor((hi-lo+1)*x/4294967296)}}
function part(i,l,w,grain){return {...common,id:'p'+i,label:'P'+i,order:i,l,w,grain,rotate:true}}
function stock(i,l,w,qty){return {...common,id:'s'+i,order:i,l,w,qty,price:10+i,priceUnit:'panel'}}
// Generate partitions independently of the repo generator. Retain both cut children,
// reverse input axes only together with a required 90 degree turn, shuffle all labels.
function planted(seed,i){
 const r=random(seed),boardCount=[3,5,8][i%3],trim=r(1,4),kerf=r(2,4),parts=[];
 const stocks=[stock(0,360+2*trim,250+2*trim,Math.ceil(boardCount/2)),
  stock(1,300+2*trim,275+2*trim,Math.floor(boardCount/2))];
 for(let j=0;j<boardCount;j++){
  const board=stocks[j%2],margin=[0,12,45,70][i%4];
  let rects=[[board.l-2*trim-margin,board.w-2*trim-margin]];
  for(let step=0;step<5+i%5;step++){
   const idx=r(0,rects.length-1),[l,w]=rects[idx],v=r(0,1),span=v?l:w;
   if(span<45)continue;
   const left=r(18,span-kerf-18),right=span-left-kerf;
   rects.splice(idx,1,...(v?[[left,w],[right,w]]:[[l,left],[l,right]]));
  }
  for(const [l,w] of rects){const g=r(0,2);parts.push(part(parts.length,g===1?w:l,g===1?l:w,['length','width',''][g]))}
 }
 for(let j=parts.length-1;j>0;j--){const k=r(0,j);[parts[k],parts[j]]=[parts[j],parts[k]]}
 parts.forEach((p,j)=>p.order=j);return {parts,stocks,kerf,trim};
}

// The second seed family was set aside before tuning the repair.
const holdout=process.argv.includes('--holdout');
const replaySix=process.argv.includes('--six');
const offset=holdout?0x90f734:0xbac011;
const previousFailures=[8,16,20,28,29,32];
const indices=replaySix?previousFailures:Array.from({length:36},(_,i)=>i);
let full=0,proven=0;
for(const i of indices){
 const seed=offset+65537*i,job=planted(seed,i);
 const start=performance.now();
 const plan=engine.optimize(job,true,false,'minimum');
 const replay=engine.auditCutPlan(plan,job);
 assert.ok(replay.ok,JSON.stringify(replay));
 const independent=oracle.audit(job,plan,'guillotine');
 assert.ok(independent.ok,JSON.stringify(independent));
 const cert=engine.certifyStockCount(plan,job,replay);
 if(!plan.unplaced.length)full++;
 else assert.ok(!cert.proven);
 if(cert.proven)proven++;
 console.log(JSON.stringify({i,seed,parts:job.parts.length,missing:plan.unplaced.length,
  boards:plan.bins.length,proven:cert.proven,ms:Math.round(performance.now()-start)}));
 if(!holdout){
  assert.equal(plan.unplaced.length,0,'Incomplete case '+i);
  if(previousFailures.includes(i)){
   assert.ok(cert.proven,'Minimum sheet count '+i);
   // Exercise the default objective with anonymous row IDs and reversed order.
   job.parts.reverse().forEach((p,index)=>Object.assign(p,{id:'r'+index,label:'R'+index,order:index}));
   const normal=engine.optimize(job,true,false);
   assert.equal(normal.unplaced.length,0,'Default calculation '+i);
   assert.ok(oracle.audit(job,normal,'guillotine').ok);
  }
 }
}
console.log(JSON.stringify({holdout,tested:indices.length,full,proven}));
assert.equal(full,indices.length,'All planted jobs must remain feasible');
