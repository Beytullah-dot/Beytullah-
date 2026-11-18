# Beythaus Cut — QR kodlu fiziksel artık stok yönetimi

Bu modül, atölyede kaydedilmiş fiziksel artık parçalar için **çevrimdışı QR etiket üretimi** ve mobil cihazdan **kamera/fotoğraf ile QR okuma** sağlar. Kaydın kendisi ayrı bir yerel envanterde bulunur.

## Uygulama akışı

1. Önce düz kesim planı tamamlanır. Yalnız fiziksel üretim gerçekten yapıldıktan sonra **Üretimi onayla · artıkları kaydet** seçilir.
2. **Artık stok envanteri → Yönet** ekranında fiziksel malzemeye raf/konum ve gerekirse not tanımlanır.
3. Parçanın yanındaki **QR etiket** düğmesiyle tekil etiket; **Filtrelenen etiketler** düğmesiyle seçili mevcut parçalar için en çok 30 etiket aynı anda hazırlanır.
4. Etiket ön izlemesinden **Etiketleri yazdır** ile A4 portre sayfada üç sütunlu etiketler yazdırılır. Etiketlere QR, stok kimliği, malzeme, boy/en, kalınlık ve raf yazılır. Çıktıyı kesip fiziksel parçaya iliştirin.
5. **QR tara** düğmesi mobil kamerayı açar. Kamera izni reddedilir veya tarayıcı kameraya erişemezse cihaz kamerasıyla çekilmiş bir fotoğraf seçilebilir ya da QR bağlantısı / parça ID'si elle girilebilir.
6. Eşleşen kayıt envanter düzenleme alanında açılır. **Okutmak stok kullanmak demek değildir.** Stok ancak kullanıcı “Kullanıldı” seçtiğinde veya fiziksel üretim doğrulandığında tüketilir.

## QR kodu ve veri güvenliği

Kodun içeriği şu biçimde bir HTTPS bağlantısıdır:

\`\`\`
https://beytullah-dot.github.io/Beytullah-/?cutRemnant=<stok-kimliği>
\`\`\`

Bu, QR'nin içine ölçü, not, raf veya malzeme bilgisini **koymaz**. Bunlar yalnızca fiziksel etikette okunabilir yazılar ve cihazdaki yerel envanter kaydı olarak bulunur. QR sadece opak stok kimliğini taşır. Dışarıdan taranan linklerin yalnız bu uygulamanın HTTPS köküne veya uygulamanın mevcut HTTPS adresine ait olmasına izin verilir; diğer sitelerin linkleri ve bozuk kodlar reddedilir.

Envanter şu an **tarayıcının kendi yerel depolamasındadır**. Bir etiketi başka bir telefonun normal kamerasıyla taramak uygulamanın bağlantısını açar ancak başka telefonda aynı envanter bulunmuyorsa kayıt açılmaz. Bunun için **Envanter yedeği** dışa aktarılıp o cihazda **Yedek yükle** ile içe aktarılmalıdır. Çok cihazlı canlı senkronizasyon ve stok kilitleme henüz yoktur. iOS'ta Safari ile ana ekrana eklenmiş uygulama farklı depolama bağlamında çalışabileceği için uygulama içindeki tarayıcı tercih edilmelidir.

## Çevrimdışı uygulama ve üçüncü taraf lisansları

QR kodlarının oluşturulması veya çözümlenmesi için harici API'ye malzeme verisi gönderilmez. Kütüphaneler aynı GitHub Pages sitesindeki statik dosyalardır ve uygulamanın servis çalışanı tarafından çevrimdışı önbelleğe alınır.

- **QRCode.js** (MIT), davidshimjs/qrcodejs, yerel üretim için: \`vendor/qrcode.min.js\`. Lisans: \`vendor/LICENSE-qrcodejs\`.
- **jsQR** (Apache-2.0), cozmo/jsQR, QR kamera ve fotoğraf çözümlenmesi için: \`vendor/jsQR.js\`. Lisans: \`vendor/LICENSE-jsQR\`.

Kaynaklar: https://github.com/davidshimjs/qrcodejs ve https://github.com/cozmo/jsQR

## Otomatik test kapsamı

\`node tests/cut-validation.test.cjs\` komutu tüm geometrik testlerin yanında:

- Üretilen gerçek QR modül matrisini tarayıcıda kullanılan jsQR motoruyla **gerçekten çözümler**.
- Aynı uygulama kökü dışındaki bağlantıları, bozuk URL'leri ve envanterde bulunmayan ID'leri reddeder.
- Bir parçanın önizleme ve yazdırma etiketlerini oluşturur.
- Filtreli toplu etiketlemede yalnız kullanılabilir malzemeleri seçer.
- QR ile kayıt açmanın envanter tüketimine yol açmadığını doğrular.
- Kütüphanelerin yerel dosyalara ve çevrimdışı önbelleğe eklendiğini doğrular.

**Sınır:** Otomatik testler, iPhone'un gerçek kamerası, yazdırma izinleri, görüntü odaklaması, iOS sistem etiket yazıcıları veya fiziksel etiketlerin dayanıklılığı açısından saha testi değildir. Bu doğrulama ancak gerçek cihaz ve etiket baskısı üzerinden yapılabilir.
