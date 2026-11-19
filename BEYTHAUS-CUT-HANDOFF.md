# Beythaus Cut — Proje devamlılık kaydı

> **Bu belge yeni sohbetler için tek başlangıç noktasıdır.**
> Son güncelleme: **20 Kasım 2026 (Türkiye)**.
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
  **Bu hedef seçimi henüz arayüze ve esas arama stratejisine uygulanmadı.**
  Mevcut V2 hâlen ekonomik ve minimum-stok alternatiflerini barındırır.
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

## D. Güncel teknik durum — 20 Kasım 2026

**Doğrulanmış:**
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

## E. Son tamamlanan adım / sıradaki adım

**Son tamamlanan (20 Kasım):** PR #3 mevcut yayımlanmış Beythaus Cut
uygulamasına birleştirildi. Motorun parça yönü yalnız parçaya taşındı,
20–25 levhalık tekrarlı büyük planlarda kanıt üreten iki yeni alt sınır
katmanı eklendi. 400 parça / 25 levha / 3 mm testere payı,
fiziksel kesim denetimi ve **minimum 25 levha optimumluk kanıtı** geçti.
Aynı merge SHA'da geometri, optimizer, WebKit CI ve Pages başarıyla tamamlandı.

**Kullanıcının son önceliği:** Diğer özellikleri ertele; **kesim
optimizasyon motorunu doğruluk/ölçek/kanıt bakımından tamamlayıp
mühürleme kriterleri karşılanana kadar** bu konuyu öncele.
`tests/MOTOR-PROOF-STATUS.md` içindeki eksikler önem sırasıyla:

1. 20–25 levhalık **farklı ölçülü** parçalar, farklı fiyat/ebattaki stoklar,
   panel/masif ve karma otomatik atama için resmî benchmark/gerçek
   atölye fixture seti oluştur. Başarı oranını kanıtlı/kanıtsız,
   optimumluk aralığı ve süre olarak raporla; 400 aynı parça
   örneğinden genelleme yapma.
2. **Hedefi hesaplamadan önce** sor: minimum kayıtlı stok maliyeti veya
   minimum brüt fire. Hedef seçimi gerçek arama planına uygulansın;
   seçilmemiş hedef motoru gereksiz yere yormasın. Kullanılabilir
   artık ayrıca raporlansın, ispatlanmış fire ile karıştırılmasın.
3. Heterojen giyotin desenleri için **kesin branch-and-bound,
   column generation / MILP / CP-SAT** yöntemlerinden ölçülerek en
   uygununu uygula; her çalışmada fiziksel kesim denetimi ve
   `OPTIMAL / FEASIBLE / UNKNOWN / INFEASIBLE` ayrımı korunsun.
4. Sınır aşımı / sayısal tolerans / stok alternatifi / çoklu malzeme
   yanlış ispatına karşı bağımsız regresyon ve alan verisiyle kontrol.
   **Kanıt yoksa optimum iddia etme.**
5. Tüm matematik ve performans kabul koşulları tamamlanınca ayrı
   `MOTOR-SEALED` release/tag aç; sadece başarılı basit fixture'larla
   veya UI çıktısıyla mühürleme yapma.

**Bekleyen ama son isteğe göre ikinci sırada:** Gerçek iPhone/Safari,
iki gerçek kullanıcıyla TEST stoklu Supabase UAT; çalışmadan gerçek
fiziksel stok üretimini tüketme. `tests/SAFARI-UAT-CHECKLIST.md`.

**Öncelik:** Matematiksel doğruluk ve fiziksel kesim güvenliği >
genel optimumluk kanıtı > motor performansı > diğer arayüz/yan özellikler.

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
