# Beythaus Cut — Ticari motor kabul sözleşmesi

23 Kasım 2026 tarihli kullanıcı kararı ve Aşama 0 deney önerisi onayı.

## Ürün hedefi

Her gösterilen tam üretim planı bağımsız fiziksel doğrulayıcıdan geçer. Ana kalite hedefi, süre bütçesi içinde seçili hedefin güvenli alt sınırına yaklaşmaktır. Kesin çözüm küçük gruplarda tamamlanırsa hedefe özgü kanıtlı optimum etiketi kullanılabilir.

Öncelik önce levha sayısı veya kayıtlı stok maliyetidir. Eşitlikte tek parça halinde kullanılabilir en büyük dikdörtgen artık seçilir. Artık optimumluğunun ispatı aranmaz. Mevcut alan hedefi karşılaştırma ve regresyon ölçümünde korunur. Bu belge yeni ürün kararını tanımlar. Üretim arayüzünün hedef, etiket ve Worker geçişleri Aşama 5'e kadar tamamlanmış sayılmaz.

Bütün fiziksel koşullar korunur. Malzeme, kalınlık, parça yönü, döndürme izni, stok miktarı, trim, kerf ve tam kenarlı giyotin kesim denetlenir. Parça sayısına keyfi giriş tavanı konmaz.

## Sonuç dili ve matematiksel anlamı

Tam plan için hedeflenen ürün ifadeleri “Kanıtlı optimum” veya “Alt sınırın %X üstünde”dir. UNKNOWN ürün metni olarak kullanılmaz. Araçlar ve test kayıtları ayrıntılı teknik durumu saklayabilir.

Başlangıçta küçük grup en fazla 8 fiziksel parçadır. Optimum etiketi, seçili amaç ve izin verilen bütün fiziksel giyotin planları için tamamlanmış kesin çözüme dayanır. Özel kesim sınıfı içinde biten arama genel optimumluk sağlamaz. Çok gruplu projede grup bağımsızlığı, stok paylaşımı ve malzeme ataması da kanıt kapsamına uymalıdır. Sezgisel planın puanının bir başka sezgisel sonuçla eşleşmesi yeterli değildir.

U, bağımsız fiziksel denetimden geçen tam planın seçili hedef değeridir. L aynı amaç ve fiziksel model için güvenli, pozitif alt sınırdır. Gösterilecek fark `100 × (U − L) / L` olur. Bu değer optimum çözümden gerçek kaybın üst sınırıdır. Gevşek alt sınır iyi bir plan için de yüksek fark verebilir.

Tam plan yoksa üretim planı sunulmaz ve “Süre içinde tam plan bulunamadı” denir. İlgili fiyat eksikse maliyet farkı hesaplanmaz ve “Maliyet farkı için stok fiyatları gerekli” denir. L sıfırsa yüzde hesaplanmaz. Yuvarlanmış sıfır fark optimum etiketi sağlamaz. Eksik fiyat sıfır fiyat sayılmaz.

## Aşama 0 için onaylanan deney

Ticari başlangıç zarfı bir dairenin mutfak, WC, banyo ve vestiyer panel işidir.

| Parametre | Önerisi onaylanan kapsam |
|---|---|
| Fiziksel parça adedi | 100–260 |
| Farklı parça tipi | 25–90 |
| Malzeme/dekor/kalınlık grubu | 3–7 |
| Mutfak | 55–130 parça |
| WC | 5–20 parça |
| Banyo | 10–35 parça |
| Vestiyer | 30–75 parça |
| Ana stok ebatları | 2800×2100 ve 3660×1830 mm |
| Kalınlık | Gövde/kapak 18 mm, arkalık 8 mm |
| Kerf | Ana değer 3,2 mm; varyant 3 ve 4 mm |
| Trim | Ana değer her kenarda 10 mm; varyant 0 ve 5 mm |
| Dağılım | 20 geliştirme + 40 sabit kabul tohumu |

Parçalar dolap modüllerinden türetilir. Her parçanın oda ve modül bilgisi korunur. Stok türleri bol, sınırlı karma ve önceki işlerden kalan dikdörtgen artıklı aileler içerir. Fiyatlar sentetiktir. Veriler gerçek müşteri dağılımı olarak sunulmaz. Aynı gruptaki farklı odalar birlikte kesilebilir.

Mevcut üretecin 60 tohumunda gözlenen aralık 129–225 parça, 28–65 tip, 3–5 gruptur. Onaylanan zarfın uç değerleri ve gerçek atölye örnekleri için kapsam açığı vardır. Bu örneklem bütün zarf için garanti oluşturmaz.

Her mümkün testin bağımsız bir fiziksel tanığı saklanır. Motor tanığa erişmeden girdiyi çözer. Her başarısızlık seed, üreteç sürümü ve tam parça/stok listesiyle kayıtlıdır. Girdi üretimi ve bütün seçilmiş planlar yeniden denetlenebilir olmalıdır.

Kısa koşu başına 5 saniye bütçe verilir. Uzun karşılaştırma için önerilen üst bütçe proje/hedef başına 60 saniyedir. Aşama 0 uygulamasında proje başına 60 saniyelik ortak aday havuzu her iki hedefi besler; toplam bütçe bu üst sınırın içindedir. Havuz iki kısa koşunun sonuçlarını da içerir. En iyi bilinen değer B, `100 × (U − B) / B` ile ayrıca raporlanır. B için optimumluk iddiası yapılmaz.

## Onaylanan ilk kabul eşikleri

| Kapı | Eşik |
|---|---|
| Fiziksel geçerlilik | Gösterilecek her tam aday bağımsız denetimden geçer. Geçersiz sunulan plan ve yanlış optimum etiketi 0 |
| Tam plan | Mümkünlüğü bağımsız tanıklı 40 kabul projesinin her birinde, iki hedefte de geçerli tam plan |
| Güvenli alt sınır farkı | Her hedef ayrı; medyan en fazla %10, p95 en fazla %20 |
| Bilinen en iyi maliyet | p95 uzaklık en fazla %5 |
| Bilinen en iyi levha sayısı | En az 38/40 projede eşit, kalanlarda en fazla 1 levha fazla |
| İlk geçerli tam plan süresi | Referans ortamda p95 en fazla 3 saniye, her koşuda en fazla 5 saniye |
| Bellek | Linux izole süreç tepe RSS en fazla 256 MiB |

Geliştirme ve kabul tohumları ayrı değerlendirilir. Bir eksik plan tam-plan kapısından kalır; yüzdeliklerden sessizce çıkarılmaz. Her dağılımda ölçülen ve eksik sayısı gösterilir. Gerçek iPhone Safari kabulü ayrıca yapılır. Geçen Node ölçümü mobil SLA'yi kapatmaz. Uzun aramanın RSS ve duvar süresi ayrı raporlanır.

## Aşamalar ve yetki sınırı

0. Ticari üreteç, güvenli fark metriği, uzun arama referansı ve kaynak ölçümü. Sonuçları raporlayıp dur.
1. Dar artık/son kerf taşması B1. Üretim yerleşimi, fiziksel denetim ve kesin çözücü aynı fiziksel modele alınır. Bağımsız doğrulayıcı ve eski alt sınırların geçerliliği ayrıca sınanır.
2. B2/B5 için az tipli, çok kopyalı işlerde çarpanlı kesin/Pareto DP veya güçlü sezgisel; partLimit sınırına takılan işler.
3. B3 için en fazla 8 parçalı işlerde tam alt küme DP son kurtarma adımı.
4. B4 için bütün hedef adaylarının ortak havuzu ve seçili hedefte en iyinin sunulması.
5. Kanıt/Worker katmanının sadeleştirilmesi, ürün dili ve büyük projelerde ana optimizasyonun Worker'a taşınması.

Her aşamadan önce bulgu ve öneri kullanıcıya sunulur. Kullanıcının onayından sonra uygulanır. Her aşama sonunda değişiklikler, gap/süre/bellek ve kalan risk raporlanır. Aşama 0 onayı Aşama 1'i uygulama onayı sayılmaz. Süre sınırı aşılırsa tamamlanan iş ve alternatif raporlanır.

Gerçek Supabase stokları, Auth ve üretim verisi bu çalışma kapsamına alınmaz. Motorun ticari kabulü ile ürün v1'in canlı bulut, üretim, PDF ve gerçek cihaz kabulü ayrı kapılardır.

Ölçüm kaynakları `tests/commercial-stage0/README.md`, `tests/commercial-stage0/results/summary.json` ve `tests/MOTOR-APARTMENT-STAGE0-RESULTS.md` dosyalarında tutulur.
