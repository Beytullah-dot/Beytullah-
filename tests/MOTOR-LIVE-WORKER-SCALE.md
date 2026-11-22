# Beythaus Cut v1 — Üretim yapıcı Worker ölçek gözlemi (B / ilk dilim)

Bu çalışma gerçek `docs/constructive-worker.js` akışını izole Node 22
çocuk süreçlerinde koşturur. Sonuçlar `tests/motor-live-constructive-scale.cjs`
ile CI'da her koşuda yeniden ölçülür; sayıların kaynağı
`live-constructive-scale-report.json` GitHub Actions artifact'idir.

## Test yöntemi
- Sentetik, birbirinden ayrı 8/40/200/500/1000 parça, tekrarlı ve
  değişken eni olan iki aile; 4 ayrı panel ebat/fiyatı, stoklar
  pozitif adetle kullanılabilir; **2 mm kerf, 1 mm trim**.
- Maliyet ve bazı küçük vakalarda brüt alan hedefleri ayrı koşturulur.
  Fiyatı bilinmeyen iki negatif testte alan/maliyet davranışı ayrıdır.
- Her bir senaryo farklı Linux Node child process ile çalışır; süreç
  `process.resourceUsage().maxRSS` maksimum belleğini raporlar.
  Bu bellek Node runtime, Worker VM, auditor ve fixture'ı kapsar.
  Algoritmanın kendi ayrılmış belleği **değildir**. iOS/WebKit
  veya saha cihazı belleği **değildir**.
- Yayındaki Worker sabit bütçe: 1300 ms, 120000 arama düğümü, 4
  yapıcı deneme ve 12 seed; ayrıca test child watchdog 8500 ms.
  Bunlar kullanıcı için parça/levha adet üst sınırları değildir.
- Dönen her `feasible-uncertified` tam kesim ağacı hem üretim
  `auditCutPlan` hem tamamen ayrı `optimization-oracle.cjs`
  canlı yaprak kesimiyle doğrulanır. Tek bir geometri, stok adedi,
  yön, kerf, malzeme veya fiyat ihlali CI'yi **FAIL** yapar.
  `unknown-*` durumunda plan NULL; imkânsızlık veya optimumluk
  ispatı yok. Child çökmesi/süre aşımı UNKNOWN'a çevrilmeden CI FAIL olur.

## Kabul sınırı

Ölçek benchmark'ının PASS olması, büyük siparişlerin hepsinde
fiziksel plan üretme garantisi, kullanıcı iPhone performansı,
çakışma/kilitlenmeme UI kanıtı ya da genel giyotin optimumluğu
**değildir**. Yüksek adetli arayüzün ilk yerleşim hesabı ana iş
parçacığında da çalışır; bu ayrı performans borcudur.
`docs/index.html` içindeki >1500 parça rota değişimi mevcut
ayrı seri kesim akışıdır; genel heterogeneous plan üst sınırı
olarak yorumlanmamalıdır. Gerçek cihaz testinde ilk hesaplamanın
uzun görev süreleri ayrıca ölçülmelidir.

Sonuçları kaydederken CI runner OS/Node/RSS/bütçe ve başarı/UNKNOWN
sayısını **aynı test koşusundan** ver. Önceki araştırma PR #46/#47'nin
10/10 ve 96 fuzz istatistikleri bu testin sonuçlarıyla karıştırılmaz.
