/* Beythaus Cut — sliding navigation. Existing form nodes are moved, not cloned,
   so the optimization engine, auth handlers and local/cloud inventory stay intact. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const app=window.BeythausCut,brand=document.querySelector('.topbar .brand');
const sidebar=document.querySelector('.workspace .sidebar');
if(!app||!brand||!sidebar||!$('stocksCard')||!$('remnantCard')||!$('settingsCard')||!$('cloudSettingsRoot'))return;

brand.setAttribute('role','button');
brand.setAttribute('tabindex','0');
brand.setAttribute('aria-label','Çalışma alanını aç');
brand.setAttribute('aria-expanded','false');
brand.title='Stok, hesap ve atölye ayarlarını aç';

const shade=document.createElement('div');
shade.className='bh-shade';shade.id='bhShade';shade.setAttribute('aria-hidden','true');
const shell=document.createElement('section');
shell.className='bh-workspace';shell.id='bhWorkspace';
shell.setAttribute('role','dialog');shell.setAttribute('aria-modal','true');
shell.setAttribute('aria-label','Beythaus Cut çalışma alanı');
shell.setAttribute('aria-hidden','true');
shell.innerHTML=[
'<div class="bh-navframe">',
  '<aside class="bh-navrail">',
   '<div class="bh-wordmark">Beythaus <span>Cut</span></div>',
   '<nav class="bh-navitems" aria-label="Ana menü">',
    '<button class="bh-navitem" type="button" data-bh-view="plan"><span class="bh-navglyph">▧</span>Kesim Planı</button>',
    '<button class="bh-navitem" type="button" data-bh-view="inventory"><span class="bh-navglyph">▦</span>Stok Envanteri</button>',
    '<button class="bh-navitem" type="button" data-bh-view="calculation"><span class="bh-navglyph">⚙</span>Hesap Ayarları</button>',
    '<button class="bh-navitem" type="button" data-bh-view="user"><span class="bh-navglyph">♙</span>Kullanıcı / Atölye</button>',
   '</nav>',
   '<div class="bh-navnote">Kesim hesapları ile stok yönetimi birbirinden ayrı çalışma alanlarında.</div>',
  '</aside>',
  '<div class="bh-navright">',
   '<div class="bh-navheader"><div><div class="bh-eyebrow" id="bhSectionLabel">ENVANTER</div><h2 id="bhSectionTitle">Stok Envanteri</h2><p id="bhSectionInfo">Tam stok, artık, raf ve QR</p></div><button class="bh-close" type="button" id="bhClose" aria-label="Menüyü kapat">×</button></div>',
   '<div class="bh-navscroll" id="bhScroll">',
    '<section class="bh-page" id="bhInventory" aria-label="Stok Envanteri">',
     '<div class="bh-intro">Tam stok panelleri ve kesimlerden kalan artıklar burada görüntülenir. Artık parçalar yalnızca fiziksel üretim tamamlanıp onaylandığında kaydedilir.</div>',
     '<div class="bh-numbers"><div class="bh-number"><b id="bhFullCount">0</b><span>Stok türü</span></div><div class="bh-number"><b id="bhOffcutCount">0</b><span>Kullanılabilir artık</span></div><div class="bh-number"><b id="bhShelfCount">0</b><span>Tanımlı artık rafı</span></div></div>',
     '<div class="bh-filterrow"><div class="bh-filtertabs" aria-label="Stok türü"><button class="bh-filterbtn" type="button" data-bh-filter="all" aria-selected="true">Tümü</button><button class="bh-filterbtn" type="button" data-bh-filter="stock" aria-selected="false">Tam stok</button><button class="bh-filterbtn" type="button" data-bh-filter="remnant" aria-selected="false">Artık stok</button></div><button type="button" class="btn small" id="bhOpenQr">Raf / QR yönetimi</button></div>',
     '<div class="bh-stacks"><div id="bhFullHost"></div><div id="bhRemnantHost"></div></div>',
     '<p class="bh-finenote">Tam paneller şu anda kesim için stok girdisi olarak tutulur. Tekil raf ve QR takibi artık kayıtlarında aktiftir. Tam panellerin de aynı fiziksel kayıt sistemiyle yönetilmesi bir sonraki veri modeli güncellemesidir.</p>',
    '</section>',
    '<section class="bh-page" id="bhCalculation" aria-label="Hesap Ayarları"><div class="bh-intro">Birimler, testere payı, yerleşim yöntemi, fiyatlandırma ve artık eşikleri.</div><div id="bhCalculationHost"></div></section>',
    '<section class="bh-page" id="bhUser" aria-label="Kullanıcı Ayarları"><div class="bh-intro">Hesap girişi, ortak atölye, davet ve eşitleme işlemleri birlikte yönetilir.</div><div id="bhUserHost"></div></section>',
   '</div>',
  '</div>',
'</div>'
].join('');
document.body.append(shade,shell);
$('bhFullHost').append($('stocksCard'));
$('bhRemnantHost').append($('remnantCard'));
$('bhCalculationHost').append($('settingsCard'));
$('bhUserHost').append($('cloudSettingsRoot'));

const shortcuts=document.createElement('div');
shortcuts.className='bh-shortcuts';
shortcuts.innerHTML='<div class="bh-shortcopy"><strong>Kesim için malzeme</strong><small id="bhMaterialSummary">Stok envanteri ve ayarlar</small></div><button class="btn small" data-bh-open="inventory" type="button">Stok Envanteri</button><button class="btn small" data-bh-open="calculation" type="button">Hesap Ayarları</button><button class="btn small primary" id="bhApprove" type="button">Üretimi onayla</button>';
sidebar.insertBefore(shortcuts,$('partsCard'));

const map={
 inventory:['ENVANTER','Stok Envanteri','Malzemeler, artıklar, raf ve QR'],
 calculation:['KESİM PARAMETRELERİ','Hesap Ayarları','Yerleşim, ölçü, maliyet'],
 user:['KULLANICI VE ATÖLYE','Kullanıcı / Ortak Atölye','Giriş, davet, paylaşım ve eşitleme']
};
let previousFocus=null;
function refresh(){
 const raw=(app.getState&&app.getState().stocks)||[];
 const pieces=(app.getRemnantDB&&app.getRemnantDB().pieces)||[];
 const active=pieces.filter(p=>p.status==='available');
 const shelves=new Set(active.map(p=>p.location).filter(Boolean));
 const full=raw.filter(s=>Number(s.l)>0&&Number(s.w)>0).length;
 $('bhFullCount').textContent=full;
 $('bhOffcutCount').textContent=active.length;
 $('bhShelfCount').textContent=shelves.size;
 $('bhMaterialSummary').textContent=full+' stok türü · '+active.length+' kullanılabilir artık';
 const actual=$('remnantConfirmProductionBtn');
 $('bhApprove').disabled=!actual||actual.disabled;
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
 ['inventory','calculation','user'].forEach(x=>$(x==='inventory'?'bhInventory':x==='calculation'?'bhCalculation':'bhUser').classList.toggle('active',x===name));
 shell.querySelectorAll('[data-bh-view]').forEach(b=>{if(b.dataset.bhView===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 $('bhScroll').scrollTop=0;refresh();
}
function open(name='inventory'){
 previousFocus=document.activeElement;
 show(name);shade.classList.add('open');shell.classList.add('open');
 shell.setAttribute('aria-hidden','false');brand.setAttribute('aria-expanded','true');
 document.body.classList.add('bh-nav-open');
 $('bhClose').focus({preventScroll:true});
}
function close(){
 shade.classList.remove('open');shell.classList.remove('open');shell.setAttribute('aria-hidden','true');
 brand.setAttribute('aria-expanded','false');document.body.classList.remove('bh-nav-open');
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});else brand.focus({preventScroll:true});
}
brand.addEventListener('click',()=>open('inventory'));
brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open('inventory')}});
$('bhClose').addEventListener('click',close);
shade.addEventListener('click',close);
shell.addEventListener('click',e=>{
 const item=e.target.closest('[data-bh-view]');if(item){show(item.dataset.bhView);return}
 const tab=e.target.closest('[data-bh-filter]');if(tab){filter(tab.dataset.bhFilter)}
});
shortcuts.addEventListener('click',e=>{const item=e.target.closest('[data-bh-open]');if(item)open(item.dataset.bhOpen)});
$('bhOpenQr').addEventListener('click',()=>$('remnantManageBtn').click());
$('bhApprove').addEventListener('click',()=>{const actual=$('remnantConfirmProductionBtn');if(actual&&!actual.disabled)actual.click()});
if($('mobileSettings'))$('mobileSettings').onclick=()=>open('calculation');
document.addEventListener('keydown',e=>{
 if(!shell.classList.contains('open'))return;
 if(e.key==='Escape'){
  const childOpen=Array.from(document.querySelectorAll('.projects-overlay,.modal')).some(n=>!n.classList.contains('hidden'));
  if(!childOpen){e.preventDefault();close()}return
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
filter('all');show('inventory');refresh();
window.BeythausCutWorkspace={open,close,show,refresh};
})();