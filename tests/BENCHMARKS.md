# Beythaus Cut — akademik test protokolü

## Kaynak ve yeniden üretilebilirlik

Bu klasördeki `fixtures/class-literature-samples.json`, akademik 2D-BPP **CLASS** veri kümesinin [ktnr/BinPacking2D](https://github.com/ktnr/BinPacking2D) içindeki MIT lisanslı aynasından alınan örnekleri içerir.

- Kaynak araştırmalar: Berkey & Wang (1987), Martello & Vigo (1998)
- Birleşik akademik kütüphane: [2DPackLib — Bologna Üniversitesi](https://site.unibo.it/operations-research/en/research/2dpacklib)
- Açık kaynaklı örneklerin tam yolları ve kaynak optimum bilgileri JSON içinde her örnek için saklanır
- İlk altı `CLASS01` örneğinin referans optimum stok sayıları, aynanın README dosyasındaki 1–10. örnek sonuçlarına dayanır
- Diğer beş örnekte (CLASS02, CLASS03, CLASS04, CLASS07 ve CLASS09) **bağımsız doğrulanmış referans optimum yoktur**; bunlarda yalnızca algoritma çıktısının geometrik geçerliliği kontrol edilir

## Nasıl çalıştırılır?

```bash
node tests/cut-validation.test.cjs
```

Ayrıca `.github/workflows/cut-validation.yml` aynı testleri GitHub Actions üzerinde çalıştırır.

Bu testler *aynı matematiksel model* karşılaştırılacak şekilde yapılır: stoklar sınırsız sayıda sağlanabilir, parçalara 90° dönüş izni verilmez, testere payı ve kenar payı sıfırdır. Her örnekte tam parça talebi ve çizim geçerliliği kontrol edilir. Bu, atölyedeki testere payı ve üretim koşullarını temsil etmez.

## İstatistikleri yorumlama

- **Geçerli yerleşim:** Parçalar sınırların içinde, çakışmasız ve tüm talepler karşılanmış
- **Yayımlanmış optimumla eşleşme:** Harici referans değer ile aynı stok sayısı; uygulamanın kendi başına optimumluğu kanıtladığı anlamına gelmez
- **Beythaus optimumluk sertifikası:** Mevcut geçerli yerleşimin matematiksel alan alt sınırına ulaşması veya kesin geometrik aramanın daha az stok seçeneğini eksiksiz elemesi
- **Süre/işlem sınırı:** Bir arama kesildiyse sonuç *bilinmiyor* kabul edilir; *imkânsız* sayılamaz

## Kesin aramanın mevcut kapsamı

Serbest yerleşimde, malzeme grupları ayrı çözülebilir. Bu aşamada her malzeme grubu için en fazla 8 parça, 3 stok türü, 4 kullanılan stok; proje genelinde en fazla 4 malzeme grubu ve 24 parça sınırı vardır. Ortak zaman bütçesi yaklaşık 175 ms, her arama için işlem bütçesi 25.000 düğümdür. Bu sınırlar kesin çözümün tamamlandığı garantisi değildir: yalnızca tamamlanan aramalarda optimumluk kanıtı kullanılır.

## Sabit minimum stok sayısıyla minimum brüt fire

Beythaus Cut, **minimum stok sayısı matematiksel olarak kanıtlanmışsa**, aynı stok sayısını koruyarak farklı boyuttaki stok türlerinin olası birleşimlerini (adet kısıtlarına uyarak) tarayabilir. Her daha düşük alanlı aday birleşimin gerçekten parçaları sığdırıp sığdıramadığı bağımsız geometrik doğrulama ve kesin çözüm motoruyla kontrol edilir. Bütün daha küçük kombinasyonlar elendiğinde, çözüm **minimum brüt alan kaybı** sertifikası alır. Arama tamamlanamıyorsa sertifika verilmez.

Sabit parçalar için matematiksel amaç:

```
Brüt kullanılmayan alan (mm²) = Σ(kullanılan stok boyu × stok eni) − Σ(parça boyu × parça eni)
```

Bu ifade testere talaşını, temizleme payını, küçük kırpıntıları ve yeniden kullanılabilir boş alanları **birlikte** içerir. Bunların ekonomik değerini ya da kesilme kolaylığını ayrıştırmaz.

- Aynı boyut ve sayıda stok kullanılıyorsa bu **brüt fire alanı sabittir**; yalnızca artıkların ölçüsü, şekli ve yeniden kullanılabilirliği yerleşimle değişebilir.
- Minimum brüt fire, minimum **maliyet** değildir. Daha küçük stoklar daha pahalıysa uygulama stok maliyetinin artmasına rağmen brüt alan kaybını azaltabilir; fiyat farkı raporlanır.
- Bu aşama yalnızca **serbest yerleşim**, kanıtlanmış minimum stok sayısı ve küçük gruplar için geçerlidir: malzeme başına en çok 8 parça, 3 stok türü, 4 kullanılan stok; toplamda en fazla 4 malzeme grubu ve 24 parça. Alan araması yaklaşık 120 ms ve her geometrik deneme 20.000 işlem düğümüyle sınırlandırılmıştır.
- Testlerde daha küçük alanlı stok türü bileşimleri, ayrı bir tamsayı-koordinat tam tarama uygulamasıyla kontrol edilir; normal regresyon paketi bu testleri de içerir.

Düz (giyotin) kesim, damar yönü, CNC araç yolu, kullanılabilir artıkların ekonomik değeri, **en az maliyet** ve **kullanılabilir artık şekillerinin optimumluğu** kesin kanıt kapsamı dışındadır. Geometrik planın ayrıca üretim makinesinde kontrol edilmesi gerekir.

## Kullanılabilir artık şekli — sezgisel iyileştirme

**Düz kesim modunda** kesim ağacındaki boş yapraklar fiziksel olarak bağımsız dikdörtgen artıklardır. Kullanıcı tarafından ayarlanan iki eşik (minimum kısa kenar mm ve minimum alan cm²) karşılandığında bu artıklar saklanabilir kabul edilir. Bu eşikler ekonomik talep, damar yönü veya kusur gibi üretim faktörlerini modellemez.

Mevcut algoritma, ilk geçerli giyotin planından sonra **aynı stok panelleri ve aynı parça listesini** koruyarak farklı parça sıralamaları, yönler ve yatay/düşey kesim seçeneklerini dener. Sezgisel öncelikler:

1. Eşiği geçen kullanılabilir artıkların **toplam alanını en çok artırmak**.
2. Toplam alan eşitse **en büyük tek artık parçayı artırmak**.
3. Bunlar da eşitse **daha az parçaya bölünmüş artığı** tercih etmek.

Yalnızca stok sayısı, stok tür/adetleri, satın alma maliyeti ve toplam stok alanı değişmeyen planlar değerlendirilebilir. Aday plan, bağımsız geometrik kontrolden ve kesim adımlarının kesim ağacında yeniden canlandırılmasından geçmeden kabul edilmez.

Arama bir malzeme grubu için en fazla 65 parça ve 6 kullanılan stokla çalışır. En fazla 48–160 alternatif (parça sayısına göre) ve yaklaşık 95 ms süre bütçesi vardır. Test paketi ayrıca 75 deterministik rastgele senaryoda üretim sırasını bağımsız kontrol eder.

**Bu bir optimumluk kanıtı değildir.** En iyi artık düzenini bulma garantisi vermez. Toplam kullanılabilir alan öncelikli olduğundan, bazı projelerde daha çok kullanılabilir toplam alan elde edilirken en büyük tek artık parça küçülebilir. Çıktıda toplam kullanılabilir alan ve en büyük artık alanı ayrı gösterilir. Minimum brüt fire ile yeniden kullanılabilir artıklar farklı amaçlardır; testere talaşı veya ekonomik stok değeriyle karıştırılmamalıdır.

## Fiziksel artık stok envanteri — projeler arası malzeme döngüsü

Üretimden çıkan kullanılabilir artıkları yeniden kullanmak için uygulamaya ayrı bir **cihaz içi stok kayıt defteri** eklendi. Modül, geometri doğrulaması başarılı, tüm parçaları yerleştirilmiş **düz kesim** planlarının fiziksel üretim onayından sonra envantere parça ekler.

- Her artık **tek bir fiziksel parça** olarak milimetre ölçüleri, malzeme türü, varsa kalınlığı ve kaynak üretim partisiyle ayrı kaydedilir.
- Yeni projelerde **mevcut** artıklar, "Artıkları otomatik değerlendir" açık olduğunda manuel stoklarla beraber değerlendirilir. Manuel stok satırı gerekli değildir.
- **Plan oluşturmak stoktan düşmez.** Kullanıcı "Üretimi onayla · artıkları kaydet" eylemiyle fiziksel kesimi doğruladığında, planda kullanılan eski artıklar aynı işlemde "kullanıldı" statüsüne geçirilir; oluşan yeni kullanılabilir artıklar kaydedilir.
- **Kullanıldı / Geri al / Sil** elle yönetilebilir. Envanter yedekleri kayıt kimliği ve kaynak anahtarıyla birleştirilir, aynı fiziksel kayıt ikinci kez eklenmez.
- Her projenin envanteri kullanma tercihi proje dosyasında saklanır; fiziksel stok envanteri ise **projeden bağımsızdır** ve ayrı JSON yedeğine sahiptir. Yedekleme üretim parti geçmişini de içerir.
- Artık stokların **ek edinim maliyeti sıfır** kabul edilir. Bu, ekonomik değerlerinin veya fırsat maliyetlerinin sıfır olduğu anlamına gelmez. Kesim PDF'sinde "Artık stok" kaynağı belirtilir.
- Fiziksel kalınlık korunur; 2B modda kalınlık kısıtı devre dışı bırakılırsa gerçek üretimde ayrıca doğrulanmalıdır.
- Kayıtlar tarayıcıda tutulur: **bulut eşitlemesi ve çok cihazlı eşzamanlı stok kilitlemesi yoktur**. Cihazlar arasında stok tüketimi otomatik paylaşılmaz.
- Aynı planın tekrar fiziksel üretiminde ayrı parti için ilave teyit gerekir. Daha önce tüketilmiş artık aynı anda iki üretimde kullanılamaz.
- Envantere kaydedilen parça ölçüleri, kesim ağacının kalan yapraklarına ve kullanıcının kısa kenar/alan eşiklerine dayanır. Malzeme kusurları ve damar yönü değerlendirilmez.

**Güvence sınırı:** Envanter, bir tarayıcıda stok hareketlerinin tutarlı takibini sağlar; fiziksel depo sayımı ve kalite kontrolün yerine geçmez. Otomatik testlerde üretim onayı, ikinci nesil artık üretimi, eski parçanın tüketilmesi, yeni projeye aktarım, PDF kaynak açıklaması ve yedek birleştirme kuralları kontrol edilir.

## Genişletme notu

2DPackLib'de çok daha fazla örnek ve farklı matematiksel problem sınıfları bulunmaktadır. Bu projeye eklenmiş **11 örneğin tamamının** 2DPackLib'in bütün koleksiyonunda başarı göstermeyi temsil ettiği iddia edilmez. Sonraki aşama, bütün standart örnekleri dönüştüren ayrı bir içe aktarıcı ve resmi sonuç dosyalarıyla performans kıyaslamasıdır.
