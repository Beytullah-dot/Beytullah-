# Beythaus Cut — Motor hedefi, kanıtlanabilir kapasite ve tamamlanma kriteri
*Kullanıcının 22 Kasım 2026 tarihli stratejik talebiyle kabul çerçevesi. Bu belge bir çalışma hedefi tanımlar; yeni ölçüm veya yazılımsal limit koymaz.*

## 1. Ana karar: sonsuz exact arama yerine ölçülmüş yeterlilik

Motorun nihai hedefi, tüm olası iki boyutlu giyotin işlerini matematiksel olarak optimum çözmek **değildir**. Hedef: gerçek marangozluk/panel/masif işlerinde fiziksel olarak üretilebilir, tercih edilen hedef açısından verimli, mümkün olduğunda optimalitesi sertifikalı ve kaynak bütçesi dolduğunda dürüstçe kanıtsız kalan planları hızlı üretmek. **Aynı iş için fiziksel uygulanabilirlik ile matematiksel optimumluk ayrı yükümlülüklerdir.**

Bu nedenle, gerçekçi üretim iş yükündeki yeterli güvenilirlik ve kalite ispat edildiğinde **kesim motorunun geliştirme kapsamı %100 tamamlanmış** ilan edilebilir. Bunun anlamı **her parça sayısında veya her problem sınıfında küresel optimumluk garantisi** değildir. "Motor geliştirme %100" ile "**ürün v1 hazır oluşu %100**" de ayrı ölçülerdir; bulut, mobil, PDF, güvenlik, gerçek cihaz/UAT kabulü motor tamamlanınca kendiliğinden kapanmaz.

Başlangıç ürün hazır oluş tahmini **%70**; bu strateji belgesinin kaydı yüzdeleri artırmaz. Motorun kendi tamamlanma yüzdesi **henüz ölçülmedi**, otomatik 100 yapılmaz.

## 2. X sınırı nasıl belirlenecek?

"X parça çözülmüşse X ve altındaki her iş optimumdur" varsayımı **yanlıştır**. İki ayrı sayı raporlanır:

- **N = fiziksel parça sayısı**: `sum(qty)`; tek bir parça satırı veya "farklı ölçü" sayısı değildir.
- **K = işin çeşitliliği**: benzersiz ölçü, malzeme/kalınlık, damar/rotasyon varyantları; stok çeşidi, mevcut stok adedi, kerf/trim, hedef fonksiyonu ve fiziksel kesim sınıfıyla birlikte raporlanır.

Aynı N'de K değişince arama zorluğu dramatik değişebilir. Tek bir sayısal X evrensel optimumluk garantisi vermez. **X, belirlenmiş problem sınıfı + parametreler + donanım + süre/bellek bütçesi için ölçülmüş güvenilirlik eşiğidir**, sistemin kullanıcıya kabul ettiği maksimum parça girdisi değildir. Çeşitli iş ailelerinde ayrı X (veya N/K/malzeme/stok aralıkları) gösterilebilir.

Mevcut 1000 tekrarlı parça / 125 levha sonucu `feasible-uncertified`, **optimal sertifikası değil**. Mevcut 16 sentetik senaryonun 14 fiziksel tam plan / 2 UNKNOWN sonucu da "N≤1000 her iş optimum" demek değildir. Matematiksel optimum kapasite için ayrı bir ölçüm kampanyası zorunludur.

## 3. Yalnız gerçek optimumluk belgesi konuşur

Her kullanıcı projesi ve **seçili amaç** için durum sözleşmesi:

1. **KANITLI OPTİMUM:** Kanıtlanan fiziksel model ve seçili hedef için geçerli exact sertifika; stok maliyeti optimumluğu brüt fireye, minimum levha sayısı maliyete otomatik taşınmaz. Kapsamı sınırlı (örn. 2/3 aşama VH/HV) ispat **genel giyotin optimumluğu** olarak gösterilmez.
2. **FİZİKSEL PLAN / KANITLANMAMIŞ:** Bütün parçalar yerleşmiş ve bağımsız kesim ağacı audit'i geçmiş; sezgisel veya yapıcı yöntem optimumluğu kanıtlamaz. Varsa güvenli alt sınırla tanımlı **gap** verilebilir, yoksa "gap bilinmiyor" yazılır.
3. **UNKNOWN / BÜTÇE:** Arama/ölçüm sınırına gelindi. Geçerli tam plan varsa üretim adayı olarak ayrıca raporlanır; yoksa **üretim planı yok**. UNKNOWN hiçbir zaman "imkânsız" değildir.
4. **KANITLI İMKÂNSIZ:** Ancak ilgili kapsamda eksiksiz ispat varsa gösterilir. Reddedilen fiziksel aday "imkânsız" değildir.

Sınırlı sınıf optimumluğu ve yalnızca yaklaşık gap (ör. kullanıcı tanımlı toleransla `(UB−LB)/max(|UB|,epsilon)`) **tam optimum** etiketi altında birleştirilmez. Alt sınırın aynı amaç ve model için geçerli olmasına dikkat edilir. Fiyatı bilinmeyen levha 0 TL sayılmaz; o durumda maliyet optimumluk raporu üretilmez.

## 4. Çift katmanlı çözüm: exact ve yapıcı/sezgisel

Çalıştırma esas olarak **her N için hızlı, fiziksel audite açık bir yapıcı aday** üretmeyi dener; mümkünse güvenli alt sınırı ve objective score'u kaydeder. Ardından **kaynak bütçeli exact/sertifika araması** yapılır; mevcut küçük/doğrulanmış özel sınıflarda kanıt varsa "optimum" durumu görünür.

Karmaşık/büyük işlerde exact arama süre/bellek bütçesini aşarsa kullanılabilir plan korunur, "Fiziksel kesim planı hazır; seçili hedefte optimumluk kanıtlanamadı" ifadesi gösterilir. Büyük girdide **otomatik sezgisel moda geçiş**, yalnız N'ye değil ölçülmüş sınıf/karmaşıklık/bütçeye bağlanır. Küçük, zor iş de sezgisel kalabilir; büyük, kolay/tekrarlı iş de matematiksel optimum sertifika alabilir. Kullanıcıya keyfi N/levha sınırı konmaz. Kullanıcının mevcut `minimum/economic/area` seçimi değiştirilmez.

Uyarı taslağı: **"Kesim planı fiziksel olarak doğrulandı. Bu işte minimum maliyet/fire/levha hedefinin küresel optimumluğu kanıtlanamadı. Daha iyi bir çözüm mümkün olabilir."** Duruma göre `UNKNOWN: kaynak bütçesi doldu` veya `gap: ...` bilgisi eklenir. Sadece "çok parça girdiniz" ifadesi yanıltıcıdır.

## 5. Bir sonraki iş: gerçekçi kapasite matrisi ve bırakma noktası

Sıradaki iş motoru körlemesine daha ileri exact sınıflara genişletmek **değil**, mevcut üretim motorunun sertifika/kapasite profilini çıkarmaktır. Bağımsız oracle, önceden belirlenmiş tohumlu testler ve ispat witness doğrulamasıyla aşağıdaki matris oluşturulmalı:

- Parça adedi N: **örnek test kademeleri** 10 / 25 / 50 / 100 / 200 / 500 / 1000 (ölçüm planı, yazılımsal limit veya vaat değildir).
- Çeşitlilik: aynı parça tekrarı, az sayıda boyut, tümü farklı heterojen ölçü, karışık malzeme ve kalınlık, farklı damar/rotasyon.
- Stok: aynı ebat, heterojen ebat/fiyat, stok adetleri, farklı projelerde levha kullanımının örneğin 1/5/25 ve üzeri oluşu.
- Pozitif kerf/trim ve masif/panel, stok fiyatı bilinmeyen negatif durum; `minimum`, **brüt alan/fire**, **kayıtlı maliyet** hedefleri ayrı.
- Her örnek için: fiziksel tam plan bulundu mu, bağımsız audit, seçilen hedefte **kanıtlı exact** var mı, kapsamı, alt/üst sınır ve doğru gap, UNKNOWN nedeni, süre, peak RSS, mobil WebKit davranışı ve kullanıcı cihazı UAT yapılmış mı.
- Rapor: N/K ve sınıf bazlı **kanıtlı optimalite oranı**, **fiziksel tam plan oranı**, **UNKNOWN oranı** ve p50/p95 gecikme/RSS. Yalnız test edilmiş örneklem için oran; bütün projelere taşınmaz.
- Doğrulama: en az iki bağımsız yöntemle kesim ağacı denetimi ve küçük işler için ayrı brute-force/exact oracle; aynı motorun kendi sonucuyla kendisini sınaması yeterli değildir.

Veri temsili (sentetik ve gönüllü anonimleştirilmiş işlerden) gerçek ticari iş yükünü yansıtmalı. Tekrarlı işlerle ağırlıklı bir test, heterojen proje kapasitesi kanıtı değildir. Ölçüm öncesi test ailesi ve bütçesi sabitlenmeli; sonuçlara göre keyfi daraltılmamalıdır.

## 6. Motor geliştirmenin %100 tamamlanma kararı

Aşağıdaki koşullar için **ayrı ayrı kanıt** elde edilince motoru, tanımlanan ticari kapsam içinde **geliştirmesi tamamlanmış / %100** olarak kabul et:

1. Gerçekçi iş ailesi ve proje ölçekleri önceden tanımlanmış; exact sertifika kapasitesi (varsa sınıfa özel X), fiziksel plan başarı oranı, yanlış-sertifika sayısı ve kaynak bütçeleri ölçülmüş.
2. Verilen **her üretime aday tam plan** bağımsız fiziksel denetimden geçiyor; yanlış `optimal` etiketi **0**, fiziksel ihlal **0**, fiyat/alan/hedef karışması **0** (uygulanan testlerde). Kanıtlanmamış işler açıkça etiketli.
3. Hedeflenen **pratik başarı yüzdesi ve hız/SLA** iş yükü temsilciliğiyle belirlenmiş ve gözlemlenerek kabul edilmiş; büyük işler sezgisel olarak kalabiliyor; UNKNOWN yönetimi ve iptal mantığı güvenli. Kabul edilen SLA'ler ölçülmeden isim/numara icat edilmez.
4. Yeterli ticari kapsam doğrulandıysa daha yüksek N/K için astronomik exact genişletme **v1 gereği değildir**. Kullanıcı isterse gelecekte ayrıca AR-GE yapılır; motoru gereksizce sonsuz arama döngüsünde tutma.
5. Motorun %100'ü **ürünün %100'ü değildir**: canlı bulut fiziksel kontrolü, Atomiklik/RLS, PDF, mobil, Pages ve gerçek saha testleri release yol haritasındaki ayrı kabul kalemleri olarak açık kalır.

Bu karar müşteri proje girişini kapatmak için **"maksimum N = X"** anlamına gelmez. UI kabul kapasitesi, hafıza/performans sınırlarına ulaşınca açıkça teknik hata veya kontrollü UNKNOWN sunar; sessiz kesme/kısıtlama yasak.

## 7. Mevcut durum

22 Kasım 2026 ön verisi: sentetik 16 fiziksel Worker senaryosunda 14 tam-denetimli fiziksel plan ve 2 UNKNOWN. 1000 tekrarlı parça feasible ama kanıtsız, 1000 farklı enli iş `unknown-limit`. **Bu veri X exact eşiğini belirlemeye yetmez.** En önemli ilk görev raporla **kanıt profili** çıkarmak; sonra karar vermektir. Ürün hazır oluş tahmini %70 olarak korunur.

Akademik/teknik dayanak: iki aşamalı giyotin için branch-and-price ve arc-flow exact yöntemler ile sektörde exact/sezgisel hibrit yaklaşım belgelenmiştir; OR-Tools'un OPTIMAL/FEASIBLE/UNKNOWN ayrımı durum sözleşmesine iyi referanstır. Bu yayınlar Beythaus motorunun kendisinin optimumluk kanıtı değildir.
