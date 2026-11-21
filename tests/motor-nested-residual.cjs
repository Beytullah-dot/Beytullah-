/* Independently planted 3- and 4-level guillotine cuts with positive kerf.
 * Every fixture carries a separately built physical cut-tree witness.
 * The algorithm under test sees only pieces and available stock, never
 * the witness cuts or piece coordinates.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),window={};
for(const p of ['engine/material-policy.js','engine/production-audit.js',
 'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
 'engine/cutting-engine.js']){
 vm.runInNewContext(fs.readFileSync(path.join(docs,p),'utf8'),
  {window},{filename:p});
}
const engine=window.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:3,trim:2}),
 val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const solver=window.BeythausMixedStripPatterns;
const cfg={mode:'guillotine',objective:'cost',priceMode:'panel',
 trim:2,kerf:3,m3:25000};
function planted(i){
 const stock={id:'sheet-'+i,l:100+(i%4)*10,w:100+(i%3)*9,qty:1,
  t:18,material:'panel|oak',category:'panel',price:100+i,
  priceUnit:'panel',order:0};
 const W=stock.l-4,H=stock.w-4,k=3;
 const Aw=Math.floor(W*.61),Ah=Math.floor(H*.61);
 const rightW=W-Aw-k,bottomH=H-Ah-k;
 const Bh=Math.floor(H*.52),Ch=H-Bh-k;
 const Dw=Math.floor(Aw*.52),Ew=Aw-Dw-k;
 assert([Aw,Ah,rightW,bottomH,Bh,Ch,Dw,Ew].every(n=>n>10));
 const shapes=[[Aw,Ah],[rightW,Bh],[rightW,Ch],[Dw,bottomH],[Ew,bottomH]];
 const labels=['A','B','C','D','E'];
 const parts=shapes.map(([l,w],j)=>({
  id:'p-'+i+'-'+labels[j],label:labels[j]+'-'+i,order:j,
  l,w,t:18,material:'panel|oak',category:'panel',
  rotate:false,grain:'length'
 }));
 const bin={stock,placed:[],free:[],cuts:[]};
 function cut(source,axis,span){
  const vertical=axis==='vertical',at=(vertical?source.x:source.y)+span+k/2;
  bin.cuts.push({source:{...source},axis,at,number:bin.cuts.length+1,
   label:'Planted physical cut',x1:vertical?at:source.x,
   y1:vertical?source.y:at,x2:vertical?at:source.x+source.w,
   y2:vertical?source.y+source.h:at});
  const kept=vertical?{...source,w:span}:{...source,h:span};
  const rem=vertical?
   {x:source.x+span+k,y:source.y,w:source.w-span-k,h:source.h}:
   {x:source.x,y:source.y+span+k,w:source.w,h:source.h-span-k};
  return [kept,rem];
 }
 const root={x:2,y:2,w:W,h:H};
 const [left,right]=cut(root,'vertical',Aw);
 const [A,bottom]=cut(left,'horizontal',Ah);
 const [B,C]=cut(right,'horizontal',Bh);
 const [D,E]=cut(bottom,'vertical',Dw);
 for(const [index,rect] of [A,B,C,D,E].entries())
  bin.placed.push({...parts[index],...rect,rotated:false});
 const totalArea=parts.reduce((sum,p)=>sum+p.l*p.w,0);
 const witness={bins:[bin],unplaced:[],placedCount:5,partArea:totalArea,
  stockArea:stock.l*stock.w,cost:stock.price,unknownCostBins:0};
 return {data:{parts,stocks:[stock],trim:2,kerf:3,m3:25000},
  witness};
}
const sample=planted(0);
assert.equal(engine.auditCutPlan(sample.witness,sample.data).ok,true,
 'Independent planted four-cut tree must be physically valid');
const old=solver.construct(sample.data.parts,sample.data.stocks,cfg,
 {timeBudgetMs:1200,residualFill:false});
assert.notEqual(old.status,'feasible',
 'Pure equal-width strips cannot complete planted nested offcuts');
assert(old.plan&&old.plan.unplaced.length>0);
const improved=solver.construct(sample.data.parts,sample.data.stocks,cfg,
 {timeBudgetMs:1200});
assert.equal(improved.status,'feasible',
 'Nested side-offcut recovery must place all five pieces');
assert.equal(improved.plan.bins.length,1);
assert.equal(improved.plan.placedCount,5);
assert.equal(engine.auditCutPlan(improved.plan,sample.data).ok,true,
 'Independent auditor must accept every nested residual cut');
assert(improved.plan.bins[0].cuts.length>=4);
const forged=JSON.parse(JSON.stringify(improved.plan));
forged.bins[0].cuts[0].x1-=1;
assert.equal(engine.auditCutPlan(forged,sample.data).ok,false,
 'An abbreviated cut must be rejected');
const deadline=solver.construct(sample.data.parts,sample.data.stocks,cfg,
 {timeBudgetMs:0});
assert.equal(deadline.status,'unknown');
assert.equal(deadline.plan,null);
let baselineComplete=0,nestedComplete=0,invalid=0,unknown=0;
const started=Date.now(),peakBefore=process.memoryUsage().heapUsed;
const rows=[];
for(let i=0;i<18;i++){
 const job=planted(100+i);
 const witness=engine.auditCutPlan(job.witness,job.data);
 assert.equal(witness.ok,true,'The independent planted witness must be valid');
 const baseline=solver.construct(job.data.parts,job.data.stocks,cfg,
  {timeBudgetMs:800,residualFill:false});
 const candidate=solver.construct(job.data.parts,job.data.stocks,cfg,
  {timeBudgetMs:800});
 const before=baseline.plan?.unplaced.length??5;
 const after=candidate.plan?.unplaced.length??5;
 if(!before)baselineComplete++;
 if(!after)nestedComplete++;else unknown++;
 if(after>before)throw Error('Nested repair regressed feasibility: '+i);
 if(candidate.plan){
  const audited=engine.auditCutPlan(candidate.plan,job.data);
  if(!audited.ok)invalid++;
  assert.equal(audited.ok,true,'No invalid physical plan: '+i);
 }
 rows.push({seed:100+i,baselineUnplaced:before,newUnplaced:after,
  status:candidate.status,elapsedMs:candidate.elapsedMs});
}
assert.equal(invalid,0);
assert(nestedComplete>baselineComplete,'Nested residual cuts must improve holdout');
const report={cases:rows.length,baselineComplete,nestedComplete,unknown,
 invalid,elapsedMs:Date.now()-started,
 heapDeltaBytes:process.memoryUsage().heapUsed-peakBefore,rows};
if(process.env.MOTOR_NESTED_JSON)
 fs.writeFileSync(process.env.MOTOR_NESTED_JSON,JSON.stringify(report,null,2));
console.log('Physical 4-level kerf=3mm holdout: baseline complete '+baselineComplete+
 '/18; nested complete '+nestedComplete+'/18; UNKNOWN '+unknown+
 '; invalid '+invalid+'; elapsed '+report.elapsedMs+'ms');
