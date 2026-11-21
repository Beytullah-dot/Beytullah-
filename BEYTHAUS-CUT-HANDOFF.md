# Beythaus Cut — Proje devamlılık kaydı

> **Bu belge yeni sohbetler için tek başlangıç noktasıdır.**
> Son güncelleme: **21 Kasım 2026 (Türkiye)**.
> Kaynak depo: https://github.com/Beytullah-dot/Beytullah-
> Canlı uygulama: https://beytullah-dot.github.io/Beytullah-/
> Yayın dalı: `master`; GitHub Pages kaynak dizini: `/docs`.
>
> **Önemli:** Bu belge, oluşturulduğu andaki kayıttır; GitHub'daki son commit,
> testler, açık PR'lar, gerçek Supabase şeması ve kullanıcının en son açık
> kararlarıyla karşılaştırılmadan "her şey tamam" denilmemelidir.

## A. Yeni sohbette nasıl devam edilir?

1. Önce **bu dosyanın `master` dalındaki güncel hâlini** oku. Ardından
   `docs/BULUT-SENKRONIZASYON.md`, `docs/ENGINE-ARCHITECTURE.md`,
   `docs/index.html` ve ilgili `docs/engine/` kaynaklarına bak.
2. GitHub deposunun **son commitini**, açık PR/dalları, **son CI sonuçlarını** ve
   GitHub Pages dağıtımını doğrula. Geçmiş bir commitin testlerini yeni commit
   için başarılı sayma.
3. Supabase ile ilgili bir adım varsa bağlı gerçek Supabase projesini ve
   migration durumunu kontrol et. Proje ID: `pdqgpupdqgrxejvjpdzs`.
   Yalnızca kendi veritabanı şemasını, yetki durumunu ve gerekirse anonimleştirilmiş
   test kayıtlarını denetle; mevcut kullanıcı verisini gereksiz yere okumaya çalışma.
4. Son konuşma kararı önceki dokümanla çelişiyorsa **kullanıcının en son açık
   kararı** önceliklidir. Kodun mevcut hâli "uygulandı" bilgisidir; ürün kararının
   yerine geçmez.
5. Mevcut GitHub/Supabase projesinde çalış. **Yeni, bağımsız HTML projesi açma.**
   Çalışan yayın adresini ve bağlantıları koru.
6. Her önemli çalışma oturumunun sonunda bu dosyanın
   **"Güncel teknik durum / Son tamamlanan adım / Sıradaki adım"**
   kısımlarını güncelle. Yeni sohbetin önceki sohbeti görmesine güvenme.
7. Çalışmaları ve testleri GitHub'a kaydet; kullanıcıya somut commit/PR ve
   yayın bağlantısı ver. Otomatik test ile gerçek cihaz/gerçek stok testini
   birbirine karıştırma.

## B. Ürün tanımı ve kesinleşmiş kararlar

**Amaç:** Beythaus atölyesinde panel ve masif için iki boyutlu kesim planı,
stok/raf/QR takibi, malzeme maliyeti ve tamamlanmış üretim arşivi. Mobil ve
masaüstü uyumlu bir web/PWA; yalın, işlev odaklı arayüz.

### B1. Navigasyon ve projeler
- Ana alanlar: **Kesim Planı, Stok Envanteri, Maliyet Kayıtları,
  Hesap Ayarları**. Yan menü sade; menü ikonu aç/kapa işlevinde.
- **Proje Ayarları**, Kesim Planı içinde.
- **Projelerim** açıldığında proje listesi doğrudan görünür; arama sadece
  arama düğmesine basılınca açılır.
- Proje açma, PDF dışa aktarma ve yeni proje kısa yolları; proje kopyalama
  ve adlandırma; açık projeyi dosya/iCloud Drive'a yedekleme.
- Projeler **aynı atölye stok envanterini** paylaşır; projeye özgü geçici
  stok kopyası yüzünden gerçek stok iki kez tüketilemez.

### B2. Malzeme ve parça
- **Panel** ve **masif** aynı 2D kesim motorunun malzeme türleridir.
  Panelde renk/dekor, masifte ağaç türü belirlenebilir.
- Parça: boy, en, adet, opsiyonel etiket, kalınlık ve **parça yönü**;
  stok: boy, en, adet, malzeme, kalınlık, fiyat ve raf/göz.
  **Stok üzerinde yön seçimi YOK**; stokun girilen boy/en eksenleri
  yön için referanstır. Önceden kayıtlı stok `grain` alanı silinmez,
  fakat yeni kesim kısıtı olarak kullanılmaz.
- **Masifte kalınlık makinesi hesabı veya stoktan kalınlık düşürme yok.**
  Masif parça kalınlığı zorunlu ve stok kalınlığıyla eşleşmeli.
- Hem panel hem masifte **yalnız parça üzerinde** üç durumlu yön düğmesi:
  - **Boş:** yön serbest; iki yönde yerleşebilir.
  - **`=`:** enine; parçanın boyu stokun en eksenine paralel (90°).
  - **`Ⅱ`:** boyuna; parçanın boyu stokun boy eksenine paralel (0°).
  Kare parçalarda da yön/90° döndürme bilgisi korunur.
  Seçilen yön, parçanın ayrıca belirtilen döndürme izniyle tutarlı olmalı.
  Motor ve bağımsız audit aynı kuralı kullanır.
- Parçaların döndürülme izni ayrı bir fiziksel kısıttır.

### B3. Stok seçim modları
1. **Tek tip:** seçilen uygun stok/malzeme grubu.
2. **Karma otomatik:** uygun stoklar başlangıçta dahil; kullanıcı **malzeme
   grubu ve tekil stok** düzeyinde ayrı dahil etme/hariç tutma yapabilir.
3. **Karma özel:** kullanıcı malzeme eşlemelerini kendisi belirler.
- Otomatik seçimi kullanıcı tercihini yok saymamalı. Hariç tutulan stok
  optimizasyon sırasında "gizlice" kullanılmamalı.
- Kullanılabilir önceki kesim artıkları yeniden stok adayı olabilir.

### B4. Kesim motoru ve çıktı
- **Gerçek üretim planı yalnız fiziksel olarak uygulanabilir giyotin
  kesimdir:** her kesim, o anda kesilmekte olan alt stokun bir kenarından
  karşı kenarına kadar uzanır.
- Testere payı (kerf), kenar payı, adet, malzeme, kalınlık, damarlılık,
  döndürme izni ve stok sınırları denetlenir.
- **Yeni onaylanmış yön:** yerleşim hesaplamasından **ÖNCE**
  **maliyeti minimize et / brüt fireyi minimize et** hedefini seçtir.
  Seçilen birincil hedef için arama ve matematiksel kanıt çalışsın;
  seçilmemiş hedef ve minimum stok sayısı bilgi amaçlı raporlansın.
  **PR #17 ile uygulandı:** hesaplama öncesi hedef arayüze, motor
  sıralamasına ve hedefe özel kesin Worker çağrısına bağlandı. PR #26
  ayrıca iki hedefe özgü güvenli optimumluk sınırlarını güçlendirdi.
  Fiyat bilinmiyorsa maliyetin optimumluğu kanıtlanamaz.
- Üretime uygulanabilirliği bağımsız kesim ağacı denetimi doğrular.
  Geometrik serbest yerleşim varsa üretim talimatı olarak sunulamaz.
- Kesin arama/akademik optimizasyon yaklaşımı korunur; sınırlı sezgisel
  sonuç **küresel optimum** diye gösterilemez. Damar kısıtlı veya karma
  planların kanıtlanmayan optimumluğunu açıkça belirt.
- Üretim PDF'sinde stok/panel çizimi, parça listesi, ölçüler, kesim
  sırası, kerf ve kullanılabilir artıklar gösterilir.

### B5. Fiyat, maliyet ve üretim arşivi
- **Panel** fiyatı **₺/adet**, **masif** fiyatı **₺/m³**; fiyatlar **stok
  satırına özeldir**. Eksik fiyat sıfır veya uydurma piyasa fiyatı değildir,
  **bilinmiyor** olarak gösterilir.
- **Satış fiyatı, kâr veya kâr marjı hesabı yapılmaz.** Kullanıcının
  tanımladığı malzeme fiyatları ve isteğe bağlı ek maliyet + açıklama kaydedilir.
- Kesim planını hesaplamak ve planı onaylamak **envanter düşmez**.
  **Yalnız fiziksel üretim tamamlandı** onayı stokları tüketir.
- Tam stok adedi azaltılır; kullanılan tekil artık "kullanıldı" olur;
  yeni kullanılabilir artıklar kimlik, ölçü, malzeme, damar, raf/göz,
  kaynak üretim ve orantılı **kayıt değeri** ile envantere eklenir.
- Malzeme maliyeti ve artık değeri açıkça ayrıştırılır; oluşturulan
  üretim/kesim anının değiştirilemez **veri fotoğrafı** ve maliyet kaydı
  arşive alınır. PDF, kaydedilmiş üretim fotoğrafından yeniden üretilebilir.
- Aynı fiziksel üretimi yanlışlıkla iki kez tamamlamak engellenir.
- Hareket geçmişi, konum/raf-göz ve QR ile tekil artık takibi.

### B6. Hesap ve bulut
- Supabase Auth e-posta/parola, doğrulama, parola sıfırlama, çalışma alanı,
  yönetici davet kodu, ortak atölye üyeliği.
- **Yerel ve bulut envanterleri açıkça ayrıdır**. Yerel stoğu buluta
  kopyalamak **açık kullanıcı onayı** gerektirir. Buluta geçildiğinde cihazın
  yerel kayıtları silinmez/üzerine yazılmaz.
- Bulutta stok adedi/sürümü sunucu otoritesindedir; iki cihazın
  eşzamanlı fiziksel tüketimi çakışırsa ikinci işlem reddedilir. Yeniden
  denemeler aynı `operation_id` ile idempotent olmalıdır.
- Üretim tamamlamada tam stok, artık, fiyatlandırma, maliyet arşivi ve
  stok hareketleri tek atomik PostgreSQL işlemine bağlanır.
- Sunucu **mm** biriminde stok tutar; proje ekranı cm/mm gösterebilir.
- Gizli service role anahtarları ve SQL şifreleri hiçbir zaman istemciye,
  GitHub'a veya durum dosyalarına eklenmez.

## C. Teknik mimari ve dosyalar

- Depo: `Beytullah-dot/Beytullah-`.
- Web yayın içeriği: `docs/index.html`, `docs/*.js`, `docs/engine/*.js`,
  `docs/sw.js`, `docs/manifest.webmanifest`.
- Bağımsız motor sınırı: `docs/engine/cutting-engine.js`;
  malzeme politikası: `material-policy.js`; karma otomatik:
  `material-allocator.js`; denetim: `production-audit.js`;
  arşiv: `production-archive.js`.
- Bulut istemcisi: `docs/cloud-inventory.js`.
- Veritabanı migration'ları:
  `supabase/migrations/20261118_000001_cloud_inventory.sql`,
  `supabase/migrations/20261119_000002_full_stock_production.sql`.
- Yeni RPC'ler: `beythaus_cloud_snapshot_v2`,
  `beythaus_cloud_save_full_stock`,
  `beythaus_cloud_production_v2`.
- Testler: `tests/cut-validation.test.cjs`,
  `tests/cloud-sync.test.cjs`,
  `tests/cloud-production-v2-smoke.sql` ve `.github/workflows/`
  altında Geometry Tests + Optimizer Verification.
- Sunucuda stok/maliyet kayıtları güvenli RPC'lerle işlenir;
  `authenticated` için açık, `anon` için kapalıdır. RLS korumalı
  tablolara doğrudan istemci yazma yetkisi verilmez.

## D. Güncel teknik durum — 21 Kasım 2026

**Son motor birleştirmesi (PR #26):** `2886b99beb750cd677bed90a014e9a2addd72ce7`.
PR #26 mevcut `docs/engine/optimality-certificate.js` içindeki
tamsayılı stok örtüsü kanıtına **toplam parça alanı + eşik-boyutlu
parça kapasitesini aynı stok kombinasyonunda zorunlu tutan**
iki kaynaklı gevşetmeyi ekledi. Pozitif kerf ve trim ile güvenli;
ayrı `cost`, `area`, `count` sınırları üretir. Arayüzde
kanıtlanmamış olası iyileştirme için mutlak ve göreli **üst sınır**
gösterilir; bu bir tahmin veya garantili iyileştirme değildir.
Fiyatı bilinmeyen ilgili herhangi bir stok varken maliyet
optimumluğu ilan edilmez. PR: https://github.com/Beytullah-dot/Beytullah-/pull/26.
**Önceki fiziksel plan geliştirmesi (PR #24):**
`a722ce5d30df59a1f8893cad2c9f1ee42325a77a`.
Önce mevcut hızlı giyotin şerit yerleşimi çalışır; eksik plan kalırsa
artık yapraklarda farklı ölçülü parçalar için **daha derin, tam kenarlı
kesim ağacı** denenir. Her aday bağımsız denetlenir. Bu, yeni optimality
proof değil, eksiksiz geçerli plan arama iyileştirmesidir.
PR #24: https://github.com/Beytullah-dot/Beytullah-/pull/24.
PR #21 `87e8cbd12811617e6147bd45ef27c5d6f9b526c9` ile güvenli heterojen
eşik kapasitesi ve ayrı alan/maliyet kanıtı eklendi. PR #22 pozitif kerf
içeren farklı stok ebatları ve yüksek adetler için yalnız **yapıcı,
iki aşamalı giyotin şerit desenleri** üretir. Her aday bağımsız
`production-audit.js` denetiminden geçmeden mevcut planı değiştirmez.
Giyotin motorunun geri kalan sınıfları ve blok kurtarma korunur.
Sayı/yüksek adet giriş tavanı getirilmedi. Arama bütçesi veya başarısız
desen üretimi `UNKNOWN` olup imkânsızlık/optimumluk kanıtı değildir.
PR #18 (`ba49e9cb3230da110a390cb3b56420d51012458b`) CI hazırlık yarışı
onarımını içerir. Aşağıdaki PR #17 açıklaması aynı motor hattının önceki
adımıdır; GitHub'da daha yeni `master` HEAD her oturumda ayrıca okunmalıdır.
Seçilen **minimum brüt fire** / **minimum kayıtlı stok maliyeti** hedefi
kullanıcının hesaplama öncesi tercihi olarak UI/heuristic/Worker akışında
çalışıyor. Brüt alan, kayıtlı fiyat ve minimum stok adet kanıtları birbirinden
ayrı tutuluyor; fiziksel giyotin ağacı bağımsız denetleniyor. `UNKNOWN`
hiçbir zaman optimumluk sertifikası değil. PR #17:
https://github.com/Beytullah-dot/Beytullah-/pull/17

**Master teslim kapıları (21 Kasım):** Pages run `44839331617` SUCCESS;
Optimizer Verification `44839332426` SUCCESS;
iPhone WebKit emülasyonu `44839332340` SUCCESS;
Geometry `44839332354` ilk denemede Docker Postgres geçici-açılış
bağlantı yarışında başarısız, **attempt 2 SUCCESS**. Bu hata motor regresyonu
değil test altyapısının hazırlık yarışıydı; düzeltme PR #18 kapsamındadır.
Gerçek iPhone/Safari ve canlı JS içerik baytları ayrıca doğrulanmadı.

**Doğrulanmış (tarihsel sürüm):**
- Mevcut uygulama GitHub Pages'te `master/docs` yoluyla yayında.
- Önceki geliştirme PR'ı **#1 birleştirildi**:
  https://github.com/Beytullah-dot/Beytullah-/pull/1
- Yayın birleştirme commit'i: `05ba26eede961ddaf8e05c6ba1412ec82591f5d6`.
- İlgili GitHub Pages dağıtımı **success**:
  https://github.com/Beytullah-dot/Beytullah-/actions/runs/44619408210
- Aynı commitin Geometry Tests ve Optimizer Verification işlemleri **success**:
  https://github.com/Beytullah-dot/Beytullah-/actions/runs/44619406932
  https://github.com/Beytullah-dot/Beytullah-/actions/runs/44619407244
- Gerçek Beythaus Cut Supabase projesinde **10 tablo**, tamamı RLS etkin.
  V2 migration uygulandı; mevcut çalışma alanları/üyelikler ve eski
  envanter silinmedi.
- Geri dönüş için eski canlı sürüm dalı:
  `release-backup/pre-v2-2026-11-20`
  (baz commit: `bdb471d29432aa6d3c8e4342c5f97b98ef0d422b`).

**Henüz doğrulanmamış / eksik:**
- Yeni sürümün **gerçek iPhone/Safari kullanıcı kabul testi**.
- İki gerçek Supabase kullanıcısıyla uçtan uca bulut stok düzenleme,
  stok tüketme, artığı kaydetme, arşiv ve PDF testi.
- **Sunucunun bağımsız fiziksel giyotin kesim ağacı denetimi**. Mevcut
  istemci denetimi sunucu için güvenilmeyen veri kabul edilmelidir.
- Gerçek bulut stoklarıyla saha üretim denemesi. **Saha testi geçmeden
  gerçek fiziksel stoğu tüketme komutu verme.**
- Stok alım/satın alma nakit akışı, tam stok için QR, dönemsel maliyet
  rapor filtreleri ve daha ileri optimumluk kanıtları.
- Supabase güvenlik danışmanının `SECURITY DEFINER` fonksiyon uyarıları:
  istemci kullanımına tasarlanmış kasıtlı RPC'lerdir, fakat üyelik/yetki
  sınırları düzenli gözden geçirilmelidir.

### 20 Kasım 2026 — PR #2 birleştirildi, mobil WebKit regresyonu doğrulandı

- **Mevcut uygulama üzerinde devam edildi; yeni demo oluşturulmadı.**
  PR #2 ("iPhone WebKit kabul testleri ve gerçek Safari kontrol listesi")
  **birleştirildi**: https://github.com/Beytullah-dot/Beytullah-/pull/2.
  Birleştirme commit'i: `ff9e0332290929b65d957b2ce98190e8e58e6b52`.
- **Aynı master merge commit'inde dört otomatik sonuç da SUCCESS:**
  - Geometry Tests: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44626326760
  - Optimizer Verification: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44626326664
  - iPhone WebKit Acceptance Smoke: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44626326671
  - GitHub Pages deployment: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44626326634
- **Test edilen kapsam:** WebKit iPhone 13 emülasyonunda sayfa açılışı/yenileme;
  tek menü düğmesi ve dört ana alan; Projelerim listesi/arama;
  parça ve stokta damar döngüsü; karma otomatikte tekil stok hariç
  tutma; iki plan seçeneği; bağımsız giyotin denetiminden geçen plan;
  yalnız hesaplamanın stok miktarını değiştirmemesi; tarayıcı JS hataları.
  `tests/ios-webkit-acceptance.cjs` ve
  `.github/workflows/ios-webkit-acceptance.yml` artık `master` dalında.
- **Gerçek iOS/Safari ve bulut E2E henüz doğrulanmadı.** WebKit otomasyonu
  gerçek iPhone, kamera, iki ayrı Auth hesabı, gerçek ağ kopması, PDF paylaşımı
  veya sunucu üzerindeki fiziksel üretim tamamlaması değildir.
  Saha listesi: `tests/SAFARI-UAT-CHECKLIST.md` — maddeler henüz
  **Denenmedi**. İstemci audit'i güvenilmeyen kesim ağacının sunucuda
  yeniden doğrulanması yerine geçmez.
- `docs/BULUT-SENKRONIZASYON.md` içindeki V2'nin yalnız geliştirme
  dalında olduğu yönündeki eski durum metni, `f21c5a319877266c9f463f669d771957d70d80de`
  dokümantasyon commit'i ile gerçek `master` dağıtımına göre düzeltildi.
  Bu ve mevcut handoff güncellemesi yalnız dokümantasyondur; uygulama
  çalışma algoritmasını veya kullanıcı envanterini değiştirmez.
- **Gerçek Supabase denetimi (salt-okunur):** proje
  `pdqgpupdqgrxejvjpdzs` `ACTIVE_HEALTHY`; migration
  `20261118212836` ve `20261119202121`, 10 public tablo ve tümünde RLS
  etkin. Kontrol anında tam stok, tekil artık ve tamamlanan üretim
  tablolarında **0 satır** vardı. Gerçek stok/kullanıcı verisi değiştirilmedi.
- Dokuz `beythaus_cloud_*` SECURITY DEFINER RPC'si
  `anon` rolüne **kapalı**, `authenticated` rolüne **açık**; fonksiyonların
  yetki gövdelerinin bütün kullanım yolları ayrıca denetlenmelidir.
  Güvenlik danışmanı on RLS/policy bilgi uyarısı, dokuz RPC uyarısı ve
  **Leaked Password Protection Disabled** bildiriyor:
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
  RLS uyarıları, doğrudan tablo erişimi kapalı RPC tasarımıyla
  birlikte değerlendirilmelidir.
- Canlı GitHub Pages dağıtımının başarı durumu Actions ile teyit edildi;
  **bu çalışma ortamından canlı sayfanın doğrudan HTTP/Safari ekranı
  görüntülenemedi**. Canlı iPhone kabulü iddia edilmemelidir.

### 20 Kasım 2026 — Matematiksel kesim motoru PR #3, büyük ölçekli kanıt

- **PR #3 master dalında BİRLEŞTİRİLDİ:**
  https://github.com/Beytullah-dot/Beytullah-/pull/3
  Birleştirme SHA: `0c8b4203a0c9ec645fa4bd115a3a986b9e57ddf3`.
- **Aynı merge SHA'da dört GitHub Action SUCCESS:**
  - Geometry: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44640631564
  - Optimizer Verification: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44640631600
  - iPhone WebKit emülasyonu: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44640631648
  - GitHub Pages: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44640631574
- **Yeni matematiksel modüller:**
  `docs/engine/optimality-certificate.js`,
  `docs/optimality-worker.js`. Miktarla sınırlı tamsayı stok-örtüsü
  problemi Pareto dinamik programlamayla tam çözülür. Geometri gevşetilir,
  dolayısıyla sertifikalı sonuç matematiksel **alt sınırdır**; denetlenmiş
  giyotin plan bu alt sınıra erişirse ilgili hedefin küresel optimumluğu
  kanıtlanır. Artık süre/işlem sınırı aşılırsa sertifika üretilmez.
- **Kapasite kanıtı:** aynı ölçülü parçalar için kerf'li stok eksenleri
  boyunca yerleşebilecek **maksimum parça adedi** üst sınırı eklendi.
  Parça/stok sayısına bağlı 11 parça üstü doğrudan elenmek zorunda değil.
  Denenip doğrulanan örnek: 400 adet 22×22 mm parça, 3 mm kerf,
  25 adet 100×100 mm stok. Her levhada en çok 16 parça olduğundan
  **minimum 25 levha**, fiziksel giyotin kesim ağacı denetiminden geçen
  25 levhalık planla ispatlandı. Aynı ölçü/fiyat stok koşullarında
  minimum brüt alan ve kayıtlı stok maliyeti de kanıtlandı.
  Ek örnekler: 100 parça / 25 stok, 25 adet 60×60 / 25 stok.
- **Regresyon:** 160 deterministik rastgele küçük stok kombinasyonunda
  stok sayısı, alan ve maliyet alt sınırları bağımsız tam taramayla
  **480/480** eşleşti; test `tests/motor-proof-foundation.cjs`.
  WebKit emülasyonunda yön yalnız parça üzerinde ve ekonomik/alan/stok
  sertifikaları UI'da doğru gösteriliyor.
- **Karma otomatik güvenlik:** yalnız seçilmiş malzeme atamasının
  sertifikası tüm atamaların optimumluğu diye **gösterilmez**.
  Yalnız tüm uygun malzemeleri kapsayan gevşetilmiş stok alt sınırına
  ulaşıldığında `OPTIMAL` denir.
- **Ürün kararı güncellendi:** stokta yön düğmesi kaldırıldı; yön
  yalnız parçada **serbest / boyuna / enine**, stok boy/en eksenine göre
  çalışır. Geçmiş stok `grain` metadata'sı silinmedi.
- **MOTOR HENÜZ MÜHÜRLENMEDİ.** Büyük karma ölçülü, alternatif
  stoklu ve karma otomatik projelerin hepsini sonlu zamanda kesin
  çözme garantisi yok. Maliyet-vs-fire öncelik seçimi de henüz
  ana optimizasyon aramasını yönetmiyor. Detaylı kabul koşulları:
  `tests/MOTOR-PROOF-STATUS.md`.
- **Supabase şeması/gerçek stoklar değiştirilmedi.** WebKit CI
  gerçek iPhone/Safari veya sahada fiziksel kesim testi sayılmaz.

### 20 Kasım 2026 — PR #4, parça limiti yerine ölçümlü motor araştırması

- Kullanıcı isteği açık: **25 levha bir maksimum değildir**; gerçek
  bir atölye işi sadece örnektir. Kullanıcıya keyfî levha/parça
  girişi sınırı dayatılmayacak. Kanıtlanabilir tek bir en yüksek
  parça sayısı matematiksel olarak tanımlanamaz. Basit çok büyük
  örnekler kanıtlanabilirken küçük heterojen örnekler zor olabilir.
- **PR #4 master'a birleştirildi**:
  https://github.com/Beytullah-dot/Beytullah-/pull/4
  Merge commit `c38bb567b5f6b2d0251ab4b4c9872e5946a286d2`.
  Bu PR yalnız araştırma/test altyapısıdır; motor algoritması
  veya gerçek stok/sunucu kayıtları değişmedi.
- **11 adet kesinlikle fiziksel kesilebilir planted-guillotine
  benchmark** oluşturuldu; 5/10/25/50 stok, 20–400 parça,
  3 mm testere payı, 4/8 parça/levha ve üç farklı stok ölçüsü.
  Kaynak kod: `tests/motor-scalability-profile.cjs`.
  Test raporu: `tests/MOTOR-SCALABILITY-RESEARCH.md`.
  İlk CI: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44651625204
- **Gerçek ölçüm:** 4 örnekte plan eksiksiz ve stok sayısı
  optimal kanıtlı; 7 örnekte, çözümün kesin var olduğu bilinmesine
  rağmen bazı parçalar yerleşmedi. Örneğin 200 parça / 25 levha,
  3 kesim seviyesinde **23 parça yerleşmedi**; üç farklı
  stok türü içeren eş boyuttaki işte **36 parça yerleşmedi**.
  200 parça / 50 levha, 2 seviyeli kesimde ise **tamamı yerleşti,
  minimum stok kanıtlandı**. Bunlar yalnız ölçülen başlangıç
  fixture'ları, tüm projelerin başarı oranı değildir.
- **Kök engel:** `packAttempt` tek parça açgözlü yerleşim
  yapıyor; `improveGroupPacking` çözüm eksikse veya 8 levhadan
  fazlaysa devre dışı. Bu yüzden basit başlangıçta açılmış
  yanlış kesim boşluklarını 25 levhalık zor bir projede
  geri alacak kurtarma fazı yok. Aynı zamanda subset exact solver'ın
  11–12 parça civarı sınırı üstel durum uzayı ve bitmask'ten
  doğuyor; bu limiti körlemesine kaldırmak hatalı.
- **Akademik yön:** stage-unrestricted guillotine için
  blok/desen oluşturma ve maximal-spaces tree-search;
  büyük işleri toparlamak için large-neighborhood
  repair / anytime iteratif arama; ispat için sınıfa uygun
  pattern-column generation / branch-and-price / sınırlar.
  Yöntemlerin exact çözüm sınıfları karıştırılmamalı.
- **MOTOR HENÜZ MÜHÜRLENMEDİ.** Bu araştırma, sonucu iyi
  göstermek yerine gerçek eksik yerleşim sorununu ölçtü.

### 20 Kasım 2026 — PR #5, giyotin blok sentezi ve eksik plan kurtarma

- **Yeni motor PR #5 `master` dalına birleştirildi**:
  https://github.com/Beytullah-dot/Beytullah-/pull/5
  Merge: `b9e266b084859a0c47dd3a0436e799b6f8978026`.
- Yeni modül: `docs/engine/guillotine-block-repair.js`.
  Eski açgözlü motor eksik parça bıraktığında **fiziksel
  giyotin blok desenleri** oluşturuluyor. 2, 4, 8
  ve bazı işlerde 16 parçalık bloklar, eş kenar/kerf
  koşullarına göre birleştiriliyor. Tam ve yakın-tam
  levha blokları, dış kenar kesimi ve ölçülü artıklarıyla
  beraber yeniden oluşturuluyor.
- Yeni geometrik yerleşimler **yalnız**
  `production-audit.js` kesim ağacı denetiminden
  geçerse kullanılabiliyor. Kesim parçaları orijinal
  kimlik/ölçü/yöne ayrılıyor. Başarısız/yetersiz yeni
  aday eski planı bozmuyor. Envanter tüketilmiyor.
- **Başlangıç benchmark sonucu:** 11 garantili
  fiziksel olarak üretilebilir örnekte eski motor 4/11
  tam plan üretirken yeni motor **11/11 tam plan** üretti;
  bunlarda minimum stok sayısı da alt sınıra ulaşıldığından
  kanıtlandı. En büyük örnek 400 parça / 50 levha /
  3 farklı stok boyutu, 3 mm kerf; önce 54 eksik, şimdi 0.
- **Bağımsız 34 ek sabit-seed stres testi:**
  24/24 adet 25 levhalık, 200 parçalık farklı ölçü/
  farklı stok girişinde tam plan; 5/5 kullanılabilir
  dış artık bırakan işte tam plan; 4/5 daha derin
  kesim ağacında tam plan. **Toplam 33/34 tam,
  bir zor senaryoda 3 parça henüz yerleşmiyor.**
  Bu 34 senaryonun tamamı öncekinden kötü değil,
  34/34'ü en az bir parçayı kurtardı.
  Kaynak ve rapor:
  `tests/motor-repair-stress.cjs`,
  `tests/MOTOR-BLOCK-REPAIR-RESULTS.md`.
- Yukarıdaki sayıların hepsi kontrollü, gerçek
  fiziksel giyotin kesimlerden oluşturulmuş test
  verilerine aittir. **Tüm 25 levhalık saha
  projelerinde başarı/optimumluk garantisi değildir.**
  Bitmask exact solver sınırı kaldırılmadı;
  yalnız ölçeklenebilir ayrı bir arama sınıfı eklendi.
- Gerçek iPhone, 2DPackLib dış örnekleri, karma
  otomatik maliyet/fire araması ve sunucuda bağımsız
  kesim ağacı tekrar denetimi hâlâ eksik.
  **MOTOR HENÜZ MÜHÜRLENMEDİ.**
- PR üzerinde geometri/optimizasyon, araştırma
  benchmark ve iPhone WebKit emülasyonu CI **SUCCESS**
  alındı; master merge commit iş akışları ayrıca
  yeniden doğrulanmalıdır.

## E. Son tamamlanan adım / sıradaki adım

**Son tamamlanan motor adımı (21 Kasım):** PR #26,
`master` birleştirme
`2886b99beb750cd677bed90a014e9a2addd72ce7`.
Kerf ve kenar paylı bütün parçaların **toplam alanı** ile
büyük parça alt kümelerinin aynı stoklardan karşılanması
gereken **sayı kapasitesi** iki boyutlu Pareto tamsayı
örtüsü olarak birlikte çözülüyor. Maliyet ve brüt alan
kanıtları farklı fiziksel planlar için bağımsız ve doğrulanabilir.
Kanıtlanmamış kalan mutlak fark ve mevcut maliyet/brüt alan
ölçeğine göre yüzde fark arayüzde gösterilir. `UNKNOWN`
halen optimumluk veya imkânsızlık kanıtı değildir.

**Sonraki araştırma:** 20–25+ çok farklı parça ve stok tipiyle
bağımsız optimality-gap dağılımlarını ölç; fiyat/alan kanıtı
açık vakalarda çok-eşikli eşzamanlı LP/MILP veya doğrulanmış
guillotine pattern pricing geliştir. Tam kesim ağacı ve
üretim sınıfının matematiksel eşdeğerliği doğrulanmadan
genel branch-and-price veya CP-SAT kesin optimum iddiası
kurma; mobil süre/bellek, canlı baytlar ve gerçek Safari
kabulünü ayrıca yap.
Karışık şeritlerin yanında kalan serbest dikdörtgenlerde farklı boyuttaki
parçalar için tam kenardan kesilen yeni fiziksel alt ağaçlar kuruluyor.
18 bağımsız planted 4-kesimli benchmarkta önce **0/18 tam**,
şimdi **18/18 tam**; 30 levha / 6 fiyatlı-ebatlı stok tipi /
150 parça büyük planted işte önce **60 eksik**, şimdi **0 eksik**.
Bağımsız kaynak kesim tanığı ve motor çıktılarının audit'i PASS.
160 parça / 80 levhalı eski kurtarma regresyonu da PASS.
`UNKNOWN` asla optimumluk değildir.

**Sonraki matematik önceliği:** Bu daha iyi fiziksel adayların
minimum kayıtlı maliyet ve minimum brüt alan açısından optimumluğunu
birbirinden bağımsız alt sınırlar ve ölçülen optimality gap ile kıyasla;
büyük heterojen holdout için güvenli pattern dominance/fiyatlandırma
ve gerektiğinde kapsama uygun MILP/CP-SAT/branch-and-price araştır.
İki aşamalı sezgiseli veya iç içe artık kurtarmayı genel
branch-and-price kesin çözücü sayma.
PR #21 boyut eşiğine göre min-kenar kare kapasitesi üzerindeki
bağımsız tamsayı stok örtüsü alt sınırlarını güçlendirdi; `count`, `area`
ve `cost` ayrıdır. PR #22 farklı stok ebatları, pozitif kerf, kenar
payı, parça yönü ve farklı stok fiyatları için tam kenar kesimli yeni
**fiziksel şerit deseni üreten, sınırlı kaynaklı bir sezgisel yöntem**
ekledi. 160 parçalı/80 levhalı testte plan eksiksiz ve bağımsız
kesim ağacı denetiminden geçti; bu tüm büyük işlere garanti değildir.
`UNKNOWN` sonuç sertifika değildir, Supabase ve gerçek stoklar değişmedi.

**Sonraki motor geliştirmesi:** Çok daha heterojen ve derin kesim
ağaçlarında eksiksiz giyotin plan üretim oranını bağımsız planted
fixture'larla ve süre/bellek maliyetiyle ölç, gerektiğinde bounded
large-neighborhood / desen araması geliştir. Alan ve maliyet için
ayrı güvenli alt sınır ve optimality gap'i artır; ancak **tüm
giyotin aşamalarını kapsayan ispatlı fiyatlandırma ve dallanma**
uygulamadan iki aşamalı pattern generator'ı gerçek bir
branch-and-price/MILP/CP-SAT genel kesin çözücü diye tanıtma.
Yayın baytları, gerçek iPhone ve bulut saha kabulü ayrı açık.
Farklı ölçülü ve farklı fiyatlı stoklarda pozitif kerf için tüm parçaların
içine çizilebilen en küçük kareye dayalı güvenli stok-başı kapasite sınırı
eklendi; sabit eksenli özdeş parça sınırı da korunuyor. 27 farklı ölçü/yön
satırlı parça, iki stok ölçüsü/fiyatı, kerf=3 mm ve kenar payı=2 mm ile
bağımsız denetlenmiş fiziksel kesim planları elde edildi. Kayıtlı maliyette
2.700 TL / 27 levha, brüt alanda 269.325 mm² / 27 levha ayrı ayrı kanıtlı;
bu iki optimum birbirinin yerine geçmez. 27 genel bir üst sınır değildir.
PR CI dörtte dört SUCCESS; üretim stokları/Supabase değişmedi.
**Sıradaki geliştirme:** 20–25+ levha, yüksek tekrar, çoklu fiyat ve pozitif
kerf için gerçek giyotin desenlerini üreten ve `UNKNOWN` arama sonlarını
koruyan pattern generation/dominance; seçili alan ve maliyet için ayrı
güvenli alt sınır ve açık optimality gap; bağımsız oracle ve süre/bellek testleri.

**Önceki tamamlanan (21 Kasım):** PR #17, `master` birleştirme
SHA `f06bb23d8aefc52796f0a19910978d8efcba4a8e`.
Ana kesim hesaplama hedefi artık `area` veya `cost` olarak seçiliyor;
hızlı plan ve karma otomatik dağıtım hedefi izliyor, kesin Worker
seçili hedefe göre çalışıyor ve maliyet/alan sertifikaları birbirine
çevrilmiyor. İyileşen fiziksel yerleşim yalnız bağımsız giyotin
denetiminden sonra uygulanıyor, stok düşülmüyor.
BENG02 WebKit: 40 parça, denetlenmiş **6 levha**;
2.001 parçalı mobil seri PDF doğrulandı.
PR CI dörtte dört SUCCESS. Master Pages/WebKit/Optimizer SUCCESS;
master Geometry ilk Docker başlangıç yarışından sonra tekrar çalışmada
SUCCESS. Güvenlik sınırı: tüm karma otomatik malzeme atamaları
kanıtlanmadan yalnız bir dağılımın kesin sonucu küresel
optimum diye gösterilmez.

**Sıradaki adım (21 Kasım):** Büyük heterojen stok/pozitif kerf/
yüksek adet işlerinde seçili `area` veya `cost` hedefi için
kanıtlı alt sınırı güçlendir, kapanmayan optimality gap'i raporla;
önce yerleştirilebilir tam giyotin çözümü bul, sonra pattern/
dominance/branch-and-price veya doğrulanabilir MILP/CP-SAT yöntemiyle
kapsamı büyüt. Sabit maksimum parça/levha sayısı koyma;
`UNKNOWN` imkânsızlık veya optimumluk değildir.
Gerçek Safari, üretim verisinden bağımsız TEST stokla 2 kullanıcı
UAT, server-side kesim ağacı tekrar denetimi ayrıca açık.
PR #18: https://github.com/Beytullah-dot/Beytullah-/pull/18
yalnız CI PostgreSQL final-server readiness ve handoff düzeltmesi.

**Önceki tamamlanan (20 Kasım):** PR #5 sonrasındaki `78afc8e` temelinden
dengesiz blok onarımı ve işe ait testere payının kullanılması geliştirildi.
`deeper-pattern-0` 158/158 parça, 148 kesim, minimum 10 levha kanıtlı.
11/11 temel ve 34/34 stres işi tam. Resmî 2DPackLib BENG ailesinde sabit yön,
sıfır kerf ve giyotin kısıtıyla 10/10 tam plan, 7/10 minimum levha kanıtı.
Ölçüm, kaynak ve yeniden çalıştırma: `tests/MOTOR-BLOCK-REPAIR-RESULTS.md`.
PR #6 master'a birleşti: `7629b66330285c716b07760646d1d8678b30e1f5`.
[Pages yayını](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44660360621),
master geometri (44660361085), optimizasyon (44660361097) ve iPhone WebKit
emülasyonu (44660361141) başarılı. İki motor dosyası ile sw.js canlı URL'den
alınıp bu sürümle bayt düzeyinde karşılaştırıldı. PR araştırma CI: 44660199269.
Genel regresyonda 72/72 geçerli plan; `alternate stock types` örneğinde
minimum 1 levha iken sezgisel plan 2 levha kullanıyor.

**Yayın doğrulaması (20 Kasım):** [PR #7](https://github.com/Beytullah-dot/Beytullah-/pull/7) master dalına birleşti (`2898a44140e8c65180212ed78f66fa02c420d393`). [Pages yayını](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44713952855), geometri (44713952440), optimizasyon (44713952160) ve WebKit emülasyonu (44713952415) başarılı. Üç motor/dağıtım modülü ve sw.js canlı URL'de bu commit ile bayt düzeyinde eşleşti.

**Takip geliştirmesi (20 Kasım):** Karma otomatikte “En ekonomik” ve
“En az stok” ayrı adaylarla aranıyor. Aynı malzeme örneğinde 2 levha/50 ₺
ve 1 levha/100 ₺ birlikte doğrulandı. Stok adedi hedefli regresyonda 72/72
geçerli, uygulanabilir 42/42 işte bağımsız optimum ile eşleşme var. Resmî
BENG sonuçları 10/10 tam ve 9/10 minimum stok kanıtlı. BENG01 için yarım
boy/en izdüşümüyle 4 levha kanıtlandı. BENG04 için şerit aramasıyla 11
levha bulundu. BENG02 için 6–7 aralığı açık. 75 saniyelik bağımsız
tamsayılı giyotin modelinde 6 levha hakkında karar alınamadı.

**Yayın doğrulaması (PR #8):** [PR #8](https://github.com/Beytullah-dot/Beytullah-/pull/8) master'a birleşti (`a0487d4f19f7d760a7dbcc022d3f1f5a98ec4d82`). [Pages](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44724964905), geometri (44724965225), optimizasyon (44724965106) ve [mobil WebKit](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44724965139) başarılı. Yayındaki index.html, optimizasyon Worker'ı, desen arama modülü ve sw.js birleştirilen dosyalarla aynı. PR'daki ilk WebKit çalışması eksik unzip yüzünden durdu; ikinci çalışmada altı levha doğrulandıktan sonra yenileme sırasında yükleme hatası alındı. Nihai test tam sertifika sonucunu bekliyor ve yakalanmayan tarayıcı hatalarını denetliyor.

**BENG02 kapandı (20 Kasım):** 40 parçanın alanı 1.420, beş adet 25×10
levhanın alanı 1.250. Altı levhada bağımsız olarak doğrulanmış kesim ağacı
var. Hızlı aşama 7 levha, arka plan Worker araması 6 levha üretiyor.
Kayıtlı CP-SAT tanığı `tests/fixtures/beng02-cut-witness.json` yalnız testte
kullanılıyor. Üretim kodu planı parça ölçülerinden yeniden buluyor.
BENG ailesinde 10/10 tam ve minimum levha adedi kanıtlı; sıfır kerf,
sabit yön ve tek stok ölçüsü. `node tests/motor-beng.cjs` ile tekrarlanır.

**Yayın doğrulaması (PR #9):** [PR #9](https://github.com/Beytullah-dot/Beytullah-/pull/9) master dalına birleşti (`dd35f5fb26fb06b95bfabc8308fe327810075caf`). [Pages](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44727291803), geometri (44727292415), optimizasyon (44727292316) ve [mobil WebKit](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44727292297) başarılı. Karma deney CI: 44727133187. Yayındaki index.html, cutting-engine.js ve sw.js birleştirilen kaynakla bayt düzeyinde eşleşti.

**Karma atölye ölçümü (20 Kasım):** Pozitif testere ve kenar payı, üç
stok ebadı, sonlu adet ve üç parça yönü birlikte sınandı. İki iş hem masif
hem panel içeriyor. 26/26 tam ve denetlenmiş; 16/26 minimum levha kanıtlı,
10 işte fark 1–4. 399 parçalık işte kerf içeren alan alt sınırı 25'e
ulaştı. 12 küçük tam tarama referansı motorla eşleşti. Ayrıntılı tablo ve
tekrar komutu: `tests/MOTOR-WORKSHOP-RESULTS.md`.
Kaydedilmiş projelerdeki 250 parça satırı, 100 stok satırı ve 800 seçili
stok kimliği sonrasında sessiz veri kesilmesi giderildi. Doğrudan motor
yük deneyi ile formun aktif girdi sınırları ayrı raporlandı.

**Son açık kullanıcı hedefi:** Önce matematiksel
kesim motorunu tamamlama/mühürleme; kullanıcıya
**keyfî bir maksimum parça veya levha sayısı
koyma**. 25 levha sadece gerçek atölye proje
ölçeğinin örneği. Gerekirse kaynakla sınırlı
arama UNKNOWN kalabilir ama fiziksel plan varsa
kullanılabilir kalmalı.

**PR #10 — seri kesim yayını (20 Kasım):** [PR #10](https://github.com/Beytullah-dot/Beytullah-/pull/10)
`913edd97fecddb6b071a24c6e66cea348d05353d` ile master dalına birleşti.
[Pages](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44728732110)
yayınından alınan index.html, quantity-plan.js ve sw.js kaynakla bayt düzeyinde eşleşti.
[PR WebKit](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44728554956)
mobil hesaplama ve indirilen PDF'nin metninde 2.001 parça, 125 tekrarlı levha
ve 1 son levha doğruladı. 104×104 mm stok, 22×22 mm parça, 2 mm kenar ve
3 mm testere payında genişletilmiş alan sınırı levha başına 16 parçadır;
126 levha minimumdur. Bağımsız küçük şerit deneyi 18.069 yerleşimin
kesimlerini tekrar yürüttü. Geometri, optimizasyon ve ölçek CI başarılı.
Seri yol fiziksel stok veya artık kaydı üretmez; gerçek cihaz kabulü açıktır.

**PR #11 yayını (20 Kasım):** [Karma seri kesim](https://github.com/Beytullah-dot/Beytullah-/pull/11)
`3db35b5b02cd90cf3c3cd291149589c5638b05c8` ile master dalına birleşti.
[Pages](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44729624696)
yayınında index.html, quantity-plan.js ve sw.js kaynakla bayt düzeyinde eşleşti.
[Mobil WebKit](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44729625332)
indirilen PDF'deki YAN, TABAN, yönler ve 751 levhalık tekrarı denetledi.
[Motor ve ölçek testleri](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44729430911)
başarılı. Karma atölye senaryoları 26/26 eksiksiz, 16/26 kanıtlı.

**PR #12 yayın doğrulaması:** [PR #12](https://github.com/Beytullah-dot/Beytullah-/pull/12) `278612fc3d56ad222e64550f21ce83331302c078` ile master dalına birleşti. [Pages](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44763022716), geometri, optimizasyon ve [WebKit](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44763025588) başarılı. Canlı blok kurtarma modülü ve sw.js birleştirilen dosyalarla bayt düzeyinde eşleşti. [Ölçek testi](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44732639321) ve 10/10 BENG başarılı. Yeni sürümle tekrar ölçülen 133 mümkün küçük işin tamamı eksiksiz, 132'si bağımsız minimuma eşit, 111'i motor tarafından kanıtlı. Sonraki motor adımı 67 numaralı iki levhalık referans vakası.

**Asimetrik giyotin ağaçları (20 Kasım):** Önceki bağımsız motor denetiminde
bulunan 8, 16, 20, 28, 29 ve 32 numaralı vakalar birlikte 12 eksik parça
bırakıyordu. Yeni kurtarma araması farklı derinlikteki iki alt ağacı,
ortak tam kenar ve testere payıyla birleştiriyor. Stokta karşılığı olan
adaylar, parça kimlikleri çakışmadan tüm talebi karşılarsa fiziksel kesim
denetimine gönderiliyor. Arama bütçesi dolarsa mevcut plan korunuyor.
Özdeş üreticide farklı tohumlarla karşılaştırma (tam / minimum levha kanıtlı):

| Grup | Önce | Sonra |
|---|---|---|
| Önceki 36 denetim işi | 30 / 20 | 36 / 26 |
| Geliştirmeden önce ayrılan 36 yeni tohum | 28 / 15 | 36 / 23 |

İki grupta da payda 36. Altı asıl regresyon varsayılan hesaplama yolunda
ters giriş sırası ve yeni parça kimlikleriyle de denetlenir. Tekrarlanabilir
test: `node tests/motor-asymmetric.cjs` ve `--holdout`.
Yeni grupta 13 işte minimum levha sayısı açık. Önceki küçük iş denetiminde
67 numaralı altı parçalı işin referans optimumu iki levhadır. Üç levha
kullanan kesirli ölçülü aday ve zayıf alt sınırlar sonraki motor hedefleri.

**Sıradaki teknik adım:**

1. Tek tam stoktan farklı etiket/ölçü/yöndeki yüksek adetli parça satırları,
   aynı levhada birbirini izleyen şeritler kullanabilir. Tam mm, sabit malzeme;
   satır adetleri ve fiziksel şeritler bağımsız denetlenir. Test: 751 çift,
   1.502 parça, 751 levha; bir şablon, iki parça yönü, minimum levha kanıtı.
   Küçük karma testlerde 780 plan fiziksel olarak tekrar kesildi, 696'sında
   alan alt sınırı optimumluğu kanıtlamadı. Şerit sıralaması sezgiseldir.
   Sırada açık üretim onayından sonra seri planı arşivleme var. Mevcut
   production_v2 her levhayı açıyor, kesim kaydıyla stok tüketimini eşliyor
   ve işlem başına en fazla 100 levhayı kabul ediyor. Tekrarlı şablon,
   artık sayıları, maliyet ve stok sürümü sunucuda denetlenmeden seri
   onay açılmadı. Çok stok, otomatik atama, artık stok ve kesirli mm açık.
2. Karma işlerde en geniş açık `planted-6`: 100 parça, 19 levha alt sınırı,
   23 levha denetlenmiş plan. Daha sıkı alt sınır veya daha iyi plan ara.
3. Kullanıcının **hesaplama öncesi seçtiği**
   ana hedef: minimum **kayıtlı stok maliyeti**
   veya minimum **brüt fire**. Tek bir hedefin
   optimizasyon aramasını yürütmesini sağla.
4. Bu amaca uygun kapsamlı exact / branch-and-
   price / pattern generation + bütün sayısal
   lower-bound kanıtlarını güçlendir.
5. Tüm adaylar için **bağımsız giyotin kesim
   ağacı denetimi** zorunlu; tarayıcı performansı
   ve gerçek saha/UAT ayrıca doğrulanmalı.
   **Motor henüz mühürlenmedi.**

**İkinci plandaki güvenlik/kabul:** Gerçek iPhone/
Safari, iki kullanıcıyla yalnız TEST Supabase
stoğu, sunucuda bağımsız cut-tree denetimi.
Gerçek fiziksel stokları kontrolsüz değiştirme.

## F. Her yeni sohbet için çalışma kuralı

- Kullanıcı talep ettiğinde **sıradaki teknik adıma doğrudan geç**;
  "örnek uygulama" veya sıfırdan proje oluşturmayı önerme.
- Önce kaynak kodu / veritabanı / yayın durumunu somut araçlarla
  kontrol et. Okunmayan eski sohbetlerin "tamamını inceledim" deme.
- Kararları üçe ayır: **onaylanmış ürün gereksinimi**,
  **kodda uygulanmış özellik**, **gerçek ortamda doğrulanmış özellik**.
- Bir sorun çıkarsa ilgili dosyada düzelt, regresyon ekle, CI'ı
  doğrula ve gerekiyorsa kontrollü yayınla.
- Her oturum sonunda bu dosyayı **yeniden güncelle**; son commit,
  son başarılı test, açık risk ve sıradaki eylem güncel olsun.
- Bu dosya bir parola deposu değildir. API gizli anahtarı, kişisel
  parola veya üretim verisi kopyalanamaz.


## G. 20 Kasım 2026 — 67 numaralı kesirli küçük vakası ve kesin arama devamı

**Değişiklik (önce geliştirme dalı; birleştirme/CI/yayın ayrı doğrulanacaktır):**
- Bağımsız 20 Kasım motor denetimindeki `fresh.cjs` üretecinden, tohum
  `13793677`, indeks `67` ve `1/10` ölçek ile altı parçalı vaka yeniden
  oluşturuldu. Referans giyotin çözücü minimum **2 levha** buluyor, hızlı
  motor **3 levha** kullanıyordu. Sonradan uydurulan özel yerleşim kuralı yok.
- Kök neden 1: `kerfAreaBound` yalnızca tam sayı milimetre kabul ederek
  pozitif testere paylı güçlü alt sınırı kesirli ölçülerde atlıyordu.
  Onun yerine en fazla altı ondalık basamaklı sonlu ölçüleri ortak
  `BigInt` tam sayı ızgarasında **yuvarlamadan** işleyen sınır eklendi.
  Kapsam dışı hassasiyette sayı sınırı uydurulmaz; bu sertifika UNKNOWN/
  zayıf alt sınır olarak kalır. Bu bir parça veya levha sayısı limiti değil.
- Kök neden 2: Kesin Worker daha küçük levha hedefinde `UNKNOWN` gördüğünde
  bütün iyileştirme aramasını durduruyordu. Artık kaynak bütçesi elverirse
  sonraki hedefi dener, fiziksel plan bulursa sunar; fakat önceki
  `UNKNOWN` asla `infeasible` veya optimumluk kanıtı yapılmaz.
- Vaka 67 için alt sınır **2**, kesin Worker sonucu **2** ve optimumluk
  sertifikası **başarılı**; üretim denetimi + bağımsız giyotin denetimi
  yön, kesim payı ve stok miktarını kabul etti. Kasten zayıflatılan
  sınırla 1 levha `UNKNOWN`, 2 levha `feasible`: yalnız
  **kısmi/kanıtsız** Worker durumu doğru kalıyor.
- Regresyon: `tests/motor-fractional-oracle.cjs` 67 numaralı işi tohumdan
  üretir ve daha önce kullanılmamış 36 ayrı küçük tohumu bağımsız
  tamsayı giyotin oracle ile karşılaştırır. **25/36 mümkün**, **11/36
  imkânsız**, **0 oracle UNKNOWN**; 25 mümkün işin **24'ünde** minimum
  levha sayısı motor tarafından kanıtlandı; yanlış kanıt yok.
- Yerel Node 22 denetimi: 19 ayrı test komutu **PASS**, bunlara yeni test,
  BENG, atölye, motor asimetrisi, optimizasyon, fiziksel doğrulama ve
  bulut stok regresyonları dahildir. Asimetri `--holdout` ayrıca
  **36/36 tam, 23/36 kanıtlı**. Test günlüğü çalışma oturumundadır.
  GitHub CI bu kayıt yazıldığı anda ayrıca doğrulanmalıdır.
- `docs/sw.js` cache sürümü değiştirildi; üretim envanteri, Supabase
  şeması ve gerçek stok verisi **değiştirilmedi**.

**Açık riskler ve sonraki iş:**
1. GitHub CI ve Pages yayını sonrası gerçek `master` commit'ini
   doğrula; `docs/engine/cutting-engine.js`, `docs/optimization-worker.js`,
   `docs/sw.js` kaynaklarının yayınlanan baytlarla eşleşmesini denetle.
2. 36 yeni mümkün küçük örneğin **1'inde** minimum levha kanıtı açık.
   Önceki 36 tanıklı yeni tohumda **13 kanıt açığı** da sürüyor.
3. Kesirli ölçülerde 6 ondalıktan daha ince hassasiyet yeni alan
   sertifikasına dahil değil; bu, kesim girdisinin reddi anlamına gelmez.
4. Yüksek adetli seri planın fiziksel tamamlanma/arşiv/artık entegrasyonu,
   minimum kayıtlı maliyet ile minimum brüt fire arama ayrımı,
   sunucuda güvenilmez ağaç denetimi ve gerçek iPhone/Safari kabulü açık.
5. **MOTOR HENÜZ MÜHÜRLENMEDİ.** Sayım sertifikası fire veya maliyet
   optimumluğu belgesi değildir. Supabase production_v2'nin işlem başına
   100 levhası genel motor/parça kapasite sınırı olarak sunulmayacak.


### PR #13 kesin yayın kaydı — 20 Kasım 2026

- [PR #13](https://github.com/Beytullah-dot/Beytullah-/pull/13) master'a
  **birleştirildi**. Birleştirme SHA:
  `d8e51515da97f1d550266f3eadb3074b06dd2305`.
- **Aynı birleştirme SHA'sında dört GitHub workflow SUCCESS:**
  - Optimizer Verification:
    https://github.com/Beytullah-dot/Beytullah-/actions/runs/44779208822
  - Geometry Tests:
    https://github.com/Beytullah-dot/Beytullah-/actions/runs/44779209182
  - iPhone WebKit Acceptance Smoke **(emülasyon)**:
    https://github.com/Beytullah-dot/Beytullah-/actions/runs/44779208903
  - GitHub Pages build and deployment:
    https://github.com/Beytullah-dot/Beytullah-/actions/runs/44779207062
- Yayına konu `docs/engine/cutting-engine.js`, `docs/optimization-worker.js`
  ve `docs/sw.js` dosyalarının, birlikte yüklenen test dosyası ve CI
  workflow'unun **Git blob SHA'ları**, yerel regresyonu geçen kaynakların
  SHA'ları ile **beş dosyada beşi de eşleşti**. Pages Actions dağıtımı
  başarılı. **Canlı GitHub Pages URL'sindeki ham JavaScript baytları ise
  bu ortamdan doğrudan alınamadığı için bayt eşleşmesi doğrulanamadı.**
  Geçmiş PR sürümünün canlıda kaldığı da ileri sürülmemeli; ağ üzerinden
  ayrı doğrulama açık kalır.
- Tam bağımsız `fresh.cjs` audit paketi yeni motorla tekrar çalıştırıldı
  (aynı 180 küçük + 36 tanıklı iş): 133 mümkün küçük işin
  **133/133'ünde bağımsız minimum levha sayısı bulundu, 120/133'ünde
  motor da kanıtladı** (önce 132/133 ve 111/133).
  Tanıklı işler **36/36 tam, 26/36 kanıtlı**. Bu paketteki 47
  imkânsız küçük iş başarı oranına katılmadı.
- **Maliyet ve brüt fire optimumluğu değişik hedeflerdir.** Önceki
  133 mümkün küçük işte ayrı sertifikalar: alan **64/133**,
  maliyet **81/133**; minimum levha kanıtı bunları yükseltmez.
- Ayrı, geliştirmede kullanılmamış küçük 36 tohumda **25 mümkün,
  11 imkânsız, 0 oracle UNKNOWN, 24/25 levha sayısı kanıtlı**.
  Ayrıca önceki asimetrik holdout **36/36 tam, 23/36 kanıtlı**.
- Bu son durum değişikliği yalnız `BEYTHAUS-CUT-HANDOFF.md` dosyasına
  yazılır; ürün kodu veya üretim/Supabase verisi değiştirilmez.

**Şimdi sıradaki teknik öncelik:** minimum levha kanıtı açık kalan
13 bağımsız küçük işin hangilerinde kesim araması `UNKNOWN`, hangilerinde
alt sınır gevşek teşhis et; yanlış kanıt üretmeyen genel amaçlı kesme/
pattern alt sınırlarını güçlendir. Aynı anda arama hedeflerini minimum
brüt fire ile minimum kayıtlı maliyet için birbirinden ayır. Çok parçalı
karma işlerde kalan 13 sertifika açığı ve seri plan üretim arşivi de açık.
Canlı URL bayt kontrolü ve gerçek cihaz/saha kabulü yapılmadan bu iki
konunun doğrulandığı iddia edilmez. **Motor mühürlenmedi.**

### 20 Kasım 2026 — Optimumluk kanıtı açık küçük işlerin teşhisi (PR aşaması)

- Önceki PR #13 sonunda bağımsız mümkün 133 küçük işte 133/133
  minimum levha yerleşimi, 120/133 motor kanıtı vardı. Kanıt açığı
  13 iş; bu sayı tek başına algoritmik kök neden teşhisi değildir.
- Yeni `tests/motor-proof-gap-census.cjs`, 180 eski küçük tohumun
  tamamını aynı bağımsız oracle ile tekrar üretir. 133 mümkün işte
  kesim denetimi ve yanlış optimumluk iddiası kontrol edilir.
  Her kanıtsız iş için indeks, tohum, ölçü ölçeği, parça sayısı,
  testere/kenar payı, bağımsız minimum, motor levha sayısı,
  matematiksel alt sınır, Worker hedeflerinin `infeasible` /
  `unknown` / `feasible` durumları ve işlem sayısı raporlanır.
- Yeni rapor, önceki sonuçların doğruluğunu varsaymak yerine
  `133/133` yerleşim ve en az `120/133` kanıt regresyon eşiğini
  bağımsız olarak kontrol eder. Test raporu CI artifact olarak
  `proof-gaps.json` dosyasına eklenir.
- Bu adım **teşhis altyapısıdır**; yeni alt sınır veya arama algoritması
  henüz uygulanmadı. CI çalıştırılmadan yeni sonuç iddia edilmez.
  Minimum brüt fire ve minimum kayıtlı stok maliyeti hâlâ ayrı hedeflerdir.
  Motor mühürlenmedi. Supabase ve gerçek stok verisi değişmedi.

**Sonraki işlem:** CI'dan gelen `proof-gaps.json` içinde özellikle
`exact-unknown` ve `bound-or-search` ayrımını değerlendir.
Kanıt açığının kök nedenine göre genel amaçlı, sound bir alt sınır
veya kesim ağacı arama iyileştirmesi geliştir. Sonra yeni holdout,
tüm regresyonlar, Pages ve yayın baytları doğrulansın.

**CI teşhis sonucu (Optimizer Verification run 44785879435 — SUCCESS):**
- Orijinal 180 bağımsız küçük işin 133'ü mümkün; 133/133 bağımsız
  minimum levha bulundu, 120/133 motor kanıtı üretildi; oracle UNKNOWN 0.
- Açık 13 işin **tamamında** Worker hedefi `unknown`; 13/13
  `exact-unknown`, 0 `scope-limited`, 0 yalnız `bound-or-search`.
  Hepsinde motorun mevcut levha sayısı bağımsız optimumla eşit,
  fakat matematiksel alt sınır tam **bir levha** daha gevşek.
- İndeksler: 0, 7, 11, 32, 36, 75, 78, 113, 127, 135,
  163, 166, 170. Tam yeniden üretilebilir vaka girdileri ve
  hedef başına düğüm sayıları CI `proof-gaps.json` artifact'inde.
- `unknown` çoğu vakada düşük düğüm sayısıyla (78–2787) oluştu;
  yalnız süre veya 500.000 düğüm sınırına takılma açıklaması
  desteklenmiyor. `guillotine-exact.js` içindeki geometrik
  Pareto adayının `cutPlan` aşamasında kurulamaması nedeniyle
  `ambiguous` işaretlenmesi ve gerçek uygulanabilirliği
  etkilemeyen çok küçük atık kesimlerinin ele alınışı
  sonraki kök neden incelemesidir.
- CI: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44785879435
  (başarılı). Üretim motoru değiştirilmedi; gerçek stok ve
  Supabase etkilenmedi.

**PR #14 entegrasyonu:** [PR #14](https://github.com/Beytullah-dot/Beytullah-/pull/14)
`1ac996c4b28df787594705fa6b64a8dc729c8ef3` SHA ile
`master` dalına birleştirildi. PR dalındaki Optimizer Verification
`44785879435` SUCCESS; Geometry Tests `44785879629` SUCCESS.
Master SHA'sında Optimizer, Geometry ve Pages workflow sonuçları
ayrıca kontrol edilecek. Bu PR yalnızca teşhis testi, CI raporu ve
handoff belgesidir; üretim JS motoru değiştirilmedi.

### 20 Kasım 2026 — Fiziksel tam-ızgara imkânsızlık kanıtı, PR #15

- `docs/guillotine-exact.js`: Pareto/relaksasyon bir kesim
  ağacına dönüştürülemeyip `unknown` olduğunda, kalan işlem
  ve zaman bütçesinde tam sayı ızgaralı ikinci karar araması çalışır.
  Bütün olası tam giyotin kesimlerini ve önce atık şerit çıkarma
  adımlarını kapsar. Tam tükenmiş arama `infeasible` sertifikası
  verebilir; bulunan uygunluk için fiziksel kesim planı üretmediğinden
  yalnız `unknown` döndürür. Bütçe ve güvenilir ölçü temsili yoksa
  `unknown` korunur. Parça/levha sayısına yeni genel sınır eklenmedi;
  mevcut exact Worker kapsamı değişmedi.
- Bağımsız küçük iş census, PR #15 GitHub Optimizer Verification
  artifact `proof-gaps.json`: **133/133** mümkün küçük işte
  bağımsız minimum levha yerleşimi ve **133/133** motor minimum
  levha kanıtı; önce 120/133, açık vaka **0**. Oracle UNKNOWN 0.
  Bu istatistik yalnız bu 133 mümkün küçük iş kümesinindir.
- Daha önce ayrılmış kesirli 36 holdout: 25 mümkün, 11 imkânsız;
  mümkünlerde kanıt **25/25** (önce 24/25). Giyotin ve Worker
  regresyonları yerel PASS. GitHub PR CI optimizer testinde
  bütün test aşamaları başarılı olarak raporlandı.
- Eski `sliver` testi artık tam fiziksel karar aramasının
  sertifikalandırdığı `infeasible` sonucunu bekler.
  `UNKNOWN` asla otomatik `infeasible` yapılmaz.
- Bu değişiklik minimum **levha sayısı** kanıtını geliştirir;
  minimum brüt fire veya minimum kayıtlı stok maliyetini
  kanıtlamaz. Üretim stokları, Supabase ve veri şeması değişmedi.
- **Açık:** PR #15 merge/master CI/Pages doğrulaması; farklı
  geometrilerde yeni bağımsız holdout; büyük karma işlerde
  13 açık kanıt; fire/maliyet hedeflerinin ayrılması; gerçek
  iPhone/Safari, canlı JS baytları, çok kullanıcı stok kabulü.
  **Motor mühürlenmedi.**

**Sohbet devri:** Kullanıcı uzun sohbetlerde uyarılmak, güncel
handoff hazırlanmasını ve yeni sohbet için tek kopyalanabilir
devam promptu verilmesini istiyor. Devamda önce bu dosya,
AGENTS.md, GitHub master HEAD ve CI kontrol edilmeli.

**PR #15 merge kaydı:** [PR #15](https://github.com/Beytullah-dot/Beytullah-/pull/15)
`master` dalına `19303c2aad7fd4f9d11a3e39b421b726ff6fc648`
SHA ile birleştirildi. PR öncesi GitHub CI:
Optimizer Verification `44790444946` SUCCESS,
Geometry Tests `44790444936` SUCCESS,
Uncapped scale research `44790444860` SUCCESS.
Optimizer artifact `proof-gaps.json`: 133 optimum/133 kanıt,
0 açık vaka. PR iPhone WebKit smoke başlatılmıştı;
master SHA'sındaki Pages, optimizer, geometry, WebKit sonuçları
ayrıca doğrulanacak. Canlı JS baytları ve gerçek iPhone test
edilmiş sayılmamalı. Bir sonraki geliştirmede büyük karma işler,
minimum brüt fire ve minimum kayıtlı maliyet sertifikaları ayrı
ölçülecek; motor mühürlenmedi.

### 20 Kasım 2026 — Ayrı brüt fire / kayıtlı maliyet kesin arama (PR #16)

- `docs/economic-exact.js` aramasına `job.objective='area'`
  seçeneği eklendi; mevcut varsayılan `cost` korunur.
  `area` hedefi brüt stok alanını minimize eder. Sabit parça
  listesinin net alanı sabit olduğundan bu, minimum brüt fireye
  eşdeğerdir; artık satış değeri veya yeniden kullanılabilir artık
  değeri bu hedefe katılmaz.
- Kanıtlar ayrı tutulur: `objective` sonuç alanı ve
  `bestArea/initialArea` veya `bestCost/initialCost`.
  `area` kanıtı maliyet kanıtı olarak sunulmaz.
  Fiyatı bilinmeyen stok `cost` kanıtını engeller; `area`
  hesabını tek başına engellemez.
- Yeni `tests/motor-objective-separation.cjs`: iki adet
  50x100 mm parça, tek 100x100 mm levha (100 TL) ve iki
  60x100 mm levha (25 TL/adet). Alan optimumu 10000 mm² /
  1 levha; maliyet optimumu 50 TL / 2 levha / 12000 mm².
  Bağımsız giyotin oracle tüm stok kombinasyonlarını
  kontrol eder. Bilinmeyen fiyat ayrımı da test edilir.
- Optimizer Verification CI workflow'una test eklendi.
  **PR #16:** https://github.com/Beytullah-dot/Beytullah-/pull/16
- Bu bir **arama çekirdeği API'si** geliştirmesidir; kullanıcı
  arayüzündeki ana hedef seçimi ve plan kabul/rapor katmanı
  henüz bağlanmadı. CI sonucu ve merge ayrıca doğrulanmalı.
  Üretim stokları / Supabase değişmedi; motor mühürlenmedi.

**Sonraki adım:** CI'da iki hedefin bağımsız optimum
sertifikalarını doğrula; sonra UI'daki kullanıcının seçtiği
tek ana hedefi aramaya bağla. Çok parçalı karma işlerde
kesin çözüm kapsamını ayrıca büyüt; kapsam dışı işi
kanıtlanmış diye gösterme.

**PR #16 merge:** `70d88f8b1fe350b916558ce59aed78443ad55e2a`.
PR'daki Optimizer Verification `44793597229` SUCCESS;
Geometry Tests `44793597361` SUCCESS. Yeni objective separation
regresyonu, eski maliyet regresyonları, proof census ve
optimizasyon testleri başarılı. Büyük ölçek araştırması ve WebKit
PR kontrolü son sorguda sürüyordu; merge SHA'sı Pages/CI
sonuçları ayrıca doğrulanmalı. Canlı kullanıcı arayüzü hâlâ
`objective=area` seçimini göndermiyor: yeni API kodda var,
kullanıcıya sunulan bir özellik olduğu iddia edilmemeli.

### 21 Kasım 2026 — UI hedefi → gerçek kesin arama, PR #17 birleştirme ve PR #18 CI dayanıklılığı

- **Kod birleştirme:** [PR #17](https://github.com/Beytullah-dot/Beytullah-/pull/17);
  `master` SHA `f06bb23d8aefc52796f0a19910978d8efcba4a8e`.
  Önceki sürüm geri dönüş dalı:
  `release-backup/pre-objective-ui-2026-11-21` →
  `ebf519d248a0cd6fa34ab7118d6cdbb6a2b7d260`.
- **Kullanıcı ana hedefi:** `state.objective='area'|'cost'` hesaplamadan önce
  kalıcı seçiliyor; `sanitize`, `syncSettings`, yerleştirme motorunun
  `compare` ve `packAttempt` sıralamaları, otomatik malzeme
  dağıtımındaki `area` adayı, kesin Worker çağrısı ve sonuç kabulü
  aynı seçime bağlı. `area` tam levha brüt alanını minimize eder;
  sabit parça net alanı ile brüt fireye denktir. `cost` gerçek kayıtlı
  stok bedelini minimize eder. Varsayımsal artık değeri ikisine dahil değil.
- **Sertifika ve üretim:** `acceptEconomyWorkerResult` hedef kimliğini,
  hedefe özel `bestArea/bestCost` hesabını, tüm parçaları, stok
  adedini ve fiziksel giyotin kesim ağacını bağımsız yeniden denetler.
  Worker `UNKNOWN`, zaman veya düğüm bütçesinde durursa **optimum
  iddiası yok**; geçerli aday/alt sınır ayrı korunur. Bilinmeyen fiyat
  `area` kanıtını tek başına engellemez, `cost` optimumu kanıtlanmaz.
  Minimum levha sayısı araması ikincil olarak korunur; seçili alan/maliyeti
  artıran sayı alternatifi sessizce uygulanmaz. Küresel `count` sertifikası
  ile yalnız mevcut otomatik dağılıma koşullu sertifika ayrıdır.
  Plan değişirse eski global sertifikalar sıfırlanır.
- **Bağımsız test:** `tests/selected-objective-flow.cjs` ayrı oracle ile
  2×50×100 mm parçada 100×100 mm/100 TL ile 2×60×100 mm/25 TL
  ayrışan optimumları; sahte hedef değeri/kesim ağacı reddini,
  bilinmeyen fiyatı ve karma malzeme koşullu kanıtı sınar.
  `tests/ios-webkit-acceptance.cjs` hesaplama öncesi `area`
  seçimini, alternatif hedefi, 6 levhalık BENG02 kesimini ve mobil
  2.001 parçalı seri PDF'yi doğrular.
- **Yayın testleri:** PR #17 son commit'i `a4b47b84a7f4cfa5dac85fb368826ee7d5925f57`
  üzerinde dört CI SUCCESS:
  Optimizer `44839162381`, Geometry `44839162424`,
  Uncapped research `44839162345`, WebKit `44839162343`.
  Merge/master üzerinde Pages `44839331617`, Optimizer
  `44839332426`, WebKit `44839332340` SUCCESS.
  Geometry `44839332354` attempt 1 Postgres geçici açılış
  bağlantı yarışı yüzünden FAIL, **attempt 2 SUCCESS**.
  [PR #18](https://github.com/Beytullah-dot/Beytullah-/pull/18)
  test konteynerinin **final** PostgreSQL açılışını bekleyen korumayı
  ve bu handoff'u taşır; PR #18'in merge/CI durumu ayrıca doğrulanmalı.
- **Mevcut matematiksel sınır:** Etkin alan/maliyet kesin giyotin
  Worker aramasında küçük malzeme grupları için mevcut hesap bütçesi
  (yaklaşık 10 tekil parça, 3 stok türü, 7 başlangıç stoğu ve
  süre/düğüm bütçeleri) vardır. Bunlar **kullanıcının parça veya levha
  giriş tavanı değildir**; kapsamı aşan iş için `UNKNOWN` kalabilir.
  Çok büyük tekrarlı işler ayrıca tamsayılı alan, stok-adedi,
  testere paylı eş-parça kapasitesi ve giyotin blok/seri desen
  sertifikalarıyla kanıtlanabilir. Önceki 133/133 küçük levha
  minimumu **yalnız minimum levha sayısı** içindir; bu sayı
  genel maliyet/fire optimum oranı değildir.
- **Açık araştırma:** 20–25+ farklı stoklu, pozitif kerf ve farklı
  fiyatlı yeni bağımsız holdout; yüksek adetli giyotin pattern
  generation/dominance/MILP veya branch-and-price;
  karma otomatik tüm malzeme atamaları için ortak alt sınır ve
  açık optimality gap; zaman/bellek/iPhone ölçümü.
  Motor henüz mühürlenmedi. Supabase şeması/üretim kayıtları,
  fiziksel stoklar ve gerçek müşteri verileri **değiştirilmedi**.

## H. 21 Kasım 2026 — Heterojen ölçülü kerf kapasitesi, PR #19

- **Kod PR'ı:** https://github.com/Beytullah-dot/Beytullah-/pull/19
  **birleştirildi**. Merge SHA:
  `770c356bef88bf497600b702a1a1fd9a31a17629`.
- `docs/engine/optimality-certificate.js` artık aynı boyuttaki
  parçalara özgü `cardinalityTypes` sertifikasına ek olarak farklı
  parçaların en küçük kenarını kullanır. Her parça bu kenar
  uzunluğunda bir eksene paralel kare içerir. Kesimler k kadar
  ayrıldığından stokun kullanılabilir W,H ölçülerinde
  `floor((W+k)/(minEdge+k))*floor((H+k)/(minEdge+k))`
  parça kapasitesi **üst sınırdır**. Yön ve döndürme kısıtlarını
  gevşetir; dolayısıyla gerçek optimuma karşı güvenli alt sınır
  üretir. Özdeş/sabit eksenli parçaların mevcut daha güçlü
  kapasitesi korunur.
- Sayısal örnek: 27 parça, dört ayrı 70–71 mm parça ölçüsü,
  serbest/boyuna/enine yönler, 3 mm kerf, 2 mm kenar payı;
  100×100 mm (100 TL) ve 95×105 mm (160 TL) stoklardan
  her biri fiziksel olarak en fazla bir parça taşır.
  İki ayrı tamamlanmış ve bağımsız giyotin denetiminden
  geçmiş plan: minimum **kayıtlı stok maliyeti 2.700 TL**
  (27 büyük/ucuz stok) ve minimum **brüt stok alanı
  269.325 mm²** (27 küçük/pahalı stok). Ters hedefe ait
  kanıtlar özellikle reddedilir; fiyatı bilinmeyen alternatif
  maliyet sertifikasını engeller.
- Regresyon: `tests/motor-heterogeneous-capacity.cjs`; CI
  `.github/workflows/optimization-verification.yml`. PWA cache:
  `beythaus-cut-v33-heterogeneous-kerf-proof`.
- PR head `dd6554f42b0db58b39de46cffdb7230b9727ca0d`
  üzerinde dört Actions kapısı **SUCCESS**:
  Optimizer `44913350480`, Geometry `44913350471`,
  uncapped scale `44913350564`,
  iPhone WebKit **emülasyonu** `44913350514`.
- Master merge SHA'sında Pages `44913469271` ve
  Geometry `44913469970`, Optimizer `44913470026` SUCCESS.
  Master iPhone WebKit emülasyonu `44913470150` SUCCESS. Ham canlı JS bayt eşleşmesi ve gerçek
  iPhone/Safari kullanıcı testi bu CI ile kanıtlanmış değildir.
- Matematiksel kapsam: Bu **sınıfa özgü alt sınırdır**,
  27 levhadan büyük girişlere bir sınır getirilemez. Eksik plan
  mümkün değil demek değildir; geçerli plan ile matematiksel
  optimumluğu ve `count`/`area`/`cost` sertifikalarını ayır.
  Akademik tek stok aşamasız kesin arama (Fleszar 2016) ile
  iki aşamalı arc-flow/branch-and-price (Macedo; Mrad vb.)
  *aynı kısıt sınıfı değildir*. Sonraki gerçek uygulama önce
  kesilebilir tam karma giyotin desenler, sonra hedefe özgü
  üst/alt sınırlar ve kaynak kesintisinde `UNKNOWN` olmalıdır.
- **Değişmeyen güvenlik:** Supabase, müşteri/atölye stokları,
  üretim tamamlanması ve şema değiştirilmedi; yalnız
  kesim kanıt kodu, test/CI ve cache güncellendi.
  Motor henüz genel anlamda mühürlenmedi.


## I. 21 Kasım 2026 — PR #21–22 güvenli heterojen alt sınır ve fiziksel desen

**PR #21** https://github.com/Beytullah-dot/Beytullah-/pull/21 — birleşim:
`87e8cbd12811617e6147bd45ef27c5d6f9b526c9`.

- `docs/engine/optimality-certificate.js` içindeki
  `thresholdCardinalityCover`, parçalardaki her farklı minimum kenar
  eşiğinin üzerindeki alt küme için pozitif testere paylı en küçük kare
  kapasitesi hesaplar. Her alt kümenin stoğa yerleşme kapasitesi mevcut
  işin fiziksel zorunlu koşuludur; ayrı biten `count/area/cost`
  tamsayılı stok örtüsü çözümlerinin **maksimum güvenli alt sınırı**
  kullanılır. Eksik kalan eşik araması başka eşiğin tamamlanmış
  geçerli alt sınırını geçersiz kılmaz; `UNKNOWN` optimumluk kanıtı
  değildir.
- `tests/motor-threshold-kerf.cjs`: 30 adet 70×70 mm + 30 adet
  20×20 mm parça, 3 mm kerf, 2 mm kenar payı; 100×100 mm/100 TL ve
  95×105 mm/160 TL alternatifleri. Her büyük parça ayrı levha ister;
  **30 minimum levha** bağımsız boyut çatışmasıyla gösterilir.
  Bağımsız giyotin ağacı denetimiyle minimum maliyet **3.000 TL**,
  minimum brüt alan **299.250 mm²** iki farklı planda
  ayrı ayrı kanıtlanır. Bilinmeyen fiyat, karşıt hedefin sertifikası
  ve sıfır kaynakta `UNKNOWN` güvenlik testleri vardır.
- PR #21 dalındaki 4 CI kapısı SUCCESS; master birleştirme SHA'sında
  Pages `44924957248`, Geometry `44924957146`,
  Optimizer `44924957207` SUCCESS. Gerçek Safari ölçülmedi.

**PR #22** https://github.com/Beytullah-dot/Beytullah-/pull/22 — birleşim:
`4d4c19543296df5b997018d102a5729a2f901af2`.

- Yeni `docs/engine/mixed-strip-patterns.js`: stok tipi ve kesim
  yönü alternatiflerini tarayan zaman bütçeli şerit oluşturucu;
  her gerçek kerf kesimi aktif alt dikdörtgenin **tam kenarı** boyunca
  işlenir. Yön, rotasyon, kalınlık, kayıtlı fiyat ve stok adetleri
  korunur. `guillotine-block-repair.js` yalnız eski plan eksikse
  aday ister; daha iyi adayın tamamı `auditCutPlan` tarafından
  doğrulanmadan uygulanmaz. Önceki derin/asimetrik blok kurtarma
  yedek olarak kalır. Yeni modül tarayıcıya, test harness'a ve
  PWA v34 cache listesine bağlandı.
- `tests/motor-mixed-strip.cjs`: 80 adet 70×70 ve 80 adet 20×20,
  heterojen stok, 3 mm kerf, 2 mm trim; 80 levha üzerinden
  tüm **160 parça** yerleştirildi, 8.000 TL/800.000 mm²
  tanık planı bağımsız olarak denetlendi; tahrif edilmiş kısa kesim,
  eksik fiyat ve sıfır bütçe sınandı. **Bu test planın fiziki
  uygulanabilirliğidir; optimum alan/maliyet arama sertifikası
  ayrıca değerlendirilmelidir.**
- PR #22 dört kapı SUCCESS: Geometry `44925236028`;
  Optimizer `44925236021`; uncapped scale `44925235935`;
  iPhone WebKit **emülasyonu** `44925235934`. Optimizer adımında
  `motor-mixed-strip` ve `motor-threshold-kerf` PASS.
- PR #22 master merge SHA `4d4c19543296df5b997018d102a5729a2f901af2`
  üzerinde Pages `44925409342`, Geometry `44925409717`,
  Optimizer `44925409703` ve WebKit emülasyonu
  `44925409660` **SUCCESS**. Doküman birleştirme
  yeni HEAD oluşturduğundan her yeni sohbette canlı HEAD yenilenmelidir.
- Supabase migration, fiziksel stok ve kullanıcı üretim kayıtları
  değiştirilmedi; tüm değişiklikler sadece GitHub kod, test,
  browser modül referansı, cache ve dokümantasyondadır.
  Bağlı gerçek Supabase projesi `pdqgpupdqgrxejvjpdzs`
  salt okunur durum sorgusunda `ACTIVE_HEALTHY` idi;
  DB tablolarına / Auth kayıtlarına erişilmedi, SQL çalıştırılmadı.

**Eksikler ve güvenilirlik sınırları:** Birçok farklı parça/levha
kombinasyonunda tüm alan ve maliyet optimumluğu kanıtlanmış değildir.
İki aşamalı şerit deseni, genel çok aşamalı giyotin probleminin
tam pattern-price oracle'ı değildir. Geometriye özgü agresif dominance
kullanılmadı; yalnız Pareto stok örtüsü dominance'ı, `capacity>=`
ve `unit<=` koşullarına dayanan güvenli gevşetmedir.
Büyük heterojen holdout'ta bağımsız optimum referansı, açık
optimality gap'lerin sistematik raporlanması, süre/bellek,
gerçek Safari ve iki kullanıcı cloud E2E halen açık.
**MOTOR HENÜZ MÜHÜRLENMEDİ.**


## J. 21 Kasım 2026 — PR #24 gerçek iç içe giyotin artık doldurma

- Kod: https://github.com/Beytullah-dot/Beytullah-/pull/24;
  master merge `a722ce5d30df59a1f8893cad2c9f1ee42325a77a`.
- `docs/engine/mixed-strip-patterns.js`: Sadece kaydedilmiş gerçek
  **free leaf** dikdörtgenlerine sonradan farklı boyutlu parçalar
  yerleştiren `fillResidual` eklendi. Her kesim önceki aktüel
  alt dikdörtgenin tam kesiti olacak şekilde tutulur; kerf, kenar
  payı, parça yönü, dönme izni, malzeme ve kalınlık korunur.
  Derinlik, parça sayısı veya levha miktarı için yapay maksimum yok;
  kaynak bütçesi dolduğunda sonuç kısmi/`UNKNOWN` kalabilir.
- İlk CI denemesinde 160 parça/80 levha regresyonu, yeni pahalı
  taramanın **her aday için** çalışması nedeniyle 29 eksik parça
  bıraktı; bu sürüm birleştirilmedi. Çözüm: `construct`
  önce eski hızlı şerit aşamasını dener; ancak eksik plan
  kaldığında iç içe artık kesimini devreye alır. Sonraki
  regresyonda 160/160 tam. CI geçilmeden birleştirme yapılmadı.
- `tests/motor-nested-residual.cjs`: Tamamen bağımsız
  inşa edilmiş 4 kesimli/5 parçalı fiziksel kesim ağacı
  ile kontrol; 18 ek farklı ölçülü planted işin tamamında
  ilk iki-aşamalı düzende **0/18** eksiksizken yeni kurtarmada
  **18/18**; 0 geçersiz kesim ağacı, 0 UNKNOWN. Bilerek
  kısaltılmış kesim denetleyici tarafından reddediliyor;
  sıfır kaynakta `UNKNOWN` değişmedi.
- Daha büyük, üretim verisinden bağımsız **30 levha, altı farklı
  stok tipi, toplam 150 parça, kerf 3 mm, trim 2 mm**
  için tüm parçaları karşılayan dışarıda üretilmiş fiziksel
  kesim ağacı tanığı saklanmadan test sırasında kuruldu.
  Önceki hızlı arama 60 parçayı açıkta bıraktı, yeni arama
  hepsini yerleştirdi. Hem planted referans hem motorun
  çıktısı `production-audit.js` ile kabul edildi. Bu
  **feasibility** sonucudur, area/cost optimum ispatı değildir.
- Test: `node tests/motor-nested-residual.cjs`, CI'da
  `nested-kerf-report.json` artifact'ı; motor kodu dışındaki
  üretim değişikliği `docs/sw.js` v35 PWA cache güncellemesi.
- PR #24 head `1a367aeee795013bd7cafd6f9e0f18443c7bbee2`,
  Optimizer `44926321893`, Geometry `44926321761`,
  Uncapped scale `44926321743`, WebKit emülasyonu
  `44926321831` dört CI **SUCCESS**.
  Master merge sonrası Optimizer `44926439253`,
  Geometry `44926439228`, Pages `44926438361` ve
  iPhone WebKit **emülasyonu** `44926439265` dört
  kontrol **SUCCESS**. Canlı Safari baytları ve gerçek
  iPhone saha kabulü bu kontrollerle doğrulanmış değildir.
- Supabase veri, şema, migration, kayıtlı kullanıcı stokları
  ve fiziksel üretim hareketlerine **dokunulmadı**.
  Arama sonuçları yeni üretim tamamlanması yaratmaz.

**Kalan riskler:** Büyük heterojen işlerin tümünü tamamlayan,
maliyet/fire için aynı anda bağımsız matematiksel optimum kanıtı
sunan **genel** çözücü henüz yok. Salt iki-aşamalı şerit
deseni ve mevcut genişletilmiş gerçek kesim ağacı
sezgisel yapıcı yöntemlerdir. Kalan exact Worker ve
Pareto stok-cover gevşetmesi optimality gap bırakabilir.
Bir sonraki PR'da farklı gerçek kesim yapılarında geniş
holdout, güvenli dominance/alt sınır, süre ve bellek
ölçümleri; sonra gerekirse düzgün geometri sınıflı
MILP/CP-SAT veya exact pricing yapılmalı.
Gerçek iPhone/Safari, canlı baytların doğrulanması,
iki kullanıcı Supabase cloud UAT ve sunucu tarafında
bağımsız kesim ağacı denetimi açık. **MOTOR HENÜZ MÜHÜRLENMEDİ.**


## K. 21 Kasım 2026 — PR #26 eşzamanlı alan + büyük parça kapasitesi kanıtı

- Kod PR: https://github.com/Beytullah-dot/Beytullah-/pull/26,
  \`master\` merge \`2886b99beb750cd677bed90a014e9a2addd72ce7\`.
  Başlangıç HEAD \`4de1119d25f81cedf996b83dab17bf90170a4bbf\`.
  \`docs/engine/optimality-certificate.js\` içinde
  \`pairedAreaCardinalityCover\` ve tamsayılı \`pairedCover\` eklendi.
- Matematiksel gerekçe: Her fiziksel guillotine plan aynı stok
  seçiminde toplam parça alanını karşılayacak **kullanılabilir stok
  alanına** VE eşiği aşan parçaların **kerf-ayrımlı maksimum kare
  sayısı** kapasitesine sahip olmalıdır. İki zorunlu eşitsizlik
  birlikte uygulanır. Stok tipi/adedi ve ilgili kullanıcının
  kayıtlı fiyatı korunur; geometri, parça yönü ve kesim sırası
  yalnız **gevşetildiği** için optimum alt sınırı güvenlidir.
  Alan, sayı ve maliyet amaçları ayrı ayrı hesaplanır.
  Aynı parça/levha işinde farklı eşikler için bulunan bitmiş
  alt sınırların maksimumu kullanılır; kesilen arama
  hiçbir zaman optimum sertifikası olarak kabul edilmez.
- Tamsayılı dinamik programda \`(usable-area, threshold-count,
  selected-objective)\` Pareto durumları kullanılır. Azalan
  alan sırası ve sayı boyutunda Fenwick prefix-min üzerinden
  yalnız güvenli \`>= capacity, <= objective\` dominance uygulanır.
  Dahili \`maxStates\`/\`maxMs\` giriş limitleri değildir.
  \`certify\` tek işte tüm malzeme grupları ve bound aileleri
  arasında **ortak süre bütçesi** uygular; Worker'daki üç
  hedefin toplamı mobil UI watchdog altında tutulmaya çalışılır.
  Kesin uçtan uca süre garantisi yoktur.
- Aynı test işinde 4 adet **70×70** ve 44 adet **20×20 mm**
  parça, 3 mm kerf, 2 mm trim:
  A=47×1000 mm / 40 TL / 1 adet;
  B=100×100 mm / 100 TL / en çok 5 adet.
  Tamamen ayrı **elle kurulan fiziksel guillotine kesim ağaçları**
  \`production-audit.js\` ile kabul edildi:
  - Maliyet optimum tanığı: 4 B + 1 A, **440 TL**,
    87.000 mm² brüt alan. Önceki bağımsız maliyet gevşetmeleri
    40 ve 400 TL, **yeni ortak alt sınır 440 TL**.
  - Brüt alan optimum tanığı: 5 B, **50.000 mm²**, 500 TL.
    Önceki bağımsız brüt alan gevşetmeleri 47.000 ve
    40.000 mm², **yeni ortak alt sınır 50.000 mm²**.
  - Zıt hedefle değerlendirme: 500 TL planda maliyet
    ispatlanmamış fark 60 TL (**mevcut maliyetin %12'si**);
    87.000 mm² planda alan farkı 37.000 mm² (mevcut
    brüt alanın yaklaşık %42,5'i). Bu farklar mümkün
    iyileştirmenin **kanıtlı üst sınırlarıdır**, kazanç vaadi
    veya büyük işler için genel istatistik değildir.
- \`tests/motor-paired-cover.cjs\`: çözüm kodunu kullanmayan
  stok çoklu küme brute-force alt sınır oracle'ı, iki bağımsız
  fiziksel plan, üç amaçla 36 deterministik ayrı vaka,
  **90** sonlu/karşılaştırılabilir oracle sonucu içinde
  aşırı yüksek güvensiz alt sınır 0. Tahrif edilmiş kısa
  kesim reddi, fiyatı bilinmeyen alternatif stokun maliyet
  ispatını engellemesi, sıfır bütçe \`UNKNOWN\` ve UI
  görecek kanıtlı farkın testleri. Ortak DP bir MILP veya
  genel guillotine exact pricing çözücüsü değildir.
- \`docs/index.html\`: kanıtlanmamış iki hedefte alt sınır
  ile **olası iyileşmenin kanıtlı maksimumu** görünür.
  \`status='unknown-price'\` özellikle ele alınıyor.
  \`docs/sw.js\`: \`beythaus-cut-v36-paired-area-threshold-cover\`.
  Optimizer CI'da yeni test kapısı eklendi.
- PR head \`5906813ec46066075e6bebcfc97ee6a22192284a\`
  dört Actions kontrolü **SUCCESS**:
  Optimizer \`44929446267\`,
  Geometry \`44929446239\`,
  Uncapped Scale \`44929446197\`,
  iPhone WebKit **emülasyonu** \`44929446211\`.
  \`master\` merge sonrası run'lar:
  Optimizer \`44929573922\`,
  Geometry \`44929573976\`,
  WebKit emülasyonu \`44929574059\`,
  Pages \`44929573983\`; handoff PR merge öncesinde
  durumları tekrar sorgulanmalı.
- Supabase şeması, Auth, canlı stok ve kullanıcıya ait
  üretim kayıtları bu adımda hiç değiştirilmedi.
  Gerçek iPhone/Safari cihaz kabulü, canlı Pages JS bayt
  doğrulaması, iki kullanıcı/çok cihaz Supabase ve sunucu
  tarafında kesim ağacı tekrar kontrolü yapılmış sayılmaz.
  **Motor genel optimumluk için henüz mühürlenmedi.**
