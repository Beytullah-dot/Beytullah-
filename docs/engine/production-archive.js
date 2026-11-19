/* Beythaus Cut — completed production PDF from immutable archived cuts.
   Does not use the currently open project or the live optimizer. */
(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 const number=n=>Number.isFinite(n)?new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(n):'—';
 const money=n=>Number.isFinite(n)?new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n):'Fiyat belirtilmedi';
 function cutSvg(bin){
  const stock=bin.stock;if(!(stock?.l>0&&stock?.w>0))throw Error('Arşivde stok ölçüleri yok');
  const scale=Math.min(460/stock.l,245/stock.w),w=stock.l*scale,h=stock.w*scale,
   X=x=>Number((x*scale).toFixed(3)),Y=y=>Number((y*scale).toFixed(3));
  let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+(w+10)+'" height="'+(h+10)+'" viewBox="-5 -5 '+(w+10)+' '+(h+10)+'">';
  svg+='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="#F1F5F0" stroke="#536B59" stroke-width="1"/>';
  for(const piece of bin.pieces||[]){
   svg+='<rect x="'+X(piece.x)+'" y="'+Y(piece.y)+'" width="'+X(piece.w)+'" height="'+Y(piece.h)+'" fill="#B4D0BC" stroke="#476451" stroke-width=".7"/>';
   if(X(piece.w)>20&&Y(piece.h)>10)svg+='<text x="'+X(piece.x+piece.w/2)+'" y="'+Y(piece.y+piece.h/2)+'" font-size="9" text-anchor="middle" fill="#23432B">'+esc(piece.label)+'</text>'
  }
  for(const cut of bin.cuts||[]){
   const src=cut.source;if(!src)continue;
   const vertical=cut.axis==='vertical',x1=vertical?cut.at:src.x,y1=vertical?src.y:cut.at,x2=vertical?cut.at:src.x+src.w,y2=vertical?src.y+src.h:cut.at;
   svg+='<line x1="'+X(x1)+'" y1="'+Y(y1)+'" x2="'+X(x2)+'" y2="'+Y(y2)+'" stroke="#8A5938" stroke-width="1.2" stroke-dasharray="3,3"/>'
  }
  return svg+'</svg>'
 }
 function createPdfDefinition(record){
  if(!record?.productionCompleted||!Array.isArray(record.planSnapshot?.bins))throw Error('Tamamlanmış üretim arşivi bulunamadı');
  const snap=record.planSnapshot,date=new Date(record.createdAt||Date.now()).toLocaleString('tr-TR');
  const content=[
   {text:'BEYTHAUS CUT  /  ÜRETİM ARŞİVİ',style:'brand'},
   {text:record.projectName||'Kesim projesi',style:'title'},
   {text:'Üretim kaydı: '+record.id+' · '+date,style:'muted'},
   {text:'Kesim payı: '+number(snap.kerf)+' mm · Kenar payı: '+number(snap.trim)+' mm',style:'muted'},
   {table:{widths:['*','*'],body:[
    ['Üretimde kullanılan stok değeri',money(record.grossStockCost)],
    ['Stoklanan kullanılabilir artık değeri',money(record.offcutBookValue)],
    ['Projenin malzeme maliyeti',money(record.materialCost)],
    ['Ek maliyet',money(record.extraCost||0)],
    ['Toplam proje maliyeti',money(record.totalCost)]
   ]},layout:'lightHorizontalLines',margin:[0,14,0,12]},
   {text:'Her çizgili kesim, kesildiği andaki alt dikdörtgenin karşı kenarına ulaşır. Makine ve bağlama koşullarını kullanıcı kontrol etmelidir.',style:'muted'}
  ];
  for(let i=0;i<snap.bins.length;i++){
   const bin=snap.bins[i],s=bin.stock;
   if(!(s?.l>0&&s?.w>0))throw Error('Arşiv stok ölçüsü eksik');
   content.push({text:'STOK '+(i+1)+' · '+(s.material||bin.material||'Malzeme'),style:'section',margin:[0,18,0,4]});
   content.push({text:number(s.l)+' × '+number(s.w)+' × '+number(s.t)+' mm'+(s.isRemnant?' · Önceki üretim artığı':''),style:'muted'});
   content.push({svg:cutSvg(bin),margin:[0,10,0,10]});
   content.push({text:'PARÇALAR',style:'subsection'});
   content.push({table:{headerRows:1,widths:['*',85,85,55],body:[
    ['Etiket','Ölçü (mm)','Konum (mm)','Döndü mü?'],
    ...(bin.pieces||[]).map(p=>[p.label,number(p.w)+' × '+number(p.h),number(p.x)+' / '+number(p.y),p.rotated?'Evet':'Hayır'])
   ]},layout:'lightHorizontalLines'});
   content.push({text:'KESİM SIRASI',style:'subsection',margin:[0,8,0,3]});
   content.push({table:{headerRows:1,widths:[40,70,'*'],body:[
    ['Adım','Yön','Aktif alt stok / Kesim konumu (mm)'],
    ...(bin.cuts||[]).map((c,k)=>[String(c.number||k+1),c.axis==='vertical'?'Düşey':'Yatay',
     (c.source?number(c.source.w)+' × '+number(c.source.h):'—')+' · '+number(c.at)])
   ]},layout:'lightHorizontalLines'})
  }
  return {pageSize:'A4',pageMargins:[40,40,40,45],content,
   styles:{brand:{fontSize:12,bold:true,color:'#315640'},title:{fontSize:20,bold:true,margin:[0,8,0,5]},
    muted:{fontSize:9,color:'#687E70'},section:{fontSize:12,bold:true,color:'#315640'},
    subsection:{fontSize:10,bold:true,margin:[0,4,0,4]}}}
 }
 const api=Object.freeze({version:1,cutSvg,createPdfDefinition});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.BeythausProductionArchive=api
})(typeof self!=='undefined'?self:typeof window!=='undefined'?window:globalThis);
