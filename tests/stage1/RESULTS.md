# Aşama 1 — B1 ara raporu / kabul tamamlanmadı

24 Kasım 2026. **Duruldu; yayına alınmadı. Aşama 2 başlamadı.** Gerçek Supabase, Auth, stok veya üretim verisine erişilmedi.

Bağımsız doğrulayıcı motor değişikliğinden önce ayrı commit: `faf2a96b3395887b0d8f49c1ca0b4c913d4882bc` (yerel aynı ağaç: `d2aefb9`). Sonraki motor değişikliği ayrı inceleme commit'indedir.

## Durma nedeni ve kabul durumu

- Mevcut kapasite regresyonu `tests/motor-capacity-matrix.cjs` için ayrılan **60 saniye** doldu. Test başarısızlığının fiziksel karşı örnek olduğu söylenemez; koşu tamamlanmadı. Ardından yeni motor değişikliği/test kampanyası başlatılmadı; sürmekte olan ticari ölçüm tamamlandı.
- Ek `run-big.js grain 950000 40` koşusu verilen Pareto oracle'ın `<=3 types` sınırında durdu. İlk girdi 950000, yön kısıtlarıyla **6 tip**. Tam parça/stok listesi `results/oracle-grain-blocker.json`. Bunu başarılı koşu saymıyoruz.
- Alternatif: kapasite paketini ayrı süreçte CI'nin mevcut daha uzun bütçesiyle tamamlamak; yönlü büyük iş üretecini oracle'ın gerçek (ölçü+rotasyon+yön+malzeme+kalınlık) tip kapsamına göre ayrı bir onaylı test ailesi olarak tanımlamak veya oracle'ı genişletmek. Mevcut başarısız girdiyi silmek/seçerek elemek yok.
- Tüm alt sınırlar için aşağıda matematiksel gerekçe var; geniş, gevşetilmiş oracle kampanyasında **her alt sınırın ayrı ayrı kapsandığı kabulü henüz kapanmadı**.
- CI, gerçek tarayıcı ayar/PDF etkileşimi, tüm regresyonlar ve varsayılan kararı açık. Bu ara çalışma birleştirilmemeli.

| Şart | Sonuç |
|---|---|
| Önce bağımsız doğrulayıcı, ayrı commit, motor import yok | Geçti |
| findFit / production audit / GuillotineExact aynı opt-in kural | Uygulandı; ana örnek ve küçük kampanya geçti |
| Bıçak yalnız dış sınır / önceki kerf boşluğuna taşar | İki ayrı uygulama: dikdörtgen çıkarma ve x dilimi/y aralık örtüsü |
| Sıfır artıkta kesim yok; normal kesimler korunur; overhang işareti | Hedef testler geçti |
| Üç 810×1220, 2440×1220, k=4, trim=0 | Kapalı: 2 levha; açık: 1 levha; iki audit geçti |
| En az 10 elle komşu parça olumsuzu | 10/10 bağımsız ve üretim auditinde reddedildi; iki olumlu önceki-kerf vakası da geçti |
| run-diff, sekiz aile | 3.600 girdi / 10.800 hedef koşusu: invalid=0, disagreement=0, falseOptimal=0, falseOptimalRelaxedOnly=0, missed relaxed-only=0 |
| run-ui, sekiz aile | 800 girdi: iki yanlış optimum sayacı 0; invalid=0; Worker invalid=0 |
| run-big k1/k2/k3/generic | 160 girdi: iki yanlış optimum sayacı 0; invalid=0; Worker invalid=0 |
| run-big ek grain ailesi | Oracle kapsam hatası; tamamlanmadı |
| Mevcut geometri | 917 kontrol geçti |
| Mevcut motor regresyonları | results/regressions.json: tamamlananlar geçti; kapasite testi timeout, sonraki testler koşulmadı |
| Aynı 20+40 proje, önce/sonra | 240 kısa koşu tamam; geçersiz aday 0; kabul seti ayar için kullanılmadı |
| Atölye açık/kapalı ayarı ve operatör kesim etiketi | Kodlandı; tarayıcı etkileşim kabulü açık |
| Varsayılan | Değişmedi: açıkça true olmayan proje eski katı davranışta |

`run-diff`: generic 910000/1500; grain 920000/300; thick 930000/300; nokerf, hetero, materials, dense, planted 940000/300. UI generic 910000/100; diğer yedi aile 960000/100. Big dört aile 950000/40. Özetler results/ içinde. Bu sonlu örnekler küresel başarı garantisi değildir. Paket stockProofFalse sayacı strict referansına bakar; relaxed optimum kontrolü ayrıca certificate ve UI count Worker sayaçlarıyla yapıldı, bağımsız alt-sınır kapsamı tamamlandı iddiası yok.

## Kural ve kod

Pozitif terminal artık r<k ise bıçağın kaynak dışındaki kısmı k-r'dir ve 0<k-r<k. Kaynak içinde yalnız bu artığı tüketir. Dıştaki ayak izi kullanılabilir kök dışına veya yalnız **daha önce açılmış** kerf boşluklarının birleşimine düşmelidir. Komşu parça ve kesilmemiş serbest yaprakla kesişim reddedilir. r=0 olduğunda kesim yok; r>=k eski bölme davranışı. Taşmalı kesimde `overhang:true` zorunlu ve kesim listesinde operatöre yazılır.

`tests/physical-guillotine-verifier.cjs` motor import etmez. Tarayıcıdaki `docs/engine/physical-verifier.js` aynı bağımsız kaynağın paketlenmiş kopyasıdır; eşitlik testi var. Üretim auditor'ı bu kaynağı çağırmaz. `showResult` giyotin planını her ikisine gönderir; uyuşmazlık hatadır. Serbest yerleşim üretim dışı taslak davranışı korunur.

Ekonomi Worker'ında flag aktarımı eksikliği ilk UI koşusunda 7 yanlış relaxed optimum etiketi üretti. `economic-exact.js` cfg aktarımı düzeltildikten sonra aynı 100 girdi tekrarında 0 oldu. Sonuç gizlenmedi; yalnız son koşu özetleri başarı tablosuna alındı.

## Alt sınır gerekçeleri

1. **Kerf genişletilmiş alan:** iki parça son ayıran giyotin kesimi nedeniyle en az bir eksende k ayrıdır. Her parçayı sağa ve aşağı k genişletmek ayrıklığı korur; hepsi (W+k)×(H+k) içine sığar. Dolayısıyla sum((w+k)(h+k)) <= (W+k)(H+k). Son bıçağın dışarı taşması parça ölçüsünü/ayrımını değiştirmez. Bu kapasitenin stok örtüsü gevşetmesinde kullanılması alt sınır olmaya devam eder.
2. **Kardinalite:** bir eksende n parça için sum(s_i)+(n-1)k<=S gereklidir; son parçadan sonra tam k zorunlu tutulmaz. Asgari boy e ise n<=floor((S+k)/(e+k)). Daha gevşek rotasyon/uyumluluk seçimleri kapasiteyi artırabilir, alt sınırı haksız yükseltemez. Mevcut türetilmiş kardinalite uygulamalarının tüm yollarını ayrı relaxed oracle taramasında kapatma işi açık.
3. **Half-span:** kerf'i tamamen yok sayan kesit integrali. Yarım yüksekliği aşan dikdörtgen aynı x kesitinde diğer yarım/yüksek dikdörtgeni dışlar; tam yarımlardan en fazla iki tane bulunur. Ağırlıklar sırasıyla 2/1/0, toplam genişlik ağırlığı <=2W. Döndürmelerde minimum yük alınır. Kenar taşması bu zorunlu parça alanı ilişkisini değiştirmez.
4. **Klik:** iki parça aynı stokta ancak bir eksende toplam boy+k ve diğerinde maksimum boy sığıyorsa ayrılabilir. Terminal artık şartını bu çift testi kullanmaz. Her uygun stok/rotasyonda ayrılması imkânsız çiftlerden seçilen klik için her parça farklı levha gerektirir. Kerf taşması iki parça arasındaki zorunlu k'yı azaltmaz.
5. **Fullspan-strip exact:** yalnız uygun bütün stokların kullanılabilir eni aynı sabit, döndürülemeyen parça enine eşitse problem 1D'dir. Desen şartı sum(h)+(n-1)k<=H. Katı mod ayrıca residual=0 veya residual>=k ister; yeni mod bu son filtreyi kaldırır. Desenler ve stok adetli örtü DP'si eksiksiz biterse bu özel sınıfta exact sonuç korunur; bütçe aşımı kanıt değildir. Daha geniş bir uygun stok veya başka rotasyon varsa sınıf reddi korunur. Genel 2D optimumluğu sonucu çıkarılmaz.

## Aynı projelerde ölçüm

Başlangıç motoru 4d55662 / motor içeriği 27d0513. Aynı arşiv girdileri, önce false sonra true; hedef başına 5 s. Aşama 0 koşucusundaki `bounds:[]` hatası **iki taraf için de** gerçek sertifika details aktarımıyla düzeltildi. Eski Worker `invalid-bound` sonuçlarından bütçe/scope teşhisi yapılmaz. Referans planlar yeniden ayarlanmadı.

Node 24, Linux. Süreler çocuk süreç başlangıcı ve denetimleri içeren duvar süresi. İlk geçerli plan çocuk ölçümüdür. Tek tekrar; eşzamanlı bazı regresyon çalışmaları olduğundan küçük süre farkları istatistiksel hız iddiası değildir. RSS Node/VM ve fork başlangıç yüksek su izini içerir; saf motor heap ölçümü değildir, Aşama 0'daki 71,3 MiB ile doğrudan nedensel regresyon kıyası yapılamaz.

| Küme/hedef/mod | Toplam levha | Toplam sentetik TL | Süre p50/p95 ms | İlk geçerli p95 ms | Tepe RSS MiB | LB gap medyan/p95 % |
|---|---:|---:|---:|---:|---:|---:|
| development/count/before | 317 | 621365 | 391.6/461.2 | 336.6 | 149.4 | 13.33/21.43 |
| development/count/after | 317 | 621365 | 400.8/498.1 | 352.3 | 149.4 | 13.33/21.43 |
| development/cost/before | 337 | 613055 | 414.6/525.1 | 362.4 | 149.4 | 16.75/23.28 |
| development/cost/after | 337 | 613055 | 415.6/533.1 | 361.3 | 149.4 | 16.75/23.28 |
| acceptance/count/before | 618 | 1181978 | 429.7/543.9 | 405.1 | 144.2 | 8.33/21.43 |
| acceptance/count/after | 617 | 1179030 | 443.9/523.0 | 416.2 | 159.4 | 8.33/21.43 |
| acceptance/cost/before | 663 | 1166747 | 467.6/524.6 | 383.0 | 160.6 | 14.66/27.64 |
| acceptance/cost/after | 662 | 1164697 | 459.7/565.4 | 392.4 | 132.9 | 14.66/27.64 |

53/60 projede, 93/120 hedef koşusunda geometrik plan/kesim listesi değişti (zamanlama metadata'sı karşılaştırmaya dahil değil). **Yalnız 930102'de levha sayısı iyileşti:** count 16→15, cost 17→16; her iki hedefte 2.050 sentetik TL azalma. Count hedefinde 930112/930116/930131 aynı levha sayısıyla sırasıyla 213/20/665 TL daha az kullandı. Geliştirme setinde levha/maliyet toplamları değişmedi. Kabul cost toplamı %0,176 azaldı. LB gap p95 kapıları hâlâ geçmiyor. Artık büyüklüğünün optimumluğu iddia edilmiyor.

Ham koşu özeti/plan hashleri `results/paired-metrics.json`; yeniden üretim `node tests/stage1/measure.cjs <eski-docs> <çıktı-dizini>`. Tam girdiler değişmeden Stage0 campaign.json.gz içindedir. Yerel tam planlı paired.json.gz ölçüm çıktısı ayrıca korunmuştur.

## Üç eski sayım açığının salt okunur incelemesi

Motor değişikliğinden önce arşivdeki planlar karşılaştırıldı. Tam parça/stok/kesim listeleri `results/three-reference-cases.json` içinde. Kabul vakalarıyla algoritma ayarı yapılmadı.

| Tohum | Kazanan somut desen | Motor kaybı / Aşama 2 girdisi |
|---|---|---|
| 930108, 17→16 | front18: iki 2800×2100'de 11+1 parça yerine tek 3660×1830'da 12 parça; yatay ilk kesim yerine düşey ilk kesim. Kaynak bağımsız mümkünlük tanığı. | Stok seçimi ile kesim yönünün birlikte değerlendirilmesi eksik adayı açıklıyor. 12 parçalı grup mevcut count exact sınırı 11'i aşıyor. Öncelik: stok/rotasyon/desen çeşitliliği ve multiplicity temsili. |
| 930124, 16→15 | body18: sekiz 3660×1830 / düşey ilk kesim yerine bir 2800×2100 + altı 3660×1830 / yatay ilk kesim; 122 parça. Referans production-restart-8-area. | Aynı üretim kurucusu farklı hedef/sıralamayla bulabiliyor. Ortak aday havuzu ve sıralama çeşitliliği güçlü öncelik; yalnız süreyi artırmak yeterli teşhis değil. Ortak hedef havuzu uygulaması Aşama 4'e ait. |
| 930125, 11→10 | back8: 1800×650 artıkta 2 + 2800×2100'de 8 + 3660×1830'da 7 yerine iki 3660×1830'da 7+10; ikisi düşey ilk kesim. Referans production-restart-216-minimum, arşivde ~16,9 s. | Küçük artığı erken açma ve sonraki stok/sıralama seçimi daha iyi blok birleşimini kaçırıyor. 17 parçalı grup exact kapsam dışı. Öncelik: çokluk desenleriyle iki levhalı birleşim ve alternatif ilk stok adayları. |

Bunlar somut plan farkları ve kod kapsamından çıkarımlardır; her nedenin izole ablation deneyi yapılmadı. Özellikle ~16,9 s eşzamanlı referans koşusudur, gerekli asgari süre değildir. Yeni B1 bu üç eski açığı kapatmadı.

## Değişen dosyalar ve devam

İlk commit: bağımsız fiziksel doğrulayıcı, 10 negatif örnek, supplied paketin tests/independent-b1/ kopyası, Stage0 bağımsız doğrulama adaptörü ve handoff/CI kaydı.

İkinci çalışma: `docs/engine/cutting-engine.js`, `production-audit.js`, `physical-verifier.js`, `fullspan-strip-exact.js`, `optimality-certificate.js`, `docs/guillotine-exact.js`, `economic-exact.js`, `index.html`, `sw.js`; test ayarı aktarımı/benchmark düzeltmesi, geometri test yükleyicisi, `tests/stage1/` kod ve raporları.

Önerilen ürün varsayılanı, kabul tamamlandıktan ve atölye fiziksel uygulamayı doğruladıktan sonra **açık** olabilir. Bu kararı uygulamadım; şimdi eksik/false alan eski katı davranışı koruyor. Sunucu SQL guard dar-artık modeline taşınmadı ve canlıya dokunulmadı. Tolerans/ondalık ölçek uyuşmazlıkları, tarayıcı/PDF ve bağımsız kapının performansı kalan risklerdir.

Sonraki iş yalnız **Aşama 1 kabul açıklarını kapatma** olmalı. Aşama 2 için yetki alınmadı.
