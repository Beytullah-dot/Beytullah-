# Beythaus Cut — Bağımsız optimizasyon testleri

Bu testler `docs/index.html` içindeki gerçek optimizasyon motorunu çalıştırır. Sonucu, uygulamanın algoritmasından bağımsız tam sayılı bir referans çözümleyici ve bağımsız kesim doğrulayıcısıyla karşılaştırır.

## Çalıştırma

Node.js 20 veya üstü yeterlidir; ek paket yoktur.

    node tests/optimization-regression.cjs
    node tests/optimization-regression.cjs --json optimization-report.json

Rastgele testler tekrar üretilebilir bir tohum (`0x2a91b30f`) kullanır.

## Kontrol kapsamı

- Serbest yerleşim ve giyotin kesim, farklı geometrik kurallarla ayrı ayrı sınanır.
- Parça boyutları, malzeme ve kalınlık uygunluğu, döndürme yetkisi, kerf, kenar payı, stok adedi ve çakışmalar bağımsız denetlenir.
- Giyotin kesimlerin sırası ayrı bir kesim ağacında yeniden yürütülür.
- Küçük tam sayılı örnekler için bağımsız tarama, minimum panel sayısını ve bu sayıdaki minimum brüt stok alanını belirler.
- Uygulama yanlış optimumluk kanıtı verdiğinde veya geçersiz plan ürettiğinde test hata koduyla sonlanır.
- Geçerli ama optimumdan kötü yerleşimler QUALITY raporunda gösterilir. Bunlar iyileştirme fırsatıdır, zorunlu doğruluk hatası değildir.
- Referans çözümleyicinin işlem bütçesi biterse durum UNKNOWN'dur. UNKNOWN asla optimumluk kanıtı sayılmaz.

## Matematiksel ve pratik sınırlar

Oracle küçük **tam sayılı** ölçüleri ve testere payını kullanır. Bu sınırlı alanda koordinat veya kesim ağacı taraması uygular; büyük üretim projelerinin tamamı için evrensel bir kesin çözüm garantisi değildir.

Fiziksel uygulanabilirlik denetimleri uygulamanın modellediği dikdörtgen malzeme ve giyotin kesim varsayımlarına dayanır. CNC takım yolu, kelepçeleme, makine güvenliği, damar yönü ve parça kusurları ayrı modellemeler gerektirir.

**Minimum stok sayısı**, minimum satın alma maliyeti ya da maksimum kullanılabilir artık anlamına gelmez. Optimumluk sertifikası her hedef için ayrı olmalıdır.

## Gelecek aşamalar

1. Sürekli entegrasyonda her kod değişiminde aynı deterministik testleri koşmak.
2. Farklı stok, kalınlık, döndürme ve malzeme gruplarıyla test kapsamını büyütmek.
3. Karşılaştırma için 2DPackLib gibi akademik örnekleri yalnız eşdeğer kısıtlar altında içe almak.
4. CP-SAT veya probleme özel branch-and-bound ile alt/üst sınır, optimumluk açığı ve kanıt durumunu gerçek üretim ölçeğine taşımak.
5. Üretim sonuçlarını bağımsız denetimden geçirmeden stok tüketimine izin vermemek.

Bu ilk adımda **ana optimizasyon motoru değiştirilmedi**.

## Geometrik alt sınır regresyonu (v2)

`node tests/geometric-bounds.cjs` komutu, 9 ayrı analitik kontrolü çalıştırır.
Bu kontroller alan alt sınırını, aynı panelde bir arada bulunması imkânsız parçaların
oluşturduğu **çiftli uyumsuzluk grafiği** ile birleştirir. Grafikte bulunan herhangi
bir klikteki tüm parçalar farklı paneller gerektirir; bu yüzden grafikte sezgisel
olarak bulunan klikin büyüklüğü **güvenli bir matematiksel alt sınırdır**.

Örneğin 25 adet 60×60 mm parça için 100×100 mm stoktan alan alt sınırı 9'dur;
ancak hiçbir iki parça aynı panelde bulunamayacağından geometrik sınır 25'tir.
Üretilmiş 25 panelli geçerli bir plan ile alt sınır 25 eşitse **minimum stok adedi
kanıtlanır**. Bu kanıt fire, maliyet veya kullanılabilir artık optimumluğunu kapsamaz.

Yöntem güvenilir ve hızlı kalması için büyük veri kümelerinde en fazla 160 parçayı
uyumsuzluk grafiğine dahil eder. Bu sınırlama **yalnız kanıt gücünü azaltır**;
geçersiz bir optimumluk kanıtına dönüşmez. Kesin arama yürütme bütçeleri ayrı
bir konudur; bu geliştirme onları artırmaz.

Optimizasyon motorundaki `exactRefinePlan` çağrısının testere payını alt sınır
hesabına aktarması ayrıca düzeltildi. Testere payı eksik kalırsa geometrik bağ
güvenli biçimde sıfır pay ile hesaplanır (daha zayıf olabilir, fazla güçlü olmaz).

## V3: Web Worker ile kapsamlı kesin arama

Uygulama, kullanıcıya önce sezgisel yerleşim sonucunu gösterir. Serbest yerleşimde
stok adedi matematiksel olarak henüz kanıtlanmadıysa, `docs/optimization-worker.js`
ayrı tarayıcı iş parçacığında geometrik dal-ayırma araması yürütür.

- Kapsam: bir malzeme grubunda en fazla **12 parça, 4 stok türü, 6 kullanılan stok**.
- Hesaplama süresi üst sınırı: Worker için ~4,2 saniye; ana iş parçacığı
  5,5 saniyede sonlandırır. Düğüm bütçesi 350.000.
- İşlem limitinde durum **unknown/partial** olur; optimumluk iddia edilmez.
- Kullanıcı 'Durdur' ile aramayı iptal edebilir. Girdiler veya proje değiştiğinde
  önceki Worker'ın sonucu geçersiz sayılır.
- Worker'ın bulduğu her yerleşim ana uygulamada tekrar geometrik denetimden geçer.
- Daha az stoklu alternatif mevcut plandan **daha pahalıysa otomatik uygulanmaz**;
  kullanıcı maliyet farkını görür ve 'Alternatifi uygula' ile karar verir.
- Hızlı ilk aşamada mevcut sezgisel iyileştirme korunur; ana iş parçacığındaki
  kısa kesin arama atlanır. Önceki `optimize(data,true)` API'si uyumludur.
- Worker'ın `proved` durumu yalnız serbest yerleşimin minimum **stok sayısı**
  hedefini kapsar. Minimum maliyet, en değerli artıklar veya giyotin kesim
  optimumluğu anlamına gelmez.

Çalıştır:

    node tests/optimization-worker.cjs

Yeni test koşucusu Worker kaynağını sahte Worker ortamında doğrudan çalıştırır;
ayrıca aynı problemler için bağımsız tam sayılı referans çözümleyicisinin
bulduğu optimumu ve bağımsız yerleşim denetimini kontrol eder.
