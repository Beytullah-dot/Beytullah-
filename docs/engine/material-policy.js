/* Beythaus Cut — material and stock policy.
   One source of truth for material identity, price semantics and grain.
   Valid in browser, workers and Node verification. */
(function(root){
 'use strict';
 const norm=s=>String(s??'').trim().toLocaleLowerCase('tr-TR');
 const category=v=>v==='masif'?'masif':'panel';
 const grain=v=>v==='length'||v==='width'?v:'';
 const materialKey=(kind,name)=>category(kind)+'|'+norm(name);
 const grainAllows=(part,stock,rotated)=>{
  const p=grain(part.grain),s=grain(stock.grain);
  if(!p||!s)return true;
  return (rotated?(p==='length'?'width':'length'):p)===s;
 };
 // Price is always the user's stock price, never a searched market quotation.
 // Existing records without priceUnit retain their old pricing contract only
 // until explicitly migrated by the workspace.
 const stockPrice=(stock,cfg={})=>{
  if(stock.isRemnant){
   return Number.isFinite(stock.bookValue)&&stock.bookValue>=0?stock.bookValue:null;
  }
  const unit=stock.priceUnit||cfg.priceMode;
  const price=Number(stock.price);
  if(unit==='panel')return Number.isFinite(price)&&price>0?price:null;
  if(unit==='m3'){
   const rate=stock.priceUnit?price:Number(cfg.m3);
   return stock.t!==null&&Number.isFinite(stock.t)&&stock.t>0&&
    Number.isFinite(rate)&&rate>0?stock.l*stock.w*stock.t/1e9*rate:null;
  }
  return null;
 };
 const nextGrain=current=>current==='width'?'length':current==='length'?'':'width';
 const grainSymbol=value=>grain(value)==='length'?'Ⅱ':grain(value)==='width'?'=':'';
 const grainName=value=>grain(value)==='length'?'Boy boyunca':grain(value)==='width'?'En boyunca':'Serbest';
 const policy={version:1,category,grain,materialKey,grainAllows,stockPrice,nextGrain,grainSymbol,grainName};
 if(typeof module!=='undefined'&&module.exports)module.exports=policy;
 root.BeythausMaterialPolicy=Object.freeze(policy);
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
