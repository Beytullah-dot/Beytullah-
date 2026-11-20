/* Independent gross-area versus recorded-cost objective regression.
 * Same parts, same stocks: distinct global optima, physical guillotine trees.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../docs'),oracle=require('./optimization-oracle.cjs');
const ctx={last:null,postMessage(m){this.last=m}};
for(const file of ['guillotine-exact.js','economic-exact.js','optimization-worker.js'])
 new Function('self',fs.readFileSync(path.join(root,file),'utf8'))(ctx);
const parts=[0,1].map(i=>({id:'p'+i,l:50,w:100,t:18,
 material:'MDF',label:'P'+i,rotate:false,grain:'length'}));
const stocks=[
 {id:'large',l:100,w:100,t:18,qty:1,price:100,material:'MDF'},
 {id:'small',l:50,w:100,t:18,qty:2,price:25,material:'MDF'}
];
const data={parts,stocks,kerf:0,trim:0};
function run(objective){
 ctx.last=null;
 ctx.onmessage({data:{type:'economy',requestId:20,cutMode:'guillotine',
  objective,priceMode:'panel',data,
  incumbentBins:[{stockId:'large',material:'MDF'}],
  timeBudgetMs:4500,maxNodes:350000}});
 assert.equal(ctx.last?.type,'economy-finished');
 return ctx.last
}
const cost=run('cost'),area=run('area');
assert.equal(cost.status,'optimal');assert.equal(area.status,'optimal');
assert.equal(cost.objective,'cost');assert.equal(area.objective,'area');
assert.equal(cost.groups[0].bestCost,50);
assert.equal(cost.groups[0].bestCount,2);
assert.equal(cost.groups[0].proven,true);
assert.equal(area.groups[0].bestArea,10000);
assert.equal(area.groups[0].bestCount,1);
assert.equal(area.groups[0].proven,true);
assert.equal(area.groups[0].bestCost,null,'Area is not a cost certificate');
assert.equal(cost.groups[0].bestArea,null,'Cost is not an area certificate');
// Independent exhaustive stock combination reference, not Worker implementation.
const options=[];
for(let a=0;a<=1;a++)for(let b=0;b<=2;b++){
 const reference=oracle.solve({...data,stocks:[{...stocks[0],qty:a},{...stocks[1],qty:b}]},
  'guillotine',{maxNodes:200000});
 assert.notEqual(reference.status,'unknown');
 if(reference.status==='optimal')options.push({area:10000*a+5000*b,cost:100*a+25*b});
}
assert.equal(Math.min(...options.map(x=>x.area)),10000);
assert.equal(Math.min(...options.map(x=>x.cost)),50);
// Unknown stock price must block cost certification, never gross area.
const unknown={...data,stocks:[stocks[0],{...stocks[1],price:null}]};
function unknownRun(objective){
 ctx.last=null;ctx.onmessage({data:{type:'economy',requestId:21,cutMode:'guillotine',
 objective,priceMode:'panel',data:unknown,
 incumbentBins:[{stockId:'large',material:'MDF'}],
 timeBudgetMs:4500,maxNodes:350000}});
 return ctx.last
}
assert.equal(unknownRun('cost').groups[0].status,'unknown-price');
assert.equal(unknownRun('area').groups[0].proven,true);
console.log('Independent area/cost objectives: different physical optima, no cross-objective certificates, unknown price guard PASS');
