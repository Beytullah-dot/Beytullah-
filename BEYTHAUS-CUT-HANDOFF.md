# Beythaus Cut — Proje devamlılık kaydı

> **Bu belge yeni sohbetler için tek başlangıç noktasıdır.**
> Son güncelleme: **22 Kasım 2026 (Türkiye)**.
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

**Son motor birleştirmesi (PR #30):**
\`fc12cb792ca4baf236e6d815e7874992a798064d\`.
\`docs/engine/optimality-certificate.js\` içine kullanılabilir stok
alanı ile **üç farklı minimum kenar eşiğini tek tamsayılı stok
kombinasyonunda** zorunlu tutan bütçeli güvenli Pareto örtüsü eklendi.
\`tripleThresholdAreaCover\` yalnız tamamlanan gevşetmelerden alt sınır
alır; kısmi/UNKNOWN sonuçları asla imkânsızlık veya genel optimumluk
kanıtı sayılmaz. Önceki tek/iki eşikli sertifikalar korunur.
\`tests/motor-triple-threshold.cjs\` bağımsız oracle,
44 ve 305 parçalık bağımsız gerçek tam-kenarlı giyotin ağacı,
kaynak bütçeleri ve maliyet/alan farkları için CI testi ekledi.
Rapor \`tests/MOTOR-TRIPLE-THRESHOLD-RESULTS.md\`.
PR: https://github.com/Beytullah-dot/Beytullah-/pull/30.
**Motorun genel fiziksel optimumluğu mühürlenmedi.**

**Önceki motor birleştirmesi (PR #28):**
`fe674da755efa7770f41a62996a9522258648b5a`.
Toplam kullanılabilir stok alanıyla **iki farklı parça-boyutu
eşiğinin** güvenli kerf'li kapasitesi aynı stok kombinasyonunda
eşzamanlı karşılanıyor. Tamsayılı üç kaynaklı Pareto örtüsü
`docs/engine/optimality-certificate.js` içinde; eksiksiz
gevşetme optimumluğu yalnız bağımsız giyotin planla eşleşirse
ilgili hedef için fiziksel optimumluk sertifikası. Maliyet,
brüt alan, stok adedi ayrıdır; `UNKNOWN` kanıt değildir.
Bağımsız test: `tests/motor-multi-threshold.cjs`;
rapor: `tests/MOTOR-MULTI-THRESHOLD-RESULTS.md`.
31 parçalık iki ayrı denetlenmiş optimum tanığı: maliyet
139 TL, alan 80.000 mm²; 64 heterojen stok işi × üç amaç =
**192/192** oracle karşılaştırması, aşım 0. PR:
https://github.com/Beytullah-dot/Beytullah-/pull/28.
**Önceki motor adımı (PR #26):**
`2886b99beb750cd677bed90a014e9a2addd72ce7`.
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

**Güncel motor adımı (21 Kasım 2026):** PR #28 `master`
merge `fe674da755efa7770f41a62996a9522258648b5a`.
Birden fazla parça boyutu eşiğinden **iki tanesi aynı stok çoklu
kümesi üzerinde eşzamanlı** zorunlu tutuluyor; toplam kullanılabilir
alanla birlikte üç kapasiteli güvenli alt sınır elde ediliyor.
31 parçalık bağımsız fiziksel giyotin örneğinde ayrı
maliyet/alan optimumu 139 TL / 80.000 mm² doğrulandı.
64 altı-stok-tipli deterministik holdout × üç amaç = 192/192
bitmiş karşılaştırma, hiçbirinde oracle üstüne çıkan alt sınır
yok. Kayıtlı maliyet ve brüt alan seçimi farklı plan
üretebilir; yüzdesel/mutlak kanıtlı fark iyileştirme vaadi değildir.

**Sıradaki matematik adımı:** Çoklu eşik örtüsünün halen açık
optimality-gap bıraktığı daha büyük, stok fiyatı ve boyutu
heterojen, kesim ağacı şekli farklı planted/gerçekçi holdout'ları
geliştir. Eşzamanlı 3+ eşiklerin durum patlamasını ve bellek
kullanımını ölç; güvenli dual-feasible/geometrik alt sınırları
incele. Ancak tam genel giyotin desen uzayını doğrulayan exact
pricing ve branching kurulmadan genel MILP/CP-SAT/
branch-and-price optimumluğu ilan etme. Sunucu tarafı
bağımsız fiziksel denetim, gerçek Safari, iki kullanıcı
Supabase saha UAT ve canlı byte eşleşmesi açık.
Gerçek kullanıcı stokları ve üretim kayıtları
bu adımda değiştirilmedi.

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
  `master` merge `2886b99beb750cd677bed90a014e9a2addd72ce7`.
  Başlangıç HEAD `4de1119d25f81cedf996b83dab17bf90170a4bbf`.
  `docs/engine/optimality-certificate.js` içinde
  `pairedAreaCardinalityCover` ve tamsayılı `pairedCover` eklendi.
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
- Tamsayılı dinamik programda `(usable-area, threshold-count,
  selected-objective)` Pareto durumları kullanılır. Azalan
  alan sırası ve sayı boyutunda Fenwick prefix-min üzerinden
  yalnız güvenli `>= capacity, <= objective` dominance uygulanır.
  Dahili `maxStates`/`maxMs` giriş limitleri değildir.
  `certify` tek işte tüm malzeme grupları ve bound aileleri
  arasında **ortak süre bütçesi** uygular; Worker'daki üç
  hedefin toplamı mobil UI watchdog altında tutulmaya çalışılır.
  Kesin uçtan uca süre garantisi yoktur.
- Aynı test işinde 4 adet **70×70** ve 44 adet **20×20 mm**
  parça, 3 mm kerf, 2 mm trim:
  A=47×1000 mm / 40 TL / 1 adet;
  B=100×100 mm / 100 TL / en çok 5 adet.
  Tamamen ayrı **elle kurulan fiziksel guillotine kesim ağaçları**
  `production-audit.js` ile kabul edildi:
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
- `tests/motor-paired-cover.cjs`: çözüm kodunu kullanmayan
  stok çoklu küme brute-force alt sınır oracle'ı, iki bağımsız
  fiziksel plan, üç amaçla 36 deterministik ayrı vaka,
  **90** sonlu/karşılaştırılabilir oracle sonucu içinde
  aşırı yüksek güvensiz alt sınır 0. Tahrif edilmiş kısa
  kesim reddi, fiyatı bilinmeyen alternatif stokun maliyet
  ispatını engellemesi, sıfır bütçe `UNKNOWN` ve UI
  görecek kanıtlı farkın testleri. Ortak DP bir MILP veya
  genel guillotine exact pricing çözücüsü değildir.
- `docs/index.html`: kanıtlanmamış iki hedefte alt sınır
  ile **olası iyileşmenin kanıtlı maksimumu** görünür.
  `status='unknown-price'` özellikle ele alınıyor.
  `docs/sw.js`: `beythaus-cut-v36-paired-area-threshold-cover`.
  Optimizer CI'da yeni test kapısı eklendi.
- PR head `5906813ec46066075e6bebcfc97ee6a22192284a`
  dört Actions kontrolü **SUCCESS**:
  Optimizer `44929446267`,
  Geometry `44929446239`,
  Uncapped Scale `44929446197`,
  iPhone WebKit **emülasyonu** `44929446211`.
  `master` merge SHA `2886b99beb750cd677bed90a014e9a2addd72ce7`
  üzerinde Optimizer `44929573922`,
  Geometry `44929573976`,
  iPhone WebKit **emülasyonu** `44929574059`
  ve Pages `44929573983` dört kontrol **SUCCESS**.
  Belge PR'ı yeni bir SHA oluşturacağı için son Pages
  dağıtımı ayrıca doğrulanacaktır.
- Supabase şeması, Auth, canlı stok ve kullanıcıya ait
  üretim kayıtları bu adımda hiç değiştirilmedi.
  Gerçek iPhone/Safari cihaz kabulü, canlı Pages JS bayt
  doğrulaması, iki kullanıcı/çok cihaz Supabase ve sunucu
  tarafında kesim ağacı tekrar kontrolü yapılmış sayılmaz.
  **Motor genel optimumluk için henüz mühürlenmedi.**


## L. 21 Kasım 2026 — PR #28 aynı stokta iki parça eşiği ve toplam alan

- **Birleştirme:** PR https://github.com/Beytullah-dot/Beytullah-/pull/28
  `master` merge `fe674da755efa7770f41a62996a9522258648b5a`.
  Başlangıç HEAD `79cee7da9722dd195d448352fdc0fa4e22f9dbe9`.
  Önceki tek eşikli ortak alan + sayı alt sınırı korunuyor.
- **Yöntem:** `docs/engine/optimality-certificate.js` içinde
  `multipleThresholdAreaCover` her tamamlanan iki eşik çifti
  için aynı stokun **kullanılabilir alan** + **yüksek eşik slot**
  + **düşük eşik slot** koşullarını birlikte zorunlu tutuyor.
  `dualThresholdCover` üç kaynaklı durumları tamsayılı
  Pareto DP ile çözüyor. Azalan alan sırası, iki
  eşik kapasitesinde Fenwick 2D prefix-min ile
  sadece **her üç kaynakta daha az olmayan ve seçili
  amaçta daha pahalı olmayan** güvenli dominance kullanır.
  Arama zamanı/durum bütçesi dolarsa UNKNOWN kalır;
  önceden bitmiş çiftlerden matematiksel güvenli LB
  korunabilir. Geometri ve giyotin aşamaları gevşetildi:
  bu **genel fiziksel exact optimizer değildir**.
- **Fiziksel bağımsız örnek:** 2×70×70, 15×40×40 ve
  14×20×20 mm parça; 3 mm kerf, 2 mm trim.
  Fiyat/ölçü/adet: A 50×900 / 61 TL / 5;
  B 600×77 / 78 TL / 1;
  C 200×200 / 90 TL / 4.
  Tam kenarlı kesim ağaçları solver kullanılmadan
  kuruldu, `production-audit.js` ikisini kabul etti.
  Fiyat optimum plan A+B = **139 TL**, brüt alan
  **91.200 mm²**; alan optimum plan C+C =
  **80.000 mm²**, fiyat **180 TL**.
  Ayrı oracle ve yeni alt sınır her hedef için
  aynı minimumu verdi. Önceki ortak tek eşikli
  LB'ler sırasıyla sadece 78 TL ve 46.200 mm² idi.
  Zıt hedefte kanıtlanmamış iyileşmenin maksimumu
  41 TL (180 TL'nin %22,78'i) ve 11.200 mm²
  (91.200 mm²'nin %12,28'i); gerçekleşeceği garantisi yok.
- **Holdout:** `tests/motor-multi-threshold.cjs`,
  64 deterministik iş, her birinde 6 farklı ölçü/fiyat
  stok türü ve 4 heterojen parça sınıfı, 3 ayrı amaç:
  **192/192** tamamlanan karşılaştırılabilir bağımsız
  tam stok-multiset oracle sonucu; güvenli alt sınırı
  aşan **0**. Bu oracle kesim ağacı çözmez, yalnız
  stok kapasitesi için matematiksel gevşetmeyi ölçer;
  fiziksel plan testleri ayrı `production-audit.js`
  denetiminde. Kesim ağacı tahrifi reddedildi; eksik
  fiyat için maliyet UNKNOWN; sıfır bütçe UNKNOWN.
  Önceki PR #24'ün 150 parça/30 levha fiziksel
  planted regresyonu da Optimizer test kapısında.
- **Reprodüksiyon:** `node tests/motor-multi-threshold.cjs`;
  sonuçlar ve literatür kapsamı:
  `tests/MOTOR-MULTI-THRESHOLD-RESULTS.md`.
  PWA önbelleği `beythaus-cut-v37-multi-threshold-cover`;
  `.github/workflows/optimization-verification.yml` yeni bağımsız
  testi koşuyor. PR son head `2f1a715a8c4468a2c9cc1e40f3b8d4111b9bbd66`
  üzerinde Optimizer `44931069420`, Geometry
  `44931069631`, WebKit **emülasyonu** `44931069416`,
  Uncapped Scale `44931069486`: **dörtte dört SUCCESS**.
  Aynı motor merge SHA'sında master Optimizer
  `44931195005`, Geometry `44931195003`,
  WebKit **emülasyonu** `44931194959` ve Pages
  `44931193875`: **dörtte dört SUCCESS**.
  Canlı URL'den JS bayt karşılaştırması bu tur
  yapılamadı. Gerçek iPhone ve saha üretim UAT
  yapılmış sayılmaz.
- **Kapsam dışı:** Supabase projesinin şeması/migration'ı,
  Auth, canlı stok ve üretim kayıtları değiştirilmedi.
  Bilinmeyen fiyat 0 sayılmıyor; parça/stok sayısına
  kullanıcı tavanı getirilmedi; panel/masif yön kuralı
  korunuyor. Motorun genel optimumluğu **mühürlenmedi**.
- **Sonraki görev:** Mevcut kanıtın *açık* kaldığı
  büyük ve çeşitli fiziksel giyotin örnekleri bulup
  iki hedefte boşluk dağılımlarını ve bellek/zaman
  maliyetini ayrı ölç. Sonra gerektiğinde birden fazla
  eşik + dual-feasible alt sınır veya yalnız doğrulanabilir
  özel fiziksel kesim sınıfında MILP/CP-SAT/branch-and-price
  prototipini küçük PR ile değerlendir.


## M. 21 Kasım 2026 — PR #30 üç eşik ve büyük fiziksel holdout

- **Kod PR:** https://github.com/Beytullah-dot/Beytullah-/pull/30.
  Başlangıç master HEAD:
  \`198b511e65cfe27ca7c6a7aadf540ed027b2ef37\`.
  Birleştirme: \`fc12cb792ca4baf236e6d815e7874992a798064d\`.
- \`docs/engine/optimality-certificate.js\` mevcut alan, eşik başına
  tekli/ikili Pareto kaynaklarını koruyor ve **aynı stok kombinasyonunda
  alan + üç farklı minimum kenar eşiği** zorunluluğunu yeni bir
  dört-kaynaklı stok-cover gevşetmesinde çözüyor. Durum
  \`(area,slots1,slots2,slots3,objective)\`; yalnız her kaynakta daha
  yüksek/eşit kapasite ve daha düşük/eşit amaç değeri güvenli
  dominance sayılıyor. Tam kenarlı kesim fizibilitesinin veya
  unrestricted genel giyotin optimumluğunun **kanıtı değil**.
- Kanıtlayıcı kaynak bütçesi dolduğunda \`UNKNOWN\` dönüyor; önceden
  bütünüyle tamamlanmış alt gevşetmelerin geçerli alt sınırı
  korunabiliyor. Bu bütçeler kullanıcıya parça/levha/stock sayısı
  sınırı getirmiyor. Maliyet, brüt stok alanı, adet ayrı hedefler.
  Bilinmeyen fiyat 0 sayılmıyor; masif/panel damar ve yön kısıtları
  mevcut motor/denetimde değişmedi.
- Bağımsız üç-eşik ayrıştırma: 1×80×80, 2×50×50, 25×25×25 mm parça;
  2 mm trim, 3 mm kerf, 5 çeşit stok. En güçlü ikili gevşetme
  **176 TL**, üç eşik ortak **208 TL**, bağımsız stok-multiset
  brute-force doğrulaması 208 TL. Bu rakam fiziksel optimumluk
  kanıtı **değil**.
- **44 parça / beş kullanılan stok / 49 tam-kenarlı kesim**
  bağımsız fiziksel ağaç: üretim audit PASS.
  Kayıtlı maliyet incumbent 500 TL, güvenli LB 220 TL,
  **açık fark 280 TL (%56)**; brüt alan incumbent 99.174 mm²,
  LB 71.544 mm², **açık fark 27.630 mm² (%27,86)**.
  Fiziksel minimumlar bağımsız exact giyotin oracle ile
  **kanıtlanmış değildir**; gap olası iyileştirmenin üst sınırıdır.
- **305 parça / 17 uygun heterojen stok tipi / 5 kullanılan stok /
  310 tam kenarlı kesim** ayrı bağımsız ağaç ve üretim audit PASS.
  Kayıtlı maliyet incumbent **1.000 TL**, güvenli LB **409 TL**,
  açık fark **591 TL (%59,1)**. Brüt alan incumbent
  **585.753 mm²**, güvenli LB **419.200 mm²**,
  açık fark **166.553 mm² (%28,43)**.
  Bunlar \`gap\` statüsündedir, \`optimal\` değil.
  Test kasten kısaltılmış tam-kenar kesimi reddeder.
- 24 deterministik senaryo, 8 heterojen stok tipi ve 5 parça
  sınıfı, üç amaç: **72/72** bitmiş bağımsız tam stok-multiset
  oracle kıyası, **0 güvenli olmayan aşım, 0 UNKNOWN**.
  Bu senaryolarda en fazla 11 Pareto durumu görüldü;
  bu nedenle tek başına durum patlaması için yeterli stres değil.
  305-parça stresinde 700-durum/250ms bütçesinde alan
  **UNKNOWN**, 3.000-durum/1.000ms ile alan alt sınırı
  419.200 mm² ve **2.038 tepe Pareto durumu** görüldü;
  en son koşumda 10 üçlünün yalnız **3'ü** tamamlandı.
  Tamamlanma adedi zaman/sunucu yüküyle değişebilir.
- CI test raporu: \`tests/MOTOR-TRIPLE-THRESHOLD-RESULTS.md\`;
  çalıştır: \`node tests/motor-triple-threshold.cjs\`.
  JSON artifact: \`triple-threshold-report.json\`.
  PR #30 head \`bb1f2f0e8da6f97a67bb084d85af6087ce234dba\`
  Optimizer \`44933876022\`, Geometry \`44933876042\`,
  Uncapped scale \`44933876084\`, iPhone WebKit emülasyonu
  \`44933876014\` **SUCCESS**.
  Master merge sonrasında CI ve Pages koşumları ayrıca
  doğrulanmalı; PR SHA testleri master SHA testleri sayılmaz.
- Supabase \`pdqgpupdqgrxejvjpdzs\` bağlanırken salt-okunur
  proje durumu \`ACTIVE_HEALTHY\` görüldü. Şema, migration,
  Auth, fiziksel stok, kullanıcı kayıtları ve tamamlanan
  üretimler **değiştirilmedi**. Gerçek iPhone Safari,
  canlı JS bayt karşılaştırması, iki cihaz bulut E2E ve
  sunucu tarafında bağımsız fiziksel ağaç doğrulaması açık.
- **Sonraki matematiksel görev:** yalnız güçlü/bitmiş alt
  sınırları biriktirerek 44/305 parçalık açık gap vakalarında
  maliyet ve alan incumbent kalitesini ayrı geliştirmek;
  gerçek giyotin optimumuna bağımsız exact referans üretilebilen
  yeni orta ölçekli planted/holdout sınıfları, durum patlaması
  için bellek/RSS örnekleyicisi ve 4+ eşikte güvenli baskınlık
  stratejisini araştır. Dual-feasible fonksiyonların kerf,
  rotasyon, yön ve karma stok için güvenli uygulamasını
  ispatlamadan canlı sertifikaya ekleme. MILP/CP-SAT veya
  branch-and-price ancak fiziksel giyotin pattern sınıfı,
  exact oracle kapsamı ve bağımsız audit açıkça tanımlanırsa
  küçük ayrı PR olarak uygulanmalı.
- **MOTOR HENÜZ GENEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**


## N. 21 Kasım 2026 — PR #32 kerf-genişletilmiş güvenli alan alt sınırı (CI bekliyor)

- **PR:** https://github.com/Beytullah-dot/Beytullah-/pull/32,
  kaynak dal `feat/kerf-expanded-area-proof-20261121`;
  başlangıç ve PR açılışında doğrulanan master HEAD
  `c47181e1fc6b63231c8ba1ba0effd63c6162dbd7`.
  Bu bölüm PR üzerinde hazırlanırken **merge/PAGES yayını
  doğrulanmış değildir**. Durumu GitHub'dan yeniden doğrula.
- `docs/engine/optimality-certificate.js` içine
  `kerfExpandedAreaCover` eklendi ve `certify` akışında üç
  hedeften (maliyet, brüt stok alanı, adet) her biri için
  bağımsız kaynak-bütçeli alt sınır olarak değerlendiriliyor.
  Her k mm testere aralıklı gerçek fiziksel guillotine ağaçta
  parça dikdörtgenlerinin sağından ve altından k genişletilmiş
  alanları ayrık olur. Bu nedenle
  `Σ((parça.l+k)*(parça.w+k)) <= Σ((stok.l-2*trim+k)*(stok.w-2*trim+k))`
  zorunlu koşuludur (yalnız kullanılabilir pozitif stok boyutu).
  Sonlu tamsayılı stok kombinasyonları bu gevşetme altında
  optimize ediliyor. **Fiziksel kesim üretmiyor.**
- `tests/motor-kerf-expanded-area.cjs`: ayrı stock-multiset
  exhaustive oracle ile 28 iş x 3 amaç = **84/84** karşılaştırma,
  aşırı yüksek alt sınır **0** (yerel izole JS doğrulaması).
  Ayrı analitik stok fiyat/alan eşitsizliğiyle optimumluğu
  kanıtlanan 44 ve 305 parçalık **YENİ** fiziksel holdout;
  bağımsız tam kenarlı kesim ağacı, üretim denetimi ve ikinci
  bağımsız audit, bozulan tam-kenar kesimin reddi. Bu yeni
  vakalarda 44 parça için optimum 1.530 TL ve 69.564 mm²,
  305 parça için optimum 10.980 TL ve 499.224 mm².
  Bunlar eski PR #30 vaka stoklarıyla **aynı işler değil**.
- Aynı yeni fiziksel optimum vakalarında sertifikanın maliyet
  farkı sırasıyla %56,67 ve %50, 305 parçadaki alan farkı
  %58,20 kaldı. **Fiziksel plan zaten optimum olduğu için bu
  pozitif gap'lerin tümü alt sınır gevşetmesi / kaynak-bütçesi
  zayıflığıdır; tasarruf değildir.**
- `tests/motor-triple-threshold.cjs` eski PR #30'un gerçek
  test vakalarında her ispat ailesini ayrı kaydediyor. İzole
  JS koşusunda 44 parça maliyet LB **220 → 255 TL**,
  brüt alan LB **71.544 → 78.399 mm²**; 305 parça
  maliyet LB **409 → 485 TL**, brüt alan LB
  **419.200 → 467.000 mm²** oldu. Uygun maliyet/alan
  fiziksel incumbents değişmedi. 305 alan ispatındaki
  zaman-bütçeli aileler farklı sistemlerde değişebilir;
  aşağıdaki CI çalıştırılmadan değerleri yayın başarısı
  diye raporlama.
- CI kapısı `.github/workflows/optimization-verification.yml`
  içine `MOTOR_EXPANDED_JSON=kerf-expanded-report.json
  node tests/motor-kerf-expanded-area.cjs` eklendi.
  Açıklama `tests/MOTOR-KERF-EXPANDED-RESULTS.md` içinde.
  Ölçüm: Node `process.resourceUsage().maxRSS` Linux peak
  RSS (KiB) ve ayrı heap/RSS/süre örnekleri; izole JS
  harnessındaki mock bellek değerleri gerçek ölçüm DEĞİLDİR.
- **Açık kontrol:** PR #32 Actions sonuçları, optimizer,
  geometry, iPhone WebKit emülasyonu, uncapped-scale,
  ardından gerçek `master` Actions + Pages. Üretim
  geçişi/merge yalnız test ve yayın gerçekten başarılı
  görüldükten sonra yapılabilir. Bu bölüm yazılırken
  Actions sonuçları henüz doğrulanamamıştır.
- Dört veya fazla eşikte güvenli dominance yalnız tüm
  kapasite koordinatlarında `>=` ve seçili amaçta `<=`
  ilişkisi ile olabilir; pairwise skyline en kötü durumda
  karesel, state explosion hâlâ araştırılmalıdır. Genel DFF,
  fiziksel exact MILP/CP-SAT/branch-and-price veya genel
  optimumluk mühürü bu PR kapsamına **girmiyor**.
- Gerçek Supabase `pdqgpupdqgrxejvjpdzs` şema/migration,
  Auth, kullanıcı stokları ve üretim hareketleri değişmedi.
  Tam kenarlı kesim, damar, bilinmeyen fiyat ve UNKNOWN
  ilkeleri korundu. **MOTOR GENEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**


## O. 21 Kasım 2026 — PR #32 merge ve gerçek GitHub Actions / Pages doğrulaması

Bu bölüm, üstteki N bölümünün **CI bekliyor** kaydından sonradır;
N bölümündeki PR bekleme statüsünün yerini alır.

- Matematiksel motor PR **#32 MERGED**:
  https://github.com/Beytullah-dot/Beytullah-/pull/32.
  Master merge `aaccc74ba4429b55872d8d98f4b8a910c5685220`.
  Kaynak PR HEAD `9d7828a00ab7eea60324503a046eb55f8ecfe216`.
- Yeni kerf-genişletilmiş alan gerekliliği
  `docs/engine/optimality-certificate.js` içinde
  maliyet, brüt stok alanı ve adet hedefleri için bağımsız
  kaynak-bütçeli kanıt ailesi. `docs/sw.js` PWA cache anahtarı
  `beythaus-cut-v39-kerf-expanded-proof`.
- **Master merge SHA'sında 4/4 SUCCESS**:
  Optimizer `44939079866`, Geometry `44939079961`,
  iPhone WebKit **emülasyonu** `44939079982`,
  Pages build/deployment `44939079731`.
  PR son head üzerinde 4/4 SUCCESS: Optimizer
  `44938954744`, Geometry `44938954690`,
  WebKit emülasyonu `44938954696`,
  Uncapped Scale `44938954689`.
- Gerçek master Node 22 Linux test kaydında 28 seed x 3
  hedef **84/84** bağımsız stock-multiset oracle ile eşleşme,
  0 unsafe overbound, toplam 9.072 enumerasyon.
  Tam kenarlı guillotine ağaçlarından bağımsız oluşturulan
  **YENİ** 44 ve 305 parçalık optimum tanıklar iki ayrı
  audit'ten geçti ve tahrif edilen kesimler reddedildi.
  44 parçalık fiziksel maliyet/alan optimumu 1.530 TL /
  69.564 mm²; 305 parçalık 10.980 TL / 499.224 mm².
  Her ikisindeki pozitif maliyet sertifika farkı gerçek
  tasarruf değil; bu örneklerin fiziksel optimumluğu
  bağımsız alan ve fiyat eşitsizliğiyle kanıtlandı.
- Eski PR #30'un 44-parçalı fiziksel planında mevcut
  incumbent 500 TL / 99.174 mm² değişmedi;
  alt sınırlar yeni yöntemle **255 TL / 78.399 mm²**.
  305-parçalı eski planda incumbent 1.000 TL /
  585.753 mm² değişmedi; LB **485 TL / 467.000 mm²**.
  Bunlarda **fiziksel optimum bilinmiyor**; alt sınır
  ilerledi, fiziksel planın iyileştiği iddia edilmez.
  Geometrik gevşetme ile gerçek fiziksel kalite ayrıştırılmalı.
- Node/Linux `process.resourceUsage().maxRSS` veri
  okuması: test süreci en yüksek RSS **97.772 KiB**
  (yaklaşık 95,48 MiB); heap son örnek 15.905.640 byte.
  305-parçalı yeni holdout maliyet/alan sertifikası
  239,93 / 218,05 ms, 44-parça 19,80 / 97,66 ms
  (bu CI runner'a ait, evrensel süre garantisi değil).
  Kaynak ve metodoloji:
  `tests/MOTOR-KERF-EXPANDED-RESULTS.md`,
  JSON artifact `kerf-expanded-report.json`.
- **Devam görevi:** (1) 44/305 eski planted vakalarında
  fiziksel *incumbent* ve LB ayrıştırmasını devam ettir;
  (2) mevcut stoklar arasında parça yönünden dolayı
  fiziksel olarak hiçbir parçayı barındıramayan stok
  türleri için yalnız güvenli geometri uyumluluğu
  filtresini bağımsız oracle ve fiziksel audit ile araştır;
  (3) dört veya daha fazla eşiğin Pareto skyline
  durum patlamasını, RSS ve süreyle bağımsız oracle
  üzerinde ölç, kesintide UNKNOWN koru;
  (4) DFF, exact pattern pricing/MILP/CP-SAT ancak
  özel fiziksel guillotine sınıfı ispatlanırsa ayrı PR yap.
- Supabase `pdqgpupdqgrxejvjpdzs` salt-okunur
  kontrol `ACTIVE_HEALTHY`; mevcut migration sürümleri
  `20261118212836` ve `20261119202121` olduğu görüldü.
  Şema/migration, gerçek stoklar, Auth ve üretim
  hareketleri değiştirilmedi. Panel/masif damarları,
  belirsiz stok fiyatları ve UNKNOWN ilkesi korundu.
- Gerçek iPhone/Safari, canlı Pages JS bayt karşılaştırması,
  iki-kullanıcı cloud E2E ve server-side üretim-ağacı
  tekrardan denetleme yapılmış sayılmaz.
  **MOTOR GENEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**

## P. 21 Kasım 2026 — PR #34 fiziksel stok uyumluluğu filtresi / PR #35 dört-beş eşikli Pareto araştırması

**En yeni doğrulanmış motor geliştirme:** PR [#34](https://github.com/Beytullah-dot/Beytullah-/pull/34),
merge `5f94ff0bcc11ea4fe19a807fac1e849439fc1a99`.
`docs/engine/optimality-certificate.js` içindeki
`geometryCompatibleStockTypes`, tüm stok-kombinasyonu sertifika
ailelerinden **önce**, bir parça bile barındıramayan stok türlerini
yalnız fiziksel olarak güvenli durumlarda eliyor. Malzeme/category
eşlemesi (otomatik atamada category gevşetmesi), parça kalınlığı,
trim, yön (= enine/Ⅱ boyuna), parçaya özgü rotasyon izni korunuyor.
Kerf, tek parça için ek artı boşluk gerektirerek **güvensiz eleme**
yapmıyor. Bütçe dolduğunda/ölçüler belirsizse sonuç UNKNOWN; stok
elemesinin kendisi fiziksel yerleşim sertifikası değil. Bilinmeyen
fiyatlı ama geometrik olarak hiçbir parçayı barındıramayan stok,
maliyet kanıtını gereksiz yere engellemiyor; kalan uygun bilinmeyen
fiyat maliyet kanıtını yine engelliyor.
PWA cache `beythaus-cut-v40-geometry-stock-filter`.

Bağımsız tam stok-multiset oracle **72×3=216/216** karşılaştırma,
**10.764** enumerasyon, **0 unsafe overbound**. 3 parçalı tanıkta
iki tam kenarlı fiziksel giyotin kesim, üretim denetimi ve bağımsız
audit; bozulan kesimler reddedildi. Parçanın doğrultusu ve fiyat
bilinmiyor testleri geçti. Test:
`tests/motor-geometry-stock-filter.cjs`; ayrıntı:
`tests/MOTOR-GEOMETRY-COMPATIBILITY-RESULTS.md`.
PR #34 kaynak HEAD `6ac621f4d0e81c8cc4d8cd8f0bd6b501e0b7b691`
üzerinde Optimizer `44940766616`, Geometry `44940766407`,
Scale `44940766387`, WebKit **emülasyonu** `44940766365`
SUCCESS; PR #34 merge master üzerinde Optimizer `44940928987`,
Geometry `44940928989`, WebKit emülasyonu `44940929029`,
Pages `44940928297` **SUCCESS**.

Bağımsız fiziksel optimumlu yeni PR #32 holdout sonuçları **yeni
geometri filtresiyle tekrar ölçüldü**: 44 parça kayıtlı maliyet
optimumu/LB **1.530/1.530 TL**, brüt alan optimumu/LB
**69.564/69.564 mm²**; 305 parça maliyet optimumu/LB
**10.980/10.980 TL**, alan optimumu **499.224 mm²**,
kanıt LB **208.692 mm²** (**UNKNOWN optimumluk**).
Eski PR #30 işlerinde geometrik olarak tümüyle elenen stok türü
**0**, eski 44 için incumbent/LB maliyet **500/255 TL**, brüt alan
**99.174/78.399 mm²**; eski 305 için **1.000/485 TL**,
brüt alan **585.753/467.000 mm²**. Eski işlerin gerçek fiziksel
optimumu BİLİNMİYOR; bu rakamlar fiziksel iyileşme değildir.
Yeni 305-area optimumluğu, bağımsız ispatlı fiziksel planına rağmen
sertifika süresi/gevşetme nedeniyle halen kanıtlanmıyor.

**Ayrı araştırma PR [#35](https://github.com/Beytullah-dot/Beytullah-/pull/35)**,
merge `dd64707462b5e4ea96adc30221defc7a636800c2`.
`tests/motor-fourplus-pareto-experiment.cjs` **yalnız CI
araştırmasıdır**, canlı optimumluk motoruna BAĞLANMADI.
Dört/beş eşik + alan aynı stok kombinasyonunda; dominance
yalnız **bütün kapasite koordinatları >= ve amaç <=** ise.
Skaler ağırlıkla güvensiz durum silme YOK.
Bağımsız tam multiset oracle: **18×2×3=108/108** tam eşleşme,
**26.244** kombinasyon, 0 unsafe/UNKNOWN küçük test.
Eski 44 maliyet/alan LB dört ve beş eşikte **220 TL / 71.544 mm²**,
eski 305 maliyet **409 TL**; eski 305 brüt alan **UNKNOWN**.
Bunlar üretim alt sınırlarından DAHA ZAYIF. 2.000-durum/900ms
bütçesinde 305-area 4/5 eşikte **2.001** Pareto durumuna ulaşıp
kesildi, ~**72,9–73,0 milyon** karşılaştırma yaptı;
~**426/545 ms** ölçüldü. Araştırma işlemi gerçek Linux
`process.resourceUsage().maxRSS` tepe değeri **102.532 KiB**
(~100,13 MiB), süreç geneli, bellek garantisi değildir.
Araştırma raporu `tests/MOTOR-FOURPLUS-PARETO-RESULTS.md`.
PR #35 kaynak HEAD `99d44cfff55099a3a5d1505636fc39b432229ad3`:
Scale CI `44940951812`, Geometry `44940951779`,
Optimizer `44940951776`: SUCCESS. Merge `dd647074`
master Optimizer `44941029496`, Geometry `44941029543`,
Pages `44941029212`: **SUCCESS**. PR #35 kodu kullanıcı
arayüzü/motoru değiştirmez.

Supabase `pdqgpupdqgrxejvjpdzs` **salt-okunur doğrulandı**:
`ACTIVE_HEALTHY`; migrationlar `20261118212836` ve
`20261119202121`. Mevcut Auth, gerçek stoklar, şema,
migration, envanter ve üretim kayıtları DEĞİŞMEDİ.

**SIRADAKİ GÖREV:** Fiziksel tam kenarlı giyotin pattern
generation için küçük ve kesin oracle ile denetlenmiş özel model
geliştir; farklı hedeflere ayrı maliyet/brüt alan LB ve fiziksel
incumbent üret. Mevcut 305 parçalık sertifika açığını, diğer
işlerden AYRI olarak izle. Gerekirse araştırma PR'da skyline için
güvenli indekslenmiş dominance/memory iyileştirmesi dene; UNKNOWN
kanıt sayılmaz, tüm araştırma yalnız güvenli koşullarda canlıya
aktarılır. DFF veya branch-and-price/MILP/CP-SAT ancak ilgili
fiziksel pattern sınıfı ve kaynak bütçesi bağımsız ispatlanırsa
küçük ayrı PR. Genel optimumluk iddiası, sabit kullanıcı
parça/levha limiti ve fiyatı sıfır varsayımı YOK.
Gerçek iPhone Safari, canlı JS bayt denetimi, iki gerçek kullanıcıyla
bulut E2E ve sunucu tarafı bağımsız kesim ağacı kontrolü
**halen yapılmadı**.

**MOTOR GENEL FİZİKSEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**

## Q. 21 Kasım 2026 — PR #37–38 tam kenarlı full-span fiziksel exact pattern generation

**Son matematiksel motor geliştirmesi:** Araştırma PR [#37](https://github.com/Beytullah-dot/Beytullah-/pull/37) merge `45e46905f022d46b3b84ebed1a2b63defe066be5`; üretim optimumluk sertifikasına güvenli entegrasyon PR [#38](https://github.com/Beytullah-dot/Beytullah-/pull/38) merge `d9497b4bad51d7d1a6c33c787c78df52a636f899`. Rapor: `tests/MOTOR-FULLSPAN-PHYSICAL-RESULTS.md`. Kod: `docs/engine/fullspan-strip-exact.js`, `docs/engine/optimality-certificate.js`, `docs/optimality-worker.js`; PWA cache `beythaus-cut-v41-fullspan-physical-proof`.

**Fiziksel EXACT kapsamı çok dar ve bilinçli:** parça üzerinde rotasyon fiilen YASAK; bütün parçaların stok boy ekseninde aynı enine uzanımı `P` var; ilgili grupta **her fiziksel olarak uygun stokun** trim sonrası boy ekseni genişliği tam `P`; malzeme ve kalınlık uyumu tutarlı. Tam kenarlı giyotin kesimde o zaman parçaları taşıyan kesimler yalnız yatay olabilir; 2D arama fiziksel olarak tam 1D kerf'li şerit pattern problemine indirgenir. Daha geniş alternatif stok, serbest/dikey rotasyon, eksik sayısal hassasiyet, karma otomatik category ataması veya kaynak bütçesi bitişi varsa bu ek fiziksel exact aile **UNKNOWN/uygulanamaz**, eski güvenli 6 gevşetme devam eder. Bu genel 2D optimumluk değildir. Artık kerf'ten küçükse fiziksel parça ayrıştırılamaz (`0 < R < k` yasak). Bilinmeyen kayıtlı fiyat sıfır değil; maliyet kanıtı fiyat biliniyorsa. Kullanıcı parça/levha sınırı KONMADI.

**Bağımsız doğrulama:** `tests/motor-fullspan-exact.cjs` 24 bağımsız küçük sınıf × 3 hedef **72/72 exact oracle eşleşmesi**, **93.000** bireysel parça→levha yerleşim enumerasyonu, 0 yanlış fiziksel optimum. İki ayrı tam kenarlı kesim ağacı denetimi her üretilen planı kabul etti; bozulmuş kesim, geçersiz kerf artığı, yasak rotasyon, boyu geniş rakip stok, UNKNOWN fiyat, 0 arama bütçesi ve masif m³ fiyat denendi. PR #37 kaynağı Optimizer `44942648819`, Geometry `44942648787`, Scale `44942648902`, WebKit **emülasyonu** `44942648807` 4/4 SUCCESS. PR #37 merge master Optimizer `44942778055`, Geometry `44942778071`, WebKit emülasyonu `44942778134`, Pages `44942778265` 4/4 SUCCESS.

**Bunun ölçülebilir matematiksel faydası:** 6 parçalık gerçek fiziksel kesim tanığında üç 45 mm ve üç 35 mm parça, 80 mm kullanılabilir yükseklik/2 mm kerf. Eski kerf-expanded-alan gevşetmesi maliyet **320 TL**, brüt alan **20.336 mm²**, levha **4** LB veriyor; yeni fiziksel exact alt sınır hem gerçek fiziksel optimum hem de doğrulanmış üretilebilir plana eşit: **400 TL**, **25.420 mm²**, **5 levha**. Ayrı bir 4 parçalık SAME JOB testinde maliyet optimumu **96 TL** (brüt alan 5.580 mm²) ve alan optimumu **5.456 mm²** (maliyeti 140 TL) iki farklı fiziksel kesim planıdır; diğer hedefin optimumluğu otomatik ilan edilmiyor.

**Büyük strict-class testleri:** YENİ 44 eş ölçülü parça 15 levha ve exact **1.350 TL / 61.380 mm²**; YENİ 305 parça 102 levha exact **9.180 TL / 417.384 mm²**. 305 parçada araştırma koşusunda **10.607** memo durumu, ~**27 ms** tek Linux koşusunda gözlendi. PR #38 gerçek Worker mesaj/importeasyon yolunu da test etti; üretim audit ve bağımsız oracle geçti. Test `tests/motor-fullspan-certificate.cjs`. Son PR #38 head `36acdf62472a14999a424be15f5d2756a4171e05` CI: Optimizer `44943104123`, Geometry `44943104128`, Uncapped Scale `44943104120`, iPhone WebKit emülasyonu `44943104122` SUCCESS. CI test süreci tepe RSS **68.768 KiB** (~67,16 MiB); evrensel/sadece algoritmaya özgü limit değildir. Master PR #38 merge SHA `d9497b4bad51d7d1a6c33c787c78df52a636f899`: Optimizer `44943215498`, Geometry `44943215388`, WebKit emülasyonu `44943215406`, Pages `44943215250` **4/4 SUCCESS**.

**ÇOK ÖNEMLİ karşılaştırma:** Bu yeni 44/305 strict full-span işleri önceki PR #30 44/305 ve PR #32 fiziksel optimumluğu kanıtlı holdout'larla AYNI DEĞİL. Eski PR #30'un 44 maliyet 500/LB255 TL, alan 99.174/LB78.399 mm²; eski 305 maliyet 1.000/LB485 TL, alan 585.753/LB467.000 mm². Bunların fiziksel optimumu hâlâ BİLİNMİYOR. PR #32'nin fiziksel optimumlu YENİ 305 alanı **499.224 mm²**, genel kanıt LB ise son koşuda **208.692 mm²**; bu sertifika açığı yeni strict-class çözümüyle genel olarak giderilmedi. Yeni solverı bu eski işlerin genel optimumluğu diye SUNMA.

Supabase `pdqgpupdqgrxejvjpdzs` Auth, migration, envanter/gerçek stok ve üretim kayıtlarına **dokunulmadı**; canlı depo ve `master/docs` adresi korundu. Gerçek iPhone Safari kabulü, iki gerçek kullanıcıyla bulut E2E, canlı JS byte karşılaştırması ve server-side bağımsız üretim ağacı denetimi hâlâ AÇIK.

**SIRADAKİ MATEMATİKSEL GÖREV:** Önce küçük, bağımsız fiziksel oracle ile ispatlanabilen **birden fazla parça enini ve gerçek iç içe tam kenarlı giyotin pattern** sınıfını tasarla; ilk olarak özel iki-aşamalı/üç-aşamalı kesim sınıfını exhaustively enumerate et, güvenli pattern dominance ve fiyat/brüt alan amaçlarını ayrı tut. İleride büyük eski 44/305 ve 305-area LB farkına uygulanabilir kaynak kontrollü exact yöntemleri araştır; fiziksel pattern setinin eksiksizliği ispatlanmadan genel alt sınır veya optimum ilan etme. Pareto 4+ eşik patlaması (PR #35) göz önünde tutulsun. Gerekirse küçük PR'larda DP / branch-and-price / MILP/CP-SAT exact sınıfı, pozitif kerf, trim, yön, malzeme/kalınlık, artıklar için bağımsız üretim ağacı kontrolü. Belirsiz durum UNKNOWN; kullanıcı parça/sac sayısı limitleri yok. Her değişim sonrası gerçek GitHub Actions, Pages, handoff ve uygun üretim denetimi doğrulansın.

**MOTOR GENEL FİZİKSEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**


## R. 21 Kasım 2026 — PR #40 iki aşamalı, çok enli fiziksel exact araştırma

**Birleşen araştırma PR [#40](https://github.com/Beytullah-dot/Beytullah-/pull/40)**, merge commit `7eb31d04d78cf3761bbf0c72c2f3949e959c82e4`. Başlangıç master HEAD `17d1258fe4cfb6e3b09cd7f3204625a0d4dba720`; yeni matematiksel araştırma gerçek `docs/engine/two-stage-strip-exact.js` dosyasına ve `tests/motor-two-stage-exact.cjs` bağımsız testine eklendi. Rapor: `tests/MOTOR-TWO-STAGE-PHYSICAL-RESULTS.md`. **Üretim Worker/certifier'a BAĞLANMADI.** Eski full-span strict-class, genel stok LB, UI/Pages ve bulut akışları korunuyor.

**Kesin matematiksel kapsam:** İki aşamalı tam kenarlı VH (önce dikey şerit, sonra her şerit içinde yatay) veya HV (önce yatay, sonra her şerit içinde dikey), her parça kendi şeridinin o eksendeki tam uzanımını kaplıyor. Farklı şeritlerin enleri FARKLI olabilir; rotasyon fiilen yok. Aynı levhada VH/HV aşamaları karma biçimde iç içe yer almıyor. Her uygun stok türü için bütün 2 aşamalı şerit-multiset parça-adedi desenleri kaynak bütçesi elverdiğinde enumerasyonla üretiliyor, ardından çoklu stok adetleri ve üç ayrı maliyet/brüt alan/stok sayısı hedefi için exact DP kullanılıyor. Aynı stokta AYNI parça-adedi vektörü tek tanığa indirilir; güvenli olduğu bilinmeyen farklı-vetör dominance YOK. Kerf, trim, damar, stok/parça malzeme ve kalınlık, masif m³ fiyatı korunur. Para/alan amaçlarının karşılaştırması desteklenen altı ondalık giriş için **BigInt rasyonel aritmetikle** yapılıyor. Hassasiyet/bütçe/kapsam aşıldığında UNKNOWN; kullanıcı parça/levha adedine keyfî tavan YOK.

**Bağımsız küçük oracle:** 16 farklı iş × 3 amaç = **48/48** exact sınıf eşleşmesi; **21.090** kimlik bazlı stok ataması, **147.561** bağımsız set-partition dalı, 0 yanlış optimum iddiası. Gerçek full-edge canlı-yaprak ağacı denetlendi; mevcut production-audit ve bağımsız optimization-oracle her üretilen planı doğruladı. Tam kenar kesimini kısaltan müdahale reddedildi. Bilinmeyen fiyat, kerf artığı, rotasyon, farklı malzeme/kalınlık, masif fiyatı ve aşım/UNKNOWN senaryoları test edildi. 30×12, 30×14, 20×12, 20×14 mm dört parçalık tanıkta kerf 2 mm ve trim 1 mm: **minimum maliyet 70 TL / tek 56×32 levha**; **minimum brüt stok alanı 1.620 mm² / 32×30 ve 22×30 iki levha** (toplam maliyet 90 TL). Farklı hedefler farklı optimum planlar veriyor. Bunlar yalnız tanımlı sınıfta tam optimum; genel 2D değil.

**CI doğrulaması:** PR #40 son HEAD `46c11b3a2c56733f3f3d5bcd80d301f5df679ecb`: Optimizer [44946002431](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946002431), Geometry [44946002500](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946002500), Uncapped Scale [44946002564](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946002564), WebKit **emülasyonu** [44946002503](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946002503): **SUCCESS**. Optimizer job'ındaki yeni test adımı ayrıca SUCCESS. Linux Node CI süreç-geneli `process.resourceUsage().maxRSS` **63.020 KiB** (~61,54 MiB), süre **~62,1 ms** (16 vaka/48 hedef+diğer kontroller); bu yalnız ölçülen runner, motor evrensel performans sınırı DEĞİL. Merge master Pages [44946122168](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946122168), Optimizer [44946122617](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946122617), Geometry [44946122594](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946122594): **SUCCESS**. Master WebKit emülasyonu [44946122631](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44946122631): **SUCCESS**.

**Değişmeyen, kritik ayrım:** PR #37'nin 44/305 strict full-span işlerinden, eski PR #30'un 44/305 planted stres işlerinden ve PR #32'nin fiziksel optimumluğu bilinen 44/305 holdout'undan AYRI veri kümeleridir. PR #32 305-parça fiziksel brüt alan optimumu **499.224 mm²**, genel sertifika LB **208.692 mm²**; açık devam ediyor. Yeni iki aşamalı sınıf bunun genel çözüm kanıtı DEĞİL. Üç veya daha fazla aşama ve karma rotasyon mevcut solver kapsamı dışında; bu eksik sınıflarda yeni modül infeasible deyince genel fiziksel imkânsızlık çıkarılmamalı. Dört/beş eşikli Pareto skyline durumu ve önceki RSS patlaması PR #35'te ayrıca korunuyor.

Supabase `pdqgpupdqgrxejvjpdzs` salt-okunur kontrolde **ACTIVE_HEALTHY**; migration sürümleri `20261118212836` ve `20261119202121`. Hiçbir Auth, gerçek stok, migration veya üretim kaydı değiştirilmedi. Gerçek iPhone Safari kabulü, iki gerçek kullanıcıyla bulut E2E, canlı JS bayt karşılaştırması ve bağımsız sunucu kesim ağacı audit'i hâlâ açık.

**SIRADAKİ MATEMATİKSEL GÖREV:** Önce ayrı küçük araştırma PR'ında **üç aşamalı** VH-V/HV-H gerçek nested guillotine kesim ağacı sınıfını açık tanımla; kimlik bazlı bağımsız oracle ve her fiziksel ağacın ayrı audit'iyle küçük vakaları doğrula. Çoklu stok fiyat/brüt alan/count'u birbirinden ayrı ele al. Unsafe dominance yapma; 4+ eşik Pareto RSS ve exact DP/branch-price/MILP/CP-SAT kaynak bütçesini ayrı araştır. Sadece özel sınıftaki exact sonucu genel optimum sertifikasına geçirme. Eski 305-area açığını AYRI izle; UNKNOWN asla imkânsızlık/optimumluk ispatı değildir.

**MOTOR GENEL FİZİKSEL OPTİMUMLUK İÇİN MÜHÜRLENMEDİ.**

## S. 22 Kasım 2026 — PR #42 üç aşamalı VH-V / HV-H fiziksel exact araştırması

**Birleştirilen araştırma PR [#42](https://github.com/Beytullah-dot/Beytullah-/pull/42)**,
master merge commit `8a64fb24010f2fef2f9a78f9db6a7f078762b389`.
Kod: `docs/engine/three-stage-nested-exact.js`; bağımsız oracle:
`tests/motor-three-stage-exact.cjs`; rapor:
`tests/MOTOR-THREE-STAGE-PHYSICAL-RESULTS.md`. CI Optimizer
iş akışında ayrıca çalışıyor. **ÜRETİM WORKER / GENEL
OPTİMUMLUK SERTİFİKASINA BAĞLANMADI.** Mevcut iki aşamalı, strict
full-span, stok LB, UI ve bulut üretim mekanizmaları korundu.

**Kesin sınıfın matematiksel tanımı:** VH-V = ilk aşamada levhayı
tam boy dikey şeritlere, ikinci aşamada her şeridi tam en yatay
bantlara, üçüncü aşamada her bandı yeniden dikey tam kenarlı
kesimlerle parçalara ayır. HV-H tam eksen transpozisyonudur.
Parçalar dönüşsüz yerleşir, her parça kendi bandının ikinci aşama
eksenini tümüyle kaplar. Aynı stokta VH-V/HV-H yönleri karışmaz;
dördüncü veya daha derin aşama burada yok. Yalnız her anki canlı
alt stokun **tam kenarından tam kenarına** fiziksel kesimler üretilir.
Pozitif kerf artıklarında `0 < r < k` yasaktır. Trim, panel/masif
damar, rotasyon izinleri, malzeme, kalınlık ve stok adedi denetlenir.

**Sınıf-içi enumerasyon neden eksiksiz:** Üçüncü aşama boyunca
aynı bandı kaplayan parçaların gerekli toplam genişliği
`u = Σ(genişlikler) + (parça_adedi - 1) × kerf` biçimindedir.
Bir üst şerit genişliği `d` için fiziksel izinli durum
`d = u` veya `d >= u + kerf`. Bütün bantların bu koşullarını
karşılayan asgari şerit genişliği adaylardan birinin
`u` veya `u + kerf` eşiğindedir. Şeridi bu eşiğe daraltmak
levha sığmasını bozmaz. Bu nedenle uygun çoklu bant
desenleri, gerekli şerit genişlikleri, şerit çoklu kümeleri,
stok adetleri ve üç ayrı hedef için exact DP bütçe
elverdiğinde tamamen sayılır. Yalnız aynı stokta eşit
parça-adedi vektörlerinin kesim sırası tanığı teke indirgenir;
**farklı vektör dominance yapılmaz.** Para ve brüt alan
karşılaştırması BigInt sabit paydalıdır; bilinmeyen fiyat
sıfır değildir. Geometrik sayısal hassasiyet 6 ondalık
yere kadar exact; dışı ve arama bütçesi aşımı UNKNOWN.
Keyfî kullanıcı parça/levha üst sınırı eklenmedi.

**Bağımsız oracle/üretim testi:** Kimlik bazlı ayrı stok
atamalarını, tamsayı konumlarında üç seviyeli **tam kenarlı
fiziksel kesim ağaçlarını** bağımsız arayan oracle;
motorun band/şerit enumerasyonunu, threshold adaylarını
ve stok DP'sini kullanmaz. Her gerçek ağacı ayrıca
canlı-yaprak checker, mevcut `auditCutPlan` ve
`optimization-oracle.cjs` denetledi. 6 farklı küçük
girdi × 3 hedef = **18/18** karşılaştırma; 4 özel tanık
kontrolüyle **22/22**; **2.946** stok ataması,
**9.144.808** oracle kesim ağacı rekürsiyon çağrısı,
yanlış sınıf optimumluğu **0**. Testere hattı kısaltma,
malzeme/kalınlık uyumsuzluğu, yasak dönüş, UNKNOWN fiyat,
masif m³, kerf artığı ve kaynak aşımı korumaları testte.

**Üçüncü aşamanın gerekli olduğu fiziksel tanık:** 32×24 mm
stok, kerf 2 mm, trim 0; beş parça (8×10, 8×10, 18×12,
12×14, 12×8 mm). Dış V şerit 18/12; sol H bantlar 10/12,
sağ H bantlar 14/8; sol üst bant iç V kesim 8/8.
**4 tam kenarlı kesim**. Önceki iki aşamalı exact
solverde tek bu stok için sınıf-içi infeasible;
üç aşamalı solverda sınıf-içi optimal 1 levha.
HV-H transpoze tanığı da 4 tam kenarlı kesimle doğrulandı.
Ayrı fiyat/alan tercihinde maliyet optimumu **60 TL**
(52×24 mm stok), brüt alan optimumu **768 mm²**
(32×24 mm stok, kayıtlı 90 TL), stok adedi optimumu **1**.
Bu rakamlar aynı genel 2D problemin optimumluğu iddiası
DEĞİLDİR.

**Gerçek CI ve Pages (PR head `e8cd78956b2e640464ea3d427e51e111ee06cdf2`):**
Optimizer [44950201256](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950201256),
Geometry [44950201233](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950201233),
Uncapped Scale [44950201386](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950201386),
iPhone **WebKit emülasyonu** [44950201306](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950201306):
**4/4 SUCCESS**. Bağımsız üç aşamalı CI testinin zaman
**315,3 ms** ve Linux Node süreç tepe RSS **63.692 KiB**
(~62,2 MiB). Sadece bu koşu/runner ölçümüdür; yüksek
adetli bütün işler için garantili kapasite değildir.

**Master PR #42 merge doğrulaması:** Pages
[44950337641](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950337641),
Optimizer [44950338169](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950338169),
Geometry [44950338221](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950338221),
WebKit **emülasyonu** [44950338228](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44950338228)
**4/4 SUCCESS**. Gerçek Safari cihaz kabulü ve canlı JS
bayt karşılaştırması halen AÇIK. Supabase
`pdqgpupdqgrxejvjpdzs` salt-okunur durum/migration
kontrolünde ACTIVE_HEALTHY; gerçek Auth/stoğa, migration'a
ve üretim kayıtlarına DOKUNULMADI.

**Kapanmayan, ayrı büyük problem:** PR #32'nin
fiziksel optimumu daha önceden bağımsız kanıtlı
305 parçalık holdout'unda brüt alan optimumu
**499.224 mm²**, genel optimumluk alt sınırı
**208.692 mm²**. Bu GAP açıktır. Bu holdout,
strict full-span PR #37'nin farklı 44/305 vakalarından
ve PR #30'un farklı 44/305 stresinden ayrıdır.
**Üç aşamalı sınıf optimumluğunu genel giyotin alt
sınırına/sertifikasına dönüştürmek YASAK.**
`UNKNOWN` her zaman bilinmiyor, imkânsızlık değil.

**SIRADAKİ TEKNİK ADIM:** (1) Araştırma modülünün
kapsamını ve kaynak bütçeleri altında büyük,
çok enli stoklarda büyümesini ayrı deneyle ölç;
testere payı, bilinmeyen fiyat ve fiziksel audit
korunarak yalnız **yapıcı üst sınır** olarak
Worker'a güvenli opsiyonel aday bağlantısını ayrı PR'da
değerlendir. (2) Gerçek genel alt sınır açığını
kapatmak için 4+ eşik Pareto skyline patlamasının
gerçek RSS ölçümüyle sınırlı olduğu durumlarda,
exact DP, branch-and-price, MILP ve CP-SAT araştırma
modellerini ayrık/bağımsız yöntemlerle karşılaştır.
(3) Üç aşamalı sınıf-dışı planları genel infeasible
sayma; 305-parça eski holdout'u ayrı hedef olarak tut.
(4) Gerçek iPhone/Safari, test stoklu iki kullanıcılı
Supabase uçtan uca UAT, sunucu bağımsız kesim ağacı audit'i,
gerçek stok güvenliği halen açık.

**GENEL FİZİKSEL GİYOTİN OPTİMUMLUĞU MÜHÜRLENMEDİ.**


## T. 22 Kasım 2026 — PR #44 üç aşamalı exact kaynak-bütçeli ölçek / gerçek RSS araştırması

**Birleştirildi:** [PR #44](https://github.com/Beytullah-dot/Beytullah-/pull/44), master merge
`59f385dc4d913f12f25f51d76f7cf66eeed7fac0`. PR #42'nin
`docs/engine/three-stage-nested-exact.js` araştırma modülüne yalnız
tanısal sayaçlar (`shelvesCreated`, `stripsCreated`, `boardGenerations`,
`dpTransitions`) eklendi. `nodes`, `patternsCreated`,
`states` ve `peakMemo` korunuyor. **Arama semantiği, üretim Worker'ı,
genel optimumluk sertifikası ve aktif stoklar değiştirilmedi.**

Yeni bağımsız izole Node test:
`tests/motor-three-stage-scale.cjs`. Deney raporu:
`tests/MOTOR-THREE-STAGE-SCALE-RESULTS.md`. CI JSON artifact:
`three-stage-scale-report.json`. 24 ayrı Linux Node 22 işlemi;
8/40/200 parça, tekrarlı veya farklı enli, 2 mm pozitif kerf,
1 mm kenar payı, 52×36 / 54×38 / 56×40 / 60×42 mm stok
kataloğu (kayıtlı fiyat 100/114/129/157), maliyet ve brüt alan
için iki kaynak bütçesi. **8 parçalık küçük vakada tek stok
türünün; 40/200 parçada dört stok türünün pozitif adedi vardır.**
Her işi bilinen fiziksel V-H-V dikey şerit/yatay bant/iç dikey
parça kesim tanığı ile üretmek mümkündür. Test bütçeleri dar:
800ms, 12.000 düğüm, 1.500 desen, 2.500 DP durumu; geniş:
1.600ms, 80.000 düğüm, 12.000 desen, 12.000 DP durumu.
**Bu bütçeler kullanıcıya konmuş parça/levha üst sınırı değildir.**

**Gerçek ölçüm:** 24 deneyden **8'i bu özel üç aşamalı sınıfta
exact tamamlandı ve hem üretim hem bağımsız kesim ağacı audit'inden
geçti; 16'sı `unknown-limit`.** Bu oran genel kullanıcı işleri
için başarı istatistiği değildir. Tekrarlı 8 parçalık işte
8 desen / 8 exact DP durumu ve yaklaşık 3–4 ms;
40 tekrarlı parçalık işte 32 desen / 443 exact DP durumu /
6.240 DP geçişi ve ~17–23 ms. Tekrarlı 200 parçalık
geniş bütçede desen enumerasyonu tamamlanıp 4.767
memo durumu / 78.427 DP geçişi sonunda 80.001 düğüm
nedeniyle `UNKNOWN` döndü. Farklı enli **8 parçalık**
geniş bütçede 6.224 şerit / 188 levha deseni /
0 DP durumu; 80.001 düğüm ve ~1.021 ms ardından
`UNKNOWN`. Farklı enli 40 ve 200 parçada 12.001 şerit
bütçesi tüketilip DP başlamadı. **Önemli darboğaz:
parça adedinden bağımsız şerit deseni çoğalması;
tekrarlı yüksek adette ayrıca çoklu stok DP patlaması.**
Süreleri basit UNKNOWN dönmeyi optimum çözüm olarak yorumlama.

**Gözlenen tepe gerçek Linux Node süreç RSS** 67.060 KiB
(~65,49 MiB). Çocuk işlem başına `process.resourceUsage().maxRSS`
ölçülüyor; Node/V8 başlangıcı ve test/doğrulama kodu da dahildir,
algoritmanın bağımsız belleği veya gelecek işler için üst sınır
değildir. Her deneyin RSS/heap/elapsed/node/pattern/shelf/strip/memo
kaydı CI artifact içindedir. Gerçek Safari cihaz zamanı değildir.

**PR son HEAD** `51b82b898c12e9f7274cdf2b67f75e9714b3a28a`.
PR CI: Optimizer
[44951473141](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951473141),
Geometry [44951473267](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951473267),
Scale [44951473139](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951473139),
iPhone WebKit **emülasyonu**
[44951473133](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951473133):
**4/4 SUCCESS**. PR #44 master merge `59f385dc4d913f12f25f51d76f7cf66eeed7fac0`
sonrası gerçek master Optimizer
[44951584481](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951584481),
Geometry [44951584495](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951584495),
iPhone WebKit **emülasyonu**
[44951584502](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951584502)
ve Pages [44951584094](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44951584094):
**4/4 SUCCESS**.

**YAPICI ADAY ENTEGRASYONU HENÜZ YAPILMADI.**
Bu enumerator 8 farklı enli parçada dahi `UNKNOWN` kalabildiğinden
onu üretim Worker'ında koşulsuz başlatmak uygun değil. Sonraki
ayrı küçük PR: fiziksel yapıcı adayları tamamlanmış/audit edilmiş
olmadan serbest bırakmayan budgetlı **anytime/lazy** desen
yöntemini ve mobil kaynak bütçesini araştır; üretim için yalnız
bağımsız denetimli tam kenarlı kesim planı adayı oluştur,
**optimumluk sertifikası çıkarma**. Unsafe count-vector dominance
yok. Alternatif olarak özel sınıfa uygun pricing/column generation,
MILP/CP-SAT ve branch-and-price yöntemlerini ayrı araştırma
PR'larında gerçek RSS, süre ve oracle'la karşılaştır. Genel 2D
matematiksel kapsam kanıtlanmadan bunları genel exact ilan etme.

**Açık büyük bağımsız problem:** PR #32'nin fiziksel optimumluğu
bilinen **farklı** 305 parçalık holdout'unda brüt alan optimumu
499.224 mm², genel güvenli alt sınır 208.692 mm²;
aralık halen açık. PR #30 ve PR #37'nin farklı 44/305
örnekleriyle karıştırılmayacak. UNKNOWN ne imkânsızlık
ne optimumluk kanıtıdır.

Supabase `pdqgpupdqgrxejvjpdzs` Auth/gerçek stok/migration/
üretim kayıtları değiştirilmedi; gerçek iPhone Safari,
iki kullanıcılı bulut saha UAT, gerçek canlı JavaScript byte
eşleşmesi ve sunucuda bağımsız kesim ağacı audit'i **AÇIK**.
**GENEL GİYOTİN OPTİMUMLUĞU MÜHÜRLENMEDİ.**


## U. 22 Kasım 2026 — PR #46 lazy/anytime üç aşamalı fiziksel yapıcı aday araştırması

**Araştırma PR:** [#46](https://github.com/Beytullah-dot/Beytullah-/pull/46).
Merge ve master Pages doğrulaması için GitHub'daki güncel durumu esas al.
Kod: `docs/engine/three-stage-lazy-research.js`.
Test: `tests/motor-three-stage-lazy.cjs`.
Rapor: `tests/MOTOR-THREE-STAGE-LAZY-RESULTS.md`.
Mevcut özel-sınıf exact modül ve tüm üretim Worker/sertifikaları korunuyor.
Auth, gerçek stok, migration veya üretim geçmişi değiştirilmedi.

Amaç, PR #44'te farklı parça enlerinde erkenden görülen desen patlamasına
karşı, tüm kombinasyonları saymadan bant/şeritleri gerektiğinde oluşturan
kaynak bütçeli araştırma. `VH-V/HV-H` tam kenarlı canlı-alt-yaprak
kesimleri, pozitif kerf/trim, damar, rotasyon, malzeme/kalınlık ve fiyat
uyumu korunacak. Tamamlanmış adayların iki BAĞIMSIZ fiziksel denetimi
CI'da zorunlu. `feasible-uncertified` optimumluk demek değil.
`unknown-limit` ve `unknown-no-candidate` imkânsızlık demek değil.
Yanlış fiyat sıfırlaması, farklı-vetör unsafe dominance, keyfî kullanıcı
parça/levha limiti yok. Üretime entegrasyon bu PR'nin KAPSAMI DIŞINDA.

**PR #46 gerçek CI:** Optimizer araştırma adımı
[44952409212](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952409212)
SUCCESS, `5bdda14d6c658b48777bbafdba331624a0b81f71` kaynak HEAD.
Farklı/tekrarlı enli 8/40/200 parça içeren 10 deneyin **10/10'u
fiziksel uygulanabilir tam plan** buldu; üretim ve ikinci bağımsız
giyotin ağacı audit'inden geçti; **11** callback adayı ayrı denetlendi.
Karma 200 parça için 24 levha, sentetik fiyatla toplam 2.943 TL,
199 fiziksel kesim; 79,001 ms. Bu yalnız aday üst sınırıdır,
**24 levhanın veya 2.943 TL'nin minimum olduğu kanıtlanmadı.**
Tüm test sürecinin Node/Linux tepe RSS'i 67.592 KiB
(~66,0 MiB, auditor + Node dahil); 10 vaka + denetimler
yaklaşık 190,76 ms. Mobil/Safari kapasitesi değildir.
Masif m³ fiyatı, kesirli geometriler, count hedefi ve stok adedi
regresyonları ayrıca doğrulandı. PR #44 exact karma 8/40/200
vakalarında kaynak sebebiyle UNKNOWN dönerken bu ayrı araştırmada
fiziksel aday bulunması optimumluk sertifikasına dönüştürülemez.
İzole deneyin kapsamı ve tüm ölçümler yukarıdaki test raporunda.

**Bağımsız açık araştırma:** PR #32'nin fiziksel optimumluğu kanıtlı,
farklı 305-parça holdout'unda 499.224 mm² optimuma karşı genel
208.692 mm² alt sınır açığı aynen sürüyor. PR #30 ve PR #37'nin
birbirinden farklı 44/305 örnekleri bu veri kümesi değildir.
**GENEL GİYOTİN OPTİMUMLUĞU HÂLÂ MÜHÜRLENMEDİ.**

**Sonraki doğrulama kaydı (PR #47):** PR #46
master merge `300187a29a3c73f3d0a9b901288f31aa62e092c5`.
Merge sonrası gerçek master Optimizer
[44952654524](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654524),
Geometry [44952654649](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654649),
WebKit **emülasyonu**
[44952654606](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654606)
ve Pages [44952654269](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952654269):
**SUCCESS**. Ek 96 deterministik karışık geometri denemesi:
93 bağımsız denetlenmiş uygulanabilir yapıcı plan,
3 UNKNOWN, yanlış fiziksel ağaç iddiası 0.
96-vaka testinin dahil olduğu GitHub
[Optimizer #44952550336](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44952550336)
SUCCESS. Bu genişletilmiş testte süreç `maxRSS`
80.912 KiB (~79,0 MiB), toplam araştırma testi yaklaşık
329,06 ms. Önceki 67.592 KiB yalnız 96-vaka eklenmeden
önceki ayrı koşuya aitti. Genel optimumluk / minimum levha
sayısı hâlâ KANITLANMADI. Yeni ölçüm raporu:
`tests/MOTOR-THREE-STAGE-LAZY-RESULTS.md`.
Sıradaki teknik iş, ayrı PR'da mobil kaynak bütçesi
ve denetlenmiş tam planların üretime **yalnız aday**
olarak güvenli bağlanabilirliğini değerlendirmek; eğer gerekirse
lazy pricing / branch-and-price, MILP/CP-SAT yöntemlerini
farklı, kontrollü araştırmalarda karşılaştırmaktır.
Açık PR ve güncel master bilgilerini her seferinde GitHub'dan teyit et.


## V. 22 Kasım 2026 — Kullanıcının onaysız devam talimatı ve v1 release yol haritası

Kullanıcı, yaklaşık **%70** olarak tahmin edilen mevcut v1 ürün
hazır oluşunu tamamlamak için **kalan tahmini %30'luk işleri ara ara
yeniden onay almadan yürütmemizi** istedi. Bu oran matematiksel optimumluk
başarı yüzdesi veya ampirik tamamlanma ölçüsü değil, çalışma takibi
için başlangıç **tahmini** referanstır.

**Kalıcı yürütme planı ve kabul matrisi:**
[`BEYTHAUS-CUT-RELEASE-ROADMAP.md`](./BEYTHAUS-CUT-RELEASE-ROADMAP.md).
Yol haritasındaki A–E paketleri sırayla bağımsız küçük PR ve gerçek
CI ile ele alınacak. Başarılı rutin PR'lar için yeniden "devam edeyim mi?"
diye sorulmayacak; GitHub master/Pages, AGENTS, mevcut üretim güvenliği
ve bağımsız audit doğrulanacak. Her önemli birleşimden sonra önceki
yüzde / güncel yüzde / yüzde puan farkı, hangi kabul kanıtının alındığı,
kalan risk, fiziksel başarı ve **ayrı optimumluk kanıt kapsamı** bildirilecek.

**Sınırlar:** Gerçek kullanıcı stoku ve kayıtları, geri alınamaz
Supabase operasyonları, Auth/RLS güvenliği ve finansal hesap işlemleri
onaysız/denetimsiz değiştirilmez. Gerçek iPhone veya iki insanın
Supabase UAT'si yapılmadan "tamamlandı" denmez. Takılınan adım
dürüstçe BLOKE işaretlenir ve bağımsız yapılabilir sonraki güvenli
geliştirmeye devam edilir.

Bu kayıt yazılırken **doğrulanan önceki master**
`f3b4655fd5397bfd057059ee9254f16820812a7c`; Optimizer, Geometry ve Pages **SUCCESS**;
açık PR **0**. Bu bölümün birleştirme commit'i ve yeni master CI
sonraki işlemde tekrar doğrulanmalıdır.


## W. 22 Kasım 2026 — v1 A paketi, ilk üretim yapıcı Worker adayı

Aşama A için küçük PR dalı: `feat/v1-a-lazy-constructive-fallback`.
Yeni `docs/constructive-worker.js`, PR #46/#47'deki
`three-stage-lazy-research.js` modülünü kaynak bütçeli ayrı Web Worker
olarak kullanır; çıktı yalnız `feasible-uncertified`, `proof:none`
olabilir. Worker'ın bağımsız `production-audit.js` kesim ağacı
denetimi ve ana sayfanın ayrı yeniden-audit kapısı olmadan tam plan
kullanıcıya yayınlanamaz. Research UNKNOWN/timeout/precision/price
sınırlamaları `infeasible` veya `optimal` olarak etiketlenmez.
Stok adedi, kerf, trim, malzeme, kalınlık ve belirtilmiş parça damar
yönü korunur; kullanıcı stoğu veya üretim kaydı değişmez.

**Kapsam kontrollü:** Yalnız mevcut tek tip/karma özel modunda,
ilk hesaplama tüm parçaları yerleştiremediyse tamamlanmış giyotin
adayına otomatik kurtarma denemesi yapılır. Mevcut tam/kanıtlı plana
dokunulmaz. Karma otomatik malzeme ataması ve döndürülebilir parçalar,
yapıcı araştırmanın fiziksel sınıfı dışında olduğundan bu adımda
entegre edilmedi. Mevcut küçük kesin Worker/proof ve maliyet/alan
hedefleri korunur. İptal, sayfa gizlenmesi, girdi/hedef değişimi ve
süre aşımı eski eksik planı değiştirmez. Üretime çıkarılan tam plan
kesin optimum değildir; ayrı stok/alan/maliyet sertifika araması eski
sınırlı kapsamda devam eder.

Yeni test `tests/constructive-worker.cjs`: gerçek Worker kaynak
kodunun izole Node/VM çalıştırması, ikinci bağımsız oracle,
sahte optimumluk etiketleri, kesim ağaç tahrifi, stok kimliği ve
fiyat manipülasyonu, bilinmeyen fiyat, UNKNOWN, auto/rotasyon
reddi. Optimizer CI ve PWA cache sürümüne bağlandı.

**Doğrulama durumu:** Bu satırlar PR CI ve master merge
sonuçları kaydedilmeden yazıldı. Başarılı CI/Pages
sonucu henüz bu bölümde iddia EDİLMİYOR. %70 tahmini
başlangıç seviyesi, kabul koşulları doğrulanıncaya kadar
arttırılmadı. Sırada PR CI ile olası düzeltmeler; ardından
karma otomatik ve tam fakat maliyet/alan açısından yetersiz
planlar için güvenli adaylaştırma; bağımsız mobil ölçüm,
bulut audit/RLS ve UAT iş paketleri var.


## X. 22 Kasım 2026 — PR #49 master doğrulaması ve A/otomatik atama emniyet sınırı

**PR #49 birleştirildi:** https://github.com/Beytullah-dot/Beytullah-/pull/49
Master merge: `18dd49227fd7180eb0e7df316160260154cc782a`.
PR'ın ilk araştırma-test CI'si VM'de Worker `self/window`
ayrımı nedeniyle FAIL oldu; test ortamı gerçek Worker köküne
eşitlendi ve güncel PR SHA `acfa6028bcb1495ffd18556e58191db4565a3815`
için Optimizer #44968512945, Geometry #44968512927 ve
iPhone WebKit **emülasyonu** #44968512944 SUCCESS oldu.
PR #49 merge sonrasında gerçek master Optimizer
#44968615190, Geometry #44968615174, iPhone WebKit
**emülasyonu** #44968615210 ve GitHub Pages #44968615106
**4/4 SUCCESS**. İlk başarısız koşu başarılı olarak
sunulmadı.

**A'nın ikinci dilimi (bu bölüm kaydedilirken ayrı PR/CI henüz
tamamlanmadı):** `feat/v1-a-auto-constructive-fallback`.
Karma otomatik materyal ataması için sadece kullanıcı tarafından
o anda seçili `economic` veya `area` alternatifindeki eksik
planı yapıcı Worker'a aç. Yalnız aynı `data/plan` nesne kimliği,
aynı seçili hedef ve aynı cache anahtarı hâlen geçerliyse aday
kabul edilebilir; hedef/atanan malzeme/proje değişince eski Worker
iptal edilir. Sadece bağımsız tam kenar denetimli
`feasible-uncertified` plan kullanıcıya gösterilir; cache'in
diğer hedefleri korunur; karma atama optimumluğu KANITLANMAZ.
Gerçek WebKit içinde ayrı Worker çalıştırılması ve tekrar fiziksel
audit, bu dalın kabul regresyonuna eklendi.

**Hazır oluş hâlâ tahmini %70 (+0 puan).** A paketi, tam fakat
iyileştirilebilir başlangıç planları, mobil kaynak profili,
gerçek tarayıcı/çok kullanıcılı kabul ve kanıt kapsamı açısından
tamamlanmadı. Gerçek iPhone Safari testi ve iki gerçek kullanıcı
Supabase UAT **AÇIK**. Supabase proje salt-okunur
`ACTIVE_HEALTHY`; migrationlar `20261118212836`,
`20261119202121`. Güvenlik advisor sonuçlarında RLS
politikasız (RPC-only olabilecek) 10 tablo, 9 adet authenticated
`SECURITY DEFINER` RPC ve leaked-password-protection uyarısı
bulundu; bu, doğrulama olmadan istismar kanıtı sayılamaz.
Gerçek kullanıcı tablosu, Auth, stok, SQL migration, üretim
ve kayıtlar değiştirilmedi. C paketinde ayrı salt-okunur
yetki fonksiyon incelemesi zorunlu.

**Sıradaki adım:** A/otomatik atama dalını gerçek CI ile
doğrula; güvenli birleştir ve master/Pages'i yeniden doğrula.
Ardından B ölçek/mobil performans testleri, C bulut
sunucu-fiziksel-audit tehdidi ve D/E UAT kabul listesine geç.


## Y. 22 Kasım 2026 — PR #50 birleşimi, B canlı Worker ölçek kabul araştırması

**PR #50:** https://github.com/Beytullah-dot/Beytullah-/pull/50
Merge `865ec2665ec7d0e99d3e95ba61dd3a521f1f3a10`.
PR son HEAD `ef96c6dc4852f7b3ba0c99463393dc5b9a5de310`,
PR Optimizer #44968813494, Geometry #44968813598,
WebKit **emülasyonu** #44968813525 **3/3 SUCCESS**.
Karma otomatikte yalnız seçili malzeme atamasının eksik planı
kaynak bütçeli lazy Worker ile denenir. Olası stale seçili hedef,
data veya plan kimliğinde sonuç reddedilir. Yapıcı sonuç sadece
`feasible-uncertified`; otomatik atamaların küresel optimumluğu
asla iddia edilmez. WebKit emülasyonunda gerçek Worker çalıştırılıp
üretilen tam kesim ağacı ikinci kez audit edildi. Gerçek iPhone
testi bu değildir. Merge sonrası master CI/Pages durumu
yeni SHA için ayrıca kontrol edilmelidir.

**B ilk dilim, ayrı araştırma PR/dalı:**
`research/v1-b-live-worker-scale`, deney:
`tests/motor-live-constructive-scale.cjs`,
`tests/MOTOR-LIVE-WORKER-SCALE.md`.
8/40/200/500/1000, karma/tekrarlı en ve heterojen stokla gerçek
yayın Worker'ında bağımsız izole Linux Node çocuk süreçleri,
`maxRSS`, 1300 ms/120000 node bütçeleri ve iki bağımsız fiziksel
auditor. Her complete planı tekrar denetle, UNKNOWN'u false
infeasible/optimum olarak etiketleme, çökme/child timeout test
FAIL olsun. Bu kayıt yapılırken henüz B CI test sonucu yok.
Büyük ilk yerleşimin ana thread'de çalışması ve >1500 tek-tip
seri akış ayrımı, mobil ilk hesaplama için açık risk.

**Hazır oluş %70 (+0 puan) olarak korunuyor**; A/B/C/D/E kabul
paketlerinin hepsi henüz tamamlanmadı. Gerçek iPhone Safari, iki
kullanıcılı Supabase UAT ve sunucu fiziksel ağacı audit'i AÇIK.

**C salt-okunur ek güvenlik doğrulaması:** Bağlı Supabase
`pg_class`/privilege metadata sorgusunda 10 Beythaus tablosu
RLS açık, policy_count=0; `anon` ve `authenticated` rolleri için
SELECT/INSERT/UPDATE/DELETE tablolarının tamamında **false**.
Dolayısıyla RLS advisor 10 INFO yalnız başına doğrudan tablo
erişimi açığı demek değil; kasıtlı RPC-only modelle uyumlu.
Ancak `beythaus_cloud_production_v2` fonksiyonu mevcut
kaynak SQL'de stok id/adet/sürüm ve artık toplam alanını kontrol
ederken, kesim ağacını/yapraklarını bağımsız sunucu doğrulamasıyla
tekrar oynatmıyor. Bu **üretime hazır v1 için açık yüksek
öncelikli bütünlük riski**. Gerçek stok/üretim verisi okunmadı
veya değiştirilmedi, migration uygulanmadı.

**Sıradaki adım:** B CI'daki gerçek Linux RSS, başarı/UNKNOWN ve
büyük iş süreleri raporunu kontrol et; güvenli PR'ı merge et;
master/Pages doğrula. Sonra C için non-mutating SQL threat
regresyonu, sunucu tam kenarlı fiziksel audit migration tasarımı
ve gerçek stok kayıplarını önleyici atomik prova planı; D/E.


## Z. 22 Kasım 2026 — B master ve C sunucu fiziği için staging migration

**PR #51** merge `3c6b3833d879b29a941258d9e9312f651622cf4a`.
PR son SHA `c8483162e392b555a1794fb66776c6a4743df71b`:
Optimizer #44969095190, Geometry #44969095208 ve
uncapped motor scale #44969095217 3/3 **SUCCESS**.
Merge sonrası master Optimizer #44969169379, Geometry
#44969169362 ve Pages #44969169246 3/3 **SUCCESS**.

Bağımsız canlı Worker ölçümü, CI Node Linux:
16 sentetik vaka = **14 fiziksel tam/çift denetimli feasible,
2 UNKNOWN** (1000 farklı en `unknown-limit`, fiyat bilinmeyen
maliyet `unknown-price`). 1000 tekrarlı parça 125 stoklu
tam kesim planı, `workerAndAuditWallMs=886.83`, maksimum
RSS `88536 KiB` (yaklaşık 86.5 MiB). 500 tekrarlı
`259.692 ms`, 200 tekrarlı `67.642 ms`, 1000 heterojen
`270.638 ms` UNKNOWN. Bu Node/Linux süreç belleğidir,
**iPhone ölçümü değildir**. Bunlar fiziksel yerleşim
başarısı, **matematiksel optimumluk kanıtı değildir**.
Rapor `tests/MOTOR-LIVE-WORKER-SCALE.md` ve PR51 CI artifact.

**C staging adımı (yalnız depo, üretim Supabase şeması henüz
DEĞİŞMEDİ):** `security/v1-c-physical-server-guard`.
`supabase/migrations/20261122_000003_server_physical_cut_guard.sql`
yeni kaydı atomik üretim RPC'si commit etmeden önce planın bütün
canlı giyotin yapraklarını, pozitif kerf/trim, her parçanın kesim
sonucuyla bire bir uyuşmasını ve her yeni artığın ayrı fiziksel
rezidüel yapraktan gelmesini doğrulayan `BEFORE INSERT` trigger
ekler. Varsayılan RPC stok sürümü ve kullanıcı üyelik kontrolü
korunur. Yeni trigger için test fixture'ı fiziksel kesimlerle
değiştirildi; geçersiz/kopya artık ve sahte parça gönderimlerinde
**tam rollback** beklentisi PostgreSQL izole CI'a eklendi.
Bu kayıt sırasında C CI sonucu henüz bekleniyor, **başarılı ilan
edilmedi**. Üretim Supabase'i üzerine migration otomatik
uygulanMAMALI: gerçek payload uyumluluk testi, rollback planı,
staging gözetimi ve daha yüksek sayıda yaprak/negatif vaka
gerekli. Kullanıcı stoğu ve kayıtları değiştirilmedi.

**Hazır oluş %70 (değişim +0 puan)**: tamamlanan alt adımlar
A/B/C'nin bütün kabul koşullarını kapatmıyor. A genel all-purpose
optimumluğu kanıtsız, B gerçek mobil performansı açık,
C üretime güvenli migration uygulanması/iki kullanıcı testi
açık, D PDF-PWA uçtan uca ek kanıt ve E gerçek saha kabulü açık.

Sıradaki adım: İzole C CI sonuçlarını incele, varsa hatayı düzelt;
güvenli PR/merge ve master CI sonuçlarını doğrula. Gerçek
Supabase migration uygulanması için production-readiness gate
sağlanmadıkça DDL kullanma. Sonra D/E kabul raporu ve gerçek cihaz
ile kullanıcı test blokerlerini netleştir.


## AA. 22 Kasım 2026 — PR #52 staging DB audit, gerçek motor çıktısı ile prova

**PR #52** merge
`931c500aa47a88710f728bfba728a02b49718677`:
https://github.com/Beytullah-dot/Beytullah-/pull/52
PR SHA `d95508e4c8a3ecec07417c9be5a695c7ff53db98`
üzerinde Optimizer #44969568811 SUCCESS ve Geometry/izole
gerçek PostgreSQL #44969568810 SUCCESS. Önceki SQL smoke
koşuları sözdizimi ve test rolü doğrudan tabloya erişemediği
için FAIL oldu; ikisi düzeltilip tekrar çalıştırıldı.
Master Optimizer #44969634416, Geometry #44969634439,
Pages #44969633957 3/3 SUCCESS.

Repo'ya eklenen migration
`20261122_000003_server_physical_cut_guard.sql`
**gerçek Supabase veritabanına hâlâ uygulanmadı**.
İzole PostgreSQL tetikleyici validasyonu, gerçek boyutlu
iki malzeme/pozitif kerf örneği ve üç sahte kesim/offcut
saldırısının tamamının transaction rollback'ini doğruladı.
Ayrı güvenlik kabul riski: istemci gerçek iş isteklerini
bulut kesim planıyla eşleştiren server-authoritative
orijinal parça kataloğu yok; trigger gelen `pieces` ile
`cuts` arasındaki fiziksel tutarlılığı kanıtlar, kullanıcının
asıl sipariş listesinin doğruluğunu tek başına kanıtlamaz.

**Sıradaki küçük PR/dal:**
`test/v1-c-real-engine-payload-compatibility`.
`tests/cloud-real-engine-payload.cjs`, dağıtımdaki
gerçek `docs/engine/cutting-engine.js` üzerinden pozitif
kerfli tam fiziksel kesim üretir, gerçek front-end
`planSnapshot` ve yeni offcut formatını sentetik SQL
RPC gövdesine çevirir. İzole PostgreSQL'de guard'lı
`beythaus_cloud_production_v2` çalıştırılıp yeni
kullanılabilir artık/stok versiyonu doğrulanır.
Üretim verisine yazma yok; PR açıldığı anda gerçek CI
henüz bekleniyor. Rollback rehearsal ve >1 kesim / karma
malzeme / gerçek kullanıcılarla UAT hâlâ açık.

**Hazır oluş %70 (+0 yüzde puan)**: geçerli alt çalışmalar
sürümün A–E paketlerini bütün kabul ölçütleriyle kapatmadı.
Bir sonraki görev bu PR'ın gerçek CI/merge/master kontrolleri,
ardından D PDF/Pages/önbellek varlık eşleşmesi ve güvenli
gerçek Supabase migration hazırlık kararı. Gerçek
iPhone Safari ve iki kullanıcılı saha doğrulaması
yapılmadı.


## AB. 22 Kasım 2026 — PR53 master tamamlandı, v1 kontrol noktası

**PR #53 birleştirildi:** https://github.com/Beytullah-dot/Beytullah-/pull/53
Merge `603c99d13793775ea846dd3e985d44f06a08c1a9`.
PR son SHA `35ac64907f4200941ab1bab7d8c2e73f7f60aecd`:
Optimizer #44969856406, Geometry/gerçek kesim motoru ile
sentetik PostgreSQL RPC #44969856403 **2/2 SUCCESS**.
İlk koşu SQL `DO` içinde psql değişkeni kullanımı hatasıyla
FAIL olmuştu; session setting ile düzeltildi. Gerçek
`cutting-engine.js` 1 parça için pozitif 2mm kerfli
tam kenarlı kesim üretti; Postgres trigger tarafından
kabul edildi, **1 tam levha tüketildi, 1 fiziki artık**
oluşturuldu, server fiyatı `gross=100`, `offcut=49`,
`material=51` olarak doğru türetildi. Bu test
**yalnızca sentetik izole PostgreSQL**, canlı stok değil.

Yeni master commit için gerçek CI:
Optimizer #44969954330, Geometry #44969954352,
Pages #44969953561 **3/3 SUCCESS**.
Son doğrulanmış master bu kayıt yazılırken
`603c99d13793775ea846dd3e985d44f06a08c1a9`.

**Nihai v1 checkpoint dosyası:**
`BEYTHAUS-CUT-V1-CHECKPOINT-20261122.md` (bu kayıt
aynı dokümantasyon PR dalında kaydediliyor).
A–E kabul tablosu, bütün PR49–53 merge SHA'ları ve CI
bağlantıları, Linux 16-vaka fiziksel başarı/UNKNOWN,
matematiksel optimumluk kapsamı, DB migrationın uygulanmadığı
canlı Supabase sınırı, kullanıcı cihaz/UAT blokajları
bu dosyada bulunur.

**Hazır oluş önceki %70, güncel %70, +0 puan**.
Ara geliştirmeler kayda değer olsa da **tam A–E kabul
paketleri kapanmış değil**. Fiziksel yapıcı fallback
geçerli `feasible-uncertified` üretir, general 2D exact
kanıtı değil. Dışarıda kalanlar: tam başlangıç planı
strict improvement/minimum auto, ilk ana-thread işi
mobilde donma riski, canlı Supabase'e fiziki guard geçişi,
gerçek iki hesaplı yarış testi, Pages gerçek byte hash,
gerçek iPhone Safari ve saha kesim doğrulaması.

**Sıradaki görev (yeni sohbet):** master/PR/CI/Pages
güncelliğini yeniden kontrol et, checkpoint/roadmap/AGENTS
dosyalarını oku. Önce C server fiziksel guard migrationını
izole çok parçalı/karma/pozitif kerf ve concurrency
regresyonlarında genişlet; canlı veritabanına RİSKLİ
migration uygulama. B ana-thread optimize işinin mobil
uzun görevini Worker'a güvenle taşı; D Pages/PDF/cache
E2E ve E UAT kabul listesini ilerlet. Kullanıcı verisine
test amacıyla dokunma; gerçek iPhone ve iki gerçek
kullanıcı UAT yapılmış gibi anlatma.


## AC. 22 Kasım 2026 — Motor kapasitesi ve %100 bitiş kriteri / kullanıcı stratejik kararı

Kullanıcı yeni geliştirme felsefesini kesinleştirdi: **sonsuz
exact-optimal arayışı yerine gerçekçi proje büyüklüğünde
kanıtlanabilir matematiksel kapasiteyi ve fiziksel yapıcı
performansı ölç; ticari kapsam yeterliyse motorun kendi
geliştirme aşamasını %100 tamamlanmış kabul et.**
Bundan büyük/karmaşık işlerde **fiziksel denetimli
sezgisel plan** ve dürüst "optimumluk kanıtlanmadı"
uyarısı yeterli olabilir. Mevcut iyi çözümü girdi adedi
yüksek diye geri çekme. Bu stratejinin somut kabul
sözleşmesi ayrı dosyada:
`BEYTHAUS-CUT-ENGINE-CAPACITY-ACCEPTANCE.md`.
Release roadmap'e 7. bölüm eklendi.

**Zorunlu düzeltme:** Evrensel tek X=parça sayısı
matematiksel garanti değildir. Aynı N içindeki parça
çeşitliliği, stok/kerf/trim, rotasyon/damar, fiziksel
kesim kısıtı ve hedef fonksiyonu karmaşıklığı belirler.
Önce N=`sum(qty)`, K=benzersiz parçalar ve stok sınıfı
matrisiyle **gerçek optimalite sertifika kapsamını**
test et, örneklerde fiziksel tam çözüm, sertifikalı
optimum, gap (varsa), UNKNOWN, süre/RSS ve mobil
ölçümleri ayrı say. Sonra her ticari sınıf için
ölçülmüş yeterlilik eşiğini (varsa X) ve riskli
sınıflarda kaynak bütçeli sezgisel fallback'i ilan et.
**Küçük iş de kanıtsız, büyük tekrarlı iş de exact
olabilir.** Kanıt olan herhangi büyüklükte kullanıcıya
`OPTIMAL` göster, diğerlerinde fiziksel uygulanabilir
planı `feasible-uncertified` olarak sun.

**Yeni sohbetin ilk işi:** Motor için önceki handoff
giyotin alt sınıf exact oranlarını ve mevcut Worker'ın
14/16 fiziksel plan örneklemini **karıştırmadan**
bağımsız optimalite kapsam matrisi planla/çalıştır.
Sırf X büyük olsun diye yeni exact algoritma
yığma. Hedeflenen ticari kullanılabilirlik ve
performans ölçüldüğünde motor kapanışını öner;
kapanmış kabulünü test kanıtından önce yapma.
Sonra C/D/E üretim risklerini bitir.

**Ayrı durum:** Motor %100 = yalnız teknik motor
geliştirme kapsamı tamamlandı; **ürün v1 %100**
olamaz, Supabase canlı sunucu fiziksel guard henüz
uygulanmadı, iki kullanıcı gerçek yarış testi,
iPhone Safari, PDF/Pages/mobile/önbellek UAT açık.
Canlı stok/SQL/Auth verisini test için değiştirme.
Ürün hazır oluş önceki %70, güncel %70, +0 puan.
Bu belge değişikliği yeni bir optimumluk veya performans
kanıtı değildir.

Bu kayıt hazırlanırken master başlangıç doğrulama SHA:
`5263b7f99c773a5e47381318222a1e8986014d54`.
Yeni PR merge sonrası güncel SHA'yı yeniden doğrula;
buradaki değeri asla değişmez varsayma.


## AD. 22 Kasım 2026 — 105 vaka ile motor optimumluk kapasitesi, N/K/amaç matrisi

**Araştırma PR #56:** https://github.com/Beytullah-dot/Beytullah-/pull/56
(nihai merge / master SHA için güncel GitHub durumunu tekrar doğrula).
Test: `tests/motor-capacity-matrix.cjs`; ölçüm raporu:
`tests/MOTOR-CAPACITY-MATRIX-RESULTS.md`; CI JSON artifact:
`motor-capacity-matrix.json`. PR test kodu SHA
`3bd91a89d83156d216a26461195c742ed1e339f8`.
CI gerçek Optimizer [#44972616223](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616223),
Geometry [#44972616247](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616247),
Uncapped Scale [#44972616222](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44972616222):
**3/3 SUCCESS**. Dokümantasyon commit'i sonrasındaki yeni PR/master
CI ve Pages ayrıca doğrulanmalı.

**Deney tasarımı:** N=10/25/50/100/200/500/1000; 5 aile:
tek genişlik full-span K=1, dört farklı bant yüksekliği K=4/
heterojen stok, sekiz enli iç içe 3 aşamalı sınıf K=8, K=N
farklı ölçü, iki malzemeli panel/masif ve yön/rotasyon K=4.
Toplam 35 sentetik geometri/stoğa göre 3 ayrı hedef (levha adedi,
brüt alan, maliyet) = **105 hedef-vaka**. Pozitif kerf 2 mm,
trim 1 mm, stok/adet, fiyat, malzeme, yön korundu. Bu
**rastgele seçilmiş 105 ticari proje değildir**; yapıcı/saha
kapsamı çıkarılamaz. Her tam planda uygulama audit'i ve
bağımsız `optimization-oracle.cjs` tam kenar audit'i zorunlu.
Araştırma özel-sınıf exact sonuçları KÜRESEL 2D optimum
olarak sayılmadı. Küresel kanıt yalnız uygulamanın gerçek
`optimality-certificate.js` hedefe özgü LB=UB sertifikasıyla.

**CI Linux Node gerçek ölçüm:** Ana üretim kesim motoru
`engine.optimize(..., false, false, objective)`
**105/105 tam ve çift audit olumlu**; 0/105 izole baseline
zaman aşımı. Canlı sınırlı yapıcı Worker **69/105**
tam ve çift audit olumlu; 36/105 özel Worker UNKNOWN
(15 kaynak/21 `unknown-class`), bu **ana motorun**
başarısızlığı veya işin imkânsızlığı **DEĞİLDİR**.
İki üretim yolu birlikte **105/105 tam**.
Seçilen hedef için KÜRESEL kanıt **60/105**:
levha adedi 23/35; brüt alan 19/35; maliyet 18/35.
**45/105** tam ama küresel optimumluk kanıtsız.
Special full-span/üç aşamalı araştırma sütununda
18 class-only exact; ayrıca 3 iki aşamalı class-only;
genel optimuma EKLENMEZ.

**Sınıf kırılımı (global optimum / 21 hedef-vaka):**
fullspan 21/21; dört farklı bant + dört heterojen stok
4/21; sekiz en + dört stok 7/21; K=N 7/21;
panel/masif + zorunlu döndürme K=4, sabit malzeme
ataması altında 21/21. Son özel ailede yapıcı Worker
21/21 `unknown-class` olsa da ana engine hepsini
çözdü. **Bu sertifikalar seçilen sabit malzeme ataması
içindir, global karma otomatik atamayı kanıtlamaz.**

**N=1000/K=1 özel tanık:** tam fiziksel 334 levha,
minimum brüt stok alanı 1.366.728 mm², sentetik kayıtlı
maliyet 30.060; üç ayrı amaçta da kanıtlı global
optimum. Bu **evrensel 1000 parça kapasite garantisi
değildir**. K=4 ve heterojen stok N=1000'de tam
plan vardır ancak üç hedefin hiçbirinde kesin optimum
kanıtlanmamıştır. K=N=1000 örneğinde ana engine tam
fiziksel plan, yapıcı Worker UNKNOWN, global kanıt yok.
Bazı zayıf LB gap'leri %60 üzerindedir; gap kanıtlanmış
kazanç tahmini değildir.

**Performans:** baseline ilk senkron hesap median
~60,1 ms / p95 ~357,1 ms, max ~520,4 ms;
Worker median ~15,8 / p95 ~325,5 ms. Gözlenen
maksimum izole Node Linux süreç RSS ~136,3 MiB
(Node çalışma zamanı + bağımsız auditor dâhil).
**Gerçek iPhone Safari değil, mobil ana-thread donma
riski açık.** Bu test kaynak bütçeleri kullanıcı
girdi tavanı DEĞİLDİR.

**Motor gelişim kabulü:** Henüz **%100 DEĞİL**.
Bunlar seçilmiş ve çoğunlukla fiziksel mümkün/sentetik
stoklu aileler; daha zor heterojen / kıt stok / rotasyon /
otomatik malzeme ataması / gerçek müşteri dağılımları,
sezgisel kalite, kanıtlı gap ve mobil perf için
ek bağımsız regresyon ve gerçek UAT gerekiyor.
Ürün v1 hazır oluş **%70 (+0 puan)** korundu.
Supabase migration `20261122_000003_server_physical_cut_guard.sql`
canlıya uygulanmadı, Auth/gerçek stok/üretim kayıtlarına
DOKUNULMADI.

**Sıradaki güvenli teknik adım:** Önce PR #56 son head
Optimizer, Geometry, Uncapped CI ve master merge/Pages
doğrula. Sonra bu matrisin üretime benzer, fiziksel
olarak kasıtlı zor/kıt stoklu ve K yüksek ailelerini
bağımsız oracle ile genişlet; sezgisel plan kalitesini
farklı yöntemler/kanıtlı optimal alt-yukarı sınırıyla
ölç. Ticari kabul eşikleri kanıtlanmadan motor %100
ilan etme. Ardından B ana thread Worker migration,
C izole sunucu fiziksel guard ve atomik stok
concurrency provası, D PDF/Pages/PWA cache,
E gerçek iPhone + iki gerçek kullanıcı UAT.
