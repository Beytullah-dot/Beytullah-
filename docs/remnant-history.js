/* Beythaus Cut inventory movement history UI.
 * No external storage or telemetry; records are local to the browser.
 */
(()=>{'use strict';
const app=window.BeythausCut,$=id=>document.getElementById(id);
if(!app||!$('remnantHistoryOverlay'))return;
const names={created:'Üretimle oluştu',consumed:'Kullanıldı / tüketildi',
 restored:'Tekrar mevcut',moved:'Raf değişti',corrected:'Bilgisi düzeltildi',
 deleted:'Kayıt silindi',imported:'Yedekten eklendi'};
const sources={manual:'Elle',qr:'QR üzerinden',production:'Üretim onayı',backup:'Yedek aktarımı'};
const fields={l:'Boy',w:'En',t:'Kalınlık',material:'Malzeme',location:'Raf',
 notes:'Not',status:'Durum',projectName:'Proje'};
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=(x,key)=>x===null||x===undefined||x===''?'—':
 key==='status'?(x==='used'?'Kullanıldı':'Mevcut'):
 String(x)+(key==='l'||key==='w'||key==='t'?' mm':'');
let activePiece='';
function differences(e){
 const before=e.before||{},after=e.after||{};
 return Object.keys(fields).filter(k=>before[k]!==after[k]&&
  (Object.prototype.hasOwnProperty.call(before,k)||Object.prototype.hasOwnProperty.call(after,k)))
 .map(k=>fields[k]+': '+value(before[k],k)+' → '+value(after[k],k))
}
function filters(){
 return {pieceId:activePiece,query:$('remnantHistorySearch').value,
  type:$('remnantHistoryType').value||'all'}
}
function records(){return app.remnantMovements(filters())}
function render(){
 const all=records(),limited=all.slice(0,180),db=app.getRemnantDB(),knownIds=new Set(db.pieces.map(p=>p.id));
 const max=(db.movements||[]).length>=3000;
 $('remnantHistorySummary').textContent=all.length+' kayıt · '+limited.length+' görüntüleniyor'+
  (activePiece?' · Parça: '+activePiece:'')+
  (max?' · en eski kayıtlar kapasite nedeniyle çıkarılmış olabilir':'');
 $('remnantHistoryList').innerHTML=limited.length?limited.map(e=>{
  const changes=differences(e),when=new Date(e.at).toLocaleString('tr-TR'),
   exists=knownIds.has(e.pieceId);
  return '<div class="remnant-history-entry"><div class="remnant-history-entry-head">'+
   '<strong>'+escape(names[e.type]||e.type)+'</strong><time>'+escape(when)+'</time></div>'+
   '<div class="remnant-history-meta">'+escape(sources[e.source]||'Elle')+
   (e.projectName?' · '+escape(e.projectName):'')+
   (e.batchId?' · Parti: '+escape(e.batchId):'')+'</div>'+
   (e.pieceId?'<div class="remnant-history-identity">Kimlik: '+escape(e.pieceId)+
   (exists?' <button class="btn small" type="button" data-history-record="'+escape(e.pieceId)+
    '">Parçayı aç</button>':' · Bu kayıt artık envanterde değil')+'</div>':'')+
   (changes.length?'<div class="remnant-history-diff">'+changes.map(x=>'<div>'+escape(x)+'</div>').join('')+'</div>':'')+
   '</div>'
 }).join(''):'<div class="empty-state" style="min-height:120px"><strong>Hareket bulunamadı.</strong>'+
 '<p>Yeni işlemler tarih sırasıyla burada görüntülenecek.</p></div>'
}
function openFor(pieceId=''){
 activePiece=String(pieceId||'');
 $('remnantHistorySearch').value='';
 $('remnantHistoryType').value='all';
 render();
 $('remnantHistoryOverlay').classList.remove('hidden')
}
function close(){$('remnantHistoryOverlay').classList.add('hidden')}
function csvContent(){
 const toCell=text=>{
  let str=String(text??'');
  // Avoid spreadsheet formula execution when importing CSV.
  if(/^[\t\r\n ]*[=+\-@]/.test(str))str="'"+str;
  return '"'+str.replace(/"/g,'""')+'"'
 };
 const header=['Olay kimliği','Tarih','İşlem','Kaynak','Parça kimliği','Proje','Parti','Eski durum','Yeni durum','Değişiklikler'];
 const row=e=>[e.id,new Date(e.at).toISOString(),names[e.type]||e.type,
  sources[e.source]||e.source,e.pieceId,e.projectName,e.batchId,
  e.before?.status||'',e.after?.status||'',differences(e).join(' | ')];
 return '\uFEFF'+[header,...records().map(row)].map(x=>x.map(toCell).join(';')).join('\r\n')
}
function downloadCsv(){
 const content=csvContent(),blob=new Blob([content],{type:'text/csv;charset=utf-8'}),
  url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='Beythaus-Cut-Stok-Hareketleri-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500)
}
$('remnantHistoryClose').onclick=close;
$('remnantHistoryOverlay').onclick=e=>{if(e.target===$('remnantHistoryOverlay'))close()};
$('remnantHistorySearch').oninput=render;
$('remnantHistoryType').onchange=render;
$('remnantHistoryClear').onclick=()=>{
 activePiece='';$('remnantHistorySearch').value='';$('remnantHistoryType').value='all';render()
};
$('remnantHistoryExport').onclick=downloadCsv;
$('remnantHistoryList').onclick=e=>{
 const button=e.target.closest('button[data-history-record]');
 if(!button)return;
 const id=button.dataset.historyRecord;
 if(!app.getRemnantDB().pieces.some(x=>x.id===id))return;
 close();$('remnantOverlay').classList.remove('hidden');app.openRemnantEditor(id)
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
window.BeythausHistory={openFor,close,render,records,differences,csvContent};
})();