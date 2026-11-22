# Beythaus Cut v1 — 22 Kasım 2026 doğrulanabilir sürüm kontrol noktası

Bu dosya **tamamlanmış v1 ilanı değildir**. Devam kaydı
`BEYTHAUS-CUT-HANDOFF.md` ve `BEYTHAUS-CUT-RELEASE-ROADMAP.md`
ile birlikte okunmalıdır. Sıfırdan proje açılmayacak.

## Ürün hazır oluşu ve kabul

Başlangıç mühendislik tahmini **%70**, mevcut mühendislik tahmini
**%70** ve gerçekleşen puan artışı **+0**. Bu oran deneysel
ölçü değil; A–E paketlerinin tüm kabul koşulları henüz
bitmediği için otomatik artırılmadı. Kod/PR sayısı ile
puan kazanılmaz. İlerleyen bir sohbette her paketin
kapanan kabul ölçütleri ayrıca kaydedilip makul puan
kademesi uygulanabilir.

| Paket | Yapılan, doğrulanmış alt iş | Açık kalan kabul |
|---|---|---|
| A (+10 potansiyel) | PR49 gerçek lazy yapıcı Worker; PR50 seçili karma otomatik kurtarma; tam/çift denetimli plan ve kanıtsız status | Kısmi olmayan planların objektif iyileştirmesi, minimum alternatif ve bütün malzeme/rotasyon sınıflarının açık sözleşmesi; genel optimum iddiası yok |
| B (+5 potansiyel) | PR51 16 sentetik gerçek Linux child process/Worker ölçek testi, RSS ve UNKNOWN raporu; mobil WebKit emülasyonu | İlk optimize ana JS thread'de ve gerçek iPhone Safari/long-task ölçümü yapılmadı |
| C (+5 potansiyel) | PR52 izole PostgreSQL fiziksel guard, sahte artık/parça ve atomik rollback; PR53 gerçek shipped motor çıkışının DB trigger uyumluluk testi | Migration **canlı Supabase'e uygulanmadı**; canlı server fiziksel audit şu anda etkin değil; gerçek iki kullanıcılı concurrency ve rollback provası açık |
| D (+5 potansiyel) | Mevcut PDF/kerf/optimum ayrımı ve WebKit emülatör regresyonları; yeni Worker/PWA asset cache sürümü; Pages SUCCESS kanıtları | Live Pages byte hash/versiyon eşleşmesi ve kapsamlı küçük ekran, PDF, maliyet/artık uçtan uca matrisi tamam değil |
| E (+5 potansiyel) | Kaynaklı CI ve risk kayıtları, handoff ve release roadmap | Gerçek iPhone Safari ve iki kullanıcıyla gerçek Supabase saha kabulü yapılmadı; final v1 gate açık |

## Birleştirilen işler

| PR | Merge SHA | Kanıt |
|---|---|---|
| [#49](https://github.com/Beytullah-dot/Beytullah-/pull/49) | `18dd49227fd7180eb0e7df316160260154cc782a` | Master Optimizer [SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44968615190), Geometry [SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44968615174), WebKit **emülasyonu** [SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44968615210), Pages [SUCCESS](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44968615106) |
| [#50](https://github.com/Beytullah-dot/Beytullah-/pull/50) | `865ec2665ec7d0e99d3e95ba61dd3a521f1f3a10` | Master Optimizer #44968917352, Geometry #44968917408, WebKit emülasyonu #44968917346, Pages #44968916832: **4/4 SUCCESS** |
| [#51](https://github.com/Beytullah-dot/Beytullah-/pull/51) | `3c6b3833d879b29a941258d9e9312f651622cf4a` | Master Optimizer #44969169379, Geometry #44969169362, Pages #44969169246: **3/3 SUCCESS** |
| [#52](https://github.com/Beytullah-dot/Beytullah-/pull/52) | `931c500aa47a88710f728bfba728a02b49718677` | Master Optimizer #44969634416, Geometry/izole Postgres #44969634439, Pages #44969633957: **3/3 SUCCESS** |
| [#53](https://github.com/Beytullah-dot/Beytullah-/pull/53) | `603c99d13793775ea846dd3e985d44f06a08c1a9` | PR Optimizer #44969856406 ve Geometry/izole Postgres #44969856403 **2/2 SUCCESS**. Master Optimizer [#44969954330](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44969954330), Geometry [#44969954352](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44969954352), Pages [#44969953561](https://github.com/Beytullah-dot/Beytullah-/actions/runs/44969953561): **3/3 SUCCESS** (ayrıca gerçek GitHub'da doğrulandı). |

İlk PR49 testinin Worker VM ortamı yanlışlığı, PR51'in ölçüm
scripti değişken hatası, PR52'nin SQL test blok ve yetki hataları,
PR53'ün psql `DO` içi değişken kullanımı ilk koşulda başarısızdı.
Hatalar incelendi, düzeltildi ve aynı işin sonraki son commit
CI'sı PASS olmadan PR'lar merge edilmedi. Önceki başarısız
koşular tarihten silinmedi.

## Üretimde fiziksel yapıcı motor sonuçları (B / sentetik)

Gerçek dağıtılmış Worker'ın kodu kullanıldı:
`docs/constructive-worker.js`. Sentetik tekrarlı ve
karışık enli 8/40/200/500/1000 parçalı 4 farklı stok
seçenekleri ve **2 mm kerf / 1 mm trim**. Node 22 Linux,
izole çocuk süreçler ve `maxRSS` değerleri kullanıldı.
Bütçe **1300 ms, 120000 node, 4 candidates, 12 seeds**.

**16 senaryo**: 14 fiziksel tamamlanmış `feasible-uncertified`
ve her biri iki ayrı üretim/oracle kesim ağacı denetiminden geçti.
**2 UNKNOWN**: 1000 farklı enli maliyet işinde `unknown-limit`,
fiyatı bilinmeyen maliyet işinde `unknown-price`.
1000 tekrarlı parçada 125 levhalı *bir* tam plan üretildi,
süre (Worker + audit) **886.83 ms**, süreç RSS maksimumu
**88536 KiB = yaklaşık 86.5 MiB**. Bu hesaplama
minimum levha/fiyat/alan optimumluğu ispatı **DEĞİLDİR**.
Linux Node sonucu gerçek iPhone veya tüm gerçek panellerde
performans garantisi **DEĞİLDİR**.
Rapor `tests/MOTOR-LIVE-WORKER-SCALE.md` ve
PR51 optimizer CI artifact.

**Matematiksel kanıt ayrı kapı:** Önceki kapsamı tanımlı
kesin giyotin alt-sınıf certifier araştırmaları yerinde.
Bu yeni yapıcı her durumda yalnız **kanıtsız feasible**
olabilir; genel 2D giyotin exact optimumluğu ilan edilmez.
Gap/UNKNOWN değerleri sadece ilgili aramanın
gerçek sertifikalarıyla raporlanır; yapıcı adayı ispat değildir.

## Bulut güvenliği: veri dokunulmazlık notu

Canlı Supabase proje `pdqgpupdqgrxejvjpdzs`, salt-okunur
`ACTIVE_HEALTHY`. Canlı migrationlar:
`20261118212836` ve `20261119202121`.
Üçüncü versioned repo migration
`supabase/migrations/20261122_000003_server_physical_cut_guard.sql`
**canlı Supabase'e uygulanmadı**.

Canlı PostgreSQL metadata salt-okunur sorgusunda 10
Beythaus tablosunda RLS açık, tablolara `anon` ve
`authenticated` doğrudan SELECT/INSERT/UPDATE/DELETE
grant'leri **yok**. Zero policy, RPC-only mimari ile uyumlu.
`SECURITY DEFINER` RPC'ler için çok kiracılı membership/
idempotent operation/stock versioning açıkça ayrı denetim
konusudur. İki canlı kullanıcı çakışması test edilmedi.
Canlı DB'de kapsamlı sunucu fiziksel cut-tree audit'i
henüz yok; sadece izole PostgreSQL'de başarılı test var.

Geçici DB migration'ı gerçek stokları etkilemeyen düz
`BEFORE INSERT` trigger ile cuts/kerf/trim, parçalar ve
artık yaprak eşleşmesini denetler; başarısız transaction
rollback olur. Original user order/piece katalogunun
server-authoritative doğruluğunu, gönderilen `pieces`
şemasından tek başına kanıtlamaz. Güvenli canlı uygulama
öncesinde çok parçalı, karma malzemeli fixture, rollback
provası, gerçek cihaz payload ve iki kullanıcı UAT
zorunlu. Kullanıcı envanterine, üretim kaydına, Auth'a,
SQL şemasına canlı yazma/silme yapılmadı.

## Kalan en önemli görevler (sıralı)

1. Her yeni sohbette **gerçek master HEAD, açık PR, CI,
   Pages ve AGENTS.md/handoff/roadmap** doğrulansın.
2. PR53 master CI/Pages kontrolünü kapat. Repo migration için
   izole PostgreSQL'de çok aşamalı, pozitif kerfli,
   heterojen malzemeli gerçek motor fixture'ları, failure
   rollback ve sürüm/çok oturumlu concurrency testleri.
   Canlı Supabase DDL'si için güvenlik geçidi karşılanmadan
   migration uygulama.
3. B: İlk `optimize` senkron işini mobilde uzun görev
   üretmeyecek şekilde sınırla / Worker'a taşı;
   düşük bellek, iptal ve stale request testlerini genişlet.
4. A: başlangıçta **tam ama kanıtsız** planların
   maliyet/brüt alan bakımından strict improvement yolu;
   ispatı bozma. `minimum` karma otomatik alternatifine
   saygı; açık sınıf/gap/UNKNOWN sözleşmesi.
5. D: canlı Pages asset byte integrity, PDF'nin gerçek
   fiziksel kesim sıra/kerf/alanı ve envanter sonucu ile
   E2E tutarlılığı; offline cache/mobil.
6. E: V1 kabul raporunda bütün CI bağlantıları; gerçek
   iPhone Safari ve iki kullanıcılı Supabase UAT yapılmadıysa
   `BLOCKED` ve açık risk.

**Kesin kırmızı çizgi:** Kullanıcı gerçek stokları, üretim kayıtları,
yetkiler veya finansal rakamları test için değiştirme. İki güvenlik
sınırı aşılmadıkça v1'e `100%` de ve genel matematik
optimumluğunu vaat etme.
