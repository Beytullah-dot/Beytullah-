# Beythaus Cut — Aşama 0 daire projesi ölçümü

23 Kasım 2026. 60 sentetik proje; her projede levha ve maliyet hedefi. Motor kodu 27d0513c155d87128e18b8718aeb034aea427153.

Üreteç, bağımsız mümkünlük tanığı, güvenli alt sınır ve uzun arama karşılaştırması tamamlandı. Aşama 1 motor değişikliği uygulanmadı. Gerçek Supabase stoklarına, Auth veya üretim kayıtlarına erişilmedi.

## Kabul örneklemi

| Ölçüm | Levha hedefi | Maliyet hedefi |
|---|---:|---:|
| Geçerli tam plan | 40/40 | 40/40 |
| Alt sınır farkı medyan | %8.33 | %14.66 |
| Alt sınır farkı p95 | %21.43 | %27.64 |
| Bilinen en iyi plana uzaklık p95 | %6.25 | %5.88 |
| Bilinen en iyi değerle eşit | 37/40 | 20/40 |
| İlk geçerli plan süresi p95 | 405.58 ms | 421.78 ms |
| En yüksek kısa koşu RSS | 71.30 MiB | 71.20 MiB |

Başlangıç eşikleri medyan alt sınır farkı %10, p95 %20; maliyette bilinen en iyiye p95 uzaklık %5; levhada en az 38/40 eşit ve kalanlarda en fazla 1 fazladır.

| Kabul kapısı | Levha | Maliyet |
|---|---|---|
| Tam plan | Geçti | Geçti |
| Alt sınır farkı | Kaldı | Kaldı |
| Bilinen en iyi plana uzaklık | Kaldı | Kaldı |
| İlk geçerli plan süresi | Geçti | Geçti |
| Bellek | Geçti | Geçti |

Levha hedefinde bilinen en iyiye göre en yüksek fazlalık 1 levhadır.
Uzun koşu referanslarının bile alt sınıra göre p95 farkı levhada %18.18, maliyette %24.58 olmuştur. Bu fark geometrik optimum kaybı olarak yorumlanamaz.

Kabul kapılarının sonucu bu sonlu sentetik örneklem içindir. Yanlış optimum etiketi bu deneyde ölçülmedi; deney üretim sertifika etiketlerini kullanmaz.

## Kapsam ve kaynak

20 geliştirme ve 40 kabul tohumu önceden sabitlendi. Gözlenen kapsam 129–225 parça, 28–65 tip ve 3–5 gruptur. Onaylanan 100–260 / 25–90 / 3–7 zarfının uç değerleri için kapsam açığı sürer.

Ortam linux/x64, v24.22.3, AMD EPYC 9V74 80-Core Processor, 9 mantıksal CPU. Kısa koşular seri, referans koşular 6 eşzamanlı süreçle çalıştı. Başlangıç 2026-11-23T19:32:32.004Z, bitiş 2026-11-23T19:43:22.146Z. Tarih-saatler UTC'dir.

Her hedefin kısa koşu bütçesi 5000 ms. Her proje için ortak uzun aday havuzu 60000 ms ile sınırlandı. Toplam 53380 referans adayı değerlendirildi. İki hedef aynı aday havuzundan ayrı seçildi. Bu, onaylanan proje/hedef başına 60 saniye üst bütçesinin içindedir.

Kaydedilmiş 300 tam plan kayıt denetiminde yeniden fiziksel olarak doğrulandı. Bir proje başına bağımsız tanık, iki kısa plan ve iki referans planı sayılır; özdeş planlar bu sayıda birden fazla bulunabilir. Referans değerleri en iyi bulunan uygulanabilir sonuçlardır. Optimumluk kanıtı olarak kullanılmaz.

Çalıştırılan yerel kaynak commit'i 4d59586eb6b649279581d3730d1c3a34f2595184. Yayımlanan eşdeğer kaynak a3280d4a6c5c497be67e46d3a2e8bbf1f6032116. Eşdeğer kaynak ağacı 2c8207be1ecee87eb7f8b5a663002f18afa824af.

## Tekrarlanabilir girdiler ve kalan risk

Bütün proje/amaç satırları [cases.csv](./commercial-stage0/results/cases.csv) ve [cases.json](./commercial-stage0/results/cases.json) içindedir. [summary.json](./commercial-stage0/results/summary.json) geliştirme ve kabul özetlerini ayrı tutar. [campaign.json.gz](./commercial-stage0/results/campaign.json.gz) seed ile birlikte tam parça/stok listelerini, fiziksel tanıkları, seçilmiş planları ve yakınsama izlerini içerir.

Üretecin parça listesi tasarım varsayımlarından gelir. Sınırlı stok adetleri bağımsız tanığın tüketimine tampon eklenerek oluşturulur. Bu yöntem mümkünlüğü gösterir, saha stok dağılımını kanıtlamaz. Fiziksel doğrulama tam kerfi içeride tutan mevcut modelle yapılır. B1 kenar taşması, masif, otomatik malzeme ataması ve gerçek iPhone bu deneyin açık kapsamlarıdır.

Aşağıdaki örnekler bilinen daha iyi plana göre en yüksek farkı gösteren kabul girdileridir. Bütün eşik aşımları summary.json failures alanındadır.

| Seed | Hedef | Kısa koşu | Bilinen en iyi | Güvenli alt sınır | Bilinen en iyiye fark |
|---|---|---:|---:|---:|---:|
| 930125 | count | 11 | 10 | 10 | %10.00 |
| 930109 | cost | 28367 | 26412 | 26140 | %7.40 |
| 930124 | count | 16 | 15 | 14 | %6.67 |
| 930101 | cost | 26152 | 24557 | 20912 | %6.50 |
| 930108 | count | 17 | 16 | 14 | %6.25 |
| 930124 | cost | 29698 | 28048 | 25335 | %5.88 |
| 930134 | cost | 36099 | 34144 | 28072 | %5.73 |
| 930106 | cost | 32348 | 31290 | 30046 | %3.38 |
| 930138 | cost | 27224 | 26433 | 24388 | %2.99 |
| 930108 | cost | 33358 | 32402 | 26223 | %2.95 |

Yeniden çalıştırma ve yöntem ayrıntıları [README.md](./commercial-stage0/README.md) içindedir. Süre bütçeli aramanın aynı planı bulması makine yüküne bağlıdır. Kaydedilmiş seçilmiş planlar doğrudan yeniden denetlenebilir.

## Sıradaki aşama

Aşama 1 için öneri B1 son kesim fiziğini üç üretim katmanında tutarlı düzeltmek, bağımsız kesim tekrarını taşan son kerfi denetleyecek şekilde geliştirmek ve mevcut bütün alt sınırları gevşetilmiş modelde sınamaktır. Küçük brute-force karşılaştırmalarında iki korunacak parçanın arasındaki yetersiz kerf reddedilmelidir. Aşama 1 kullanıcı onayını bekler.
