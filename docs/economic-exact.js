/* Beythaus Cut — bounded exact incremental stock acquisition-cost search.
   Supports independent gross stock area and acquisition cost objectives.
   For a fixed parts list, minimum gross area is minimum gross waste.
   Enumerates ALL material-compatible stock multisets cheaper than incumbent;
   every candidate is checked using the mode-specific exhaustive geometry
   search. Any interrupted comparison => partial, never cost-optimal proof.
   No use of hypothetical salvage resale values. */
'use strict';
const EconomicExact=(()=>{
 const EPS=1e-6, canon=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
 const price=(s,cfg)=>{
  if(typeof BeythausMaterialPolicy!=='undefined')return BeythausMaterialPolicy.stockPrice(s,cfg);
  if(s.isRemnant)return 0;
  if(cfg.priceMode==='panel')return Number.isFinite(s.price)&&s.price>0?s.price:null;
  if(cfg.priceMode==='m3')
   return s.t!==null&&Number.isFinite(s.t)&&s.t>0&&
    Number.isFinite(cfg.m3)&&cfg.m3>0?s.l*s.w*s.t/1e9*cfg.m3:null;
  return null
 };
 function solve(job,geometry){
  const now=Date.now,started=now(),maxTime=Math.min(6000,Math.max(300,job.timeBudgetMs||2500));
  const deadline=started+maxTime,maxNodes=Math.min(400000,Math.max(2000,job.maxNodes||180000));
  const budget={nodes:0,limit:false};
  const finish=(status,groups,reason='')=>({
   type:'economy-finished',requestId:job.requestId,status,groups,reason,
   objective:job.objective==='area'?'area':'cost',
   nodes:budget.nodes,elapsedMs:now()-started,mode:job.cutMode
  });
  const objective=job.objective==='area'?'area':'cost';
  const data=job.data;
  if(!data||!Array.isArray(data.parts)||!Array.isArray(data.stocks)||
    !Array.isArray(job.incumbentBins)||!['nest','guillotine'].includes(job.cutMode)||
    !['panel','m3'].includes(job.priceMode))return finish('skipped',[],'Eksik ya da geçersiz ekonomi girdileri.');
  if(typeof geometry!=='function')return finish('skipped',[],'Kesin geometri çözümleyicisi bulunamadı.');
  const groupParts=new Map(),stockByID=new Map(data.stocks.map(s=>[s.id,s]));
  for(const part of data.parts){
   const key=canon(part.material);
   if(!groupParts.has(key))groupParts.set(key,[]);
   groupParts.get(key).push(part)
  }
  const cfg={trim:data.trim,kerf:data.kerf,priceMode:job.priceMode,m3:job.m3};
  const groups=[],partLimit=job.cutMode==='guillotine'?10:13;
  let allProven=true;
  for(const [material,parts] of groupParts){
   const g={material,status:'skipped',proven:false,initialCost:null,bestCost:null,
    initialArea:null,bestArea:null,
    initialCount:0,bestCount:0,checked:0,nodes:0,combinations:0,layout:null};
   groups.push(g);
   const stocks=data.stocks.filter(s=>s.qty>0&&canon(s.material)===material);
   const incumbent=job.incumbentBins.filter(b=>canon(b.material)===material);
   g.initialCount=g.bestCount=incumbent.length;
   const unit=s=>objective==='area'?s.l*s.w:price(s,cfg);
   const currentCosts=incumbent.map(b=>stockByID.get(b.stockId))
    .map(s=>s?unit(s):null);
   const prices=stocks.map(unit);
   if(!incumbent.length||parts.length>partLimit||stocks.length>3||
     incumbent.length>7){
    g.status='scope-limited';allProven=false;continue
   }
   // Missing prices are not zero. Never certify cost while even one stock
   // option remains unpriced or the incumbent cannot be priced.
   if(prices.some(v=>v===null)||currentCosts.some(v=>v===null)){
    g.status='unknown-price';allProven=false;continue
   }
   let bestCost=currentCosts.reduce((a,b)=>a+b,0);
   if(objective==='area')g.initialArea=g.bestArea=bestCost;
   else g.initialCost=g.bestCost=bestCost;
   const actualCost=list=>list.reduce((sum,b)=>sum+unit(b.stock),0);
   const needed=parts.reduce((sum,p)=>sum+p.l*p.w,0);
   // A cheaper solution may require MORE boards than the incumbent.
   // Capping here at 7 would produce an unsound cost-optimality certificate.
   // Any complete packing uses at most one nonempty board per piece.
   const maxBoards=Math.min(parts.length,stocks.reduce((sum,s)=>sum+s.qty,0));
   const combinations=[],selection=new Array(stocks.length).fill(0);
   // Exhaustively enumerate finite stock quantities. A cap is an UNKNOWN,
   // not a proof: we only keep combinations below the incumbent cost.
   let enumerated=0,truncated=false;
   function enumerate(i,count,cost,area){
    if(truncated)return;
    if(i===stocks.length){
     if(!count||area+EPS<needed||cost>=bestCost-EPS)return;
     enumerated++;
     if(enumerated>200){truncated=true;return}
     combinations.push({quantities:selection.slice(),count,cost});
     return
    }
    const s=stocks[i],unit=prices[i],W=Math.max(0,s.l-2*cfg.trim),H=Math.max(0,s.w-2*cfg.trim);
    for(let qty=0;qty<=Math.min(s.qty,maxBoards-count);qty++){
     const next=cost+qty*unit;
     if(next>=bestCost-EPS)break;
     selection[i]=qty;
     enumerate(i+1,count+qty,next,area+qty*W*H);
     if(truncated)break
    }
    selection[i]=0
   }
   // With an incumbent price of zero, the objective is already optimal
   // because no stock has negative acquisition price.
   if(bestCost<=EPS){g.status='zero-objective-bound';g.proven=true;continue}
   enumerate(0,0,0,0);
   g.combinations=enumerated;
   if(truncated){g.status='enumeration-limit';allProven=false;continue}
   combinations.sort((a,b)=>a.cost-b.cost||a.count-b.count);
   let uncertain=false;
   for(const c of combinations){
    if(c.cost>=bestCost-EPS)break;
    if(now()>=deadline||budget.nodes>=maxNodes){g.status='limit';uncertain=true;break}
    const available=stocks.map((s,i)=>({...s,qty:c.quantities[i]}))
     .filter(s=>s.qty>0);
    const answer=geometry(parts,available,c.count,cfg,deadline,maxNodes-budget.nodes);
    budget.nodes+=answer.nodes;g.nodes+=answer.nodes;g.checked++;
    if(answer.status==='infeasible')continue;
    if(answer.status==='unknown'||answer.status==='limit'){
     uncertain=true;g.status='limit';break
    }
    if(answer.status!=='feasible'||!Array.isArray(answer.layout)){
     uncertain=true;g.status='invalid-result';break
    }
    const cost=actualCost(answer.layout);
    if(!Number.isFinite(cost)||cost>c.cost+EPS){
     uncertain=true;g.status='invalid-result';break
    }
    if(cost<bestCost-EPS){
     bestCost=cost;
     if(objective==='area')g.bestArea=cost;
     else g.bestCost=cost;
     g.bestCount=answer.layout.length;
     g.layout=answer.layout;g.status='improved'
    }
    // Every cheaper candidate was sorted before the current one, so
    // a found feasible positive-price candidate with no uncertainty is
    // optimal for this material within the exhaustive search model.
    break
   }
   if(!uncertain){
    g.proven=true;
    if(g.status==='skipped')g.status='proved'
   }else allProven=false
  }
  return finish(allProven?'optimal':'partial',groups)
 }
 return {solve,price}
})();
if(typeof self!=='undefined')self.EconomicExact=EconomicExact;
