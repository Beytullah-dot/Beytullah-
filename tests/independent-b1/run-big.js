'use strict';
/* Emulates the real UI pipeline (index.html: run() -> startConstructiveWorker -> showResult/certify ->
 * startExactWorker('solve') -> launchEconomyAfterCount('economy')) and compares EVERY claim with the oracle. */
const L=require('./lib.js'),GB=require('./gen-big.js'),PO=require('./pareto.js'),fs=require('fs');
const [,, famArg='generic', seed0s='1000', countS='200', outFile]=process.argv;
const seed0=+seed0s,count=+countS;
const {window,engine}=L.loadEngine();
const CERT=window.BeythausOptimalityCertificate;
const clone=o=>JSON.parse(JSON.stringify(o));
const objMap={area:'area',cost:'economic'};
const S={n:0,uiComplete:{area:0,cost:0},oracleFeasStrict:0,oracleFeasRelaxed:0,
  missedByEngineOnly:{strict:0,relaxed:0},rescuedByConstructive:0,missedAfterUI:{strict:0,relaxed:0},invalid:0,
  claimsCount:0,claimsArea:0,claimsCost:0,workerCountOptimal:0,workerAreaOptimal:0,workerCostOptimal:0,
  falseOptimal:[],falseOptimalRelaxedOnly:[],workerInvalidLayouts:0,suboptAfterUI:{area:0,cost:0},suboptRelaxed:{area:0,cost:0},unknownWhereOracleFeasible:{count:0,area:0,cost:0},exceptions:0};
const out=[],t0=Date.now();
const solveW=L.loadWorker('optimization-worker.js',null);
const consW=L.loadWorker('constructive-worker.js',null);
function toBins(layout,data){
  return layout.map(b=>{const x=engine.mkBin(b.stock,data.trim);
    x.placed=b.pieces.map(p=>({...data.parts.find(t=>t.id===p.id),x:p.x,y:p.y,w:p.w,h:p.h,rotated:p.rotated}));
    x.cuts=b.cuts||[];x.free=b.free||[];return x});
}
for(let i=0;i<count;i++){
  const seed=seed0+i,data=GB.big(seed,{K:famArg==='k1'?1:famArg==='k2'?2:famArg==='k3'?3:0,grain:famArg==='grain'});
  S.n++;
  const to0=Date.now();const rel=PO.solve(data,{sliver:'relaxed'}),str=PO.solve(data,{sliver:'strict'});S.oracleMs=(S.oracleMs||0)+Date.now()-to0;
  if(str.feasible)S.oracleFeasStrict++;if(rel.feasible)S.oracleFeasRelaxed++;
  for(const obj of ['area','cost']){
   try{
    let plan=engine.optimize(clone(data),true,false,objMap[obj]);
    let v=L.verifyPlan(data,plan);
    if(!v.ok){S.invalid++;out.push({seed,fam:famArg,obj,kind:'invalid-plan',err:v.errors.slice(0,3)});continue}
    if(!v.complete){
      if(str.feasible)S.missedByEngineOnly.strict++;else if(rel.feasible)S.missedByEngineOnly.relaxed++;
      consW.messages.length=0;
      consW.onmessage({data:{type:'construct',requestId:1,mode:'guillotine',objective:obj,priceMode:'panel',m3:null,data:{parts:data.parts,stocks:data.stocks,kerf:data.kerf,trim:data.trim}}});
      const r=consW.result;
      if(r&&r.status==='feasible-uncertified'&&r.plan){
        const vv=L.verifyPlan(data,r.plan);
        if(!vv.ok||!vv.complete){S.invalid++;out.push({seed,fam:famArg,obj,kind:'constructive-invalid',err:vv.errors.slice(0,3)});}
        else{plan=r.plan;v=vv;S.rescuedByConstructive++}
      }
      if(!v.complete){
        if(str.feasible){S.missedAfterUI.strict++;out.push({seed,fam:famArg,obj,kind:'missed-after-full-UI-flow-strict',cw:r&&r.status})}
        else if(rel.feasible){S.missedAfterUI.relaxed++;}
        continue;
      }
    }
    S.uiComplete[obj]++;let proofAny=false;
    let val=obj==='area'?v.area:v.cost;
    if(str[obj]!==null&&str[obj]!==undefined&&val>str[obj]+1e-9)S.suboptAfterUI[obj]++;
    if(rel[obj]!==null&&rel[obj]!==undefined&&val>rel[obj]+1e-9)S.suboptRelaxed[obj]++;
    const audit=engine.auditCutPlan(plan,data);
    plan.stockProof=engine.certifyStockCount(plan,data,audit);
    // ---- claims 1: certificate.certify for each of the three objectives
    for(const o2 of ['count','area','cost']){
      const c=CERT.certify(plan,clone(data),{objective:o2,auditOK:true,priceMode:'panel',m3:25000,maxMs:2500,maxStates:120000,allowMaterialAssignment:false});
      if(!c.proven)continue;
      const inc=o2==='count'?v.count:o2==='area'?v.area:v.cost;
      S['claims'+o2[0].toUpperCase()+o2.slice(1)]++;if(o2===(obj==='area'?'area':'cost'))proofAny=true;
      const rec={seed,fam:famArg,uiObj:obj,claim:o2,claimed:inc,oracleStrict:str[o2],oracleRelaxed:rel[o2],method:c.method,src:'certificate'};
      if(str[o2]!==null&&str[o2]!==undefined&&inc>str[o2]+1e-9)S.falseOptimal.push(rec);
      else if(rel[o2]!==null&&rel[o2]!==undefined&&inc>rel[o2]+1e-9)S.falseOptimalRelaxedOnly.push(rec);
    }
    // ---- claims 2: exact count worker (what the UI shows as 'Minimum stok sayısı kanıtlandı')
    solveW.messages.length=0;
    solveW.onmessage({data:{type:'solve',requestId:2,mode:'guillotine',data:{parts:data.parts,stocks:data.stocks,kerf:data.kerf,trim:data.trim},
      incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),bounds:plan.stockProof.details||[],timeBudgetMs:3000,maxNodes:300000}});
    const sr=solveW.result;
    if(sr&&sr.status==='optimal'){
      S.workerCountOptimal++;
      const claimed=sr.groups.reduce((a,g)=>a+(g.status==='improved'?g.bestCount:g.initialCount),0);
      if(sr.groups.some(g=>g.status==='improved')){ // verify improved layouts physically
        const bins=[];for(const g of sr.groups){if(g.status==='improved'&&g.layout)bins.push(...toBins(g.layout,data));else bins.push(...plan.bins.filter(b=>L.norm(b.stock.material)===g.material))}
        const p2={bins,unplaced:[]};const vv=L.verifyPlan(data,p2);if(!vv.ok){S.workerInvalidLayouts++;out.push({seed,fam:famArg,kind:'worker-solve-invalid-layout',err:vv.errors.slice(0,3)})}
      }
      const rec={seed,fam:famArg,uiObj:obj,claim:'count',claimed,oracleStrict:str.count,oracleRelaxed:rel.count,src:'solve-worker'};
      if(str.count!==null&&str.count!==undefined&&claimed>str.count)S.falseOptimal.push(rec);
      else if(rel.count!==null&&rel.count!==undefined&&claimed>rel.count)S.falseOptimalRelaxedOnly.push(rec);
    }
    // ---- claims 3: economy worker for the selected objective
    solveW.messages.length=0;
    solveW.onmessage({data:{type:'economy',requestId:3,cutMode:'guillotine',objective:obj,priceMode:'panel',m3:null,data:{parts:data.parts,stocks:data.stocks,kerf:data.kerf,trim:data.trim},
      incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),timeBudgetMs:3000,maxNodes:300000}});
    const er=solveW.result;
    if(er&&er.type==='economy-finished'&&er.status!=='optimal'&&er.groups.some(g=>g.status==='improved'&&g.layout)){
      const bins=[];for(const g of er.groups){if(g.status==='improved'&&g.layout)bins.push(...toBins(g.layout,data));else bins.push(...plan.bins.filter(b=>L.norm(b.stock.material)===g.material))}
      const vv=L.verifyPlan(data,{bins,unplaced:[]});
      if(vv.ok){const nv=obj==='area'?vv.area:vv.cost;if(nv<val-1e-9){val=nv;S.partialImproved=(S.partialImproved||0)+1}}
    }
    if(er&&er.type==='economy-finished'&&er.status==='optimal'){
      obj==='area'?S.workerAreaOptimal++:S.workerCostOptimal++;proofAny=true;
      const key=obj==='area'?'Area':'Cost';
      const claimed=er.groups.reduce((a,g)=>a+(g['best'+key]??g['initial'+key]??0),0);
      const improvedGroups=er.groups.filter(g=>g.status==='improved'&&g.layout);
      if(improvedGroups.length){
        const bins=[];for(const g of er.groups){if(g.status==='improved'&&g.layout)bins.push(...toBins(g.layout,data));else bins.push(...plan.bins.filter(b=>L.norm(b.stock.material)===g.material))}
        const vv=L.verifyPlan(data,{bins,unplaced:[]});
        if(!vv.ok){S.workerInvalidLayouts++;out.push({seed,fam:famArg,kind:'worker-economy-invalid-layout',err:vv.errors.slice(0,3)})}
        else{const real=obj==='area'?vv.area:vv.cost;if(Math.abs(real-claimed)>1e-6)out.push({seed,fam:famArg,kind:'worker-economy-value-mismatch',claimed,real})}
      }
      const rec={seed,fam:famArg,uiObj:obj,claim:obj,claimed,oracleStrict:str[obj],oracleRelaxed:rel[obj],src:'economy-worker'};
      if(str[obj]!==null&&str[obj]!==undefined&&claimed>str[obj]+1e-9)S.falseOptimal.push(rec);
      else if(rel[obj]!==null&&rel[obj]!==undefined&&claimed>rel[obj]+1e-9)S.falseOptimalRelaxedOnly.push(rec);
    }
    {const o=str[obj];const fin=(typeof finalVal==='number')?finalVal:val;S.sel=S.sel||{proven:0,unknownOptimal:0,unknownSubopt:0,gaps:[]};
     if(proofAny)S.sel.proven++;else if(o!==null&&val<=o+1e-9)S.sel.unknownOptimal++;else{out.push({seed,fam:famArg,kind:'unknown-and-suboptimal',obj,value:val,strictOptimum:o,nParts:data.parts.length,types:[...new Set(data.parts.map(p=>p.l+'x'+p.w))].join(','),stocks:data.stocks.map(s=>s.l+'x'+s.w+'q'+s.qty+'p'+s.price).join(','),kerf:data.kerf,trim:data.trim});S.sel.unknownSubopt++;S.sel.gaps.push(+((val-o)/o*100).toFixed(1))}}
   }catch(e){S.exceptions++;out.push({seed,fam:famArg,obj,kind:'exception',msg:String(e.stack||e).slice(0,400)})}
  }
}
S.ms=Date.now()-t0;if(S.sel&&S.sel.gaps.length){const g=S.sel.gaps.sort((a,b)=>a-b);S.sel.gapMedianPct=g[g.length>>1];S.sel.gapMaxPct=g.at(-1);S.sel.gaps=g.length}
console.log(JSON.stringify({fam:famArg,seed0,...S,falseOptimal:S.falseOptimal.length,falseOptimalRelaxedOnly:S.falseOptimalRelaxedOnly.length}));
if(S.falseOptimal.length)console.log('FALSE-OPTIMAL (vs strict engine model):',JSON.stringify(S.falseOptimal.slice(0,6)));
if(S.falseOptimalRelaxedOnly.length)console.log('false-optimal only vs relaxed:',JSON.stringify(S.falseOptimalRelaxedOnly.slice(0,4)));
if(outFile)fs.writeFileSync(outFile,out.concat(S.falseOptimal.map(x=>({kind:'false-optimal',...x})),S.falseOptimalRelaxedOnly.map(x=>({kind:'false-optimal-relaxed',...x}))).map(x=>JSON.stringify(x)).join('\n'));
