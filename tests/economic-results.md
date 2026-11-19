# Beythaus Cut — Ekonomik optimizasyon / 5. aşama

Tarih: 19 Kasım 2026.

## Uygulanan geliştirmeler

- `docs/economic-exact.js` ile stok adedinden ayrı **en düşük ilave stok edinme maliyeti**
  için kesin ve süre sınırlı arama getirildi.
- İki fiyat modu destekleniyor: ₺/panel veya stok hacmi × ₺/m³.
- Envanterden gelen mevcut artık stoklar, uygulamanın mevcut maliyet modelinde
  ilave tedarik maliyeti 0 olarak ele alınıyor (tarihî/ikame değerleri değil).
- Aynı malzeme grubunda, mevcut plandan **daha fazla panel** kullanan
  ancak daha ucuz stok kombinasyonlarına da izin veriliyor.
- Daha ucuz stok kombinasyonları serbest yerleşim ve giyotin kesim için
  ayrı kesin geometrik çözümleyicilerle sınanıyor.
- Kesin aday ana iş parçacığında yeniden denetleniyor; hatalı koordinat,
  malzeme, fiyat sertifikası veya giyotin kesim ağacı reddediliyor.
- Optimum maliyet kanıtı ayrı tutularak minimum panel sayısı, brüt fire
  ve kullanılabilir artık optimumluğuna taşınmıyor.
- Fiyatı belirsiz herhangi kullanılabilir stok veya aşılmış işlem bütçesi
  varsa sonuç `partial`/`unknown-price` olarak kalıyor.
- Daha ekonomik alternatif için ayrı **Ekonomik planı uygula** onayı var.
- Kapsam: malzeme grubu başına 13 serbest veya 10 giyotin parça,
  en fazla 3 stok türü, mevcut planda en fazla 7 panel.
- Ekonomik kesin arama Web Worker içinde çalışıyor. Stok sayısı araması
  tamamlandıktan sonra çalışarak telefon işlemcisi rekabetini azaltıyor.
- Kullanıcı kesim planı ayarlarında isteğe bağlı **₺/m² yeniden kullanım
  değeri** girebiliyor. Yalnız düz kesimde eşikleri geçen artıkların alanı
  üzerinden varsayımsal kredi/net maliyet senaryosu hesaplanıyor.

## Kritik muhasebe ayrımı

Bu ispatın hedefi **ilave stok edinme bedeli**dir; işletmenin tüm maliyetleri
(işçilik, kerf kaynaklı yeniden işleme, makine süresi, bantlama, taşıma,
vergi, depolama, stok riski) mevcut hedef fonksiyonunda değildir.
Kullanılabilir artıkların varsayımsal değerleri gerçekleşmiş nakit akışı
veya kanıtlanmış tasarruf sayılmaz, kesin maliyet hedefine düşülmez.

## Bağımsız doğrulama sonuçları

| Test ailesi | Sonuç |
|---|---|
| Kesin ekonomik Worker karşılaştırması | 36 doğru optimum iddiası |
| Belirsiz fiyat/yarıda kalan arama/kombinasyon limiti | 4 duruma kanıt verilmedi |
| Ekonomik ana ekran kabulü | 2 kesim modu geçti |
| Kasıtlı bozuk parça, maliyet veya kesim sırası | Reddedildi |
| Worker sıralama/iptal yaşam döngüsü | 3 senaryo geçti |
| Geometrik alt sınır | 9/9 |
| Serbest yerleşim Worker | 17/17 |
| Giyotin Worker | 28 referans + 3 büyük analitik örnek |
| Önceki genel regresyon | 72 senaryo, 0 doğruluk hatası |

## Önemli örnek

2 adet 50×100 mm parça için 1 adet 100×100 mm panelin fiyatı 100 ₺,
2 adet 50×100 mm stokun her birinin fiyatı 25 ₺ ise:

- **Minimum panel sayısı:** 1 panel — 100 ₺.
- **Minimum ilave stok tedarik maliyeti:** 2 panel — 50 ₺.
- Ekonomik plan 1 panel fazla kullanır ama 50 ₺ daha az stok edinme bedeli
  gerektirir. Bu fark, fiziksel kesim ve bağımsız maliyet testleriyle doğrulandı.

## Açık sınırlamalar

- Her büyüklükte problemi kesin çözme garantisi yok. İşlem/süre sınırlarında
  ekonomik optimumluk kanıtı üretilemez.
- Kesin kurtarılabilir artık değerini optimize etme **henüz uygulanmadı**;
  yalnız kullanıcı fiyat varsayımıyla ekonomik senaryo gösteriliyor.
- Canlı iOS/Android uçtan uca tarayıcı testi ve GitHub Actions'ın uzaktaki
  çalışma sonucu bu rapor yazılırken doğrulanmadı.

## Sıradaki hedef

İşçilik, makine zamanı, kesim başı maliyet, stok tedarik/teslimat maliyeti ve
yeniden kullanılabilir artıklar için beklenen kullanım olasılığını hesaba katan
çok hedefli ekonomik model. Önce şeffaf varsayımlar ve veri girişi, sonra
kanıtlanabilir karma hedef fonksiyonları ve benchmarklar.
