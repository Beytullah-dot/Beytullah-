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
