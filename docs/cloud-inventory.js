/* Opt-in authoritative cloud stock client for Beythaus Cut.
   Supabase Auth REST and PostgreSQL RPC; no service_role keys, no offline writes. */
(()=>{'use strict';
const app=window.BeythausCut,root=document.getElementById('cloudSettingsRoot');
if(!app||!root)return;
root.innerHTML="\n<div class=\"card cloud-card\">\n <div class=\"card-head\"><div><div class=\"card-title\">Bulut stok envanteri</div><div class=\"card-sub\">Ortak atölye · isteğe bağlı</div></div><span id=\"cloudBadge\" class=\"cloud-status-pill\" data-mode=\"local\">Yerel</span></div>\n <div class=\"cloud-body\">\n  <p id=\"cloudStatus\" class=\"cloud-status\">Bulut bağlantısı kapalı. Yerel envanter korunuyor.</p>\n  <div class=\"cloud-form-grid\">\n   <div class=\"cloud-field span-all\"><label for=\"cloudUrl\">Supabase proje URL'si</label><input id=\"cloudUrl\" type=\"url\" autocomplete=\"url\" placeholder=\"https://proje.supabase.co\"></div>\n   <div class=\"cloud-field span-all\"><label for=\"cloudKey\">Publishable / anon API anahtarı (secret değil)</label><input id=\"cloudKey\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"></div>\n   <div class=\"cloud-field\"><label for=\"cloudEmail\">E-posta</label><input id=\"cloudEmail\" type=\"email\" autocomplete=\"email\"></div>\n   <div class=\"cloud-field\"><label for=\"cloudPassword\">Parola</label><input id=\"cloudPassword\" type=\"password\" autocomplete=\"current-password\"></div>\n  </div>\n  <div class=\"cloud-buttons\"><button id=\"cloudConnectBtn\" class=\"btn primary\" type=\"button\">Giriş yap</button>\n    <button id=\"cloudSignupBtn\" class=\"btn\" type=\"button\">Hesap oluştur</button>\n    <button id=\"cloudSignOutBtn\" class=\"btn cloud-hidden\" type=\"button\">Oturumu kapat</button>\n    <button id=\"cloudForgotBtn\" class=\"btn\" type=\"button\">Şifremi unuttum</button></div>\n   <div id=\"cloudRecoveryArea\" class=\"cloud-workspace-control cloud-hidden\" role=\"region\" aria-label=\"Yeni parola belirle\">\n    <div class=\"cloud-separator\"></div>\n    <div class=\"cloud-subheading\">Beythaus Cut için yeni parola belirle</div>\n    <p class=\"cloud-hint\">E-postadaki sıfırlama bağlantısını açtıktan sonra yeni parolanı yalnızca buraya yaz.</p>\n    <div class=\"cloud-form-grid\">\n     <div class=\"cloud-field\"><label for=\"cloudRecoveryPassword\">Yeni parola</label><input id=\"cloudRecoveryPassword\" type=\"password\" autocomplete=\"new-password\" minlength=\"8\"></div>\n     <div class=\"cloud-field\"><label for=\"cloudRecoveryConfirm\">Yeni parola (tekrar)</label><input id=\"cloudRecoveryConfirm\" type=\"password\" autocomplete=\"new-password\" minlength=\"8\"></div>\n    </div>\n    <div class=\"cloud-buttons\"><button id=\"cloudResetPasswordBtn\" class=\"btn primary\" type=\"button\">Yeni parolayı kaydet</button></div>\n   </div>\n  <div id=\"cloudWorkspaceArea\" class=\"cloud-workspace-control cloud-hidden\">\n   <div class=\"cloud-separator\"></div>\n   <div class=\"cloud-subheading\">Ortak atölye</div>\n   <div class=\"cloud-field\"><label for=\"cloudWorkspaceSelect\">Atölye seç</label><select id=\"cloudWorkspaceSelect\"></select></div>\n   <div class=\"cloud-buttons\"><button id=\"cloudOpenBtn\" class=\"btn primary\" type=\"button\">Atölyeyi aç</button>\n    <button id=\"cloudRefreshBtn\" class=\"btn\" type=\"button\">Stokları eşitle</button>\n    <button id=\"cloudLeaveBtn\" class=\"btn\" type=\"button\">Yerel envantere dön</button></div>\n   <div class=\"cloud-field\"><label for=\"cloudNewWorkspace\">Yeni atölye adı</label><input id=\"cloudNewWorkspace\" type=\"text\" maxlength=\"80\" placeholder=\"Beythaus Atölye\"></div>\n   <div class=\"cloud-buttons\"><button id=\"cloudCreateBtn\" class=\"btn\" type=\"button\">Atölye oluştur</button>\n    <button id=\"cloudInviteBtn\" class=\"btn\" type=\"button\">Katılım kodu üret (yönetici)</button></div>\n   <div class=\"cloud-field\"><label for=\"cloudInviteCode\">Ekip katılım kodu</label><input id=\"cloudInviteCode\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\"></div>\n   <div class=\"cloud-buttons\"><button id=\"cloudJoinBtn\" class=\"btn\" type=\"button\">Kodla katıl</button>\n    <button id=\"cloudCopyInvite\" class=\"btn\" type=\"button\">Kodu kopyala</button></div>\n   <div class=\"cloud-separator\"></div>\n   <div class=\"cloud-buttons\"><button id=\"cloudImportLocalBtn\" class=\"btn\" type=\"button\">Yerel stokları buluta aktar (yönetici)</button></div>\n   <p class=\"cloud-hint\">Yerel stoklar otomatik aktarılmaz. Bulut modunda stok değişiklikleri yalnız sunucu onayından sonra kesinleşir. Çevrimdışı stok tüketimi yapılamaz.</p>\n  </div>\n  <p class=\"cloud-hint\">Önce Supabase SQL kurulumunu yap. Tarayıcıya yalnız publishable/anon anahtarı gir; service_role veya secret anahtarı girmeyin. Bulut ayarlanmazsa yerel mod aynen çalışır. Hesap oluşturduktan sonra Supabase doğrulama e-postası gelebilir; bu e-posta onaylanmadan giriş yapılamaz.</p>\n  <p id=\"cloudError\" class=\"cloud-error\" aria-live=\"polite\"></p>\n </div>\n</div>";
const $=id=>document.getElementById(id),KEY='beythaus-cloud-config-v1',
 SESSION='beythaus-cloud-session-v1',LOCAL='beythaus-cut-remnant-library-v1';
let storage=null;try{storage=window.sessionStorage}catch{}
if(!storage)storage={getItem(){return null},setItem(){},removeItem(){}};
const read=(store,key)=>{try{return JSON.parse(store.getItem(key)||'null')}catch{return null}};
const save=(store,key,value)=>{try{store.setItem(key,JSON.stringify(value))}catch{}};
const uuid=()=>window.crypto?.randomUUID?.();
// Public browser-safe project URL and publishable key, never a secret/service_role.
const DEFAULT_CLOUD_CONFIG={url:"https://pdqgpupdqgrxejvjpdzs.supabase.co",key:"sb_publishable_g9p81j1QltETxGBQmhHTxA_VLktGLm_"};
let config={...DEFAULT_CLOUD_CONFIG,...(read(localStorage,KEY)||{})},session=read(storage,SESSION),
 workspace='',active=false,busy=false,poll=null,syncing=false,fingerprint='';
function normalizeConfig(url,key){
 const base=String(url||'').trim().replace(/\/+$/,''),k=String(key||'').trim();
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base))throw Error('Geçerli *.supabase.co HTTPS adresi gerekli.');
 if(!k||k.length>3000||k.startsWith('sb_secret_')||k.includes('service_role'))
  throw Error('Gizli anahtar kullanılamaz; publishable/anon anahtarı girin.');
 if(k.split('.').length===3){
  try{const t=JSON.parse(atob(k.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
   if(t.role!=='anon')throw Error('JWT anon rolünde değil');
  }catch{throw Error('Güvenli anon JWT anahtarı gerekli.')}
 }else if(!k.startsWith('sb_publishable_'))throw Error('Geçerli publishable anahtarı gerekli.');
 return {url:base,key:k}
}
function status(message,failed=false){
 $('cloudStatus').textContent=message;$('cloudStatus').dataset.state=failed?'error':active?'connected':'local';
 $('cloudError').textContent=failed?message:'';
 $('cloudBadge').textContent=active?'Bulut bağlı':'Yerel';
 $('cloudBadge').dataset.mode=active?'connected':'local'
}
function draw(){
 $('cloudWorkspaceArea').classList.toggle('cloud-hidden',!session);
 $('cloudSignOutBtn').classList.toggle('cloud-hidden',!session);
 $('cloudConnectBtn').classList.toggle('cloud-hidden',!!session);
 $('cloudSignupBtn').classList.toggle('cloud-hidden',!!session);
 $('cloudUrl').value=config.url||'';$('cloudKey').value=config.key||'';
 $('cloudPassword').value=''
}
function fromInputs(){
 config=normalizeConfig($('cloudUrl').value,$('cloudKey').value);
 save(localStorage,KEY,config)
}
function explainAuthError(body,statusCode){
 const code=String(body?.error_code||body?.code||'');
 if(code==='invalid_credentials')return 'E-posta adresi veya Beythaus Cut parolası uyuşmuyor. Supabase yönetim hesabının parolası ayrı olabilir. E-posta adresini kontrol et veya Şifremi unuttum seçeneğini kullan.';
 if(code==='otp_expired'||code==='otp_disabled')return 'Şifre sıfırlama bağlantısı süresi dolmuş veya kullanılmış. Yeniden Şifremi unuttum ile bağlantı iste.';
 if(code==='email_not_confirmed')return 'Hesabın oluşturuldu ancak e-posta adresin henüz doğrulanmadı. Supabase doğrulama e-postasını aç (Spam / Gereksiz klasörünü de kontrol et), bağlantıya dokun ve ardından Giriş yap.';
 if(code==='over_email_send_rate_limit'||(statusCode===429&&code.includes('rate_limit')))
  return 'Supabase kısa aralıklarla gönderilen e-postaları geçici olarak sınırlıyor. Yeni hesap oluşturma; gelen kutundaki son bağlantıyı kullan veya biraz sonra yeniden Şifremi unuttum seçeneğini dene.';
 if(code==='email_address_invalid')return 'E-posta adresi geçerli görünmüyor. Adresi kontrol et.';
 if(code==='weak_password')return 'Parola Supabase güvenlik koşullarını karşılamıyor. Daha güçlü bir parola seç.';
 if(code==='signup_disabled')return 'Bu Supabase projesinde yeni hesap oluşturma kapalı.';
 if(code==='email_exists'||code==='user_already_exists')return 'Bu e-posta ile bir hesap zaten bulunuyor. Hesap oluşturmak yerine Giriş yap.';
 const fallback=String(body?.message||body?.error_description||body?.error||'').trim();
 return fallback||'Bulut sunucu hatası (HTTP '+statusCode+').'
}
async function http(path,options={},authenticated=false,retry=true){
 if(!config.url||!config.key)throw Error('Önce bağlantıyı yapılandır.');
 if(authenticated)await ensureToken();
 const headers={'apikey':config.key,'Content-Type':'application/json',...(options.headers||{})};
 if(authenticated)headers.Authorization='Bearer '+session.access_token;
 const r=await fetch(config.url+path,{...options,headers,cache:'no-store'});
 if(r.status===401&&authenticated&&retry){await refresh();return http(path,options,true,false)}
 const result=await r.json().catch(()=>({message:'Sunucu yanıtı çözülemedi'}));
 if(!r.ok)throw Error(explainAuthError(result,r.status));
 return result
}
function remember(auth){
 if(!auth?.access_token||!auth?.refresh_token)throw Error('Oturum bilgisi eksik.');
 session={access_token:auth.access_token,refresh_token:auth.refresh_token,
  expiresAt:Date.now()+(Number(auth.expires_in)||3600)*1000};
 save(storage,SESSION,session);draw()
}
async function refresh(){
 if(!session?.refresh_token)throw Error('Oturum sona erdi.');
 const auth=await http('/auth/v1/token?grant_type=refresh_token',
  {method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
 remember(auth)
}
async function ensureToken(){
 if(!session)throw Error('Önce giriş yap.');
 if(session.expiresAt<Date.now()+60000)await refresh()
}
const rpc=(name,payload={})=>http('/rest/v1/rpc/'+name,
 {method:'POST',body:JSON.stringify(payload)},true);
async function workspaces(preferred=''){
 const entries=await rpc('beythaus_cloud_workspaces');
 const select=$('cloudWorkspaceSelect');select.innerHTML='';
 for(const e of entries){
  const option=document.createElement('option');option.value=e.id;
  option.textContent=e.name+' ('+(e.role==='owner'?'yönetici':'ekip')+')';
  select.appendChild(option)
 }
 if(!entries.length){const option=document.createElement('option');option.value='';
  option.textContent='Henüz atölye yok';select.appendChild(option)}
 const selected=preferred||workspace||config.workspace;
 if(entries.some(x=>x.id===selected))select.value=selected;
 draw();return entries
}
async function login(){
 fromInputs();const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
 if(!email||!password)throw Error('E-posta ve parola gerekli.');
 remember(await http('/auth/v1/token?grant_type=password',
  {method:'POST',body:JSON.stringify({email,password})}));
 await workspaces();status('Oturum açıldı. Ortak atölyeyi seçebilirsin.')
}
async function signup(){
 fromInputs();const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
 if(!email||password.length<8)throw Error('E-posta ve en az 8 karakterli parola gerekli.');
 const response=await http('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
 if(response.access_token){remember(response);await workspaces()}
 status(response.access_token?'Hesap oluşturuldu ve giriş yapıldı.':'Hesabın oluşturuldu. Supabase doğrulama e-postasını gönderdi. Gelen kutusu ve Spam/Gereksiz klasörünü kontrol et, doğrulama bağlantısına dokun, ardından Giriş yap. Aynı e-posta için tekrar Hesap oluştur seçeneğini kullanma.')
}
// GoTrue implicit password recovery on our GitHub Pages app. Recovery JWTs
// are never persisted; URL hash is removed immediately after capture.
const RECOVERY_REDIRECT='https://beytullah-dot.github.io/Beytullah-/';
let recoveryToken=null;
async function sendPasswordResetEmail(){
 fromInputs();
 const email=$('cloudEmail').value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw Error('Önce Beythaus Cut hesabında kullandığın e-posta adresini gir.');
 await http('/auth/v1/recover?redirect_to='+encodeURIComponent(RECOVERY_REDIRECT),
  {method:'POST',body:JSON.stringify({email})});
 status('Şifre sıfırlama isteği alındı. Bu e-posta hesabına kayıtlıysa Supabase bir bağlantı gönderir. Gelen kutusu ve Spam klasörünü kontrol et. Bağlantıyı açınca yeni parola alanı görünecek.')
}
function showRecoveryFromUrl(){
 const raw=String(window.location?.hash||'');
 if(!raw)return false;
 let params;
 try{params=new URL('https://example.invalid/?'+raw.slice(1)).searchParams}catch{return false}
 const type=params.get('type'),access=params.get('access_token'),
  error=params.get('error_code');
 if(type!=='recovery'&&!error)return false;
 // Do not leave bearer credentials in the browser URL or history.
 window.history?.replaceState?.(null,'',String(window.location.pathname||'/')+String(window.location.search||''));
 if(error){
  status('Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Şifremi unuttum seçeneğiyle yeni bağlantı iste.',true);
  return false
 }
 if(!access||access.length>12000){
  status('Sıfırlama bağlantısında yetkilendirme eksik. Yeniden Şifremi unuttum seçeneğini kullan.',true);
  return false
 }
 recoveryToken=access;
 $('cloudRecoveryArea').classList.remove('cloud-hidden');
 status('E-posta bağlantısı doğrulama için alındı. Şimdi yeni Beythaus Cut parolanı iki kez gir ve kaydet.');
 return true
}
async function finishPasswordRecovery(){
 if(!recoveryToken)throw Error('Önce e-postadaki şifre sıfırlama bağlantısını aç.');
 const password=$('cloudRecoveryPassword').value,repeat=$('cloudRecoveryConfirm').value;
 if(password.length<8)throw Error('Yeni parola en az 8 karakterli olmalı.');
 if(password!==repeat)throw Error('Girilen yeni parolalar aynı değil.');
 await http('/auth/v1/user',{
  method:'PUT',headers:{Authorization:'Bearer '+recoveryToken},
  body:JSON.stringify({password})},false);
 recoveryToken=null;
 $('cloudRecoveryPassword').value='';$('cloudRecoveryConfirm').value='';
 $('cloudRecoveryArea').classList.add('cloud-hidden');
 status('Beythaus Cut parolan güncellendi. Şimdi e-postan ve yeni parolanla Giriş yap.')
}
function stopPoll(){if(poll)clearInterval(poll);poll=null}
function leave(){
 stopPoll();active=false;workspace='';fingerprint='';
 app.exitCloudInventory();status('Yerel envantere döndün; bulut stokları silinmedi.');draw()
}
async function signout(){
 if(active)leave();
 try{if(session)await http('/auth/v1/logout',{method:'POST'},true)}catch{}
 session=null;try{storage.removeItem(SESSION)}catch{}
 draw();status('Oturum kapatıldı.')
}
async function synchronize(force=false){
 if(!workspace||!session||syncing)return false;
 syncing=true;
 try{
  const result=await rpc('beythaus_cloud_snapshot',{p_workspace:workspace});
  if(!result||!Array.isArray(result.pieces)||!result.workspace)throw Error('Stok yanıtı eksik.');
  const next=JSON.stringify({
   pieces:result.pieces.map(x=>[x.id,x.version,x.status,x.l,x.w,x.t,x.material,x.location,x.notes]),
   events:result.movements?.[0]?.id,defaultLocation:result.workspace.defaultLocation
  });
  if(force||next!==fingerprint){app.enterCloudInventory(result);fingerprint=next}
  active=true;
  status('Ortak atölye bağlı · '+result.pieces.filter(x=>x.status==='available').length+
   ' mevcut parça · sunucu denetimi açık.');
  return true
 }catch(e){status('Bulut eşitlenemedi: '+e.message,true);return false}
 finally{syncing=false}
}
async function selectWorkspace(id){
 if(!id)throw Error('Önce atölye oluştur veya katıl.');
 if(active)leave();
 workspace=id;
 if(!await synchronize(true)){workspace='';throw Error('Bulut envanteri yüklenemedi.')}
 config={...config,workspace:id};save(localStorage,KEY,config);
 stopPoll();poll=setInterval(()=>{if(active&&document.visibilityState!=='hidden')synchronize(false)},15000)
}
async function createWorkspace(){
 const name=$('cloudNewWorkspace').value.trim();
 if(!name)throw Error('Atölye adı gerekli.');
 const id=await rpc('beythaus_cloud_create_workspace',{p_name:name});
 await workspaces(id);await selectWorkspace(id)
}
async function join(){
 const code=$('cloudInviteCode').value.trim();if(!code)throw Error('Katılım kodu gerekli.');
 const id=await rpc('beythaus_cloud_join',{p_token:code});
 await workspaces(id);await selectWorkspace(id)
}
async function invite(){
 const id=workspace||$('cloudWorkspaceSelect').value;
 if(!id)throw Error('Önce atölye seç.');
 const token=await rpc('beythaus_cloud_create_invite',{p_workspace:id});
 $('cloudInviteCode').value=token;status('Ekip katılım kodu oluşturuldu: 48 saat, 5 kullanım. Güvenli paylaş.')
}
async function mutate(kind,payload,opId=''){
 if(!active||!workspace)throw Error('Ortak atölye bağlantısı açık değil.');
 const operation=opId||uuid();if(!operation)throw Error('Güvenli işlem kimliği üretilemedi.');
 const result=await rpc('beythaus_cloud_mutate',{p_workspace:workspace,p_operation:operation,
  p_kind:kind,p_payload:payload});
 if(!result?.ok)throw Error('Sunucu işlemi onaylamadı.');
 if(!await synchronize(true))status('Sunucu işlemi tamamladı ancak son durum yüklenemedi. Eşitle düğmesini kullan.',true);
 return result
}
async function run(action){
 if(busy)return;
 busy=true;
 try{await action()}
 catch(e){status('Bulut işlemi başarısız: '+e.message,true);
  if(active)await synchronize(true)}
 finally{busy=false}
}
const item=id=>app.getRemnantDB().pieces.find(x=>x.id===id);
async function itemAction(kind,piece,changes=null,origin='manual'){
 if(!piece)throw Error('Parça bulunamadı.');
 await mutate(kind,{id:piece.id,expectedVersion:piece.version,source:origin,changes})
}
async function importLocal(){
 const data=read(localStorage,LOCAL),stock=Array.isArray(data?.pieces)?data.pieces.filter(x=>x?.id&&x.l>0&&x.w>0):[];
 if(!stock.length)throw Error('Yerel stok bulunamadı.');
 if(!confirm(stock.length+' yerel stok kaydını ortak atölyeye kopyalamak istiyor musun?'+
  ' Bulutta aynı kimlikli parçalar DEĞİŞTİRİLMEZ.'))return;
 for(let i=0;i<stock.length;i+=60)await mutate('import',{created:stock.slice(i,i+60),source:'backup'});
 status('Yerel stoklar buluta kopyalandı. Yerel kopya ayrıca korunuyor.')
}
function interceptClick(e){
 if(!active||!e.target?.closest)return;
 const button=e.target.closest('button');if(!button)return;
 const target=button.id,action=button.dataset?.remnantAction,id=button.dataset?.remnantId;
 if(!['toggle','delete'].includes(action)&&
    !['remnantEditStatusAction','remnantDefaultSave','remnantConfirmProductionBtn','remnantImportBtn'].includes(target))return;
 e.preventDefault();e.stopImmediatePropagation();
 run(async()=>{
  if(target==='remnantImportBtn')throw Error('Bulut modunda yerel JSON yedeği buradan içe alınmaz. Yerel stokları buluta aktar seçeneğini kullan.');
  if(target==='remnantDefaultSave'){
   const value=$('remnantDefaultLocation').value.trim();
   if(value.length>80)throw Error('Raf adı çok uzun.');
   await mutate('settings',{defaultLocation:value});return
  }
  if(target==='remnantConfirmProductionBtn'){
   const plan=app.cloudProductionPayload();
   if(!plan)throw Error('Tamamlanmış, doğrulanmış ve güncel düz kesim planı gerekli.');
   if(!confirm('Fiziksel üretim TAMAMLANDI mı? '+plan.payload.created.length+
     ' artık eklenecek, '+plan.payload.consumed.length+' stok sunucuda tüketilecek.'))return;
   const done=await mutate(plan.kind,plan.payload,plan.operationId);
   if(done.ok)app.markCloudProductionComplete();
   return
  }
  if(target==='remnantEditStatusAction'){
   const match=$('remnantEditIdentity').textContent.match(/^Kimlik (.*?) ·/);
   const p=match?item(match[1]):null;
   if(!p)throw Error('Parçayı aç.');
   const kind=p.status==='available'?'consume':'restore';
   if(kind==='consume'&&!confirm('Bu parça bulutta kullanıldı işaretlensin mi?'))return;
   await itemAction(kind,p,null,app.getSelectedRemnantSource?.()||'manual');
   app.openRemnantEditor(p.id,app.getSelectedRemnantSource?.()||'manual');return
  }
  const p=item(id);
  if(action==='delete'){
   if(!confirm('Parça bulut envanterinden silinsin mi? Hareket geçmişi korunacak.'))return;
   await itemAction('delete',p);return
  }
  if(action==='toggle'){
   const kind=p?.status==='available'?'consume':'restore';
   if(kind==='consume'&&!confirm('Bu stok bulutta kullanıldı işaretlensin mi?'))return;
   await itemAction(kind,p)
  }
 })
}
document.addEventListener('click',interceptClick,true);
document.addEventListener('submit',e=>{
 if(!active||e.target?.id!=='remnantEditForm')return;
 e.preventDefault();e.stopImmediatePropagation();
 run(async()=>{
  const match=$('remnantEditIdentity').textContent.match(/^Kimlik (.*?) ·/),p=match?item(match[1]):null;
  if(!p)throw Error('Parça bulunamadı.');
  const num=id=>Number(String($(id).value).replace(',','.')),
   thick=$('remnantEditThickness').value.trim();
  const changes={l:num('remnantEditLength'),w:num('remnantEditWidth'),
   t:thick?num('remnantEditThickness'):null,
   material:$('remnantEditMaterial').value.trim(),
   location:$('remnantEditLocation').value.trim(),
   notes:$('remnantEditNotes').value.trim()};
  if(!(changes.l>0&&changes.l<=1e7&&changes.w>0&&changes.w<=1e7)||
     (changes.t!==null&&!(changes.t>0&&changes.t<=1e5))||
     !changes.material||changes.material.length>80||changes.location.length>80||changes.notes.length>220)
   throw Error('Geçersiz stok bilgileri.');
  await itemAction('update',p,changes,app.getSelectedRemnantSource?.()||'manual');
  $('remnantEditCancel').click()
 })
},true);
function bind(id,fn){$(id).onclick=()=>run(fn)}
bind('cloudConnectBtn',login);bind('cloudSignupBtn',signup);bind('cloudSignOutBtn',signout);
bind('cloudForgotBtn',sendPasswordResetEmail);bind('cloudResetPasswordBtn',finishPasswordRecovery);
bind('cloudOpenBtn',()=>selectWorkspace($('cloudWorkspaceSelect').value));
bind('cloudRefreshBtn',()=>synchronize(true));
bind('cloudLeaveBtn',async()=>{if(active)leave()});
bind('cloudCreateBtn',createWorkspace);bind('cloudJoinBtn',join);
bind('cloudInviteBtn',invite);bind('cloudImportLocalBtn',importLocal);
bind('cloudCopyInvite',async()=>{
 const text=$('cloudInviteCode').value.trim();if(!text)throw Error('Katılım kodu yok.');
 if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);
 else{$('cloudInviteCode').select();throw Error('Kod seçildi; elle kopyalayın.')}
 status('Katılım kodu panoya kopyalandı.')
});
window.addEventListener('online',()=>{if(active)synchronize(true)});
document.addEventListener('visibilitychange',()=>{if(active&&document.visibilityState==='visible')synchronize(false)});
draw();
showRecoveryFromUrl();
if(session&&config.url&&config.key){
 workspaces().then(items=>{
  if(config.workspace&&items.some(x=>x.id===config.workspace))return selectWorkspace(config.workspace);
  status('Bulut oturumu mevcut. Atölye seç.')
 }).catch(()=>{session=null;draw();status('Oturum yenilemek için yeniden giriş yap.',true)})
}
window.BeythausCloud={sendPasswordResetEmail,finishPasswordRecovery,showRecoveryFromUrl,explainAuthError,active:()=>active,normalizeConfig,selectWorkspace,synchronize,mutate,login,
 signup,leave,signout,importLocal};
})();