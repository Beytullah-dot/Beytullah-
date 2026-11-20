// Official 2DPackLib BENG archive. Measure fixed-orientation guillotine BPP.
'use strict';
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {engine} = require('./motor-scalability-profile.cjs');
const archive = path.join(__dirname, 'fixtures/2dpacklib-beng.zip');
assert.equal(createHash('sha256').update(readFileSync(archive)).digest('hex'),
 '90536b052787ed7d04bb58c4b03ab6308247685e3890facc3f2773867830816c');

// Use the shipped worker entry point and the UI's independent acceptance
// path. The production search has no access to the oracle witness.
const docs=path.join(__dirname,'../docs');
const worker={postMessage(message){this.result=message}};
for(const script of ['engine/material-policy.js','engine/guillotine-pattern-cover.js',
 'guillotine-exact.js','optimization-worker.js']){
 new Function('self',readFileSync(path.join(docs,script),'utf8'))(worker)
}
const html=readFileSync(path.join(docs,'index.html'),'utf8');
const accept=new Function('state','mkBin','binCost','auditCutPlan','mkey',
 html.slice(html.indexOf('function acceptExactWorkerResult('),html.indexOf('function startExactWorker('))+
 ';return acceptExactWorkerResult')({mode:'guillotine',priceMode:'panel'},
 engine.mkBin,engine.binCost,engine.auditCutPlan,s=>String(s).toLowerCase());
// External CP-SAT witness: replay directly against the original .ins2D
// dimensions. Each internal split traverses its entire current rectangle.
function checkWitness(trees,parts,width,height){
 const pending=new Map(parts.map(p=>[p.id,p]));
 function replay(tree,w,h){
  if(tree===null)return;
  if(Number.isInteger(tree)){
   const id='p'+tree,part=pending.get(id);
   assert.ok(part&&part.l===w&&part.w===h,'Missing, reused or wrong-size leaf '+id);
   pending.delete(id);return
  }
  const [axis,k,left,right]=tree;
  assert.ok(tree.length===4&&['V','H'].includes(axis)&&Number.isInteger(k));
  assert.ok(k>0&&k<(axis==='V'?w:h));
  if(axis==='V'){replay(left,k,h);replay(right,w-k,h)}
  else{replay(left,w,k);replay(right,w,h-k)}
 }
 assert.equal(trees.length,6);
 for(const root of trees)replay(root,width,height);
 assert.equal(pending.size,0)
}
for (let index = 1; index <= 10; index++) {
 const name = 'BENG' + String(index).padStart(2, '0');
 const input = execFileSync('unzip', ['-p', archive, 'BENG/BENG/'+name+'.ins2D'], {encoding:'utf8'});
 const [header, board, ...rows] = input.trim().split(/\r?\n/).map(line => line.trim().split(/\s+/).map(Number));
 assert.equal(rows.length, header[0]);
 const material = {material:name, t:18, category:'panel'};
 const parts = rows.map(([id,l,w,demand,maximum], order) => {
  assert.equal(demand, 1);
  assert.equal(maximum, 1);
  return {...material, id:'p'+id, label:'P'+id, l,w,order,rotate:false,grain:'length'};
 });
 const [l,w] = board;
 const stocks = [{...material, id:'s', l,w,qty:parts.length,price:null,priceUnit:'panel'}];
 const data = {parts, stocks, trim:0, kerf:0};
 const start = performance.now();
 let plan = engine.optimize(data,true,false);
 const fastBoards=plan.bins.length;
 const initialProof=engine.certifyStockCount(plan,data,engine.auditCutPlan(plan,data));
 if(!initialProof.proven){
  worker.onmessage({data:{type:'solve',mode:'guillotine',requestId:index,data,
   incumbentBins:plan.bins.map(b=>({stockId:b.stock.id,material:b.stock.material})),
   bounds:initialProof.details,timeBudgetMs:6500,maxNodes:500000}});
  assert.equal(worker.result.type,'finished',JSON.stringify(worker.result));
  plan=accept(data,plan,worker.result).proposal
 }
 const audit = engine.auditCutPlan(plan,data);
 assert.equal(audit.ok,true, name+' '+JSON.stringify(audit));
 assert.equal(plan.unplaced.length,0,name);
 assert.equal(plan.placedCount,parts.length,name);
 // BENG01 must also work when the project UI's 3 mm default differs
 // from this zero-kerf job. Four bins have an audited witness.
 if (index === 1) assert.ok(plan.bins.length <= 4);
 const proof = engine.certifyStockCount(plan,data,audit);
 if (index === 2) {
  // Independent area bound; the proof does not rely on worker status flags.
  assert.equal(parts.reduce((a,p)=>a+p.l*p.w,0),1420);
  assert.equal(l*w,250);
  checkWitness(require('./fixtures/beng02-cut-witness.json'),parts,l,w);
  const interrupted=worker.BeythausPatternCover.feasible(parts,stocks,6,data,Date.now()-1,1);
  assert.equal(interrupted.status,'unknown');
  assert.equal(interrupted.layout,null);
  assert.equal(plan.bins.length,6);
  assert.equal(proof.lowerBound,6);
 }
 assert.ok(proof.proven,name);
 if (index === 1 || index === 4) {
  assert.equal(proof.proven,true,name+' must meet a certified lower bound');
  assert.equal(plan.bins.length,index === 1 ? 4 : 11,name);
 }
 const area = parts.reduce((total,p)=>total+p.l*p.w,0);
 console.log(JSON.stringify({name,parts:parts.length,fastBoards,boards:plan.bins.length,
  lowerBound:proof.lowerBound,proven:proof.proven,grossWaste:plan.bins.length*l*w-area,
  ms:Math.round(performance.now()-start),processPeakKiB:process.resourceUsage().maxRSS}));
}
