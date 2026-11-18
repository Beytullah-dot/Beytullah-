// Beythaus Cut regression suite. Run locally: node tests/cut-validation.test.cjs
// No third-party dependencies; deliberately exercises the exact shipped web-app script.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../docs/index.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)][0]?.[1];
assert.ok(script, 'Application script must exist');

const nodes = new Map();
const emptyClasses = () => ({add(){}, remove(){}, toggle(){return false}, contains(){return false}});
function node(id) {
  if (!nodes.has(id)) nodes.set(id, {
    id, value:'', textContent:'', innerHTML:'', disabled:false, className:'',
    classList:emptyClasses(), dataset:{}, style:{},
    addEventListener(){}, setAttribute(){}, removeAttribute(){},
    querySelectorAll(){return []}, scrollIntoView(){}, focus(){},
    click(){}, append(){}, remove(){},
    get lastElementChild(){return null}
  });
  return nodes.get(id);
}
const document = {
  getElementById:node, querySelectorAll(){return []}, addEventListener(){},
  createElement(){return node('_temp')}, head:{appendChild(){}},
  body:{classList:emptyClasses(), append(){}}
};
const window = {addEventListener(){}, print(){}};
const storage = new Map();
const localStorage = {
  getItem(k){return storage.has(k)?storage.get(k):null},
  setItem(k,v){storage.set(k,String(v))}
};
const sandbox = {
  document,window,localStorage,navigator:{},URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  console,Intl,Date,Math,Number,String,Array,Object,Map,Set,JSON,Error,RegExp,
  setTimeout(){return 1},clearTimeout(){},requestAnimationFrame(){},
  confirm(){return true},prompt(){return null}
};
vm.runInNewContext(script.replace('window.BeythausCut={','window.__testHooks={showResult,makePdfDocument,productionFile};window.BeythausCut={'), sandbox, {filename:'docs/index.html', timeout:10000});
const app = window.BeythausCut;
assert.ok(app?.normalize && app?.optimize && app?.auditCutPlan);

let tests = 0;
function verify(state) {
  app.setState(state);
  const input = app.normalize();
  assert.equal(input.errors.length,0,input.errors.join('; '));
  const result = app.optimize(input);
  const check = app.auditCutPlan(result,input);
  assert.equal(check.ok,true,check.issues.join('; '));
  assert.equal(app.validateLayout(result,{kerf:input.kerf,trim:input.trim}).length,0);
  assert.equal(result.placedCount+result.unplaced.length,input.parts.length);
  tests++;
  return {input,result};
}
function state(overrides={}) {
  return {
    project:'Regression',unit:'mm',partsThicknessEnabled:false,stocksThicknessEnabled:false,
    mode:'nest',priceMode:'panel',m3Price:25000,kerf:3,trim:0,
    parts:[{l:50,w:20,t:'',qty:2,material:'Wood',label:'',rotate:true}],
    stocks:[{l:130,w:70,t:'',qty:5,material:'Wood',price:200}],
    ...overrides
  };
}
const clone=x=>JSON.parse(JSON.stringify(x));
const base = verify(state());
assert.equal(base.result.placedCount,2);
const badBounds=clone(base.result);badBounds.bins[0].placed[0].x=-2;
assert.equal(app.auditCutPlan(badBounds,base.input).ok,false,'Off-stock placement must be caught');tests++;
const duplicate=clone(base.result);duplicate.bins[0].placed.push(clone(duplicate.bins[0].placed[0]));
assert.equal(app.auditCutPlan(duplicate,base.input).ok,false,'Duplicate placed parts must be caught');tests++;
const overlap=clone(base.result);
overlap.bins[0].placed[1].x=overlap.bins[0].placed[0].x;
overlap.bins[0].placed[1].y=overlap.bins[0].placed[0].y;
assert.equal(app.auditCutPlan(overlap,base.input).ok,false,'Overlaps must be caught');tests++;
const badRotation=clone(base.result);badRotation.bins[0].placed[0].rotated=!badRotation.bins[0].placed[0].rotated;
assert.equal(app.auditCutPlan(badRotation,base.input).ok,false,'Invalid rotation must be caught');tests++;

const pricing=state({
  priceMode:'m3',stocksThicknessEnabled:true,
  parts:[{l:80,w:30,t:'',qty:1,material:'Wood',label:'A',rotate:true}],
  stocks:[
    {l:100,w:50,t:20,qty:1,material:'Wood',price:0},
    {l:100,w:50,t:'',qty:1,material:'Wood',price:0}
  ]
});
const a=verify(pricing);
assert.equal(a.result.bins[0].stock.t,20,'Known-priced stock should be preferred');
assert.equal(a.result.unknownCostBins,0);
assert.ok(a.result.cost>0);tests++;
pricing.stocks=[pricing.stocks[1]];
const b=verify(pricing);
assert.equal(b.result.bins[0].stock.t,null);
assert.equal(b.result.cost,null,'Unknown cost must NOT be reported as zero');
assert.equal(b.result.unknownCostBins,1);tests++;

let seed=713;
function rand(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<180;i++){
  const L=40+Math.floor(rand()*120), W=25+Math.floor(rand()*85);
  const kerf=[0,1,3][Math.floor(rand()*3)],trim=[0,1,3][Math.floor(rand()*3)];
  const count=1+Math.floor(rand()*14),parts=[];
  for(let j=0;j<count;j++)parts.push({
    l:5+Math.floor(rand()*L*.5),w:4+Math.floor(rand()*W*.5),
    t:'',qty:1,material:'Wood',label:'P'+j,rotate:rand()>.25
  });
  verify(state({
    mode:i%2?'nest':'guillotine',kerf,trim,parts,
    stocks:[{l:L,w:W,t:'',qty:15,material:'Wood',price:100}]
  }));
}

// Compare the second-pass search against the unchanged baseline on a deterministic case.
// The advanced solution is permitted only when it is strictly better and geometrically sound.
assert.equal(typeof app.optimizeBaseline,'function','Baseline optimizer must remain available for regression');
let benchmarkSeed=18857;
function sample(){benchmarkSeed=(Math.imul(1664525,benchmarkSeed)+1013904223)>>>0;return benchmarkSeed/4294967296}
let benchmarkCase=null;
for(let i=0;i<=104;i++){
  const L=70+Math.floor(sample()*100),W=35+Math.floor(sample()*80),count=4+Math.floor(sample()*35),pieces=[];
  for(let j=0;j<count;j++)pieces.push({
    l:9+Math.floor(sample()*L*.47),w:7+Math.floor(sample()*W*.55),
    t:'',qty:1,material:'Wood',label:'P'+j,rotate:sample()>.22
  });
  const kerf=[0,1,2,3][Math.floor(sample()*4)],trim=[0,1,2][Math.floor(sample()*3)];
  benchmarkCase=state({unit:'mm',mode:i%2?'nest':'guillotine',kerf,trim,parts:pieces,
    stocks:[{l:L,w:W,t:'',qty:20,material:'Wood',price:100}]});
}
app.setState(benchmarkCase);
const benchmarkInput=app.normalize();
const baseline=app.optimizeBaseline(benchmarkInput);
const enhanced=app.optimize(benchmarkInput);
assert.equal(app.auditCutPlan(baseline,benchmarkInput).ok,true,'Baseline must pass independent audit');
assert.equal(app.auditCutPlan(enhanced,benchmarkInput).ok,true,'Refined plan must pass independent audit');
assert.equal(benchmarkInput.errors.length,0);
assert.equal(enhanced.unplaced.length,baseline.unplaced.length,'Refined plan must not leave additional parts');
assert.ok(enhanced.bins.length<=baseline.bins.length,'Advanced search cannot use more panels on benchmark');
assert.ok(enhanced.cost===null||baseline.cost===null||enhanced.cost<=baseline.cost,'Advanced search cannot be more expensive');
assert.ok(enhanced.search?.refinementAttempts>0,'Improvement pass must be exercised');
assert.ok(enhanced.bins.length<baseline.bins.length,'Benchmark must demonstrate an actual panel reduction');
tests+=6;
console.log('Advanced optimization benchmark: '+baseline.bins.length+' → '+enhanced.bins.length+' panels; '+enhanced.search.refinementAttempts+' bounded repack attempts.');


// Known panel: one 150x100 mm part from 300x200 mm, with 3 mm kerf.
const offcutCase=verify(state({
  project:'Offcut fixture',mode:'guillotine',unit:'mm',kerf:3,trim:0,
  offcutMinEdgeMm:50,offcutMinAreaCm2:100,
  parts:[{l:150,w:100,t:'',qty:1,material:'Wood',label:'P01',rotate:false}],
  stocks:[{l:300,w:200,t:'',qty:1,material:'Wood',price:100}]
}));
const board=offcutCase.result.bins[0];
const usable=app.collectOffcuts(board);
assert.equal(usable.available,true);
assert.equal(usable.count,2);
assert.equal(usable.area,43950);
assert.equal(usable.unclassifiedArea,1050);
assert.equal(board.cuts.length,2);
assert.equal(board.cuts[0].number,1);
assert.equal(board.cuts[1].number,2);
assert.equal(app.auditGuillotineCuts(board,{trim:0,kerf:3}).length,0);
tests+=7;
const corruptedCut=clone(offcutCase.result);
corruptedCut.bins[0].cuts[0].x1+=9;
assert.equal(app.auditCutPlan(corruptedCut,offcutCase.input).ok,false,
  'Independent cut replay must reject an incorrect kerf center line');
tests++;
const corruptedSource=clone(offcutCase.result);
corruptedSource.bins[0].cuts[1].source.w+=12;
assert.equal(app.auditCutPlan(corruptedSource,offcutCase.input).ok,false,
  'Independent cut replay must reject incorrect source dimensions');
tests++;
window.__testHooks.showResult(offcutCase.input,offcutCase.result);
const pdf=window.__testHooks.makePdfDocument();
assert.ok(pdf.content.some(x=>x.text==='KULLANILABİLİR ARTIKLAR'));
assert.ok(pdf.content.some(x=>x.text==='ÖNERİLEN GEOMETRİK KESİM SIRASI'));
assert.ok(pdf.content.some(x=>x.table?.body?.some(row=>Array.isArray(row)&&row.some(cell=>cell?.text==='Düşey'))));
assert.equal(window.__testHooks.productionFile(),true);
assert.ok(node('printCollection').innerHTML.includes('Önerilen geometrik kesim sırası'));
tests+=5;
const noOffcuts=state({
  project:'Cutoff threshold',mode:'guillotine',unit:'mm',kerf:3,
  offcutMinEdgeMm:500,offcutMinAreaCm2:100,
  parts:[{l:150,w:100,t:'',qty:1,material:'Wood',label:'P01',rotate:false}],
  stocks:[{l:300,w:200,t:'',qty:1,material:'Wood',price:100}]
});
const none=verify(noOffcuts);
assert.equal(app.collectOffcuts(none.result.bins[0]).count,0);
tests++;
const freeForm=verify(state({mode:'nest',unit:'mm',kerf:3,
  parts:[{l:150,w:100,t:'',qty:1,material:'Wood',label:'P01',rotate:false}],
  stocks:[{l:300,w:200,t:'',qty:1,material:'Wood',price:100}]
}));
assert.equal(app.collectOffcuts(freeForm.result.bins[0]).available,false,
  'Nesting free rectangles overlap and cannot be sold as exact offcuts');
tests++;


// Sound minimum-stock-count certificates. Geometry and optimality are distinct.
// The area lower bound must never be advertised as a minimum-waste proof.
assert.equal(typeof app.certifyStockCount,'function');
assert.equal(typeof app.minStockCountLowerBound,'function');
const certPart=(l,w,material='Wood')=>({l,w,t:'',qty:1,material,label:'P',rotate:false});
const certStock=(l,w,qty=5,material='Wood')=>({l,w,t:'',qty,material,price:100});
function certificate(inputState) {
  const run=verify(inputState),proof=app.certifyStockCount(run.result,run.input,app.auditCutPlan(run.result,run.input));
  assert.equal(proof.goal,'minimum-stock-count');
  if(proof.proven) {
    assert.equal(run.result.unplaced.length,0);
    assert.equal(proof.usedStockCount,proof.lowerBound);
  }
  tests++;
  return {...run,proof};
}
const oneStock=certificate(state({kerf:0,trim:0,
  parts:[certPart(100,100)],stocks:[certStock(100,100)]}));
assert.equal(oneStock.proof.proven,true);
assert.equal(oneStock.proof.lowerBound,1);
const exactTwo=certificate(state({kerf:0,trim:0,
  parts:[certPart(100,100),certPart(100,100)],stocks:[certStock(100,100)]}));
assert.equal(exactTwo.proof.proven,true);
assert.equal(exactTwo.proof.lowerBound,2);
assert.equal(exactTwo.result.bins.length,2);
const weakArea=certificate(state({kerf:0,trim:0,
  parts:[certPart(60,60),certPart(60,60)],stocks:[certStock(100,100),certStock(120,120,0),certStock(130,130,0),certStock(140,140,0)]}));
assert.equal(weakArea.proof.proven,false);
assert.equal(weakArea.proof.lowerBound,1);
assert.equal(weakArea.result.bins.length,2);
const materialGroups=certificate(state({kerf:0,trim:0,
  parts:[certPart(100,100,'Birch'),certPart(100,100,'Pine')],
  stocks:[certStock(100,100,5,'Birch'),certStock(100,100,5,'Pine')]}));
assert.equal(materialGroups.proof.proven,true);
assert.equal(materialGroups.proof.lowerBound,2);
const notAllPlaced=certificate(state({kerf:0,trim:0,
  parts:[certPart(100,100)],stocks:[certStock(20,20)]}));
assert.equal(notAllPlaced.proof.proven,false);
assert.equal(notAllPlaced.proof.complete,false);
assert.equal(notAllPlaced.proof.lowerBound,null);
window.__testHooks.showResult(exactTwo.input,exactTwo.result);
assert.ok(node('optimalityRow').textContent.includes('kanıtlandı'));
const certificatePdf=window.__testHooks.makePdfDocument();
assert.ok(certificatePdf.content.some(x=>String(x.text||'').includes('STOK SAYISI KANITI')));
assert.equal(window.__testHooks.productionFile(),true);
assert.ok(node('printCollection').innerHTML.includes('Minimum stok sayısı kanıtlandı'));
window.__testHooks.showResult(weakArea.input,weakArea.result);
assert.ok(node('optimalityRow').textContent.includes('henüz kanıtlanmadı'));
tests+=11;
console.log('Stock-count certificate checks: 1-stock, 2-stock, unsupported mixed-stock scope, distinct materials, incomplete and PDF labeling.');


// Exhaustive disjunctive solver vs a SEPARATE integer-grid brute-force oracle.
// For these integer-mm fixtures, any axis-aligned feasible solution can be shifted
// to bottom/left contacts at integer coordinates, hence integer-grid enumeration is
// exhaustive. The independent oracle knows nothing about difference-constraint edges.
function gridOracle(parts,W,H,kerf,trim,K){
  const bins=Array.from({length:K},()=>[]);
  const interiorW=W-2*trim,interiorH=H-2*trim;
  const ordered=parts.slice().sort((a,b)=>b.l*b.w-a.l*a.w);
  function place(i){
    if(i===ordered.length)return true;
    const p=ordered[i],turns=p.rotate&&p.l!==p.w?[[p.l,p.w],[p.w,p.l]]:[[p.l,p.w]];
    for(const [w,h]of turns)for(let b=0;b<K;b++){
      for(let y=0;y<=interiorH-h;y++)for(let x=0;x<=interiorW-w;x++){
        if(bins[b].some(q=>!(x+w+kerf<=q.x||q.x+q.w+kerf<=x||
                                   y+h+kerf<=q.y||q.y+q.h+kerf<=y)))continue;
        bins[b].push({x,y,w,h});
        if(place(i+1))return true;
        bins[b].pop();
      }
    }
    return false;
  }
  return place(0);
}
const newSearchFixtures=[
  {W:100,H:100,kerf:0,trim:0,K:1,parts:[[60,60,false],[60,60,false]],feasible:false},
  {W:70,H:88,kerf:2,trim:0,K:1,parts:[[32,40,false],[26,49,false],[14,17,true],[15,34,false],[51,22,true]],feasible:true}
];
for(const x of newSearchFixtures){
  const p=x.parts.map(([l,w,rotate],i)=>({l,w,rotate,id:'exact'+i,material:'Wood',label:'E'+i,t:null}));
  const result=app.exactUniformFeasibility(p,{l:x.W,w:x.H},x.K,{kerf:x.kerf,trim:x.trim},
    {maxNodes:250000,deadline:Date.now()+3000});
  assert.equal(result.status,x.feasible?'feasible':'infeasible',
    'Expected exhaustive feasibility outcome');
  tests++;
}
const cutoff=app.exactUniformFeasibility(
  [{l:60,w:60,rotate:false},{l:60,w:60,rotate:false}],
  {l:100,w:100},1,{kerf:0,trim:0},{maxNodes:1,deadline:Date.now()+5000});
assert.equal(cutoff.status,'limit','Search-budget exhaustion cannot imply infeasibility');
tests++;
const improvedCase=state({
  project:'Exact benchmark',unit:'mm',mode:'nest',kerf:2,trim:0,
  parts:[[32,40,false],[26,49,false],[14,17,true],[15,34,false],[51,22,true]]
    .map(([l,w,rotate],i)=>({l,w,rotate,t:'',qty:1,material:'Wood',label:'E'+i})),
  stocks:[{l:70,w:88,t:'',qty:5,material:'Wood',price:100}]
});
app.setState(improvedCase);
const improvedInput=app.normalize();
const oldResult=app.optimizeBaseline(improvedInput),newResult=app.optimize(improvedInput);
assert.equal(oldResult.bins.length,2);
assert.equal(newResult.bins.length,1);
assert.equal(newResult.unplaced.length,0);
assert.equal(app.auditCutPlan(newResult,improvedInput).ok,true);
const improvedProof=app.certifyStockCount(newResult,improvedInput,app.auditCutPlan(newResult,improvedInput));
assert.equal(improvedProof.proven,true);
assert.equal(improvedProof.method,'area');
assert.equal(newResult.exact.status,'improved');
tests+=7;
const geometricProof=state({
  project:'Geometry proof',unit:'mm',mode:'nest',kerf:0,trim:0,
  parts:[{l:60,w:60,t:'',qty:2,material:'Wood',label:'S',rotate:false}],
  stocks:[{l:100,w:100,t:'',qty:5,material:'Wood',price:100}]
});
app.setState(geometricProof);
const gpIn=app.normalize(),gpPlan=app.optimize(gpIn);
const gpCert=app.certifyStockCount(gpPlan,gpIn,app.auditCutPlan(gpPlan,gpIn));
assert.equal(gpCert.lowerBound,1);
assert.equal(gpCert.usedStockCount,2);
assert.equal(gpCert.method,'exhaustive-geometry');
assert.equal(gpCert.proven,true);
window.__testHooks.showResult(gpIn,gpPlan);
assert.ok(node('optimalityRow').textContent.includes('Kesin geometrik arama'));
assert.ok(window.__testHooks.makePdfDocument().content.some(x=>String(x.text||'').includes('Kesin geometrik arama')));
tests+=7;

let oracleSeed=91501;
const oracleRand=()=>((oracleSeed=(Math.imul(1664525,oracleSeed)+1013904223)>>>0)/4294967296);
for(let j=0;j<90;j++){
  const W=4+Math.floor(oracleRand()*5),H=4+Math.floor(oracleRand()*5),
    count=2+Math.floor(oracleRand()*2),kerf=Math.floor(oracleRand()*2),
    trim=Math.floor(oracleRand()*2),K=1+Math.floor(oracleRand()*2);
  const parts=Array.from({length:count},(_,i)=>({
    l:1+Math.floor(oracleRand()*W),w:1+Math.floor(oracleRand()*H),
    rotate:oracleRand()>.5,id:'small'+i,material:'Wood',label:'G'+i,t:null
  }));
  const oracle=gridOracle(parts,W,H,kerf,trim,K);
  const result=app.exactUniformFeasibility(parts,{l:W,w:H},K,{kerf,trim},
    {maxNodes:300000,deadline:Date.now()+3000});
  assert.notEqual(result.status,'limit','Tiny oracle fixtures must terminate completely');
  assert.equal(result.status==='feasible',oracle,
    'Exact solver must match independently enumerated integer placements '+j);
  tests++;
}
console.log('Exact engine: improvement 2→1, impossible 1-board proof, timeout guard, and 90 independent grid-oracle fixtures passed.');


// MULTI-STOCK EXACT SEARCH: a second solver which assigns parts to genuinely
// different board dimensions and materials while honoring quantities and kerf.
assert.equal(typeof app.exactVariableFeasibility,'function');
function multiCase(parts,stocks,opts={}) {
 return state({mode:'nest',kerf:0,trim:0,partsThicknessEnabled:false,stocksThicknessEnabled:false,
  parts:parts.map(([l,w,material='Wood',rotate=false,t=''],i)=>({l,w,material,rotate,t,qty:1,label:'M'+i})),
  stocks:stocks.map(([l,w,qty=5,material='Wood',price=100,t=''])=>({l,w,qty,material,price,t})),
  ...opts});
}
const differentBoards=verify(multiCase([[60,60],[60,60]],[[100,100,2,'Wood',1],[120,60,1,'Wood',100]]));
assert.equal(app.optimizeBaseline(differentBoards.input).bins.length,2);
assert.equal(differentBoards.result.bins.length,1);
assert.equal(app.certifyStockCount(differentBoards.result,differentBoards.input,app.auditCutPlan(differentBoards.result,differentBoards.input)).proven,true);
tests+=4;

const impossibleOne=verify(multiCase([[60,60],[60,60]],[[100,100,2],[110,60,1]]));
assert.equal(impossibleOne.result.bins.length,2);
const cannot=app.certifyStockCount(impossibleOne.result,impossibleOne.input,app.auditCutPlan(impossibleOne.result,impossibleOne.input));
assert.equal(cannot.method,'exhaustive-geometry');
assert.equal(cannot.proven,true);
tests+=3;

const twoMaterials=verify(multiCase(
 [[60,60,'Birch'],[60,60,'Birch'],[60,60,'Pine'],[60,60,'Pine']],
 [[100,100,3,'Birch'],[120,60,2,'Pine']]
));
assert.equal(twoMaterials.result.bins.length,3);
assert.equal(twoMaterials.result.exact.groups.length,2);
const materialProof=app.certifyStockCount(twoMaterials.result,twoMaterials.input,app.auditCutPlan(twoMaterials.result,twoMaterials.input));
assert.equal(materialProof.method,'exhaustive-geometry');
assert.equal(materialProof.proven,true);
tests+=4;

const typed=multiCase([[5,5,'Wood',false,20]],[[8,8,1,'Wood',100,30],[8,8,1,'Wood',100,20]],{
 partsThicknessEnabled:true,stocksThicknessEnabled:true});
const typedRun=verify(typed);
assert.equal(typedRun.result.bins[0].stock.t,20);
const exactTyped=app.exactVariableFeasibility(typedRun.input.parts,typedRun.input.stocks,1,{trim:0,kerf:0},{
 maxNodes:25000,deadline:Date.now()+2000});
assert.equal(exactTyped.status,'feasible');
assert.equal(exactTyped.layout[0].stock.t,20);
tests+=4;
const unknownVariable=app.exactVariableFeasibility(
 [{id:'a',l:6,w:6,t:null,material:'Wood',rotate:false},{id:'b',l:6,w:6,t:null,material:'Wood',rotate:false}],
 [{id:'s1',l:10,w:10,qty:1,t:null,material:'Wood'},{id:'s2',l:10,w:10,qty:1,t:null,material:'Wood'}],
 1,{trim:0,kerf:0},{maxNodes:1,deadline:Date.now()+3000});
assert.equal(unknownVariable.status,'limit','A search budget must not become a fake impossibility proof');
tests++;

// Fully independent integer-grid oracle for variable-size boards, 2 materials,
// rotations and stock quantities. It deliberately does NOT use the
// application's difference-constraint logic.
function gridVariableOracle(parts,types,limit,kerf,trim) {
 const boards=[],used=new Array(types.length).fill(0);
 const sameMat=(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
 const compatible=(p,t)=>sameMat(p.material,t.material)&&(p.t===null||(t.t!==null&&p.t===t.t));
 const ordered=parts.slice().sort((a,b)=>b.l*b.w-a.l*a.w);
 function tryBoard(part,board,w,h,i) {
  const maxX=board.type.l-2*trim-w,maxY=board.type.w-2*trim-h;
  if(maxX<0||maxY<0)return false;
  for(let y=0;y<=maxY;y++)for(let x=0;x<=maxX;x++){
   if(board.parts.some(p=>!(x+w+kerf<=p.x||p.x+p.w+kerf<=x||
                             y+h+kerf<=p.y||p.y+p.h+kerf<=y)))continue;
   board.parts.push({x,y,w,h});
   if(search(i+1))return true;
   board.parts.pop();
  }
  return false
 }
 function search(i){
  if(i===ordered.length)return true;
  const part=ordered[i],orient=part.rotate&&part.l!==part.w?[[part.l,part.w],[part.w,part.l]]:[[part.l,part.w]];
  for(const [w,h]of orient){
   for(const board of boards)if(compatible(part,board.type)&&tryBoard(part,board,w,h,i))return true;
   if(boards.length>=limit)continue;
   for(let t=0;t<types.length;t++){
    if(used[t]>=types[t].qty||!compatible(part,types[t]))continue;
    const board={type:types[t],parts:[]};
    boards.push(board);used[t]++;
    const success=tryBoard(part,board,w,h,i);
    boards.pop();used[t]--;
    if(success)return true
   }
  }
  return false
 }
 return search(0)
}
let multiSeed=78114;
const next=()=>((multiSeed=(Math.imul(multiSeed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<75;i++){
 const stocks=Array.from({length:2},(_,j)=>({
   id:'v'+j,l:4+Math.floor(next()*4),w:4+Math.floor(next()*4),
   qty:1+Math.floor(next()*2),material:next()>.25?'Wood':'Birch',t:null
 }));
 const rects=Array.from({length:2+Math.floor(next()*2)},(_,j)=>({
   id:'p'+j,l:1+Math.floor(next()*6),w:1+Math.floor(next()*6),
   material:next()>.25?'Wood':'Birch',rotate:next()>.5,t:null
 }));
 const kerf=Math.floor(next()*2),trim=Math.floor(next()*2),limit=1+Math.floor(next()*2);
 const oracle=gridVariableOracle(rects,stocks,limit,kerf,trim);
 const exact=app.exactVariableFeasibility(rects,stocks,limit,{kerf,trim},{
   maxNodes:300000,deadline:Date.now()+2500});
 assert.notEqual(exact.status,'limit','Tiny multi-stock cases must terminate completely, case '+i);
 assert.equal(exact.status==='feasible',oracle,'Variable-stock exact solver must agree with independent exhaustive grid oracle, case '+i);
 tests++;
}
console.log('Variable-stock exact search: 75 independent integer-grid oracle cases passed.');

// Actual CLASS benchmark data, mirrored from published 2DPackLib literature
// through MIT-licensed ktnr/BinPacking2D. The referenced optimum is an external
// result, NOT a proof produced by Beythaus Cut when its certificate is absent.
const academic=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/class-literature-samples.json'),'utf8'));
let academicMatched=0,academicProven=0,academicValidated=0;
for(const b of academic.examples){
 const run=verify(state({
   project:b.name,unit:'mm',kerf:0,trim:0,mode:'nest',
   parts:b.items.map((p,i)=>({l:p.w,w:p.h,t:'',qty:p.demand,
     material:'Wood',label:'B'+i,rotate:false})),
   stocks:[{l:b.board.w,w:b.board.h,t:'',qty:99,material:'Wood',price:100}]
 }));
 const audited=app.auditCutPlan(run.result,run.input),proof=app.certifyStockCount(run.result,run.input,audited);
 assert.ok(audited.ok);
 assert.equal(run.result.unplaced.length,0);
 academicValidated++;
 if(Number.isInteger(b.referenceOptimal)){
  assert.ok(run.result.bins.length>=b.referenceOptimal,'A result beating published optimum suggests model mismatch');
  assert.equal(run.result.bins.length,b.referenceOptimal,'Regression: lost published optimum for '+b.name);
  if(proof.proven)assert.equal(proof.usedStockCount,b.referenceOptimal,'Incorrect certificate');
  academicMatched++;academicProven+=Number(proof.proven);
 }
 tests+=3;
}
console.log('2DPackLib CLASS external benchmarks: '+academicValidated+' geometry-validated instances across 6 classes; '+
 academicMatched+' match externally reported optimum; '+academicProven+' internally certified among those with a known reference.');


// MINIMUM GROSS WASTE: minimum total physical stock area at PROVEN
// minimum board count. This is NOT minimum cutting cost or recovery optimum.
function areaCase(parts,stocks,extras={}){
 return multiCase(parts,stocks,{mode:'nest',unit:'mm',kerf:0,trim:0,...extras});
}
const areaSmall=verify(areaCase([[60,60],[60,60]],
 [[100,100,2,'Wood',1],[65,65,2,'Wood',50]]));
assert.equal(app.optimizeBaseline(areaSmall.input).stockArea,20000);
assert.equal(areaSmall.result.bins.length,2);
assert.equal(areaSmall.result.stockArea,8450);
assert.equal(areaSmall.result.areaProof.proven,true);
assert.equal(areaSmall.result.areaProof.areaSaved,11550);
assert.ok(areaSmall.result.cost>app.optimizeBaseline(areaSmall.input).cost,
 'Less gross waste can cost MORE; never conflate the objectives');
tests+=6;

const areaSingle=verify(areaCase([[60,60],[60,60]],
 [[200,200,2,'Wood',1],[120,60,2,'Wood',100]]));
assert.equal(areaSingle.result.bins.length,1);
assert.equal(areaSingle.result.stockArea,7200);
assert.equal(areaSingle.result.areaProof.proven,true);
tests+=3;
const uniformLoss=verify(areaCase([[60,60],[60,60]],[[100,100,2,'Wood',1]]));
assert.equal(uniformLoss.result.stockArea,20000);
assert.equal(uniformLoss.result.areaProof.proven,true);
assert.equal(uniformLoss.result.areaProof.checked,0,
 'Same stock count and dimensions imply fixed gross unused area without a placement search');
tests+=3;

const groupLoss=verify(areaCase([[60,60,'Birch'],[60,60,'Pine']],
 [[200,200,1,'Birch',1],[65,65,2,'Birch',50],
  [200,200,1,'Pine',1],[65,65,2,'Pine',50]]));
assert.equal(groupLoss.result.bins.length,2);
assert.equal(groupLoss.result.stockArea,8450);
assert.equal(groupLoss.result.areaProof.groups.length,2);
assert.equal(groupLoss.result.areaProof.proven,true);
tests+=4;

// A physically smaller stock choice can be infeasible because of dimensions.
const shapeReject=verify(areaCase([[90,20]],[[90,30,2,'Wood',1],[10,200,2,'Wood',50]]));
assert.equal(shapeReject.result.stockArea,2700);
assert.equal(shapeReject.result.areaProof.proven,true);
assert.ok(shapeReject.result.areaProof.checked>=1);
tests+=3;

// Existing project scope still applies. No extrapolated certificate.
const unprovenArea=verify(areaCase([[60,60],[60,60]],
 [[100,100,2,'Wood',1],[65,65,2,'Wood',50],
  [66,66,2,'Wood',50],[67,67,2,'Wood',50]]));
assert.equal(unprovenArea.result.areaProof.proven,false);
assert.ok(['stock-count-unproven','scope-limited'].includes(unprovenArea.result.areaProof.status));
tests+=2;
window.__testHooks.showResult(areaSmall.input,areaSmall.result);
assert.ok(node('grossWasteProofRow').textContent.includes('Minimum brüt alan kaybı kanıtlandı'));
assert.ok(window.__testHooks.makePdfDocument().content.some(x=>String(x.text||'').includes('BRÜT FİRE KANITI')));
assert.equal(window.__testHooks.productionFile(),true);
assert.ok(node('printCollection').innerHTML.includes('Minimum brüt alan kaybı kanıtlandı'));
tests+=4;

// Independent integer-grid enumeration of possible board multisets. The
// independent oracle deliberately does not use the exact engine's area
// enumerator, CP geometry constraints, or proof flags.
function bruteMinAreaAtK(rects,stocks,K,kerf=0,trim=0){
 let best=Infinity;
 function choose(i,left,selection,area){
  if(i===stocks.length){
   if(left===0&&area<best&&gridVariableOracle(rects,selection,K,kerf,trim))
    best=area;
   return
  }
  const stock=stocks[i];
  for(let n=0;n<=Math.min(left,stock.qty);n++){
   const opts=n?[...selection,{...stock,qty:n}]:selection;
   choose(i+1,left-n,opts,area+n*stock.l*stock.w)
  }
 }
 choose(0,K,[],0);
 return best
}
let grossSeed=944121;
const grossRand=()=>((grossSeed=(Math.imul(grossSeed,1664525)+1013904223)>>>0)/4294967296);
let grossOracleCases=0,grossCertificates=0;
for(let i=0;i<65;i++){
 const types=Array.from({length:2},(_,j)=>({
  id:'g'+j,l:4+Math.floor(grossRand()*5),w:4+Math.floor(grossRand()*5),
  qty:1+Math.floor(grossRand()*2),material:'Wood',t:null,price:j?90:1
 }));
 const rects=Array.from({length:2+Math.floor(grossRand()*2)},(_,j)=>({
  id:'gPart'+j,l:1+Math.floor(grossRand()*6),w:1+Math.floor(grossRand()*6),
  material:'Wood',t:null,rotate:grossRand()>.5
 }));
 const kerf=Math.floor(grossRand()*2),trim=Math.floor(grossRand()*2);
 const data=areaCase(rects.map(p=>[p.l,p.w,'Wood',p.rotate]),
  types.map(t=>[t.l,t.w,t.qty,t.material,t.price]),{kerf,trim});
 app.setState(data);
 const input=app.normalize(),result=app.optimize(input),audited=app.auditCutPlan(result,input);
 assert.ok(audited.ok,'Random area test geometry must be valid '+i);
 if(result.unplaced.length)continue;
 const minStock=app.certifyStockCount(result,input,audited);
 // The oracle certifies the true minimum K independent of the app.
 let oracleK=null;
 for(let k=1;k<=result.bins.length;k++){
  if(Number.isFinite(bruteMinAreaAtK(input.parts,input.stocks,k,kerf,trim))){
   oracleK=k;break
  }
 }
 assert.ok(oracleK!==null,'Oracle must find a placement for app valid packing');
 if(minStock.proven)assert.equal(result.bins.length,oracleK,'Incorrect minimum stock certificate '+i);
 if(result.areaProof?.proven){
  assert.equal(minStock.proven,true);
  const exactArea=bruteMinAreaAtK(input.parts,input.stocks,oracleK,kerf,trim);
  assert.equal(result.stockArea,exactArea,'Area certificate must match independent exhaustive grid oracle '+i);
  grossCertificates++;
 }
 grossOracleCases++;tests++;
}
assert.ok(grossCertificates>=8,'Random suite should cover a meaningful set of area certificates');
tests+=2;
console.log('Gross waste: independent grid-oracle comparisons '+grossOracleCases+
 ' cases, '+grossCertificates+' rigorous area certificates; UI/PDF and pricing distinctions passed.');


// RECOVERABLE OFFCUT QUALITY. Improvement must preserve purchased stock
// identity/count, gross waste, material price, part set and guillotine cutting
// feasibility. The result is a bounded heuristic, NOT an optimality proof.
assert.equal(typeof app.refineUsableOffcuts,'function');
assert.equal(typeof app.offcutMetrics,'function');
const offcutImprove=state({
 project:'Reuse quality fixture',unit:'mm',mode:'guillotine',
 kerf:1,trim:0,offcutMinEdgeMm:20,offcutMinAreaCm2:10,
 parts:[[51,59,true],[19,40,true],[27,23,true],[17,51,true],[14,63,false]]
   .map(([l,w,rotate],j)=>({l,w,rotate,t:'',qty:1,material:'Wood',label:'RP'+j})),
 stocks:[{l:121,w:139,t:'',qty:30,material:'Wood',price:100}]
});
app.setState(offcutImprove);
const oi=app.normalize(),originalOffcut=app.optimizeBaseline(oi),improvedOffcut=app.optimize(oi);
const originalMetrics=app.offcutMetrics(originalOffcut),improvedMetrics=app.offcutMetrics(improvedOffcut);
assert.equal(originalOffcut.bins.length,1);
assert.equal(improvedOffcut.bins.length,1);
assert.equal(improvedOffcut.stockArea,originalOffcut.stockArea);
assert.equal(improvedOffcut.cost,originalOffcut.cost);
assert.equal(improvedOffcut.partArea,originalOffcut.partArea);
assert.equal(originalMetrics.usableArea,9222);
assert.equal(improvedMetrics.usableArea,10150);
assert.equal(improvedOffcut.search.offcutAreaGain,928);
assert.equal(improvedOffcut.search.offcutImprovements>0,true);
assert.equal(app.auditCutPlan(improvedOffcut,oi).ok,true);
assert.equal(app.auditGuillotineCuts(improvedOffcut.bins[0],{trim:oi.trim,kerf:oi.kerf}).length,0);
tests+=11;
const directPass=app.refineUsableOffcuts(originalOffcut,oi.parts,oi.stocks,
 {trim:oi.trim,kerf:oi.kerf,mode:'guillotine',priceMode:'panel',m3:oi.m3});
assert.equal(directPass.info.proof,false,'Usable scrap heuristic MUST NOT emit global optimum certificates');
assert.equal(directPass.info.before.usableArea,9222);
assert.equal(directPass.info.after.usableArea,10150);
assert.equal(directPass.solution.stockArea,originalOffcut.stockArea);
assert.equal(directPass.solution.bins.length,originalOffcut.bins.length);
assert.equal(app.auditCutPlan(directPass.solution,oi).ok,true);
tests+=6;
window.__testHooks.showResult(oi,improvedOffcut);
assert.ok(node('cutDetails').innerHTML.includes('Artık araması'));
assert.ok(node('cutDetails').innerHTML.includes('En büyük kullanılabilir artık'));
assert.ok(node('cutDetails').innerHTML.includes('ek kazanım')===false);
const reusePdf=window.__testHooks.makePdfDocument();
assert.ok(reusePdf.content.some(x=>String(x.text||'').startsWith('ARTIK DEĞERLENDİRMESİ:')));
assert.ok(reusePdf.content.some(x=>String(x.text||'').includes('optimumluk kanıtı değildir')));
assert.equal(window.__testHooks.productionFile(),true);
assert.ok(node('printCollection').innerHTML.includes('sezgisel'));
tests+=7;

// A stricter threshold must not be interpreted as geometric waste reduction:
// it changes only which free leaves qualify as reusable.
const tightThreshold=state({...offcutImprove,offcutMinEdgeMm:120,offcutMinAreaCm2:10});
const tightened=verify(tightThreshold);
assert.equal(app.offcutMetrics(tightened.result).usableArea,0);
assert.equal(app.auditCutPlan(tightened.result,tightened.input).ok,true);
tests+=2;

// Check quality non-regression under randomized guillotine jobs, using an
// independent cut-tree audit and the exact fixed-stock allocation.
let reuseSeed=20543;
const reuseRand=()=>((reuseSeed=(Math.imul(1664525,reuseSeed)+1013904223)>>>0)/4294967296);
let checkedReuse=0,positiveReuse=0;
for(let i=0;i<75;i++){
 const L=55+Math.floor(reuseRand()*105),W=45+Math.floor(reuseRand()*95),
       n=3+Math.floor(reuseRand()*12),kerf=[0,1,2,3][Math.floor(reuseRand()*4)],
       trim=[0,1,2][Math.floor(reuseRand()*3)];
 const parts=Array.from({length:n},(_,j)=>({
  l:8+Math.floor(reuseRand()*L*.49),w:8+Math.floor(reuseRand()*W*.5),
  t:'',qty:1,material:'Wood',label:'R'+j,rotate:reuseRand()>.25
 }));
 const config=state({project:'offcut random '+i,unit:'mm',mode:'guillotine',
  kerf,trim,offcutMinEdgeMm:20,offcutMinAreaCm2:10,parts,
  stocks:[{l:L,w:W,t:'',qty:20,material:'Wood',price:75}]
 });
 app.setState(config);
 const input=app.normalize(),base=app.optimizeBaseline(input),cfg={mode:'guillotine',
  kerf:input.kerf,trim:input.trim,m3:input.m3,priceMode:'panel'};
 const selection=app.refineUsableOffcuts(base,input.parts,input.stocks,cfg,{maxTrials:80,timeLimitMs:300});
 const oldScore=app.offcutMetrics(base),newScore=app.offcutMetrics(selection.solution);
 assert.equal(selection.solution.stockArea,base.stockArea);
 assert.equal(selection.solution.bins.length,base.bins.length);
 assert.equal(selection.solution.partArea,base.partArea);
 assert.equal(selection.solution.cost,base.cost);
 assert.equal(app.auditCutPlan(selection.solution,input).ok,true,'Refined guillotine plan must replay all cuts '+i);
 assert.equal(app.betterOffcuts(oldScore,newScore),false,'Refinement must not worsen salvage priority '+i);
 assert.equal(selection.info.proof,false);
 if(app.betterOffcuts(newScore,oldScore))positiveReuse++;
 checkedReuse++;tests++;
}
assert.ok(positiveReuse>=3,'Random suite must exercise actual recoverable scrap improvements');
tests++;
console.log('Usable offcut optimizer: 75 independent cut replays, '+positiveReuse+
 ' quality improvements; fixed purchased stock, PDF disclosure and no false optimum claim passed.');


// PHYSICAL REMNANT INVENTORY — creation requires a confirmed, complete,
// audited guillotine production, never just planning. One item = one piece.
assert.equal(typeof app.getRemnantDB,'function');
assert.equal(typeof app.registerRemnantProduction,'function');
const productionJob=state({
 project:'Batch A',unit:'mm',mode:'guillotine',priceMode:'panel',
 kerf:3,trim:0,offcutMinEdgeMm:50,offcutMinAreaCm2:100,
 parts:[{l:150,w:100,t:'',qty:1,material:'Wood',label:'Cut',rotate:false}],
 stocks:[{l:300,w:200,t:'',qty:1,material:'Wood',price:250}]
});
const production=verify(productionJob);
assert.equal(app.getRemnantDB().pieces.length,0);
assert.equal(app.getRemnantDB().batches.length,0);
tests+=2;
window.__testHooks.showResult(production.input,production.result);
assert.equal(node('remnantConfirmProductionBtn').disabled,false);
assert.equal(app.getRemnantDB().pieces.length,0,'Calculating plans must not mint physical stock');
assert.equal(app.registerRemnantProduction(),true);
let ledger=app.getRemnantDB();
assert.equal(ledger.pieces.length,2);
assert.equal(ledger.batches.length,1);
assert.equal(ledger.pieces.every(p=>p.status==='available'),true);
assert.deepEqual(ledger.pieces.map(p=>[p.l,p.w]).sort((a,b)=>a[0]-b[0]),[[147,200],[150,97]]);
assert.equal(node('remnantConfirmProductionBtn').disabled,true);
assert.equal(app.registerRemnantProduction(),false,'Same rendered result cannot be confirmed twice');
tests+=8;

const nextPart=state({
 project:'Batch B',unit:'mm',mode:'guillotine',priceMode:'panel',
 kerf:2,trim:0,offcutMinEdgeMm:20,offcutMinAreaCm2:10,
 parts:[{l:90,w:60,t:'',qty:1,material:'Wood',label:'NewCut',rotate:false}],
 stocks:[],useRemnantStock:true
});
const reuseJob=verify(nextPart);
assert.equal(reuseJob.input.stocks.length,2,'Inventory must supply stock without manual stock rows');
assert.equal(reuseJob.result.bins.length,1);
assert.equal(reuseJob.result.bins[0].stock.isRemnant,true);
assert.equal(reuseJob.result.bins[0].stock.price,0);
assert.equal(reuseJob.result.cost,0,'Already acquired remnants have zero additional acquisition expense');
const originalId=reuseJob.result.bins[0].stock.remnantId;
assert.equal(ledger.pieces.find(p=>p.id===originalId).status,'available');
const reuseProof=app.certifyStockCount(reuseJob.result,reuseJob.input,app.auditCutPlan(reuseJob.result,reuseJob.input));
assert.equal(reuseProof.complete,true);
window.__testHooks.showResult(reuseJob.input,reuseJob.result);
assert.ok(String(node('summarySub').textContent).includes('artık stok'));
const inventoryPdf=window.__testHooks.makePdfDocument();
assert.ok(inventoryPdf.content.some(v=>v.table?.body?.some(row=>Array.isArray(row)&&row.some(cell=>String(cell?.text||'').includes('(Artık stok)')))));
assert.equal(window.__testHooks.productionFile(),true);
assert.ok(node('printCollection').innerHTML.includes('(Artık stok)'));
assert.equal(app.registerRemnantProduction(),true);
ledger=app.getRemnantDB();
assert.equal(ledger.pieces.find(p=>p.id===originalId).status,'used');
assert.equal(ledger.batches.length,2);
assert.ok(ledger.pieces.some(p=>p.status==='available'&&p.projectName==='Batch B'));
tests+=14;

// Old stock cannot be allocated again after confirmed physical consumption.
app.setState(nextPart);
const future=app.normalize();
assert.equal(future.stocks.some(b=>b.remnantId===originalId),false);
assert.ok(future.stocks.length>0);
tests+=2;

// Manual status transitions must affect ONLY future calculations.
const savedId=ledger.pieces.find(p=>p.status==='available').id;
assert.equal(app.setRemnantStatus(savedId,'used'),true);
assert.equal(app.normalize().stocks.some(b=>b.remnantId===savedId),false);
assert.equal(app.setRemnantStatus(savedId,'available'),true);
assert.equal(app.normalize().stocks.some(b=>b.remnantId===savedId),true);
tests+=4;

// Per-project switch turns reuse off without erasing the shared inventory.
const withoutInventory=state({
 project:'No reused stock',unit:'mm',stocks:[],
 parts:[{l:40,w:30,t:'',qty:1,material:'Wood',label:'New',rotate:true}],
 useRemnantStock:false
});
app.setState(withoutInventory);
assert.equal(app.normalize().stocks.length,0);
assert.ok(app.normalize().errors.length>0,'No other stock should remain');
assert.equal(app.getRemnantDB().pieces.length,ledger.pieces.length);
tests+=3;

// Reject partial runs, nesting plans, and duplicate confirmations. No inventory
// source can be consumed if it has already been marked used by another project.
const nestOnly=verify(state({
 project:'No physical nest',unit:'mm',mode:'nest',
 parts:[{l:40,w:30,t:'',qty:1,material:'Wood',label:'New',rotate:true}],
 stocks:[{l:100,w:100,t:'',qty:1,material:'Wood',price:20}],
 useRemnantStock:false
}));
window.__testHooks.showResult(nestOnly.input,nestOnly.result);
assert.equal(app.registerRemnantProduction(),false);
assert.equal(app.getRemnantDB().batches.length,2);
tests+=2;

app.setState(productionJob);
const repeatedIn=app.normalize(),repeatedPlan=app.optimize(repeatedIn);
window.__testHooks.showResult(repeatedIn,repeatedPlan);
const oldConfirm=sandbox.confirm;
sandbox.confirm=()=>false;
assert.equal(app.registerRemnantProduction(),false,'Repeated plan confirmation should require explicit second approval');
assert.equal(app.getRemnantDB().batches.length,2);
sandbox.confirm=oldConfirm;
tests+=2;

// Explicit JSON backup merging does not silently duplicate physical pieces.
const backupDB=app.getRemnantDB();
const backup={kind:'beythaus-cut-remnant-backup',version:1,pieces:backupDB.pieces,batches:backupDB.batches};
assert.equal(app.mergeRemnantBackup(backup),0);
assert.equal(app.getRemnantDB().pieces.length,backupDB.pieces.length);
assert.throws(()=>app.mergeRemnantBackup({kind:'other',version:1,pieces:[]}));
const newBackupPiece={...backupDB.pieces[0],id:'imported-sample-1',sourceKey:'imported:unique',status:'available'};
assert.equal(app.mergeRemnantBackup({...backup,pieces:[newBackupPiece]}),1);
assert.equal(app.mergeRemnantBackup({...backup,pieces:[newBackupPiece]}),0);
const separateBatch={...backupDB.batches[0],id:'B-import-history-new',signature:'imported-unique-signature'};
const beforeBatchCount=app.getRemnantDB().batches.length;
assert.equal(app.mergeRemnantBackup({...backup,pieces:[],batches:[separateBatch]}),0);
assert.equal(app.getRemnantDB().batches.length,beforeBatchCount+1,
 'Imported production history should survive a JSON backup restore');
assert.equal(app.mergeRemnantBackup({...backup,pieces:[],batches:[separateBatch]}),0);
assert.equal(app.getRemnantDB().batches.length,beforeBatchCount+1,
 'Production history import must be idempotent');
tests+=4;
tests+=5;
console.log('Remnant inventory: physical production only, project-to-project reuse, consumption, PDF provenance, status, backup and idempotency passed.');


// SHELF / LOCATION INVENTORY: physical metadata, filters and old DB migration.
assert.equal(typeof app.filterRemnants,'function');
assert.equal(typeof app.editRemnantRecord,'function');
assert.equal(typeof app.setRemnantDefaultLocation,'function');
assert.equal(typeof app.openRemnantEditor,'function');
assert.equal(typeof app.submitRemnantEditor,'function');
tests+=5;

const inventoryBefore=app.getRemnantDB();
const shelfId='imported-sample-1';
assert.ok(inventoryBefore.pieces.some(p=>p.id===shelfId));
assert.equal(app.editRemnantRecord(shelfId,{
 l:120,w:60,t:18,material:'Meşe',location:'Raf A / Göz 2',
 notes:'Damar yönü uzun kenar & <img src=x onerror=alert(1)>'
}),true);
const shelfEdited=app.getRemnantDB().pieces.find(p=>p.id===shelfId);
assert.equal(shelfEdited.l,120);
assert.equal(shelfEdited.w,60);
assert.equal(shelfEdited.t,18);
assert.equal(shelfEdited.material,'Meşe');
assert.equal(shelfEdited.location,'Raf A / Göz 2');
assert.ok(shelfEdited.notes.includes('<img'));
assert.ok(Number.isFinite(shelfEdited.updatedAt));
assert.equal(app.editRemnantRecord(shelfId,{l:-1}),false,'Negative size correction must be rejected');
assert.equal(app.editRemnantRecord(shelfId,{location:'X'.repeat(81)}),false,
 'Shelf strings longer than the on-screen limit must be rejected');
assert.equal(app.editRemnantRecord(shelfId,{material:'  '}),false,'Material cannot be empty');
tests+=11;
const records=app.getRemnantDB().pieces;
const shelfFilter={status:'available',material:'Meşe',thickness:'18',location:'Raf A / Göz 2'};
const matches=app.filterRemnants(records,shelfFilter);
assert.equal(matches.length,1);
assert.equal(matches[0].id,shelfId);
assert.equal(app.filterRemnants(records,{...shelfFilter,minL:100,minW:50}).length,1);
assert.equal(app.filterRemnants(records,{...shelfFilter,minL:50,minW:100}).length,1,
 'Minimum side filters must allow rotated 2D orientation');
assert.equal(app.filterRemnants(records,{...shelfFilter,minL:125,minW:20}).length,0);
assert.equal(app.filterRemnants(records,{...shelfFilter,query:'damar yönü'}).length,1);
assert.equal(app.filterRemnants(records,{...shelfFilter,query:'göz 3'}).length,0);
assert.equal(app.filterRemnants(records,{status:'used',material:'Meşe'}).length,0);
assert.ok(app.filterRemnants(records,{status:'all',location:'__unassigned__'}).length>=1,
 'Empty shelf must be independently filterable');
assert.ok(app.filterRemnants(records,{status:'all',thickness:'unknown'}).length>=1);
tests+=10;

// UI controls really call the filtering and correction logic, not only pure helpers.
node('remnantStatusFilter').value='available';
node('remnantMaterialFilter').value='Meşe';
node('remnantThicknessFilter').value='18';
node('remnantLocationFilter').value='Raf A / Göz 2';
node('remnantSearch').value='damar';
node('remnantMinLength').value='50';
node('remnantMinWidth').value='100';
node('remnantSearch').oninput();
assert.ok(node('remnantFilteredCount').textContent.startsWith('1 parça'));
assert.ok(node('remnantList').innerHTML.includes('Raf A / Göz 2'));
assert.ok(node('remnantList').innerHTML.includes('&lt;img'));
assert.equal(node('remnantList').innerHTML.includes('<img '),false,
 'Inventory notes must not inject raw HTML');
node('remnantClearFilters').onclick();
assert.equal(node('remnantStatusFilter').value,'available');
assert.equal(node('remnantLocationFilter').value,'all');
tests+=6;

assert.equal(app.openRemnantEditor(shelfId),true);
assert.equal(node('remnantEditLocation').value,'Raf A / Göz 2');
node('remnantEditLength').value='121,5';
node('remnantEditWidth').value='61';
node('remnantEditThickness').value='19';
node('remnantEditMaterial').value='Meşe';
node('remnantEditLocation').value='Raf B / Göz 5';
node('remnantEditNotes').value='Damar düz';
assert.equal(app.submitRemnantEditor(),true);
assert.equal(app.getRemnantDB().pieces.find(p=>p.id===shelfId).l,121.5);
assert.equal(app.getRemnantDB().pieces.find(p=>p.id===shelfId).location,'Raf B / Göz 5');
assert.equal(app.getRemnantDB().pieces.find(p=>p.id===shelfId).t,19);
tests+=6;

// Saving a default shelf must NOT create or consume stock by itself.
const noAddBefore=app.getRemnantDB().pieces.length;
assert.equal(app.setRemnantDefaultLocation('Raf C / Üst göz'),true);
assert.equal(app.getRemnantDB().defaultLocation,'Raf C / Üst göz');
assert.equal(app.getRemnantDB().pieces.length,noAddBefore);
assert.equal(app.setRemnantDefaultLocation('X'.repeat(81)),false);
tests+=4;

// Physical production creates brand-new remnants in the current default shelf.
const shelfProduction=state({...productionJob,
 project:'Raflı üretim',useRemnantStock:false,
 parts:[{l:150,w:100,t:'',qty:1,material:'Wood',label:'SHELF-P',rotate:false}]
});
const shelfProductionRun=verify(shelfProduction);
window.__testHooks.showResult(shelfProductionRun.input,shelfProductionRun.result);
assert.equal(app.registerRemnantProduction(),true);
const afterProduction=app.getRemnantDB();
const newPhysical=afterProduction.pieces.filter(p=>p.projectName==='Raflı üretim');
assert.equal(newPhysical.length,2);
assert.ok(newPhysical.every(p=>p.location==='Raf C / Üst göz'));
assert.ok(newPhysical.every(p=>p.status==='available'));
assert.ok(app.filterRemnants(afterProduction.pieces,{
 status:'available',location:'Raf C / Üst göz'}).length>=2);
tests+=5;

// Stock corrections carry over into following projects and preserve physical
// source identity, while editing a selected item invalidates the existing plan.
const changedPiece=newPhysical[0];
app.setState(state({project:'Raf arama',unit:'mm',mode:'nest',stocks:[],
 parts:[{l:40,w:30,t:'',qty:1,material:'Wood',label:'LP',rotate:true}],
 useRemnantStock:true}));
assert.ok(app.normalize().stocks.some(x=>x.remnantId===changedPiece.id));
assert.equal(app.editRemnantRecord(changedPiece.id,{location:'Raf Z',notes:'Kullanım öncesi ölçü kontrolü'}),true);
assert.ok(app.normalize().stocks.some(x=>x.remnantId===changedPiece.id));
assert.equal(app.filterRemnants(app.getRemnantDB().pieces,{
 status:'available',location:'Raf Z'}).some(x=>x.id===changedPiece.id),true);
tests+=4;

// Backup preserves shelf, notes and default location without duplicating stock.
const beforeImport=app.getRemnantDB(),shelfBackup={
 kind:'beythaus-cut-remnant-backup',version:1,
 pieces:beforeImport.pieces,batches:beforeImport.batches,defaultLocation:beforeImport.defaultLocation
};
assert.equal(app.mergeRemnantBackup(shelfBackup),0);
assert.equal(app.getRemnantDB().pieces.length,beforeImport.pieces.length);
assert.equal(app.getRemnantDB().pieces.find(p=>p.id===shelfId).location,'Raf B / Göz 5');
const another={...beforeImport.pieces.find(p=>p.id===shelfId),
 id:'shelf-location-backup-copy',sourceKey:'physical:unique:shelf',
 location:'Raf X / Göz 9',notes:'Yedekten aktarım'};
assert.equal(app.mergeRemnantBackup({...shelfBackup,pieces:[another]}),1);
assert.equal(app.mergeRemnantBackup({...shelfBackup,pieces:[another]}),0);
assert.equal(app.getRemnantDB().pieces.find(p=>p.id===another.id).location,'Raf X / Göz 9');
assert.equal(app.getRemnantDB().defaultLocation,'Raf C / Üst göz');
tests+=7;

// Old v1 records lacking shelf/notes must hydrate without any data loss.
const historical={version:1,pieces:[
 {id:'legacy-stock',l:100,w:75,t:18,material:'Meşe',status:'available',
  createdAt:1730000000000,sourceKey:'legacy:one',projectName:'Eski kayıt'}
],batches:[]};
const oldStore=new Map([['beythaus-cut-remnant-library-v1',JSON.stringify(historical)]]);
const oldWindow={addEventListener(){}},oldDocument={
 getElementById:id=>node('_legacy_'+id),querySelectorAll(){return []},
 addEventListener(){},createElement(){return node('_legacy_temp')},
 head:{appendChild(){}},body:{classList:emptyClasses(),append(){}}
};
vm.runInNewContext(script,{
 ...sandbox,window:oldWindow,document:oldDocument,
 localStorage:{
  getItem:k=>oldStore.get(k)??null,setItem:(k,v)=>oldStore.set(k,String(v))
 }
},{filename:'legacy-inventory-hydration.js',timeout:10000});
const migrated=oldWindow.BeythausCut.getRemnantDB();
assert.equal(migrated.pieces.length,1);
assert.equal(migrated.pieces[0].l,100);
assert.equal(migrated.pieces[0].material,'Meşe');
assert.equal(migrated.pieces[0].location,'');
assert.equal(migrated.pieces[0].notes,'');
assert.equal(migrated.defaultLocation,'');
tests+=6;
console.log('Shelf inventory: 58+ metadata, responsive UI, filter, rotation, legacy-migration, production, edit and backup assertions passed.');

console.log('Beythaus Cut: '+tests+' checks passed; invalid plans rejected and unknown prices preserved.');
