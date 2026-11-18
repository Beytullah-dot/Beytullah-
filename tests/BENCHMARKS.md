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

## Genişletme notu

2DPackLib'de çok daha fazla örnek ve farklı matematiksel problem sınıfları bulunmaktadır. Bu projeye eklenmiş **11 örneğin tamamının** 2DPackLib'in bütün koleksiyonunda başarı göstermeyi temsil ettiği iddia edilmez. Sonraki aşama, bütün standart örnekleri dönüştüren ayrı bir içe aktarıcı ve resmi sonuç dosyalarıyla performans kıyaslamasıdır.
