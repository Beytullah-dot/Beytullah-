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

## V4: Kesin giyotin kesim ağacı araması

`docs/guillotine-exact.js` artık Düz Kesim modu için ayrı ve sınırlı
**kesin alt problem çözümleyicisi** sunar. Serbest yerleşim çözümleyicisini
giyotin kesime yanlış biçimde uyarlamak yerine, ikiye ayrılabilen parçaların
kesim ağacını ayrı modelleyerek tüm uygun aday ağaçları tarar.

- Parçalar 90 derece döndürme izinleriyle (varsa) ele alınır.
- Her iç kesim yatay veya düşeydir ve kaynak dikdörtgenin tamamından geçer.
- Testere kalınlığı, kenar payı, malzeme/kalınlık ve stok miktarı uygulanır.
- Alt küme dinamik programlaması ve Pareto boyut sınırlarıyla gereksiz geometrik
  desenler elenir. Aynı minimum stok sayısında daha düşük maliyet kanıtlanmaz.
- Kesin arama **fiziksel kesim sırasını, parça koordinatlarını ve artık
  dikdörtgenlerini** birlikte üretir. Ana uygulama çıkan her kesim adımını
  bağımsız giyotin denetleyicisinde yeniden oynatır.
- Kesim deseni uygun görünüyor fakat fiziksel kesim ağacı üretilemiyorsa
  sonuç **UNKNOWN** olur; bu durum matematiksel imkânsızlık olarak sunulmaz.
- Süre/düğüm sınırına takılan sonuç asla `infeasible` veya `optimal` sayılmaz.
- Malzeme grubu başına sınır **11 parça, 4 stok türü, 5 mevcut stok**;
  serbest yerleşim Worker sınırı **14 parça, 4 stok türü, 7 mevcut stok**.
- Düz kesimin daha kapsamlı araması 6,5 saniye / 500.000 düğümle
  sınırlandırılır ve tarayıcıda ayrı iş parçacığında çalışır.
- Yeni alternatif daha pahalıysa veya maliyet bilinmiyorsa kullanıcı onaylamadan
  mevcut kesim planının yerine geçirilmez.

Test komutu:

    node tests/guillotine-worker.cjs

Bu testler bağımsız Oracle'ın giyotin ağacı araştırmasıyla karşılaştırma,
kesim adımlarının yeniden oynatılması, kasıtlı bozuk kesimin reddi ve
9, 10, 11 parçalık daha büyük geometrik örneklerin optimumluğunun
kanıtlanmasını kapsar.

**Kapsam sınırı:** Bu kanıt, yazılımdaki sınırsız seviyeli, tam yatay/düşey
kesimli giyotin modeline ilişkindir. Endüstrideki iki/üç aşamalı kesim,
kesim yönüne bağlı lif yönü, makine çeneleri veya fiziksel parça tutma
zorunlulukları ayrıca modellenmelidir. Dolayısıyla geometrik kesim ağacı
sertifikası tek başına atölye iş güvenliği sertifikası değildir.

## V5: Kesin tedarik maliyeti ve tahmini artık değeri

`docs/economic-exact.js`, stok sayısından **bağımsız** minimum
**ek stok tedarik maliyeti** hedefini arar. Panel fiyatı veya m³ üzerinden
hesaplanan panel maliyeti kullanılır. Envanterden gelen mevcut artık stok
modele göre ilave tedarik maliyeti sıfır kabul edilir.

- Malzeme grubu başına 13 serbest / 10 giyotin parçası, en fazla 3 stok türü
  ve başlangıç planında en fazla 7 stok bulunabilir.
- Daha ucuz çözümün mevcut plandan **daha fazla stok** kullanmasına izin verilir.
- Stok türü çoklu kümeleri, daha ucuz tüm maliyet seçenekleri bitene kadar
  taranır; her alternatif önceki kesin serbest veya giyotin çözümleyicisiyle
  geometrik olarak kontrol edilir.
- Kombinasyon, düğüm veya süre sınırı dolarsa durum **partial** olur;
  minimum maliyet ispatı yapılmaz.
- Fiyatı bilinmeyen herhangi bir kullanılabilir stok türü varsa
  tüm seçenekler karşılaştırılamayacağından **optimumluk kanıtı verilmez**.
- Çözümleme asıl planı değiştirmez; daha düşük maliyetli alternatif
  'Ekonomik planı uygula' onayıyla seçilir.
- Kesin maliyet optimumluğu asla minimum panel sayısı, brüt fire ya da
  kullanılabilir artık değerinin optimumluğu olarak sunulmaz.

Kesin ekonomik optimizasyonun maliyet fonksiyonu yalnız stok edinme
bedelini kapsar. Kesim işçiliği, enerji, taşıma, bantlama, vergi ve fiili
stok finansman/işletme maliyetleri yoktur. Bu veriler modele eklenmeden
'işletme toplam maliyeti' için optimumluk iddiası kurulamaz.

Kullanıcı proje ayarlarında kullanılabilir artıklara **isteğe bağlı
₺/m² yeniden kullanım değeri varsayımı** girebilir. Bu değer yalnız
giyotin kesimde eşik değerleri geçen fiziksel artık alanına uygulanır.
Sonuçlar `tahmini / varsayımsal net maliyet` etiketi taşır; satılmış
veya gerçekten tüketilmiş stok değeri olarak kabul edilmez.
Bu varsayımsal net maliyet şimdilik kesin maliyet çözümleyicisinin
hedef fonksiyonu değildir.

Test komutları:

    node tests/economic-worker.cjs
    node tests/economic-acceptance.cjs

Birincisi fiyat karşılaştırmasını bağımsız koordinat/kesim ağacı oracle'ıyla
doğrular. İkincisi ana uygulamanın ekonomik adayı kabul ederken sahte
yerleşimleri, fiyatları ve kesim sıralarını reddettiğini sınar.
