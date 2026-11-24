'use strict';
const L=require('./lib.js');
// Larger jobs: 1-3 distinct part types, 6-70 copies, 1-3 stock types, scarce qty, positive kerf mostly.
function big(seed,opt={}){
  const r=L.rng(seed),K=opt.K||r.int(1,3),kerf=r.pick([0,2,2,3,3,4]),trim=r.pick([0,0,1,2]);
  const dim=K===3?24:34;
  const nSt=r.int(1,3),stocks=[];
  for(let i=0;i<nSt;i++)stocks.push(L.mkStock(i,r.int(Math.floor(dim*0.7),dim)+2*trim,r.int(Math.floor(dim*0.7),dim)+2*trim,r.int(1,6),r.int(20,120)));
  const parts=[];let id=0;
  const maxCopies=K===3?12:r.int(8,40);
  for(let t=0;t<K;t++){
    const l=r.int(3,Math.floor(dim*0.55)),w=r.int(3,Math.floor(dim*0.55)),c=r.int(2,maxCopies),rot=r.pick([true,true,false]);
    for(let j=0;j<c;j++)parts.push(L.mkPart(id++,l,w,{rotate:rot,grain:opt.grain?r.pick(['','length','width']):''}));
  }
  return L.mkData(parts,stocks,kerf,trim);
}
module.exports={big};
