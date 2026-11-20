/* Beythaus Cut — guillotine block synthesis and whole-plan rescue.
 * Heuristic only. Builds manufacturable full-edge binary cut blocks,
 * then packs them using the shipped guillotine engine. All candidates
 * MUST pass the independent production cut-tree audit; there is no
 * optimality claim. No fixed maximum input item or stock count.
 */
(function(root){
 'use strict';
 const EPS=1e-6;
 const eq=(a,b)=>Math.abs(a-b)<=EPS;
 function randomSeed(value){
  let x=value|0||137;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}
 }
 function orientations(item,trial,rand){
  const grain=root.BeythausMaterialPolicy?.grain(item.grain)||'';
  const square=eq(item.l,item.w);
  const canTurn=!!item.rotate&&(square||!eq(item.l,item.w));
  const rotated=grain==='width'?canTurn:
   grain==='length'?false:canTurn&&(trial>0&&rand()<.35);
  return {leaf:true,piece:item,rotated,
   w:rotated?item.w:item.l,h:rotated?item.l:item.w,
   count:1,firstOrder:item.order||0};
 }
 function joinBlocks(a,b,axis,kerf){
  return {leaf:false,axis,a,b,
   w:axis==='x'?a.w+b.w+kerf:a.w,
   h:axis==='y'?a.h+b.h+kerf:a.h,
   count:a.count+b.count,firstOrder:Math.min(a.firstOrder,b.firstOrder)};
 }
 function build(items,stocks,cfg,trial,deadline){
  const rand=randomSeed(76423+trial*132911),k=cfg.kerf;
  let nodes=items.map(p=>orientations(p,trial,rand));
  const canFit=(w,h)=>stocks.some(s=>s.qty>0&&
   w<=s.l-2*cfg.trim+EPS&&h<=s.w-2*cfg.trim+EPS);
  const dimensions=stocks.filter(s=>s.qty>0).map(s=>({
   w:s.l-2*cfg.trim,h:s.w-2*cfg.trim}));
  let rounds=0,merges=0;
  while(nodes.length>1&&Date.now()<deadline&&rounds++<18){
   const widths=new Map(),heights=new Map();
   for(const node of nodes){
    const w=Math.round(node.w*1e5),h=Math.round(node.h*1e5);
    widths.set(w,(widths.get(w)||0)+1);
    heights.set(h,(heights.get(h)||0)+1)
   }
   const edges=[];
   for(let i=0;i<nodes.length;i++){
    if(i%24===0&&Date.now()>deadline)break;
    const a=nodes[i];
    for(let j=i+1;j<nodes.length;j++){
     const b=nodes[j];
     for(const axis of ['x','y']){
      if(axis==='x'?!eq(a.h,b.h):!eq(a.w,b.w))continue;
      const merged=joinBlocks(a,b,axis,k);
      if(!canFit(merged.w,merged.h))continue;
      const shared=axis==='x'?Math.round(a.h*1e5):Math.round(a.w*1e5);
      const freq=axis==='x'?(heights.get(shared)||2):(widths.get(shared)||2);
      const rootFit=dimensions.some(s=>eq(s.w,merged.w)&&eq(s.h,merged.h));
      const edgeFit=dimensions.some(s=>eq(s.w,merged.w)||eq(s.h,merged.h));
      // Inspect whether the proposed merged block has plausible
      // next-level siblings before committing an ambiguous pairing.
      const nextSibling=nodes.some((other,index)=>index!==i&&index!==j&&
       (eq(other.w,merged.w)||eq(other.h,merged.h)));
      let score=(rootFit?100000:0)+(edgeFit?1200:0)+
       600/Math.max(1,freq-1)+(nextSibling?350:0)+
       Math.log2(merged.count+1)*5;
      score+=(rand()-.5)*(trial===0?0.01:trial%3===0?500:200);
      edges.push({i,j,axis,merged,score})
     }
    }
   }
   if(!edges.length)break;
   edges.sort((a,b)=>b.score-a.score||a.i-b.i||a.j-b.j);
   const used=new Set(),next=[];
   for(const edge of edges){
    if(used.has(edge.i)||used.has(edge.j))continue;
    used.add(edge.i);used.add(edge.j);
    next.push(edge.merged);merges++
   }
   for(let i=0;i<nodes.length;i++)if(!used.has(i))next.push(nodes[i]);
   if(next.length===nodes.length)break;
   nodes=next
  }
  return {nodes,merges,rounds};
 }
 // Candidate search: rebuild full-sheet binary slicing patterns from
 // complementary exact rectangles. This enumerates local 2, 4 and 8
 // piece patterns irrespective of the TOTAL project piece count.
 // The resource limit interrupts pattern discovery, never user input.
 function exactSheetPatterns(items,stocks,cfg,deadline){
  const leaves=items.map((p,i)=>({
   ...orientations(p,0,()=>.5),mask:1n<<BigInt(i),indices:[i]
  }));
  const usable=stocks.map(s=>({
   stock:s,w:s.l-2*cfg.trim,h:s.w-2*cfg.trim
  })).filter(s=>s.stock.qty>0&&s.w>0&&s.h>0);
  if(!usable.length)return [];
  const fit=(w,h)=>usable.some(s=>w<=s.w+EPS&&h<=s.h+EPS);
  const atEdge=(w,h)=>usable.some(s=>eq(w,s.w)||eq(h,s.h));
  const all=[],seen=new Set(),maxCandidates=24000;
  function candidate(a,b,axis){
   if((a.mask&b.mask)!==0n)return;
   if(axis==='x'?!eq(a.h,b.h):!eq(a.w,b.w))return;
   const node=joinBlocks(a,b,axis,cfg.kerf);
   if(!fit(node.w,node.h))return;
   node.mask=a.mask|b.mask;
   node.indices=a.indices.concat(b.indices);
   const key=node.mask.toString(36)+':'+Math.round(node.w*1e5)+
    ':'+Math.round(node.h*1e5);
   if(seen.has(key))return;
   seen.add(key);
   return node
  }
  function completed(node){
   for(let stockIndex=0;stockIndex<usable.length;stockIndex++){
    const ref=usable[stockIndex];
    if(eq(node.w,ref.w)&&eq(node.h,ref.h))
     all.push({node,stock:ref.stock,stockIndex,mask:node.mask,
      indices:node.indices,count:node.indices.length})
   }
  }
  const pairs=[];
  for(let i=0;i<leaves.length&&Date.now()<deadline;i++){
   for(let j=i+1;j<leaves.length;j++){
    for(const axis of ['x','y']){
     const p=candidate(leaves[i],leaves[j],axis);
     if(p){pairs.push(p);completed(p)}
    }
   }
  }
  if(Date.now()>=deadline)return all;
  const quads=[];
  // Neighboring sibling blocks share a full side. Only keep quartets
  // that already span a stock width OR stock height. This is a strong,
  // physically meaningful pruning rule, not a false feasibility proof.
  for(let i=0;i<pairs.length&&Date.now()<deadline&&quads.length<maxCandidates;i++){
   for(let j=i+1;j<pairs.length;j++){
    for(const axis of ['x','y']){
     const p=candidate(pairs[i],pairs[j],axis);
     if(!p||!atEdge(p.w,p.h))continue;
     quads.push(p);completed(p);
     if(quads.length>=maxCandidates)break
    }
    if(quads.length>=maxCandidates)break
   }
  }
  if(Date.now()>=deadline)return all;
  for(let i=0;i<quads.length&&Date.now()<deadline&&all.length<maxCandidates;i++){
   for(let j=i+1;j<quads.length;j++){
    for(const axis of ['x','y']){
     const p=candidate(quads[i],quads[j],axis);
     if(p)completed(p);
     if(all.length>=maxCandidates)break
    }
    if(all.length>=maxCandidates)break
   }
  }
  return all
 }
 function selectPatterns(patterns,stocks,items,trial){
  if(!patterns.length)return [];
  const rand=randomSeed(9027+trial*317);
  const frequency=new Uint32Array(items.length);
  for(const p of patterns)for(const i of p.indices)frequency[i]++;
  const ranked=patterns.map(p=>({
   ...p,priority:p.count*1000+
    p.indices.reduce((sum,i)=>sum+1/Math.max(1,frequency[i]),0)*250+
    rand()*(trial===0?1:240)
  })).sort((a,b)=>b.priority-a.priority);
  const quantities=new Map(),used=new Set(),chosen=[];
  for(const p of ranked){
   if((quantities.get(p.stock.id)||0)>=p.stock.qty)continue;
   if(p.indices.some(i=>used.has(i)))continue;
   chosen.push(p);quantities.set(p.stock.id,(quantities.get(p.stock.id)||0)+1);
   for(const i of p.indices)used.add(i)
  }
  return chosen
 }
 function tryWholePatterns(items,stocks,cfg,trial,deadline,packAttempt,binCost,auditCutPlan,baseline,compare){
  const patterns=exactSheetPatterns(items,stocks,cfg,deadline);
  if(!patterns.length)return {candidate:null,found:0,patterns:0};
  let best=baseline,bestFound=0;
  for(let variant=0;variant<5&&Date.now()<deadline;variant++){
   const chosen=selectPatterns(patterns,stocks,items,variant+trial);
   if(!chosen.length)continue;
   const used=new Set(),counts=new Map(),premade=[];
   for(const c of chosen){
    for(const index of c.indices)used.add(index);
    counts.set(c.stock.id,(counts.get(c.stock.id)||0)+1);
    premade.push({stock:c.stock,free:[],cuts:[],
     placed:[{_block:c.node,x:cfg.trim,y:cfg.trim,
      w:c.node.w,h:c.node.h}]})
   }
   const rest=items.filter((_,i)=>!used.has(i));
   const left=stocks.map(s=>({...s,qty:s.qty-(counts.get(s.id)||0)}))
    .filter(s=>s.qty>0);
   const remaining=rest.length?packAttempt(rest,left,cfg,variant*3+trial):
    {bins:[],unplaced:[]};
   const raw={bins:[...premade,...remaining.bins],
    unplaced:remaining.unplaced};
   const candidate=expand(raw,items,cfg);
   if(!candidate)continue;
   candidate.stockArea=candidate.bins.reduce((sum,b)=>sum+b.stock.l*b.stock.w,0);
   candidate.unknownCostBins=candidate.bins.filter(b=>binCost(b.stock,cfg)===null).length;
   candidate.cost=candidate.unknownCostBins?null:
    candidate.bins.reduce((sum,b)=>sum+binCost(b.stock,cfg),0);
   if(compare(candidate,best)>=0)continue;
   const audit=auditCutPlan(candidate,{parts:items,stocks,
    kerf:cfg.kerf,trim:cfg.trim});
   if(!audit.ok)continue;
   best=candidate;bestFound=chosen.length
   if(!candidate.unplaced.length)break
  }
  return {candidate:best===baseline?null:best,found:bestFound,
   patterns:patterns.length}
 }
 function flatten(tree,output){
  if(tree.leaf){output.push(tree.piece);return}
  flatten(tree.a,output);flatten(tree.b,output)
 }
 function expand(raw,items,cfg){
  const bins=[],unplaced=[];
  function cut(bin,rect,axis,split,label){
   const vertical=axis==='x',at=(vertical?rect.x:rect.y)+split+cfg.kerf/2;
   const c={axis:vertical?'vertical':'horizontal',at,
    source:{...rect},label,number:bin.cuts.length+1,
    x1:vertical?at:rect.x,y1:vertical?rect.y:at,
    x2:vertical?at:rect.x+rect.w,y2:vertical?rect.y+rect.h:at};
   bin.cuts.push(c);
   return vertical?
    [{x:rect.x,y:rect.y,w:split,h:rect.h},
     {x:rect.x+split+cfg.kerf,y:rect.y,w:rect.w-split-cfg.kerf,h:rect.h}]:
    [{x:rect.x,y:rect.y,w:rect.w,h:split},
     {x:rect.x,y:rect.y+split+cfg.kerf,w:rect.w,h:rect.h-split-cfg.kerf}]
  }
  function emit(bin,node,rect){
   if(node.leaf){
    bin.placed.push({...node.piece,x:rect.x,y:rect.y,
     w:node.w,h:node.h,rotated:node.rotated});
    return
   }
   const [left,right]=cut(bin,rect,node.axis,
    node.axis==='x'?node.a.w:node.a.h,
    node.a.leaf?node.a.piece.label:'Kesim bloğu');
   emit(bin,node.a,left);emit(bin,node.b,right)
  }
  for(const original of raw.bins){
   const bin={...original,placed:[],cuts:original.cuts.slice()};
   for(const p of original.placed){
    if(!p._block){bin.placed.push(p);continue}
    emit(bin,p._block,{x:p.x,y:p.y,w:p.w,h:p.h})
   }
   bins.push(bin)
  }
  for(const p of raw.unplaced){
   if(!p._block){unplaced.push(p);continue}
   flatten(p._block,unplaced)
  }
  const actualParts=items.length-unplaced.length;
  return {...raw,bins,unplaced,placedCount:actualParts,
   partArea:bins.reduce((sum,b)=>sum+
    b.placed.reduce((s,p)=>s+p.w*p.h,0),0)}
 }
 function createRepair({packAttempt,auditCutPlan,compare,binCost}={}){
  if(typeof packAttempt!=='function'||typeof auditCutPlan!=='function'||
    typeof compare!=='function'||typeof binCost!=='function')
   throw Error('Block repair dependencies missing.');
  function repair(items,stocks,cfg,baseline,{timeBudgetMs=650,maxAttempts=18}={}){
   const started=Date.now(),deadline=started+timeBudgetMs;
   const info={status:'no-improvement',trials:0,candidates:0,
    mergedPieces:0,rescued:0,elapsedMs:0,proof:false};
   let best=baseline;
   if(!items.length||!stocks.length||!baseline.unplaced.length||
      cfg.mode!=='guillotine')return {solution:baseline,info};
   const patternDeadline=Math.min(deadline,started+Math.round(timeBudgetMs*.75));
   const reconstructed=tryWholePatterns(items,stocks,cfg,0,patternDeadline,
    packAttempt,binCost,auditCutPlan,baseline,compare);
   info.patternCandidates=reconstructed.patterns;
   info.fullBlocks=reconstructed.found;
   if(reconstructed.candidate)best=reconstructed.candidate;
   if(!best.unplaced.length){
    info.status='improved';info.rescued=baseline.unplaced.length;
    info.elapsedMs=Date.now()-started;
    return {solution:best,info}
   }
   for(let tr=0;tr<maxAttempts&&Date.now()<deadline;tr++){
    const constructed=build(items,stocks,cfg,tr,deadline);
    info.trials++;
    const reduced=constructed.nodes;
    if(!constructed.merges)continue;
    info.mergedPieces=Math.max(info.mergedPieces,items.length-reduced.length);
    const blockItems=reduced.map((node,index)=>({
     id:'beythaus-block-'+tr+'-'+index,l:node.w,w:node.h,
     t:items[0].t,material:items[0].material,
     category:items[0].category,
     rotate:false,grain:'length',order:node.firstOrder,
     label:'Kesim bloğu',_block:node
    }));
    // Keep stock evaluation and kerf splitting delegated to the existing
    // audited production packing engine rather than duplicating it.
    for(let attempt=0;attempt<4&&Date.now()<deadline;attempt++){
     info.candidates++;
     const raw=packAttempt(blockItems,stocks,cfg,tr*7+attempt);
     const candidate=expand(raw,items,cfg);
     if(!candidate||compare(candidate,best)>=0)continue;
     const audited=auditCutPlan(candidate,{
      parts:items,stocks,kerf:cfg.kerf,trim:cfg.trim
     });
     if(!audited.ok)continue;
     best=candidate;
     info.status='improved';
     if(!best.unplaced.length)break
    }
    if(!best.unplaced.length)break
   }
   info.rescued=Math.max(0,baseline.unplaced.length-best.unplaced.length);
   info.elapsedMs=Date.now()-started;
   if(info.rescued)info.status='improved';
   else if(info.trials===maxAttempts)info.status='completed';
   else if(Date.now()>=deadline&&!info.rescued)info.status='time-limit';
   return {solution:best,info}
  }
  return Object.freeze({repair});
 }
 const api=Object.freeze({version:1,createRepair});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausGuillotineBlockRepair=api;
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
