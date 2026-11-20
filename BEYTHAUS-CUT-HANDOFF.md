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

**Son tamamlanan (20 Kasım):** PR #5 sonrasındaki `78afc8e` temelinden
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

**Son açık kullanıcı hedefi:** Önce matematiksel
kesim motorunu tamamlama/mühürleme; kullanıcıya
**keyfî bir maksimum parça veya levha sayısı
koyma**. 25 levha sadece gerçek atölye proje
ölçeğinin örneği. Gerekirse kaynakla sınırlı
arama UNKNOWN kalabilir ama fiziksel plan varsa
kullanılabilir kalmalı.

**Sıradaki teknik adım:**

1. Pozitif testere payı, kenar payı, farklı levha ölçüleri ve parça yönleri
   birlikte kullanılan işlerde geçerli plan ve optimumluk açığını ölç.
2. Eski formda normalize() toplam 1.500 parça sınırı içeriyor. Keyfî
   sınır koymama ürün kararıyla uyuşmayan bu giriş yolunu, toplu adetleri
   güvenle işleyebilen temsil ve gerçek telefon performansıyla ele al.
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
