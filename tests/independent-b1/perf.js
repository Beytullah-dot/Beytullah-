'use strict';
const L=require('./lib.js');
const [,, nS='200', seedS='1', objS='area']=process.argv;const N=+nS,seed=+seedS;
const r=L.rng(seed);
const mats=['panel|mdflam-18','panel|mdflam-8','panel|sunta-18'];
const stocks=[];let si=0;
for(const m of mats){stocks.push(L.mkStock(si++,2800,2070,+(process.env.QTY||60),1500,{material:m}));stocks.push(L.mkStock(si++,2440,1220,+(process.env.QTY||60),800,{material:m}))}
const parts=[];
for(let i=0;i<N;i++){const m=r.pick(mats);parts.push(L.mkPart(i,r.int(80,1400),r.int(60,900),{material:m,rotate:r.int(0,4)>0,grain:r.int(0,5)===0?'length':''}))}
const data=L.mkData(parts,stocks,4,10);
const {engine}=L.loadEngine();
const t0=Date.now();let plan,err;
try{plan=engine.optimize(JSON.parse(JSON.stringify(data)),true,false,objS==='area'?'area':'economic')}catch(e){err=String(e.stack).slice(0,300)}
const ms=Date.now()-t0;
if(err){console.log(JSON.stringify({N,seed,err}));process.exit(0)}
const v=L.verifyPlan(data,plan);
const partArea=parts.reduce((a,p)=>a+p.l*p.w,0);
const usable=plan.bins.reduce((a,b)=>a+(b.stock.l-20)*(b.stock.w-20),0);
// simple area lower bound per material using cheapest-area-per-usable stock
console.log(JSON.stringify({N,seed,obj:objS,ms,rssMB:Math.round(process.resourceUsage().maxRSS/1024),valid:v.ok,errs:v.errors.slice(0,2),complete:v.complete,sheets:v.count,unplaced:plan.unplaced.length,grossArea:v.area,utilPct:+(partArea/v.area*100).toFixed(1),utilUsablePct:+(partArea/usable*100).toFixed(1)}));
