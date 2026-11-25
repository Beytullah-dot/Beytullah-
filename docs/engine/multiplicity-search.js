/* Bounded multiplicity-frontier candidate generator. No optimality claims.
 * Shape states carry real cut trees. Dominance/caps affect search quality only;
 * every materialized candidate must pass BOTH external physical validators.
 */
(function(root){
'use strict';
const EPS=1e-7, P=root.BeythausMaterialPolicy;
const dims=p=>JSON.stringify([p.l,p.w,p.material,p.t,p.category,p.grain,!!p.rotate]);
function solve(data,opts={}){
 const start=Date.now(),deadline=start+(opts.maxMs??1500),k=data.kerf,t=data.trim;
 const maxStates=opts.maxStates??12000,maxJoins=opts.maxJoins??400000;
 let nodes=0,states=0,limited=false;
 const groups=new Map();
 for(const p of data.parts){const key=dims(p);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p)}
 const types=[...groups.values()],K=types.length,N=data.parts.length;
 const result=plan=>({plan,nodes,states,elapsedMs:Date.now()-start,resourceExhausted:limited,proof:'none'});
 if(!K||K>3||![k,t].every(x=>Number.isFinite(x)&&x>=0))return result(null);
 const demand=types.map(g=>g.length),levels=Array.from({length:N+1},()=>[]),byCounts=new Map();
 const stocks=data.stocks.filter(s=>s.qty>0&&s.l>2*t&&s.w>2*t);
 const fits=(node,s)=>node.w<=s.l-2*t+EPS&&node.h<=s.w-2*t+EPS&&types.every((g,i)=>!node.q[i]||(g[0].material===s.material&&(g[0].t==null||s.t!=null&&Math.abs(g[0].t-s.t)<EPS)));
 function tick(){if(++nodes>maxJoins||states>=maxStates||(nodes%256===0&&Date.now()>=deadline)){limited=true;return false}return true}
 function insert(node){
  if(!stocks.some(s=>fits(node,s)))return;
  const key=node.q.join(','),front=byCounts.get(key)||[];
  // Retain one cut topology per identical bounding box; this is heuristic,
  // particularly in the strict terminal-slack model. Never an exact proof.
  if(front.some(x=>Math.abs(x.w-node.w)<EPS&&Math.abs(x.h-node.h)<EPS))return;
  if(front.length>=48)return;
  front.push(node);byCounts.set(key,front);levels[node.n].push(node);states++;
 }
 types.forEach((g,i)=>{
  const p=g[0];for(const rotated of p.rotate?[false,true]:[false]){
   if(P&&!P.grainAllows(p,null,rotated))continue;
   const q=demand.map(()=>0);q[i]=1;
   insert({q,n:1,w:rotated?p.w:p.l,h:rotated?p.l:p.w,type:i,rotated});
  }
 });
 outer:for(let n=2;n<=N;n++)for(let a=1;a<=Math.floor(n/2);a++){
  if(Date.now()>=deadline||states>=maxStates){limited=true;break outer}
  for(const x of levels[a])for(const y of levels[n-a]){
   if(!tick())break outer;
   const q=x.q.map((v,i)=>v+y.q[i]);if(q.some((v,i)=>v>demand[i]))continue;
   insert({q,n,w:x.w+k+y.w,h:Math.max(x.h,y.h),axis:'vertical',a:x,b:y});
   insert({q,n,w:Math.max(x.w,y.w),h:x.h+k+y.h,axis:'horizontal',a:x,b:y});
  }
 }
 // Materialize on the actual stock. Unequal child spans deliberately permit
 // terminal waste; strict and relaxed modes are checked at each real cut.
 function materialize(node,stock,available){
  const bin={stock,placed:[],cuts:[],free:[]};
  function take(r,axis,len){
   const vertical=axis==='vertical',span=vertical?r.w:r.h,delta=span-len;
   if(delta< -EPS)throw Error('fit');if(Math.abs(delta)<=EPS)return [r,null];
   if(delta<k-EPS&&data.allowNarrowScrapCuts!==true)throw Error('strict-tail');
   const after=Math.max(0,delta-k),at=(vertical?r.x:r.y)+len+k/2;
   bin.cuts.push({number:bin.cuts.length+1,source:{...r},axis,at,label:'Multiplicity candidate',
    ...(delta<k-EPS?{overhang:true}:{}),x1:vertical?at:r.x,y1:vertical?r.y:at,
    x2:vertical?at:r.x+r.w,y2:vertical?r.y+r.h:at});
   return [vertical?{...r,w:len}:{...r,h:len},after>EPS?(vertical?
    {...r,x:r.x+len+k,w:after}:{...r,y:r.y+len+k,h:after}):null];
  }
  const free=r=>{if(r&&r.w>EPS&&r.h>EPS)bin.free.push(r)};
  function walk(n,r){
   if(n.type!==undefined){
    const [a,right]=take(r,'vertical',n.w);free(right);
    const [leaf,bottom]=take(a,'horizontal',n.h);free(bottom);
    const p=available[n.type].pop();if(!p)throw Error('quantity');
    bin.placed.push({...p,...leaf,rotated:n.rotated});return;
   }
   const [a,b]=take(r,n.axis,n.axis==='vertical'?n.a.w:n.a.h);
   if(!b)throw Error('missing child');walk(n.a,a);walk(n.b,b);
  }
  walk(node,{x:t,y:t,w:stock.l-2*t,h:stock.w-2*t});return bin;
 }
 const objective=opts.objective||'area';
 const price=s=>P.stockPrice(s,{priceMode:opts.priceMode||'panel',m3:data.m3});
 const value=s=>objective==='count'?1:objective==='cost'?price(s):s.l*s.w;
 const patterns=[];
 for(const s of stocks)for(const front of byCounts.values())for(const n of front){
  if(Date.now()>=deadline+200){limited=true;break}
  if(!fits(n,s)||value(s)===null)continue;
  try{materialize(n,s,types.map(g=>g.slice()));patterns.push({s,n,v:value(s)})}catch{}
 }
 // Sparse quantity/stock-use frontier; partial covers survive until another
 // pattern completes them. Stock usage is part of the state, never discarded.
 const sid=new Map(stocks.map((s,i)=>[s.id,i]));
 let best=null,coverStates=0;
 const layers=Array.from({length:N+1},()=>new Map());
 layers[0].set('root',{q:demand.map(()=>0),use:stocks.map(()=>0),v:0,chosen:[]});
 outer:for(let n=0;n<N;n++)for(const c of layers[n].values())for(const p of patterns){
  if(++coverStates>80000||Date.now()>=deadline+500){limited=true;break outer}
  const si=sid.get(p.s.id);if(c.use[si]>=p.s.qty)continue;
  const q=c.q.map((v,i)=>v+p.n.q[i]);if(q.some((v,i)=>v>demand[i]))continue;
  const v=c.v+p.v;if(best&&v>best.v+EPS)continue;
  const use=c.use.slice();use[si]++;const chosen=c.chosen.concat(p),m=n+p.n.n;
  const next={q,use,v,chosen},key=q.join(',')+'|'+use.join(',');
  if(m===N){if(!best||v<best.v-EPS||Math.abs(v-best.v)<EPS&&chosen.length<best.chosen.length)best=next;continue}
  const prev=layers[m].get(key);if(!prev||v<prev.v)layers[m].set(key,next);
 }
 if(!best)return result(null);
 const available=types.map(g=>g.slice()),bins=best.chosen.map(p=>materialize(p.n,p.s,available));
 const costs=bins.map(b=>price(b.stock)),unknownCostBins=costs.filter(v=>v===null).length;
 return result({bins,unplaced:[],placedCount:N,partArea:data.parts.reduce((a,p)=>a+p.l*p.w,0),
  stockArea:bins.reduce((a,b)=>a+b.stock.l*b.stock.w,0),unknownCostBins,
  cost:unknownCostBins?null:costs.reduce((a,v)=>a+v,0)});
}
root.BeythausMultiplicitySearch={solve};
})(typeof window!=='undefined'?window:globalThis);
