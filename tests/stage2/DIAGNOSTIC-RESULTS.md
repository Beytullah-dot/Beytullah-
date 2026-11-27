# Aşama 2 — benzer K2 teşhis vakaları (27 Kasım 2026)

Kullanıcının %21,5 katı, %59,4 dar artık ve oracle-mümkün eksik işinin tohumları henüz elde edilmedi. Bu dosyalar o üç vakanın yerine geçmez. Repo üreteci `gen-big.big(seed,{K:2})` ile 980000–980013 arasındaki 14 tohum tarandı; bu üç ayrı benzer vaka seçildi. Kaynak b75de7b90506cffafd4b8dc33e8c975a0f032d95. V8 yürütümündeki gerçek modüller, bağımsız Pareto oracle, üretim auditi ve fiziksel verifier kullanıldı; browser/ci performans ölçümü değildir.

| Tohum / model | Hedef | Oracle | Lazy / korunan plan | Desenler | Ayrı stok+adet vektörleri | Örtü geçiş sınırı |
|---|---|---:|---:|---:|---:|---:|
| 980002 / katı | area | 5418 | 6503 | 51 | 20 | 80001 |
| 980012 / dar artık | cost | 313 | 351 | 2101 | 166 | 80001 |
| 980013 / katı | cost | 135 | 162 | 1169 | 167 | 80001 |

Deney varyantları kaynak üzerinde yalnız bellekte çalıştırıldı. reverseChildren: a:x,b:y yerine a:y,b:x. largerFrontier: 48→192. fourTopologies: aynı kutu için ilk 1 yerine ilk 4. coverDedup: gerçek stok üzerinde materialize edilebilen desenler arasında stok id + count vector anahtarıyla bir temsilci. coverBudgetOnly: 80k→800k. stockInstanceDP: her fiziksel stok örneğini sırayla işle; skip veya tek geçerli desen; toplam adet vektörüne göre en düşük değeri tut, somut desen zincirini sakla; 80k ve 800k ayrı bütçeler. Bu varyantlar ikincil artık eşitliğini optimize etmiyor ve üretime uygulanmadı. Bağımsız restrictedOptimum aynı oluşturulmuş desenlerin stok adetleriyle sınırlı ayrı örtü DP'sidir. JSON'daki verifiedWitness varsa üç doğrulayıcıyla tam ve oracle değerine eşit fiziksel plan doğrulandı.

Her vakada temel DP 80.001 geçişte tam plan bulamıyor. İlk vakada desen üretimindeki 48 sınırına hiç ulaşılmıyor; 51 desen 20 farklı stok+adet vektörüne indiriliyor. Diğerlerinde frontier ve join sınırları etkili ama mevcut desen kümesi bile oracle değerini kapsıyor. Çocuk sırası/topoloji değişikliği bazı katı örneklerde restricted optimumu kötüleştirdi; tek topoloji tutmanın genel etkisi ayrı araştırılmalı. Körlemesine sınır yükseltme veya ilk dört topolojiyi tutma çözüm olarak kabul edilmedi.

Öneri (onay bekliyor): 1) fiziksel stokta doğrulanmış eşdeğer desenleri stok kimliği+adet vektöründe sıkıştır, en büyük kullanılabilir artık tanığını koru; 2) stok örneği sıralı miktar DP'si veya eşdeğer grup-bazlı bounded knapsack ile stok kullanım permütasyonlarını ortadan kaldır; 3) mevcut geçerli incumbent her zaman korunmalı, kaynak sınırı gerekçesi dış yanıta taşınmalı; 4) kullanıcıya ait üç tam seed/girdiyle ayrı ablation, sonra geniş oracle/kapalı eşleşme/12 UI regresyonu. Yeni motor kodu bu teşhis için değiştirilmedi.
