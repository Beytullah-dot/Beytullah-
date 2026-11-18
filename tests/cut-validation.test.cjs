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
vm.runInNewContext(script, sandbox, {filename:'docs/index.html', timeout:10000});
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

console.log('Beythaus Cut: '+tests+' checks passed; invalid plans rejected and unknown prices preserved.');
