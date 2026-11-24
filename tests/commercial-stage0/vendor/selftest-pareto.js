'use strict';
// cross-check the Pareto oracle against the exact subset oracle on instances with duplicate parts
const L=require('./lib.js'),P=require('./pareto.js');
const r=L.rng(0xABCD1234);let bad=0,n=0;
for(let it=0;it<150;it++){
  const kerf=r.pick([0,1,2]),trim=r.pick([0,1]);
  const stocks=[];for(let i=0;i<r.int(1,2);i++)stocks.push(L.mkStock(i,r.int(10,20),r.int(10,20),r.int(1,3),r.int(5,40)));
  const types=[];for(let i=0;i<r.int(1,2);i++)types.push([r.int(2,8),r.int(2,8),r.int(0,3)>0,r.int(1,4)]);
  const parts=[];let id=0;for(const [l,w,rot,c] of types)for(let j=0;j<c;j++)parts.push(L.mkPart(id++,l,w,{rotate:rot}));
  if(parts.length>8)continue;
  const data=L.mkData(parts,stocks,kerf,trim);n++;
  for(const sl of ['relaxed','strict']){
    const a=L.oracle(data,{sliver:sl}),b=P.solve(data,{sliver:sl});
    for(const k of ['count','area','cost'])if((a[k]??null)!==(b[k]??null)&&Math.abs((a[k]??-1)-(b[k]??-1))>1e-9){bad++;console.log('MISMATCH',sl,k,a[k],b[k],JSON.stringify(data));break}
  }
}
console.log({n,bad});
