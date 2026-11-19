/* Beythaus Cut — persistent icon/drawer handle navigation.
   Existing forms move without cloning: optimization and cloud event handlers remain intact. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const app=window.BeythausCut;
const brand=document.querySelector('.topbar .brand'),sidebar=document.querySelector('.workspace .sidebar');
if(!app||!brand||!sidebar||!$('stocksCard')||!$('remnantCard')||!$('settingsCard')||!$('cloudSettingsRoot'))return;

// One permanent icon acts as the physical handle of the drawer.
// Reuse the existing application mark; never create an icon that disappears behind the drawer.
const originalIcon=brand.querySelector('.brand-mark');
if(!originalIcon)return;
const handle=document.createElement('button');
handle.type='button';handle.className='bh-handle';handle.id='bhDrawerHandle';
handle.setAttribute('aria-label','Çalışma alanı çekmecesini aç');
handle.setAttribute('aria-controls','bhWorkspaceDrawer');
handle.setAttribute('aria-expanded','false');
handle.title='Çalışma alanları';
originalIcon.setAttribute('aria-hidden','true');
handle.appendChild(originalIcon);
document.body.appendChild(handle);
brand.classList.add('bh-brand-with-handle');
brand.setAttribute('role','button');brand.setAttribute('tabindex','0');
brand.setAttribute('aria-label','Çalışma alanları menüsünü aç');

const shade=document.createElement('div');
shade.className='bh-shade';shade.id='bhShade';shade.setAttribute('aria-hidden','true');
const drawer=document.createElement('aside');
drawer.className='bh-workspace';drawer.id='bhWorkspaceDrawer';
drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');
drawer.setAttribute('aria-label','Beythaus çalışma alanları');
drawer.setAttribute('aria-hidden','true');
drawer.innerHTML=[
 '<div class="bh-drawer-content">',
  '<div class="bh-drawer-heading"><span class="bh-eyebrow">WORKSPACE</span></div>',
  '<nav class="bh-navitems" aria-label="Çalışma alanları">',
   '<button class="bh-navitem" type="button" data-bh-view="plan"><span class="bh-navglyph">▧</span><span>Kesim Planı</span><span class="bh-navarrow" aria-hidden="true">›</span></button>',
   '<button class="bh-navitem" type="button" data-bh-view="inventory"><span class="bh-navglyph">▦</span><span>Stok Envanteri</span><span class="bh-navarrow" aria-hidden="true">›</span></button>',
   '<button class="bh-navitem" type="button" data-bh-view="costs"><span class="bh-navglyph">▤</span><span>Maliyet Kayıtları</span><span class="bh-navarrow" aria-hidden="true">›</span></button>',
    '<button class="bh-navitem" type="button" data-bh-view="account"><span class="bh-navglyph">♙</span><span>Hesap Ayarları</span><span class="bh-navarrow" aria-hidden="true">›</span></button>',
  '</nav>',
 '</div>'
].join('');
const screen=document.createElement('section');
screen.className='bh-content-screen';screen.id='bhContentScreen';
screen.setAttribute('aria-label','Seçili çalışma alanı');
screen.hidden=true;
screen.innerHTML=[
 '<div class="bh-content-bar"><div class="bh-content-heading"><span class="bh-eyebrow" id="bhSectionLabel">ENVANTER</span><h1 id="bhSectionTitle">Stok Envanteri</h1><p id="bhSectionInfo">Malzemeler, artıklar, raf ve QR</p></div><button type="button" class="btn small bh-to-plan" id="bhBackToPlan">Kesim Planı</button></div>',
 '<div class="bh-content-scroll" id="bhScroll">',
  '<section class="bh-page" id="bhInventory" aria-label="Stok Envanteri">',
   '<div class="bh-intro">Tam stok panelleri ile kesimlerden kalan artıklar birlikte yönetilir. Artıklar yalnız fiziksel üretim tamamlanıp onaylandığında envantere yazılır.</div>',
   '<div class="bh-numbers"><div class="bh-number"><b id="bhFullCount">0</b><span>Stok türü</span></div><div class="bh-number"><b id="bhOffcutCount">0</b><span>Kullanılabilir artık</span></div><div class="bh-number"><b id="bhShelfCount">0</b><span>Artık rafı</span></div></div>',
   '<div class="bh-filterrow"><div class="bh-filtertabs" aria-label="Stok türü"><button class="bh-filterbtn" type="button" data-bh-filter="all" aria-selected="true">Tümü</button><button class="bh-filterbtn" type="button" data-bh-filter="stock" aria-selected="false">Tam stok</button><button class="bh-filterbtn" type="button" data-bh-filter="remnant" aria-selected="false">Artık stok</button></div><button type="button" class="btn small" id="bhOpenQr">Raf / QR yönetimi</button></div>',
   '<div class="bh-stacks"><div id="bhFullHost"></div><div id="bhRemnantHost"></div></div>',
   '<p class="bh-finenote">Tam paneller şu an kesim girdisidir; artıklar ise tekil raf/QR kayıtlarıdır. Tam panellerin tekil QR takibine geçmesi ayrı veri modeli güncellemesi gerektirir.</p>',
  '</section>',
  '<section class="bh-page" id="bhCosts" aria-label="Maliyet kayıtları"><div class="bh-intro">Tamamlanan üretimlerin malzeme maliyetleri ve isteğe bağlı ek giderleri otomatik kaydedilir. Satış ve kâr hesabı yapılmaz.</div><div id="bhCostRecords" aria-live="polite"></div></section>',
   '<section class="bh-page" id="bhAccount" aria-label="Hesap Ayarları"><div class="bh-intro">Yönetici ve kullanıcı oturumları, parola işlemleri, ortak atölye erişimleri ve kullanıcı katılım kodları burada yönetilir.</div><div id="bhAccountHost"></div></section>',
 '</div>'
].join('');
document.body.append(shade,screen,drawer);
$('bhFullHost').append($('stocksCard'));
$('bhRemnantHost').append($('remnantCard'));
$('bhAccountHost').append($('cloudSettingsRoot'));

// Project cutting parameters are still part of the cutting-plan page.
const settingsCard=$('settingsCard');
const title=settingsCard.querySelector('.card-title');if(title)title.textContent='Proje Ayarları';
const sub=settingsCard.querySelector('.card-sub');if(sub)sub.textContent='Kesim parametreleri · bu projeye özel';
const runbar=sidebar.querySelector('.runbar');
if(runbar)sidebar.insertBefore(settingsCard,runbar);
else sidebar.append(settingsCard);

const shortcuts=document.createElement('div');
shortcuts.className='bh-shortcuts';
shortcuts.innerHTML='<div class="bh-shortcopy"><strong>Kesim Planı</strong><small id="bhMaterialSummary">Malzeme ve proje parametreleri</small></div><button class="btn small" type="button" data-bh-open="inventory">Stok Envanteri</button><button class="btn small" type="button" id="bhJumpProject">Proje Ayarları</button><button class="btn small primary" type="button" id="bhApprove">Üretimi onayla</button>';
sidebar.insertBefore(shortcuts,$('partsCard'));

const meta={
 inventory:['ENVANTER','Stok Envanteri','Malzemeler, artıklar, raflar ve QR'],
 costs:['MALİYET KAYITLARI','Maliyet Kayıtları','Tamamlanan kesimler, stok değeri ve ek maliyetler'],
 account:['HESAP VE YETKİLER','Hesap Ayarları','Yönetici, kullanıcı, parola ve ortak atölye']
};
let selected='plan';
let focusBeforeOpen=null;
function refreshCosts(){
 const records=app.getCostRecords?.()||[];
 const amount=v=>Number.isFinite(v)?new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(v):'Fiyat eksik';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const container=$('bhCostRecords');
 if(!records.length){container.innerHTML='<div class="bh-intro">Henüz tamamlanmış üretim kaydı yok.</div>';return}
 const known=records.filter(r=>Number.isFinite(r.materialCost));
 const material=known.reduce((n,r)=>n+r.materialCost,0);
 const extra=records.reduce((n,r)=>n+(Number(r.extraCost)||0),0);
 container.innerHTML='<div class="bh-numbers"><div class="bh-number"><b>'+records.length+'</b><span>Tamamlanan üretim</span></div><div class="bh-number"><b>'+amount(material)+'</b><span>Bilinen malzeme maliyeti</span></div><div class="bh-number"><b>'+amount(extra)+'</b><span>Ek maliyet</span></div></div>'+
  (known.length<records.length?'<p class="bh-finenote">Fiyatı bilinmeyen '+(records.length-known.length)+' üretim toplam maliyete dahil edilmedi.</p>':'')+
  records.map(r=>'<div class="auto-material-group"><strong>'+esc(r.projectName||'Üretim')+'</strong> · <span class="material-tag">'+esc(new Date(r.createdAt).toLocaleDateString('tr-TR'))+'</span>'+
   '<div class="stock-overview-item">Malzeme maliyeti: <b>'+amount(r.materialCost)+'</b></div>'+
   '<div class="stock-overview-item">Ek maliyet: '+amount(r.extraCost||0)+(r.extraNote?' · '+esc(r.extraNote):'')+'</div>'+
   '<div class="stock-overview-item">Toplam maliyet: <b>'+amount(r.totalCost)+'</b></div>'+
   '<div class="stock-overview-item">Tüketilen tam stok: '+(r.usedFullStocks||[]).reduce((n,x)=>n+x.qty,0)+' · Artık stok: '+(r.usedIds||[]).length+' · Oluşan artık: '+(r.createdIds||[]).length+'</div></div>').join('')
}
function refresh(){
 refreshCosts();
 const raw=app.getState?.().stocks||[];
 const pieces=app.getRemnantDB?.().pieces||[];
 const available=pieces.filter(p=>p.status==='available');
 const shelves=new Set(available.map(p=>p.location).filter(Boolean));
 const full=raw.filter(p=>String(p.l??'').trim()&&String(p.w??'').trim()).length;
 $('bhFullCount').textContent=full;
 $('bhOffcutCount').textContent=available.length;
 $('bhShelfCount').textContent=shelves.size;
 $('bhMaterialSummary').textContent=full+' stok türü · '+available.length+' kullanılabilir artık';
 const approve=$('remnantConfirmProductionBtn');
 $('bhApprove').disabled=!approve||approve.disabled;
}
function filter(name){
 drawer.querySelectorAll('[data-bh-filter]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.bhFilter===name)));
 screen.querySelectorAll('[data-bh-filter]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.bhFilter===name)));
 $('bhFullHost').hidden=name==='remnant';
 $('bhRemnantHost').hidden=name==='stock';
}
function selectView(name){
 if(name!=='plan'&&!meta[name])return;
 selected=name;
 const isPlan=name==='plan';
 screen.hidden=isPlan;
 document.body.classList.toggle('bh-page-mode',!isPlan);
 // Prevent keyboard navigation into the cutting page while another folder is shown.
 const topbar=document.querySelector('.topbar'),workspaceEl=document.querySelector('.workspace');
 if(topbar)topbar.inert=!isPlan;
 if(workspaceEl)workspaceEl.inert=!isPlan;
 $('bhInventory').classList.toggle('active',name==='inventory');
 $('bhAccount').classList.toggle('active',name==='account');
 $('bhCosts').classList.toggle('active',name==='costs');
 drawer.querySelectorAll('[data-bh-view]').forEach(b=>{
  if(b.dataset.bhView===name)b.setAttribute('aria-current','page');
  else b.removeAttribute('aria-current');
 });
 if(!isPlan){
  $('bhSectionLabel').textContent=meta[name][0];
  $('bhSectionTitle').textContent=meta[name][1];
  $('bhSectionInfo').textContent=meta[name][2];
  $('bhScroll').scrollTop=0;
 }else{
  window.scrollTo({top:0,behavior:'instant'});
 }
 refresh();
}
function isOpen(){return drawer.classList.contains('open')}
function open(){
 if(isOpen())return;
 focusBeforeOpen=document.activeElement;
 document.body.classList.add('bh-nav-open');
 drawer.classList.add('open');shade.classList.add('open');
 drawer.setAttribute('aria-hidden','false');
 handle.setAttribute('aria-expanded','true');
 handle.focus({preventScroll:true});
 handle.setAttribute('aria-label','Çalışma alanı çekmecesini kapat');
}
function close(){
 if(!isOpen())return;
 drawer.classList.remove('open');shade.classList.remove('open');
 document.body.classList.remove('bh-nav-open');
 drawer.setAttribute('aria-hidden','true');
 handle.setAttribute('aria-expanded','false');
 handle.setAttribute('aria-label','Çalışma alanı çekmecesini aç');
 if(drawer.contains(document.activeElement))handle.focus({preventScroll:true});
}
function toggle(){if(isOpen())close();else open()}
handle.addEventListener('click',toggle);
brand.addEventListener('click',toggle);
brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
shade.addEventListener('click',close);
drawer.addEventListener('click',e=>{
 const button=e.target.closest('[data-bh-view]');
 if(!button)return;
 selectView(button.dataset.bhView);
 close(); // Selection reverses the SAME drawer and handle transitions.
});
screen.addEventListener('click',e=>{
 const tab=e.target.closest('[data-bh-filter]');
 if(tab)filter(tab.dataset.bhFilter);
});
$('bhBackToPlan').addEventListener('click',()=>selectView('plan'));
shortcuts.addEventListener('click',e=>{
 const button=e.target.closest('[data-bh-open]');
 if(button){selectView(button.dataset.bhOpen);close()}
});
$('bhJumpProject').addEventListener('click',()=>settingsCard.scrollIntoView({behavior:'smooth',block:'start'}));
$('bhOpenQr').addEventListener('click',()=>$('remnantManageBtn').click());
$('bhApprove').addEventListener('click',()=>{
 const b=$('remnantConfirmProductionBtn');if(b&&!b.disabled)b.click()
});
if($('mobileSettings'))$('mobileSettings').onclick=()=>settingsCard.scrollIntoView({behavior:'smooth',block:'start'});
document.addEventListener('keydown',e=>{
 if(!isOpen())return;
 if(e.key==='Escape'){
  const otherOverlay=Array.from(document.querySelectorAll('.projects-overlay,.modal')).some(n=>!n.classList.contains('hidden'));
  if(!otherOverlay){e.preventDefault();close()}
 }else if(e.key==='Tab'){
  const focusables=[handle,...Array.from(drawer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])'))].filter(n=>n.getClientRects().length);
  if(!focusables.length)return;
  const first=focusables[0],last=focusables[focusables.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }
});
const observer=new MutationObserver(refresh);
for(const id of ['stockCount','remnantCount'])if($(id))observer.observe($(id),{subtree:true,childList:true,characterData:true});
if($('remnantConfirmProductionBtn'))observer.observe($('remnantConfirmProductionBtn'),{attributes:true,attributeFilter:['disabled']});
filter('all');selectView('plan');
window.BeythausCutWorkspace={open,close,show:selectView,refresh};
const recovery=$('cloudRecoveryArea');
if(recovery&&!recovery.classList.contains('cloud-hidden')){
 selectView('account');
 $('cloudRecoveryPassword')?.focus({preventScroll:true});
}
})();