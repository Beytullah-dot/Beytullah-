/* Beythaus Cut physical remnant QR labels + scanner.
 * QRCode.js MIT; jsQR Apache-2.0. Libraries self-hosted under ./vendor.
 * This script never uploads, scans, or modifies stock without a user action.
 */
(()=>{'use strict';
 const app=window.BeythausCut,$=id=>document.getElementById(id);
 if(!app||!$('remnantScanOverlay'))return;
 const PARAM='cutRemnant',CANONICAL='https://beytullah-dot.github.io/Beytullah-/';
 const esc=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const format=n=>Number.isFinite(Number(n))?new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1}).format(n):'—';
 const database=()=>app.getRemnantDB();
 const base=()=>window.location?.protocol==='https:'&&window.location.origin&&window.location.pathname?
  window.location.origin+window.location.pathname:CANONICAL;
 const message=text=>{const el=$('remnantScanStatus');el.textContent=text;};
 const notify=text=>{const el=$('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800);};
 function linkFor(id){
  const text=String(id??'');
  if(!text||text.length>90)throw Error('Geçersiz stok kodu');
  return base()+'?'+PARAM+'='+encodeURIComponent(text);
 }
 function parseLink(source){
  const input=String(source??'').trim(),records=database().pieces;
  if(!input||input.length>700)return null;
  if(records.some(p=>p.id===input))return input;
  const idx=input.indexOf('?');
  if(idx<0||input.includes('#')||input.indexOf('?',idx+1)>=0)return null;
  const site=input.slice(0,idx);
  if(site!==base()&&site!==CANONICAL&&site!==CANONICAL+'index.html')return null;
  const q=input.slice(idx+1);
  if(!q.startsWith(PARAM+'=')||q.includes('&'))return null;
  try{
   const id=decodeURIComponent(q.slice(PARAM.length+1));
   return id&&id.length<=90&&!/[\u0000-\u001f\u007f]/.test(id)?id:null
  }catch{return null}
 }
 function resolve(source){
  const id=parseLink(source);return {id,piece:id?database().pieces.find(p=>p.id===id)||null:null}
 }
 function open(source){
  const result=resolve(source);
  if(!result.id){message('Bu kod Beythaus Cut artık stok etiketi değil.');notify('Geçersiz QR stok kodu.');return false}
  if(!result.piece){
   message('Bu parça bu tarayıcının envanterinde bulunmuyor. Envanter JSON yedeğini bu cihaza aktarın.');
   notify('Parça kaydı bu cihazda yok.');return false
  }
  closeScanner();
  $('remnantSearch').value='';
  $('remnantStatusFilter').value='all';
  for(const key of ['remnantMaterialFilter','remnantThicknessFilter','remnantLocationFilter'])$(key).value='all';
  for(const key of ['remnantMinLength','remnantMinWidth'])$(key).value='';
  // Existing project viewer/edit form owns physical data and status.
  $('remnantOverlay').classList.remove('hidden');
  app.openRemnantEditor(result.id);
  notify('Artık stok kaydı açıldı.');
  return true
 }
 function labelInfo(piece){
  return {id:piece.id,link:linkFor(piece.id),material:piece.material,
   dimensions:format(piece.l)+' × '+format(piece.w)+' mm',
   thickness:piece.t===null?'Belirtilmedi':format(piece.t)+' mm',
   location:piece.location||'Raf belirtilmedi',status:piece.status}
 }
 function labelHtml(item,i,prefix){
  return '<article class="qr-stock-label">'+
   '<div class="qr-stock-code" id="'+prefix+i+'"></div>'+
   '<div class="qr-stock-label-info"><span class="qr-label-brand">BEYTHAUS / CUT</span>'+
   '<strong>'+esc(item.material)+'</strong>'+
   '<span>'+esc(item.dimensions)+'</span>'+
   '<span>Kal.: '+esc(item.thickness)+'</span>'+
   '<span>Raf: '+esc(item.location)+'</span>'+
   '<span class="qr-label-id">ID: '+esc(item.id)+'</span>'+
   (item.status==='used'?'<span class="qr-label-status">KULLANILDI</span>':'')+
   '</div></article>'
 }
 function labels(pieces){
  if(typeof window.QRCode!=='function'){
   notify('QR oluşturma kütüphanesi yüklenemedi. Bağlantıyı yenileyin.');return false
  }
  if(!pieces.length){notify('Etiketlenecek mevcut artık parça bulunamadı.');return false}
  const selected=pieces.slice(0,30),models=selected.map(labelInfo);
  $('remnantLabelPreview').innerHTML=models.map((x,i)=>labelHtml(x,i,'qr-preview-')).join('');
  $('remnantLabelPrintRoot').innerHTML='<div class="qr-label-grid">'+models.map((x,i)=>labelHtml(x,i,'qr-print-')).join('')+'</div>';
  try{
   for(let i=0;i<models.length;i++){
    for(const prefix of ['qr-preview-','qr-print-']){
     new window.QRCode($(prefix+i),{text:models[i].link,width:112,height:112,
      colorDark:'#000000',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M})
    }
   }
  }catch(error){
   $('remnantLabelPreview').textContent='QR kodları oluşturulamadı.';
   $('remnantLabelPrintRoot').innerHTML='';
   notify('QR oluşturma başarısız oldu.');return false
  }
  $('remnantLabelHeading').textContent=models.length+' QR stok etiketi';
  $('remnantLabelOverlay').classList.remove('hidden');
  if(pieces.length>30)notify('İlk 30 etiket oluşturuldu. Diğerleri için filtreyi daraltın.');
  return true
 }
 function labelSingle(id){
  const piece=database().pieces.find(p=>p.id===id);
  return piece?labels([piece]):false
 }
 function filteredStock(){
  const num=id=>{const v=Number(String($(id).value||'').replace(',','.'));return v>0&&Number.isFinite(v)?v:0};
  const filters={query:$('remnantSearch').value,status:$('remnantStatusFilter').value||'available',
   material:$('remnantMaterialFilter').value||'all',
   thickness:$('remnantThicknessFilter').value||'all',
   location:$('remnantLocationFilter').value||'all',
   minL:num('remnantMinLength'),minW:num('remnantMinWidth')};
  return app.filterRemnants(database().pieces,filters).filter(p=>p.status==='available')
 }
 function labelFiltered(){return labels(filteredStock())}
 function closeLabels(){
  $('remnantLabelOverlay').classList.add('hidden');
  document.body.classList.remove('printing-remnant-labels')
 }
 function printLabels(){
  if(!$('remnantLabelPrintRoot').innerHTML)return false;
  document.body.classList.add('printing-remnant-labels');
  window.print();return true
 }
 let stream=null,frameId=0,lastFrame=0;
 function stopScanner(){
  if(frameId&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frameId);
  frameId=0;
  if(stream){for(const track of stream.getTracks())track.stop();stream=null}
  const video=$('remnantScanVideo');
  if(typeof video.pause==='function')video.pause();
  video.srcObject=null
 }
 function closeScanner(){stopScanner();$('remnantScanOverlay').classList.add('hidden')}
 function decode(bytes,width,height){
  if(typeof window.jsQR!=='function')return null;
  try{return window.jsQR(bytes,width,height,{inversionAttempts:'attemptBoth'})?.data||null}
  catch{return null}
 }
 function tick(ts){
  if(!stream)return;
  if(ts-lastFrame>=180){
   lastFrame=ts;
   const video=$('remnantScanVideo');
   if(video.readyState>=2&&video.videoWidth&&video.videoHeight){
    const canvas=$('remnantScanCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(ctx){
     const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
     canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
     canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
     ctx.drawImage(video,0,0,canvas.width,canvas.height);
     const image=ctx.getImageData(0,0,canvas.width,canvas.height);
     const qr=decode(image.data,image.width,image.height);
     if(qr){
      if(open(qr))return;
      // Do not repeatedly alert for the same unrelated QR code.
      lastFrame=ts+1300
     }
    }
   }
  }
  frameId=requestAnimationFrame(tick)
 }
 async function startScanner(){
  $('remnantScanOverlay').classList.remove('hidden');
  message('Kamera açılıyor… QR kodunu kadrajda tutun.');
  if(typeof window.jsQR!=='function'){
   message('QR tarayıcısı yüklenmedi. QR bağlantısını elle girebilirsiniz.');return false
  }
  if(!navigator.mediaDevices?.getUserMedia){
   message('Kamera bu tarayıcıda kullanılamıyor. Fotoğraf seçebilir veya kodu elle girebilirsiniz.');return false
  }
  try{
   stopScanner();
   const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});
   if($('remnantScanOverlay').classList.contains('hidden')){
    for(const track of media.getTracks())track.stop();return false
   }
   stream=media;
   const video=$('remnantScanVideo');video.srcObject=media;
   await video.play();
   message('QR kodunu kameraya gösterin. Okunmazsa fotoğrafını çekin.');
   lastFrame=0;frameId=requestAnimationFrame(tick);
   return true
  }catch{
   stopScanner();
   message('Kamera izni veya erişimi sağlanamadı. Fotoğraf seçin veya QR bağlantısını girin.');
   return false
  }
 }
 async function imageScan(file){
  if(!file)return false;
  if(typeof window.jsQR!=='function'){notify('QR okuyucu yüklenemedi.');return false}
  const fileUrl=URL.createObjectURL(file);
  try{
   const image=new Image();
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=fileUrl});
   const canvas=$('remnantScanCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
   if(!ctx)throw Error('Canvas unsupported');
   const scale=Math.min(1,1100/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   const img=ctx.getImageData(0,0,canvas.width,canvas.height);
   const qr=decode(img.data,img.width,img.height);
   if(!qr){message('Fotoğrafta QR kodu bulunamadı. Daha net bir fotoğraf çekin.');return false}
   return open(qr)
  }catch{
   message('Fotoğraf çözümlenemedi. Başka görüntü ya da manuel giriş deneyin.');return false
  }finally{URL.revokeObjectURL(fileUrl)}
 }
 $('remnantBulkLabelsBtn').onclick=labelFiltered;
 $('remnantScanOpenBtn').onclick=startScanner;
 $('remnantScanCloseBtn').onclick=closeScanner;
 $('remnantScanOverlay').onclick=e=>{if(e.target===$('remnantScanOverlay'))closeScanner()};
 $('remnantScanManualOpen').onclick=()=>open($('remnantScanManual').value);
 $('remnantScanFile').onchange=async e=>{
  const file=e.target.files?.[0];if(file)await imageScan(file);e.target.value=''
 };
 $('remnantLabelCloseBtn').onclick=closeLabels;
 $('remnantLabelBackBtn').onclick=closeLabels;
 $('remnantLabelOverlay').onclick=e=>{if(e.target===$('remnantLabelOverlay'))closeLabels()};
 $('remnantLabelPrintBtn').onclick=printLabels;
 window.addEventListener('afterprint',()=>document.body.classList.remove('printing-remnant-labels'));
 // Native phone camera can open a QR URL directly on this GitHub Pages app.
 // Its localStorage must already contain the matching inventory record.
 if(window.location?.search?.includes(PARAM+'='))open(base()+window.location.search);
 window.BeythausQR={linkFor,parseLink,resolve,open,labelInfo,labels,labelSingle,labelFiltered,
  printLabels,decode,startScanner,stopScanner,imageScan};
})();
