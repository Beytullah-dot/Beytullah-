/* Beythaus Cut / Engine Panel 01 — packing, bounds and production audit.
 * This is the EXACT mathematical core extracted from docs/index.html.
 * No DOM, network, inventory mutation, PDF, or Web Worker side effects.
 * State remains read-only and is resolved on each access so switching projects
 * does not capture a stale project object.
 *
 * Facade API is intentionally narrow. Internal methods stay private.
 * Tests in tests/engine-harness.cjs run this same shipped file.
 * Exact Worker solvers remain isolated in their own files.
 */
(function(root){
'use strict';
const CONTRACT_VERSION=1;
function createEngine({getState,val,mkey,fmt}={}){
 if(typeof getState!=='function'||typeof val!=='function'||
    typeof mkey!=='function'||typeof fmt!=='function')
  throw new TypeError('Engine dependencies must be getState, val, mkey, fmt');
 const state=new Proxy(Object.create(null),{
  get(_target,key){
   const current=getState();
   return current==null?undefined:current[key]
  },
  set(){throw new TypeError('Calculation core must not mutate project state')}
 });
 const blockRepairModule=root.BeythausGuillotineBlockRepair;
 const productionAudit=root.BeythausCutProductionAudit;
 if(!productionAudit||productionAudit.contractVersion!==CONTRACT_VERSION)
  throw new Error('Kesim doğrulama devresi bulunamadı veya sürümü farklı.');
 const {auditGuillotineCuts,validateLayout,auditCutPlan}=
  productionAudit.createAudit({getState,mkey});

function intersect(a,b){return a.x<b.x+b.w-1e-7&&a.x+a.w>b.x+1e-7&&a.y<b.y+b.h-1e-7&&a.y+a.h>b.y+1e-7}
function contain(a,b){return a.x>=b.x-1e-7&&a.y>=b.y-1e-7&&a.x+a.w<=b.x+b.w+1e-7&&a.y+a.h<=b.y+b.h+1e-7}
function prune(rects){const out=[];for(let i=0;i<rects.length;i++){let v=rects[i],keep=v.w>1e-7&&v.h>1e-7;for(let j=0;keep&&j<rects.length;j++)if(i!==j&&contain(v,rects[j])){if(!contain(rects[j],v)||j<i)keep=false}if(keep)out.push(v)}return out}
function splitNest(free,used,k){let next=[];let occ={x:used.x-k,y:used.y-k,w:used.w+2*k,h:used.h+2*k};for(const fr of free){if(!intersect(fr,occ)){next.push(fr);continue}const fx=fr.x,fy=fr.y,rx=fx+fr.w,by=fy+fr.h,ux=occ.x,uy=occ.y,ur=ux+occ.w,ub=uy+occ.h;
if(ux>fx)next.push({x:fx,y:fy,w:ux-fx,h:fr.h});if(ur<rx)next.push({x:ur,y:fy,w:rx-ur,h:fr.h});if(uy>fy)next.push({x:fx,y:fy,w:fr.w,h:uy-fy});if(ub<by)next.push({x:fx,y:ub,w:fr.w,h:by-ub});}return prune(next)}
function splitGuillotine(fr,used,k,dir){const rw=fr.w-used.w-k,bh=fr.h-used.h-k;const out=[];if(dir==='vertical'){if(rw>1e-6)out.push({x:fr.x+used.w+k,y:fr.y,w:rw,h:fr.h});if(bh>1e-6)out.push({x:fr.x,y:fr.y+used.h+k,w:used.w,h:bh})}else{if(rw>1e-6)out.push({x:fr.x+used.w+k,y:fr.y,w:rw,h:used.h});if(bh>1e-6)out.push({x:fr.x,y:fr.y+used.h+k,w:fr.w,h:bh})}return out}
const rand=(seed)=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296};
function orderParts(items,trial){const rnd=rand(1013+trial*1777),f=trial%9;return items.map(it=>({...it,jitter:rnd()})).sort((a,b)=>{let sa,sb;switch(f){case 0:sa=a.l*a.w;sb=b.l*b.w;break;case 1:sa=Math.max(a.l,a.w);sb=Math.max(b.l,b.w);break;case 2:sa=Math.min(a.l,a.w);sb=Math.min(b.l,b.w);break;case 3:sa=a.l*a.w+3*Math.max(a.l,a.w);sb=b.l*b.w+3*Math.max(b.l,b.w);break;case 4:sa=a.w;sb=b.w;break;case 5:sa=a.l;sb=b.l;break;case 6:sa=(a.l*a.w)*(0.72+a.jitter*.56);sb=(b.l*b.w)*(0.72+b.jitter*.56);break;case 7:sa=Math.max(a.l,a.w)*(0.65+a.jitter*.7);sb=Math.max(b.l,b.w)*(0.65+b.jitter*.7);break;default:sa=a.l*a.w*(0.4+a.jitter*1.2);sb=b.l*b.w*(0.4+b.jitter*1.2)}return sb-sa||b.l*b.w-a.l*a.w||a.order-b.order})}
function evalFit(fr,w,h,variant){const dw=fr.w-w,dh=fr.h-h;if(dw< -1e-7||dh< -1e-7)return Infinity;const sh=Math.min(dw,dh),lg=Math.max(dw,dh);switch(variant%5){case 0:return sh*1e3+lg;case 1:return dw*dh*1e2+sh;case 2:return lg*1000+sh;case 3:return dh*110+dw;default:return dw*110+dh}}
function binCost(s,cfg){const p=root.BeythausMaterialPolicy;if(p)return p.stockPrice(s,cfg);if(s.isRemnant)return 0;if(cfg.priceMode==='panel')return s.price>0?s.price:null;if(s.t===null||!(cfg.m3>0))return null;return s.l*s.w*s.t/1e9*cfg.m3}
function mkBin(s,trim){let w=s.l-2*trim,h=s.w-2*trim;return{stock:s,x:trim,y:trim,w,h,free:[{x:trim,y:trim,w,h}],placed:[],cuts:[]}}
function orientationChoices(it){const all=it.rotate&&(Math.abs(it.l-it.w)>1e-7||!!it.grain)?[[it.l,it.w,false],[it.w,it.l,true]]:[[it.l,it.w,false]];return all.filter(([, ,rotated])=>!root.BeythausMaterialPolicy||root.BeythausMaterialPolicy.grainAllows(it,null,rotated))}
function findFit(bin,it,variant){if(it.t!==null&&(bin.stock.t===null||Math.abs(it.t-bin.stock.t)>1e-6))return null;let best=null;for(let j=0;j<bin.free.length;j++){const fr=bin.free[j];for(const [w,h,rotated]of orientationChoices(it)){if(root.BeythausMaterialPolicy&&!root.BeythausMaterialPolicy.grainAllows(it,bin.stock,rotated))continue;if(w>fr.w+1e-8||h>fr.h+1e-8)continue;if(state.mode==='guillotine'){const k=val(state.kerf),rx=fr.w-w,ry=fr.h-h;if(rx>1e-6&&rx<k-1e-6||ry>1e-6&&ry<k-1e-6)continue}let score=evalFit(fr,w,h,variant);if(score===Infinity)continue;const tie=(fr.x+fr.y)*.00001+Number(rotated)*.00001;score+=tie;if(!best||score<best.score)best={freeIndex:j,x:fr.x,y:fr.y,w,h,rotated,score,fr}}}return best}

function applyFit(bin,it,fit,cfg,splitVariant){
 const used={...it,x:fit.x,y:fit.y,w:fit.w,h:fit.h,rotated:fit.rotated};
 bin.placed.push(used);
 if(cfg.mode==='nest'){bin.free=splitNest(bin.free,used,cfg.kerf);return}
 const rect=bin.free.splice(fit.freeIndex,1)[0],dw=rect.w-used.w,dh=rect.h-used.h;
 const dir=splitVariant===0?'vertical':splitVariant===1?'horizontal':splitVariant===2?(dw>=dh?'vertical':'horizontal'):(dw<dh?'vertical':'horizontal');
 bin.free.push(...splitGuillotine(rect,used,cfg.kerf,dir));
 function step(axis,source,at){
  const alongX=axis==='vertical',x1=alongX?at:source.x,y1=alongX?source.y:at,x2=alongX?at:source.x+source.w,y2=alongX?source.y+source.h:at;
  bin.cuts.push({x1,y1,x2,y2,axis,at,source:{x:source.x,y:source.y,w:source.w,h:source.h},label:used.label,number:bin.cuts.length+1});
 }
 if(dir==='vertical'){
  if(dw>1e-6)step('vertical',rect,used.x+used.w+cfg.kerf/2);
  if(dh>1e-6)step('horizontal',{x:rect.x,y:rect.y,w:used.w,h:rect.h},used.y+used.h+cfg.kerf/2);
 }else{
  if(dh>1e-6)step('horizontal',rect,used.y+used.h+cfg.kerf/2);
  if(dw>1e-6)step('vertical',{x:rect.x,y:rect.y,w:rect.w,h:used.h},used.x+used.w+cfg.kerf/2);
 }
}
function packAttempt(items,stocks,cfg,trial){const ordered=orderParts(items,trial),bins=[],unplaced=[],used={},suffix=new Array(ordered.length+1).fill(0);for(let k=ordered.length-1;k>=0;k--)suffix[k]=suffix[k+1]+ordered[k].l*ordered[k].w;const variant=Math.floor(trial/2)%5,splitVariant=Math.floor(trial/5)%4,stockSelect=Math.floor(trial/7)%4;
for(let idx=0;idx<ordered.length;idx++){const it=ordered[idx];let match=null;for(let bi=0;bi<bins.length;bi++){const fit=findFit(bins[bi],it,variant);if(fit&&(!match||fit.score<match.fit.score))match={bin:bins[bi],fit}}if(match){applyFit(match.bin,it,match.fit,cfg,splitVariant);continue}
let choices=[];for(const s of stocks){if(used[s.id]>=s.qty||s.qty===0)continue;const tmp=mkBin(s,cfg.trim);if(tmp.w<=0||tmp.h<=0)continue;const fit=findFit(tmp,it,variant);if(!fit)continue;const remainingArea=suffix[idx];const usableArea=tmp.w*tmp.h;const cost=binCost(s,cfg),missingCost=cost===null,rankCost=cost??0;let rank;
if(stockSelect===0)rank=rankCost+(usableArea-it.l*it.w)*.000001;
else if(stockSelect===1)rank=Math.ceil(remainingArea/usableArea)*Math.max(rankCost,1)+usableArea*.0000001;
else if(stockSelect===2)rank=usableArea;
else rank=(Math.ceil(remainingArea/usableArea)*Math.max(rankCost,1))+(Math.abs(remainingArea-usableArea)*.000001);
choices.push({s,tmp,fit,rank,missingCost})}
choices.sort((a,b)=>Number(a.missingCost)-Number(b.missingCost)||a.rank-b.rank||a.s.order-b.s.order);if(!choices.length){unplaced.push(it);continue}let c=choices[0];used[c.s.id]=(used[c.s.id]||0)+1;applyFit(c.tmp,it,c.fit,cfg,splitVariant);bins.push(c.tmp)}
const unknownCostBins=bins.filter(b=>binCost(b.stock,cfg)===null).length,cost=unknownCostBins?null:bins.reduce((sum,b)=>sum+binCost(b.stock,cfg),0),stockArea=bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0),partArea=bins.reduce((sum,b)=>sum+b.placed.reduce((a,p)=>a+p.w*p.h,0),0);return{bins,unplaced,cost,unknownCostBins,stockArea,partArea,placedCount:items.length-unplaced.length}}

function offcutThresholds(){
 const shortest=val(state.offcutMinEdgeMm),area=val(state.offcutMinAreaCm2);
 return {edge:Number.isFinite(shortest)&&shortest>=0?shortest:50,area:Number.isFinite(area)&&area>=0?area*100:10000}
}
function collectOffcuts(bin){
 if(state.mode!=='guillotine')return {available:false,pieces:[],area:0,count:0,unclassifiedArea:null,smallScrapsArea:null};
 const threshold=offcutThresholds(),all=bin.free.filter(r=>r.w>1e-6&&r.h>1e-6);
 const pieces=all.filter(r=>Math.min(r.w,r.h)+1e-6>=threshold.edge&&r.w*r.h+1e-6>=threshold.area)
  .map(r=>({x:r.x,y:r.y,w:r.w,h:r.h,area:r.w*r.h})).sort((a,b)=>b.area-a.area);
 const freeArea=all.reduce((a,r)=>a+r.w*r.h,0);
 const partArea=bin.placed.reduce((a,p)=>a+p.w*p.h,0);
 const difference=Math.max(0,bin.stock.l*bin.stock.w-freeArea-partArea);
 return {available:true,pieces,area:pieces.reduce((a,p)=>a+p.area,0),count:pieces.length,
  smallScrapsArea:freeArea-pieces.reduce((a,p)=>a+p.area,0),unclassifiedArea:difference};
}
function salvageAreaForSolution(result){
 if(state.mode!=='guillotine')return 0;
 return result.bins.reduce((n,b)=>n+collectOffcuts(b).area,0)
}

function compare(a,b){if(!b)return-1;
if(a.unplaced.length!==b.unplaced.length)return a.unplaced.length-b.unplaced.length;
if(a.unknownCostBins!==b.unknownCostBins)return a.unknownCostBins-b.unknownCostBins;
if(a.cost!==null&&b.cost!==null&&Math.abs(a.cost-b.cost)>.01)return a.cost-b.cost;
if(a.bins.length!==b.bins.length)return a.bins.length-b.bins.length;
if(Math.abs(a.stockArea-b.stockArea)>1e-5)return a.stockArea-b.stockArea;
if(state.mode==='guillotine'){const sa=salvageAreaForSolution(a),sb=salvageAreaForSolution(b);if(Math.abs(sa-sb)>1e-3)return sb-sa}
return a.bins.reduce((s,x)=>s+x.free.length,0)-b.bins.reduce((s,x)=>s+x.free.length,0)}

// Bounded second-pass optimization: try to eliminate underused boards without changing the baseline.
function repackFixedBoards(items,boards,cfg,trial){
 const bins=boards.map(stock=>mkBin(stock,cfg.trim));
 if(trial%3===1)bins.sort((a,b)=>a.stock.l*a.stock.w-b.stock.l*b.stock.w);
 else if(trial%3===2)bins.sort((a,b)=>b.stock.l*b.stock.w-a.stock.l*a.stock.w);
 const ordered=orderParts(items,trial+1537);
 for(const item of ordered){
  let selected=null;
  for(const bin of bins){
   const fit=findFit(bin,item,Math.floor(trial/3)%5);
   if(!fit)continue;
   const score=fit.score+(bin.placed.length?0:0.00000001);
   if(!selected||score<selected.score)selected={bin,fit,score};
  }
  if(!selected)return null;
  applyFit(selected.bin,item,selected.fit,cfg,Math.floor(trial/15)%4);
 }
 const used=bins.filter(b=>b.placed.length);
 const unknownCostBins=used.filter(b=>binCost(b.stock,cfg)===null).length;
 return {bins:used,unplaced:[],placedCount:items.length,unknownCostBins,
  cost:unknownCostBins?null:used.reduce((n,b)=>n+binCost(b.stock,cfg),0),
  stockArea:used.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  partArea:used.reduce((n,b)=>n+b.placed.reduce((a,p)=>a+p.w*p.h,0),0)};
}

// Usable offcut optimization: bounded local search within EXACTLY the same
// occupied stock panels. Does not change the material purchase, panel count,
// physical stock area, or the part demand. It never claims global optimality.
// Guillotine leaves are verified by replaying all cuts independently.
function offcutMetrics(result){
 let usableArea=0,largestArea=0,pieceCount=0;
 for(const bin of result.bins){
  const offcut=collectOffcuts(bin);
  usableArea+=offcut.area;pieceCount+=offcut.count;
  for(const piece of offcut.pieces)largestArea=Math.max(largestArea,piece.area);
 }
 return {usableArea,largestArea,pieceCount}
}
function betterOffcuts(a,b){
 if(a.usableArea>b.usableArea+1e-5)return true;
 if(a.usableArea<b.usableArea-1e-5)return false;
 if(a.largestArea>b.largestArea+1e-5)return true;
 if(a.largestArea<b.largestArea-1e-5)return false;
 return a.pieceCount<b.pieceCount
}
function refineUsableOffcuts(initial,items,originalStocks,cfg,options={}){
 const before=offcutMetrics(initial),info={status:'skipped',proof:false,attempts:0,
  improvements:0,before,after:before,timeLimitMs:options.timeLimitMs??95};
 if(state.mode!=='guillotine'||initial.unplaced.length||!initial.bins.length||
    initial.bins.length>6||items.length>65)return {solution:initial,info};
 const deadline=Date.now()+info.timeLimitMs,boardList=initial.bins.map(b=>b.stock);
 const maxTrials=options.maxTrials??(items.length<=25?160:items.length<=45?96:48);
 let best=initial,metrics=before;info.status='completed';
 for(let trial=0;trial<maxTrials;trial++){
  if(trial%4===0&&Date.now()>deadline){info.status='time-limit';break}
  const candidate=repackFixedBoards(items,boardList,cfg,trial+1);
  info.attempts++;
  if(!candidate||candidate.unplaced.length||candidate.bins.length!==boardList.length||
     Math.abs(candidate.stockArea-initial.stockArea)>1e-5)continue;
  const candidateMetrics=offcutMetrics(candidate);
  if(!betterOffcuts(candidateMetrics,metrics))continue;
  if(!auditCutPlan(candidate,{parts:items,stocks:originalStocks,trim:cfg.trim,kerf:cfg.kerf}).ok)
   continue;
  best=candidate;metrics=candidateMetrics;info.improvements++;
 }
 info.after=metrics;
 return {solution:best,info}
}
function offcutOptimizationDescription(result){
 if(state.mode!=='guillotine')return 'Kullanılabilir artık araması yalnız düz kesim modundadır.';
 const search=result.search;
 if(!search||!search.offcutAttempts)return 'Kullanılabilir artıklar hesaplandı; yeniden yerleştirme araması bu projede çalışmadı.';
 const gain=search.offcutAreaGain||0;
 return gain>1e-5?
  'Aynı stoklarla yeniden yerleştirme '+fmt(gain/1e6,4)+' m² ek kullanılabilir artık sağladı ('+
    search.offcutAttempts+' deneme). Bu sezgisel bir iyileştirmedir, optimumluk kanıtı değildir.':
  'Kullanılabilir artıklar için '+search.offcutAttempts+
    ' alternatif yerleşim denendi. Daha iyi sonuç bulunamadı; optimumluk kanıtı yok.';
}

function improveGroupPacking(initial,items,cfg){
 if(initial.unplaced.length||initial.bins.length<2||initial.bins.length>8||items.length>70)
  return {solution:initial,attempts:0,improvements:0};
 let best=initial,attempts=0,improvements=0;
 for(let pass=0;pass<3;pass++){
  let changed=false;
  const candidates=best.bins.map((b,i)=>({i,area:b.placed.reduce((n,p)=>n+p.w*p.h,0)}))
   .sort((a,b)=>a.area-b.area);
  for(const {i}of candidates.slice(0,Math.min(5,candidates.length))){
   const boards=best.bins.filter((_,j)=>j!==i).map(b=>b.stock);
   const capacity=boards.reduce((n,b)=>n+Math.max(0,b.l-2*cfg.trim)*Math.max(0,b.w-2*cfg.trim),0);
   if(capacity+1e-3<best.partArea)continue;
   for(let trial=0;trial<30;trial++){
    attempts++;
    const repacked=repackFixedBoards(items,boards,cfg,trial);
    if(repacked&&compare(repacked,best)<0){best=repacked;changed=true;improvements++;break}
   }
   if(changed)break;
  }
  if(!changed||best.bins.length<2)break;
 }
 return {solution:best,attempts,improvements};
}


// Exact finite disjunctive search for SMALL uniform-stock free nesting instances.
// Every pair on a common board must satisfy x_i+w_i+kerf<=x_j, the reverse,
// y_i+h_i+kerf<=y_j, or the reverse. Enumerating all four alternatives,
// stock assignments and allowed rotations is complete. On each branch,
// longest-path difference constraints determine whether coordinates exist.
// A budget-interrupted search is UNKNOWN, never a proof of infeasibility.
function exactUniformFeasibility(parts,stock,limit,cfg,options={}){
 const started=Date.now(),deadline=options.deadline??started+130,maxNodes=options.maxNodes??30000;
 const W=stock.l-2*cfg.trim,H=stock.w-2*cfg.trim,kerf=cfg.kerf,eps=1e-7;
 let nodes=0,limited=false,layout=null;
 const finish=status=>({status,nodes,elapsedMs:Date.now()-started,layout});
 const area=parts.reduce((n,p)=>n+p.l*p.w,0);
 if(limit<1||W<=0||H<=0||area>limit*W*H+eps)return finish('infeasible');
 if(parts.some(p=>!orientationChoices(p).some(([w,h])=>w<=W+eps&&h<=H+eps)))return finish('infeasible');
 const sorted=parts.map((p,i)=>({...p,_originalIndex:i})).sort((a,b)=>b.l*b.w-a.l*a.w||Math.max(b.l,b.w)-Math.max(a.l,a.w)||a._originalIndex-b._originalIndex);
 const n=sorted.length,boards=Array.from({length:limit},()=>({pieces:[],xs:[],ys:[],area:0}));
 function tick(){
  nodes++;
  if(nodes>maxNodes||(nodes%128===0&&Date.now()>deadline)){limited=true;return false}
  return true
 }
 function coordinates(board){
  const X=new Array(n).fill(0),Y=new Array(n).fill(0),length=board.pieces.length;
  function relax(edges,values){
   let changed=false;
   for(let i=0;i<length;i++){
    changed=false;
    for(const e of edges){
     const next=values[e.from]+e.distance;
     if(next>values[e.to]+eps){values[e.to]=next;changed=true}
    }
    if(!changed)break
   }
   return !changed
  }
  if(!relax(board.xs,X)||!relax(board.ys,Y))return null;
  if(board.pieces.some(p=>X[p.index]+p.w>W+eps||Y[p.index]+p.h>H+eps))return null;
  return {X,Y}
 }
 function finishPacking(){
  const found=[];
  for(const board of boards){
   if(!board.pieces.length)continue;
   const coords=coordinates(board);
   if(!coords)return false;
   found.push(board.pieces.map(p=>({
    ...p.source,x:cfg.trim+coords.X[p.index],y:cfg.trim+coords.Y[p.index],
    w:p.w,h:p.h,rotated:p.rotated
   })))
  }
  layout=found;return true
 }
 function assign(index,usedBoards){
  if(!tick())return false;
  if(index===n)return finishPacking();
  const original=sorted[index];
  for(const [w,h,rotated]of orientationChoices(original)){
   if(w>W+eps||h>H+eps)continue;
   for(let bi=0;bi<Math.min(limit,usedBoards+1);bi++){
    if(limited)return false;
    const board=boards[bi];
    if(board.area+w*h>W*H+eps)continue;
    const previous=board.pieces.slice();
    board.pieces.push({source:original,index,w,h,rotated});board.area+=w*h;
    function relate(j){
     if(!tick())return false;
     if(j===previous.length)return assign(index+1,Math.max(usedBoards,bi+1));
     const prev=previous[j],options=[
      [board.xs,{from:prev.index,to:index,distance:prev.w+kerf}],
      [board.xs,{from:index,to:prev.index,distance:w+kerf}],
      [board.ys,{from:prev.index,to:index,distance:prev.h+kerf}],
      [board.ys,{from:index,to:prev.index,distance:h+kerf}]
     ];
     for(const [edges,edge]of options){
      edges.push(edge);
      const possible=coordinates(board);
      if(possible&&relate(j+1))return true;
      edges.pop();
      if(limited)return false
     }
     return false
    }
    const found=relate(0);
    board.pieces.pop();board.area-=w*h;
    if(found)return true;
    if(limited)return false
   }
  }
  return false
 }
 const feasible=assign(0,0);
 return finish(feasible?'feasible':limited?'limit':'infeasible')
}
function buildExactPlan(layout,stock,items,cfg){
 const bins=layout.map(pieces=>{const bin=mkBin(stock,cfg.trim);bin.placed=pieces;bin.free=[];return bin});
 const unknownCostBins=bins.filter(b=>binCost(b.stock,cfg)===null).length;
 return {bins,unplaced:[],placedCount:items.length,unknownCostBins,
  cost:unknownCostBins?null:bins.reduce((n,b)=>n+binCost(b.stock,cfg),0),
  stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  partArea:bins.reduce((n,b)=>n+b.placed.reduce((a,p)=>a+p.w*p.h,0),0)}
}

// Exact feasibility for a bounded number of VARIABLE stock types.
// Unlike the uniform solver, each newly opened board selects a stock type,
// respects its available quantity and checks material/thickness compatibility.
// All four disjunctive rectangle separations, allowed rotations and assignments
// are exhausted unless the shared time/node budget interrupts the search.
function exactVariableFeasibility(parts,stockTypes,limit,cfg,options={}){
 const started=Date.now(),deadline=options.deadline??started+145,maxNodes=options.maxNodes??25000;
 const eps=1e-7,kerf=cfg.kerf;let nodes=0,interrupted=false,layout=null;
 const finish=status=>({status,nodes,elapsedMs:Date.now()-started,layout});
 const types=stockTypes.filter(s=>s.qty>0&&s.l>2*cfg.trim&&s.w>2*cfg.trim).map(s=>({
  stock:s,W:s.l-2*cfg.trim,H:s.w-2*cfg.trim,area:(s.l-2*cfg.trim)*(s.w-2*cfg.trim)
 }));
 if(limit<1||!types.length)return finish('infeasible');
 const canUse=(p,t)=>mkey(p.material)===mkey(t.stock.material)&&
  (p.t===null||(t.stock.t!==null&&Math.abs(p.t-t.stock.t)<1e-6));
 if(parts.some(p=>!types.some(t=>canUse(p,t)&&orientationChoices(p).some(([w,h])=>w<=t.W+eps&&h<=t.H+eps))))
  return finish('infeasible');
 const need=parts.reduce((sum,p)=>sum+p.l*p.w,0);
 const stockCapacity=types.flatMap(t=>Array.from({length:Math.min(limit,t.stock.qty)},()=>t.area))
  .sort((a,b)=>b-a).slice(0,limit).reduce((a,b)=>a+b,0);
 if(need>stockCapacity+eps)return finish('infeasible');
 const sorted=parts.map((p,i)=>({...p,_exactOrder:i})).sort((a,b)=>b.l*b.w-a.l*a.w||Math.max(b.l,b.w)-Math.max(a.l,a.w)||a._exactOrder-b._exactOrder);
 const n=sorted.length,opened=[],usage=types.map(()=>0);
 function tick(){
  nodes++;
  if(nodes>maxNodes||(nodes%128===0&&Date.now()>deadline)){interrupted=true;return false}
  return true
 }
 function coordinates(board){
  const X=new Array(n).fill(0),Y=new Array(n).fill(0),count=board.pieces.length;
  function relax(edges,coords){
   let changed=false;
   for(let pass=0;pass<count;pass++){
    changed=false;
    for(const edge of edges){
     const value=coords[edge.from]+edge.distance;
     if(value>coords[edge.to]+eps){coords[edge.to]=value;changed=true}
    }
    if(!changed)break
   }
   return !changed
  }
  if(!relax(board.xEdges,X)||!relax(board.yEdges,Y))return null;
  if(board.pieces.some(p=>X[p.index]+p.w>board.type.W+eps||Y[p.index]+p.h>board.type.H+eps))return null;
  return {X,Y}
 }
 function done(){
  layout=[];
  for(const board of opened){
   const coord=coordinates(board);if(!coord)return false;
   layout.push({stock:board.type.stock,pieces:board.pieces.map(p=>({
    ...p.source,x:cfg.trim+coord.X[p.index],y:cfg.trim+coord.Y[p.index],
    w:p.w,h:p.h,rotated:p.rotated
   }))})
  }
  return true
 }
 function addToBoard(board,piece,i,w,h,rotated){
  if(board.area+w*h>board.type.area+eps)return false;
  const prev=board.pieces.slice();
  board.pieces.push({source:piece,index:i,w,h,rotated});board.area+=w*h;
  function separate(j){
   if(!tick())return false;
   if(j===prev.length)return place(i+1);
   const old=prev[j],options=[
    [board.xEdges,{from:old.index,to:i,distance:old.w+kerf}],
    [board.xEdges,{from:i,to:old.index,distance:w+kerf}],
    [board.yEdges,{from:old.index,to:i,distance:old.h+kerf}],
    [board.yEdges,{from:i,to:old.index,distance:h+kerf}]
   ];
   for(const [edges,edge]of options){
    edges.push(edge);
    const okay=coordinates(board);
    if(okay&&separate(j+1))return true;
    edges.pop();
    if(interrupted)return false
   }
   return false
  }
  const solved=separate(0);
  board.pieces.pop();board.area-=w*h;
  return solved
 }
 function place(i){
  if(!tick())return false;
  if(i===n)return done();
  const piece=sorted[i];
  for(const [w,h,rotated]of orientationChoices(piece)){
   for(const board of opened){
    if(interrupted)return false;
    if(!canUse(piece,board.type)||w>board.type.W+eps||h>board.type.H+eps)continue;
    if(addToBoard(board,piece,i,w,h,rotated))return true;
   }
   if(opened.length>=limit)continue;
   for(let t=0;t<types.length;t++){
    if(interrupted)return false;
    const type=types[t];
    if(usage[t]>=type.stock.qty||!canUse(piece,type)||w>type.W+eps||h>type.H+eps)continue;
    const board={type,pieces:[],xEdges:[],yEdges:[],area:0};
    opened.push(board);usage[t]++;
    const solved=addToBoard(board,piece,i,w,h,rotated);
    opened.pop();usage[t]--;
    if(solved)return true;
   }
  }
  return false
 }
 const feasible=place(0);
 return finish(feasible?'feasible':interrupted?'limit':'infeasible')
}
function buildVariableExactPlan(layout,items,cfg){
 const bins=layout.map(entry=>{
  const bin=mkBin(entry.stock,cfg.trim);
  bin.placed=entry.pieces;bin.free=[];
  return bin
 });
 const unknownCostBins=bins.reduce((n,b)=>n+Number(binCost(b.stock,cfg)===null),0);
 return {bins,unplaced:[],placedCount:items.length,unknownCostBins,
  cost:unknownCostBins?null:bins.reduce((n,b)=>n+binCost(b.stock,cfg),0),
  stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  partArea:bins.reduce((n,b)=>n+b.placed.reduce((total,p)=>total+p.w*p.h,0),0)}
}

function exactRefinePlan(initial,data,cfg){
 const meta={status:'skipped',proof:false,optimumCount:null,nodes:0,elapsedMs:0,checks:[],
  scope:'Serbest yerleşim; malzeme bazında ≤8 parça, ≤3 stok türü, ≤4 kullanılan stok',groups:[]};
 const done=result=>{result.exact=meta;return result};
 if(state.mode!=='nest'||initial.unplaced.length||!auditCutPlan(initial,data).ok)return done(initial);
 const partsByMaterial=new Map(),stocksByMaterial=new Map();
 for(const p of data.parts){const key=mkey(p.material),group=partsByMaterial.get(key)||[];group.push(p);partsByMaterial.set(key,group)}
 for(const s of data.stocks){const key=mkey(s.material),group=stocksByMaterial.get(key)||[];group.push(s);stocksByMaterial.set(key,group)}
 if(partsByMaterial.size>4||data.parts.length>24)return done(initial);
 const deadline=Date.now()+175;
 let result=initial,allProved=true,anyImproved=false,anyLimited=false,anyChecked=false;
 const remake=(bins)=>{
  const missing=bins.filter(b=>binCost(b.stock,cfg)===null).length;
  return {bins,unplaced:initial.unplaced,placedCount:initial.placedCount,
   unknownCostBins:missing,cost:missing?null:bins.reduce((n,b)=>n+binCost(b.stock,cfg),0),
   stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
   partArea:bins.reduce((n,b)=>n+b.placed.reduce((v,p)=>v+p.w*p.h,0),0),
   search:result.search}
 };
 for(const [key,parts]of partsByMaterial){
  const stocks=stocksByMaterial.get(key)||[],currentBins=result.bins.filter(b=>mkey(b.stock.material)===key);
  const count=currentBins.length,lower=minStockCountLowerBound({
   parts,stocks,trim:data.trim,kerf:data.kerf
  }).lowerBound;
  const entry={material:key,parts:parts.length,stockTypes:stocks.length,
   initialCount:count,finalCount:count,lowerBound:lower,proven:false,status:'skipped',checks:[]};
  meta.groups.push(entry);
  if(!Number.isInteger(lower)||!count){allProved=false;continue}
  if(count===lower||count===1){entry.proven=true;entry.status='area-or-trivial';continue}
  if(parts.length>8||stocks.length>3||count>4||parts.length<2||Date.now()>=deadline){
   allProved=false;entry.status=Date.now()>=deadline?'limit':'skipped';
   if(entry.status==='limit')anyLimited=true;
   continue
  }
  anyChecked=true;entry.status='running';
  let lowerExcluded=true;
  for(let target=lower;target<count;target++){
   const check=exactVariableFeasibility(parts,stocks,target,cfg,{deadline,maxNodes:25000});
   meta.nodes+=check.nodes;meta.elapsedMs+=check.elapsedMs;
   const record={material:key,count:target,status:check.status};
   meta.checks.push(record);entry.checks.push(record);
   if(check.status==='infeasible')continue;
   if(check.status==='limit'){anyLimited=true;lowerExcluded=false;entry.status='limit';break}
   if(check.status==='feasible'){
    const candidate=buildVariableExactPlan(check.layout,parts,cfg);
    const others=result.bins.filter(b=>mkey(b.stock.material)!==key);
    const combined=remake(others.concat(candidate.bins));
    if(candidate.bins.length<count&&auditCutPlan(combined,data).ok){
     combined.search={...result.search,savedStockCount:(result.search?.savedStockCount||0)+count-candidate.bins.length};
     result=combined;entry.finalCount=candidate.bins.length;entry.status='improved';anyImproved=true;
    }else{entry.status='invalid-candidate';lowerExcluded=false}
    break
   }
  }
  if(entry.status==='running')entry.status='proved';
  entry.proven=lowerExcluded&&(entry.status==='proved'||entry.status==='improved');
  if(!entry.proven)allProved=false
 }
 meta.status=anyLimited?'limit':!allProved?'partial':anyImproved?'improved':anyChecked?'proved':'area-or-trivial';
 meta.proof=allProved;meta.optimumCount=allProved?result.bins.length:null;
 return done(result)
}

const blockRepair=blockRepairModule?.createRepair({packAttempt,auditCutPlan,compare,binCost});
function optimize(data,enhanced=true,exact=true){const groups=new Map(),stockgroups=new Map();for(const p of data.parts){const key=mkey(p.material,p.t);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}for(const s of data.stocks){const key=mkey(s.material,s.t);if(!stockgroups.has(key))stockgroups.set(key,[]);stockgroups.get(key).push(s)}let result={bins:[],unplaced:[],partArea:0,stockArea:0,cost:0,unknownCostBins:0,placedCount:0},search={baselineStockCount:0,savedStockCount:0,refinementAttempts:0,refinementSteps:0,offcutAttempts:0,offcutImprovements:0,offcutAreaGain:0,offcutTimeLimited:false},cfg={kerf:data.kerf,trim:data.trim,m3:data.m3,mode:state.mode,priceMode:state.priceMode};for(const [key,group]of groups){const stock=stockgroups.get(key)||[];let best=null;const trials=group.length<=35?144:group.length<=120?90:group.length<=400?40:14;for(let tr=0;tr<trials;tr++){const r=packAttempt(group,stock,cfg,tr);if(compare(r,best)<0)best=r;if(best?.unplaced.length===0&&best?.bins.length===1&&best.stockArea<=group.reduce((a,p)=>a+p.l*p.w,0)*1.005)break}search.baselineStockCount+=best.bins.length;
const refined=enhanced?improveGroupPacking(best,group,cfg):{solution:best,attempts:0,improvements:0};
search.refinementAttempts+=refined.attempts;search.refinementSteps+=refined.improvements;
search.savedStockCount+=best.bins.length-refined.solution.bins.length;
best=refined.solution;
if(enhanced&&state.mode==='guillotine'&&best.unplaced.length&&blockRepair){
 const rescue=blockRepair.repair(group,stock,cfg,best,{timeBudgetMs:650});
 search.blockRepairAttempts=(search.blockRepairAttempts||0)+rescue.info.trials;
 search.blockRepairCandidates=(search.blockRepairCandidates||0)+rescue.info.candidates;
 search.blockRescuedPieces=(search.blockRescuedPieces||0)+rescue.info.rescued;
 if(compare(rescue.solution,best)<0)best=rescue.solution;
}
if(enhanced&&state.mode==='guillotine'){
 const offcutPass=refineUsableOffcuts(best,group,stock,cfg);
 best=offcutPass.solution;
 search.offcutAttempts+=offcutPass.info.attempts;
 search.offcutImprovements+=offcutPass.info.improvements;
 search.offcutAreaGain+=offcutPass.info.after.usableArea-offcutPass.info.before.usableArea;
 if(offcutPass.info.status==='time-limit')search.offcutTimeLimited=true;
}
result.bins.push(...best.bins);result.unplaced.push(...best.unplaced);result.unknownCostBins+=best.unknownCostBins;if(best.cost!==null)result.cost+=best.cost;result.stockArea+=best.stockArea;result.partArea+=best.partArea;result.placedCount+=best.placedCount}if(result.unknownCostBins)result.cost=null;result.search=search;if(enhanced&&exact!==false){result=exactRefinePlan(result,data,cfg);result=exactGrossAreaRefine(result,data,cfg)}return result}

// Rigorous, intentionally optimistic lower bound on required board COUNT.
// Each material is independent. Ignore shape, thickness and kerf to NEVER overstate
// the minimum possible number: only part area and usable stock area constrain it.
// A valid complete packing with exactly this many boards proves count optimality.
// If the plan needs more boards, the gap does NOT prove that a better layout exists.

// Exact gross-waste minimization for a PROVEN minimum board count.
// With a fixed required part area, minimizing gross unused area is equivalent
// to minimizing the sum of stock rectangle areas. This says NOTHING about
// recoverable offcut shapes, kerf volume or the price of the chosen stock.
// Exhaustively enumerate bounded board-type multisets by physical area, and
// test exact placement for every strictly better candidate. An incomplete
// geometric search must not become a claim of area optimality.
function enumerateBoardMultisets(types,count,areaNeeded,trim,cap=120){
 const candidates=[],chosen=[],eps=1e-5;
 let enumerated=0,truncated=false;
 function walk(i,left,totalArea,usableArea){
  if(truncated)return;
  if(i===types.length){
   if(left!==0||usableArea+eps<areaNeeded)return;
   enumerated++;
   if(enumerated>cap){truncated=true;return}
   candidates.push({counts:chosen.slice(),area:totalArea,usableArea});
   return
  }
  const type=types[i],unitArea=type.l*type.w;
  const effective=Math.max(0,type.l-2*trim)*Math.max(0,type.w-2*trim);
  for(let number=0;number<=Math.min(left,type.qty);number++){
   chosen[i]=number;
   walk(i+1,left-number,totalArea+number*unitArea,usableArea+number*effective);
   if(truncated)break
  }
 }
 walk(0,count,0,0);
 candidates.sort((a,b)=>a.area-b.area||
  a.counts.map((n,i)=>n*100+i).join(',').localeCompare(b.counts.map((n,i)=>n*100+i).join(',')));
 return {candidates,truncated,enumerated}
}
function exactGrossAreaRefine(initial,data,cfg){
 const report={goal:'minimum-gross-waste-at-minimum-stock-count',status:'skipped',proven:false,
  countProven:false,areaSaved:0,checked:0,elapsedMs:0,groups:[],
  scope:'Serbest yerleşim, kanıtlanmış stok sayısı, malzeme grubu başına ≤8 parça, ≤3 stok türü ve ≤4 stok'};
 const finish=result=>{report.areaSaved=Math.max(0,initial.stockArea-result.stockArea);report.purchaseCostDelta=initial.cost===null||result.cost===null?null:result.cost-initial.cost;result.areaProof=report;return result};
 if(state.mode!=='nest'||initial.unplaced.length||!initial.bins.length)return finish(initial);
 const audit=auditCutPlan(initial,data);
 const stockProof=certifyStockCount(initial,data,audit);
 report.countProven=stockProof.proven;
 if(!stockProof.proven){report.status='stock-count-unproven';return finish(initial)}
 const byMaterial=new Map(),stockTypes=new Map();
 for(const p of data.parts){const key=mkey(p.material),a=byMaterial.get(key)||[];a.push(p);byMaterial.set(key,a)}
 for(const board of data.stocks){const key=mkey(board.material),a=stockTypes.get(key)||[];a.push(board);stockTypes.set(key,a)}
 if(byMaterial.size>4||data.parts.length>24){report.status='scope-limited';return finish(initial)}
 const started=Date.now(),deadline=started+120,epsilon=1e-5;
 let result=initial,provedAll=true,hitLimit=false,anyImproved=false;
 function combine(groupKey,replacementBins){
  const bins=result.bins.filter(b=>mkey(b.stock.material)!==groupKey).concat(replacementBins);
  const unknownCostBins=bins.filter(b=>binCost(b.stock,cfg)===null).length;
  return {...result,bins,unknownCostBins,
   cost:unknownCostBins?null:bins.reduce((n,b)=>n+binCost(b.stock,cfg),0),
   stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
   partArea:bins.reduce((n,b)=>n+b.placed.reduce((total,p)=>total+p.w*p.h,0),0)}
 }
 for(const [key,parts]of byMaterial){
  const types=stockTypes.get(key)||[],used=result.bins.filter(b=>mkey(b.stock.material)===key);
  const count=used.length,baselineArea=used.reduce((n,b)=>n+b.stock.l*b.stock.w,0);
  const record={material:key,boards:count,area:baselineArea,optimizedArea:baselineArea,proven:false,status:'skipped',checked:0};
  report.groups.push(record);
  if(parts.length>8||parts.length<1||types.length>3||count>4||Date.now()>=deadline){
   record.status=Date.now()>=deadline?'limit':'scope-limited';
   provedAll=false;if(record.status==='limit')hitLimit=true;continue
  }
  const enumerated=enumerateBoardMultisets(types,count,
   parts.reduce((n,p)=>n+p.l*p.w,0),cfg.trim);
  if(enumerated.truncated){record.status='enumeration-limit';provedAll=false;hitLimit=true;continue}
  const smaller=enumerated.candidates.filter(c=>c.area<baselineArea-epsilon);
  let unresolved=false,found=false;
  for(const candidate of smaller){
   if(Date.now()>=deadline){unresolved=true;hitLimit=true;record.status='limit';break}
   // Quantity-constrained candidate selection. Every selected type must
   // match at least one orientation of any part it is intended to hold.
   const selected=types.map((t,i)=>({...t,qty:candidate.counts[i]}))
    .filter(t=>t.qty>0);
   record.checked++;report.checked++;
   const trial=exactVariableFeasibility(parts,selected,count,cfg,{deadline,maxNodes:20000});
   if(trial.status==='limit'){unresolved=true;hitLimit=true;record.status='limit';break}
   if(trial.status==='infeasible')continue;
   const proposal=buildVariableExactPlan(trial.layout,parts,cfg);
   if(proposal.bins.length!==count){unresolved=true;record.status='different-stock-count';break}
   const combined=combine(key,proposal.bins);
   if(!auditCutPlan(combined,data).ok){unresolved=true;record.status='invalid-candidate';break}
   if(combined.stockArea<result.stockArea-epsilon){
    result=combined;record.optimizedArea=proposal.stockArea;record.status='improved';anyImproved=true;
   }else{unresolved=true;record.status='invalid-candidate'}
   found=true;break
  }
  record.proven=!unresolved;
  if(record.status==='skipped')record.status='proved';
  if(!record.proven)provedAll=false
 }
 report.elapsedMs=Date.now()-started;
 report.proven=provedAll;
 report.status=hitLimit?'limit':!provedAll?'partial':anyImproved?'improved':'proved';
 return finish(result)
}
function grossWasteProofDescription(plan){
 const report=plan?.areaProof;
 if(!report)return 'Brüt fire optimumluğu: henüz hesaplanmadı.';
 const value=fmt(Math.max(0,plan.stockArea-plan.partArea)/1e6,4)+' m²';
 if(report.proven)return 'Minimum brüt alan kaybı kanıtlandı: '+value+
  '. Minimum stok sayısı sabit tutularak uygun stok türleri tarandı. Kullanılabilir artık şekilleri ve maliyet optimumluğu kanıtlanmadı.';
 if(!report.countProven)return 'Brüt alan kaybı '+value+
  '. Minimum stok sayısı henüz kanıtlanmadığından en az fire iddiası yok.';
 if(report.status==='limit'||report.status==='partial'||report.status==='enumeration-limit')
  return 'Brüt alan kaybı '+value+'. Kesin alan araması tamamlanmadı; minimum fire kanıtlanmadı.';
 return 'Brüt alan kaybı '+value+'. Bu proje mevcut kesin alan aramasının kapsamı dışında; optimumluk kanıtı yok.';
}

// Safe geometric lower bound: any found clique of pairwise incompatible pieces
// requires one stock per piece. Testing a pair on every stock/rotation makes this
// bound valid for both unrestricted and guillotine placement. Budget: 160 pieces.
function incompatibleCliqueLowerBound(parts,stocks,trim,kerf){
 const p=parts.length>160?parts.slice().sort((a,b)=>b.l*b.w-a.l*a.w).slice(0,160):parts;
 const n=p.length;if(!n)return {count:0,examined:0,total:parts.length};
 const s=stocks.filter(x=>x.qty>0&&x.l>2*trim&&x.w>2*trim);
 const orientations=p.map(part=>s.map(stock=>{
  if(part.t!==null&&(stock.t===null||Math.abs(part.t-stock.t)>1e-6))return [];
  return orientationChoices(part).filter(([w,h])=>w<=stock.l-2*trim+1e-7&&h<=stock.w-2*trim+1e-7);
 }));
 const neighbors=Array.from({length:n},()=>new Uint8Array(n)),degree=new Uint16Array(n);
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  let canShare=false;
  for(let t=0;t<s.length&&!canShare;t++){
   const W=s[t].l-2*trim,H=s[t].w-2*trim;
   for(const [a,b]of orientations[i][t]){
    if(canShare)break;
    for(const [c,d]of orientations[j][t])
     if(a+c+kerf<=W+1e-7&&Math.max(b,d)<=H+1e-7||
        b+d+kerf<=H+1e-7&&Math.max(a,c)<=W+1e-7){canShare=true;break}
   }
  }
  if(!canShare){neighbors[i][j]=neighbors[j][i]=1;degree[i]++;degree[j]++}
 }
 const ids=Array.from({length:n},(_,i)=>i),degreeSort=ids.slice().sort((a,b)=>degree[b]-degree[a]),
  areaSort=ids.slice().sort((a,b)=>p[b].l*p[b].w-p[a].l*p[a].w);
 const orders=[degreeSort,areaSort,areaSort.slice().reverse()];
 for(const v of degreeSort.slice(0,Math.min(16,n)))
  orders.push([v,...degreeSort.filter(w=>w!==v)]);
 let count=1;
 for(const order of orders){
  const clique=[];
  for(const v of order)if(clique.every(w=>neighbors[v][w]))clique.push(v);
  count=Math.max(count,clique.length);
  if(count===n)break;
 }
 return {count,examined:n,total:parts.length}
}
function minStockCountLowerBound(data){
 const partGroups=new Map(),stockGroups=new Map(),details=[];
 for(const p of data.parts){const k=mkey(p.material),g=partGroups.get(k)||[];
  g.push(p);partGroups.set(k,g)}
 for(const s of data.stocks){const k=mkey(s.material),g=stockGroups.get(k)||[];
  g.push(s);stockGroups.set(k,g)}
 let total=0,geometricUsed=false,itemCapacityUsed=false;
 for(const [material,parts]of partGroups){
  const required=parts.reduce((sum,p)=>sum+p.l*p.w,0);
  if(!Number.isFinite(required)||required<0)
   return {lowerBound:null,method:'area',reason:'Geçersiz alan verisi',details};
  const tolerance=Math.max(1e-6,required*1e-11),stocks=stockGroups.get(material)||[];
  const capacity=stocks.filter(s=>s.qty>0).map(s=>({
   area:Math.max(0,s.l-2*data.trim)*Math.max(0,s.w-2*data.trim),qty:s.qty
  })).filter(s=>Number.isFinite(s.area)&&s.area>0).sort((a,b)=>b.area-a.area);
  let remaining=required,areaLB=0;
  for(const s of capacity){
   if(remaining<=tolerance)break;
   const count=Math.min(s.qty,Math.ceil(Math.max(0,remaining-tolerance)/s.area));
   areaLB+=count;remaining-=count*s.area;
  }
  if(remaining>tolerance)return {
   lowerBound:null,method:'area',reason:'Stok alanı tüm parçalar için yetersiz',details
  };
  // An omitted kerf must relax the constraint, never force false incompatibility.
  const kerf=Number.isFinite(data.kerf)?Math.max(0,data.kerf):0;
  const geometry=incompatibleCliqueLowerBound(parts,stocks,data.trim,kerf);
  const cardinality=root.BeythausOptimalityCertificate?.countBoundForGroup(
   parts,stocks,data.trim,kerf);
  const itemBound=cardinality?.status==='optimal-relaxation'?cardinality.lowerBound:0;
  const lowerBound=Math.max(areaLB,geometry.count,itemBound);
  if(geometry.count>areaLB)geometricUsed=true;
  if(itemBound>Math.max(areaLB,geometry.count))itemCapacityUsed=true;
  total+=lowerBound;
  details.push({material,requiredArea:required,lowerBound,areaLowerBound:areaLB,
   incompatibilityLowerBound:geometry.count,itemCapacityLowerBound:itemBound,
   inspectedPieces:geometry.examined,totalPieces:geometry.total});
 }
 return {lowerBound:total,method:itemCapacityUsed?'kerf-cardinality':geometricUsed?'pairwise-incompatibility':'area',reason:null,details};
}
function certifyStockCount(plan,data,audit){
 const bound=minStockCountLowerBound(data),complete=!!audit?.ok&&plan.unplaced.length===0&&plan.placedCount===data.parts.length;
 const count=plan.bins.length,byArea=complete&&bound.lowerBound!==null&&count===bound.lowerBound;
 const byExact=complete&&plan.exact?.proof===true&&plan.exact?.optimumCount===count;
 const proven=byArea||byExact,method=byExact&&!byArea?'exhaustive-geometry':
  bound.method==='pairwise-incompatibility'?'geometric-incompatibility':bound.method==='kerf-cardinality'?'kerf-cardinality':'area';
 return {goal:'minimum-stock-count',proven,complete,
  usedStockCount:count,lowerBound:bound.lowerBound,method,searchStatus:plan.exact?.status||'skipped',
  gap:complete&&bound.lowerBound!==null?Math.max(0,count-bound.lowerBound):null,
  reason:!complete?'Tüm parçalar yerleşmedi veya geometri doğrulanmadı.':bound.reason||
   (proven?'Minimum stok sayısı matematiksel olarak kanıtlandı.':'Kesin arama henüz tamamlanmadı veya kapsam dışında.'),
  details:bound.details}
}
function stockProofDescription(proof){
 if(!proof?.complete)return 'Optimumluk: Tüm parçalar yerleşmeden stok sayısı kanıtlanamaz.';
 if(proof.proven)return 'Minimum stok sayısı kanıtlandı: '+proof.usedStockCount+
  ' stok. '+(proof.method==='exhaustive-geometry'?
    (state.mode==='guillotine'?'Kesin giyotin kesim ağacı araması daha az stoklu tüm kesim seçeneklerini eledi.':
     'Kesin geometrik arama daha az stoklu tüm seçenekleri eledi.'):(proof.method==='geometric-incompatibility'?'Parçaların birlikte sığma zorunlulukları ve alan alt sınırları karşılandı.':proof.method==='kerf-cardinality'?'Parça boyutları, stok kapasitesi ve testere payından hesaplanan kesin alt sınıra ulaşıldı.':proof.method==='global-integer-cover'?'Karma otomatikte tüm uygun stok türlerini kapsayan tamsayılı kesin alt sınıra ulaşıldı.':'Geçerli yerleşim alan alt sınırına ulaştı.'))+' Bu kanıt fire veya maliyet optimumluğu değildir.'+
  (state.mode==='nest'?' Serbest yerleşim sonucu, panel testeresi için uygulanabilir kesim planı veya üretim uygunluğu kanıtı DEĞİLDİR.':'');
 if(proof.lowerBound===null)return 'Minimum stok sayısı kanıtlanamadı: '+proof.reason;
 return (proof.searchStatus==='limit'?'Kesin çözüm araması zaman veya işlem sınırına ulaştı. ':'')+'Minimum stok sayısı henüz kanıtlanmadı: kullanılan '+proof.usedStockCount+
  ', matematiksel alt sınır '+proof.lowerBound+' stok. Daha iyi bir planın varlığı da kanıtlanmış değil.';
}

 return Object.freeze({binCost,mkBin,collectOffcuts,offcutOptimizationDescription,optimize,grossWasteProofDescription,certifyStockCount,stockProofDescription,validateLayout,auditCutPlan,auditGuillotineCuts,minStockCountLowerBound,refineUsableOffcuts,offcutMetrics,betterOffcuts,enumerateBoardMultisets,exactGrossAreaRefine,exactUniformFeasibility,exactVariableFeasibility,exactRefinePlan});
}
root.BeythausCutEngine=Object.freeze({contractVersion:CONTRACT_VERSION,createEngine});
})(typeof window!=='undefined'?window:globalThis);
