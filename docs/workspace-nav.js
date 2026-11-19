/* Beythaus Cut workspace navigation.
   Moves existing inputs (not clones), preserving all optimizer, inventory and Auth listeners. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const app=window.BeythausCut,brand=document.querySelector('.topbar .brand');
const sidebar=document.querySelector('.workspace .sidebar');
if(!app||!brand||!sidebar||!$('stocksCard')||!$('remnantCard')||!$('settingsCard')||!$('cloudSettingsRoot'))return;

brand.setAttribute('role','button');
brand.setAttribute('tabindex','0');
brand.setAttribute('aria-label','Beythaus çalışma alanı menüsünü aç');
brand.setAttribute('aria-expanded','false');
brand.title='Çalışma alanlarını aç';
const shade=document.createElement('div');
shade.className='bh-shade';shade.id='bhShade';shade.setAttribute('aria-hidden','true');
const shell=document.createElement('section');
shell.className='bh-workspace';shell.id='bhWorkspace';shell.setAttribute('role','dialog');
shell.setAttribute('aria-modal','true');shell.setAttribute('aria-label','Beythaus Cut çalışma alanı');
shell.setAttribute('aria-hidden','true');
shell.innerHTML=[
 '<div class="bh-navframe">',
  '<aside class="bh-navrail">',
   '<div class="bh-wordmark-row"><div class="bh-drawer-icon" aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="bh-wordmark">Beythaus <span>Cut</span><small>ÇALIŞMA ALANI</small></div><button type="button" class="bh-menu-close" id="bhMenuClose" aria-label="Menüyü kapat">×</button></div>',
   '<nav class="bh-navitems" aria-label="Klasörler">',
    '<button class="bh-navitem" type="button" data-bh-view="plan"><span class="bh-navglyph">▧</span><span>Kesim Planı</span></button>',
    '<button class="bh-navitem" type="button" data-bh-view="inventory"><span class="bh-navglyph">▦</span><span>Stok Envanteri</span></button>',
    '<button class="bh-navitem" type="button" data-bh-view="account"><span class="bh-navglyph">♙</span><span>Hesap Ayarları</span></button>',
   '</nav>',
   '<div class="bh-navnote">Proje Ayarları kesim sayfasındadır. Hesap ve atölye yetkileri Hesap Ayarları bölümündedir.</div>',
  '</aside>',
  '<div class="bh-navright">',
   '<div class="bh-navheader"><button class="bh-back" type="button" id="bhMenuBack" aria-label="Klasör menüsüne geri dön">‹</button><div class="bh-navtitle"><div class="bh-eyebrow" id="bhSectionLabel">ENVANTER</div><h2 id="bhSectionTitle">Stok Envanteri</h2><p id="bhSectionInfo">Tam stok, artık, raf ve QR</p></div><button class="bh-close" type="button" id="bhClose" aria-label="Çalışma alanını kapat">×</button></div>',
   '<div class="bh-navscroll" id="bhScroll">',
    '<section class="bh-page" id="bhInventory" aria-label="Stok Envanteri">',
     '<div class="bh-intro">Tam stok panelleri ile kesimlerden kalan artıklar birlikte yönetilir. Artıklar yalnız fiziksel üretim tamamlanıp onaylandığında envantere yazılır.</div>',
     '<div class="bh-numbers"><div class="bh-number"><b id="bhFullCount">0</b><span>Stok türü</span></div><div class="bh-number"><b id="bhOffcutCount">0</b><span>Kullanılabilir artık</span></div><div class="bh-number"><b id="bhShelfCount">0</b><span>Artık rafı</span></div></div>',
     '<div class="bh-filterrow"><div class="bh-filtertabs" aria-label="Stok türü"><button class="bh-filterbtn" type="button" data-bh-filter="all" aria-selected="true">Tümü</button><button class="bh-filterbtn" type="button" data-bh-filter="stock" aria-selected="false">Tam stok</button><button class="bh-filterbtn" type="button" data-bh-filter="remnant" aria-selected="false">Artık stok</button></div><button type="button" class="btn small" id="bhOpenQr">Raf / QR yönetimi</button></div>',
     '<div class="bh-stacks"><div id="bhFullHost"></div><div id="bhRemnantHost"></div></div>',
     '<p class="bh-finenote">Tam paneller şu an kesim girdisi, artıklar ise tekil raf/QR kaydıdır. Tam panellerin tekil QR takibine geçirilmesi ayrıca veri uyarlaması gerektirir.</p>',
    '</section>',
    '<section class="bh-page" id="bhAccount" aria-label="Hesap Ayarları"><div class="bh-intro">Yönetici ve atölye kullanıcıları bu bölümden oturum açabilir, parolalarını değiştirebilir ve atölye erişimlerini yönetebilir. Kullanıcı kodlarını yalnız atölye yöneticisi oluşturabilir.</div><div id="bhAccountHost"></div></section>',
   '</div>',
  '</div>',
 '</div>'
].join('');
document.body.append(shade,shell);

$('bhFullHost').append($('stocksCard'));
$('bhRemnantHost').append($('remnantCard'));
$('bhAccountHost').append($('cloudSettingsRoot'));
const settingsCard=$('settingsCard');
const title=settingsCard.querySelector('.card-title');if(title)title.textContent='Proje Ayarları';
const sub=settingsCard.querySelector('.card-sub');if(sub)sub.textContent='Kesim parametreleri · bu projeye özel';
const runbar=sidebar.querySelector('.runbar');
if(runbar)sidebar.insertBefore(settingsCard,runbar);else sidebar.append(settingsCard);

const shortcuts=document.createElement('div');
shortcuts.className='bh-shortcuts';
shortcuts.innerHTML='<div class="bh-shortcopy"><strong>Kesim Planı</strong><small id="bhMaterialSummary">Malzeme ve proje parametreleri</small></div><button class="btn small" data-bh-open="inventory" type="button">Stok Envanteri</button><button class="btn small" id="bhJumpProject" type="button">Proje Ayarları</button><button class="btn small primary" id="bhApprove" type="button">Üretimi onayla</button>';
sidebar.insertBefore(shortcuts,$('partsCard'));

const map={
 inventory:['ENVANTER','Stok Envanteri','Malzemeler, artıklar, raflar ve QR'],
 account:['HESAP VE YETKİLER','Hesap Ayarları','Yönetici, kullanıcı, parola ve ortak atölye']
};
let previousFocus=null;
const isMobile=()=>window.matchMedia('(max-width:780px)').matches;
function refresh(){
 const raw=(app.getState&&app.getState().stocks)||[];
 const pieces=(app.getRemnantDB&&app.getRemnantDB().pieces)||[];
 const available=pieces.filter(p=>p.status==='available');
 const shelves=new Set(available.map(p=>p.location).filter(Boolean));
 const full=raw.filter(s=>String(s.l??'').trim()&&String(s.w??'').trim()).length;
 $('bhFullCount').textContent=full;
 $('bhOffcutCount').textContent=available.length;
 $('bhShelfCount').textContent=shelves.size;
 $('bhMaterialSummary').textContent=full+' stok türü · '+available.length+' kullanılabilir artık';
 const action=$('remnantConfirmProductionBtn');
 $('bhApprove').disabled=!action||action.disabled;
}
function filter(name){
 shell.querySelectorAll('[data-bh-filter]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.bhFilter===name)));
 $('bhFullHost').hidden=name==='remnant';
 $('bhRemnantHost').hidden=name==='stock';
}
function show(name){
 if(name==='plan'){close();return}
 if(!map[name])return;
 $('bhSectionLabel').textContent=map[name][0];$('bhSectionTitle').textContent=map[name][1];$('bhSectionInfo').textContent=map[name][2];
 $('bhInventory').classList.toggle('active',name==='inventory');
 $('bhAccount').classList.toggle('active',name==='account');
 shell.querySelectorAll('[data-bh-view]').forEach(b=>{
  if(b.dataset.bhView===name)b.setAttribute('aria-current','page');
  else b.removeAttribute('aria-current');
 });
 shell.classList.add('bh-detail');
 $('bhScroll').scrollTop=0;refresh();
}
function open(name=null){
 previousFocus=document.activeElement;
 if(name)show(name);
 else {show('inventory');shell.classList.remove('bh-detail')}
 shade.classList.add('open');shell.classList.add('open');
 shell.setAttribute('aria-hidden','false');brand.setAttribute('aria-expanded','true');
 document.body.classList.add('bh-nav-open');
 if(!isMobile()||name)$('bhClose').focus({preventScroll:true});
 else shell.querySelector('[data-bh-view="inventory"]').focus({preventScroll:true});
}
function close(){
 shade.classList.remove('open');shell.classList.remove('open');
 shell.setAttribute('aria-hidden','true');brand.setAttribute('aria-expanded','false');
 document.body.classList.remove('bh-nav-open');
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
 else brand.focus({preventScroll:true});
}
function backToMenu(){
 shell.classList.remove('bh-detail');
 shell.querySelector('[data-bh-view="inventory"]').focus({preventScroll:true});
}
brand.addEventListener('click',()=>open());
brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
$('bhClose').addEventListener('click',close);
$('bhMenuClose').addEventListener('click',close);
$('bhMenuBack').addEventListener('click',backToMenu);
shade.addEventListener('click',close);
shell.addEventListener('click',e=>{
 const nav=e.target.closest('[data-bh-view]');
 if(nav){show(nav.dataset.bhView);return}
 const tab=e.target.closest('[data-bh-filter]');
 if(tab)filter(tab.dataset.bhFilter);
});
shortcuts.addEventListener('click',e=>{
 const nav=e.target.closest('[data-bh-open]');
 if(nav)open(nav.dataset.bhOpen);
});
$('bhJumpProject').addEventListener('click',()=>settingsCard.scrollIntoView({behavior:'smooth',block:'start'}));
$('bhOpenQr').addEventListener('click',()=>$('remnantManageBtn').click());
$('bhApprove').addEventListener('click',()=>{
 const action=$('remnantConfirmProductionBtn');if(action&&!action.disabled)action.click()
});
if($('mobileSettings'))$('mobileSettings').onclick=()=>settingsCard.scrollIntoView({behavior:'smooth',block:'start'});
document.addEventListener('keydown',e=>{
 if(!shell.classList.contains('open'))return;
 if(e.key==='Escape'){
  const child=Array.from(document.querySelectorAll('.projects-overlay,.modal')).some(n=>!n.classList.contains('hidden'));
  if(!child){e.preventDefault();if(isMobile()&&shell.classList.contains('bh-detail'))backToMenu();else close()}
  return;
 }
 if(e.key==='Tab'){
  const els=Array.from(shell.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]')).filter(n=>n.getClientRects().length>0);
  if(!els.length)return;
  if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus()}
  else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus()}
 }
});
const observer=new MutationObserver(refresh);
for(const id of ['stockCount','remnantCount'])if($(id))observer.observe($(id),{subtree:true,childList:true,characterData:true});
if($('remnantConfirmProductionBtn'))observer.observe($('remnantConfirmProductionBtn'),{attributes:true,attributeFilter:['disabled']});
filter('all');show('inventory');shell.classList.remove('bh-detail');refresh();
window.BeythausCutWorkspace={open,close,show,refresh};
 // Password reset links open the account page immediately, including on phones.
 const recovery=$('cloudRecoveryArea');
 if(recovery&&!recovery.classList.contains('cloud-hidden')){
  open('account');
  $('cloudRecoveryPassword')?.focus({preventScroll:true});
 }
})();