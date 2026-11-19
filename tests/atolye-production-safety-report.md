# Beythaus Cut — Atölye kesilebilirlik hatası / 19 Kasım 2026

## Kullanıcı tarafından tespit edilen saha problemi

19 Kasım 2026 tarihli **Atölye projesi** PDF'si 11 dikdörtgen parçayı
3000 × 300 × 30 mm stok üzerinde, 3 mm testere payıyla **bir panelde**
gösteriyordu (%80,3 geometrik verim).

PDF **Serbest yerleşim** modundaydı. Bu mod yalnız dikdörtgenlerin bir arada
sığmasını hesaplıyordu; sahada panel testeresiyle zorunlu olan her kesimin
**o anda kesilen stokun/alt stokun bir kenarından karşı kenarına kesintisiz
devam etmesi** kuralını garanti etmiyordu.

Her parça sınırı testere kesim çizgisi değildir. Serbest yerleşimin
minimum stok sayısı kanıtı, üretim uygulanabilirliği kanıtı değildir.
PDF'deki zayıflık, bu taslağın **ÜRETİM DOSYASI** başlığıyla indirilebilmesiydi.

## Bağımsız tekrar üretim

| Ölçüt | Serbest yerleşim | Kenardan kenara giyotin kesim |
|---|---|---|
| Net parça | 11 | 11 |
| Stok ölçüsü | 3000 × 300 mm | 3000 × 300 mm |
| Testere payı | 3 mm | 3 mm |
| Kullanılan stok | 1 | 2 |
| Yerleşim geometrik olarak geçerli | Evet | Evet |
| Üretim kesim ağacı mevcut | **Hayır** | Evet |
| Başka bir stok gerekliliğinin kanıtı | Uygulanamaz | **Tek stok imkânsızlığı kanıtlandı** |

Kesin giyotin ağacı taraması, tek 3000 × 300 mm stok için bütün
kenardan kenara kesimleri **259.070 arama düğümünde** eledi;
bütçe aşımı olmadan `infeasible` ile tamamlandı.
İki stoklu hızlı plan, bağımsız giyotin kesim ağacı kontrolünü geçti.
Bu sonuç **sınırsız aşamalı dikdörtgen giyotin kesim modeli** için geçerlidir;
her makine türü veya farklı teknoloji için genel imkânsızlık anlamına gelmez.

## Uygulanan güvenlik düzeltmeleri

- **Yeni projelerin varsayılan kesim modu Düz kesim** olarak değiştirildi.
- Kullanıcının mevcut Serbest yerleşim projeleri korunuyor, ancak ekranda
  **ÜRETİME UYGUN DEĞİL** uyarısı gösteriliyor.
- Tek tıkla **Düz kesim planı oluştur** eylemi eklendi.
- Serbest yerleşim veya eksik parçalı çıktı **ÜRETİM DOSYASI** adıyla
  üretilemiyor; indirilen PDF artık **YERLEŞİM TASLAĞI · ÜRETİME UYGUN DEĞİL**
  olarak etiketleniyor, güçlü uyarı ve filigran taşıyor.
- PDF dosya adına `TASLAK-` öneki geliyor.
- Düz kesim PDF'sinde fiziksel **kesim sırası** ve artıklar korunuyor.
- Her fiziksel kesim mevcut alt stokun karşı kenarına ulaşıyor mu
  `auditGuillotineCuts` tarafından yeniden yürütülerek doğrulanıyor.
- Bulut envanterinde fiziksel üretim kaydı zaten yalnız Düz kesim
  moduna izin veriyordu; kısıt korundu.
- PWA önbelleği `v16-production-safe` sürümüne çıkarıldı.

## Regresyon testi

`node tests/atolye-production-safety.cjs`:

1. Serbest mod 1 stok, 0 üretim kesimi üretir.
2. Düz kesim modu 2 stok ve fiziksel kesim ağacı üretir.
3. Kesin arama bir stokun imkânsızlığını kanıtlar.
4. Bilerek kısaltılmış kesim çizgisi kesim denetiminde reddedilir.
5. Serbest PDF üretim dosyası başlığı alamaz ve zorunlu filigran taşır.
6. Düz kesim PDF fiziksel kesim planı olarak çıkar.
7. Eski serbest projelerin arayüz uyarısı görünür, yeni varsayılan düz kesimdir.

8 otomatik test ailesinin tamamı (optimizasyon, Worker, ekonomi,
geometri, giyotin, PDF güvenliği, sıralama ve regresyon) yeniden geçti.

**Sınırlama:** Testler kaynak kodu ve PDF nesne temsili üzerinde
gerçekleştirildi. Yeni PDF'nin iOS Safari üzerinde oluşturulup açılması
ve sahada makine/bağlama koşullarıyla uygulanabilirliği ayrıca
doğrulanmalıdır. Eski indirilen PDF kendiliğinden güncellenmez.
