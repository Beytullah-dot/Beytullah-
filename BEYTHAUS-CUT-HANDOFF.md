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
- Parça: boy, en, adet, opsiyonel otomatik etiket, kalınlık ve damar yönü;
  stok: boy, en, adet, malzeme, kalınlık, damar yönü, fiyat ve raf/göz.
- **Masifte kalınlık makinesi hesabı veya stoktan kalınlık düşürme yok.**
  Masif parça kalınlığı zorunlu ve stok kalınlığıyla eşleşmeli.
- Hem panel hem masif, hem stok hem parça **aynı üç durumlu damar yönü
  düğmesine** sahip:
  - **Boş:** damar serbest.
  - **`=`:** damar en (genişlik) boyunca.
  - **`Ⅱ`:** damar boy (uzunluk) boyunca.
  Her tıklama sıradaki duruma geçer; seçim kendi durumunda bırakılır.
  90° döndürme, kare parçalar dâhil, stok-parça damar uyumunu bozmaz.
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
- **En ekonomik plan** ve **minimum stok adedi** alternatifi sunulur.
  Ekonomik değerlendirmede gerçek stok fiyatları kullanılır; eşitliklerde
  kullanıcıya yarar sağlayan artık alan/ölçü kalitesi gözetilir.
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

## E. Son tamamlanan adım / sıradaki adım

**Son tamamlanan:** PR #1 `master` dalına birleştirildi;
GitHub Pages dağıtımı ve iki CI iş akışı başarılı.

**Sıradaki adım:** Canlı iPhone/Safari'de şu sırayla **test amaçlı**
kullanıcı kabulü yap:
1. Sayfanın yenilenmesi ve menüler: Kesim Planı, Stok Envanteri,
   Maliyet Kayıtları, Hesap Ayarları.
2. Damar düğmesi boş → `=` → `Ⅱ`; parça/stok mat. eşleştirme ve
   iki plan alternatifini kontrol et.
3. Ayrı test atölyesi veya açıkça işaretli örnek tam stokla, tek cihaz
   bulut kayıt ve sürüm denemesi.
4. İkinci kullanıcı/cihaz ile aynı stoğa çakışan işlem ve reddin
   ardından yeniden eşitleme.
5. Örnek fiziksel üretim tamamlamada tam stok düşümü, artık değerlemesi,
   maliyet ve üretim PDF'sini doğrula.
6. Sorunları GitHub'a düzeltme olarak gönder; testleri çalıştır,
   `master` ve Pages durumunu yeniden doğrula.

**Öncelik:** Üretim güvenliği ve veri bütünlüğü > kesin olmayan
optimumluk iddiası > yeni özellik ekleme.

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
