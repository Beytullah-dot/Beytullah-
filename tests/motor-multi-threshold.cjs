/* Independent dual-threshold finite-stock oracle and physical guillotine holdouts.
 * Does NOT call the proof solver for reference values or tree construction.
 * Positive kerf and trim throughout; area and registered cost are separate.
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
const material={material:'panel|oak',category:'panel',t:18,
 rotate:false,grain:'length'};
const make=(kind,n,l,w)=>Array.from({length:n},(_,i)=>({
 ...material,id:kind+'-'+i,label:kind+' '+i,order:i,l,w}));
const large=make('L',2,70,70),medium=make('M',15,40,40),
 small=make('S',14,20,20);
const pieces=[...large,...medium,...small];
const stock=(id,l,w,qty,price)=>({...material,id,l,w,qty,price,
 priceUnit:'panel',order:0});
const A=stock('long-medium',50,900,5,61);
const B=stock('large-strip',600,77,1,78);
const C=stock('compact',200,200,4,90);
const stocks=[A,B,C];
const data={parts:pieces,stocks,trim:2,kerf:3,m3:25000};
const areaDemand=pieces.reduce((n,p)=>n+p.l*p.w,0);
assert.equal(areaDemand,39400);
// Exhaustively enumerate bounded stock multisets, recomputing all threshold
// inequalities independently of the production proof module.
function oracle(parts,stockTypes,objective,allThresholds=true){
 const demand=parts.reduce((n,p)=>n+p.l*p.w,0);
 const edges=[...new Set(parts.map(p=>Math.min(p.l,p.w)))];
 let best=Infinity,bestQty=null;
 function scan(i,chosen,score){
  if(i<stockTypes.length){
   const s=stockTypes[i],unit=objective==='area'?s.l*s.w:
    objective==='count'?1:s.price;
   for(let q=0;q<=s.qty;q++)scan(i+1,[...chosen,q],
    score+q*unit);
   return
  }
  const supply=stockTypes.reduce((n,s,j)=>n+chosen[j]*
   Math.max(0,s.l-4)*Math.max(0,s.w-4),0);
  if(supply+1e-7<demand)return;
  for(const edge of edges){
   if(!allThresholds&&edge!==Math.max(...edges))continue;
   const need=parts.filter(p=>Math.min(p.l,p.w)>=edge).length;
   const capacity=stockTypes.reduce((n,s,j)=>{
    const W=s.l-4,H=s.w-4;
    const perStock=W>0&&H>0?
     Math.floor((W+3)/(edge+3))*Math.floor((H+3)/(edge+3)):0;
    return n+chosen[j]*perStock
   },0);
   if(capacity<need)return
  }
  if(score<best){best=score;bestQty=chosen}
 }
 scan(0,[],0);
 return {value:best,qty:bestQty}
}
assert.equal(oracle(pieces,stocks,'cost').value,139);
assert.equal(oracle(pieces,stocks,'area').value,80000);
function bound(objective,p=pieces,s=stocks,maxMs=1500){
 return proof.multipleThresholdAreaCover(p,s,2,3,
  {objective,priceMode:'panel',maxMs,maxStates:10000})
}
for(const objective of ['cost','area','count']){
 const result=bound(objective),expected=oracle(pieces,stocks,objective);
 assert.equal(result.status,'optimal-relaxation',objective+' full proof');
 assert.equal(result.lowerBound,expected.value,objective+' independent oracle');
}
const singleCost=proof.pairedAreaCardinalityCover(pieces,stocks,2,3,
 {objective:'cost',priceMode:'panel',maxMs:1200,maxStates:12000});
const singleArea=proof.pairedAreaCardinalityCover(pieces,stocks,2,3,
 {objective:'area',priceMode:'panel',maxMs:1200,maxStates:12000});
assert(singleCost.lowerBound<139,'Joint 2-threshold cost strictly stronger');
assert(singleArea.lowerBound<80000,'Joint 2-threshold area strictly stronger');
// Independently build literal full-edge cut trees: no optimizer constructs
// either witness. Every saw cut consumes a current leaf, not a free layout.
function builder(stockType){
 const bin={stock:stockType,placed:[],cuts:[],free:[]},kerf=3;
 const leaves=[{x:2,y:2,w:stockType.l-4,h:stockType.w-4}];
 const equal=(a,b)=>a&&b&&a.x===b.x&&a.y===b.y&&
  a.w===b.w&&a.h===b.h;
 function take(rect){
  const i=leaves.findIndex(leaf=>equal(rect,leaf));
  assert(i>=0,'Cannot reuse a consumed cut-tree leaf');
  return leaves.splice(i,1)[0]
 }
 function cut(rect,axis,span){
  const source=take(rect),vertical=axis==='vertical';
  const width=vertical?source.w:source.h;
  assert(span>0&&width-span>=kerf,'Full kerf must fit');
  const at=(vertical?source.x:source.y)+span+kerf/2;
  bin.cuts.push({axis,at,source:{...source},
   number:bin.cuts.length+1,label:'Independent full-edge cut',
   x1:vertical?at:source.x,y1:vertical?source.y:at,
   x2:vertical?at:source.x+source.w,
   y2:vertical?source.y+source.h:at});
  const first=vertical?{...source,w:span}:{...source,h:span};
  const rest=vertical?
   {x:source.x+span+kerf,y:source.y,w:width-span-kerf,h:source.h}:
   {x:source.x,y:source.y+span+kerf,w:source.w,h:width-span-kerf};
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
 function fill(rect,list,columns,rows){
  assert.equal(list.length,columns*rows,'Grid must exactly match demand');
  let next=0,columnTail=rect;
  for(let col=0;col<columns;col++){
   const [strip,right]=columnTail.w===list[0].l?
    [columnTail,null]:cut(columnTail,'vertical',list[0].l);
   let rowTail=strip;
   for(let row=0;row<rows;row++){
    const [cell,down]=rowTail.h===list[0].w?
     [rowTail,null]:cut(rowTail,'horizontal',list[0].w);
    place(cell,list[next++]);rowTail=down;
   }
   columnTail=right;
  }
 }
 return {root:leaves[0],cut,place,fill,done(){
  bin.free=leaves;
  return bin
 }}
}
const a=builder(A);
const [mediumZone,smallZone]=a.cut(a.root,'horizontal',645);
a.fill(mediumZone,medium,1,15);
a.fill(smallZone,small,2,7);
const b=builder(B);
const [largeZone]=b.cut(b.root,'horizontal',70);
b.fill(largeZone,large,2,1);
const costBins=[a.done(),b.done()];
const c1=builder(C),c2=builder(C);
const [firstThreeColumns,lastColumn]=c1.cut(c1.root,'vertical',126);
c1.fill(firstThreeColumns,medium.slice(0,12),3,4);
c1.fill(lastColumn,medium.slice(12),1,3);
const [largeC,smallC]=c2.cut(c2.root,'horizontal',70);
c2.fill(largeC,large,2,1);
c2.fill(smallC,small,7,2);
const areaBins=[c1.done(),c2.done()];
function plan(bins){
 return {bins,unplaced:[],placedCount:pieces.length,partArea:areaDemand,
  stockArea:bins.reduce((n,b)=>n+b.stock.l*b.stock.w,0),
  cost:bins.reduce((n,b)=>n+b.stock.price,0),
  unknownCostBins:0}
}
const costPlan=plan(costBins),areaPlan=plan(areaBins);
assert.equal(costPlan.cost,139);
assert.equal(costPlan.stockArea,91200);
assert.equal(areaPlan.stockArea,80000);
assert.equal(areaPlan.cost,180);
for(const p of [costPlan,areaPlan]){
 const audit=engine.auditCutPlan(p,data);
 assert.equal(audit.ok,true,'Independent cut-tree audit: '+audit.issues);
 assert.equal(audit.checkedParts,31)
}
const options=objective=>({objective,auditOK:true,priceMode:'panel',
 maxStates:20000,maxMs:2000});
const costProof=proof.certify(costPlan,data,options('cost'));
const areaProof=proof.certify(areaPlan,data,options('area'));
assert.equal(costProof.status,'optimal');
assert.equal(costProof.lowerBound,139);
assert.equal(costProof.method,'multi-threshold-area-cover');
assert.equal(areaProof.status,'optimal');
assert.equal(areaProof.lowerBound,80000);
assert.equal(areaProof.method,'multi-threshold-area-cover');
const wrongObjectiveCost=proof.certify(areaPlan,data,options('cost'));
const wrongObjectiveArea=proof.certify(costPlan,data,options('area'));
assert.equal(wrongObjectiveCost.proven,false);
assert.equal(wrongObjectiveCost.gap,41);
assert.equal(wrongObjectiveArea.proven,false);
assert.equal(wrongObjectiveArea.gap,11200);
const unknownPrice={...data,stocks:[{...A,price:null},B,C]};
assert.equal(proof.certify(areaPlan,unknownPrice,options('cost')).status,
 'unknown-price');
const limited=bound('cost',pieces,stocks,0);
assert.equal(limited.status,'unknown-limit');
assert.equal(limited.lowerBound,null);
const falsified=JSON.parse(JSON.stringify(costPlan));
falsified.bins[0].cuts[0].x2-=1;
assert.equal(engine.auditCutPlan(falsified,data).ok,false,
 'Truncated cut must not be promoted into a feasible witness');
// Larger independent HOLDOUT: six stock dimensions and prices, four
// heterogeneous part size classes; all exact references use only brute force.
let compared=0,unknowns=0,total=0;
for(let seed=1;seed<=64;seed++){
 const counts=[1+seed%5,3+seed%9,4+(seed*3)%17,5+(seed*7)%23];
 const specs=[[70+seed%4,70],[48,40+seed%3],
  [30+seed%5,30],[20,20+seed%4]];
 const varied=specs.flatMap(([l,w],i)=>make('H'+seed+'-'+i,
  counts[i],l,w));
 const optionsStocks=[
  stock('X'+seed+'a',50+seed%7,900,1+seed%3,30+seed%17),
  stock('X'+seed+'b',600,77+seed%6,1+seed%2,60+seed%13),
  stock('X'+seed+'c',200,200,1+seed%3,80+seed%21),
  stock('X'+seed+'d',120+seed%11,300,1+seed%3,75+seed%16),
  stock('X'+seed+'e',300,150+seed%9,1+seed%2,87+seed%15),
  stock('X'+seed+'f',95+seed%7,500,1+seed%2,65+seed%20)
 ];
 for(const objective of ['cost','area','count']){
  const exact=oracle(varied,optionsStocks,objective);
  const candidate=bound(objective,varied,optionsStocks,500);
  total++;
  if(candidate.status==='optimal-relaxation'&&
     Number.isFinite(exact.value)){
   assert(candidate.lowerBound<=exact.value+1e-7,
    'No lower bound may exceed all-threshold oracle: '+seed+' '+objective);
   compared++;
  }else unknowns++;
 }
}
assert(compared>60,'Holdout must have enough comparable finished proofs');
console.log('Dual-threshold cover PASS: 31-part audited objective-specific witnesses, cost LB 139 vs single-threshold '+singleCost.lowerBound+', area LB 80000 vs '+singleArea.lowerBound+', gaps 41 TL / 11200 mm2; 64 seeded six-stock holdouts, '+compared+'/'+total+' comparable bounds, '+unknowns+' incomplete; no unsafe overbound.');
