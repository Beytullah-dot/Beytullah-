# Beythaus Cut — Devamlılık / teknik handoff

> **Tek giriş belgesi.** Yeni bir sohbet veya geliştirme oturumunda önce bu dosyayı ve `AGENTS.md`'yi oku. Bu belge **geçmiş PR günlüğü değildir**; güncel ürün sözleşmesi, doğrulanmış teknik durum, açık riskler ve sonraki adımdır.
>
> **Durum kesiti:** 22 Kasım 2026, Türkiye. Son doğrulanmış **motor kodu**: `27d0513c155d87128e18b8718aeb034aea427153` (PR #58 sonrası). Belgeyi güncelleyen commit bu SHA'dan daha yeni olabilir. **Her seferinde gerçek `master` HEAD, PR, CI, Pages ve Supabase durumunu yeniden doğrula.**
>
> **Depo:** https://github.com/Beytullah-dot/Beytullah- · **Canlı uygulama:** https://beytullah-dot.github.io/Beytullah-/ · **Yayın:** `master` → `docs/` · **Supabase:** `pdqgpupdqgrxejvjpdzs`.

## 1. Projenin amacı ve kabulün anlamı

Beythaus Cut; panel ve masif ahşap için **iki boyutlu, fiziksel giyotin kesim** optimizasyonu, ortak stok/raf/QR envanteri, malzeme maliyet kaydı, kesim PDF'si ve tamamlanmış üretim arşivi sunan mevcut web/PWA uygulamasıdır. Aynı projeyi geliştir; **bağımsız demo/proje veya yeni yayın adresi oluşturma**.

- Motorun amacı her olası 2D yerleşim için evrensel matematiksel optimumluk değil; **gerçekten kesilebilir plan**, seçili hedefte iyi performans ve **kanıt mümkünse hedefe özgü optimumluk** sunmaktır.
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
- Kullanıcı **hesaplamadan önce** brüt alan/fire veya kayıtlı maliyet önceliğini seçer. Minimum levha sayısı ayrı bir amaç/kanıt olarak raporlanır. `count`, `area` ve `cost` **bağımsızdır**; birinin optimumluğu diğerini kanıtlamaz.
- Üretime çıkarılan her **tam** plan gerçek stok/kerf/trim/yön ve tam kesim ağacının fiziksel denetiminden geçmelidir. Eksik/kısmi sonuç üretim talimatı olamaz.
- Sonuç durumları açık: (1) **seçili amaçta kanıtlı küresel optimum** yalnız aynı fiziksel model ve hedef için geçerli LB=UB veya tam exact ispatıyla; (2) **fiziksel tam plan, optimumluğu kanıtlanmamış**; (3) **UNKNOWN/kaynak sınırı**, hiçbir zaman “imkânsız” değildir; (4) **kanıtlı imkânsız** yalnız geçerli eksiksiz ispat varsa.
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

## 6. Ürün v1 açık kapıları / çalışma sırası

**Öncelik sırası, yeni gerçek sorun veya kullanıcı kararıyla yeniden değerlendirilebilir:**

1. **B — İlk `optimize` ana thread yükü:** güvenli Worker'a taşınması; plan/audit sözleşmesini bozma. Abort, stale request, proje/hedef değişimi, Worker hata/timeout, backpressure, bellek ve iOS WebKit emülasyon regresyonları; bağımsız Node ölçümleri ve erişilebilir performans raporu.
2. **A — Ticari motor yeterlilik matrisi:** N/K, stok sınıfı, çeşitlilik, malzeme, kerf, trim ve hedefe göre yeni bağımsız fiziksel tanıklı zorlu/holdout örnekleri ölç. Başarı, hedefe göre küresel sertifika, UNKNOWN, kısmi, optimality gap ve gerçek kaynak maliyetini ayrı göster. Tam fakat kanıtsız planlarda hedefe özgü strict improvement değerlendir. Evrensel exact garantisi peşine koşma.
3. **C — Bulut üretim güvenliği:** staging/izole PostgreSQL'de çok parçalı/karma malzeme/pozitif kerf gerçek `planSnapshot`, kesim ağacı sahteciliği, stale stock, iki eşzamanlı hesap, idempotensi, rollback ve tenant izolasyonu testleri; **canlı migration otomatik uygulanmaz**.
4. **D — Çıktı ve dağıtım E2E:** gerçek kesim ağacı ↔ PDF sıra/kerf ↔ kullanılabilir artık/kayıt değeri ↔ stok tüketimi ↔ maliyet arşivi tutarlılığı, Pages gerçek asset sürümü/cache ve küçük ekran.
5. **E — Son saha kabulü:** gerçek **iPhone Safari** ve **iki gerçek kullanıcıyla** Supabase çok cihazlı üretim/çakışma UAT; yapılamadıysa tamamlandı değil **BLOCKED/AÇIK** olarak kaydet.

Plan ve paket kabul ölçütleri: `BEYTHAUS-CUT-RELEASE-ROADMAP.md`, `BEYTHAUS-CUT-V1-CHECKPOINT-20261122.md`. Risk kapanmadan tahmini %70'i sırf PR sayısı yükseldi diye artırma.

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

**Önemli:** Bu dosyanın sadeleştirilmesi **yeni motor kanıtı, tamamlanmış canlı güvenlik testi veya v1 teslimi değildir**.