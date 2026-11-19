/* Beythaus Cut / bounded automatic material assignment.
   Computes independently-audited candidates, NEVER claims global optimality. */
(function(root){
 'use strict';
 function createAllocator({optimize,audit,offcutMetrics,binCost}){
  if([optimize,audit,offcutMetrics,binCost].some(f=>typeof f!=='function'))throw Error('Allocator dependencies missing');
  const policy=root.BeythausMaterialPolicy;
  if(!policy)throw Error('Material policy missing');
  function allocate(base,{maxCandidates=48}={}){
   const rows=[...new Set(base.parts.map(p=>p.order))],choices=new Map();
   for(const order of rows){
    const p=base.parts.find(x=>x.order===order);
    const valid=base.stocks.filter(s=>s.qty>0&&s.category===p.category&&
     (p.t===null||(s.t!==null&&Math.abs(p.t-s.t)<1e-6))&&
     (p.rotate?[false,true]:[false]).some(rotated=>
      policy.grainAllows(p,s,rotated)&&
      (rotated?p.w:p.l)<=s.l-2*base.trim+1e-6&&
      (rotated?p.l:p.w)<=s.w-2*base.trim+1e-6));
    const opts=[...new Set(valid.map(s=>s.material))].sort((a,b)=>{
     const unitCost=key=>Math.min(...valid.filter(s=>s.material===key)
      .map(s=>{const c=binCost(s,{priceMode:'panel'});return c===null?Infinity:c/(s.l*s.w)}));
     return unitCost(a)-unitCost(b)||a.localeCompare(b)
    });
    if(!opts.length)throw Error('Parça '+p.label+' için izin verilen uygun stok yok.');
    choices.set(order,opts)
   }
   const assignments=[],allocation=new Map(),estimatedSpace=rows.reduce((n,k)=>Math.min(1e12,n*choices.get(k).length),1);
   function enumerate(index){
    if(assignments.length>=maxCandidates)return;
    if(index===rows.length){assignments.push(new Map(allocation));return}
    for(const key of choices.get(rows[index])){
     allocation.set(rows[index],key);enumerate(index+1);
     if(assignments.length>=maxCandidates)break
    }
   }
   enumerate(0);
   let economic=null,minimum=null;
   const feasible=r=>!!r&&r.plan.unplaced.length===0;
   function compareCost(a,b){
    if(!b)return -1;
    if(feasible(a)!==feasible(b))return feasible(a)?-1:1;
    if(a.plan.unplaced.length!==b.plan.unplaced.length)return a.plan.unplaced.length-b.plan.unplaced.length;
    if(a.plan.unknownCostBins!==b.plan.unknownCostBins)return a.plan.unknownCostBins-b.plan.unknownCostBins;
    if(a.plan.cost!==null&&b.plan.cost!==null&&Math.abs(a.plan.cost-b.plan.cost)>.01)return a.plan.cost-b.plan.cost;
    if(a.plan.bins.length!==b.plan.bins.length)return a.plan.bins.length-b.plan.bins.length;
    return offcutMetrics(b.plan).usableArea-offcutMetrics(a.plan).usableArea
   }
   function compareCount(a,b){
    if(!b)return -1;
    if(feasible(a)!==feasible(b))return feasible(a)?-1:1;
    if(a.plan.unplaced.length!==b.plan.unplaced.length)return a.plan.unplaced.length-b.plan.unplaced.length;
    if(a.plan.bins.length!==b.plan.bins.length)return a.plan.bins.length-b.plan.bins.length;
    return compareCost(a,b)
   }
   for(const map of assignments){
    const data={...base,parts:base.parts.map(p=>({...p,material:map.get(p.order)}))};
    const plan=optimize(data,false,false);
    if(!audit(plan,data).ok)continue;
    const entry={data,plan};
    if(compareCost(entry,economic)<0)economic=entry;
    if(compareCount(entry,minimum)<0)minimum=entry
   }
   if(!economic&&!minimum)throw Error('Doğrulanabilir bir otomatik yerleşim bulunamadı.');
   const improve=entry=>{
    if(!entry)return null;
    const plan=optimize(entry.data,true,false);
    if(!audit(plan,entry.data).ok)return entry;
    const candidate={data:entry.data,plan};
    // Replacing an economic candidate must not silently increase cost.
    return compareCost(candidate,entry)<=0?candidate:entry
   };
   return {economic:improve(economic),minimum:improve(minimum),
    candidates:assignments.length,estimatedSpace,proven:false}
  }
  return {allocate}
 }
 const api=Object.freeze({version:1,createAllocator});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausMaterialAllocator=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
