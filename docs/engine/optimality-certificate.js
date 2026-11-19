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
   const usable=Math.max(0,s.l-2*trim)*Math.max(0,s.w-2*trim);
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
   base.groups.push({key,parts:parts.length,stockTypes:stocks.length,...r});
   if(r.status!=='optimal-relaxation'){
    allExact=false;continue
   }
   totalBound+=r.lowerBound;
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
 const api=Object.freeze({version:1,cover,certify});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausOptimalityCertificate=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
