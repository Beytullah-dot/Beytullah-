# Beythaus Cut — Devamlılık / teknik handoff

> **Tek giriş belgesi.** Yeni bir sohbet veya geliştirme oturumunda önce bu dosyayı ve `AGENTS.md`'yi oku. Bu belge **geçmiş PR günlüğü değildir**; güncel ürün sözleşmesi, doğrulanmış teknik durum, açık riskler ve sonraki adımdır.
>
> **Durum kesiti:** 24 Kasım 2026, Türkiye. Son doğrulanmış **motor kodu**: `27d0513c155d87128e18b8718aeb034aea427153` (PR #58 sonrası). Belgeyi güncelleyen commit bu SHA'dan daha yeni olabilir. **Her seferinde gerçek `master` HEAD, PR, CI ve Pages durumunu yeniden doğrula. Bu motor çalışmasında gerçek Supabase stok/Auth/üretim verisine erişme.**
>
> **Depo:** https://github.com/Beytullah-dot/Beytullah- · **Canlı uygulama:** https://beytullah-dot.github.io/Beytullah-/ · **Yayın:** `master` → `docs/` · **Supabase:** `pdqgpupdqgrxejvjpdzs`.

## 1. Projenin amacı ve kabulün anlamı

Beythaus Cut; panel ve masif ahşap için **iki boyutlu, fiziksel giyotin kesim** optimizasyonu, ortak stok/raf/QR envanteri, malzeme maliyet kaydı, kesim PDF'si ve tamamlanmış üretim arşivi sunan mevcut web/PWA uygulamasıdır. Aynı projeyi geliştir; **bağımsız demo/proje veya yeni yayın adresi oluşturma**.

- 23 Kasım kullanıcı kararıyla zorunlu kapı **bağımsız fiziksel geçerlilik**, ana hedef **süre bütçesi içinde güvenli alt sınıra göre düşük fark**, küçük gruplarda tamamlanan kesin çözüm ise **hedefe özgü optimum etiketi** olur. Öncelik levha sayısı veya maliyet, eşitlikte tek parça halinde en büyük kullanılabilir artıktır.
- Kullanıcı kararı: ticari iş ailelerinde güvenilir kabul eşiği **ölçülerek** sağlanırsa motor geliştirmesi %100 tamamlanabilir. Sonsuz exact araştırma zorunlu değildir. Bunun için `BEYTHAUS-CUT-ENGINE-CAPACITY-ACCEPTANCE.md` bağlayıcı kabul çerçevesidir.
- **Parça sayısına keyfî kullanıcı giriş tavanı koyma.** `N=sum(qty)` fiziksel parça adedi; `K` ölçü/malzeme/yön/rotasyon çeşitliliğidir. Hız ve kanıtlanabilirlik N, K, stok sınıfları, kısıtlar, amaç ve kaynak bütçesine bağlıdır. Ölçülmüş belirli sınıf eşiği evrensel garanti değildir.
- **Motor %100 kabul edilmedi.** **Ürün v1 mühendislik hazır oluş tahmini ~%70, değişim +0 yüzde puan.** Bu öznel ürün durumu bir test başarı oranı değildir; gerçek kabul kapıları kapanmadan artırma.
- Motor geliştirme tamamlanması, ürün v1 kabulünden **ayrı** bir karar. Fiziksel yapıcı başarı, seçili hedefte küresel kanıt, ürün hazır oluşu ve mobil performansı birbirine karıştırma.

## 2. Değişmez ürün kararları

### Malzeme, parça, stok ve yön

- Panel ve masif **aynı 2D motoru** kullanır. Panelde dekor/renk, masifte ağaç türü ayrışabilir. Parça boy/en/adet/kalınlık/etiket/yön/döndürme izni ve stok boy/en/adet/malzeme/kalınlık/fiyat/raf-göz desteklenir.
- **Masifte kalınlık makinesi, planyalama veya kalınlık eksiltme hesabı yok.** Masif parça/stoğun kalınlık uygunluğu korunur.
- **Yön düğmesi yalnız parçada:** boş = serbest; `=` = parçanın boy ekseni stokun **en** eksenine paralel (90°); `Ⅱ` = stokun **boy** eksenine paralel (0°). Stokta yeni bir yön düğmesi yoktur. Eski stok `grain` verisi korunabilir fakat yeni kesim kısıtı yapılmaz. Kare parçada da yön ve dönüş bilgisi kaybolmaz.
- Döndürme izni, malzeme, kalınlık, kerf, kenar payı (trim), stok sayısı ve gerçek kesim geometrisi birlikte uygulanır.
- **Stok modları:** tek tip, karma otomatik ve karma özel. Karma otomatikte kullanıcı malzeme grubu **ve tekil stok** düzeyinde dahil/hariç seçer; yasaklanmış stok sessizce kullanılamaz. Karma özelde eşlemeyi kullanıcı belirler.
- Projeler aynı **atölye envanterini** paylaşır; proje başına ayrı fiziksel stok yaratılıp iki kez tüketilemez. Kullanılabilir artık parçalar tekrar stok adayıdır.

### Optimizasyonun fiziksel ve matematiksel sözleşmesi

- **Üretim planı yalnız tam kenarlı giyotin**: her kesim, o andaki aktif alt levhanın bir kenarından karşı kenarına uzanır. Sırf çakışmasız serbest dikdörtgen yerleşimi üretilebilir plan değildir.
- Mevcut arayüz brüt alan/fire veya kayıtlı maliyet önceliği seçtirir. Yeni ürün sözleşmesi levha sayısı veya maliyet önceliği ve eşitlikte en büyük tek kullanılabilir artığı tanımlar. Arayüz ve ortak aday havuzu geçişi Aşama 4–5 kapsamında bekler. `count`, `area` ve `cost` ayrı ölçülür.
- Üretime çıkarılan her **tam** plan gerçek stok/kerf/trim/yön ve tam kesim ağacının fiziksel denetiminden geçmelidir. Eksik/kısmi sonuç üretim talimatı olamaz.
- Hedeflenen tam-plan ürün dili **“Kanıtlı optimum” / “Alt sınırın %X üstünde”** olur. Başlangıçta en fazla 8 parçalı küçük grupta tamamlanan genel fiziksel exact çözüm optimum etiketi sağlayabilir. Tam plan yoksa veya maliyet fiyatı eksikse açıklayıcı durum mesajı gerekir. UNKNOWN teknik kayıtta kalır. Bu dilin üretime uygulanması Aşama 5 kapsamındadır. Fark `(U-L)/L` paydasıyla hesaplanır.
- İki/üç aşamalı veya full-span **özel sınıf** exact ispatlarını genel 2D giyotin küresel optimumluğuna yükseltme. Bağımsız geometrik oracle bir optimumluk ispatı değil, fiziksel uygunluk denetimidir. Bilinmeyen fiyat **0 TL değildir**; uygun maliyet karşılaştırması/kanıtı yoksa `unknown-price` göster.
- **Kaynak bütçesi** (zaman, durum, yerel arama derinliği, bellek) kullanıcı için keyfî toplam parça giriş limiti değildir. Kaynak tükendiğinde geçerli mevcut planı tut, kanıtın yokluğunu doğru belirt.

### Envanter, maliyet, arşiv ve arayüz

- Panel fiyatı **₺/adet**, masif **₺/m³**, fiyat **stok satırına özel**. Sadece kayıtlı malzeme fiyatı ve isteğe bağlı açıklamalı ek maliyet; **satış fiyatı, kâr ve marj hesabı yok**. Artık parçanın kayıt değeri ile tüketilen malzeme maliyeti ayrılır.
- **Hesaplama veya plan onayı stok düşmez.** Yalnız kullanıcı tarafından tamamlandığı **açıkça bildirilen fiziksel üretim** atomik envanter tüketimi yapar. Kullanılan tam stok azalır, tekil artık tüketilir, yeni artık kimliği/malzeme/ölçü/raf/göz/kaynak/kayıt değeriyle oluşur. Tekrar tamamlamada `operation_id` idempotensi korunur.
- Üretim/kesim anının değişmez veri fotoğrafı, stok hareketi ve maliyet arşivlenir; PDF arşiv fotoğrafından yeniden üretilebilir. PDF üzerinde ölçü, kesim sırası, kerf, parçalar ve artıklar yer almalıdır.
- Navigasyon: **Kesim Planı**, **Stok Envanteri**, **Maliyet Kayıtları**, **Hesap Ayarları**; Proje Ayarları Kesim Planı içinde. Projelerim doğrudan listeyi açar; arama isteğe bağlıdır. Proje kopyalama/isimlendirme ve dosya/iCloud Drive yedeği korunur.
- Yerel ve bulut envanterini **sessizce birleştirme veya birbirinin üstüne yazma**. Yerelden buluta aktarım açık kullanıcı onayı gerektirir; buluta geçince yerel kayıtlar silinmez. Sunucuda ölçüler mm; görüntü birimi cm/mm olabilir.

## 3. Mevcut mimari: nerede çalışılacak?

| Katman | Kaynak |
|---|---|
| Ana uygulama ve ilk hesap akışı | `docs/index.html`, `docs/mobile-ux.js` |
| Kesim motoru | `docs/engine/cutting-engine.js` |
| Kıt stok / şekil tabanlı giyotin kurtarma | `docs/engine/guillotine-block-repair.js` |
| Şerit/çok aşamalı fiziki desenler | `docs/engine/mixed-strip-patterns.js`, `guillotine-pattern-cover.js`, `two-stage-strip-exact.js`, `three-stage-nested-exact.js` |
| Malzeme seçimi / yön politikası | `docs/engine/material-policy.js`, `material-allocator.js` |
| Seçili amaca özgü alt sınır ve optimumluk | `docs/engine/optimality-certificate.js`, `docs/optimality-worker.js` |
| Üretim fiziksel doğrulaması / arşiv | `docs/engine/production-audit.js`, `production-archive.js` |
| Arka plan aramaları | `docs/constructive-worker.js`, `docs/optimization-worker.js`, `docs/guillotine-exact.js`, `docs/economic-exact.js` |
| Bulut | `docs/cloud-inventory.js`, `supabase/migrations/` |
| Bağımsız testler / CI | `tests/optimization-oracle.cjs`, `tests/engine-harness.cjs`, `tests/`, `.github/workflows/` |
| Ayrıntılı teknik mimari / bulut davranışı | `docs/ENGINE-ARCHITECTURE.md`, `docs/BULUT-SENKRONIZASYON.md` |

**Açık teknik borç:** Yapıcı/optimalite Worker'ları mevcut olsa da arayüzün **ilk senkron `optimize` işi ana JS thread'inde** çalışıyor. “Worker var” demek ilk hesap mobilde bloklamıyor demek değildir. İlk hesap akışını güvenli biçimde Worker'a taşırken eski sonuçların reddi, iptal, timeout, input/amaç sürüm uyumu, fiziksel audit ve regresyonları koru.

## 4. Son doğrulanmış motor kanıtı — PR #58

**Kod birleştirme:** [PR #58](https://github.com/Beytullah-dot/Beytullah-/pull/58), motoru içeren doğrulanmış `master` kod SHA `27d0513c155d87128e18b8718aeb034aea427153`. Ayrıntı ve çalışma sınırlamaları: `MOTOR-TIGHT-STOCK-SHAPE-REPAIR-RESULTS.md`.

- Yeni `stockShapeCover`, stok boyutları/adetleri ve parça şekil çokluklarından iç içe **gerçek tam kenarlı** kesim deseni kurar; somut parça kimliklerini desen sonrasında yerleştirir. Birleştirilmiş aday **tüm parçaları** kapsıyorsa ve denetimden geçiyorsa kullanılır.
- Sparse cardinality aramasında ara parça-adedi sınıfı boş diye ilerlemeyi kesen genel hata düzeltildi (örn. iki üç-yapraklı alt ağaçtan altı-yapraklı ağaç).
- **PR #57'den kalan aynı, bilerek zorlaştırılmış 30 fiziksel mümkün sentetik hedef-vaka:** önce iyileştirilmiş UI **15/30**, yeni UI **30/30 tam**. N=10/25/50/100/200 için yeni sonuç sırasıyla **6/6, 6/6, 6/6, 6/6, 6/6**.
- Bu **30/30** tam planda ilgili üç hedefe dağılan **10 count + 10 area + 10 cost = 30 hedefe özgü küresel LB=UB sertifikası**, hem üretim fiziki auditi hem bağımsız kesim ağacı oracle denetimi geçti. **Oracle ikinci bağımsız matematik optimumluk kanıtı değildir.**
- Aynı kampanyanın **30 alan-yetersiz negatif** örneğinde yanlış “tam” **0/30**. Fiziksel olarak farklı **12 mümkün holdout** hedef-vakada yeni UI **12/12 tam/çift audit**, unenhanced baseline **3/12**, 12 boş-stok negatifte yanlış tam **0**; holdout için ayrıca küresel optimumluk iddiası yok.
- İzole Linux Node 22'de 60 hedef-vaka ilk iyileştirilmiş hesap: **p50 122,1 ms**, **p95 704,2 ms**, **maksimum 1.387,2 ms**, süreç peak RSS **137,4 MiB** (Node/audit dahil). **Gerçek iPhone/Safari veya ticari SLA ölçümü değildir.**
- Daha geniş **105 sentetik hedef-vaka** kapasite araştırmasında ana üretim motoru **105/105 fiziksel tam/çift audit**, seçili amaca özgü **60/105 küresel sertifikalı**; araştırma yapıcı Worker **69/105 tam**. Seçilmiş ailelerdir, ticari rastgele örneklem değil. Bkz. `tests/MOTOR-CAPACITY-MATRIX-RESULTS.md` ve `tests/motor-capacity-matrix.cjs`.
- Eski 16 örnekli canlı Worker araştırmasında **14 tam/2 UNKNOWN** vardı; bu ayrı kampanyayı 105 veya 60 vakalık matrislerle birleştirip başarı yüzdesi üretme.
- **Sonuç:** seçilmiş sentetik örneklerde güçlü iyileşme; bütün müşteri işleri için `N≤200`, genel optimumluk, asla UNKNOWN üretmeme veya motor %100 kabul garantisi **YOK**.

### PR #58 sonrası gerçek `master` doğrulaması

22 Kasım 2026'da **aynı SHA `27d0513…`** için:
- [Optimizer Verification — SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45047021749)
- [Geometry Tests — SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45047021957)
- [Automated iPhone WebKit smoke — SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45047021691) — **gerçek cihaz testi değil**
- [Pages build/deployment — SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/45047021119)

**Bu linkler tarihli kanıttır; başka HEAD'in CI sonucu yerine geçmez.** Bu dosyanın dokümantasyon PR'ı sonrasında yeni `master` CI/Pages ayrıca kontrol edilmelidir.

## 5. Supabase — canlı durum ve güvenlik sınırı

**22 Kasım 2026 salt-okunur yeniden doğrulama:** proje `pdqgpupdqgrxejvjpdzs` **ACTIVE_HEALTHY**; veritabanı migration geçmişinde **yalnız** `20261118212836 beythaus_cloud_inventory_initial` ve `20261119202121 full_stock_atomic_production_v2` var.

- İlk iki migration ile ortak bulut stok, sürüm kontrollü kayıt ve `beythaus_cloud_production_v2` üzerinden atomik üretim işlemi bulunur. Çok kiracılı yetki, RPC üyelik denetimi, RLS/`SECURITY DEFINER` ve eşzamanlı stok sürümü sınırları kritik.
- Repodaki `supabase/migrations/20261122_000003_server_physical_cut_guard.sql` **CANLI SUPABASE'E UYGULANMADI**. İzole PostgreSQL testleri bu guard'ın bazı gerçek motor payload'larını kabul ettiğini ve sahte çıktıları/rollback'i reddettiğini gösterir; bu **genel üretim güvenlik kabulü değildir**.
- Mevcut canlı server üretim yolunun tam kesim ağacını bağımsız, yetkili fiziksel tanık üzerinden doğruladığı varsayılamaz; istemciden gelen üretim kesim verisi güvenilmeyen girdidir. Tam stok/üretim/maliyet bütünlüğü için **sunucu otoriteli fiziksel denetim ve atomik concurrency** kabulü açık.
- Gerçek kullanıcıların **stok adedi, artık kimliği, Auth, finans, arşiv, üretim kayıtları** üzerinde test için yazma/silme yok. Migration'ı, geriye dönük veri değişimini veya geniş yetkiyi güvenli hazırlık ve gerekli açık onay olmadan canlıda çalıştırma. Service-role anahtarı, parola veya gerçek kişi verisi GitHub'da bulunmamalı.

## 6. Güncel çalışma sırası ve açık kabul kapıları

23 Kasım kullanıcı talimatı önceki Worker önceliğinin yerini aldı. Her aşama sonunda ölçüm ve riskleri raporlayıp dur. Yeni aşama için bulgu/öneri onayı al.

0. **Ticari ölçüm** — Onaylanan zarf 100–260 parça, 25–90 tip, 3–7 grup. 20 geliştirme ve 40 kabul tohumu. Yeni kaynak `tests/commercial-stage0/`, sonuç `tests/MOTOR-APARTMENT-STAGE0-RESULTS.md`. İlk eşikler onaylandı. Üreteç, bağımsız fiziksel tanık, güvenli alan örtüsü alt sınırı ve süre bütçeli referans araması test katmanındadır. Ölçülen örneklem 129–225 parça, 28–65 tip, 3–5 gruptur. Uç değerler ve gerçek atölye dağılımı açıktır.
   **Aşama 0 ölçüm sonucu** — 40 kabul projesinde iki hedefte de 40/40 tam plan. Bilinen en iyi levha sayısıyla eşit 37/40; kalan üçünde 1 fazla levha. Bilinen en iyi maliyete p95 uzaklık %5,88. Güvenli alt sınır farkı p95 levhada %21,43, maliyette %27,64. İlk geçerli plan p95 yaklaşık 0,42 saniye; kısa koşu en yüksek RSS 71,3 MiB, uzun koşu 225,2 MiB. Geçerlilik, süre ve bellek kapıları örneklemde geçti. İki kalite kapısı iki hedefte de kaldı. 300 kaydedilmiş plan tekrar bağımsız denetlendi. Yanlış optimum etiketi bu deneyde ölçülmedi. Gerçek iPhone ve zarf uçları açık. Aşama 1 kullanıcı tarafından 24 Kasımda onaylandı. Bağımsız doğrulayıcı ilk ayrı commit faf2a96 olarak hazırlandı. Motor ve operatör ayarı geliştirme dalında kodlandı; kapasite regresyonunun 60 s sınırı ve yönlü büyük oracle kapsamı nedeniyle Aşama 1 durduruldu, kabul/yayın yok. Ayrıntı: tests/stage1/RESULTS.md.
1. **B1 dar artık** — Parça yanındaki `0 < artık < kerf` son kesim davranışını yerleşim/audit/exact katmanlarında tutarlı ele al. Kullanıcının bağımsız paketindeki `relaxed` oracle bu fiziğe izin verir, kesim tekrarı ise hâlâ taşmayı reddeder. Bağımsız doğrulayıcı da ayrı testlerle güncellenmelidir. Eski alt sınırların tümünü yeni fiziksel modelde yeniden değerlendir.
2. **B2/B5 az tip, çok kopya** — Çarpanlı DP/Pareto veya güçlü sezgisel ile partLimit ve gereksiz düğüm tüketimini ele al.
3. **B3 küçük iş kurtarma** — En fazla 8 parçalı tam alt küme DP son fallback.
4. **B4 aday havuzu** — Bütün hedeflerin adaylarını seçili hedefe göre değerlendir.
5. **Dil/Worker sadeleştirme** — Kanıt kapsamı, kullanıcı dili, ana optimize yükünün Worker'a taşınması. İptal, geç sonuç, değişen proje/hedef ve bellek regresyonlarını doğrula.

**Aşama 0 onayı Aşama 1 uygulamasına geçiş onayı değildir.** Üretim motoru kodu hâlâ `27d0513…` sürümüdür. `tests/commercial-stage0/results/campaign.json.gz` sentetik girdileri, fiziksel tanıkları ve seçilen planları içerir. B1 geliştirme dalında kısmen uygulandı; tamamlanmış/yayınlanmış sayılmaz. B2–B6 başlamadı. Aşama 0 koşucusunun boş bounds aktarımı bulundu; düzeltilmiş önce/sonra ölçümü Stage1 raporundadır.

Motor aşamalarının ardından ürün v1 için izole sunucu fiziksel guard ve atomik stok yarışları, PDF/üretim/artık tutarlılığı, gerçek iPhone Safari ve iki gerçek kullanıcı kabulü sürer. Gerçek Supabase stok/Auth/üretim verileri bu çalışma kapsamı dışındadır. Canlı migration için önceki güvenlik sınırları geçerlidir.

Plan ve paket kabul ölçütleri `BEYTHAUS-CUT-RELEASE-ROADMAP.md` ve `BEYTHAUS-CUT-V1-CHECKPOINT-20261122.md` içindedir. Yeni kullanıcı kararları çelişen eski sıralamadan önceliklidir.

## 7. Yeni sohbette çalıştırılacak kısa kontrol listesi

1. GitHub'da **son `master` HEAD**, açık PR, workflow/CI ve **gerçek Pages deployment** durumunu oku; eski SHA'yı bugünkü gerçek kabul etme.
2. `AGENTS.md`, bu handoff, kapasite kabul sözleşmesi ve roadmap'i oku; ilgili motor/Worker/SQL/test **gerçek kaynak dosyalarını** kontrol et. İkinci el eski handoff notlarını kodun yerine geçirme.
3. Supabase işi varsa **proje ve migration geçmişini salt-okunur** kontrol et, canlı stok/kimlik/finansal/üretim verisini gereksiz okumadan ve **değiştirmeden** ilerle.
4. Kapsamı açık küçük PR aç; kodun kendisini ve **bağımsız fiziksel oracle** testlerini kullan. Test/kapsam sonuçlarının **hangi commit, iş ailesi, amaç ve makine** için geçerli olduğunu kaydet.
5. CI geçmeden veya bilinçli açıklanmış istisna olmadan başarılı ilan etme. Merge sonrası **yeni master** CI ve Pages'i yeniden doğrula. Gerçek iPhone'u WebKit otomasyonu, ticari SLA'yı Node ölçümü sayma.
6. İş bitiminde **yalnız bu belgenin durum kesiti, son kanıt, açık risk ve sıradaki görev** alanlarını güncelle; yeni harfli tarihçe, uzun terminal çıktısı, tekrar eden CI link yığınları ekleme. Ayrıntılı ölçüm için `tests/*-RESULTS.md` veya tekil rapor aç. Sohbet uzarsa bu dosyanın yolunu, güncel SHA'yı ve sıradaki işi içeren kısa devam promptu ver.

**Rutin geliştirme yetkisi:** Kullanıcının `BEYTHAUS-CUT-RELEASE-ROADMAP.md` kapsamındaki talimatıyla güvenli kod, test, dokümantasyon, PR, CI ve merge işlemleri için her adımda tekrar onay isteme. Bu yetki canlı veri silme/değiştirme, Auth/RLS gevşetme, hassas migrasyon uygulama, finansal işlem veya gerçek stok tüketimine uzanmaz.

## 8. Geçmiş kayıt ve kanıt indeksi (tekrar yerine bağlantı)

- **Önceki tam A–AF gelişim günlüğü**, bu sadeleştirmeden **önceki sabit commit'te** arşiv olarak durur: [27d0513… sürümündeki eski handoff](https://github.com/Beytullah-dot/Beytullah-/blob/27d0513c155d87128e18b8718aeb034aea427153/BEYTHAUS-CUT-HANDOFF.md). **Geçmiş silinmedi**, sadece etkin devir belgesinden çıkarıldı.
- [PR #58](https://github.com/Beytullah-dot/Beytullah-/pull/58) ve `MOTOR-TIGHT-STOCK-SHAPE-REPAIR-RESULTS.md`: yeni stok-şekli kurtarma, 60+12 hedef-vaka; [PR #57](https://github.com/Beytullah-dot/Beytullah-/pull/57) ve `tests/MOTOR-COMMERCIAL-TIGHT-STOCK-RESULTS.md`: önceki kıt stok baseline.
- [PR #56](https://github.com/Beytullah-dot/Beytullah-/pull/56) ve `tests/MOTOR-CAPACITY-MATRIX-RESULTS.md`: 105 hedef-vaka / optimumluk kapasitesi; özel sınıf araştırma kaynakları `tests/` içindedir.
- [PR #49](https://github.com/Beytullah-dot/Beytullah-/pull/49)–[#53](https://github.com/Beytullah-dot/Beytullah-/pull/53): yapıcı Worker, seçili karma otomatik fallback, Linux ölçek/UNKNOWN ve izole SQL guard/gerçek motor payload.
- `docs/ENGINE-ARCHITECTURE.md`, `docs/BULUT-SENKRONIZASYON.md`, `tests/README.md`: kod sözleşmesi, bulut ve bağımsız testlerin ayrıntıları.

**Güncel oturum:** Aşama 0 test ve ölçüm çalışması [PR #60](https://github.com/Beytullah-dot/Beytullah-/pull/60) içinde tutulur. Sonuçlar ve kalan kabul açıkları `tests/MOTOR-APARTMENT-STAGE0-RESULTS.md` dosyasındadır. Motor tamamlanma veya ürün v1 kabulü ilan edilmedi.

**25 Kasım — güncel durum.** PR #61 normal merge commit `50e7803d8976d34d14422eb2b3b501f3a3581f6a` ile master'a alındı. Son PR commit'inde dört workflow başarılı. Aşama 2 geliştirmesi kullanıcı tarafından onaylandı. Dar artık geometrisi yalnız `allowNarrowScrapCuts` ile seçilir. Ayrı `enableMultiplicitySolver` anahtarı varsayılan kapalıdır. Açma kararı Aşama 2 kapanışında kullanıcıya aittir.

**Aşama 2 geliştirme dalı.** İlk kontrol noktası ayrı bir araştırma Worker'ıdır. Mevcut tarayıcı akışı eski çözücüyü kullanır. Araştırma koşucusu önce mevcut motoru ve eksik planda eski yapıcı Worker'ı çalıştırır. Elde edilen planı aday olarak korur, yeni planı iki fiziksel denetimden geçirir ve seçili hedefi karşılaştırır. Kaynak bütçeli arama optimumluk kanıtı vermez. Yeniden üretim: `CASES=3 node tests/stage2/check.cjs`. İleride tarayıcı entegrasyonunda karşılaştırma tam eski arama zincirinin son planını da kapsamalıdır. Süre aşımı, iptal, kısmi plan ve geç yanıt durumlarında mevcut sonuç korunmalıdır. Kapsamlı kapasite ve tarayıcı kabulü açıktır.

**Açık kapalı değerleri eklemesi.** Kullanıcı 0c87bf8 üzerine yalnız açık false alanları ve testleri için ayrı commit onayladı. UI varsayılanı, içe aktarma, normalleştirme, Worker mesajları ve plan anlık görüntüleri açık false taşır. Araştırma testlerinde açık mod bilinçli true kullanır. Merge ve anahtarı açma kararı kullanıcıdadır. Bağımsız ara ölçümde 24/24 kapalı çıktı eşleşmesi, 258 karşılaştırmada 168 sonlu optimum için sıfır alt sınır ihlali görüldü. Tam tarayıcı zinciri ve UI gecikme kabulü açık. 27 Kasım: b75de7b bağımsız oracle raporunda sıfır geçersiz/uyuşmazlık/alt sınır ihlali/regresyon; K2 katı %21,5 ve dar artık %59,4 en kötü boşluk, bir mümkün eksik K2 iş için tohumlar bekleniyor. Önceki yerel diff geri alınamadı; sert maxStates ve Worker dış limitReached/limitReason/limitReasons alanları mevcut kaynak üzerinden yeniden oluşturuldu; UI bağlantısı eski yapıcı/kesin/ekonomik arama zincirinin ardından çalışacak şekilde opt-in kodlandı; çift denetim ve seçili hedefte kötüleşmeme kontrolü var. Kaynak sınırı UI metni ve 12 kombinasyon + zorunlu maxStates=1 WebKit testi eklendi; CI ölçümü henüz doğrulanmadı. Count yalnız deneysel test hedefi; mevcut halka açık hedef düğmeleri area/cost. Yerel Chromium yürütülebilir dosyası var ancak GitHub DNS erişimi ve yerel checkout yok; gerçek iPhone kabulü açık. PR taslak kalır, merge/aktivasyon/Aşama 3 yasak.
