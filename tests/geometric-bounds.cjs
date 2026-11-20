/* Beythaus Cut — regression tests for mathematical panel-count bounds.
 * Independent analytically known expectations; run with Node.js.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createEngine}=require('./engine-harness.cjs');
const state={mode:'nest',kerf:'0',priceMode:'panel',offcutMinEdgeMm:50,offcutMinAreaCm2:100};
const engine=createEngine(state,
 x=>Number(String(x).replace(',','.')),
 x=>String(x).trim().toLocaleLowerCase('tr-TR'),
 (x,n)=>Number(x).toFixed(n??0));
let passed=0;
const piece=(i,l,w,material='MDF',t=null)=>({
 id:'p'+i,l,w,t,material,label:'P'+i,rotate:true,order:i
});
const stock=(i,l,w,qty=200,material='MDF',t=null)=>({
 id:'s'+i,l,w,qty,material,t,price:1,order:i
});
function verify({name,parts,stocks,kerf=0,trim=0,lower,area,geometry,method}){
 const result=engine.minStockCountLowerBound({parts,stocks,kerf,trim});
 assert.equal(result.lowerBound,lower,name+' lower');
 assert.equal(result.details.reduce((v,g)=>v+g.areaLowerBound,0),area,name+' area');
 assert.equal(result.details.reduce((v,g)=>v+g.incompatibilityLowerBound,0),geometry,name+' geometric');
 if(method)assert.equal(result.method,method,name+' method');
 console.log('[PASS] '+name+': area='+area+', geometric='+geometry+', bound='+lower);
 passed++;
}
verify({name:'25 large squares',parts:Array.from({length:25},(_,i)=>piece(i,60,60)),
 stocks:[stock(0,100,100)],lower:25,area:9,geometry:25,method:'pairwise-incompatibility'});
verify({name:'four quarters fit without kerf',parts:Array.from({length:4},(_,i)=>piece(i,50,50)),
 stocks:[stock(0,100,100)],lower:1,area:1,geometry:1});
verify({name:'four quarters cannot share with 2mm kerf',
 parts:Array.from({length:4},(_,i)=>piece(i,50,50)),stocks:[stock(0,100,100)],
 kerf:2,lower:4,area:1,geometry:4});
verify({name:'49+49+2mm strips share a 100mm board',
 parts:[piece(0,49,100),piece(1,49,100)],stocks:[stock(0,100,100)],
 kerf:2,lower:1,area:1,geometry:1});
verify({name:'50+50+2mm strips cannot share',
 parts:[piece(0,50,100),piece(1,50,100)],stocks:[stock(0,100,100)],
 kerf:2,lower:2,area:1,geometry:2});
verify({name:'material groups sum their lower bounds',
 parts:[piece(0,60,60,'A'),piece(1,60,60,'A'),piece(2,60,60,'A'),
  piece(3,60,60,'B'),piece(4,60,60,'B')],
 stocks:[stock(0,100,100,10,'A'),stock(1,100,100,10,'B')],
 lower:5,area:3,geometry:5});
verify({name:'mixed stock types permit one board',
 parts:[piece(0,50,100),piece(1,50,100)],
 stocks:[stock(0,100,100,1),stock(1,50,100,2)],
 lower:1,area:1,geometry:1});
verify({name:'sampled bound remains conservative for 200 pieces',
 parts:Array.from({length:200},(_,i)=>piece(i,60,60)),
 stocks:[stock(0,100,100,210)],lower:160,area:72,geometry:160});
const tall=Array.from({length:4},(_,i)=>({...piece(i,3,6),rotate:false}));
const boundFor=(parts,stocks)=>engine.minStockCountLowerBound({parts,stocks,kerf:0,trim:0});
assert.equal(boundFor(tall,[stock(0,10,10)]).method,'half-span');
assert.equal(boundFor(tall,[stock(0,10,10)]).lowerBound,2);
assert.equal(boundFor(tall.map(p=>({...p,rotate:true})),[stock(0,10,10)]).lowerBound,1);
assert.equal(boundFor(tall,[stock(0,10,10),stock(1,12,10)]).lowerBound,1);
assert.equal(boundFor(tall.map(p=>({...p,w:5})),[stock(0,10,10)]).lowerBound,1);
const data={parts:Array.from({length:25},(_,i)=>piece(i,60,60)),
 stocks:[stock(0,100,100,30)],kerf:0,trim:0,m3:1};
const solution=engine.optimize(data,true);
const audit=engine.auditCutPlan(solution,data);
const proof=engine.certifyStockCount(solution,data,audit);
assert.ok(audit.ok,'25-piece plan is valid');
assert.equal(solution.bins.length,25);
assert.equal(proof.lowerBound,25);
assert.equal(proof.proven,true);
assert.equal(proof.method,'geometric-incompatibility');
console.log('[PASS] 25-piece optimized output carries a valid geometric optimum certificate');
passed++;
console.log('All '+passed+' geometric-bound checks passed.');
