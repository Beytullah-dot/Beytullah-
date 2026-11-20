#!/usr/bin/env node
/* Beythaus Cut - reproducible scale profiles, NOT an alleged universal
 * upper item count. Tests the production packing engine with guaranteed-
 * feasible, planted physical guillotine cutting trees. Real global optima
 * are UNKNOWN unless the independent certificate proves them.
 *
 * Reproduce: node tests/motor-scalability-profile.cjs
 * Results: tests/motor-scalability-profile-results.json (CI artifact only).
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),root={};
for(const name of ['material-policy.js','optimality-certificate.js',
 'production-audit.js','guillotine-block-repair.js','cutting-engine.js']){
 vm.runInNewContext(fs.readFileSync(path.join(docs,'engine',name),'utf8'),
  {window:root},{filename:name});
}
const state={mode:'guillotine',priceMode:'panel',kerf:3,trim:0,
 offcutMinEdgeMm:50,offcutMinAreaCm2:100};
const engine=root.BeythausCutEngine.createEngine({
 getState:()=>state,val:Number,mkey:(mat,t)=>String(mat).trim().toLocaleLowerCase('tr-TR')+'|'+t,
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function makeCase({name,boards,depth,variable=false,rotate=false,seed=1,margin=0}){
 const random=rng(seed),material='panel|benchmark',kerf=3;
 const definitions=variable?[
  {l:1200,w:800,price:1080},{l:1400,w:900,price:1540},
  {l:1100,w:850,price:1170}
 ]:[{l:1200,w:800,price:1200}];
 const quantities=new Array(definitions.length).fill(0),parts=[];
 let cuts=0;
 function partition(rect,remaining,board,level){
  if(remaining===0||Math.min(rect.l,rect.w)<120){
   parts.push({id:'p'+parts.length,origin:'test',order:parts.length,
    label:'P'+(parts.length+1),l:rect.l,w:rect.w,t:18,category:'panel',
    material,rotate,grain:rotate?'':'length'});
   return
  }
  // Alternating cut directions, variable sizes: a valid guillotine
  // construction from the *very same* finite physical stock.
  const axis=level%2===0?'l':'w';
  const dim=rect[axis],minimum=35;
  if(dim<minimum*2+kerf){
   partition(rect,0,board,level);return
  }
  const split=Math.max(minimum,Math.min(dim-kerf-minimum,
   Math.round((0.28+0.44*random())*(dim-kerf))));
  const first={...rect,[axis]:split};
  const second={...rect,[axis]:dim-split-kerf};
  cuts++;
  partition(first,remaining-1,board,level+1);
  partition(second,remaining-1,board,level+1)
 }
 for(let board=0;board<boards;board++){
  const choice=variable?board%definitions.length:0;
  quantities[choice]++;
  partition({...definitions[choice],l:definitions[choice].l-margin,
   w:definitions[choice].w-margin},depth,board,0)
 }
 // Deterministic Fisher-Yates shuffle. Input order must NOT reveal
 // which pieces were extracted from the same stock.
 for(let i=parts.length-1;i>0;i--){
  const j=Math.floor(random()*(i+1));
  [parts[i],parts[j]]=[parts[j],parts[i]]
 }
 parts.forEach((p,i)=>p.order=i);
 const stocks=definitions.map((s,i)=>({...s,id:'b'+i,qty:quantities[i],t:18,
  material,category:'panel',priceUnit:'panel',order:i}));
 return {name,parts,stocks,trim:0,kerf,m3:25000,
  metadata:{plantedBoards:boards,partCount:parts.length,stockTypes:stocks.length,
   plantedCuts:cuts,seed,depth,variable,rotate}};
}
const specs=[
 {name:'hetero-5-boards-4p',boards:5,depth:2,seed:111},
 {name:'hetero-10-boards-4p',boards:10,depth:2,seed:112},
 {name:'hetero-25-boards-4p',boards:25,depth:2,seed:113},
 {name:'hetero-50-boards-4p',boards:50,depth:2,seed:114},
 {name:'hetero-10-boards-8p',boards:10,depth:3,seed:211},
 {name:'hetero-25-boards-8p',boards:25,depth:3,seed:212},
 {name:'hetero-50-boards-8p',boards:50,depth:3,seed:213},
 {name:'rotatable-25-boards-8p',boards:25,depth:3,rotate:true,seed:310},
 {name:'variable-stock-10-boards-8p',boards:10,depth:3,variable:true,seed:410},
 {name:'variable-stock-25-boards-8p',boards:25,depth:3,variable:true,seed:411},
 {name:'variable-stock-50-boards-8p',boards:50,depth:3,variable:true,seed:412}
];
function benchmark(spec){
 const data=makeCase(spec);
 // The generator's split tree is a mathematical feasibility witness,
 // but is intentionally hidden from the production engine.
 const begin=performance.now();
 const baseline=engine.optimize(data,false,false);
 const baselineMs=Math.round(performance.now()-begin);
 const refinedAt=performance.now();
 const plan=engine.optimize(data,true,false);
 const elapsedMs=Math.round(performance.now()-refinedAt);
 const complete=plan.unplaced.length===0&&plan.placedCount===data.parts.length;
 const audit=engine.auditCutPlan(plan,data);
 if(complete)assert.equal(audit.ok,true,'Audited full cutting tree: '+spec.name);
 const certified=complete?engine.certifyStockCount(plan,data,audit):null;
 return {name:data.name,parts:data.parts.length,stockTypes:data.stocks.length,
  plantedBoards:spec.boards,usedBoards:plan.bins.length,
  baselineUnplaced:baseline.unplaced.length,baselineMs,
  blockRepairAttempts:plan.search?.blockRepairAttempts||0,
  blockRescuedPieces:plan.search?.blockRescuedPieces||0,
  unplaced:plan.unplaced.length,feasible:complete&&audit.ok,
  exactCountProven:!!certified?.proven,
  countLowerBound:certified?.lowerBound??null,
  elapsedMs,cutSteps:plan.bins.reduce((n,b)=>n+b.cuts.length,0),
  note:!complete?'Known guillotine-feasible input; heuristic did not fit all pieces':
    certified?.proven?'Global minimum stock count PROVEN':
      'Physically complete; global minimum stock count not proven'};
}
if(require.main===module){
 const results=specs.map(spec=>{
  const r=benchmark(spec);
  console.log(JSON.stringify(r));return r
 });
 const summary={total:results.length,feasible:results.filter(r=>r.feasible).length,
  proven:results.filter(r=>r.exactCountProven).length,
  largestTestedParts:Math.max(...results.map(r=>r.parts)),
  largestTestedBoards:Math.max(...results.map(r=>r.plantedBoards)),results};
 const out=path.join(__dirname,'motor-scalability-profile-results.json');
 fs.writeFileSync(out,JSON.stringify(summary,null,2)+'\n');
 console.log('SUMMARY '+JSON.stringify({
  tested:summary.total,feasible:summary.feasible,
  proven:summary.proven,largestTestedParts:summary.largestTestedParts,
  largestTestedBoards:summary.largestTestedBoards
 }));
}
module.exports={makeCase,benchmark,specs};
