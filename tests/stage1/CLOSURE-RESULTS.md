# Aşama 1 / PR #61 kapanış denetimi

2026-11-24. Merge yapılmadı; Aşama 2 başlatılmadı. Varsayılan **KAPALI**. Gerçek stok, Supabase, Auth ve üretim verisine erişilmedi. Bütün oda girdileri sentetiktir. Hazır witness çözücüye verilmedi.

## 1. Bilinen kalan iki üretim işi

| Seed | Stok | Ana motor, açık | Bağımsız relaxed optimum | Sonuç |
|---|---|---|---|---|
| 912041 | 25×20, q1, kerf2 | 1 parça eksik | 1 levha; alan500; maliyet12 | B3, kapsam dışında |
| 913243 | 20×12, q2, kerf3 | 1 parça eksik | 2 levha; alan480; maliyet52 | B3, kapsam dışında |

`results/missed-generic-{912041,913243}-{area,cost}.json` tam girdileri içerir. `closure/find-missed.cjs` generic 910000–913243 taramasıyla iki benzersiz işi bulur; hedef başına iki kayıt ayrı iş değildir. `results/missed-diagnosis.json` katman sonuçlarını kaydeder.

912041: ana motorun aday araması mümkün yerleşimi kaçırıyor; kapalı/açık birer parça eksik. Yapıcı Worker serbest döndürülebilir parçalar nedeniyle `unknown-class`, 0 düğüm ile çıkıyor. Üretim UI'si tamamlanmış incumbent olmadan solve/economy başlatmadığı için bu iki Worker kurtarma yapamıyor. Bayrak mesajda mevcut; bu vakadaki neden bayrağın taşınmaması değil. Bağımsız oracle mümkünlüğü gösteriyor. Ham girdiden ayrı exact tanı çağrısı da mümkün plan buluyor; bu ikinci sonuç bağımsız kanıt sayılmadı.

913243: kapalı modelde iş mümkün değil; açık modelde mümkün, ana motor yine bir parçayı kaçırıyor (kapalıda iki). Yapıcı Worker aynı serbest dönüş sınıf engelinde 0 düğümle çıkıyor. Solve/economy yine üretimde çağrılmıyor. Doğrudan exact tanı açıkta mümkün, kapalıda imkânsız; üretilen tanı planı bağımsız doğrulayıcıdan geçti. Yapıcı algoritmanın dar artık desteği ayrıca sınırlıdır, ancak burada ilk engel sınıf reddidir. Bu iki işin çözümü küçük işlerde tam fallback gerektiriyor; Aşama 3/B3 kapsamına bırakıldı. Bu PR tüm mümkün işlerin tamamlandığını iddia etmez.

## 2. Kapasite: önceki 60 saniye yorumunun düzeltilmesi

Önceki 60 saniyelik kesilme **105 işlik bütün test kampanyasının dış süre sınırıydı**, tek bir işin süresi değildi. Tekil işte 60 saniye aşımı yeniden üretilemedi. Eşik gevşetilmedi: mevcut 4 saniyelik algoritma watchdog'u ve 17 saniyelik alt süreç sınırı korundu. Tanı için tüm pakete yeterli dış çalıştırma süresi verildi.

Linux / Node24.22.3, her iş ayrı süreç, 105 farklı iş; p95 en yakın sıra yüzdeliğidir. Süreler ms, RSS MiB. Tek geçiş karşılaştırması hızlanma kanıtı değildir.

| Ölçüm | Kapalı | Açık |
|---|---:|---:|
| Ana motor p50 | 75.47 | 68.83 |
| Ana motor p95 | 540.94 | 453.75 |
| Ana motor maksimum | 878.07 | 792.46 |
| Worker p50 | 22.62 | 21.23 |
| Worker p95 | 542.49 | 507.89 |
| Worker maksimum | 922.46 | 853.06 |
| Ana süreç tepe RSS | 142.92 | 154.25 |
| Worker/exact süreç tepe RSS | 144.12 | 143.56 |
| Bütün kampanya saniye | 94.925 | 89.502 |
| Tam, bağımsız doğrulanmış ana plan | 105/105 | 105/105 |
| Yapıcı Worker tam sonuç | 69/105 | 69/105 |

`results/capacity-{closed,open}.json` ham sonuçlardır. Worker'ın diğer 36 işi unknown sınıfındadır; ana motor tamamlar. Birleşik optimum sertifikaları 60/63 işte oluşur; kalan işler optimum diye etiketlenmez.

Aynı ağır `strip4 / N1000 / area` işi her bayrakta 5 kez ayrıca çalıştırıldı (`closure/capacity-repeat.cjs`, `results/capacity-repeat.json`):

| Aynı iş, n5 | Kapalı | Açık |
|---|---:|---:|
| p50 ms | 878.30 | 866.38 |
| p95 / max ms | 1002.07 | 890.06 |
| tepe RSS MiB | 133.64 | 134.56 |

n5 için p95 maksimuma eşittir; kuyruk gecikmesi tahmini zayıftır. B1 süre regresyonu ölçülmedi. Açık kampanyanın en yüksek RSS'si yaklaşık 11.3 MiB daha fazladır; bu tek geçiş bellek regresyonu hükmüne yetmez. Öneri: yalnız tüm kampanyanın dış tanı süresi için 180 saniye değerlendirilebilir; tekil kabul sınırları değişmesin. Bu öneri uygulanmadı, karar kullanıcıya aittir.

## 3. Varsayılan kapalı

Motor ve auditor eksik/undefined bayrağı eski global state'ten devralmıyor, yalnız `=== true` ile açıyor. UI başlangıç verisi açıkça false. UI Worker mesajları ve PDF snapshot alanları açıkça boolean taşır. Bağımsız test girdilerinin önceki örtük açık varsayımı kaldırıldı; relaxed testler `BEY_NARROW_SCRAP=1` ister. Test Worker yükleyicisinin mesajı gizlice değiştirmesi kaldırıldı.

`closure/default-off.cjs`: false/eksik/undefined ile fiziksel plan ve üç Worker cevabı aynı; yalnız zaman ölçüm alanları karşılaştırmadan çıkarılır. Stale global state=true iken de kapalıdır. 3×810×1220 referansı kapalıda 2 levhadır. UI tarayıcı testi üç varsayılanı ayrıca kontrol eder. Snapshot kurucuları için statik kontrol vardır. Bu testler geçti.

Bağımsız doğrulayıcı kapasite verisindeki 10.0009 gibi ölçüler için 10^-6 mm tam sayı ızgarasına taşındı; desteklenmeyen hassasiyeti yuvarlayıp kabul etmez. `closure/precision.cjs` dört/altı basamak kabulünü ve 10^-8 koordinat reddini sınar. Browser kopyasının çekirdeği bağımsız modülle eşitlik testinden geçer; modül motor import etmez.

## 4. Gevşek modelde alt sınırlar

**Kerf-genişletilmiş alan.** Her net dikdörtgen sağa ve aşağı k kadar genişletilir. İki parça en yakın ortak ata giyotin kesiminde en az k boşlukla ayrıldığından genişletilmiş içleri çakışmaz. Terminal bıçak taşması yalnız dışta veya daha önce açılmış kerfte kalır; parçalar arası bu ayırmayı azaltmaz. Bütün genişletilmiş parçalar (W+k)×(H+k) kapsayıcısına sığar. Dolayısıyla genişletilmiş alan toplamı bu kapasiteyi aşamaz. Yön minimizasyonu ve heterojen stok için kapasite üst tahminleri sınırı ancak zayıflatır.

**Kardinalite/eşik.** Bir eşik sınıfındaki parçaların her iki boyutu eşikten büyük/eşitse, her parçaya bu boyutta iç kare atanabilir. Giyotin ayırıcıları ve aralarındaki k boşluğu korunur. W,H stokta güvenli kapasite, genişletilmiş boyutlardan hesaplanan floor((W+k)/(edge+k))×floor((H+k)/(edge+k)) üst sınırıdır. Terminal kesimde k istememek zaten paydaki +k ile karşılanır. Uygun alt kümelerin sayım kısıtları ve bunların alanla birleşimleri gerçek her planın sağlaması gereken kısıtlardır; bu kısıtlarla yapılan stok/maliyet/alan örtme gevşetmeleri gerçek optimumu aşamaz. Tam, çoklu ve üçlü eşik sertifikaları bu gerekli eşitsizlikleri kullanır.

**Yarı-aralık.** Kerf tamamen yok sayılır. Bir eksende yarımdan büyük aralık 2, tam yarım 1, küçük aralık 0 ağırlığı alır. Her kesitte bu ağırlıkların toplamı en çok 2 olabilir; diğer eksen boyunca integre edilince ağırlıklı uzunluk toplamı en çok 2W (veya 2H) olur. İzinli yönler arasındaki en küçük katkı kullanılması gevşetmedir. Dar terminal artık bu çakışmama argümanını değiştirmez.

**Klik.** İki parçanın aynı levhaya konabilmesi için ortak ata kesim yönlerinden en az birinde toplam net boyut+k stok boyutunu aşmamalı ve diğer boyutlar sığmalıdır. Bu yalnız parçalar arasındaki kesimi kullanır, dış kenarda ek k istemez. Tüm izinli yön ve stoklarda birlikte sığamayan çiftlerin oluşturduğu klikte her eleman ayrı levha ister. Terminal taşma komşu parçaya izin vermediğinden çift uyumsuzluğu ve klik sınırı geçerlidir.

**Tam-aralık şerit.** Yalnız uygun sabit yönlü, ortak tam genişliği kaplayan şerit sınıfında 2B problem 1B olur: toplam yükseklik+(n−1)k≤H. Son şeritten sonra ek k zorunlu değildir. Açık modda katı terminal artık filtresi uygulanmaz. Sonlu desen/adet DP bütçe içinde tamamlanırsa bu dar sınıf için kesin sonuçtur; süre/düğüm sınırında bitmemiş arama kanıt sayılmaz. Artığın optimumluğu iddia edilmez.

`closure/bounds-relaxed.cjs` bağımsız relaxed alt küme oracle'ıyla karşılaştırır. 309 girdi (üç ailede 100'er seed 970000–970099, 7 tipli bir fixture, 8 şerit fixture), 199 mümkün iş; hiçbir alt sınır oracle optimumunu aşmadı. İmkânsız/uygun olmayan sınıflar zorla başarılı sayılmadı.

| Sınır kontrolü | Karşılaştırma | İhlal |
|---|---:|---:|
| Genişletilmiş alan (sayı/alan/maliyet) | 597 | 0 |
| Kardinalite | 597 | 0 |
| Alan+kardinalite | 597 | 0 |
| Çoklu eşik | 570 | 0 |
| Üçlü eşik | 507 | 0 |
| Motor kerf-alan | 199 | 0 |
| Yarı-aralık | 199 | 0 |
| Klik | 199 | 0 |
| Tek parça kapasite | 199 | 0 |
| Tam-aralık kesin şerit | 8 | 0 |

Ham sonuç: `results/bounds-relaxed.json`. Bağımsız alt küme oracle'ı en çok 8 fiziksel parçayı kapsar; 7 farklı tipli fixture bu nedenle kapsanır. Büyük kopya sayılı Pareto oracle'ının sınırı en çok 3 tam tiptir (boyut/yön/damar/malzeme/kalınlık). Büyük ve 6 tipten fazla işlerde bu oracle ile optimumluk doğrulaması yapılmış değildir. Matematiksel gevşetmeler tip sayısıyla sınırlı değildir; sonlu testler evrensel kanıtın yerine geçmez.

## 5. Tarayıcı ve PDF

Üç sentetik oda gerçek UI'de çalıştırıldı, nihai plan bağımsız doğrulandı, gerçek PDF düğmesinden PDF indirildi. Bütün dış bağlantılar kesildi; yalnız yerel uygulama ve yerelden sağlanan pdfmake kullanıldı. Kullanıcı incelemesi için `results/visual/` ekranları, PDF'leri ve nihai plan JSON'larını içerir.

| Oda | Parça | Levha | overhang kesimi |
|---|---:|---:|---:|
| Mutfak | 10 | 2 | 2 |
| Banyo | 7 | 3 | 1 |
| WC | 7 | 1 | 1 |

İlk PDF görsel kontrolü WC'nin alt ölçü etiketinin sayfa dışına çıktığını ve çizimin başlıktan ayrıldığını ortaya çıkardı. PDF çizimi en-boy oranı korunarak 750 pt genişlik ve 400 pt yükseklikle sınırlandı. Yeniden üretilen 5/7/4 sayfalık PDF’lerin tüm sayfaları render edilip görsel olarak incelendi: levha çizimleri ve dış ölçüler kesilmiyor, parça etiketleri ve kesim tabloları korunuyor. Taşma etiketleri mutfakta sayfa 3’te iki kez, banyo ve WC’de sayfa 3’te birer kez mevcut. Kesim listesi/tablolar gerektiğinde sonraki sayfaya devam eder; bazı bölüm başlıkları önceki sayfanın sonunda kalır, veri kaybı yoktur. Küçük diyagram yazıları PDF yakınlaştırması veya net ölçü tablosuyla okunabilir. CI artifact 14951693708, üretim kodu a12542bf7caf8828a8df3ef7749b4b41abcf1b9d; kullanıcı görsel onayı henüz alınmadı.

## Testler ve kapsam

Kod 4ab8c6 için CI: Optimizer 45402410836, Geometry 45402410843, iPhone/Chromium-PDF 45402410893 ve Scale research 45402410794 başarılı. PDF boyut düzeltmesi a12542b için de Optimizer 45460409810, Geometry 45460408869, iPhone/Chromium-PDF 45460408810 ve Scale research 45460408911 başarılı. Kapanış ek üretim emülasyonu: 4 aile ×200 seed, alan ve maliyet hedefleri; geçersiz plan, falseOptimal, falseOptimalRelaxedOnly, Worker geçersiz plan ve exception sıfır (`results/closure-ui-*`). Bu 800 işlik pencere, daha uzak seed'lerdeki bilinen iki işi ortadan kaldırmaz. Önceki 3200 vakalık bağımsız dış denetim kullanıcı tarafından bildirilmiştir; bu kapanışta yeniden yapılmış gibi sunulmaz.

## Değişen dosya grupları ve kalan risk

- `docs/engine/cutting-engine.js`, `production-audit.js`: default kapalı.
- `docs/engine/physical-verifier.js`, `tests/physical-guillotine-verifier.cjs`: bağımsız hassasiyet desteği.
- `docs/index.html`: açık false başlangıç ve PDF sayfa sığdırma.
- `tests/independent-b1/{lib,run-ui,run-big}.js`: açık test bayrağı, gerçek Worker mesajı.
- `tests/motor-capacity-matrix.cjs`: iki mod ölçümü ve bağımsız doğrulama.
- `tests/stage1/closure/*`: yeniden üretim, varsayılan, sınır, tarayıcı ve kapasite testleri.
- `tests/stage1/results/*`: ham ölçüm, başarısız girdiler ve görsel/PDF kanıtlar.
- `.github/workflows/{optimization-verification,ios-webkit-acceptance}.yml`: kapanış kontrolleri ve görsel artifact.
- Bu rapor, önceki sonuç raporunun yönlendirmesi ve handoff güncellemesi.

Bilinen iki tamamlanamayan iş açıktır. Büyük çok tipli işler bağımsız kesin oracle kapsamı dışındadır. Kapasite örnek sayısı ve ortam değişkenliği kuyruk/RSS hükmünü sınırlar. Operatörün fiziksel makine/bağlama kabulü otomatik tarayıcı testinden çıkarılamaz. Varsayılan KAPALI kalır; kullanıcı onayı beklenir.
