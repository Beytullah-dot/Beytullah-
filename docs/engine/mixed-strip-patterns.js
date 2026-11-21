/* Beythaus Cut — bounded, physically constructive mixed-stock strip patterns.
 * Multi-quantity and multiple stock sizes, positive kerf and trim, grain and
 * rotations. Every generated split spans the CURRENT subrectangle.
 * Heuristic: no impossibility or optimum proof; resource exhaustion UNKNOWN.
 * The caller must independently audit every candidate before adopting it.
 */
(function(root){
'use strict';
const EPS=1e-7;
const goodGap=(gap,k)=>gap>=-EPS&&(gap<=EPS||gap+EPS>=k);
function orientations(p,stock,preferRotation){
 const variants=[{w:p.l,h:p.w,rotated:false}];
 if(p.rotate)variants.push({w:p.w,h:p.l,rotated:true});
 if(preferRotation)variants.reverse();
 return variants.filter(o=>!root.BeythausMaterialPolicy||
  root.BeythausMaterialPolicy.grainAllows(p,stock,o.rotated));
}
function split(bin,rect,vertical,span,k){
 const length=vertical?rect.w:rect.h,gap=length-span;
 if(!goodGap(gap,k))return null;
 if(gap<=EPS)return {kept:rect,remainder:null};
 const at=(vertical?rect.x:rect.y)+span+k/2;
 const axis=vertical?'vertical':'horizontal';
 bin.cuts.push({axis,at,source:{...rect},number:bin.cuts.length+1,
  label:'Şerit kesimi',x1:vertical?at:rect.x,
  y1:vertical?rect.y:at,x2:vertical?at:rect.x+rect.w,
  y2:vertical?rect.y+rect.h:at});
 const kept=vertical?{...rect,w:span}:{...rect,h:span};
 const left=gap-k;
 const remainder=left>EPS?(vertical?
  {x:rect.x+span+k,y:rect.y,w:left,h:rect.h}:
  {x:rect.x,y:rect.y+span+k,w:rect.w,h:left}):null;
 return {kept,remainder}
}
// Complete leftover cut-tree leaves with nested full-edge cuts.
// A strip's side offcut may hold a differently sized part; abandoning it
// forces false partial solutions in otherwise simple three-stage jobs.
// Reuse only FREE leaves recorded by the original strip cuts and keep the
// fully materialized tree for the independent production auditor.
function fillResidual(bin,placed,order,stock,cfg,deadline,variant){
 const k=cfg.kerf;
 while(bin.free.length&&placed.size<order.length&&Date.now()<deadline){
  let best=null;
  for(let i=0;i<bin.free.length&&Date.now()<deadline;i++){
   const fr=bin.free[i];
   for(const p of order){
    if(placed.has(p.id)||p.material!==stock.material||
       p.t!==null&&(stock.t===null||Math.abs(p.t-stock.t)>1e-6))
     continue;
    for(const o of orientations(p,stock,variant%2===1)){
     if(o.w>fr.w+EPS||o.h>fr.h+EPS||
        !goodGap(fr.w-o.w,k)||!goodGap(fr.h-o.h,k))continue;
     const score=o.w*o.h/(fr.w*fr.h);
     if(!best||score>best.score+EPS)
      best={index:i,p,o,score};
    }
   }
  }
  if(!best)break;
  const rect=bin.free.splice(best.index,1)[0];
  // Either order yields a full-edge cutting tree. Alternating between
  // free-leaf shapes reduces but does not eliminate greedy myopia.
  const verticalFirst=variant%2===0?rect.w>=rect.h:rect.w<rect.h;
  const first=split(bin,rect,verticalFirst,
   verticalFirst?best.o.w:best.o.h,k);
  const second=split(bin,first.kept,!verticalFirst,
   verticalFirst?best.o.h:best.o.w,k);
  if(first.remainder)bin.free.push(first.remainder);
  if(second.remainder)bin.free.push(second.remainder);
  bin.placed.push({...best.p,x:second.kept.x,y:second.kept.y,
   w:best.o.w,h:best.o.h,rotated:best.o.rotated});
  placed.add(best.p.id);
 }
}
function sheet(items,stock,cfg,alongX,variant,deadline,residualFill){
 const usable={x:cfg.trim,y:cfg.trim,w:stock.l-2*cfg.trim,
  h:stock.w-2*cfg.trim};
 if(!(usable.w>0&&usable.h>0))return null;
 const k=cfg.kerf,bin={stock,placed:[],free:[],cuts:[]};
 const placed=new Set();
 const order=items.slice().sort((a,b)=>{
  const weight=p=>variant===0?p.l*p.w:variant===1?
   Math.max(p.l,p.w):variant===2?Math.min(p.l,p.w):alongX?p.l:p.w;
  return weight(b)-weight(a)||b.l*b.w-a.l*a.w||
   (a.order||0)-(b.order||0)
 });
 function find(rect,span){
  for(const p of order){
   if(placed.has(p.id))continue;
   if(p.material!==stock.material||
      p.t!==null&&(stock.t===null||Math.abs(p.t-stock.t)>1e-6))continue;
   for(const o of orientations(p,stock,variant%2===1)){
    const normal=alongX?o.w:o.h,cross=alongX?o.h:o.w;
    if(span!==null&&Math.abs(normal-span)>EPS)continue;
    if(o.w>rect.w+EPS||o.h>rect.h+EPS)continue;
    if(goodGap(rect.w-o.w,k)&&goodGap(rect.h-o.h,k))
     return {p,o,normal,cross}
   }
  }
  return null
 }
 let active=usable;
 while(active&&Date.now()<deadline){
  const first=find(active,null);
  if(!first){bin.free.push(active);active=null;break}
  const outer=split(bin,active,alongX,first.normal,k);
  if(!outer){bin.free.push(active);active=null;break}
  let inner=outer.kept;
  while(inner&&Date.now()<deadline){
   const chosen=find(inner,first.normal);
   if(!chosen){bin.free.push(inner);inner=null;break}
   const separate=split(bin,inner,!alongX,chosen.cross,k);
   if(!separate){bin.free.push(inner);inner=null;break}
   bin.placed.push({...chosen.p,x:separate.kept.x,y:separate.kept.y,
    w:chosen.o.w,h:chosen.o.h,rotated:chosen.o.rotated});
   placed.add(chosen.p.id);
   inner=separate.remainder
  }
  if(inner)bin.free.push(inner);
  active=outer.remainder;
 }
 if(active)bin.free.push(active);
 if(residualFill&&bin.free.length&&placed.size<items.length)
  fillResidual(bin,placed,order,stock,cfg,deadline,variant);
 if(!bin.placed.length)return null;
 return {bin,area:bin.placed.reduce((n,p)=>n+p.w*p.h,0)}
}
function build(items,stocks,cfg,variant,deadline,residualFill){
 let remaining=items.slice();
 const usage=new Map(),bins=[];
 while(remaining.length&&Date.now()<deadline){
  let best=null;
  for(const stock of stocks){
   if(Date.now()>=deadline)break;
   if(!Number.isInteger(stock.qty)||stock.qty<=0||
     (usage.get(stock.id)||0)>=stock.qty)continue;
   const unit=cfg.objective==='area'?stock.l*stock.w:
    root.BeythausMaterialPolicy?
    root.BeythausMaterialPolicy.stockPrice(stock,cfg):null;
   for(const alongX of [true,false]){
    for(let order=0;order<4&&Date.now()<deadline;order++){
     const c=sheet(remaining,stock,cfg,alongX,
      (order+variant)%4,deadline,residualFill);
     if(!c)continue;
     const efficiency=unit===null?-1:unit===0?
      Number.POSITIVE_INFINITY:c.area/unit;
     if(!best||efficiency>best.efficiency+EPS||
      Math.abs(efficiency-best.efficiency)<=EPS&&
       (c.area>best.area+EPS||c.bin.placed.length>best.bin.placed.length))
      best={...c,efficiency}
    }
   }
  }
  if(!best)break;
  bins.push(best.bin);
  usage.set(best.bin.stock.id,(usage.get(best.bin.stock.id)||0)+1);
  const chosen=new Set(best.bin.placed.map(p=>p.id));
  remaining=remaining.filter(p=>!chosen.has(p.id));
 }
 const allPieces=bins.flatMap(b=>b.placed);
 const missing=bins.filter(b=>!root.BeythausMaterialPolicy||
  root.BeythausMaterialPolicy.stockPrice(b.stock,cfg)===null).length;
 const cost=missing?null:bins.reduce((sum,b)=>sum+
  root.BeythausMaterialPolicy.stockPrice(b.stock,cfg),0);
 const plan={bins,unplaced:remaining,placedCount:allPieces.length,
  partArea:allPieces.reduce((sum,p)=>sum+p.w*p.h,0),
  stockArea:bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0),
  unknownCostBins:missing,cost};
 return plan
}
function construct(items,stocks,cfg,{timeBudgetMs=180,residualFill=true}={}){
 const started=Date.now(),deadline=started+Math.max(0,timeBudgetMs);
 if(!Array.isArray(items)||!Array.isArray(stocks)||
  !Number.isFinite(cfg?.kerf)||cfg.kerf<0||
  !Number.isFinite(cfg?.trim)||cfg.trim<0||
  !['guillotine'].includes(cfg?.mode))
  return {status:'unknown',plan:null,reason:'invalid-input'};
 let best=null,attempts=0;
 // Preserve the previous fast two-stage path. Running nested recovery
 // for EVERY stock/variant/board under a short mobile deadline could
 // exhaust the budget before completing a formerly feasible large job.
 // Invoke the more expensive nested pass only for a genuinely partial job.
 const attemptStage=withResidual=>{
  for(let variant=0;variant<3&&Date.now()<deadline;variant++){
   const trial=build(items,stocks,cfg,variant,deadline,withResidual);
   attempts++;
   const metric=p=>cfg.objective==='area'?p.stockArea:p.cost;
   if(!best||trial.unplaced.length<best.unplaced.length||
      trial.unplaced.length===best.unplaced.length&&
      metric(trial)!==null&&
      (metric(best)===null||metric(trial)<metric(best)-EPS))
    best=trial;
   if(best.unplaced.length===0)break;
  }
 };
 attemptStage(false);
 if(residualFill&&best?.unplaced.length&&Date.now()<deadline)
  attemptStage(true);
 return {status:best&&best.unplaced.length===0?'feasible':'unknown',
  plan:best,nodes:attempts,elapsedMs:Date.now()-started,
  reason:best?.unplaced.length?'incomplete-or-resource-limited':null}
}
const api=Object.freeze({version:1,construct});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.BeythausMixedStripPatterns=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
