# Başlangıç optimizasyon doğrulama raporu

Tarih: 19 Kasım 2026. Kaynak: `docs/index.html`, bağımsız oracle: `tests/optimization-oracle.cjs`.

| Ölçüt | Sonuç |
|---|---:|
| Toplam test | 72 |
| Referans optimumu bilinen, mümkün örnekler | 42 |
| Referans tarafından imkânsız bulunan örnekler | 30 |
| Optimum stok sayısıyla eşleşen mümkün örnekler | 41 / 42 |
| Geometrik/üretim planı doğrulama hatası | 0 |
| Yanlış stok optimumluğu kanıtı | 0 |
| Yanlış minimum brüt alan kanıtı | 0 |
| Stok sayısı kanıtı üretilen örnekler | 32 |
| Brüt alan kanıtı üretilen örnekler | 21 |
| Referans arama bütçesi tükenen örnekler | 0 |
| İyileştirme fırsatı (QUALITY) | 1 |

**QUALITY örneği:** Serbest yerleşime kıyasla düz kesim, 50×100 cm boyutunda iki adet parçayı tek 100×100 cm stok yerine iki 50×100 cm stoktan yerleştirdi. Her iki düzen de geçerli; fakat minimum stok adedi hedefi bakımından 2 yerine 1 stok mümkündür. Mevcut seçim önceliği düşük maliyeti tercih ettiği için bu sonuç tek başına geçersiz plan hatası değildir. Hedef fonksiyonu netleştirilmelidir.

**Yorum:** 72 geçerli denetim, 72 eksiksiz yerleşim demek değildir; 30 senaryoda bağımsız çözümleyici yerleşimi imkânsız bulmuştur. Bunlarda uygulamanın da optimumluk kanıtı üretmemesi kontrol edilmiştir.

**Ölçüm sınırları:** Küçük, tam sayılı bir test kümesidir. Evrensel optimumluk garantisi, genel doğruluk veya üretimde güvenlik sertifikası değildir. CI iş akışının GitHub sunucusunda başarılı çalıştığı ayrı doğrulanmalıdır.

Testin tekrarı: `node tests/optimization-regression.cjs --json optimization-report.json`.
