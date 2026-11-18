# Beythaus Cut — Çok cihazlı stok senkronizasyonu (isteğe bağlı)

## Önemli durum

**Gerçek Beythaus Cut Supabase projesi oluşturuldu ve PostgreSQL şeması kuruldu.** Supabase projesi `pdqgpupdqgrxejvjpdzs`, bölgesi Frankfurt (`eu-central-1`). Veritabanı ve otomatik testler sağlıklı; ancak kullanıcı hesabı oluşturulmadan ve ortak atölyeye giriş yapılmadan ortak stok kullanılmaya başlanmaz. GitHub Pages tek başına veritabanı veya güvenli çok kullanıcılı işlem yönetimi sunmaz. Bulut yapılandırılmadıysa mevcut **yerel envanter** olduğu gibi kullanılmaya devam eder.

Bulut kullanımı tamamen isteğe bağlıdır. Kullanıcının yerel stok verileri izinsiz otomatik yüklenmez ve bulut modundan yerel moda dönüldüğünde korunur.

## Tek seferlik kurulum

1. [Supabase Dashboard](https://supabase.com/dashboard) üzerinden hesabınla bir PostgreSQL projesi oluştur. Veritabanı ve uygulama Auth özelliklerinin aktif olduğunu kontrol et.
2. Projenin **SQL Editor** ekranında depodaki
   [\`supabase/migrations/20261118_000001_cloud_inventory.sql\`](../supabase/migrations/20261118_000001_cloud_inventory.sql)
   dosyasını çalıştır. Bu şema, RLS etkin tabloları, üyelik/katılım mekanizmasını ve sunucu tarafı atomik stok işlemlerini kurar.
3. **Authentication → Providers → Email** bölümünde e-posta/parola ile hesabın açılabildiğini kontrol et. E-posta doğrulaması aktifse doğrulama e-postasındaki bağlantıyı tamamla. Canlı kullanım öncesinde güvenli şifre politikası ve e-posta gönderim ayarlarını düzenle.
4. **Beythaus Cut projesi bağlı:** https://pdqgpupdqgrxejvjpdzs.supabase.co adresi ve **tarayıcıda kullanılması güvenli publishable API anahtarı** uygulama formuna önceden yerleştirildi. Kullanıcı ayrıca URL veya API anahtarı kopyalamak zorunda değil; gizli `service_role` anahtarına gerek yok.
5. Supabase Dashboard → **Authentication → URL Configuration** alanında **Site URL** adresini `https://beytullah-dot.github.io/Beytullah-/` olarak ayarla. **Redirect URLs** listesine de bu tam adresi ekle. Böylece e-posta doğrulama bağlantısı varsayılan `http://localhost:3000` adresine gitmez. Kaynak: https://supabase.com/docs/guides/auth/redirect-urls
6. Uygulamada **Bulut stok envanteri** bölümünde e-posta/parola ile **Hesap oluştur**. Doğrulama gerekiyorsa e-posta bağlantısını onayla, ardından **Giriş yap** ve ortak atölyeni oluştur veya seç.
7. İkinci bir çalışanı eklemek için yönetici hesabında **Katılım kodu üret** seçeneğini kullan. Kodu güvenli şekilde paylaş; ikinci kullanıcı kendi e-posta/parola hesabıyla oturum açıp **Kodla katıl** düğmesiyle üyelik alır. Katılım kodu 48 saat geçerlidir ve en fazla 5 defa kullanılabilir.
8. Aynı veya farklı cihazlarda **Atölyeyi aç** seçildiğinde stoklar sunucudan yüklenir. Uygulama yaklaşık 15 saniyede bir stokları kontrol eder, sekme yeniden görünür olduğunda yeniler ve **Stokları eşitle** düğmesiyle elle yenilenebilir.

**Güvenlik:** \`service_role\`, \`sb_secret_...\` veya veritabanı şifresini asla GitHub'a, ChatGPT sohbetine, GitHub Pages HTML/JS dosyasına ya da tarayıcıdaki anahtar alanına koyma. Bu istemci sadece publishable/anon anahtarını kabul etmek üzere tasarlanmıştır. Oturum bilgileri parola yerine tarayıcının oturum depolamasında saklanır; oturum kapatıldığında temizlenir.

## Yerel envanteri buluta geçirme

Bağlı olunan atölyenin sahibi **Yerel stokları buluta aktar** seçeneğini kullanabilir. Bu işlem ayrıca bir onay ister; her defasında 60 fiziksel parçalık işlemlerle envanterdeki yerel stokları kopyalar. Aynı parça kimliği bulutta zaten mevcutsa otomatik üzerine yazılmaz. Toplu aktarım sırasında internet kesilirse tamamlanan parçalar sunucuda kalır; aynı aktarımı yeniden denemek yeni bir kopya oluşturmaz.

Bulutta yapılan işlemler yerel kayıtları değiştirmez. Yerel moda dönüldüğünde önceki cihaz içi stok kayıtları görülür; bunlar buluttaki güncel tüketim durumunu yansıtmayabilir. Bu yüzden fiziksel atölyeyi ortak stokla yönetmeye başladıktan sonra **aynı stoğu hem yerel hem bulut modunda üretim için kullanma**.

## Gerçek stok hareketi ve eşzamanlı kullanım

- Kesim planı oluşturmak, fiziksel stok tüketmez.
- Bulut modunda stok düzenlemesi, **Kullanıldı/Mevcut yap** işlemi, raf değişikliği, silme ve fiziksel üretim onayı **sunucu RPC fonksiyonu ile** gerçekleştirilir.
- Her stok kaydının sunucu tarafından artırılan **version** alanı vardır. Cihazlardan biri stoğu değiştirdiyse diğerinin eski sürümle gönderdiği işlem reddedilir ve güncel envanter yeniden yüklenir.
- Fiziksel üretim onayında kesilen eski stoklar ile oluşan yeni kullanılabilir artıklar **tek PostgreSQL işlemi** içinde kaydedilir. İşlem kısmen tamamlanamaz; herhangi bir çakışma tüm işlemi geri alır.
- Her mutasyonda rastgele bir **operation_id** kullanılır. İnternet yanıtının kaybolduğu durumda aynı işlem kimliğiyle tekrar deneme sunucuda yeni stok yaratmaz. Üretim planında kimlik yeniden hesaplanana kadar korunur.
- QR okutma kaydı açar, kendi başına tüketmez. QR ile açılan kayıtta sonradan yapılan açık değişikliklerin kaynak bilgisi saklanır.
- Kullanıcıya sunucudan başarılı sonuç gelmeden stok değişikliği başarılı gösterilmez. Bulut modunda **çevrimdışı stok yazma kuyruğu yoktur**; bağlantı sorununda yeniden eşitlemek gerekir.
- Sunucu, işleme katılan bir stok için parça kimliği/sürüm denetimi yapar. Fiziksel olarak doğru kesim yapıldığına dair **ayrı bir saha doğrulaması yapmaz**; çalışanların üretim onayı doğru olmalıdır.

## Yetki modeli

- **owner:** Atölye oluşturur, katılım kodu üretir, yerel stokları ilk kez buluta aktarabilir ve stok işlemlerini yapabilir.
- **worker:** Katıldığı atölyenin stoklarını görür; mevcut stokları düzenleyebilir, kullanabilir, üretim kaydedebilir. Yönetici yetkisi olmadan toplu stok aktarımı veya yeni katılım kodu oluşturamaz.
- **Üye olmayan kullanıcı:** Atölyenin stoklarını, geçmişini veya kullanıcı listesini görüntüleyemez.

Tüm stok tablolarının RLS özelliği açıktır. Tarayıcı kullanıcılarına tablolar üzerinde doğrudan INSERT/UPDATE/DELETE yetkisi verilmez; yalnız kimliği ve üyeliği doğrulayan SECURITY DEFINER RPC fonksiyonları çalıştırılır. Böylece sırf istemci kodunu değiştirerek sürüm kontrolünün atlanması hedeflenmez.

**Sınır:** İşlem kaydındaki aktör kimliği Supabase Auth kimliğidir; otomatik personel rolü, elektronik imza, fiziksel sayım onayı veya adli nitelikte değiştirilemez kayıt anlamına gelmez. Yetkili çalışanlar kendi yetkileri kapsamındaki stokları değiştirebilir. RLS ve fonksiyon yetkileri uygulama hesabında ek güvenlik testiyle doğrulanmalıdır.

## Testler

Depoda üç katmanlı test yaklaşımı bulunmaktadır:

1. \`node tests/cut-validation.test.cjs\`: mevcut geometri, PDF, üretim, QR ve yerel envanter regresyonları. Ayrıca gerçek optimizer üzerinde bulut/yerel ayrımını, sürüm alanını ve bulut planı üretim verisini kontrol eder.
2. \`node tests/cloud-sync.test.cjs\`: iki sahte mobil cihazın **ortak bir sunucu modeline** bağlandığı, aynı fiziksel stoğu ikinci kez kullanmaya çalıştığında reddedildiği, işlemlerin aynı kimlikle tekrarına karşı korunduğu ve yerel stokların değişmediği sözleşme testleri.
3. GitHub Actions içindeki PostgreSQL 17 testi: \`tests/cloud-db-bootstrap.sql\` ile yalnız CI için minimal Supabase Auth taklidi kurulur; ardından **gerçek SQL şeması** ve \`tests/cloud-db-smoke.sql\` çalıştırılarak üyelik, RLS, veri erişim yetkisi, işlem tekrarı, fiziksel üretim atomikliği ve eski sürümle işleme karşı geri alma sınanır.

**Sınır:** Bu testler gerçek Supabase yönetim konsolu üzerinde etkin bir projeyle, gerçek iki iPhone ile, gerçek kamera/QR akışıyla veya canlı ağ kopmasıyla yapılan saha testinin yerine geçmez. Canlı kullanım öncesinde birkaç test artığıyla iki kullanıcı/iki cihaz üzerinde prova yap.

## İşletim gereksinimleri ve sonraki adımlar

- Supabase projesi için günlük operasyonlardan önce otomatik yedekleme ve erişim politikalarını belirle.
- İşletimsel iyileştirmeler: personeli atölyeden çıkarma, ayrı salt-okunur rol, yetkili yönetici onay akışı, stok rezervasyonu, anlık bildirim (şu an periyodik senkronizasyon), değişiklik geçmişinin uzun dönem dışa aktarımı.
- Cihaz çevrimdışıyken üretim kaydı **sunucuya iletilemez**. Yerel çevrimdışı çalışma ile bulut stokları aynı fiziksel miktarları temsil etmiyormuş gibi ele alınmalıdır.
- Yerel envanter \`localStorage\`, bulut oturumu \`sessionStorage\` üzerinde tutulur; ortak sunucu stokları PostgreSQL'de saklanır. Başka bir cihazın QR koduyla stok açabilmesi için kendi Supabase hesabıyla **aynı atölyeye giriş yapmış olması** gerekir.

Referanslar: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Database Functions](https://supabase.com/docs/guides/database/functions), [Auth Sessions](https://supabase.com/docs/guides/auth/sessions).
