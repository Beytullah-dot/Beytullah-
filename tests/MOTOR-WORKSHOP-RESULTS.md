# Atölye koşullarında karma giyotin kesim ölçümü

20 Kasım 2026. Ölçü birimi mm. 26 sentetik işin 26’sında tüm parçalar
yerleşti ve iki ayrı kesim ağacı denetimi geçti. Minimum levha sayısı 16
işte kanıtlandı. On işte alt sınırla bulunan kesilebilir plan arasındaki
fark 1–4 levha. Bu farkın tamamının geri kazanılabileceği bilinmiyor.

İlk 12 işte üç farklı stok ebadı ve sonlu stok adetleri, 3 mm testere
payı, her kenarda 2–5 mm pay, boyuna/enine/serbest parça yönleri birlikte
kullanıldı. Parçalar bilinen giyotin kesimlerinden üretilip karıştırıldı.
Dış şeritler 12, 130 veya 240 mm. İki ek işte aynı projede 18 mm panel
ve 32 mm masif ayrı stoklardan kesildi. Diğer 12 küçük tamsayı örneğinde
1–2 mm testere payıyla bağımsız tam tarama uygulandı. Dördünde 1,
dördünde 2 ve dördünde 3 levha gerekti. Motor her birinde referansa ulaştı.

## Üretim motorunun sonuçları

| İş | Parça | Kullanılan levha | Kanıtlı alt sınır | Fark | Brüt kullanılmayan alan (mm²) |
|---|---:|---:|---:|---:|---:|
| planted-0 | 20 | 5 | 5 | 0 | 199405 |
| planted-1 | 80 | 10 | 10 | 0 | 483660 |
| planted-2 | 399 | 25 | 25 | 0 | 1498221 |
| planted-3 | 40 | 10 | 10 | 0 | 517500 |
| planted-4 | 40 | 5 | 4 | 1 | 1378495 |
| planted-5 | 159 | 9 | 8 | 1 | 1541710 |
| planted-6 | 100 | 23 | 19 | 4 | 4334447 |
| planted-7 | 80 | 9 | 8 | 1 | 1550980 |
| planted-8 | 80 | 4 | 3 | 1 | 1090009 |
| planted-9 | 40 | 7 | 6 | 1 | 1409312 |
| planted-10 | 200 | 16 | 14 | 2 | 3086749 |
| planted-11 | 158 | 7 | 6 | 1 | 1233867 |
| oracle-0 | 4 | 1 | 1 | 0 | 195 |
| oracle-1 | 4 | 2 | 2 | 0 | 108 |
| oracle-2 | 5 | 3 | 3 | 0 | 140 |
| oracle-3 | 4 | 1 | 1 | 0 | 257 |
| oracle-4 | 4 | 2 | 2 | 0 | 94 |
| oracle-5 | 5 | 3 | 3 | 0 | 158 |
| oracle-6 | 4 | 1 | 1 | 0 | 211 |
| oracle-7 | 4 | 2 | 2 | 0 | 112 |
| oracle-8 | 5 | 3 | 3 | 0 | 144 |
| oracle-9 | 4 | 1 | 1 | 0 | 275 |
| oracle-10 | 4 | 2 | 2 | 0 | 98 |
| oracle-11 | 5 | 3 | 3 | 0 | 162 |
| two-materials-5 | 80 | 10 | 8 | 2 | 2841870 |
| two-materials-10 | 160 | 18 | 16 | 2 | 3027512 |

Brüt kullanılmayan alan, satın alınan levhaların brüt alanından parça
alanlarının çıkarılmasıyla bulunur. Listelenen kanıt yalnız levha sayısı
içindir. Yeniden kullanılabilir artık ve satın alma maliyeti farklı hedeflerdir.
Rapor fiziksel atölye denemesini temsil etmez.

## Testere payını içeren alan alt sınırı

Testere payı k ise dikey kesimde W = A + k + B olduğundan
W + k = (A + k) + (B + k). Yatay kesimde aynı eşitlik yükseklik için
geçerli. Ağacın her dikdörtgenine iki eksende k eklenince genişletilmiş
yaprak alanları toplamı kökün genişletilmiş alanını aşamaz. Artık yaprakları
dışarıda bırakmak geçerli bir gevşetmedir. Bu nedenle gerekli parça alanı
Σ(l+k)(w+k), kullanılabilir levha kapasitesi (L−2t+k)(W−2t+k) ile
karşılaştırılır (t her kenardaki pay). Elde bulunan miktarlar kadar en
büyük kapasiteler önce sayılır. Bu ölçüm tam sayı girdilerinde BigInt
ile yapılır. Kesirli girdilerde mevcut alt sınırlar kullanılır. 399 parçalık
işte alt sınır 24'ten 25'e çıktı ve denetlenen 25 levhalık plana ulaştı.

Yeniden çalıştırmak için `node tests/motor-workshop.cjs`. Her satır tam
planı, alt sınırı, levha farkını, brüt alanı, örnek fiyatlarla maliyeti ve
o çalıştırmanın süresini bildirir. Referans yazılım testere payından daha
dar pozitif bir şeridi kesilebilir artık olarak saymaz.

## Adet ve veri bütünlüğü

`node tests/motor-workshop.cjs --quantity-probe` doğrudan motora sırasıyla
1.500, 1.501 ve 2.001 özdeş 22×22 mm parça verir. 3 mm testere ve 2 mm
kenar payıyla 104×104 mm stokta sırasıyla 94, 94 ve 126 tam levha planı
elde edildi. Form ve PDF bu deneyin dışında. Tekrarlı küçük parçalara ait
sonuçlardan heterojen işler veya iPhone kapasitesi için bir üst sınır çıkarılamaz.

Proje okuma/yeniden açmada 250 parça satırı, 100 stok satırı ve 800 stok
seçimi sonrasında veriyi sessizce kesen işlemler kaldırıldı. WebKit
regresyonu 251 parça satırı, 101 stok satırı ve 802 kimliklik seçimi
kaydetme/yeniden açmada denetler. Eski bir kayıtta önceden kesilip
üzerine yazılmış satırlar bu değişiklikle geri kazanılamaz.

Girdi doğrulamasında halen toplam 1.500 parça, parça satırında 2.000 adet
ve stok satırında 99.999 adet kontrolü var. Üretim onayına ait ayrı sunucu
işlem sınırları bu ölçüme dahil değil. Yüksek adet için sonraki iş,
kopyaları belleğe tek tek açmadan miktarla çalışmak ve planı, denetimi,
arayüzü ve PDF’yi bu temsil üzerinden sınamak.
