# Beythaus Cut — İki aşamalı fiziksel exact şerit desenleri (21 Kasım 2026)

## Sınırları matematiksel olarak tanımlanmış model

Bu araştırma **genel iki boyutlu giyotin optimumluğu değildir**. Önceki PR #37'nin tek ortak enli full-span sınıfından daha geniş, ancak yine kısıtlı bir fiziksel alt sınıftır:

- **VH:** Stokun trim sonrası kullanılabilir alanı, tam kenarlı *dikey* kesimlerle şeritlere ayrılır. Her şerit içinde yalnız tam kenarlı *yatay* kesimler yapılır. Parçalar kendi şeritlerinin enini tamamen kaplar.
- **HV:** Yukarıdakinin eksenleri ters çevrilmiş hâlidir. Aynı stokta VH ve HV aşamaları iç içe karışmaz; ancak farklı stok kopyalarında farklı sıralar seçilebilir.
- Önceki tek enli sınıfın tersine, farklı parçaların yatay uzanımları farklı olabilir; bağımsız şeritler farklı genişliktedir. Şerit içindeki parçalar ortak genişliği paylaşır.
- Her stok için **iki aşamalı VH veya HV** desenlerinin tüm parça-adedi vektörleri kaynak bütçesi altında enumerate edilir. Aynı stokta aynı talep vektörüne sahip desenler birbiri yerine geçebildiğinden yalnız biri tutulur; farklı adet vektörlerinde güvenli olduğu kanıtlanmamış dominance uygulanmaz.
- Stok kopyalarının sonlu adetleriyle **tam çoklu-stok örtüsü** aranır. Kayıtlı maliyet, brüt stok alanı ve levha adedi **ayrı ayrı** minimize edilir.
- Pozitif kerf ve trim **fiziksel testere kesimleriyle** hesaplanır. Kullanılmayan (R) boyutu için (0<R<k) kalan boşluk, ayrıştırıcı tam kenarlı kesim yapılamadığı için yasaktır.
- Parça yönü değiştirilmez. Açıkça 90° dönüş gerektiren veya serbest rotasyonlu sınıflar **UNKNOWN-class** durumuna gider. Malzeme, category (varsa), parça/levha kalınlığı eşleştirilir; masif fiyatı m³ üzerinden hesaplanır.
- Girilen çok yüksek adet veya levha sayısı için keyfî sabit sınır **yoktur**. Kaynak, bellek, durum veya zaman bütçesi tükenirse `unknown-limit` döner.

## Doğrulama (ilk yerel araştırma koşusu)

Test: `tests/motor-two-stage-exact.cjs`. Motor: `docs/engine/two-stage-strip-exact.js`.

**Bağımsız oracle algoritması**, motorun stok deseni ve DP kodunu paylaşmaz: parçaları tekil kimlikleriyle stok kopyalarına exhaustive dağıtır; her stokta iki yön için tam **küme bölümlenmesi (set partition)** yapar. Sadece tam fiziksel şeritler kabul edilir.

- 16 deterministik küçük iş × 3 amaç = **48/48** aynı sınıf optimumu.
- 21.090 bağımsız parça–stok ataması; 147.561 küme bölümlenmesi dalı.
- İki farklı en ve iki farklı boydaki dört parça için testere 2 mm, trim 1 mm örneği: kayıtlı maliyet optimumu **70 TL / bir levha**, brüt alan optimumu **1.620 mm² / iki levha**. Bu iki hedefin farklı planları vardır. İki eksende ardışık tam kenarlı kesimler uygulanır.
- Test her planı ayrı canlı-yaprak kesim ağacı üzerinden tekrar yürütür. GitHub CI ortamında ayrıca mevcut `production-audit.js` ve bağımsız `optimization-oracle.cjs` denetimlerine sokar. Kasıtlı kısaltılmış tam-kenarlı kesimi reddeder.
- Bilinmeyen fiyatı 0 kabul etme, sadece alan için fiyatı bilinmeyen stok seçilirse `cost:null` koru; bütçe 0; çok dar kerf artık; yasak rotasyon; malzeme/kalınlık ve masif m³ fiyatı korumaları.

**Kayıt uyarısı:** Yukarıdaki sayaçlar ilk yerel Node araştırma koşusundandır; GitHub runner'ının güncel sonucu ve gerçek RSS değeri CI artifacts içinden ayrıca doğrulanmalıdır. İlk yerel maxRSS 36.584 KiB, süreç genelidir. Bu değer ne solver bellek üst sınırıdır ne de 305 parçalı genelleme garantisidir.

## Sınırlar ve bir sonraki görev

`optimal-two-stage-class` yalnız yukarıdaki restricted **iki aşamalı** desen kümesinde fizikselliği kanıtlı en iyi çözümdür. Genel guillotine optimum LB'si **değildir**; bu modül üretim optimumluk sertifikasına bağlanmadı. `infeasible-two-stage-class` de genel fiziksel imkânsızlık iddiası değildir. Üç aşamalı yeniden bölme, şerit içinde birden fazla en, serbest rotasyon, kategorik karma stok eşlemesi ve 4+ eşikli Pareto araması kapsam dışıdır.

Özellikle PR #32'nin fiziksel optimumluğu bilinen **305 parçalık holdout brüt alan 499.224 mm², mevcut genel LB 208.692 mm²** açığı değişmedi. Bu işi önceki PR #30 planted 44/305 veya PR #37 full-span 44/305 testleriyle karıştırma.

**Sonraki adım:** CI ve bağımsız audit'i doğrula; sınıf kanıtının potansiyel açıklarını ele al. Ardından ayrı PR'da üç aşamalı gerçek kesim ağacı, güvenli kaynak kontrollü enumeration ve gerekiyorsa 4+ Pareto/RSS araştırması. Genel optimality sertifikasına erken entegrasyon YOK. Supabase/Auth/stock/migration ve gerçek üretim kayıtlarına müdahale YOK.
