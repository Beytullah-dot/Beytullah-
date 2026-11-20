# Beythaus Cut — Ölçeklenebilirlik araştırması ve parça sınırı kararı

**Tarih:** 20 Kasım 2026. **Durum:** Kontrollü başlangıç benchmark'ı;
üretim motoru bu PR'da değiştirilmedi.

## Karar: Kullanıcıya sabit maksimum parça/levha limiti konmayacak

Kesin çözüm için tüm örnekleri kapsayan tek bir "kanıtlanabilir en büyük
parça sayısı" yoktur. Üstelik sabit n sayısı **karmaşıklığı ölçmez**:
giyotin kısıtları, farklı ölçüdeki parça **türü**, stok çeşitliliği,
döndürme, testere payı ve doluluk oranı bağımsız belirleyicilerdir.

Karşı örnek: Her n için, n adet 1×1 parça ve n adet 1×1 stok oluştur.
N stok için fiziksel yerleşim açıktır, ayrıca alan alt sınırı N
olduğundan optimumluk ispatı da açıktır. Dolayısıyla matematiksel olarak
**tüm problemler için geçerli sonlu bir maksimum n bulunamaz**.

Bu, her işin istenen sürede ispatlanacağı anlamına gelmez:
bir alt problemin araması kaynak tükettiğinde yalnızca o ispat
**UNKNOWN** kalır. Kesilebilir plan varsa korunur.

## Bilinen geçerli giyotin projelerle ilk otomatik ölçüm

Program: `tests/motor-scalability-profile.cjs`

GitHub Actions run: https://github.com/Beytullah-dot/Beytullah-/actions/runs/44651625204

Test üretici fiziksel boy/en stoklarını, 3 mm testere payını ve
gerçek kenardan kenara guillotine kesim dizisini kullanarak stokları
parçalara böler; sonra **orijinal kesim sırası ve levha üyeliğini**
motordan gizleyip parça giriş sırasını karıştırır. Böylece bütün
girdilerin **mevcut stoklarla kesilebilir** olduğu önceden bilinir.
Ölçülen süreler GitHub Actions Node.js 22 ortamına aittir; iPhone
çalışma süresi değildir.

| Senaryo | Parça | Bilinen uygun stok | Motorun kullandığı | Yerleşmeyen | Üretilebilir tam plan | Min. stok kanıtı | ms |
|---|---:|---:|---:|---:|---|---|---:|
| 2 kesim seviyesi, tek stok | 20 | 5 | 5 | 0 | Evet | Evet | 35 |
| 2 kesim seviyesi, tek stok | 40 | 10 | 10 | 0 | Evet | Evet | 35 |
| 2 kesim seviyesi, tek stok | 100 | 25 | 25 | 0 | Evet | Evet | 118 |
| 2 kesim seviyesi, tek stok | 200 | 50 | 50 | 0 | Evet | Evet | 190 |
| 3 kesim seviyesi, tek stok | 80 | 10 | 10 | 9 | Hayır | Hayır | 65 |
| 3 kesim seviyesi, tek stok | 200 | 25 | 25 | 23 | Hayır | Hayır | 125 |
| 3 kesim seviyesi, tek stok | 400 | 50 | 50 | 38 | Hayır | Hayır | 512 |
| 3 seviye, döndürme izni | 200 | 25 | 25 | 23 | Hayır | Hayır | 383 |
| 3 seviye, 3 stok türü | 80 | 10 | 10 | 10 | Hayır | Hayır | 70 |
| 3 seviye, 3 stok türü | 200 | 25 | 25 | 36 | Hayır | Hayır | 145 |
| 3 seviye, 3 stok türü | 400 | 50 | 50 | 54 | Hayır | Hayır | 533 |

**Önemli:** "Kullanılan" sayı stok adedinin tümünün
kullanıldığını, **tüm parçaların yerleştirildiğini söylemez**.
Bu testlerde 11 işin dördü eksiksiz ve kanıtlı, **yedisi eksik**.

Buradaki başarısızlıkları "kesim mümkün değil" olarak yorumlamak
mantıksal hatadır: üretici, giyotin kesim ağacını bilir ve
bu stoklara sığdığına sahiptir. Motor planı **bulamadı**.

## Mevcut kaynak kodundaki kök neden adayı

- `docs/engine/cutting-engine.js:packAttempt` parçaları tek tek,
  ilk uygun mevcut levhalardan birine yerleştirir; yeni bir levhayı
  ancak eski levhalara parça sığmazsa açar. Erken seçimler daha sonra
  düzeltilemeyebilir. Yüksek dolulukta yanlış boşluk geometrisi oluşur.
- `improveGroupPacking` **yerleşmeyen bir parça varsa** hiç
  çalışmaz; aynı zamanda 8'den fazla kullanılan stokta da devre dışıdır.
  Bu yüzden işin tamamlanması en çok gerektiği zor koşullarda
  eksik planı yeniden düzenleyecek global bir faz bulunmuyor.
- `docs/optimization-worker.js` giyotin kesin aramasını normalde
  11 parça/5 stok kapsamına indiriyor. Bunun nedeni
  `docs/guillotine-exact.js` içindeki subset DP'nin
  `(1 << n)` bitmask temsili ve üstel bellek maliyeti;
  kontrolsüz şekilde limiti kaldırmak bu algoritmayı
  200 parçada çalışabilir hâle getirmez.
- Buna karşılık *independent quantity cover* ve *kerf-aware cardinality*
  matematiksel alt sınırları farklı ve çok büyük
  **kolay sınıfları** kanıtlayabiliyor. Proof worker'ın küçük
  arama sınırı bir **kullanıcı girişi sınırı değildir**.

## Akademik dayanak ve yöntem ayrımı

- **Mrad et al. (2013)**, iki **aşamalı** giyotin cutting-stock:
  branch-and-price ile en çok **809 parçalık bazı** gerçek örnekler
  optimal; **aşamasız** tüm Beythaus Cut problemleri için üst sınır
  veya garanti değil.
  https://doi.org/10.1057/jors.2012.70
- **Fleszar (2016)**, aşama sınırlaması olmayan **tek stok**
  giyotin karar problemi: yatay/dikey blok inşası, aynı altküme için
  domine edilen durumları atma, kısmi deseni sezgisel tamamlama ve
  parça altkümelerinden erken imkânsızlık kanıtı.
  https://doi.org/10.1287/ijoc.2016.0708
- **Fontan ve Libralesso (2020)**, *anytime* ağaç araması ve
  PackingSolver: önce kullanılabilir çözüm üret, süre/kaynak
  oldukça iyileştir. İki/üç aşamalı giyotin kısıtları model
  uygunluğu bakımından ayrıca ele alınmalı.
  https://arxiv.org/abs/2004.02603
  https://github.com/fontanf/packingsolver
- **Hadj Salem & Robbes (2026)**, stok ebadı esnek
  **iki aşamalı**, sabit yönlü guillotine problemlerde
  large-neighborhood search; bizim genel giyotin modelimizle
  aynı problem değildir.
  https://doi.org/10.1016/j.ejor.2026.08.023
- **2DPackLib**, heterojen ve giyotin problemler için
  resmi benchmark kaynağı: kaynak ve optimum/best-known referanslarını
  sınıf etiketleriyle tutmak gerekli.
  https://site.unibo.it/operations-research/en/research/2dpacklib

## Önerilen teknik sıralama

1. **Tam plan kurtarma:** mevcut 1-parçalık açgözlü yerleştirmeye
   alternatif olarak giyotin *blok/desen oluşturma* ve eksik/az dolu
   stoklardan parçaları tekrar dağıtan **large-neighborhood repair**.
   Sınırsız katman sayılı giyotin ağaçları denetlenmeli.
   **Üretilebilir tam plan yoksa optimum araması anlamsızdır**.
2. **Anytime mimari:** hızlı tam plan bulunduğunda çıktı korunur;
   daha iyi planlar bağımsız audit ile atomik olarak değiştirilir;
   kesin alt sınır ve optimize edilen hedefe göre **gap** raporlanır.
3. **Sınıfa özel kesin motorlar:** tekrarlı tipleri adet cinsinden
   gruplayan pattern generation, dominance/DP, gerekirse
   MILP/branch-and-price. Üstel **subset DP** yalnız uygun küçük
   altgruplarda kullanılmalı; neden çıkarıldığını saklamamalı.
4. **Akademik testlerle doğrulama:** planted-feasible problem dışında
   2DPackLib gerçek örnekleri, az/çok stok türü, kare/dikdörtgen,
   parça yönü, testere payı ve farklı stok maliyeti.
5. **Kabul raporu:** üretilebilir tam plan bulma oranı, geçerli
   giyotin cut-audit oranı, stok sayısı, maliyet/fire gap,
   ispat oranı, süre, bellek ve mobil cihaz davranışı.
   Tek bir `maxPieces` sayısı, sonucu güvenilir tanımlamaz.

**Durum:** Bu PR sadece ölçüm/araştırma altyapısıdır. Bugünkü benchmark
7 eksik yerleşimi henüz onarmamıştır. Motor **mühürlenemez**.
