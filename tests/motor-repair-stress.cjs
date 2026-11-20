#!/usr/bin/env node
/* Deterministic, physically feasible varied-shape workload.
 * This is an exploration of hard classes, NOT a proof of universal capacity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {benchmark}=require('./motor-scalability-profile.cjs');
const cases=[];
for(let i=0;i<12;i++){
 cases.push({name:'full-stock-single-'+i,boards:25,depth:3,seed:1000+i});
 cases.push({name:'full-stock-varied-'+i,boards:25,depth:3,
  variable:true,seed:2000+i});
}
for(let i=0;i<5;i++){
 cases.push({name:'salvage-strip-'+i,boards:10,depth:3,margin:12,seed:3000+i});
 cases.push({name:'deeper-pattern-'+i,boards:10,depth:4,seed:4000+i});
}
let improved=0,worse=0,valid=0,full=0,fullBaseline=0;
const result=[];
for(const c of cases){
 const r=benchmark(c);
 assert.ok(r.unplaced<=r.baselineUnplaced,
  c.name+' must never worsen placed-piece count');
 assert.ok(r.usedBoards<=c.boards,
  c.name+' must respect physical stock quantity');
 assert.equal(r.unplaced,0,c.name+' must place every part');
 assert.equal(r.feasible,true,c.name+' must pass independent cut-tree replay');
 if(r.unplaced<r.baselineUnplaced)improved++;
 if(r.unplaced>r.baselineUnplaced)worse++;
 if(r.feasible)full++;
 if(r.baselineUnplaced===0)fullBaseline++;
 result.push(r);
 console.log(c.name+'  '+r.baselineUnplaced+'→'+r.unplaced+
  ' unplaced, '+r.elapsedMs+' ms, proven='+r.exactCountProven);
}
const report={tested:cases.length,improved,worse,
 fullBaseline,fullEnhanced:full,results:result};
fs.writeFileSync(path.join(__dirname,'motor-repair-stress-results.json'),
 JSON.stringify(report,null,2)+'\n');
console.log('STRESS_SUMMARY '+JSON.stringify({
 tested:report.tested,improved,worse,
 fullBaseline,fullEnhanced:full
}));
