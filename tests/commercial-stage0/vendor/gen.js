'use strict';
const L=require('./lib.js');
// Seeded families of SMALL instances that the oracle can solve exactly.
// Seeds are deliberately unrelated to any seed used in the repository's tests.
function family(name,seed){
  const r=L.rng(seed);
  const kerf=name==='nokerf'?0:r.pick([1,1,2,3]),trim=r.pick([0,0,1,2]);
  const parts=[],stocks=[];
  const mats=name==='materials'?['panel|a','panel|b']:['panel|a'];
  const nSt=name==='hetero'||name==='materials'?r.int(2,3):r.int(1,2);
  for(let i=0;i<nSt;i++){
    const t=name==='thick'?r.pick([null,18,22]):null;
    stocks.push(L.mkStock(i,r.int(12,26),r.int(12,26),r.int(1,3),r.int(10,90),{material:r.pick(mats),t}));
  }
  const np=r.int(3,name==='dense'?7:6);
  for(let i=0;i<np;i++){
    const o={material:r.pick(mats)};
    if(name==='grain'){o.grain=r.pick(['','','length','width']);o.rotate=r.pick([true,true,false]);}
    else o.rotate=r.int(0,3)>0;
    if(name==='thick')o.t=r.pick([null,18,22]);
    parts.push(L.mkPart(i,r.int(2,14),r.int(2,14),o));
  }
  // ensure at least one stock per used material
  for(const m of new Set(parts.map(p=>p.material)))if(!stocks.some(s=>s.material===m))stocks[0].material=m;
  return L.mkData(parts,stocks,kerf,trim);
}
// "tight" planted family: stock is exactly the guillotine tree of the parts (feasible by construction)
function planted(seed,_tries=0){
  const r=L.rng(seed),kerf=r.pick([1,2,3]),trim=r.pick([0,1,2]);
  const W=r.int(14,26),H=r.int(14,26),parts=[];
  (function rec(w,h,d){
    if(parts.length>=6||d>3||(w<5&&h<5)||(d>0&&r.int(0,3)===0)){parts.push([w,h]);return}
    const vert=w>=h?r.int(0,3)>0:r.int(0,3)===0,tot=vert?w:h;
    if(tot<2*2+kerf){parts.push([w,h]);return}
    const a=r.int(2,tot-kerf-2);
    if(vert){rec(a,h,d+1);rec(w-a-kerf,h,d+1)}else{rec(w,a,d+1);rec(w,h-a-kerf,d+1)}
  })(W,H,0);
  if(parts.length>7&&_tries<50)return planted(seed+1000003,_tries+1);
  const P=parts.map(([w,h],i)=>L.mkPart(i,w,h,{rotate:r.int(0,1)===1}));
  const stocks=[L.mkStock(0,W+2*trim,H+2*trim,1,30)];
  stocks.push(L.mkStock(1,W+2*trim+r.int(0,3),H+2*trim+r.int(0,3),r.int(1,2),r.int(20,60)));
  return L.mkData(P,stocks,kerf,trim);
}
module.exports={family,planted,names:['generic','nokerf','hetero','grain','materials','thick','dense','planted']};
