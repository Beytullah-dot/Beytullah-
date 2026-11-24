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
 // Kerf-expanded area is necessary for each audited full-edge cut tree.
 // Expanding every part rightward and downward by k leaves all expanded
 // pieces disjoint: any two finished leaves are separated by >= k in
 // at least one axis. These expansions fit the usable stock enlarged by k
 // on the right and bottom. Rotation does not change expanded area.
 // The finite-stock cover optimum is a LOWER BOUND, not a cut pattern.
 function kerfExpandedAreaCover(parts,stocks,trim,kerf,options={}){
  const invalid={status:'invalid',lowerBound:null,states:0,
   method:'kerf-expanded-area-cover'};
  if(!Array.isArray(parts)||!parts.length||!Array.isArray(stocks)||
     !Number.isFinite(trim)||trim<0||
     !Number.isFinite(kerf)||kerf<0||
     parts.some(p=>!Number.isFinite(p.l)||!Number.isFinite(p.w)||
      p.l<=0||p.w<=0))
   return invalid;
  if(options.maxMs===0)return {...invalid,status:'unknown-limit'};
  let demand=0;
  for(const p of parts){
   demand+=(p.l+kerf)*(p.w+kerf);
   if(!Number.isFinite(demand))return invalid;
  }
  const types=[];
  for(const s of stocks){
   if(!Number.isFinite(s.l)||!Number.isFinite(s.w))
    return invalid;
   const W=s.l-2*trim,H=s.w-2*trim;
   const usable=W>0&&H>0?(W+kerf)*(H+kerf):0;
   if(!Number.isFinite(usable)||usable<0)return invalid;
   types.push({...s,_proofCapacity:usable});
  }
  return {...cover(types,demand,{...options,trim}),
   method:'kerf-expanded-area-cover'};
 }
 // Necessary one-piece geometry filter. A stock type that cannot hold even
 // ONE eligible part in any permitted orientation cannot appear in any
 // physical guillotine tree. Kerf does not require spare space around a
 // single exact-fit leaf; it cannot make a too-small board fit.
 // On malformed inputs or time exhaustion, FAIL OPEN to the original stock
 // list. This test does not claim the retained types can pack a whole job.
 function geometryCompatibleStockTypes(parts,stocks,trim,kerf,options={}){
  const fallback=status=>({stocks,removed:0,checks:0,status});
  if(!Array.isArray(parts)||!parts.length||!Array.isArray(stocks)||
     !Number.isFinite(trim)||trim<0||!Number.isFinite(kerf)||kerf<0||
     parts.some(p=>!Number.isFinite(p.l)||p.l<=0||
      !Number.isFinite(p.w)||p.w<=0)||
     stocks.some(s=>!Number.isFinite(s.l)||!Number.isFinite(s.w)||
      !Number.isSafeInteger(s.qty)||s.qty<0))
   return fallback('unknown-input');
  const deadline=options.deadline??Infinity;
  if(Date.now()>=deadline)return fallback('unknown-limit');
  const assignment=options.allowMaterialAssignment===true;
  let checks=0;
  const kept=[];
  for(const s of stocks){
   // Keep non-positive geometries for the existing relaxation's input
   // validation; do not hide a malformed model by preprocessing.
   if(!(s.l>0&&s.w>0)||s.qty===0){kept.push(s);continue}
   const W=s.l-2*trim,H=s.w-2*trim;
   let fits=false;
   if(W>0&&H>0)for(const p of parts){
    if((++checks&255)===0&&Date.now()>=deadline)
     return fallback('unknown-limit');
    if(assignment?
       String(p.category||'panel')!==String(s.category||'panel'):
       String(p.material||'')!==String(s.material||''))
     continue;
    // A specified part thickness cannot be cut from a stock with missing
    // or different thickness. Unspecified/invalid thickness fails open.
    if(Number.isFinite(p.t)&&p.t>0&&
       (s.t===null||(Number.isFinite(s.t)&&Math.abs(p.t-s.t)>1e-6)))
     continue;
    const original=p.grain!=='width'&&p.l<=W+EPS&&p.w<=H+EPS;
    const rotated=!!p.rotate&&p.grain!=='length'&&
      p.w<=W+EPS&&p.l<=H+EPS;
    if(original||rotated){fits=true;break}
   }
   if(fits)kept.push(s);
  }
  if(Date.now()>=deadline)return fallback('unknown-limit');
  return {stocks:kept,removed:stocks.length-kept.length,checks,status:'complete'};
 }
 function certify(plan,data,{objective='area',maxStates=120000,maxMs=2500,
    auditOK=false,allowMaterialAssignment=false,priceMode='panel',
    m3=25000}={}){
  const incumbent=objective==='area'?plan.stockArea:
    objective==='count'?plan.bins.length:plan.cost;
  const base={objective,incumbent,lowerBound:null,proven:false,
    status:'unknown',groups:[],gap:null,gapPercent:null,
    method:'integer-area-cover'};
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
  // Share a single deadline between preprocessing and every relaxation.
  // No geometry filter result is used if its assessment is interrupted.
  const deadline=Date.now()+Math.max(0,maxMs);
  const remaining=()=>Math.max(0,deadline-Date.now());
  const eligibleByKey=new Map();
  for(const [key,parts] of groups){
   const pool=data.stocks.filter(s=>groupKey(s)===key);
   const fit=geometryCompatibleStockTypes(parts,pool,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,
    {deadline,allowMaterialAssignment});
   if(fit.status!=='complete')
    return {...base,status:'unknown-bound'};
   eligibleByKey.set(key,{...fit,original:pool.length});
  }
  // Unpriced stock physically incompatible with every eligible part
  // cannot influence cost. Any remaining unpriced candidate still blocks
  // cost optimality, rather than becoming a zero-price shortcut.
  if(objective==='cost'&&[...eligibleByKey.values()].some(group=>
     group.stocks.some(s=>s.qty>0&&s.l>2*data.trim&&
      s.w>2*data.trim&&costOf(s,{priceMode,m3})===null)))
   return {...base,status:'unknown-price'};
  let totalBound=0,allExact=true,pairedImproved=false,multiImproved=false,tripleImproved=false,kerfImproved=false,stripImproved=false;
  for(const [key,parts] of groups){
   const demand=parts.reduce((sum,p)=>sum+p.l*p.w,0);
   const eligible=eligibleByKey.get(key);
   const stocks=eligible.stocks;
   // Physical exact optimum is proven only for nonrotatable pieces which
   // span the usable width of EVERY eligible stock. The separate solver
   // rejects wider boards, mixed materials and unsupported precision.
   // If the extra family is missing or runs out of budget, old bounds
   // continue unchanged; UNKNOWN is never promoted to a certificate.
   const stripSolver=!allowMaterialAssignment&&
    root.BeythausFullSpanPatternExact?.solve;
   let strip={status:'unknown-class',objectiveValue:null};
   if(stripSolver)try{
    strip=stripSolver(parts,stocks,{
     objective,trim:data.trim,kerf:data.kerf,allowNarrowScrapCuts:data.allowNarrowScrapCuts===true,priceMode,m3,
     maxStates:Math.min(maxStates,25000),maxNodes:750000,
     maxMs:Math.min(remaining(),400)
    });
   }catch(_error){
    // An optional research-derived proof family must never prevent the
    // existing safe relaxation families from completing.
    strip={status:'unknown-limit',objectiveValue:null};
   }
   const stripBound=strip.status==='optimal-physical-class'&&
    Number.isFinite(strip.objectiveValue)?strip.objectiveValue:null;
   const r=cover(stocks,demand,{objective,trim:data.trim,priceMode,m3,
     maxStates,maxMs:remaining()});
   const expanded=kerfExpandedAreaCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,maxStates:Math.min(maxStates,14000),
     maxMs:Math.min(remaining(),300)});
   const c=thresholdCardinalityCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,maxStates,maxMs:remaining()});
   const paired=pairedAreaCardinalityCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,
     maxStates:Math.min(maxStates,9000),maxMs:Math.min(remaining(),350)});
   const multi=multipleThresholdAreaCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,
     maxStates:Math.min(maxStates,2400),maxMs:Math.min(remaining(),350)});
   const triple=tripleThresholdAreaCover(parts,stocks,data.trim,
    Number.isFinite(data.kerf)?data.kerf:0,{
     objective,priceMode,m3,
     maxStates:Math.min(maxStates,700),maxMs:Math.min(remaining(),180)});
   const oldBounds=[r,c].filter(b=>b?.status==='optimal-relaxation')
    .map(b=>b.lowerBound);
   const oldBest=oldBounds.length?Math.max(...oldBounds):null;
   const certifiedBounds=[r,expanded,c,paired,multi,triple].filter(b=>
    b?.status==='optimal-relaxation');
   const completed=certifiedBounds.map(b=>b.lowerBound);
   if(stripBound!==null)completed.push(stripBound);
   const best=completed.length?Math.max(...completed):null;
   if(stripBound!==null&&
      stripBound>Math.max(-Infinity,...certifiedBounds.map(b=>b.lowerBound))+EPS)
    stripImproved=true;
   const legacyBounds=[r,c,paired,multi,triple].filter(b=>
    b?.status==='optimal-relaxation').map(b=>b.lowerBound);
   if(expanded.status==='optimal-relaxation'&&
      (!legacyBounds.length||
       expanded.lowerBound>Math.max(...legacyBounds)+EPS))
    kerfImproved=true;
   if(paired.status==='optimal-relaxation'&&
      (oldBest===null||paired.lowerBound>oldBest+EPS))
    pairedImproved=true;
   if(multi.status==='optimal-relaxation'&&
      (oldBest===null||multi.lowerBound>oldBest+EPS)&&
      (paired.status!=='optimal-relaxation'||
       multi.lowerBound>paired.lowerBound+EPS))
    multiImproved=true;
   if(triple.status==='optimal-relaxation'&&
      (oldBest===null||triple.lowerBound>oldBest+EPS)&&
      (paired.status!=='optimal-relaxation'||
       triple.lowerBound>paired.lowerBound+EPS)&&
      (multi.status!=='optimal-relaxation'||
       triple.lowerBound>multi.lowerBound+EPS))
    tripleImproved=true;
   base.groups.push({key,parts:parts.length,stockTypes:stocks.length,
    excludedStockTypes:eligible.removed,originalStockTypes:eligible.original,
    status:best===null?'unknown-bound':'optimal-relaxation',lowerBound:best,
    areaRelaxation:r,kerfExpandedAreaRelaxation:expanded,
    cardinalityRelaxation:c,pairedRelaxation:paired,
    multiThresholdRelaxation:multi,tripleThresholdRelaxation:triple,
    fullSpanPhysicalRelaxation:{status:strip.status,
     lowerBound:stripBound,states:strip.states||0,
     patterns:strip.patternsCreated||0}});
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
    const stockTypes=eligibleByKey.get(key).stocks.filter(s=>s.qty>0);
    if(!stockTypes.length){uniform=false;break}
    const unit=stock=>objective==='count'?1:objective==='area'?
      stock.l*stock.w:costOf(stock,{priceMode,m3});
    const values=stockTypes.map(unit);
    if(values.some(v=>v===null||!Number.isFinite(v)||v<0)||
       values.some(v=>Math.abs(v-values[0])>1e-7)){
     uniform=false;break
    }
   }
   if(uniform)return {...base,proven:true,lowerBound:incumbent,
    gap:0,gapPercent:0,status:'optimal',method:'proven-count-uniform-unit'};
  }
  if(!allExact)return {...base,status:'unknown-bound'};
  const tolerance=objective==='cost'?0.00001:objective==='count'?0:Math.max(EPS,Math.abs(totalBound)*1e-10);
  // If this inequality ever fails, input grouping or pricing is inconsistent;
  // do not turn an impossible stronger lower bound into a false proof.
  if(incumbent+tolerance<totalBound)
   return {...base,status:'inconsistent-bound',lowerBound:totalBound};
  const proven=incumbent<=totalBound+tolerance;
  const gap=Math.max(0,incumbent-totalBound);
  return {...base,proven,lowerBound:totalBound,
    gap,gapPercent:incumbent>0?100*gap/incumbent:0,
    status:proven?'optimal':'gap',
    method:stripImproved?'physical-fullspan-strip-exact':
    kerfImproved?'kerf-expanded-area-cover':
     tripleImproved?'triple-threshold-area-cover':
     multiImproved?'multi-threshold-area-cover':
     pairedImproved?'paired-area-threshold-cover':'integer-area-cover'};
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
  const smallest=thresholds.reduce((low,t)=>Math.min(low,t),Infinity);
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
 // Joint two-resource stock-cover relaxation. Every physical plan must
 // simultaneously have enough usable STOCK AREA for every part and enough
 // threshold-square SLOTS for the selected large-part subset. Meeting
 // both independent capacity sums is necessary, never sufficient, so
 // minimizing the chosen objective here is a GLOBAL lower bound.
 // This is not a guillotine pattern generator or an infeasibility oracle.
 function pairedCover(types,needArea,needCount,{
  objective='cost',trim=0,priceMode='panel',m3=25000,
  maxStates=9000,maxMs=350
 }={}){
  const started=Date.now(),deadline=started+maxMs;
  const unknown=(reason,states)=>({status:reason,lowerBound:null,
   states,elapsedMs:Date.now()-started});
  if(!['count','area','cost'].includes(objective)||
     !Number.isFinite(needArea)||needArea<0||
     !Number.isSafeInteger(needCount)||needCount<0||
     !Number.isFinite(trim)||trim<0||
     !(maxStates>0)&&maxStates!==Infinity||
     !Number.isFinite(maxMs)||maxMs<0)
   return unknown('invalid',0);
  if(needArea===0&&needCount===0)return {status:'optimal-relaxation',
   lowerBound:0,states:1,elapsedMs:0};
  if(maxMs===0)return unknown('unknown-limit',0);
  const stocks=[];
  for(const s of types){
   if(!Number.isSafeInteger(s.qty)||s.qty<0||
      !Number.isFinite(s.l)||!Number.isFinite(s.w)||
      !Number.isFinite(s._proofCapacity)||s._proofCapacity<0)
    return unknown('invalid',0);
   if(!s.qty)continue;
   const W=s.l-2*trim,H=s.w-2*trim;
   const area=W>0&&H>0?W*H:0;
   const count=Math.min(needCount,s._proofCapacity);
   if(!(area>0||count>0))continue;
   const unit=objective==='area'?s.l*s.w:
    objective==='count'?1:costOf(s,{priceMode,m3});
   if(unit===null)return unknown('unknown-price',0);
   if(!Number.isFinite(unit)||unit<0||!Number.isFinite(area))
    return unknown('invalid',0);
   // More than either individual resource needs from ONE stock type
   // cannot be necessary with a nonnegative per-sheet objective.
   // The +EPS deliberately permits extra, never removes a valid choice.
   const maxArea=area>0?Math.ceil((needArea+EPS)/area):0;
   const maxCount=count>0?Math.ceil(needCount/count):0;
   const qty=Math.min(s.qty,Math.max(maxArea,maxCount));
   if(qty>0)stocks.push({area,count,unit,qty});
  }
  if(!stocks.length)return unknown('infeasible-relaxation',0);
  if(stocks.reduce((sum,s)=>sum+s.area*s.qty,0)+EPS<needArea||
     stocks.reduce((sum,s)=>sum+s.count*s.qty,0)<needCount)
   return unknown('infeasible-relaxation',0);
  // High area / threshold-count per sheet first to shorten frontiers;
  // sorting types never changes bounded integer multisets.
  stocks.sort((a,b)=>(b.count+b.area/(needArea||1))-
    (a.count+a.area/(needArea||1))||a.unit-b.unit);
  let states=[{area:0,count:0,objective:0}],peak=1;
  for(const s of stocks){
   if(Date.now()>=deadline)return unknown('unknown-limit',peak);
   const expanded=[];
   for(const st of states){
    for(let q=0;q<=s.qty;q++){
     expanded.push({area:Math.min(needArea,st.area+q*s.area),
      count:Math.min(needCount,st.count+q*s.count),
      objective:st.objective+q*s.unit});
     if(expanded.length>maxStates*8||Date.now()>=deadline)
      return unknown('unknown-limit',Math.max(peak,expanded.length));
    }
   }
   expanded.sort((a,b)=>b.area-a.area||b.count-a.count||
    a.objective-b.objective);
   // Since area is scanned DESCENDING, a previous state may dominate
   // the current one only if its count >= current count and its
   // objective <= current objective. Fenwick prefix-min of descending
   // count indices implements this exact safe Pareto test.
   const counts=[...new Set(expanded.map(x=>x.count))]
    .sort((a,b)=>b-a);
   const index=new Map(counts.map((value,i)=>[value,i+1]));
   const bestCost=new Float64Array(counts.length+1);
   bestCost.fill(Infinity);
   function query(j){
    let result=Infinity;
    for(;j>0;j-=j&-j)result=Math.min(result,bestCost[j]);
    return result
   }
   function save(j,cost){
    for(;j<bestCost.length;j+=j&-j)
     bestCost[j]=Math.min(bestCost[j],cost)
   }
   const frontier=[];
   for(const st of expanded){
    const j=index.get(st.count);
    if(query(j)<=st.objective)continue;
    frontier.push(st);
    save(j,st.objective);
    if(frontier.length>maxStates||Date.now()>=deadline)
     return unknown('unknown-limit',Math.max(peak,frontier.length));
   }
   states=frontier;
   peak=Math.max(peak,states.length);
  }
  let optimum=Infinity;
  for(const st of states)if(st.area+EPS>=needArea&&
    st.count>=needCount)optimum=Math.min(optimum,st.objective);
  if(!Number.isFinite(optimum))return unknown('infeasible-relaxation',peak);
  return {status:'optimal-relaxation',lowerBound:optimum,
   states:peak,elapsedMs:Date.now()-started}
 }
 // Max over individually completed (area + threshold) integer
 // relaxations. The same stock multiset has to meet both demand
 // vectors; this is strictly stronger than taking the two independent
 // scalar covering bounds, without imposing any pattern-stage limit.
 function pairedAreaCardinalityCover(parts,stocks,trim,kerf,options={}){
  const started=Date.now(),maxMs=options.maxMs??350;
  const blank={status:'unknown-limit',lowerBound:null,tested:0,
   total:0,complete:false,method:'paired-area-threshold-cover'};
  if(!parts.length||!Number.isFinite(trim)||trim<0||
     !Number.isFinite(kerf)||kerf<0||
     parts.some(p=>!Number.isFinite(p.l)||!Number.isFinite(p.w)||
      p.l<=0||p.w<=0))return blank;
  const thresholds=[...new Set(parts.map(p=>Math.min(p.l,p.w)))]
   .sort((a,b)=>b-a);
  const totalArea=parts.reduce((sum,p)=>sum+p.l*p.w,0);
  if(!Number.isFinite(totalArea))return blank;
  let best=null,tested=0,interrupted=false;
  for(const threshold of thresholds){
   const remaining=maxMs-(Date.now()-started);
   if(remaining<=0){interrupted=true;break}
   const subset=parts.filter(p=>Math.min(p.l,p.w)>=threshold);
   const types=cardinalityTypes(subset,stocks,trim,kerf);
   if(!types){interrupted=true;break}
   const result=pairedCover(types,totalArea,subset.length,{
    ...options,trim,maxMs:remaining});
   if(result.status==='unknown-price')
    return {...blank,status:'unknown-price',total:thresholds.length,
     tested};
   if(result.status==='unknown-limit'||result.status==='invalid'){
    interrupted=true;break
   }
   if(result.status==='optimal-relaxation'){
    best=best===null?result.lowerBound:Math.max(best,result.lowerBound);
    tested++
   }
  }
  return {status:best===null?'unknown-limit':'optimal-relaxation',
   lowerBound:best,tested,total:thresholds.length,
   complete:!interrupted&&tested===thresholds.length,
   method:'paired-area-threshold-cover',
   elapsedMs:Date.now()-started};
 }

 // Exact finite-stock multiset relaxation: usable area AND TWO different
 // inscribed-square threshold counts must hold in the SAME stock selection.
 // All actual guillotine cuts remain relaxed; no pattern feasibility claimed.
 function dualThresholdCover(types,needArea,needs,{
  objective='cost',trim=0,priceMode='panel',m3=25000,
  maxStates=2400,maxMs=350
 }={}){
  const started=Date.now(),deadline=started+maxMs;
  const unknown=(status,states)=>({status,lowerBound:null,states,
   elapsedMs:Date.now()-started});
  if(!['area','cost','count'].includes(objective)||
     !Number.isFinite(needArea)||needArea<0||
     !Array.isArray(needs)||needs.length!==2||
     needs.some(n=>!Number.isSafeInteger(n)||n<0)||
     !Number.isFinite(trim)||trim<0||
     (!(maxStates>0)&&maxStates!==Infinity)||
     !Number.isFinite(maxMs)||maxMs<0)return unknown('invalid',0);
  if(!needArea&&!needs[0]&&!needs[1])
   return {status:'optimal-relaxation',lowerBound:0,states:1,elapsedMs:0};
  if(maxMs===0)return unknown('unknown-limit',0);
  const stocks=[];
  for(const s of types){
   if(!Number.isSafeInteger(s.qty)||s.qty<0||
      !Number.isFinite(s.l)||!Number.isFinite(s.w)||
      !Array.isArray(s._proofCaps)||s._proofCaps.length!==2||
      s._proofCaps.some(n=>!Number.isFinite(n)||n<0))
    return unknown('invalid',0);
   if(!s.qty)continue;
   const W=s.l-2*trim,H=s.w-2*trim;
   const area=W>0&&H>0?W*H:0;
   const counts=s._proofCaps.map((n,i)=>Math.min(needs[i],n));
   if(!(area>0||counts.some(n=>n>0)))continue;
   const unit=objective==='area'?s.l*s.w:
    objective==='count'?1:costOf(s,{priceMode,m3});
   if(unit===null)return unknown('unknown-price',0);
   if(!Number.isFinite(unit)||unit<0||!Number.isFinite(area))
    return unknown('invalid',0);
   // Saturation of every resource by one type makes additional copies
   // redundant when the objective has nonnegative per-stock units.
   const qty=Math.min(s.qty,Math.max(
    area>0?Math.ceil((needArea+EPS)/area):0,
    ...counts.map((n,i)=>n>0?Math.ceil(needs[i]/n):0)));
   if(qty>0)stocks.push({area,counts,unit,qty});
  }
  if(!stocks.length)return unknown('infeasible-relaxation',0);
  if(stocks.reduce((sum,s)=>sum+s.area*s.qty,0)+EPS<needArea||
     needs.some((n,i)=>stocks.reduce((sum,s)=>
      sum+s.qty*s.counts[i],0)<n))
   return unknown('infeasible-relaxation',0);
  stocks.sort((a,b)=>{
   const score=s=>s.area/(needArea||1)+
    s.counts[0]/(needs[0]||1)+s.counts[1]/(needs[1]||1);
   return score(b)-score(a)||a.unit-b.unit
  });
  let states=[[0,0,0,0]],peak=1;
  for(const s of stocks){
   if(Date.now()>=deadline)return unknown('unknown-limit',peak);
   const expanded=[];
   for(const st of states)for(let q=0;q<=s.qty;q++){
    expanded.push([Math.min(needArea,st[0]+q*s.area),
     Math.min(needs[0],st[1]+q*s.counts[0]),
     Math.min(needs[1],st[2]+q*s.counts[1]),
     st[3]+q*s.unit]);
    if(expanded.length>maxStates*6||Date.now()>=deadline)
     return unknown('unknown-limit',Math.max(peak,expanded.length));
   }
   expanded.sort((a,b)=>b[0]-a[0]||b[1]-a[1]||
    b[2]-a[2]||a[3]-b[3]);
   // Sorted usable area descending. A 2D Fenwick prefix-min on
   // descending high/low counts removes only provably dominated states.
   const highs=[...new Set(expanded.map(st=>st[1]))].sort((a,b)=>b-a);
   const highRank=new Map(highs.map((n,i)=>[n,i+1]));
   const coords=Array.from({length:highs.length+1},()=>[]);
   for(const st of expanded)
    for(let x=highRank.get(st[1]);x<coords.length;x+=x&-x)
     coords[x].push(st[2]);
   const trees=coords.map((v,i)=>{
    if(!i)return null;
    coords[i]=[...new Set(v)].sort((a,b)=>b-a);
    const tree=new Float64Array(coords[i].length+1);
    tree.fill(Infinity);return tree
   });
   function rank(xs,v){
    let l=0,r=xs.length;
    while(l<r){
     const mid=(l+r)>>1;
     if(xs[mid]>=v)l=mid+1;else r=mid;
    }
    return l
   }
   function minDominating(hi,lo){
    let best=Infinity;
    for(let x=highRank.get(hi);x>0;x-=x&-x)
     for(let j=rank(coords[x],lo);j>0;j-=j&-j)
      best=Math.min(best,trees[x][j]);
    return best
   }
   function save(hi,lo,cost){
    for(let x=highRank.get(hi);x<coords.length;x+=x&-x)
     for(let j=rank(coords[x],lo);j<trees[x].length;j+=j&-j)
      trees[x][j]=Math.min(trees[x][j],cost);
   }
   const frontier=[];
   for(const st of expanded){
    if(minDominating(st[1],st[2])<=st[3])continue;
    frontier.push(st);save(st[1],st[2],st[3]);
    if(frontier.length>maxStates||Date.now()>=deadline)
     return unknown('unknown-limit',Math.max(peak,frontier.length));
   }
   states=frontier;peak=Math.max(peak,states.length);
  }
  let best=Infinity;
  for(const st of states)if(st[0]+EPS>=needArea&&
     st[1]>=needs[0]&&st[2]>=needs[1])
   best=Math.min(best,st[3]);
  if(!Number.isFinite(best))return unknown('infeasible-relaxation',peak);
  return {status:'optimal-relaxation',lowerBound:best,states:peak,
   elapsedMs:Date.now()-started};
 }
 // Strongest completed pair of thresholds. Partial enumeration may retain
 // completed valid bounds, never claim all pairs were explored.
 function multipleThresholdAreaCover(parts,stocks,trim,kerf,options={}){
  const started=Date.now(),maxMs=options.maxMs??350;
  const blank={status:'unknown-limit',lowerBound:null,tested:0,
   total:0,complete:false,method:'multi-threshold-area-cover'};
  if(!parts.length||!Number.isFinite(trim)||trim<0||
     !Number.isFinite(kerf)||kerf<0||
     parts.some(p=>!Number.isFinite(p.l)||!Number.isFinite(p.w)||
      p.l<=0||p.w<=0))return blank;
  const edges=[...new Set(parts.map(p=>Math.min(p.l,p.w)))]
   .sort((a,b)=>b-a);
  if(edges.length<2)return blank;
  const area=parts.reduce((sum,p)=>sum+p.l*p.w,0);
  if(!Number.isFinite(area))return blank;
  const total=edges.length*(edges.length-1)/2;
  let best=null,tested=0,interrupted=false;
  // Adjacent size classes before distant pairs: no hard size-class limit.
  for(let distance=1;distance<edges.length&&!interrupted;distance++)
   for(let i=0;i+distance<edges.length;i++){
    const left=maxMs-(Date.now()-started);
    if(left<=0){interrupted=true;break}
    const subsets=[edges[i],edges[i+distance]].map(edge=>
     parts.filter(p=>Math.min(p.l,p.w)>=edge));
    const caps=subsets.map(p=>cardinalityTypes(p,stocks,trim,kerf));
    if(caps.some(c=>!c)){interrupted=true;break}
    const types=stocks.map((s,j)=>({...s,
     _proofCaps:caps.map(c=>c[j]._proofCapacity)}));
    const result=dualThresholdCover(types,area,subsets.map(p=>p.length),
     {...options,trim,maxMs:left});
    if(result.status==='unknown-price')
     return {...blank,status:'unknown-price',tested,total};
    if(result.status!=='optimal-relaxation'){
     interrupted=true;break
    }
    tested++;best=best===null?result.lowerBound:
     Math.max(best,result.lowerBound);
   }
  return {status:best===null?'unknown-limit':'optimal-relaxation',
   lowerBound:best,tested,total,complete:!interrupted&&tested===total,
   method:'multi-threshold-area-cover',
   elapsedMs:Date.now()-started};
 }

 // Three simultaneous kerf-aware threshold slots plus usable stock area.
 // A finite multiset satisfying these NECESSARY conditions may still be
 // impossible to cut: completion only proves an exact relaxation.
 function tripleThresholdAreaCover(parts,stocks,trim,kerf,options={}){
  const started=Date.now(),maxMs=options.maxMs??180,
   maxStates=options.maxStates??700,objective=options.objective||'area';
  const blank={status:'unknown-limit',lowerBound:null,tested:0,
   total:0,complete:false,peakStates:0,method:'triple-threshold-area-cover'};
  if(!['area','cost','count'].includes(objective)||
     !parts.length||!Number.isFinite(trim)||trim<0||
     !Number.isFinite(kerf)||kerf<0||
     !Number.isFinite(maxMs)||maxMs<0||
     (!(maxStates>0)&&maxStates!==Infinity)||
     parts.some(p=>!Number.isFinite(p.l)||!Number.isFinite(p.w)||
      p.l<=0||p.w<=0))return {...blank,status:'invalid'};
  const edges=[...new Set(parts.map(p=>Math.min(p.l,p.w)))].sort((a,b)=>b-a);
  if(edges.length<3)return blank;
  const needArea=parts.reduce((sum,p)=>sum+p.l*p.w,0);
  if(!Number.isFinite(needArea))return {...blank,status:'invalid'};
  const total=edges.length*(edges.length-1)*(edges.length-2)/6;
  let best=null,tested=0,peakStates=0,interrupted=false;
  const deadline=started+maxMs;
  // Widen the span of thresholds progressively; not a part-count limit.
  for(let span=2;span<edges.length&&!interrupted;span++)
   for(let first=0;first+span<edges.length&&!interrupted;first++)
    for(let mid=first+1;mid<first+span;mid++){
     if(Date.now()>=deadline){interrupted=true;break}
     const thresholds=[edges[first],edges[mid],edges[first+span]];
     const subsets=thresholds.map(t=>
      parts.filter(p=>Math.min(p.l,p.w)>=t));
     const caps=subsets.map(p=>cardinalityTypes(p,stocks,trim,kerf));
     if(caps.some(x=>!x)){interrupted=true;break}
     const needs=subsets.map(p=>p.length);
     const types=[];
     for(let j=0;j<stocks.length;j++){
      const s=stocks[j];
      if(!Number.isSafeInteger(s.qty)||s.qty<0||
         !Number.isFinite(s.l)||!Number.isFinite(s.w))
       return {...blank,status:'invalid'};
      if(!s.qty)continue;
      const W=s.l-2*trim,H=s.w-2*trim;
      const area=W>0&&H>0?W*H:0;
      const counts=caps.map((arr,i)=>Math.min(needs[i],arr[j]._proofCapacity));
      if(!(area>0||counts.some(x=>x>0)))continue;
      const unit=objective==='area'?s.l*s.w:
       objective==='count'?1:costOf(s,options);
      if(unit===null)return {...blank,status:'unknown-price',tested,total};
      if(!Number.isFinite(unit)||unit<0)
       return {...blank,status:'invalid'};
      const qty=Math.min(s.qty,Math.max(
       area>0?Math.ceil((needArea+EPS)/area):0,
       ...counts.map((c,i)=>c>0?Math.ceil(needs[i]/c):0)));
      if(qty>0)types.push({area,counts,unit,qty});
     }
     if(!types.length||
        types.reduce((sum,s)=>sum+s.qty*s.area,0)+EPS<needArea||
        needs.some((need,i)=>types.reduce((sum,s)=>
         sum+s.qty*s.counts[i],0)<need)){
      interrupted=true;break
     }
     types.sort((a,b)=>(b.area/(needArea||1)+b.counts.reduce((v,x,i)=>
      v+x/(needs[i]||1),0))-
      (a.area/(needArea||1)+a.counts.reduce((v,x,i)=>
       v+x/(needs[i]||1),0))||a.unit-b.unit);
     let states=[[0,0,0,0,0]],peak=1,limit=false;
     for(const s of types){
      if(Date.now()>=deadline){limit=true;break}
      const expanded=[];
      for(const st of states){
       if(limit)break;
       for(let q=0;q<=s.qty;q++){
       expanded.push([Math.min(needArea,st[0]+q*s.area),
        ...st.slice(1,4).map((x,i)=>Math.min(needs[i],x+q*s.counts[i])),
        st[4]+q*s.unit]);
       if(expanded.length>maxStates*6||Date.now()>=deadline){
        limit=true;break
       }
       }
      }
      if(limit)break;
      expanded.sort((a,b)=>b[0]-a[0]||b[1]-a[1]||
       b[2]-a[2]||b[3]-a[3]||a[4]-b[4]);
      // Area is descending. Only <= cost and >= ALL slots dominates.
      // A simple exact skyline scan prevents unsafe scalarization.
      const frontier=[];
      let checks=0;
      for(const st of expanded){
       let dominated=false;
       for(const other of frontier){
        if(other[1]>=st[1]&&other[2]>=st[2]&&
           other[3]>=st[3]&&other[4]<=st[4]){
         dominated=true;break
        }
        if((++checks&255)===0&&Date.now()>=deadline){
         limit=true;break
        }
       }
       if(limit)break;
       if(dominated)continue;
       frontier.push(st);
       if(frontier.length>maxStates||Date.now()>=deadline){
        limit=true;break
       }
      }
      if(limit)break;
      states=frontier;peak=Math.max(peak,states.length);
     }
     peakStates=Math.max(peakStates,peak);
     if(limit){interrupted=true;break}
     let optimum=Infinity;
     for(const st of states)if(st[0]+EPS>=needArea&&
        needs.every((need,i)=>st[i+1]>=need))
      optimum=Math.min(optimum,st[4]);
     if(!Number.isFinite(optimum)){interrupted=true;break}
     tested++;best=best===null?optimum:Math.max(best,optimum);
    }
  return {status:best===null?'unknown-limit':'optimal-relaxation',
   lowerBound:best,tested,total,complete:!interrupted&&tested===total,
   peakStates,elapsedMs:Date.now()-started,
   method:'triple-threshold-area-cover'};
 }

 function countBoundForGroup(parts,stocks,trim,kerf){
  return thresholdCardinalityCover(parts,stocks,trim,kerf,{
   objective:'count',maxMs:700,maxStates:50000});
 }
 const api=Object.freeze({version:1,cover,kerfExpandedAreaCover,geometryCompatibleStockTypes,certify,countBoundForGroup,
  thresholdCardinalityCover,pairedAreaCardinalityCover,multipleThresholdAreaCover,
   tripleThresholdAreaCover});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausOptimalityCertificate=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
