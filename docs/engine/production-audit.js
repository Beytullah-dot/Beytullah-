/* Beythaus Cut / Engine Panel 02 — independent cut-plan protection.
 * Source-of-truth for geometric placement and guillotine cut-tree auditing.
 * No dependence on packing heuristics, proof solver, DOM, PDF or storage.
 *
 * A cut is valid only if its line spans the entire CURRENT subrectangle.
 * Every placed piece and residual leaf must be accounted for.
 */
(function(root){
'use strict';
const CONTRACT_VERSION=1;
function createAudit({getState,mkey}={}){
 if(typeof getState!=='function'||typeof mkey!=='function')
  throw new TypeError('Audit requires getState and material key function');
 // Dynamic read avoids holding on to the previously selected project.
 const state=new Proxy(Object.create(null),{
  get(_target,key){const project=getState();return project==null?undefined:project[key]},
  set(){throw new TypeError('Auditor must not mutate project settings')}
 });
// Verify the exterior blade footprint with an independent x-slab / y-interval
// cover of earlier kerf gaps. Coordinates outside trimmed stock are allowed.
function overhangIsClear(spill, root, gaps, tolerance){
 const left=Math.max(spill.x,root.x),right=Math.min(spill.x+spill.w,root.x+root.w);
 const top=Math.max(spill.y,root.y),bottom=Math.min(spill.y+spill.h,root.y+root.h);
 if(right-left<=tolerance||bottom-top<=tolerance)return true;
 const xs=[left,right];
 for(const gap of gaps){
  if(gap.x>left&&gap.x<right)xs.push(gap.x);
  if(gap.x+gap.w>left&&gap.x+gap.w<right)xs.push(gap.x+gap.w);
 }
 xs.sort((a,b)=>a-b);
 for(let i=1;i<xs.length;i++){
  if(xs[i]-xs[i-1]<=tolerance)continue;
  const x=(xs[i]+xs[i-1])/2;
  const intervals=gaps.filter(g=>g.x<=x&&g.x+g.w>=x)
   .map(g=>[Math.max(top,g.y),Math.min(bottom,g.y+g.h)]).filter(g=>g[1]>g[0])
   .sort((a,b)=>a[0]-b[0]);
  let reached=top;
  for(const [from,to] of intervals){
   if(from>reached+tolerance)break;
   reached=Math.max(reached,to);
  }
  if(reached<bottom-tolerance)return false;
 }
 return true;
}
function auditGuillotineCuts(bin,cfg){
 const errors=[],tol=1e-5,eq=(a,b)=>Math.abs(a-b)<=tol;
 const leaves=[{x:cfg.trim,y:cfg.trim,w:bin.stock.l-2*cfg.trim,h:bin.stock.w-2*cfg.trim}];
 const usable={...leaves[0]},gaps=[];
 const narrow=cfg.allowNarrowScrapCuts===true;
 const same=(a,b)=>eq(a.x,b.x)&&eq(a.y,b.y)&&eq(a.w,b.w)&&eq(a.h,b.h);
 function issue(msg){if(errors.length<10)errors.push(msg)}
 if(!Array.isArray(bin.cuts)){issue('Kesim adımları eksik.');return errors}
 for(let j=0;j<bin.cuts.length;j++){
  const c=bin.cuts[j],p=c.source;if(!p||!['vertical','horizontal'].includes(c.axis)){issue('Kesim kaydı geçersiz.');continue}
  const ix=leaves.findIndex(x=>same(x,p));if(ix<0){issue('Adım '+(j+1)+': kaynak parça bulunamadı.');continue}
  const source=leaves.splice(ix,1)[0],vertical=c.axis==='vertical',at=c.at,k=cfg.kerf;
  if(!(Number.isFinite(at)&&c.number===j+1)){issue('Adım numarası veya kesim yeri geçersiz.');continue}
  if(vertical?!(eq(c.x1,at)&&eq(c.x2,at)&&eq(c.y1,p.y)&&eq(c.y2,p.y+p.h)):!(eq(c.y1,at)&&eq(c.y2,at)&&eq(c.x1,p.x)&&eq(c.x2,p.x+p.w))){
   issue('Adım '+(j+1)+': kesim kaynağın tamamını geçmiyor.')
  }
  const before=(vertical?at-p.x:at-p.y)-k/2,after=(vertical?p.x+p.w-at:p.y+p.h-at)-k/2;
  const total=vertical?p.w:p.h,overhang=after < -tol;
  // A positive terminal scrap may be smaller than kerf. Zero scrap must not
  // cause a cut; ordinary full-kerf cuts retain the existing behavior.
  if(before<-tol||before>=total-tol||overhang&&!narrow){
   issue('Adım '+(j+1)+': dar artık kesimine izin yok veya artık sıfır.');continue
  }
  if(overhang!==(c.overhang===true)){issue('Taşma işareti kesim geometrisiyle uyuşmuyor.');continue}
  if(overhang){
   const spill=vertical?{x:p.x+p.w,y:p.y,w:-after,h:p.h}:
    {x:p.x,y:p.y+p.h,w:p.w,h:-after};
   const blade=vertical?{x:at-k/2,y:p.y,w:k,h:p.h}:{x:p.x,y:at-k/2,w:p.w,h:k};
   const touches=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>tol&&
    Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>tol;
   if(-after>=k-tol||!overhangIsClear(spill,usable,gaps,tol)||
      leaves.some(leaf=>touches(spill,leaf))||bin.placed.some(piece=>touches(blade,piece))){
    issue('Taşan testere komşu parçaya veya kesilmemiş serbest alana ulaşıyor.');continue
   }
  }
  const consumed=Math.max(0,Math.min(k,total-before));
  if(consumed>tol)gaps.push(vertical?{x:p.x+before,y:p.y,w:consumed,h:p.h}:
   {x:p.x,y:p.y+before,w:p.w,h:consumed});
  if(vertical){
   if(before>tol)leaves.push({x:p.x,y:p.y,w:before,h:p.h});
   if(after>tol)leaves.push({x:at+k/2,y:p.y,w:after,h:p.h});
  }else{
   if(before>tol)leaves.push({x:p.x,y:p.y,w:p.w,h:before});
   if(after>tol)leaves.push({x:p.x,y:at+k/2,w:p.w,h:after});
  }
 }
 for(const piece of bin.placed){
  const ix=leaves.findIndex(x=>same(x,piece));
  if(ix<0)issue('Kesim adımları '+piece.label+' parçasını oluşturmuyor.');
  else leaves.splice(ix,1);
 }
 for(const fr of bin.free){
  const ix=leaves.findIndex(x=>same(x,fr));
  if(ix<0)issue('Kalan stok dikdörtgeni kesim ağacıyla uyuşmuyor.');
  else leaves.splice(ix,1);
 }
 if(leaves.length)issue('Kesim ağacında sınıflandırılmayan parçalar mevcut.');
 return errors
}

function validateLayout(r,cfg){const problems=[];const stockUse={};for(const b of r.bins){stockUse[b.stock.id]=(stockUse[b.stock.id]||0)+1;const eps=1e-5;for(let i=0;i<b.placed.length;i++){const p=b.placed[i];if(p.t!==null&&(b.stock.t===null||Math.abs(p.t-b.stock.t)>1e-6))problems.push('Parça ve stok kalınlığı eşleşmiyor.');if(p.x<cfg.trim-eps||p.y<cfg.trim-eps||p.x+p.w>b.stock.l-cfg.trim+eps||p.y+p.h>b.stock.w-cfg.trim+eps)problems.push('Parça stok sınırının dışında.');for(let j=i+1;j<b.placed.length;j++){const v=b.placed[j],gap=cfg.kerf-1e-6;if(p.x<v.x+v.w+gap&&p.x+p.w+gap>v.x&&p.y<v.y+v.h+gap&&p.y+p.h+gap>v.y){ // Only reject if overlap in both axes after kerf inflation: for diagonal corners, a shared kerf rectangle is not always required.
const dx=Math.min(p.x+p.w,v.x+v.w)-Math.max(p.x,v.x),dy=Math.min(p.y+p.h,v.y+v.h)-Math.max(p.y,v.y);if(dx>eps&&dy>-gap||dy>eps&&dx>-gap||dx>eps&&dy>eps)problems.push('Parçalar arasında testere payı eksik.')}}}}for(const b of r.bins)if(stockUse[b.stock.id]>b.stock.qty)problems.push('Stok miktarı aşıldı.');return[...new Set(problems)]}

// Independent cut-plan verification. Never relies on the packer's free rectangles.
function auditCutPlan(result,data){
 const issues=[],parts=new Map(),stocks=new Map(),seen=new Set(),usage=new Map(),eps=1e-5;
 const eq=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(eps,1e-9*Math.max(Math.abs(a),Math.abs(b)));
 const error=m=>{if(issues.length<25)issues.push(m)};
 for(const p of data.parts){if(parts.has(p.id))error('Kaynak parça kimliği tekrar ediyor.');parts.set(p.id,p)}
 for(const stock of data.stocks){if(stocks.has(stock.id))error('Stok kimliği tekrar ediyor.');stocks.set(stock.id,stock)}
 if(!result||!Array.isArray(result.bins)||!Array.isArray(result.unplaced)){
  error('Yerleşim sonucu eksik.');return {ok:false,issues,checkedParts:0}
 }
 let count=0,area=0,totalStockArea=0;
 for(let index=0;index<result.bins.length;index++){
  const bin=result.bins[index],board=bin?.stock,stock=stocks.get(board?.id);
  if(!stock){error('Stok '+(index+1)+' kaynak listesinde yok.');continue}
  usage.set(stock.id,(usage.get(stock.id)||0)+1);totalStockArea+=stock.l*stock.w;
  if(!Array.isArray(bin.placed)||!bin.placed.length){error('Boş stok yerleşimi.');continue}
  if(state.mode==='guillotine')for(const msg of auditGuillotineCuts(bin,{trim:data.trim,kerf:data.kerf,allowNarrowScrapCuts:data.allowNarrowScrapCuts}))error(msg);
  if(!eq(board.l,stock.l)||!eq(board.w,stock.w)||mkey(board.material)!==mkey(stock.material)||
   (board.t===null)!==(stock.t===null)||(board.t!==null&&!eq(board.t,stock.t)))error('Stok boyutları değişmiş.');
  for(const piece of bin.placed){
   count++;
   const original=parts.get(piece.id);
   if(!original){error('Bilinmeyen parça: '+piece.id);continue}
   if(seen.has(piece.id))error('Parça tekrarlanıyor: '+piece.label);
   seen.add(piece.id);
   if([piece.x,piece.y,piece.w,piece.h].some(v=>!Number.isFinite(v))||!(piece.w>0&&piece.h>0)){error('Geçersiz parça koordinatı: '+piece.label);continue}
   area+=piece.w*piece.h;
   const straight=eq(piece.w,original.l)&&eq(piece.h,original.w);
   const rotated=original.rotate&&eq(piece.w,original.w)&&eq(piece.h,original.l);
   if(!((!piece.rotated&&straight)||(piece.rotated&&rotated)))error('Parça ölçüsü veya dönüşü değişmiş: '+piece.label);
   if(mkey(piece.material)!==mkey(original.material)||mkey(piece.material)!==mkey(stock.material))error('Malzeme eşleşmiyor: '+piece.label);
    if(root.BeythausMaterialPolicy&&!root.BeythausMaterialPolicy.grainAllows(original,stock,!!piece.rotated))error('Damar yönü eşleşmiyor: '+piece.label);
   if((original.t===null)!==(piece.t===null)||(original.t!==null&&!eq(original.t,piece.t)))error('Parça kalınlığı değişmiş: '+piece.label);
   if(original.t!==null&&(stock.t===null||!eq(original.t,stock.t)))error('Stok kalınlığı eşleşmiyor: '+piece.label);
   if(piece.x<data.trim-eps||piece.y<data.trim-eps||piece.x+piece.w>stock.l-data.trim+eps||piece.y+piece.h>stock.w-data.trim+eps)error('Kenar veya stok sınırı ihlali: '+piece.label);
  }
  // Exact kerf-clearance condition for axis-aligned rectangular placements.
  for(let i=0;i<bin.placed.length;i++)for(let j=i+1;j<bin.placed.length;j++){
   const a=bin.placed[i],b=bin.placed[j],k=data.kerf;
   if([a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h].some(v=>!Number.isFinite(v)))continue;
   const separated=a.x+a.w+k<=b.x+eps||b.x+b.w+k<=a.x+eps||a.y+a.h+k<=b.y+eps||b.y+b.h+k<=a.y+eps;
   if(!separated)error('Parçalar çakışıyor / testere payı eksik: '+a.label+' / '+b.label)
  }
 }
 for(const piece of result.unplaced){
  if(!parts.has(piece.id)){error('Yerleşmeyen parça tanımsız.');continue}
  if(seen.has(piece.id))error('Parça hem yerleşmiş hem yerleşmemiş: '+piece.label);
  seen.add(piece.id)
 }
 for(const [id,stock]of stocks)if((usage.get(id)||0)>stock.qty)error('Stok adedi aşıldı: '+stock.material);
 if(seen.size!==parts.size)error('Eksik veya kaybolan parça var.');
 if(result.placedCount!==count)error('Parça sayısı tutarsız.');
 if(!eq(result.partArea,area))error('Parça alanı tutarsız.');
 if(!eq(result.stockArea,totalStockArea))error('Stok alanı tutarsız.');
 return {ok:issues.length===0,issues,checkedParts:count,checkedStocks:result.bins.length,costComplete:result.unknownCostBins===0}
}



 return Object.freeze({auditGuillotineCuts,validateLayout,auditCutPlan});
}
root.BeythausCutProductionAudit=Object.freeze({contractVersion:CONTRACT_VERSION,createAudit});
})(typeof window!=='undefined'?window:globalThis);
