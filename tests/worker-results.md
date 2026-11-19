# Web Worker kesin arama — 3. aşama doğrulaması

Tarih: 19 Kasım 2026. Ana dal: `master`.

## Uygulama

- Hızlı sezgisel çözüm ve stok/yerleşim iyileştirme kullanıcıya önce gösterilir.
- İleri düzey serbest yerleşim (`nest`) kesin araması `docs/optimization-worker.js`
  içinde Web Worker ile yürütülür; ana iş parçacığını işgal etmez.
- Arama sınırlaması (malzeme grubu başına): 12 parça, 4 stok türü, 6 kullanılan stok.
- Worker arama bütçesi 4,2 saniye / 350.000 düğüm; 5,5 saniye sonra
  ana iş parçacığı sert iptal uygular.
- Süre veya düğüm limitinde kesin optimumluk iddia edilmez.
- Girdiler değiştiğinde, yeniden hesaplama başladığında veya kullanıcı
  'Durdur' dediğinde eski Worker sonlandırılır; geç gelen sonuç reddedilir.
- Worker tarafından gönderilen alternatifler ana uygulamada geometri, malzeme,
  parça sayısı, testere payı ve stok miktarı açısından yeniden doğrulanır.
- Daha az stok kullanan sonuç daha pahalıysa **otomatik uygulanmaz**;
  kullanıcıya farkı gösterilir ve 'Alternatifi uygula' düğmesi sunulur.
- Fiziksel üretime uygunluk yalnızca modeldeki kurallarla sınırlıdır.

## Doğrulamalar

| Test | Sonuç |
|---|---:|
| Analitik geometrik alt sınır testleri | 9/9 geçti |
| Bağımsız kesim optimizasyonu senaryoları | 72 |
| Geçersiz plan veya yanlış kanıt | 0 |
| Bilinen optimumla eşleşen mümkün testler | 41/42 |
| Worker özel testleri | 17 kontrol geçti |
| Worker tarafından işlenen eksiksiz problem | 16 |
| Worker'ın bulduğu stok adedi iyileştirmesi | 1 |
| Bilerek bozulan Worker yerleşiminin reddi | Başarılı |

**Bilinen kalan kalite açığı:** Düz kesim modunda minimum stok sayısı,
daha düşük satın alma maliyeti karşısında öncelik almıyor.
Bu üretim planının geometrik doğruluk hatası değil, hedef fonksiyonu tercihidir.
Serbest yerleşim Worker'ı düz kesim optimumluğunu **kanıtlamaz**.

## Sınırlar ve sonraki adımlar

- Tarayıcıdaki gerçek iOS/Android animasyonu, klavye veya çevrimdışı Worker
  yüklenmesi için uçtan uca fiziksel cihaz testi henüz yapılmadı.
- GitHub Actions iş akışı eklendi; bu rapor yazılırken uzak sunucu sonucu
  doğrulanmış değildi.
- Büyük problemleri kapsamak için örnekleme/ayrıştırma, güçlü alt sınırlar,
  kesirli koordinat sağlamlığı ve ayrı giyotin kesin çözüm yöntemi geliştirilecek.
- **Minimum panel sayısı** kanıtı minimum brüt fire, maliyet veya
  kullanılabilir artık optimumluğu anlamına gelmez.
