# Geometrik alt sınır — 2. aşama raporu

Tarih: 19 Kasım 2026.

## Uygulanan değişiklik

Kesim motorunun `minStockCountLowerBound` işlevine geometrik eşleşmezlik kontrolü eklendi.
Her malzeme grubu için mümkün tüm stok türleri, kalınlık uyumluluğu, döndürme ve
testere payı dikkate alınarak parçaların aynı paneli paylaşabilme durumu hesaplanıyor.
Birbirleriyle ikili olarak bağdaşmayan parçalardan bulunan herhangi bir klik
güvenli matematiksel stok adedi alt sınırı verir.

**Önemli:** Bu, en büyük klik için eksiksiz arama değil; bulunan klik üzerinden
matematiksel olarak geçerli bir alt sınırdır. Üretilmiş geçerli plan aynı alt
sınıra eşitse minimum stok sayısı kanıtlanır. Büyük işlerde 160 parçalık örneklem
üst sınırı yalnız kanıt gücünü azaltır.

## Analitik örnek

| Ölçüt | Eski | Yeni |
|---|---:|---:|
| 25 adet 60×60 mm, 100×100 mm stok için alt sınır | 9 | 25 |
| Oluşturulan geçerli plan | 25 | 25 |
| Minimum stok sayısı kanıtı | Hayır | **Evet** |

## Bağımsız test sonuçları

- Bağımsız oracle karşılaştırması: **72 senaryo, 0 doğruluk hatası**.
- Mümkün 42 problemin 41'inde optimum stok sayısıyla eşleşti.
- Giyotin kesimde karma stok maliyeti önceliği nedeniyle 1 kalite açığı devam ediyor.
- Eklenen analitik geometrik alt sınır kontrolleri: **9/9 başarılı**.
- Testere payının kesin arama alt sınırı çağrısına aktarılması düzeltildi.
- GitHub Actions, geometrik alt sınır testini ve bağımsız oracle karşılaştırmasını
  çalıştıracak şekilde güncellendi.

Bu sonuçlar test koşucusunda doğrulandı. GitHub Actions'ın uzak CI sunucusundaki
çalışma sonucu ayrıca doğrulanmalıdır.

## Sıradaki teknik işler

1. Kesim modu ve optimizasyon hedeflerini kesin olarak ayır: minimum stok sayısı,
   malzeme maliyeti, brüt fire, değerlendirilebilir artıklar.
2. Daha büyük projelerde kesin aramayı ana UI'yi bloklamadan Web Worker içinde
   ayrı çözümleme bütçesiyle çalıştır.
3. Dal-sınır araması için ikili eşleşmezlik ve alan alt sınırlarını birlikte kullan;
   optimumluk sertifikasına hedef türünü ve son işlem sınırını ekle.
4. Akademik benchmark kümelerindeki aynı kısıtlı örneklerle performansı ölç.
