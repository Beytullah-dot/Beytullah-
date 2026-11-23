'use strict';
/* Exact oracle for LARGER jobs made of at most 3 distinct part types (many copies each).
 * F_s(w,h) = Pareto set of count vectors placeable by a full-edge guillotine pattern (kerf k) in a w x h rectangle.
 * Then an exact covering DP over sheet instances gives the true minimum count / gross area / cost.
 */
const L=require('./lib.js');
function paretoPrune(list){ // keep maximal vectors
  list.sort((a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return b[i]-a[i];return 0});
  const out=[];
  for(const v of list){ if(!out.some(u=>u.every((x,i)=>x>=v[i])))out.push(v); }
  return out;
}
function frontier(types,demand,W,H,k,sliver,ti){ // types: [{a,b options:[[w,h]]}], returns Map via 2D array
  const m=demand.length,F=Array.from({length:W+1},()=>new Array(H+1).fill(null));
  const cap=v=>v.map((x,i)=>Math.min(x,demand[i]));
  for(let w=0;w<=W;w++)for(let h=0;h<=H;h++){
    let cand=[new Array(m).fill(0)];
    for(let i=0;i<m;i++){
      for(const [a,b] of types[i].opts[ti]){
        if(a>w||b>h)continue;
        if(sliver==='strict'&&!((w===a||w-a>=k)&&(h===b||h-b>=k)))continue;
        const v=new Array(m).fill(0);v[i]=1;cand.push(v);break;
      }
    }
    for(const vert of [true,false]){
      const tot=vert?w:h;
      for(let a=1;a+k+1<=tot;a++){
        const b=tot-a-k; if(a>b)break; // commutative
        const A=vert?F[a][h]:F[w][a],B=vert?F[b][h]:F[w][b];
        for(const x of A)for(const y of B)cand.push(cap(x.map((q,i)=>q+y[i])));
      }
    }
    F[w][h]=paretoPrune(cand);
  }
  return F[W][H];
}
function solve(data,{sliver='relaxed'}={}){
  // data.parts grouped into types by (l,w,rotate,grain,material,t)
  const key=p=>[p.l,p.w,p.rotate!==false,p.grain||'',p.material,p.t].join('|');
  const groups=new Map();for(const p of data.parts){const k=key(p);if(!groups.has(k))groups.set(k,{p,n:0});groups.get(k).n++}
  const types=[...groups.values()];if(types.length>3)throw new Error('<=3 types');
  const stocks=data.stocks.filter(s=>s.qty>0&&s.l-2*data.trim>0&&s.w-2*data.trim>0);
  const demand=types.map(t=>t.n);
  for(const t of types)t.opts=stocks.map(s=>L.compat(t.p,s)?L.orientations(t.p).map(([a,b])=>[a,b]):[]);
  const fr=stocks.map((s,ti)=>frontier(types,demand,s.l-2*data.trim,s.w-2*data.trim,data.kerf,sliver,ti));
  const inst=[];stocks.forEach((s,ti)=>{for(let c=0;c<Math.min(s.qty,demand.reduce((a,b)=>a+b,0));c++)inst.push(ti)});
  const out={feasible:false};
  const dims=demand.map(d=>d+1),size=dims.reduce((a,b)=>a*b,1);
  const enc=r=>{let x=0;for(let i=0;i<r.length;i++)x=x*dims[i]+r[i];return x};
  const dec=x=>{const r=new Array(dims.length);for(let i=dims.length-1;i>=0;i--){r[i]=x%dims[i];x=Math.floor(x/dims[i])}return r};
  const prices=stocks.map(s=>L.stockPrice(s,data.m3));
  for(const name of ['count','area','cost']){
    if(name==='cost'&&stocks.some((s,i)=>prices[i]===null)){out.cost=null;continue}
    const unit=ti=>name==='count'?1:name==='area'?stocks[ti].l*stocks[ti].w:prices[ti];
    let best=new Float64Array(size).fill(Infinity);best[0]=0; // best cost to cover remaining demand r (index 0 = nothing left)
    // process instances; best_i[r]=min(best_{i+1}[r], min_v unit+best_{i+1}[r-v])
    const all=[];for(let x=0;x<size;x++)all.push(dec(x));
    for(let q=inst.length-1;q>=0;q--){
      const ti=inst[q],nb=new Float64Array(size).fill(Infinity),u=unit(ti);
      for(let x=0;x<size;x++){
        let v0=best[x];const r=all[x];
        for(const v of fr[ti]){const rr=r.map((z,i)=>Math.max(0,z-v[i]));const c=u+best[enc(rr)];if(c<v0)v0=c}
        nb[x]=v0;
      }
      best=nb;
    }
    const r=best[enc(demand)];
    out[name]=isFinite(r)?r:null;if(isFinite(r))out.feasible=true;
  }
  return out;
}
module.exports={solve};
