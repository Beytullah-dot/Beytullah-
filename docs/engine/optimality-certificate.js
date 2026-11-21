/* Beythaus Cut — exact quantity-cover lower bounds for large cutting plans.
 * Ignores rectangle geometry, kerf, rotation and thickness deliberately:
 * relaxing constraints can only make the minimum objective no GREATER than
 * the true guillotine optimum. A verified plan reaching this lower bound is
 * therefore a mathematically proven global optimum for the stated objective.
 *
 * Quantity-cover DP is exact over finite stock types, with Pareto dominance
 * after every group. No item-count or used-sheet-count cutoff. A state/time
 * cutoff returns UNKNOWN; it never manufactures a certificate.
 */
(function(root){
 'use strict';
 const POLICY=root.BeythausMaterialPolicy;
 const EPS=1e-7;
 // Safe cardinality capacity for congruent, fixed-axis rectangles.
 // With a saw kerf k, expand every item by k on its right/bottom and the
 // usable board by k in both dimensions. Any legal kerf-separated placement
 // becomes a nonoverlapping packing of these expanded rectangles. For
 // identical axis-aligned rectangles, a grid-point argument bounds count by
 // floor((W+k)/(pieceW+k))*floor((H+k)/(pieceH+k)).
 function cardinalityTypes(parts,stocks,trim,kerf){
  if(!parts.length||!Number.isFinite(kerf)||kerf<0||
     !Number.isFinite(trim)||trim<0)return null;
  // Any orthogonal part, independently of grain or rotation, contains an
  // axis-aligned square whose side is the smallest dimension in the demand.
  // Kerf-separated parts imply kerf-separated inscribed squares. The usual
  // grid-point bound therefore also holds for HETEROGENEOUS dimensions:
  // floor((usableW+k)/(minSide+k))*floor((usableH+k)/(minSide+k)).
  // This relaxes geometry; it is not a feasible cut pattern.
  let minSide=Infinity;
  for(const p of parts){
   if(!(Number.isFinite(p.l)&&p.l>0&&Number.isFinite(p.w)&&p.w>0))
    return null;
   minSide=Math.min(minSide,p.l,p.w);
  }
  const first=parts[0],square=Math.abs(first.l-first.w)<EPS;
  const sameDimensions=parts.every(p=>
   Math.abs(p.l-first.l)<EPS&&Math.abs(p.w-first.w)<EPS);
  function direction(p){
   if(square)return false;
   if(p.grain==='width')return p.rotate?true:null;
   if(p.grain==='length'||p.rotate===false)return false;
   return null
  }
  const d=sameDimensions?direction(first):null;
  const fixed=d!==null&&parts.every(p=>direction(p)===d);
  const partW=fixed?(d?first.w:first.l):0;
  const partH=fixed?(d?first.l:first.w):0;
  // Cap to the demand count before multiplication: a single type's
  // capacity beyond all remaining pieces carries no additional information.
  const axisCount=(span,edge)=>
   Math.min(parts.length,Math.max(0,Math.floor((span+kerf+EPS)/(edge+kerf))));
  return stocks.map(stock=>{
   const W=stock.l-2*trim,H=stock.w-2*trim;
   let capacity=0;
   if(W>0&&H>0){
    capacity=Math.min(parts.length,
     axisCount(W,minSide)*axisCount(H,minSide));
    // Preserve the stronger fixed-axis bound for congruent pieces.
    if(fixed)capacity=Math.min(capacity,
     axisCount(W,partW)*axisCount(H,partH));
   }
   return {...stock,_proofCapacity:capacity}
  });
 }
 const cap=(x,target)=>Math.min(target,x);
 function costOf(stock,config){
  if(!POLICY)return null;
  return POLICY.stockPrice(stock,config);
 }
 function cover(types,demand,{objective='area',priceMode='panel',m3=25000,trim=0,
    maxStates=120000,maxMs=2500}={}){
  const start=Date.now();
  if(!Number.isFinite(demand)||demand<0||!Number.isFinite(trim)||trim<0||
     !['area','cost','count'].includes(objective))
   return {status:'invalid',lowerBound:null,states:0};
  if(demand===0)return {status:'optimal-relaxation',lowerBound:0,states:1};
  const stocks=[];
  for(const s of types){
   if(!Number.isInteger(s.qty)||s.qty<0||!Number.isFinite(s.l)||
      !Number.isFinite(s.w))return {status:'invalid',lowerBound:null,states:0};
   if(s.qty===0)continue;
   const usable=s._proofCapacity!==undefined?s._proofCapacity:
    Math.max(0,s.l-2*trim)*Math.max(0,s.w-2*trim);
   if(!(usable>0))continue;
   const unit=objective==='area'?s.l*s.w:
    objective==='count'?1:costOf(s,{priceMode,m3});
   if(unit===null||!Number.isFinite(unit)||unit<0)
    return {status:'unknown-price',lowerBound:null,states:0};
   // More units of one stock type than necessary to cover all demand
   // cannot improve a nonnegative objective.
   stocks.push({usable,unit,qty:Math.min(s.qty,Math.ceil(demand/usable))});
  }
  if(!stocks.length)return {status:'infeasible-relaxation',lowerBound:null,states:0};
  if(stocks.reduce((a,s)=>a+s.usable*s.qty,0)+EPS<demand)
   return {status:'infeasible-relaxation',lowerBound:null,states:0};
  // Highest capacity first often makes the Pareto skyline smaller.
  stocks.sort((a,b)=>b.usable-a.usable||a.unit-b.unit);
  let states=[{area:0,objective:0}], peakStates=1;
  for(const stock of stocks){
   if(Date.now()-start>maxMs)return {status:'unknown-limit',lowerBound:null,states:peakStates};
   const expanded=[];
   for(const state of states){
    for(let q=0;q<=stock.qty;q++){
     expanded.push({area:cap(state.area+q*stock.usable,demand),
       objective:state.objective+q*stock.unit});
     if(expanded.length>maxStates*8)
      return {status:'unknown-limit',lowerBound:null,states:expanded.length};
    }
   }
   // A state with at least as much capacity at no greater cost
   // dominates another state for every possible future stock choice.
   expanded.sort((a,b)=>b.area-a.area||a.objective-b.objective);
   const frontier=[];
   let best=Infinity,seenArea=Infinity;
   for(const state of expanded){
    if(state.objective>=best)continue;
    if(state.area===seenArea)continue;
    frontier.push(state);
    best=state.objective;seenArea=state.area;
   }
   states=frontier;peakStates=Math.max(peakStates,states.length);
   if(states.length>maxStates)return {status:'unknown-limit',lowerBound:null,states:states.length};
  }
  let optimum=Infinity;
  for(const state of states)if(state.area>=demand-EPS)
   optimum=Math.min(optimum,state.objective);
  if(!Number.isFinite(optimum))
   return {status:'infeasible-relaxation',lowerBound:null,states:peakStates};
  return {status:'optimal-relaxation',lowerBound:optimum,states:peakStates,
    elapsedMs:Date.now()-start};
 }
 function certify(plan,data,{objective='area',maxStates=120000,maxMs=2500,
    auditOK=false,allowMaterialAssignment=false,priceMode='panel',
    m3=25000}={}){
  const incumbent=objective==='area'?plan.stockArea:
    objective==='count'?plan.bins.length:plan.cost;
  const base={objective,incumbent,lowerBound:null,proven:false,
    status:'unknown',groups:[],gap:null,method:'integer-area-cover'};
  if(!auditOK||plan.unplaced.length||plan.placedCount!==data.parts.length||
    !Number.isFinite(incumbent))
   return {...base,status:'unverified-plan'};
  if(!['area','cost','count'].includes(objective))
   return {...base,status:'invalid-objective'};
  // Automatically assigned parts may use any allowed stock material.
  // Relax to CATEGORY instead of assuming the heuristic's assignment is fixed.
  const groupKey=p=>allowMaterialAssignment?
    String(p.category||'panel'):String(p.material||'');
  const groups=new Map();
  for(const p of data.parts){
   const key=groupKey(p);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(p);
  }
  let totalBound=0,allExact=true;
  for(const [key,parts] of groups){
   const demand=parts.reduce((sum,p)=>sum+p.l*p.w,0);
   const stocks=data.stocks.filter(s=>groupKey(s)===key);
   const r=cover(stocks,demand,{objective,trim:data.trim,priceMode,m3,
     maxStates,maxMs});
   const c=thresholdCardinalityCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,maxStates,maxMs});
   const certifiedBounds=[r,c].filter(b=>b?.status==='optimal-relaxation');
   const best=certifiedBounds.length?
    Math.max(...certifiedBounds.map(b=>b.lowerBound)):null;
   base.groups.push({key,parts:parts.length,stockTypes:stocks.length,
    status:best===null?'unknown-bound':'optimal-relaxation',lowerBound:best,
    areaRelaxation:r,cardinalityRelaxation:c});
   if(best===null){allExact=false;continue}
   totalBound+=best;
  }
  // A proven minimum number of sheets also proves minimum cost or area
  // when EVERY eligible stock in each independent material group has
  // identical objective value per sheet. This remains valid for 25+ sheets,
  // even when the area-cover relaxation is far too weak.
  if(!allowMaterialAssignment&&plan.stockProof?.proven===true&&
     plan.stockProof.complete===true&&plan.stockProof.usedStockCount===plan.bins.length){
   let uniform=true;
   for(const [key] of groups){
    const stockTypes=data.stocks.filter(s=>groupKey(s)===key&&s.qty>0);
    if(!stockTypes.length){uniform=false;break}
    const unit=stock=>objective==='count'?1:objective==='area'?
      stock.l*stock.w:costOf(stock,{priceMode,m3});
    const values=stockTypes.map(unit);
    if(values.some(v=>v===null||!Number.isFinite(v)||v<0)||
       values.some(v=>Math.abs(v-values[0])>1e-7)){
     uniform=false;break
    }
   }
   if(uniform)return {...base,proven:true,lowerBound:incumbent,gap:0,
    status:'optimal',method:'proven-count-uniform-unit'};
  }
  if(!allExact)return {...base,status:'unknown-bound'};
  const tolerance=objective==='cost'?0.00001:objective==='count'?0:Math.max(EPS,Math.abs(totalBound)*1e-10);
  // If this inequality ever fails, input grouping or pricing is inconsistent;
  // do not turn an impossible stronger lower bound into a false proof.
  if(incumbent+tolerance<totalBound)
   return {...base,status:'inconsistent-bound',lowerBound:totalBound};
  const proven=incumbent<=totalBound+tolerance;
  return {...base,proven,lowerBound:totalBound,
    gap:Math.max(0,incumbent-totalBound),
    status:proven?'optimal':'gap',method:'integer-area-cover'};
 }
 // Every subset of pieces with minimum edge >= threshold must fit into
 // the same physical stock collection. For that subset, inscribed
 // threshold-squares give an independent kerf-aware count relaxation.
 // We take the MAXIMUM of the exact relaxed objective minima: this is
 // still a lower bound on the whole cutting job, not a cut pattern.
 // A timeout only ends threshold exploration; a bound already computed
 // from a finished relaxation remains mathematically sound.
 function thresholdCardinalityCover(parts,stocks,trim,kerf,options={}){
  const unknown={status:'unknown-limit',lowerBound:null,
   tested:0,total:0,complete:false};
  if(!parts.length||!Number.isFinite(kerf)||kerf<0||
     !Number.isFinite(trim)||trim<0||
     parts.some(p=>!Number.isFinite(p.l)||!Number.isFinite(p.w)||
      p.l<=0||p.w<=0))return unknown;
  const thresholds=[...new Set(parts.map(p=>Math.min(p.l,p.w)))];
  // Keep the previous all-pieces bound first, even under a tight budget.
  // Test more selective thresholds from largest to smallest afterwards.
  const smallest=Math.min(...thresholds);
  thresholds.sort((a,b)=>b-a);
  const sequence=[smallest,...thresholds.filter(t=>t!==smallest)];
  const started=Date.now(),maxMs=options.maxMs??2500,deadline=started+maxMs;
  let best=null,tested=0,interrupted=false;
  for(const threshold of sequence){
   const left=deadline-Date.now();
   if(left<=0){interrupted=true;break}
   // No epsilon here: including a piece with a smaller minimum edge
   // would invalidate the square-containment argument.
   const subset=parts.filter(p=>Math.min(p.l,p.w)>=threshold);
   const types=cardinalityTypes(subset,stocks,trim,kerf);
   if(!types)continue;
   const result=cover(types,subset.length,{...options,trim,maxMs:left});
   if(result.status==='unknown-price')
    return {status:'unknown-price',lowerBound:null,tested,
     total:sequence.length,complete:false};
   if(result.status==='unknown-limit'){
    interrupted=true;break
   }
   if(result.status==='optimal-relaxation'){
    tested++;
    best=best===null?result.lowerBound:Math.max(best,result.lowerBound)
   }
   // An infeasible relaxation may disprove the physical job, but this
   // certifier is only called after a verified feasible incumbent;
   // never reinterpret it as a finite objective bound.
  }
  return {status:best===null?'unknown-limit':'optimal-relaxation',
   lowerBound:best,tested,total:sequence.length,
   complete:!interrupted&&tested===sequence.length,
   method:'heterogeneous-threshold-kerf-cover'};
 }
 function countBoundForGroup(parts,stocks,trim,kerf){
  return thresholdCardinalityCover(parts,stocks,trim,kerf,{
   objective:'count',maxMs:700,maxStates:50000});
 }
 const api=Object.freeze({version:1,cover,certify,countBoundForGroup,thresholdCardinalityCover});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausOptimalityCertificate=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
