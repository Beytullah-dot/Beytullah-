# Beythaus Cut — iPhone/Safari ve iki kullanıcılı kabul testi

> Durum: **GERÇEK CİHAZ TESTİ HENÜZ YAPILMADI.**
> Bu kontrol listesi, canlı uygulamanın yeni sürümü için kullanıcı tarafından
> fiziksel iPhone/Safari üzerinde tamamlanacak saha testidir.
> `tests/ios-webkit-acceptance.cjs` ayrı bir **emüle WebKit** regresyonudur;
> iki gerçek iPhone, gerçek Supabase Auth veya gerçek kesim cihazı değildir.

Canlı adres: https://beytullah-dot.github.io/Beytullah-/
Proje: `pdqgpupdqgrxejvjpdzs`.
Her sonucu **Geçti / Kaldı / Denenmedi** olarak işaretle; hata olursa ekran,
cihaz/iOS sürümü, saat, proje modu, stok türü, beklenen-gerçekleşen davranış
ve ilgili GitHub commitini not al. Şifreleri, davet kodlarını ve API gizli
anahtarlarını ekran görüntüsüne veya GitHub issue'suna ekleme.

## Güvenli hazırlık

1. Gerçek atölye stoğu yerine **ayrı bir TEST atölyesi** oluştur veya yalnız
   TEST etiketiyle oluşturulmuş örnek stoğu kullan. Gerçek stok/üretim kaydına
   dokunma. Gerçek üretim başlamamışsa canlı atölyenin üretim düğmesini test
   amacıyla kullanma.
2. Her test cihazında hangi hesabın ve atölyenin açık olduğunu doğrula.
   Kullanıcılardan biri owner, diğeri yalnız o test atölyesine davetle
   katılmış worker olmalı. Ayrı profiller/girişler kullan.
3. Yerel stoklar otomatik olarak buluta aktarılmamalı. `Yerel stokları
   buluta aktar` düğmesini bu testte kullanma.
4. Test öncesi herhangi bir `Tamamlandı`/üretim onayına basmadan stok
   adedini, sürümünü, test malzemesinin `₺/adet` veya `₺/m³` fiyatını,
   ölçü ve kalınlığını kayıt altına al.

## Kontrol sırası

| No | Gerçek cihazda işlem | Beklenen sonuç | Sonuç |
|---|---|---|---|
| 1 | iPhone Safari'de canlı adresi aç; sayfayı yenile; ana işaretçi menüsüne bas, aynı tuşla kapat | Yükleme hatası yok; tek menü aç/kapa; Kesim Planı görünür | Denenmedi |
| 2 | Menüden sırasıyla Kesim Planı, Stok Envanteri, Maliyet Kayıtları ve Hesap Ayarları'na geç | Her bölüm kendi içeriğini gösterir; geri dönüş çalışır; tablo yatay kayabilir | Denenmedi |
| 3 | Projelerim'e gir; arama aç/kapa; yeni test projesi oluştur ve tekrar aç | Liste doğrudan görünür; arama yalnız düğmeyle açılır; projenin ortak stoğu korunur | Denenmedi |
| 4 | Panel ve masif parça/stoklarında damar düğmesine üç kez bas | Boş → = (en boyunca) → Ⅱ (boy boyunca) → boş; yönler kaybolmaz | Denenmedi |
| 5 | TEST panel ve masif için eşit kalınlıklı stok tanımla; masif kalınlığını boş bırakarak hesaplamayı dene | Geçerli plan giyotin kesim denetiminden geçer; masif kalınlığı boşsa hata; kalınlık makinesi hesabı yok | Denenmedi |
| 6 | Karma otomatik seç; önce bir stok grubunu, sonra tekil stoğu hariç tut; iki plan alternatifini incele | Hariç tutulan stok hiç kullanılmaz; ekonomik ve minimum stok seçenekleri görünür; optimumluk kanıtı uydurulmaz | Denenmedi |
| 7 | TEST atölyesinde oturum aç, sunucuda fiyat/ölçü/adet içeren bir tam stok oluştur | Kaydetme sunucu onayıyla tamamlanır; stok mm biriminde korunur; başka projede aynı stok görünür | Denenmedi |
| 8 | İkinci hesapla atölyeye katıl; iki cihazda aynı stok sürümünü aç; A'dan düzenle, sonra B'nin eski sürümüyle kaydetmeyi dene | A başarılı; B'nin eski sürüm işlemi reddedilir, eşitleme sonrası yeni değer görünür | Denenmedi |
| 9 | TEST stok ile plan oluştur; sadece hesapla, alternatifi değiştir, projeyi kaydet | Stok adedi ve sürümü üretim tamamlanmadan düşmez | Denenmedi |
| 10 | Sadece TEST stoğu kullanarak temsilî üretim tamamla; artık oluşumu, değer, maliyet kaydı ve PDF'yi karşılaştır | Stok tam adedi azalır; yeni artığın kimliği/ölçüsü/rafı/kayıt değeri görünür; PDF saklanan üretim fotoğrafını tekrar üretir | Denenmedi |
| 11 | Aynı tamamlanan üretimi tekrar gönder veya ağ yanıtı yokken aynı işlem kimliğiyle tekrar dene | Çift tüketim/çift maliyet kaydı olmaz; işlem çakışması açıkça açıklanır | Denenmedi |
| 12 | Bağlantıyı kesip bulut stok değişikliği dene; sonra tekrar bağlanıp eşitle | Çevrimdışıyken bulut stoğu yazılmaz; çevrimiçi olduğunda sunucunun durumu esas alınır | Denenmedi |

## Yayına kabul kuralı

1–6 gerçek iPhone'da, 7–12 iki gerçek hesap/cihaz üzerinde tamamlanmadan
`gerçek Safari + bulut E2E onaylandı` yazılamaz. WebKit otomasyonu yalnız
**istemci etkileşim regresyonu** sağlar. Ayrıca sunucu tarafında bağımsız
giyotin ağacı kanıtı olmadığı için bu açık güvenlik sınırlaması
kapanmadan güvenilmeyen istemci verisini fiziksel üretim kanıtı sayma.

Bir hata bulunursa `docs/`, `docs/engine/` veya ilgili SQL migration
üzerinde düzeltme yap; mevcut sayfayı değiştiren bağımsız demo oluşturma.
Düzeltmeye yeni regresyon ekleyip GitHub Actions'ın **o committe** başarılı
olduğunu doğrula; son durumda `BEYTHAUS-CUT-HANDOFF.md` kaydını güncelle.
