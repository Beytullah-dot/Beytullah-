/* Joint area + threshold-stock-capacity lower bounds.
 * Independently constructed physical guillotine witnesses and a separate
 * exhaustive STOCK-MULTISET oracle; the optimizer cannot see either.
 * A completion is proved only when a physical plan reaches a RELAXED LB.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs'),win={};
for(const file of ['engine/material-policy.js','engine/optimality-certificate.js',
 'engine/production-audit.js','engine/cutting-engine.js'])
 vm.runInNewContext(fs.readFileSync(path.join(docs,file),'utf8'),
  {window:win},{filename:file});
const proof=win.BeythausOptimalityCertificate;
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>({mode:'guillotine',priceMode:'panel',kerf:3,trim:2}),
 val:Number,mkey:s=>String(s||'').toLowerCase(),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
const base={material:'panel|oak',category:'panel',t:18,
 rotate:false,grain:'length'};
const big=Array.from({length:4},(_,i)=>({...base,id:'big-'+i,
 label:'B'+i,order:i,l:70,w:70}));
const small=Array.from({length:44},(_,i)=>({...base,id:'small-'+i,
 label:'S'+i,order:4+i,l:20,w:20}));
const stocks=[
 {...base,id:'slender',l:47,w:1000,qty:1,price:40,
  priceUnit:'panel',order:0},
 {...base,id:'square',l:100,w:100,qty:5,price:100,
  priceUnit:'panel',order:1}
];
const data={parts:[...big,...small],stocks,trim:2,kerf:3,m3:25000};
const [slender,square]=stocks;
const demand=data.parts.reduce((s,p)=>s+p.l*p.w,0);
assert.equal(demand,37200);
// Oracle enumerates BOTH resource inequalities for every size threshold
// without importing the solver or any of its stock-cover implementation.
function oracle(parts,stocks,objective){
 const area=parts.reduce((sum,p)=>sum+p.l*p.w,0);
 const thresholds=[...new Set(parts.map(p=>Math.min(p.l,p.w)))];
 let best=Infinity;
 function visit(i,qty,score){
  if(i===stocks.length){
   const supply=stocks.reduce((sum,s,j)=>sum+qty[j]*
    Math.max(0,s.l-4)*Math.max(0,s.w-4),0);
   if(supply+1e-7<area)return;
   for(const edge of thresholds){
    const need=parts.filter(p=>Math.min(p.l,p.w)>=edge).length;
    const capacity=stocks.reduce((sum,s,j)=>{
     const W=s.l-4,H=s.w-4;
     const slots=W>0&&H>0?Math.floor((W+3)/(edge+3))*
      Math.floor((H+3)/(edge+3)):0;
     return sum+qty[j]*slots
    },0);
    if(capacity<need)return;
   }
   best=Math.min(best,score);
   return
  }
  const s=stocks[i],unit=objective==='area'?s.l*s.w:
   objective==='count'?1:s.price;
  for(let q=0;q<=s.qty;q++)visit(i+1,[...qty,q],score+q*unit)
 }
 visit(0,[],0);
 return best
}
assert.equal(oracle(data.parts,stocks,'cost'),440);
assert.equal(oracle(data.parts,stocks,'area'),50000);
const plainCost=proof.cover(stocks,demand,{objective:'cost',trim:2});
const plainArea=proof.cover(stocks,demand,{objective:'area',trim:2});
const sepCost=proof.thresholdCardinalityCover(data.parts,stocks,2,3,
 {objective:'cost',priceMode:'panel',maxMs:1000});
const sepArea=proof.thresholdCardinalityCover(data.parts,stocks,2,3,
 {objective:'area',priceMode:'panel',maxMs:1000});
assert.equal(plainCost.lowerBound,40);
assert.equal(plainArea.lowerBound,47000);
assert.equal(sepCost.lowerBound,400);
assert.equal(sepArea.lowerBound,40000);
function paired(objective){
 return proof.pairedAreaCardinalityCover(data.parts,stocks,2,3,
  {objective,priceMode:'panel',maxMs:1000,maxStates:12000})
}
const costBound=paired('cost'),areaBound=paired('area');
assert.equal(costBound.status,'optimal-relaxation');
assert.equal(areaBound.status,'optimal-relaxation');
assert.equal(costBound.lowerBound,oracle(data.parts,stocks,'cost'));
assert.equal(areaBound.lowerBound,oracle(data.parts,stocks,'area'));
// A fully manual, edge-to-edge guillotine witness. The generator records
// the exact working subrectangle for each split; the production auditor
// reconstructs and verifies the cut tree independently.
function builder(stock){
 const bin={stock,placed:[],cuts:[],free:[]},k=3;
 const leaves=[{x:2,y:2,w:stock.l-4,h:stock.w-4}];
 const same=(a,b)=>a.x===b.x&&a.y===b.y&&a.w===b.w&&a.h===b.h;
 function take(rect){
  const i=leaves.findIndex(r=>same(r,rect));
  assert(i>=0,'Each cut or piece must consume an actual free leaf');
  return leaves.splice(i,1)[0]
 }
 function cut(rect,axis,span){
  const source=take(rect),vertical=axis==='vertical';
  const full=vertical?source.w:source.h,gap=full-span;
  assert(span>0&&gap>=k,'Positive saw kerf requires enough room');
  const at=(vertical?source.x:source.y)+span+k/2;
  bin.cuts.push({axis,at,source:{...source},
   number:bin.cuts.length+1,label:'Independent full-edge cut',
   x1:vertical?at:source.x,y1:vertical?source.y:at,
   x2:vertical?at:source.x+source.w,
   y2:vertical?source.y+source.h:at});
  const first=vertical?{...source,w:span}:{...source,h:span};
  const rest=vertical?
   {x:source.x+span+k,y:source.y,w:gap-k,h:source.h}:
   {x:source.x,y:source.y+span+k,w:source.w,h:gap-k};
  leaves.push(first);
  if(rest.w>0&&rest.h>0)leaves.push(rest);
  return [first,rest.w>0&&rest.h>0?rest:null]
 }
 function place(rect,p){
  const leaf=take(rect);
  assert.equal(leaf.w,p.l);assert.equal(leaf.h,p.w);
  bin.placed.push({...p,x:leaf.x,y:leaf.y,w:leaf.w,h:leaf.h,
   rotated:false});
 }
 return {bin,root:leaves[0],cut,place,done(){
  bin.free=leaves;
  return bin
 }};
}
function bigOnly(b){
 const x=builder(square),[left]=x.cut(x.root,'vertical',70);
 const [top]=x.cut(left,'horizontal',70);
 x.place(top,b);
 return x.done()
}
function bigSeven(b,pieces){
 assert.equal(pieces.length,7);
 const x=builder(square),[left,right]=x.cut(x.root,'vertical',70);
 const [top,bottom]=x.cut(left,'horizontal',70);
 x.place(top,b);
 let tail=bottom;
 for(let i=0;i<3;i++){
  const [block,rest]=x.cut(tail,'vertical',20);
  const [cell]=x.cut(block,'horizontal',20);
  x.place(cell,pieces[i]);
  tail=rest
 }
 tail=right;
 for(let i=3;i<7;i++){
  const [block,rest]=x.cut(tail,'horizontal',20);
  const [cell]=x.cut(block,'vertical',20);
  x.place(cell,pieces[i]);
  tail=rest
 }
 return x.done()
}
function grid(stock,pieces,columns,rows){
 assert.equal(pieces.length,columns*rows);
 const x=builder(stock);
 let widthTail=x.root,index=0;
 for(let col=0;col<columns;col++){
  const [block,right]=widthTail.w===20?[widthTail,null]:
   x.cut(widthTail,'vertical',20);
  let heightTail=block;
  for(let row=0;row<rows;row++){
   const [cell,down]=x.cut(heightTail,'horizontal',20);
   x.place(cell,pieces[index++]);
   heightTail=down
  }
  widthTail=right
 }
 return x.done()
}
const costBins=[...big.map(bigOnly),grid(slender,small,2,22)];
const areaBins=[
 ...big.map((p,i)=>bigSeven(p,small.slice(7*i,7*(i+1)))),
 grid(square,small.slice(28),4,4)
];
function plan(bins){
 return {bins,unplaced:[],placedCount:data.parts.length,
  partArea:demand,stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  cost:bins.reduce((n,b)=>n+b.stock.price,0),unknownCostBins:0}
}
const cheapest=plan(costBins),smallest=plan(areaBins);
assert.equal(cheapest.cost,440);
assert.equal(cheapest.stockArea,87000);
assert.equal(smallest.cost,500);
assert.equal(smallest.stockArea,50000);
for(const p of [cheapest,smallest]){
 const audit=engine.auditCutPlan(p,data);
 assert.equal(audit.ok,true,'Independent guillotine audit: '+audit.issues);
 assert.equal(audit.checkedParts,48);
}
function certificate(p,objective){
 return proof.certify(p,data,{objective,auditOK:true,priceMode:'panel',
  maxMs:2000,maxStates:30000})
}
const optimumCost=certificate(cheapest,'cost');
const optimumArea=certificate(smallest,'area');
assert.equal(optimumCost.status,'optimal');
assert.equal(optimumCost.lowerBound,440);
assert.equal(optimumCost.gapPercent,0);
assert.equal(optimumCost.method,'paired-area-threshold-cover');
assert.equal(optimumArea.status,'optimal');
assert.equal(optimumArea.lowerBound,50000);
assert.equal(optimumArea.gapPercent,0);
assert.equal(optimumArea.method,'paired-area-threshold-cover');
// Opposite primary objective: valid physical plan, but NOT proven optimal.
const costGap=certificate(smallest,'cost');
const areaGap=certificate(cheapest,'area');
assert.equal(costGap.proven,false);assert.equal(costGap.gap,60);
assert.equal(costGap.gapPercent,12);
assert.equal(areaGap.proven,false);assert.equal(areaGap.gap,37000);
assert(Math.abs(areaGap.gapPercent-100*37000/87000)<1e-10);
// Unknown registered prices override any attractive partial proof.
const noPrice={...data,stocks:[{...slender,price:null},square]};
assert.equal(proof.certify(smallest,noPrice,{objective:'cost',
 auditOK:true,priceMode:'panel'}).status,'unknown-price');
assert.equal(proof.certify(smallest,noPrice,{objective:'area',
 auditOK:true,priceMode:'panel'}).status,'optimal');
const zero=proof.pairedAreaCardinalityCover(data.parts,stocks,2,3,
 {objective:'cost',maxMs:0});
assert.equal(zero.status,'unknown-limit');
assert.equal(zero.lowerBound,null);
const forged=JSON.parse(JSON.stringify(cheapest));
forged.bins[4].cuts[0].y2-=1;
assert.equal(engine.auditCutPlan(forged,data).ok,false);
// Enumeration-only randomized holdout: no cross-objective bounds may exceed
// the independent oracle that enforces ALL threshold requirements jointly.
let randomCount=0;
for(let seed=1;seed<=36;seed++){
 const countBig=1+seed%5,countSmall=5+seed*3%31;
 const pieces=[...Array.from({length:countBig},(_,i)=>({...base,
  id:'b-'+seed+'-'+i,l:70,w:70})),...Array.from({length:countSmall},
  (_,i)=>({...base,id:'s-'+seed+'-'+i,l:20,w:20}))];
 const sampleStocks=[{...slender,qty:1+seed%3,price:15+seed%11},
  {...square,qty:2+seed%8,price:80+seed%23}];
 for(const obj of ['cost','area','count']){
  const oracleLB=oracle(pieces,sampleStocks,obj);
  const bound=proof.pairedAreaCardinalityCover(pieces,sampleStocks,
   2,3,{objective:obj,maxMs:2000,maxStates:10000});
  if(bound.status==='optimal-relaxation'&&Number.isFinite(oracleLB)){
   assert(bound.lowerBound<=oracleLB+1e-7,
    'No unsafe lower bound: seed '+seed+', '+obj);
   randomCount++;
  }
 }
}
console.log('Paired stock-cover oracle PASS: cost 440 vs separate 40/400; area 50000 vs separate 47000/40000; two independently audited objective-specific witnesses; 36 seeded stock-multiset holdouts x3, '+randomCount+' certified comparisons; missing prices and UNKNOWN guarded.');
