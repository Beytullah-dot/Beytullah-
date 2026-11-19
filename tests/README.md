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
