/* Beythaus Cut — background exact search for FREE rectangular nesting.
   No DOM access. The main thread audits every returned candidate geometrically.
   'infeasible' is used as proof only when every search branch was exhausted.
   Time/node exhaustion => 'unknown', NEVER a proof. */
'use strict';
const context=typeof self!=='undefined'?self:null;
const canon=s=>String(s||'').trim().toLocaleLowerCase('tr-TR');
const EPS=1e-7;
const orientations=p=>p.rotate&&Math.abs(p.l-p.w)>EPS?
 [[p.l,p.w,false],[p.w,p.l,true]]:[[p.l,p.w,false]];
const compatible=(p,s)=>canon(p.material)===canon(s.material)&&
 (p.t===null||(s.t!==null&&Math.abs(p.t-s.t)<1e-6));
function feasible(parts,stockTypes,limit,cfg,deadline,maxNodes){
 const started=Date.now(),kerf=cfg.kerf,trim=cfg.trim;
 let nodes=0,interrupted=false,layout=null;
 const finish=status=>({status,nodes,elapsedMs:Date.now()-started,layout});
 const types=stockTypes.filter(s=>s.qty>0&&s.l>2*trim&&s.w>2*trim).map(s=>({
  stock:s,W:s.l-2*trim,H:s.w-2*trim,area:(s.l-2*trim)*(s.w-2*trim)
 }));
 if(limit<1||!types.length)return finish('infeasible');
 const canUse=(part,type)=>compatible(part,type.stock);
 if(parts.some(p=>!types.some(t=>canUse(p,t)&&
    orientations(p).some(([w,h])=>w<=t.W+EPS&&h<=t.H+EPS))))
  return finish('infeasible');
 const total=parts.reduce((n,p)=>n+p.l*p.w,0);
 const capacity=types.flatMap(t=>Array.from({length:Math.min(limit,t.stock.qty)},()=>t.area))
  .sort((a,b)=>b-a).slice(0,limit).reduce((a,b)=>a+b,0);
 if(total>capacity+EPS)return finish('infeasible');
 const sorted=parts.map((p,i)=>({...p,_index:i}))
  .sort((a,b)=>b.l*b.w-a.l*a.w||Math.max(b.l,b.w)-Math.max(a.l,a.w)||a._index-b._index);
 const n=sorted.length,open=[],usage=types.map(()=>0);
 function tick(){
  nodes++;
  if(nodes>maxNodes||(nodes%128===0&&Date.now()>=deadline)){interrupted=true;return false}
  return true
 }
 function coords(board){
  const X=new Array(n).fill(0),Y=new Array(n).fill(0),count=board.pieces.length;
  function relax(edges,values){
   let changed=false;
   for(let i=0;i<count;i++){
    changed=false;
    for(const e of edges){
     const next=values[e.from]+e.distance;
     if(next>values[e.to]+EPS){values[e.to]=next;changed=true}
    }
    if(!changed)break
   }
   return !changed
  }
  if(!relax(board.xEdges,X)||!relax(board.yEdges,Y))return null;
  if(board.pieces.some(p=>X[p.index]+p.w>board.type.W+EPS||
     Y[p.index]+p.h>board.type.H+EPS))return null;
  return {X,Y}
 }
 function done(){
  const result=[];
  for(const board of open){
   const pos=coords(board);
   if(!pos)return false;
   result.push({stock:board.type.stock,pieces:board.pieces.map(p=>({
    ...p.source,x:trim+pos.X[p.index],y:trim+pos.Y[p.index],
    w:p.w,h:p.h,rotated:p.rotated
   }))})
  }
  layout=result;
  return true
 }
 function add(board,piece,index,w,h,rotated){
  if(board.area+w*h>board.type.area+EPS)return false;
  const prev=board.pieces.slice();
  board.pieces.push({source:piece,index,w,h,rotated});
  board.area+=w*h;
  function separate(j){
   if(!tick())return false;
   if(j===prev.length)return place(index+1);
   const q=prev[j],choices=[
    [board.xEdges,{from:q.index,to:index,distance:q.w+kerf}],
    [board.xEdges,{from:index,to:q.index,distance:w+kerf}],
    [board.yEdges,{from:q.index,to:index,distance:q.h+kerf}],
    [board.yEdges,{from:index,to:q.index,distance:h+kerf}]
   ];
   for(const [edges,e]of choices){
    edges.push(e);
    const okay=coords(board);
    if(okay&&separate(j+1))return true;
    edges.pop();
    if(interrupted)return false
   }
   return false
  }
  const found=separate(0);
  board.pieces.pop();board.area-=w*h;
  return found
 }
 function place(index){
  if(!tick())return false;
  if(index===n)return done();
  const piece=sorted[index];
  for(const [w,h,rotated]of orientations(piece)){
   for(const board of open){
    if(interrupted)return false;
    if(!canUse(piece,board.type)||w>board.type.W+EPS||h>board.type.H+EPS)continue;
    if(add(board,piece,index,w,h,rotated))return true
   }
   if(open.length>=limit)continue;
   for(let t=0;t<types.length;t++){
    if(interrupted)return false;
    const type=types[t];
    if(usage[t]>=type.stock.qty||!canUse(piece,type)||
       w>type.W+EPS||h>type.H+EPS)continue;
    const board={type,pieces:[],xEdges:[],yEdges:[],area:0};
    open.push(board);usage[t]++;
    const found=add(board,piece,index,w,h,rotated);
    open.pop();usage[t]--;
    if(found)return true
   }
  }
  return false
 }
 const found=place(0);
 return finish(found?'feasible':interrupted?'unknown':'infeasible')
}

function run(job){
 const started=Date.now(),budget=Math.min(4500,Math.max(500,job.timeBudgetMs||3200));
 const deadline=started+budget,maxNodes=Math.min(600000,Math.max(20000,job.maxNodes||220000));
 const finish=(status,groups,nodes,reason='')=>({
  type:'finished',requestId:job.requestId,status,groups,nodes,
  elapsedMs:Date.now()-started,reason,mode:job.mode
 });
 if(job.mode!=='nest')return finish('skipped',[],0,'Düz kesim için kesin Worker araması henüz etkin değil.');
 const data=job.data;
 if(!data||!Array.isArray(data.parts)||!Array.isArray(data.stocks)||
    !Array.isArray(job.incumbentBins)||!Array.isArray(job.bounds))
  return finish('skipped',[],0,'Eksik proje verisi.');
 const grouped=new Map(),byStock=new Map(data.stocks.map(s=>[s.id,s]));
 for(const p of data.parts){
  const key=canon(p.material);
  if(!grouped.has(key))grouped.set(key,[]);
  grouped.get(key).push(p)
 }
 const boundMap=new Map(job.bounds.map(x=>[canon(x.material),x.lowerBound]));
 let nodes=0,allProven=true;
 const groups=[];
 for(const [key,parts]of grouped){
  const stocks=data.stocks.filter(s=>canon(s.material)===key&&s.qty>0);
  const existing=job.incumbentBins.filter(b=>canon(b.material)===key);
  const incumbent=existing.length;
  const lower=boundMap.get(key);
  const g={material:key,status:'skipped',proven:false,initialCount:incumbent,
   bestCount:incumbent,lowerBound:lower,nodes:0,checked:[],layout:null};
  groups.push(g);
  if(!Number.isInteger(lower)||lower<1||!Number.isInteger(incumbent)||incumbent<lower){
   g.status='invalid-bound';allProven=false;continue
  }
  if(incumbent===lower){g.status='bound';g.proven=true;continue}
  if(parts.length>12||stocks.length>4||incumbent>6||incumbent<2){
   g.status='scope-limited';allProven=false;continue
  }
  if(Date.now()>=deadline||nodes>=maxNodes){
   g.status='limit';allProven=false;continue
  }
  let groupProven=true;
  for(let target=lower;target<incumbent;target++){
   if(Date.now()>=deadline||nodes>=maxNodes){g.status='limit';groupProven=false;break}
   const checked=feasible(parts,stocks,target,data,deadline,maxNodes-nodes);
   g.checked.push({boards:target,status:checked.status,nodes:checked.nodes});
   g.nodes+=checked.nodes;nodes+=checked.nodes;
   if(checked.status==='infeasible')continue;
   if(checked.status==='feasible'){
    g.status='improved';g.proven=true;g.bestCount=checked.layout.length;
    g.layout=checked.layout;break;
   }
   g.status='limit';groupProven=false;break
  }
  if(g.status==='skipped'){g.status='proved';g.proven=true}
  if(!groupProven)allProven=false;
  if(g.status==='improved'&&g.layout.length>=incumbent){
   g.proven=false;g.status='invalid-result';allProven=false
  }
 }
 return finish(allProven?'optimal':'partial',groups,nodes)
}
if(context){
 context.onmessage=e=>{
  const id=e.data?.requestId;
  try{
   if(e.data?.type!=='solve')return;
   const result=run(e.data);
   context.postMessage(result)
  }catch(error){
   context.postMessage({type:'error',requestId:id,
    message:'Kesin arama çalıştırılamadı: '+String(error?.message||error)})
  }
 };
}
