# Beythaus Cut — Motor mimarisi, elektrik panosu prensibi

## Karar ve kapsam

**Amaç:** Bir motor hatasının hangi devrede doğduğunu göstermek, hatalı bir yerleşimi
üretim emrine dönüştürmeyi önlemek ve matematik motorunu UI/QR/bulut koduna
dokunmadan test edebilmek.

**2026-11-20 motor güncellemesi:** Yalnız parça üzerindeki yön bilgisi stokun
boy/en eksenlerine göre döndürme kısıtıdır. Matematik motoruna, 20–25 levhalık
büyük ve tekrarlı projelerde de çalışabilen tam sayılı alan/maliyet örtüsü
ve testere paylı eş parça kapasitesi sertifikaları eklendi. Mevcut müşteri
stokları değiştirilmedi; bu gelişme tüm projelerde optimum garanti etmez.

## Yeni devre şeması

```text
 [P0  PROJE VE ENVANTER]                ← Yerel/bulut, kullanıcı ayarları
         |
         v  normalize(): mm, tür/kalınlık, tekil parça kimlikleri
 [P1  KESİM MOTORU]                    docs/engine/cutting-engine.js
         |                               39 özgün hesaplama fonksiyonu
         |--------> hızlı plan           geometri, giyotin, alan/maliyet alt sınırı
         |
         v
 [P2  BAĞIMSIZ GÜVENLİK RÖLESİ]        docs/engine/production-audit.js
         |                               çakışma, kerf, stok, parça bütünlüğü
         |                               tam kenardan-kenara kesim ağacı
         |
   +-----+---------+
   | geçerli       | geçersiz → SONUÇ BLOKE / hatayı kaydet
   v
 [P3  KANIT VE ARKA PLAN ARAMASI]       docs/optimization-worker.js
         |--------> serbest yerleşim     aynı modelde minimum stok sayısı
         |--------> giyotin kesim       docs/guillotine-exact.js
         |--------> en düşük ek maliyet docs/economic-exact.js
         |--------> 25+ levha alan/maliyet alt sınırı
         |           docs/engine/optimality-certificate.js
         |           docs/optimality-worker.js
         |                               süre limiti = UNKNOWN, kanıt DEĞİL
         v
 [P2  YENİDEN BAĞIMSIZ DENETİM]        Worker adayı tekrar denetlenir
         |
   +-----+---------+
   | geçerli       | geçersiz → ADAY REDDEDİLİR
   v
 [P4  KULLANICI KARARI]                docs/index.html
         |                               daha pahalı/ucuz alternatiflerin onayı
         v
 [P5  ÇIKTILAR]
   ├── Düz kesim → Kesim sırası → Üretim PDF → Fiziki üretim onayı → Envanter
   └── Serbest yerleşim → YALNIZ TASLAK / ÜRETİME UYGUN DEĞİL
```

## Ayırdığımız devreler

| Devre | Tek sorumluluk | Sınır | Tipik hata |
|---|---|---|---|
| P0 Giriş | Proje/stock verisini normalize etmek | Henüz büyük HTML içindedir | Yanlış birim/kalınlık |
| P1 Hesaplama | Geçerli stok yerleşim adayları ve alt sınırlar | UI, DOM, ağ, PDF yok | Kötü verim, eksik aday |
| P2 Denetim | Kesimi bağımsız yeniden kontrol etmek | Çözüm üretmez | Kısa kesim, kerf, çakışma |
| P3 Kesin arama | Bağımsız çözüm, tam sayılı alt sınır ve işlem bütçesi | Sınırda UNKNOWN | Kanıtlanmamış optimum |
| P4 UI | Sonuç, onay, iptal ve arayüz durumu | Algoritma yazmamalıdır | Eski Worker yanıtı |
| P5 Üretim | Yalnız denetimden geçen fiziksel üretim | Serbest plan taslaktır | Yanlış PDF/yanlış stok |
| P6 CI | Değişikliklerin standart testleri | Gerçek saha testi yerine geçmez | Regresyon |

## Kod sözleşmesi ve bağımlılık düzeni

Sabit sıralama: **production-audit.js → cutting-engine.js → ana UI scripti**.

- `production-audit.js` denetim işlevlerini üretim motorundan bağımsız sunar:
  `auditGuillotineCuts`, `validateLayout`, `auditCutPlan`.
- `cutting-engine.js` hesaplama işlevlerini `createEngine({getState,val,mkey,fmt})`
  aracılığıyla sunar. Dışa açık sözleşme sürümü **1**'dir.
- Proje durumu bir nesneye kilitlenmez; `getState()` ile **o anda seçili proje**
  okunur. Hesaplama çekirdeği proje ayarlarını değiştiremez.
- Eksik denetleyici, eksik bağımlılık veya farklı sözleşme sürümü varsa sistem
  **sessizce devam etmez**, açık yükleme hatası verir.
- Eski `window.BeythausCut` fonksiyon adları geçiş için korunur. Yeni kodda
  matematiksel algoritma HTML içine eklenmemelidir.
- Sözleşme değişirse test adaptörü `tests/engine-harness.cjs` ve CI aynı
  sürümde güncellenmelidir.

**Değişmeyen fiziksel kural:** Giyotin modunda her kesim, kesildiği andaki
**aktif alt stokun** bir kenarından karşı kenarına uzanır. Parça koordinatı
doğruluğu tek başına giyotin üretim uygunluğu değildir.

## Arıza ayıklama tablosu

| Belirti | İlk bakılacak devre | Otomatik fail-safe |
|---|---|---|
| Parça stok dışında/çakışıyor | P2 denetim | Aday reddedilir |
| Kesim çizgisi karşı kenara ulaşmıyor | P2 kesim ağacı | Üretim kabul edilmez |
| 1 panel sığıyor ama panel testeresi kesemiyor | P1 mod + P2 | Serbest yerleşim **taslak** |
| Worker süre/düğüm sınırına geldi | P3 | UNKNOWN, optimumluk yok |
| Stok fiyatı eksik | P3 ekonomik hedef | Maliyet optimumluğu kanıtlanmaz |
| Kullanıcı hesap sürerken girdi değiştirdi | P4 iş orkestrasyonu | Eski Worker iptal/atılır |
| Bulut envanterinde çakışan tüketim | P5 senkronizasyon | Yetki/sürüm denetimi gerekir |
| PDF'nin üretim başlığı yanlış | P5 belge | Taslak filigranı/başlığı kontrolü |

## Değişiklik öncesi / sonrası

**Önce:** Yaklaşık 207 bin karakterlik tek HTML; yaklaşık 49 bin karakterlik,
39 fonksiyonlu hesaplama/denetim bölümü onun içinde. Bazı testler
`index.html` içindeki fonksiyon aralığını metinle keserek çalıştırıyordu.

**Şimdi:** Hesaplama ve giyotin/yerleşim denetimi ayrı tarayıcı modülleridir.
HTML'de yalnız çağrı ve UI iş akışı kalır. Matematik testleri
`tests/engine-harness.cjs` üzerinden **gerçek dağıtılan motoru** çalıştırır.

Bu aşamada **ana UI, veri girişi/normalize etme, PDF, orkestrasyon ve envanter**
hâlâ `index.html` içinde büyük bir bloktur. Tüm elektrik panosu henüz
baştan sona modülerleştirilmiş **değildir**. Bunları bir seferde taşımak
regresyon riskini artıracağı için ilk değişiklikte bilinçli olarak bırakıldı.

## Kontrol ve test kapıları

- `node tests/engine-contract.cjs` — sözleşme, bağımsız denetim,
  proje geçişi, üretim güvenliği, yükleme sırası ve PWA dosyaları
- `node tests/cut-validation.test.cjs` — gerçek arayüz betiği, envanter ve PDF
- `node tests/atolye-production-safety.cjs` — gerçek 11 parçalı atölye örneği
- `node tests/optimization-regression.cjs` — bağımsız referans çözümleyici
- `node tests/guillotine-worker.cjs` ve `node tests/economic-worker.cjs`
- `node tests/cloud-sync.test.cjs` — bulut/sürüm sözleşmesi
- CI: `.github/workflows/cut-validation.yml` ve
  `.github/workflows/optimization-verification.yml`.

**Dürüst doğrulama sınırı:** Jest/Node/CI testleri gerçek bir iPhone, panel
testeresi veya canlı Supabase işlemi yerine geçmez. CI ve gerçek cihaz sonuçları
ayrı takip edilmelidir.

## Sıradaki refaktör — önerilen sıra

1. `normalize()` ve giriş veri şemasını ayrı `input-contract` modülüne çıkar;
   milimetre, testere payı, kalınlık, miktar sınırlarını **tek noktada** uygula.
2. UI'daki iki Worker sürecini `job-controller` altında durum makinesi ile
   yönet; iş kimliği, iptal ve stale-response testlerini genişlet.
3. Üretim emri/PDF kurallarını `production-policy` altında birleştir,
   taslak/üretim belgesi ayrımını tek sınıflandırıcıya bağla.
4. Stok-enventere yazma sürecini ayrı `production-ledger` hizmetine taşı;
   fiziksel üretim gerçekleşmeden hiçbir stok düşümü yapılmasın.
5. Matematik motoru içinde giyotin, serbest ve ekonomik hedefleri ayrı
   strateji modüllerine ayır (birim ve doğruluk sözleşmesi sabit tutularak).
6. En sonunda gerçek telefon/e-posta/çevrimdışı bulut koşullarında E2E test.

Her adımın şartı: **ana davranışın referans sonuçlarla aynı kalması, denetimin
çalışması, CI'ın yeşil olması ve geri alma yolunun hazır bulunması.**

## Büyük çoklu-levha planlarda blok kurtarma (2026-11-20, PR #5)

`docs/engine/guillotine-block-repair.js` fiziksel yerleşimde
eksik parça varsa, ana açgözlü yerleştirme ve kesin çözüm
sertifikasından **ayrı** olarak devreye girer. Aynı stok
envanterinde parçaların tam kenardan kenara kesim
kurallarıyla birleştirilmiş 2, 4, 8 ve gerektiğinde 16
parçalı bloklarını sentezler. Tam levha veya dış kenarda
kalan ölçülü artıkla üretilebilecek blokları seçer; farklı
levhalara ait taslak kesim desenlerini yeniden birleştirir.
Süre / aday bütçesi dolunca eksik sonucu **imkânsız**
diye sunmaz.

İyileştirilmiş aday, `production-audit.js` tarafından
**bağımsız** doğrulanmadan kullanıcının planıyla
değiştirilmez. Kesim blokları asıl parça kimliklerine,
koordinatlarına, testere payına ve kesim sırasına
yeniden açılır. Hesaplama stok tüketmez.

Testler: `tests/motor-scalability-profile.cjs`,
`tests/motor-repair-stress.cjs` ve
`tests/MOTOR-BLOCK-REPAIR-RESULTS.md`. Heterojen
stok/ölçüde ve dış artıklı 29 zor örnek sabit regresyon
kapısıdır. Başka daha derin bir senaryo hâlâ
kısmi kaldığından motor **mühürlü değildir**.

## Yeni matematiksel garanti sınırı (2026-11-20)

- **Parça yönü:** yalnız parçaya ait `serbest`, `boyuna`, `enine`.
  Stokun girilmiş boy/en eksenleri referanstır; stokun eski `grain` alanı
  kesim yönü kısıtı değildir. Tarihî stok kayıtları silinmez.
- **Giyotin kesim:** sahada üretime uygun kesim ağacı bağımsız denetlenir.
  Araştırma/test amaçlı serbest yerleşim üretim planı sayılmaz.
- **Kanıt:** `optimality-certificate.js` stok türlerinin sınırlı miktarları
  arasında tam Pareto dinamik programlama yapar. Önce geometriyi gevşeten
  güvenli **alan** alt sınırı, eş ölçülü/tek yönlü parçalar için ayrıca
  **kerf'li maksimum parça adedi** alt sınırı kurulur. Denetlenmiş plan
  bu alt sınıra ulaşırsa ilgili tek amacın optimumluğu kanıtlanır.
- **25 levha kanıtı:** 400 adet 22×22 mm parça, 100×100 mm 25 stok,
  3 mm kerf; her stokta en çok 16 parça; minimum 25 stok ve aynı tip/fiyat
  stok koşullarında global maliyet/brüt alan optimumluğu fiziksel audit
  ile gösterilir. Bu **tüm farklı ölçülü 25 levha projelerini kapsamaz**.
- **İşlem limiti:** DP kesilir veya çözüm alt sınıra ulaşamazsa
  `UNKNOWN`/optimumluk aralığı açıkça korunur. Matematiksel kanıtı olmayan
  sonuçlara `OPTIMAL` etiketi verilmez.
- Reprodüksiyon ve mühürleme ön koşulları:
  [`tests/MOTOR-PROOF-STATUS.md`](../tests/MOTOR-PROOF-STATUS.md).
