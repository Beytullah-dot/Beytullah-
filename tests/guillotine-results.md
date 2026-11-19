# Beythaus Cut — Kesin giyotin çözümleyici / 4. aşama raporu

Tarih: 19 Kasım 2026.

## Yapılan geliştirmeler

- Düz kesim için `docs/guillotine-exact.js` adlı bağımsız kesin giyotin
  kesim ağacı çözümleyicisi eklendi. Serbest yerleşimden farklı olarak
  kesim sırası, koordinatlar ve kalan stok dikdörtgenleri beraber üretiliyor.
- En küçük kesim desenleri alt-küme dinamik programlaması ve Pareto
  genişlik/yükseklik sınırıyla aranıyor. Birden fazla stok türü, döndürme,
  malzeme, kalınlık, testere payı ve kenar payı dikkate alınıyor.
- 'Giyotin olamaz' kararı ancak kapsamlı desen taraması tamamlandığında
  kanıt sayılıyor. Arama sınırına takılan veya fiziksel kesime dönüştürülemeyen
  desenler UNKNOWN/partial olarak kalıyor.
- Worker, daha iyi planı uygulamaya gönderebiliyor; ana uygulama kesim
  adımlarını bağımsız denetimiyle yeniden yürütüyor.
- Minimum stok sayısı ile maliyet farklı hedefler: daha pahalı veya
  maliyeti bilinmeyen alternatifler kullanıcı onayı olmadan uygulanmıyor.
- Serbest yerleşim Worker kapsamı 12 parçadan 14 parçaya, 6 stoktan 7 stoka
  genişletildi; giyotin modu için 11 parça, 4 stok türü, 5 stok limiti var.
- Giyotin Worker hesaplama bütçesi 6,5 sn / 500.000 düğüm; ana uygulama
  8 sn'de aramayı sonlandırıyor.

## Test sonuçları

| Test | Sonuç |
|---|---:|
| Bağımsız referansla karşılaştırılan giyotin senaryosu | 28 |
| Referans çözümü bulunan giyotin senaryosu | 18 |
| Referans tarafından imkânsız bulunan giyotin senaryosu | 10 |
| Giyotin Worker'ın test edilen doğru optimumluk iddiası | 18 |
| Ek analitik büyük örnek (9/10/11 parça) | 3/3 başarılı |
| Giyotin Worker'ın bulduğu panel tasarrufu örneği | 1 |
| Bozuk kesim sırasının ana uygulamada reddi | Başarılı |
| İşlem sınırında yanlış ispat | 0 |
| Kesimle ayrılamayan dar artıkta yanlış ispat | 0 |
| Önceki bağımsız genel regresyon | 72 senaryo, 0 doğruluk hatası |
| Geometrik alt sınır testleri | 9/9 başarılı |
| Önceki serbest yerleşim Worker testleri | 17/17 başarılı |

Örnek: 9, 10 veya 11 adet 40×40 mm parça, 100×100 mm stoktan 3 panel
gerektiriyor. Alan alt sınırı 2 paneli dışlamaz; kesin giyotin kesim ağacı
taraması iki panelin imkânsızlığını kanıtladı.

Örnek: 2 adet 50×100 mm parça, aynı malzemeden 1 adet 100×100 mm
panelden tek düşey kesimle elde edildi; alternatifin doğrulanan minimum
stok sayısı 1'dir. Ancak bu panel, iki adet ucuz 50×100 stoktan pahalıysa
uygulama bunu kullanıcının onayına bırakır.

## Sınırlar

- Kanıt, sınırsız aşamalı tam düz kesim modelinde **minimum panel sayısı**
  için geçerlidir. Minimum maliyet, minimum fire veya en kullanışlı artık
  parçaların bulunmasını tek başına ispatlamaz.
- Büyük her proje kesin çözülebilir değil: süre veya işlem sınırı dolduğunda
  'kanıt yok' durumu korunur.
- CNC takım erişimi, iş güvenliği, makine bağlama ve damar yönü gibi
  fiziksel koşullar ayrıca doğrulanmalıdır.
- Testler bağımsız JS çalıştırılmasıyla yapıldı. Gerçek iPhone/Android
  tarayıcısında uçtan uca Worker akışı ve uzak GitHub Actions sonucu
  henüz ayrıca doğrulanmış değil.

## Sonraki aşamalar

1. Giyotin desenlerinin sanayi tipi 2/3 aşamalı kesim kısıtlarını modelle.
2. Çok malzemeli büyük projelerde alt sınır/senaryo ayrıştırmasını güçlendir.
3. Test kümesini akademik kesme-yerleştirme benchmarkları ve gerçek
   atölye siparişleriyle genişlet.
4. Kesin aramada daha düşük maliyet ve geri kazanılabilir artık hedeflerini
   ayrı ve kanıtlanabilir optimizasyon problemleri olarak ele al.
