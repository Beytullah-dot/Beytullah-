# Daire projesi ölçümü

Bu çalışma 23 Kasım 2026'da onaylanan Aşama 0 deneyidir. Üretim motoruna algoritma değişikliği içermez. Sentetik mobilya modüllerinden parça listesi, sonlu stok, bağımsız fiziksel tanık ve ölçüm raporu üretir.

## Çalıştırma

Node 22 veya 24 gerekir. Dış paket ve canlı bağlantı gerekmez.

```sh
node tests/commercial-stage0/selftest.cjs
node tests/commercial-stage0/run.cjs /tmp/beythaus-stage0 --pilot
node tests/commercial-stage0/run.cjs /tmp/beythaus-stage0-full
node tests/commercial-stage0/summarize.cjs /tmp/beythaus-stage0-full
```

Tam koşu 20 geliştirme ve önceden sabitlenmiş 40 kabul tohumu kullanır. Kısa koşular seri çalışır. Her projenin levha ve maliyet hedeflerine beşer saniye arama bütçesi verilir. İlk üretim `optimize(..., true, false, objective)` çağrısı sonrasında eksikse yapıcı Worker, tamamsa sayım Worker'ı, maliyet hedefinde ardından ekonomi Worker'ı çağrılır. Yeni güvenli alt sınır Worker aramasını yönlendirmez. Bütün adayları bağımsız doğrulayıcı değerlendirir. Worker durumları raporda saklanır. Bu deney gerçek tarayıcının zamanlama, iptal, ekran ve ağ davranışlarını ölçmez.

Uzun koşuda proje başına 60 saniyelik ortak aday havuzu kullanılır. Havuz bağımsız geometrik yapıcıyı, üç üretim hedefinin farklı parça/stok sıralarıyla yeniden çalıştırılmasını, bağımsız mümkünlük tanığını ve iki kısa koşunun tam planlarını içerir. Her aday tekrar bağımsız denetlenir. Havuzdan levha ve maliyet hedefleri ayrı seçilir. Bu tercih, iki hedef için ayrı 60 saniyelik aramaya göre daha düşük toplam bütçe kullanır. Aynı aday havuzu üzerinden hedefler doğrudan karşılaştırılabilir.

Altı referans süreci eşzamanlı çalışır. Kısa koşu gecikme istatistikleri bu süreçler başlamadan ölçülür. Çocuk süreç bütçesi yükleme ve fiziksel denetimi içerir. Süre aşımı daha önce kaydedilmiş geçerli adayı silmez. Ana süreç işletim sistemi başlangıcı için 250 ms ek süre tanır. Tablodaki duvar süresi bu farkı içerir. Tepe RSS süreç genelindedir. Uzun koşuların hızları eşzamanlı CPU yükünden etkilenir.

## Girdiler ve sınırlar

`generator.cjs` modül ölçülerini ve bütün tohumları tanımlar. Onaylanan başlangıç zarfı 100–260 fiziksel parça, 25–90 farklı tip, 3–7 malzeme/dekor/kalınlık grubudur. Mevcut 60 tohumda gözlenen kapsam 129–225 parça, 28–65 tip ve 3–5 gruptur. Uç değerler ayrıca sınanmalıdır. Dağılım gerçek sipariş kayıtlarından türetilmemiştir. Aynı malzeme ve kalınlıktaki farklı odaların parçaları birlikte kesilir. Kalınlıklar 18 ve 8 mm, stoklar 2800×2100 ve 3660×1830 mm, artık stoklar 1400×900 ve 1800×650 mm'dir. Kerf 3, 3.2 veya 4 mm; trim her kenarda 0, 5 veya 10 mm'dir. Fiyatlar sentetiktir.

Bağımsız yapıcı, modüllerden üretilmiş parçaları kesim ağacına yerleştirir. Sınırlı stok adedi bu tanığın kullandığı stok miktarına küçük bir tampon eklenerek oluşturulur. Üretim motoruna yalnız parça/stok listesi verilir. Bu stok üretimi mümkünlük sağlar, kıt stok dağılımının saha temsilciliğini kanıtlamaz. Mevcut tanık ve doğrulayıcı tam kerfi yaprak içinde tutar. B1'in dar artık sınırları ayrı regresyonda ele alınmalıdır.

## Bağımsızlık ve metrik

`reference.cjs` üretim yerleşim veya sertifika algoritmasını çağırmadan yapıcı plan ve alt sınır üretir. Alt sınır her uyumlu grupta tüm tamsayılı stok kombinasyonlarını tarar. Toplam kullanılabilir stok alanının parça alanını karşılamasını ister. Kerf, yön ve şekil kısıtları gevşetildiği için kenar taşmasına izin veren fiziksel modelde de güvenli alt sınırdır. Bir grubun optimumluğuna dair geometrik iddia içermez. Gruplar bu deneyde birbirinin stoklarını kullanamaz.

Fiziksel doğrulama konumlardan giyotin ayrışmasını tanır ve kesim listesini tamsayılı koordinatlarla tekrar oynatır. Boyut, yön, kalınlık, adet, stok miktarı ve kapsama kontrol edilir. Kullanılabilir en büyük tek artık, adayın `free` alanından alınmaz; doğrulanmış kesim ağacının kalan yapraklarından hesaplanır. En kısa kenarı en az 50 mm ve alanı en az 100 cm² olan yapraklar değerlendirilir. Bu eşik mevcut uygulamanın varsayılanıdır.

Seçili hedefte U kısa koşunun doğrulanmış değeri, L pozitif güvenli alt sınır, B uzun koşunun en iyi doğrulanmış değeridir. Alt sınır farkı `100*(U-L)/L`; bilinen en iyi plana uzaklık `100*(U-B)/B` olur. B'nin optimum olması gerekmez. Eşit birincil hedefte en büyük kullanılabilir tek artık seçilir. Eksik planın gap'i `null` olur ve tam plan kabulünden kalır. Eksik fiyatın maliyet sınırı `null` olur. Yuvarlamayla optimum etiketi üretilmez.

Yüzdelikler nearest-rank yöntemini kullanır. Geliştirme ve kabul tohumları ayrı raporlanır. Eksiklerin sayısı her dağılımda gösterilir. Gerçek iPhone, masif, malzeme grupları arasında otomatik eşleme, farklı amaçların üretimde ortak havuz kullanması ve global exact sertifika bu ölçümün kapsamı dışındadır.

## Bağımsız test paketinin kaynağı

`vendor/` kullanıcının sağladığı `beythaus-indep-tests.zip` içinden alınmıştır. `lib.js` içindeki varsayılan motor yolu taşınabilir repo yoluyla değiştirilmiştir. Fiziksel doğrulayıcı ve oracle algoritmaları korunmuştur. `selftest.cjs` ek olarak 60 tanığın tekrar üretimini, fiziksel kuralları bozan adayların reddini ve alan alt sınırının küçük relaxed oracle sonuçlarını aşmadığını kontrol eder.

## Sonuç dosyaları

`results/summary.json` toplu ölçümleri, `cases.csv` ve `cases.json` her hedef-proje satırını içerir. `campaign.json.gz` bütün girdi listelerini, bağımsız tanıkları, kısa ve uzun koşu planlarını, yakınsama izlerini ve süreç bilgilerini saklar. Bir başarısızlığı tekrar üretmek için rapordaki seed'i `apartment(seed)` ve `addWitness` ile oluşturmak yeterlidir. Zaman bütçeli referans planının birebir sonucu makine yüküne bağlıdır; raporda seçilmiş fiziksel planın kendisi de saklanır.
