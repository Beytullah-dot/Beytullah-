/* Independent shape-diverse holdout for bounded guillotine recovery.
 * Deterministic tree witnesses are test-only and never passed to the optimizer.
 * Six leaves/five cuts per board; different topology and dimensions from PR #57.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const docs=path.join(__dirname,'../docs');
const source=p=>fs.readFileSync(path.join(docs,p),'utf8');
const scope={};
for(const f of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/fullspan-strip-exact.js','engine/production-audit.js',
 'engine/mixed-strip-patterns.js','engine/guillotine-block-repair.js',
 'engine/cutting-engine.js'])
 vm.runInNewContext(source(f),{window:scope},{filename:f});
const engine=scope.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel'}),
 val:Number,mkey:x=>String(x||'').toLowerCase(),fmt:Number
});
const oracle=require('./optimization-oracle.cjs');
const kerf=2,trim=3,objectives=['minimum','area','economic'];
function fixture(boardCount,negative){
 const parts=[],stocks=[],witnessBins=[],byType=new Map();
 for(let j=0;j<boardCount;j++){
  const type=j%4,W=139+13*type,H=121+9*(type%3);
  const material=j%2?'masif|holdout-ash':'panel|holdout-oak';
  const t=j%2?30:18,id='h-stock-'+type;
  let s=byType.get(id);
  if(!s){
   s={id,material,t,category:j%2?'masif':'panel',
    l:W+2*trim,w:H+2*trim,qty:0,order:stocks.length,
    price:j%2?21500+type*200:210+type*17,priceUnit:j%2?'m3':'panel'};
   byType.set(id,s);stocks.push(s)
  }
  s.qty++;
  const root={x:trim,y:trim,w:W,h:H},cuts=[];
  function split(rect,axis,span){
   const v=axis==='vertical',dim=v?rect.w:rect.h;
   assert(span>0&&dim-span-kerf>0);
   const at=(v?rect.x:rect.y)+span+kerf/2;
   cuts.push({axis,at,source:{...rect},number:cuts.length+1,
    label:'Independent holdout tree',
    x1:v?at:rect.x,y1:v?rect.y:at,
    x2:v?at:rect.x+rect.w,y2:v?rect.y+rect.h:at});
   return v?[
    {...rect,w:span},
    {x:rect.x+span+kerf,y:rect.y,w:dim-span-kerf,h:rect.h}
   ]:[
    {...rect,h:span},
    {x:rect.x,y:rect.y+span+kerf,w:rect.w,h:dim-span-kerf}
   ]
  }
  const [top,bottom]=split(root,'horizontal',Math.floor(H*.49));
  const [tl,tr]=split(top,'vertical',Math.floor(W*.52));
  const [bl,br]=split(bottom,'vertical',Math.floor(W*.43));
  const [bl1,bl2]=split(bl,'horizontal',Math.floor(bl.h*.56));
  const [tr1,tr2]=split(tr,'horizontal',Math.floor(tr.h*.54));
  const leaves=[tl,tr1,tr2,bl1,bl2,br];
  const placed=[];
  for(let i=0;i<leaves.length;i++){
   const rect=leaves[i],rotated=(i===1||i===4);
   const p={id:'h-'+j+'-'+i,material,t,
    label:'Holdout piece '+j+'/'+i,
    l:rotated?rect.h:rect.w,w:rotated?rect.w:rect.h,
    grain:rotated?'width':'length',rotate:rotated,
    category:s.category,order:parts.length};
   parts.push(p);placed.push({...p,...rect,rotated})
  }
  witnessBins.push({stock:s,placed,cuts,free:[]})
 }
 if(negative)for(const s of stocks)s.qty=0;
 // Reverse input order: production algorithm cannot rely on planted board IDs.
 parts.reverse();
 const data={parts,stocks,kerf,trim,m3:27000};
 const witness={bins:witnessBins,unplaced:[],placedCount:parts.length,
  stockArea:witnessBins.reduce((a,b)=>a+b.stock.l*b.stock.w,0),
  partArea:parts.reduce((a,p)=>a+p.l*p.w,0),cost:0,unknownCostBins:0};
 if(!negative)audit(witness,data);
 return data
}
function audit(plan,data){
 assert.equal(engine.auditCutPlan(plan,data).ok,true,'Production auditor rejected candidate');
 const independent=oracle.audit(data,plan,'guillotine');
 assert.equal(independent.ok,true,'Independent auditor: '+independent.issues)
}
const rows=[];
for(const boards of [2,4,8,16])for(const objective of objectives){
 const data=fixture(boards,false),n=data.parts.length;
 const t=performance.now();
 const baseline=engine.optimize(data,false,false,objective);
 const candidate=engine.optimize(data,true,false,objective);
 audit(baseline,data);audit(candidate,data);
 const oldFull=baseline.unplaced.length===0&&baseline.placedCount===n;
 const newFull=candidate.unplaced.length===0&&candidate.placedCount===n;
 assert(!oldFull||newFull,'Enhanced path lost a completed baseline plan');
 const negative=fixture(boards,true);
 const impossible=engine.optimize(negative,true,false,objective);
 audit(impossible,negative);
 assert(impossible.unplaced.length>0,'Empty-stock fixture was accepted as complete');
 rows.push({N:n,objective,baseline:oldFull,enhanced:newFull,
  elapsedMs:Math.round(performance.now()-t)});
}
const summary={holdout:'alternate-six-leaf-five-cut topology',tests:rows.length,
 baselineComplete:rows.filter(x=>x.baseline).length,
 enhancedComplete:rows.filter(x=>x.enhanced).length,
 falseFullOnEmptyStock:0,rows};
console.log('SHAPE-HOLDOUT-SUMMARY '+JSON.stringify(summary));
if(process.env.MOTOR_SHAPE_HOLDOUT_JSON)
 fs.writeFileSync(process.env.MOTOR_SHAPE_HOLDOUT_JSON,JSON.stringify(summary,null,2)+'\n');
