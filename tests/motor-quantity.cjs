'use strict';
const assert=require('node:assert/strict');
require('../docs/engine/material-policy.js');
const {solve,audit}=require('../docs/engine/quantity-plan.js');
const job={part:{category:'panel',material:'panel|test',t:18,rotate:true,l:22,w:22,qty:2001},
 stock:{category:'panel',material:'panel|test',t:18,l:104,w:104,qty:126},kerf:3,trim:2};
const result=solve(job);
assert.deepEqual(result.patterns,[{repeat:125,rows:4,columns:4,tail:0},{repeat:1,rows:0,columns:0,tail:1}]);
assert.ok(result.proven&&audit(job,result));
assert.equal(solve({...job,stock:{...job.stock,qty:125}}),null);
for(const mutate of [p=>p.patterns[0].columns++,p=>p.patterns[1].repeat++,p=>p.sheets++]){
 const p=structuredClone(result);mutate(p);assert.equal(audit(job,p),false);
}
const max=Number.MAX_SAFE_INTEGER;
const huge={...job,part:{...job.part,qty:max},stock:{...job.stock,qty:max}};
assert.ok(audit(huge,solve(huge)));
for(const grain of ['length','width']){
 const directed={...job,part:{...job.part,grain}};
 assert.equal(solve(directed).turned,grain==='width');
}
assert.equal(solve({...job,part:{...job.part,rotate:false,grain:'width'}}),null);
assert.equal(solve({...job,stock:{...job.stock,t:15}}),null);
// Reconstruct every cut for small generated geometries using repeated subtraction,
// including the final sliver that can be shorter than a blade.
function replay(span,size,count,k){
 for(let i=0;i<count;i++){if(span===size)span=0;else {span-=size+k;assert.ok(span>=0)}}
}
let checked=0;
for(let w=3;w<=21;w++)for(let h=4;h<=16;h++)for(let k=0;k<=3;k++)for(let qty=1;qty<=19;qty++){
 const j={part:{...job.part,l:3,w:4,qty},stock:{...job.stock,l:w,w:h,qty:30},kerf:k,trim:0};
 const p=solve(j);if(!p)continue;
 let pieces=0;
 for(const pat of p.patterns){
  replay(h,p.turned?3:4,pat.rows+Number(pat.tail>0),k);
  for(let r=0;r<pat.rows;r++)replay(w,p.turned?4:3,pat.columns,k);
  replay(w,p.turned?4:3,pat.tail,k);
  pieces+=pat.repeat*(pat.rows*pat.columns+pat.tail);
 }
 assert.equal(pieces,qty);checked++;
}
console.log('PASS: 2001 pieces/126 sheets, safe integer quantities, direction, thickness, corrupted plans and '+checked+' replayed geometries');
const {solveMixed,auditMixed}=require('../docs/engine/quantity-plan.js');
const mixed={...job,stock:{...job.stock,qty:751},parts:[53,44].map((height,i)=>({
 ...job.part,l:i?height:100,w:i?100:height,grain:i?'width':'length',qty:751
}))};
const shared=solveMixed(mixed);
assert.ok(shared.proven&&auditMixed(mixed,shared));
assert.equal(shared.sheets,751);
assert.deepEqual(shared.patterns,[{repeat:751,blocks:[
 {index:0,turned:false,rows:1,columns:1},{index:1,turned:true,rows:1,columns:1}
]}]);
for(const mutate of [p=>p.patterns[0].blocks[1].index=0,p=>p.patterns[0].blocks[1].turned=false,
 p=>p.patterns[0].blocks[0].rows++,p=>p.patterns[0].repeat--]){
 const corrupt=structuredClone(shared);mutate(corrupt);assert.equal(auditMixed(mixed,corrupt),false);
}
assert.equal(solveMixed({...mixed,stock:{...mixed.stock,qty:750}}),null);
const hugeMixed={...mixed,stock:{...mixed.stock,qty:max},parts:mixed.parts.map(p=>({...p,qty:max}))};
assert.equal(solveMixed(hugeMixed).patterns[0].repeat,max);
// Replay raw individual cuts and count demand by row without using the symbolic auditor.
let mixedChecked=0,unproved=0;
for(let height=7;height<20;height++)for(let width=10;width<25;width++)for(let k=0;k<4;k++){
 const sample={...mixed,trim:0,kerf:k,stock:{...mixed.stock,l:width,w:height},parts:[
  {...mixed.parts[0],l:5,w:4,qty:35},{...mixed.parts[1],l:3,w:4,qty:16}
 ]};
 const plan=solveMixed(sample);if(!plan)continue;
 const totals=[0,0];
 for(const pat of plan.patterns){
  let left=height;
  for(const block of pat.blocks){
   const part=sample.parts[block.index],h=block.turned?part.l:part.w,w=block.turned?part.w:part.l;
   for(let r=0;r<block.rows;r++){
    left=left===h?0:left-h-k;assert.ok(left>=0);
    replay(width,w,block.columns,k);
    totals[block.index]+=block.columns*pat.repeat;
   }
  }
 }
 assert.deepEqual(totals,[35,16]);
 mixedChecked++;if(!plan.proven)unproved++;
}
assert.ok(mixedChecked&&unproved);
console.log('PASS: 1502 mixed pieces on 751 certified boards; '+mixedChecked+' physical replays; '+unproved+' feasible without proof');
