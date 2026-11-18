# Beythaus Cut — fiziksel stok hareket geçmişi

Bu sürüm, **Artık stok envanteri** için tarihli bir yerel hareket geçmişi kaydeder. Amaç fiziksel artık malzemenin nereden geldiğini, hangi projede tüketildiğini ve kimliğinin, rafının veya ölçüsünün nasıl değiştiğini takip edebilmektir.

## Kullanım

- **Artık stok envanteri → Yönet → Hareket geçmişi** tüm kayıtları açar. Tarihe göre en yeni işlemler üstte görüntülenir.
- Her parçanın yanındaki **Geçmiş** düğmesi yalnız o parçanın hareketlerini gösterir. Parça artık envanterde bulunmasa bile silinme ve daha eski olaylar görülebilir.
- **İşlem türü** ve serbest arama ile kayıtlar filtrelenebilir. **CSV dışa aktar** görünür filtre koşullarına uyan tüm kayıtları olay kimliği, tarih/saat, kaynak, parça kimliği, proje, parti ve önce/sonra ayrıntılarıyla dışa aktarır. CSV alanları elektronik tablo formül enjeksiyonuna karşı kaçışlanır.
- QR okutulduğunda parça **yalnızca açılır**. Ekrandaki **Kaydet** ya da **Kullanıldı işaretle** seçeneğiyle açıkça değişiklik yapılırsa kayıt kaynağı **QR üzerinden** olur. Sadece QR okutmak stok hareketi oluşturmaz.
- Silinme işleminden sonra geçmişte bir **silindi** kaydı kalır; envanterde olmayan kayıtlar tekrar stok adayı olarak kullanılamaz. Bu geçmiş kaydı silinen parçayı yeniden oluşturmaz.

## Kaydedilen işlemler

| İşlem türü | Kaynak | Kayıt |
|---|---|---|
| Üretimle oluştu | Üretim onayı | Yeni fiziksel artık, parti/proje bağlantısı ve son durum |
| Kullanıldı/tüketildi | Üretim, manuel veya QR | Eski/mevcut stok durumu ve tüketim |
| Tekrar mevcut | Manuel veya QR | Kullanıldı durumundan mevcut durumuna geçiş |
| Raf değişti | Manuel veya QR | Yalnız konum değiştiyse önceki ve yeni raf |
| Bilgisi düzeltildi | Manuel veya QR | Ölçü, malzeme, not ve/veya raf değişiklikleri |
| Kayıt silindi | Manuel | Parçanın silinmeden önceki son bilgileri; parça envanterden çıkarılır |
| Yedekten eklendi | JSON içe aktarma | Yedekten içeri alınan fiziksel parça |

Yedekten aktarımda daha önce hareket geçmişi bulunan kayıtlar kimliklerine göre birleştirilir. Aynı olay tekrar aktarılırsa ikinci defa eklenmez. Sadece fiziksel envanter kaydı olan eski yedeklerde, geçmiş hareketler geriye dönük olarak tahmin edilmez; yalnız aktarım olayı oluşturulur.

## Teknik ve güvenilirlik sınırları

- Fiziksel stok işlemi ve hareket geçmişi **aynı tarayıcı içi kayıt yazımında** kaydedilir. Yazım başarısız olursa yeni olay da stok değişikliği de kalıcı olmaz.
- Kayıtlar \`localStorage\` içinde en fazla **3.000 son hareket** tutulacak şekilde sınırlandırılmıştır. Daha eski hareketler zamanla kapasite nedeniyle çıkarılabilir. Uzun dönem kayıt için sık sık JSON yedeği veya CSV dışa aktarması alın.
- Aynı fiziksel üretim onayında yeni parçaların oluşumu ve eski parçaların tüketimi aynı üretim partisine bağlanır.
- QR sadece parça kimliği üzerinden kaydı açar; otomatik tüketim işlemi gerçekleştirmez. QR ile açıldıktan sonraki değişikliklerin kaynağı QR olarak görünür.
- **Kullanıcı kimliği veya yetkilendirme sistemi bulunmuyor.** “Elle”, “QR üzerinden”, “Üretim onayı” ve “Yedek” ifadeleri işlemin yazılım içindeki kaynağını gösterir; işlemi hangi kişinin yaptığını doğrulamaz.
- Geçmiş **değiştirilemez veya adli nitelikte bir kayıt değildir**. Tarayıcı verileri kullanıcı tarafından silinebilir/değiştirilebilir; başka cihazlardaki hareketler otomatik eşitlenmez. Verinin bütünlüğünü ayrıca doğrulayan sunucu, imza veya yetkili kullanıcı hesabı mevcut değil.
- Daha önceki Beythaus Cut sürümlerinde yapılmış hareketlere ait tarih/işlem geçmişi mevcut olmadığından bunlar **geriye dönük üretilemez**.

## Test

\`node tests/cut-validation.test.cjs\` regressyon paketi stok oluşturma, üretimde tüketim, elle geri alma, QR kaynaklı tüketim ve raf değişikliği, silinme sonrası tarihçe, CSV görüntüsü, JSON aktarımı ve depolama yazım hatasında iki tarafın da değişmemesini kontrol eder.

Otomatik testlerin başarılı olması, gerçek iPhone kamera ve ağ/etiket saha testinin yapıldığı anlamına gelmez.
