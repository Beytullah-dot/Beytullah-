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
 const plan = engine.optimize(data,true,false);
 const audit = engine.auditCutPlan(plan,data);
 assert.equal(audit.ok,true, name+' '+JSON.stringify(audit));
 assert.equal(plan.unplaced.length,0,name);
 assert.equal(plan.placedCount,parts.length,name);
 // BENG01 must also work when the project UI's 3 mm default differs
 // from this zero-kerf job. Four bins have an audited witness.
 if (index === 1) assert.ok(plan.bins.length <= 4);
 const proof = engine.certifyStockCount(plan,data,audit);
 const area = parts.reduce((total,p)=>total+p.l*p.w,0);
 console.log(JSON.stringify({name,parts:parts.length,boards:plan.bins.length,
  lowerBound:proof.lowerBound,proven:proof.proven,grossWaste:plan.bins.length*l*w-area,
  ms:Math.round(performance.now()-start),processPeakKiB:process.resourceUsage().maxRSS}));
}
