# Beythaus Cut — Motor matematiksel garanti durumu

Güncelleme: 20 Kasım 2026. Kaynak: PR #3 (motor-proof-foundation).

## Kesin ayrım

Bir giyotin yerleşiminin fiziksel **geçerlilik** denetimi, bu yerleşimin
hedef fonksiyonda **küresel optimum** olduğunun kanıtı değildir. Yeni modül
`docs/engine/optimality-certificate.js`, **gerçek üretim için audit edilmiş**
bir yerleşime iki sınıf matematiksel alt sınır uygular:

1. **Tamsayılı stok-adet/kullanılabilir alan örtüsü**: stok türlerinin gerçek
   miktarlarını, ölçülerini, kenar payını ve kayıtlı fiyatlarını dikkate alan
   sınırlı fakat tam Pareto DP. Geometri, kesim sırası, testere payı ve
   malzeme alt türleri gevşetilir. Gevşetme yalnız daha iyimser alt sınır
   verebilir; optimumu olduğundan pahalı gösteremez.
2. **Eş ölçülü ve tek yönlü parçalar için kerf'li parça kapasitesi**:
   stokun kullanılabilir boy/eninde en fazla
   `floor((W+k)/(a+k)) × floor((H+k)/(b+k))` adet eş boyutlu parça
   bulunabilir. Burada k testere payıdır. Kısıt, herhangi bir geçerli
   giyotin kesimde parça çiftlerinin en az k kadar bir eksende ayrılması
   nedeniyle güvenlidir. Bu tavan hesaplanırken fiziksel stokun boy/en
   koordinatları esas alınır, stok damar düğmesi bulunmaz.

Her iki alt sınır da güvenli sonuç verirse daha güçlü olan kullanılır.
Geçerli çözüm alt sınıra erişirse o **tek amaç fonksiyonu** için optimum
kanıtlanır. Geçerli çözüm kanıtlanan stok sayısını kullanıyorsa ve aynı
malzeme grubunun bütün uygun stoklarında levha başına alan (veya fiyat)
eşitse, o amaç için de optimumluk kanıtı üretilebilir.

**Amaçlar ayrı:** minimum stok sayısı; minimum toplam brüt stok alanı
(= minimum brüt fire); minimum **kayıtlı stok değeri**. Minimum
yeniden kullanılabilir artık alanı, tahmini ikame değer, kesim zamanı,
işçilik ve çok amaçlı Pareto optimumluğu henüz kanıtlanmıyor.

## Hangi 25 levhalık testler gerçek motorla geçiyor?

- **100 parça / 25 levha:** 50×50 mm parçalar, 100×100 mm stok,
  kerf=0; fiziksel kesim ağacı doğrulandı, stok sayısı, alan ve
  fiyat optimumluğu kanıtlandı.
- **25 büyük parça / 25 levha:** 60×60 mm parçalar, 100×100 mm stok,
  kerf=0. Alan alt sınırı tek başına yetmez; parça eşleşmezliği ve
  geometrik kapasite alt sınırı 25 levhayı kanıtlar.
- **400 parça / 25 levha:** 22×22 mm parçalar, 100×100 mm stok,
  **3 mm testere payı**. Kapasite sınırı levha başına 16 parçadır:
  400 / 16 = 25 levha. Motorun 25 levhalık gerçek giyotin planı
  bağımsız kesim ağacı denetiminden geçti. Aynı stok ölçüsü/fiyatı için
  alan ve kayıtlı stok bedeli de optimumdur.
- Üstelik miktar-örtüsü DP'si, 160 rastgele küçük senaryoda
  `count`, `area` ve `cost` için ayrı bağımsız
  tam taramayla **480/480** eşleşti.

**Bunlar motorun her 25 levhalık projede optimumluk kanıtladığı anlamına
gelmez.** Farklı ölçüler, dönüş kısıtları, çok sayıda stok türü,
karma otomatik malzeme eşlemesi ve ucuz/pahalı stok takasları yeni
zorlu alanlardır. Tam arama devam ettirilemezse `UNKNOWN` olarak
bırakılmalıdır.

## Motorun mühürlenebilmesi için henüz tamamlanmamış işler

1. Kullanıcının ana hedefini (**maliyet** veya **brüt fire**) hesaplamadan
   önce seçebilmesi ve arama önceliğinin gerçekten buna göre kurulması.
   İki hedef aynı şey değildir.
2. Farklı boyutlu 20–25 levhalık gerçek atölye projelerinde daha güçlü
   guillotine pattern/branch-and-price, MILP veya CP-SAT tabanlı kesin arama
   ve tekrar üretilebilir standart benchmark karşılaştırması.
3. Karma otomatik malzeme atamasının bütün olası uygun alternatiflerini
   kapsayan, arama tamamlanamıyorsa açık optimality gap gösteren çözüm.
4. Yeniden kullanılabilir artık değerinin **hangi hedefe** ait olduğunun
   açık tanımı. Brüt fireden farklıdır ve kendi başına henüz optimize
   edilmiş veya kanıtlanmış sayılmaz.
5. Bağımsız kanıt denetleyicisi, sayısal sınır/yuvarlama regresyonları ve
   gerçek Safari/atölye kabulü. CI emülasyonu sahadaki makineyi doğrulamaz.

Dolayısıyla **motor mühürlenmiş değildir**. Bu PR güçlü ve kanıtlı büyük
sınıf örnekleri kapsayan bir alt yapı ve test kapısı sağlar.

## Akademik başlangıç kaynakları

- Lodi, Martello, Vigo, *Two-dimensional packing problems: A survey*
  (2002): https://doi.org/10.1016/S0377-2217(02)00123-6
- Macedo et al., *Arc-flow model for the two-dimensional guillotine
  cutting stock problem* (2010):
  https://www.sciencedirect.com/science/article/pii/S0305054809002007
- Fleszar, *An Exact Algorithm for the Two-Dimensional Stage-Unrestricted
  Guillotine Cutting/Packing Decision Problem*:
  https://scholarworks.aub.edu.lb/server/api/core/bitstreams/b4ca72a6-ae9e-48d4-8e60-dcc25a835c5d/content
- *Enhanced formulation for the Guillotine 2D Cutting Knapsack Problem*:
  https://link.springer.com/article/10.1007/s12532-022-00222-4

Bunlar yöntem ve performans sınırları için araştırma kaynaklarıdır.
Burada uygulanan kapasite formülü ve deney sonuçları kendi kodumuza ait
olup bu yayınların birebir uygulanmış algoritması olarak sunulmaz.
