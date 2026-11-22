# Beythaus Cut — Otonom tamamlama ve sürüm kabul yol haritası

> Kayıt tarihi: 22 Kasım 2026, Türkiye.
> Başlangıç kaynak HEAD: `f3b4655fd5397bfd057059ee9254f16820812a7c` (HER SOHBETTE yeniden doğrulanmalıdır).
> Bu yol haritası kullanıcının "kalan yaklaşık %30'u rutin yeniden onaylar istemeden bitir" talebinin uygulama planıdır.
> `AGENTS.md` ve `BEYTHAUS-CUT-HANDOFF.md` ürün/güvenlik kararları geçerliliğini korur.

## 1. Kapsam ve dürüst ilerleme ölçüsü

Hedef, mevcut GitHub Pages Beythaus Cut uygulamasının panel/masif,
stok ve maliyet politikalarıyla **güvenli, doğrulanabilir, üretimde kullanılabilir v1** olmasıdır.
Yeni bir uygulama veya yeni canlı URL açılmayacak.

Başlangıç **yaklaşık %70**, kullanıcının istediği takip için **öznel mühendislik
tahmini**, istatistiksel ölçüm ya da genel matematik optimumluk oranı DEĞİLDİR.
Kalan yaklaşık 30 yüzde puan aşağıdaki release-kabul iş paketlerine dağıtılmış
bir planlama bütçesidir. Kanıt olmadan ilerleme kazanılmış sayılmaz.
Genel 2D giyotin optimumluğu NP-zor/hesaplama bakımından pahalıdır;
bütün işler için küresel optimum garantisi v1'in zorunlu kabul koşulu değildir.
Ayrı ayrı raporla: (A) ürün hazır oluşu, (B) fiziksel plan başarı/kapsamı,
(C) seçilen maliyet/alan hedefinde kanıtlı optimumluk/gap ve UNKNOWN oranı.
Kanıtsız optimumluk ilan etmek yasak.

## 2. Tamamlama iş paketleri (toplam tahmini +30 yüzde puan)

| Paket | Tahmini puan | Kabul kanıtı |
|---|---:|---|
| A. Araştırma yapıcı adaylarının canlı motora güvenli ve bütçeli entegrasyonu | +10 | Üretim Worker veya kesim motorunda yalnız **tam, bağımsız audit'li, fiziksel giyotin** `feasible-uncertified` adayları; exact sertifika/status sözleşmesi ayrışmış; gerçek stok ve seçili fiyat/alan hedefi korunmuş; fallback/regresyon CI |
| B. Mobil, tarayıcı ve iş ölçeği dayanıklılığı | +5 | Büyük/heterojen/tekrarlı deneyler, negatif ve UNKNOWN durumları, gerçek Linux ölçümlü süre/RSS; UI kilitlenmiyor; belirlenmiş kaynak bütçelerinde çözülebilenler ve çözülemeyenler açıklanmış; iPhone WebKit emülasyon regresyonu |
| C. Sunucu/istemci güvenliği ve bulut stok bütünlüğü | +5 | Sunucuda fiziksel kesim ağacı audit tehdidi ve uygulanabilir koruması; atomik tüketim/idempotensi/iki kullanıcı çakışma testleri; RLS/Auth/gerçek stoğa yönelik negatif testler; herhangi migration için veri-korumalı plan |
| D. Yayın ve çıktının uçtan uca doğruluğu | +5 | Üretim PDF'si, yön, kerf, kalan artık, maliyet ve envanter akış testleri; canlı `docs` dosyalarının GitHub Pages yayınına eşliği mümkün olan düzeyde doğrulanmış; offline/cache ve küçük ekran regresyonu |
| E. Son kabul ve şeffaf release dosyası | +5 | GitHub master Optimizer/Geometry/Pages ve ilgili workflow SUCCESS; üretim senaryosu test matrisi + regresyon raporu; gerçek iPhone Safari ve iki kullanıcılı gerçek Supabase saha testleri yapıldıysa kanıtı, yapılamadıysa **AÇIK/BLOKE** olarak kaydı; nihai risk listesi |

Bu ağırlıklar planlama tahminidir. Kullanıcıya her önemli merge sonrası:
önceki ve yeni **ürün hazır oluşu yüzdesi**, değişim, kazanılan kanıt,
fiziksel başarı kapsamı, optimumluk/UNKNOWN durumu ve sonraki engel bildir.
Yüzdeleri otomatik commit sayısından türetme; tamamlanmamış/başarısız iş
için puan verme, gerileme varsa puanı düşür.

## 3. Onay istemeden devam çalışma yetkisi

Kullanıcı bu konuşmada rutin geliştirme döngüsü için yeniden onay beklememeyi
açıkça istedi. Erişim izinleri kapsamında, her bir ara PR için yeniden
"devam edeyim mi?" diye sormadan şu adımları art arda gerçekleştir:
depo/CI/Pages durumunu doğrula, ilgili teknik ve akademik araştırmayı
gerektiği kadar yap, küçük dal/PR hazırla, güvenlik regresyonu ve bağımsız
oracle/audit testlerini çalıştır, GitHub CI'yi doğrula, başarılı/incelemesi
uygun PR'ı birleştir, master CI/Pages kontrol et, handoff ve ilerleme
tablosunu güncelle, sıradaki pakete geç.

Bu, **kontrolsüz üretim verisi değişimi için yetki değildir**:
gerçek stok adedi düşürme, geçmiş üretim/maliyet verilerini değiştirme,
kullanıcı envanterini buluta taşıma, gerçek hesaplarda işlem yapma,
silici/geri alınamaz SQL migration, yetki/kimlik doğrulama güvenliğini
gevşetme, gizli anahtar kullanımı veya finansal/billing işlemleri
gerekiyorsa geçerli özel onay ve güvenlik şartlarını koru. Canlı
yayındaki sıradan uygulama kodu, test ve dokümantasyon dağıtımını
bu kapsamda gerçekleştirebilirsin; yüksek etkili riskli adımları
etkisiz kıl, güvenli alternatif geliştir ve gerekiyorsa tam engeli açıkça yaz.

Araç/erişim, gerçek iPhone veya ikinci insan kullanıcı gerektiren saha
testleri yapay zekâ araçlarıyla yapılamıyorsa yapılmış gibi iddia etme,
sadece bu bağımlılığı kaydet; bağımsız yapılabilir diğer işlere devam et.
Gerçek saha kabulü koşulsuz `100%` olarak işaretlenemez.

## 4. Bir sonraki yürütme sırası

1. Güncel master, `AGENTS.md`, handoff (özellikle S/T/U/V), bu dosya,
   canlı modüller ve CI'yi gerçek kaynaktan oku; mevcut branch/PR ve
   yayımlanmış byte'ları kontrol et.
2. Önce **A**: `docs/engine/three-stage-lazy-research.js` yalnız araştırma;
   canlı Worker'a bağlantı yok. Production `docs/engine/cutting-engine.js`,
   optimizasyon worker'ı, `production-audit.js`, maliyet/alan seçimi ve
   stok politikalarıyla arayüz sözleşmesini çıkar. Status geçişleri, 
   kerf/yön/rotasyon/masif fiyatı, kısmi planların sızmaması,
   `UNKNOWN` ve optimumluk rozeti ayrımını test eden küçük PR.
3. **B/D**: Mobil kaynak limitleri, kesim sırası/PDF ve yayın
   cache/Pages eşliğini bağımsız ölç; fail-safe ve E2E regresyonları kapat.
4. **C**: Supabase test altyapısı ve RLS/RPC/transaction/replay sınırlarını
   doğrula; gerçek hesap veya stok durumuna dokunmadan güvenli test yaz.
5. **E**: Master CI, Pages, risk/kabul matrisi ve açık gerçek cihaz UAT
   koşullarını nihai rapora geçir.
6. Her PR'da kullanıcıyı gereksiz onaya çağırma; riskli veya
   erişilemeyen adımları yazılı blokaj olarak ayır. Geliştirmeyi
   mümkün olan sonraki güvenli parçadan sürdür.

## 5. Matematiksel/dürüstlük sınırları

- Pozitif kerf, kenar trim'i, farklı fiyat, stok adedi, malzeme, kalınlık,
  parça yönü ve döndürme izni korunur.
- Fiziksel üretim planı **yalnız canlı alt-levha boyunca uçtan uca
  giyotin** kesimi; bağımsız kesim ağacı audit geçmeden yayınlama.
- `feasible-uncertified` = tam fiziksel aday üst sınırı;
  `unknown-limit`/`unknown-no-candidate` = belirsizlik;
  exact solver'in kanıtı yalnız kanıtladığı sınıf ve amaç için geçerli.
- Gerçek/sentetik benchmark ayrımı; araştırma sonucu ile kullanıcı
  prod verisi ayırımı; ölçümlerde cihaz/OS ve bütçe bilgisi zorunlu.
- Keyfî parça/levha sayısı limiti yok; kaynak bütçesi ve açık UNKNOWN var.
- Bilinmeyen fiyatın `0` sayılması, güvenli olmayan dominance,
  kanıtsız minimum etiketleri veya sessiz stok değişikliği yasak.
- Bu yol haritası kullanıcının "kalan %30" ifadesini **kapsamı belirli
  v1 hazır oluşu** olarak operasyonelleştirir; sınırsız problem ailesinde
  matematiksel optimumluğun tamamlandığı şeklinde yorumlanamaz.


## 6. 22 Kasım 2026 — A–E kabul ilerleme kontrolü

Kanıtları ve bütün PR/commit/CI bağlantılarını güncel
`BEYTHAUS-CUT-V1-CHECKPOINT-20261122.md` kaydından oku.
PR #49–53 mevcut master'a birleştirildi; gerçek Worker'a
bounded constructive fallback, seçili karma otomatik
sözleşmesi, sentetik Linux RSS/UNKNOWN stres deneyleri,
izole PostgreSQL sunucu-fiziksel-audit trigger adayı
ve gerçek shipped motorun sentetik cloud RPC uyumluluğu
eklendi. **Güvenlik migrationı hâlâ canlı Supabase'e
uygulanmadı.** Paketleri kısmi işler bitmiş diye
kapanmış sayma. 70% hazır oluş tahmini korunuyor.
Gerçek iPhone Safari/iki kullanıcı UAT, ilk senkron
optimize mobil performansı, PDF/Pages byte E2E, canlı
migration rollback güvenliği ve ispat/gap matrisi açık.

Bir sonraki sohbette bu dosyadaki eski başlangıç HEAD'ini
güncel sanma: GitHub `master` ref'ini ayrıca kontrol et.


## 7. 22 Kasım 2026 — MOTOR tamamlanma eşiği yeniden tanımlandı

Kullanıcının yeni önceliği: Tüm olası devasa giyotin işler için
sınırsız exact aramaya bütçe harcama; gerçekçi proje ailesindeki
**kanıtlı kapasiteyi**, **fiziksel plan başarı oranını** ve
**performansı** ölç. Yeterli ticari kapsam sağlandığında
**motor geliştirmeyi %100** ilan edebilirsin; bunun anlamı
"her girdi optimum" veya "bütün ürün v1 %100" değildir.
Bağlayıcı detay ve test tasarımı:
`BEYTHAUS-CUT-ENGINE-CAPACITY-ACCEPTANCE.md`.

Parça sayısı `N=sum(qty)` ile çeşitlilik `K`, stok sayıları/
fiyatları, rotasyon/damar, kerf, kesim modeli ve optimumluk
amacı birlikte değerlendirilmeli. "N<=X ise hep kanıtlı
optimum" gibi kaynaklanmamış garanti verme. Tekrarlı 1000
parça sonucu tam fiziksel kanıtsızdır, exact değil.
Sertifika **her bir problem+seçili amaç** için geçerlidir.
Mümkün olan büyük tekrarlı işlerde exact kullanmaya devam et;
zor küçük işlerde de güvenli sezgisel kullan.

Yeni öncelik sırası:
1. Önce mevcut motorun **exact sertifika sınırı/kanıt
   profili**, N/K sınıf matrisi, bağımsız oracle, maliyet/
   brüt alan/levha ayrı hedefleri ve fiziksel başarı/UNKNOWN
   örneklemesi; bu sonuç olmadan keyfî X belirleme.
2. Ölçülen ticari kapsam yeterliyse büyük/kombinatoryal
   sınıflarda zaman/bellek bütçeli yapıcı/sezgisel yaklaşımı
   ve açık "optimumluk kanıtlanmadı" durumunu kurumsallaştır.
   Kullanıcı proje girişi keyfî N ile kesilmesin.
3. Motorun %100 tamamlanma kararı için tanımlı kapsamda
   0 yanlış optimum etiketi, 0 hatalı fiziksel üretim
   planı, hedef-maliyet-alan ve bilinmeyen fiyat
   regresyonları, güvenilir performans ve açık
   UNKNOWN belgelensin. Motor %100 olursa A/B'nin motor
   işlerini kapatabilirsin; C/D/E ürün v1 güvenlik,
   dağıtım ve UAT kalemleri ayrıca kalır.
4. Motoru sonsuz exact genişletmek yerine verimli
   olan geliştirmelere geç: mobil ana-thread, cloud
   server audit, PDF/Pages/cache, güvenli canlı
   Supabase geçişi ve gerçek cihaz/iki kullanıcı UAT.

Bu *dokümantasyon hedef değişikliği* kod testi
olmadan motorun veya ürünün hazır oluş yüzdesini
artırmaz. Önceki ürün hazır oluş %70, güncel %70,
görev değişiminden gerçekleşen artış +0.
