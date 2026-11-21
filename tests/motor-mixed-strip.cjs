/* An independently audited, high-quantity heterogeneous-stock witness.
 * The new generator has no knowledge of the verifier's cut-tree algorithm.
 * A valid feasible plan is not evidence of a globally optimal objective.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'../docs'),win={};
for(const name of ['engine/material-policy.js','engine/production-audit.js',
 'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
 'engine/cutting-engine.js']){
 vm.runInNewContext(fs.readFileSync(path.join(dir,name),'utf8'),{window:win},
  {filename:name});
}
const state={mode:'guillotine',priceMode:'panel',kerf:3,trim:2};
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>state,val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={category:'panel',material:'panel|oak',t:18,rotate:true};
const parts=[
 ...Array.from({length:80},(_,i)=>({...base,id:'big-'+i,
  label:'B'+i,order:i,l:70,w:70,grain:i%2?'length':''})),
 ...Array.from({length:80},(_,i)=>({...base,id:'small-'+i,
  label:'S'+i,order:i+80,l:20,w:20,grain:i%3===0?'width':''}))
];
const cheap={id:'cheap',category:'panel',material:'panel|oak',t:18,
 l:100,w:100,qty:80,price:100,priceUnit:'panel',order:0};
const narrow={id:'narrow',category:'panel',material:'panel|oak',t:18,
 l:95,w:105,qty:80,price:160,priceUnit:'panel',order:1};
const cfg={mode:'guillotine',priceMode:'panel',objective:'cost',
 trim:2,kerf:3,m3:25000};
const data={parts,stocks:[cheap,narrow],trim:2,kerf:3,m3:25000};
const planner=win.BeythausMixedStripPatterns;
const attempt=planner.construct(parts,data.stocks,cfg,{timeBudgetMs:3000});
assert.equal(attempt.status,'feasible','The 160-item witness must be fully packed');
const plan=attempt.plan;
assert.equal(plan.unplaced.length,0);
assert.equal(plan.placedCount,160);
assert.equal(plan.bins.length,80,'Each board holds at most one 70mm square');
assert.equal(plan.cost,8000);
assert.equal(plan.stockArea,800000);
const verified=engine.auditCutPlan(plan,data);
assert.equal(verified.ok,true,
 'All cuts are full-length on the current subrectangle: '+verified.issues);
assert(plan.bins.some(b=>b.placed.length>1),
 'The algorithm actually generated shared-sheet strip patterns');
assert(plan.bins.every(b=>b.cuts.length>0),
 'Every cropped output has a recorded saw-kerf cut');
const forged=JSON.parse(JSON.stringify(plan));
forged.bins[0].cuts[0].y2-=1;
assert.equal(engine.auditCutPlan(forged,data).ok,false,
 'The independent verifier rejects a short non-guillotine cut');
const incomplete={bins:[],unplaced:parts.slice(),placedCount:0,
 partArea:0,stockArea:0,cost:0,unknownCostBins:0};
const repair=win.BeythausGuillotineBlockRepair.createRepair({
 packAttempt:()=>incomplete,auditCutPlan:engine.auditCutPlan,
 compare:(a,b)=>a.unplaced.length-b.unplaced.length,
 binCost:engine.binCost
});
const recovered=repair.repair(parts,data.stocks,cfg,incomplete,
 {timeBudgetMs:3000,maxAttempts:0});
assert.equal(recovered.solution.unplaced.length,0,
 'Block repair uses independently audited strip rescue first');
assert.equal(recovered.info.stripStatus,'feasible');
assert.equal(engine.auditCutPlan(recovered.solution,data).ok,true);
const missingPrice=planner.construct(parts,[{...cheap,price:null}],cfg,
 {timeBudgetMs:3000});
assert.equal(missingPrice.status,'feasible');
assert.equal(missingPrice.plan.cost,null,
 'Unknown registered prices must never become zero');
const timed=planner.construct(parts,data.stocks,cfg,{timeBudgetMs:0});
assert.equal(timed.status,'unknown','No resource means no feasibility proof');
assert.equal(timed.plan,null);
console.log('Mixed-stock 160 items / 80 sheets / kerf=3mm: physically audited strip plan, fallback adoption, tamper and unknown-price guards PASS.');
