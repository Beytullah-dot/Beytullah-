'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const R = require('./reference.cjs');

const input = path.resolve(process.argv[2] || 'stage0-results');
const destination = path.resolve(process.argv[3] || path.join(__dirname, 'results'));
fs.mkdirSync(destination, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(input, 'manifest.json'), 'utf8'));
assert.equal(manifest.status, 'completed', 'Do not report an unfinished campaign as complete');
const files = fs.readdirSync(input).filter(name => /^\d+\.json$/.test(name)).sort();
const instances = files.map(name => JSON.parse(fs.readFileSync(path.join(input, name), 'utf8')));
assert.equal(instances.length, manifest.pilot ? 2 : 60);
const rows = [];
let auditedPlans = 0;
const gap = (upper, lower) => upper !== null && lower > 0 ? 100 * (upper - lower) / lower : null;

function audit(instance, record) {
  if (!record) return;
  const actual = R.score(instance.data, record.plan);
  assert(actual.ok && actual.complete, `Invalid saved plan seed ${instance.seed}`);
  for (const key of ['count', 'cost', 'area', 'largestOffcut']) {
    assert.equal(actual[key], record.score[key], `Altered ${key}, seed ${instance.seed}`);
  }
  auditedPlans++;
}

for (const instance of instances) {
  assert(instance.reference, `Missing reference ${instance.seed}`);
  const bounds = R.lowerBounds(instance.data);
  assert.deepEqual(bounds, instance.bounds);
  audit(instance, { plan: instance.witness, score: instance.witnessScore });
  for (const objective of ['count', 'cost']) {
    const short = instance.baselines.find(result => result.objective === objective);
    const reference = instance.reference.pool[objective];
    audit(instance, short.best);
    audit(instance, reference);
    assert(reference, `No reference result for ${instance.seed}/${objective}`);
    const upper = short.best?.score[objective] ?? null;
    const bestKnown = reference.score[objective];
    const lower = bounds[objective];
    assert(lower <= bestKnown, `Bound exceeds validated reference ${instance.seed}/${objective}`);
    assert(upper === null || bestKnown <= upper, 'Reference must include baseline');
    rows.push({
      seed: instance.seed, split: instance.split, scenario: instance.scenario, objective,
      parts: instance.counts.parts, types: instance.counts.types, groups: instance.counts.groups,
      lower, upper, bestKnown, gapPercent: gap(upper, lower), referenceGapPercent: gap(bestKnown, lower),
      bestKnownGapPercent: gap(upper, bestKnown), countExcess: objective === 'count' && upper !== null ? upper - bestKnown : null,
      firstValidMs: short.history[0]?.elapsedMs ?? null, elapsedMs: short.wallMs,
      baselineRssMiB: short.peakRssMiB, referenceRssMiB: instance.reference.peakRssMiB,
      baselineDeadline: short.deadlineHit, referenceDeadline: instance.reference.deadlineHit,
      referenceAttempts: instance.reference.done?.attempts ?? instance.reference.progress?.attempts ?? null,
      initialComplete: short.initial?.score.complete ?? false,
      largestOffcutMm2: short.best?.score.largestOffcut ?? null,
      referenceLargestOffcutMm2: reference.score.largestOffcut,
      referenceSource: reference.source,
      invalidCandidates: (short.invalid || short.done?.invalid || []).length +
        (instance.reference.invalid || instance.reference.done?.invalid || []).length,
      baselineError: short.stderr, referenceError: instance.reference.stderr
    });
  }
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}
function distribution(rows, key) {
  const values = rows.map(row => row[key]).filter(value => value !== null);
  return { measured: values.length, missing: rows.length - values.length,
    p50: percentile(values, 0.5), p95: percentile(values, 0.95), max: values.length ? Math.max(...values) : null };
}

const summary = { manifest, auditedPlans, instanceCount: instances.length, envelope: {}, cohorts: {}, failures: [] };
for (const key of ['parts', 'types', 'groups']) {
  summary.envelope[key] = [Math.min(...instances.map(instance => instance.counts[key])), Math.max(...instances.map(instance => instance.counts[key]))];
}
for (const split of ['development', 'acceptance']) {
  summary.cohorts[split] = {};
  for (const objective of ['count', 'cost']) {
    const selected = rows.filter(row => row.split === split && row.objective === objective);
    if (!selected.length) continue;
    const complete = selected.filter(row => row.upper !== null).length;
    const stats = {
      cases: selected.length, complete,
      gap: distribution(selected, 'gapPercent'), referenceGap: distribution(selected, 'referenceGapPercent'),
      bestKnownGap: distribution(selected, 'bestKnownGapPercent'), firstValidMs: distribution(selected, 'firstValidMs'),
      wallMs: distribution(selected, 'elapsedMs'), rssMiB: distribution(selected, 'baselineRssMiB'),
      referenceRssMiB: distribution(selected, 'referenceRssMiB'),
      equalBestKnown: selected.filter(row => row.upper === row.bestKnown).length,
      maxCountExcess: objective === 'count' ? Math.max(...selected.map(row => row.countExcess ?? Infinity)) : null,
      invalidCandidates: selected.reduce((sum, row) => sum + row.invalidCandidates, 0),
      timedOut: selected.filter(row => row.baselineDeadline).length
    };
    stats.gates = {
      complete: complete === selected.length,
      lowerBoundGap: complete === selected.length && stats.gap.p50 <= 10 && stats.gap.p95 <= 20,
      bestKnown: complete === selected.length && (objective === 'count'
        ? stats.equalBestKnown >= Math.ceil(selected.length * 0.95) && stats.maxCountExcess <= 1
        : stats.bestKnownGap.p95 <= 5),
      firstValidLatency: complete === selected.length && stats.firstValidMs.p95 <= 3000 && stats.firstValidMs.max <= 5000,
      memory: stats.rssMiB.max <= 256
    };
    summary.cohorts[split][objective] = stats;
  }
}
summary.failures = rows.filter(row => row.upper === null || row.gapPercent > 20 ||
  (row.objective === 'cost' && row.bestKnownGapPercent > 5) ||
  (row.objective === 'count' && row.countExcess > 0) || row.firstValidMs > 3000 ||
  row.baselineRssMiB > 256 || row.invalidCandidates || row.baselineError || row.referenceError)
  .map(row => ({ seed: row.seed, split: row.split, objective: row.objective, gapPercent: row.gapPercent,
    bestKnownGapPercent: row.bestKnownGapPercent, countExcess: row.countExcess, file: `${row.seed}.json` }));

fs.writeFileSync(path.join(destination, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(destination, 'cases.json'), JSON.stringify(rows, null, 2));
const columns = Object.keys(rows[0]);
fs.writeFileSync(path.join(destination, 'cases.csv'), columns.join(',') + '\n' + rows.map(row =>
  columns.map(key => JSON.stringify(row[key] ?? '')).join(',')).join('\n') + '\n');
// All inputs, witnesses, selected plans and convergence traces are preserved.
fs.writeFileSync(path.join(destination, 'campaign.json.gz'), zlib.gzipSync(JSON.stringify({ manifest, instances }), { level: 9 }));

const number = value => value === null ? 'ölçülemedi' : value.toFixed(2);
const acceptance = summary.cohorts.acceptance;
const totalAttempts = instances.reduce((sum, instance) => sum + (instance.reference.done?.attempts || 0), 0);
const report = [
  '# Beythaus Cut — Aşama 0 daire projesi ölçümü',
  '',
  `23 Kasım 2026. ${instances.length} sentetik proje; her projede levha ve maliyet hedefi. Motor kodu ${manifest.motorCommit}.`,
  '',
  'Üreteç, bağımsız mümkünlük tanığı, güvenli alt sınır ve uzun arama karşılaştırması tamamlandı. Aşama 1 motor değişikliği uygulanmadı. Gerçek Supabase stoklarına, Auth veya üretim kayıtlarına erişilmedi.',
  '',
  '## Kabul örneklemi',
  '',
  '| Ölçüm | Levha hedefi | Maliyet hedefi |',
  '|---|---:|---:|'
];
if (acceptance.count && acceptance.cost) {
  const count = acceptance.count, cost = acceptance.cost;
  report.push(
    `| Geçerli tam plan | ${count.complete}/${count.cases} | ${cost.complete}/${cost.cases} |`,
    `| Alt sınır farkı medyan | %${number(count.gap.p50)} | %${number(cost.gap.p50)} |`,
    `| Alt sınır farkı p95 | %${number(count.gap.p95)} | %${number(cost.gap.p95)} |`,
    `| Bilinen en iyi plana uzaklık p95 | %${number(count.bestKnownGap.p95)} | %${number(cost.bestKnownGap.p95)} |`,
    `| Bilinen en iyi değerle eşit | ${count.equalBestKnown}/${count.cases} | ${cost.equalBestKnown}/${cost.cases} |`,
    `| İlk geçerli plan süresi p95 | ${number(count.firstValidMs.p95)} ms | ${number(cost.firstValidMs.p95)} ms |`,
    `| En yüksek kısa koşu RSS | ${number(count.rssMiB.max)} MiB | ${number(cost.rssMiB.max)} MiB |`,
    '',
    'Başlangıç eşikleri medyan alt sınır farkı %10, p95 %20; maliyette bilinen en iyiye p95 uzaklık %5; levhada en az 38/40 eşit ve kalanlarda en fazla 1 fazladır.',
    '',
    '| Kabul kapısı | Levha | Maliyet |',
    '|---|---|---|'
  );
  for (const [key, label] of Object.entries({ complete: 'Tam plan', lowerBoundGap: 'Alt sınır farkı',
    bestKnown: 'Bilinen en iyi plana uzaklık', firstValidLatency: 'İlk geçerli plan süresi', memory: 'Bellek' })) {
    report.push(`| ${label} | ${count.gates[key] ? 'Geçti' : 'Kaldı'} | ${cost.gates[key] ? 'Geçti' : 'Kaldı'} |`);
  }
  report.push('', `Levha hedefinde bilinen en iyiye göre en yüksek fazlalık ${count.maxCountExcess} levhadır.`,
    `Uzun koşu referanslarının bile alt sınıra göre p95 farkı levhada %${number(count.referenceGap.p95)}, maliyette %${number(cost.referenceGap.p95)} olmuştur. Bu fark geometrik optimum kaybı olarak yorumlanamaz.`,
    '', 'Kabul kapılarının sonucu bu sonlu sentetik örneklem içindir. Yanlış optimum etiketi bu deneyde ölçülmedi; deney üretim sertifika etiketlerini kullanmaz.');
}
report.push('', '## Kapsam ve kaynak', '',
  `20 geliştirme ve 40 kabul tohumu önceden sabitlendi. Gözlenen kapsam ${summary.envelope.parts.join('–')} parça, ${summary.envelope.types.join('–')} tip ve ${summary.envelope.groups.join('–')} gruptur. Onaylanan 100–260 / 25–90 / 3–7 zarfının uç değerleri için kapsam açığı sürer.`,
  '',
  `Ortam ${manifest.platform}, ${manifest.node}, ${manifest.cpu}, ${manifest.logicalCpus} mantıksal CPU. Kısa koşular seri, referans koşular ${manifest.referenceConcurrency} eşzamanlı süreçle çalıştı. Başlangıç ${manifest.started}, bitiş ${manifest.finished}. Tarih-saatler UTC'dir.`,
  '',
  `Her hedefin kısa koşu bütçesi ${manifest.baselineMs} ms. Her proje için ortak uzun aday havuzu ${manifest.referenceMs} ms ile sınırlandı. Toplam ${totalAttempts} referans adayı değerlendirildi. İki hedef aynı aday havuzundan ayrı seçildi. Bu, onaylanan proje/hedef başına 60 saniye üst bütçesinin içindedir.`,
  '',
  `Kaydedilmiş ${auditedPlans} tam plan kayıt denetiminde yeniden fiziksel olarak doğrulandı. Bir proje başına bağımsız tanık, iki kısa plan ve iki referans planı sayılır; özdeş planlar bu sayıda birden fazla bulunabilir. Referans değerleri en iyi bulunan uygulanabilir sonuçlardır. Optimumluk kanıtı olarak kullanılmaz.`,
  '',
  `Çalıştırılan yerel kaynak commit'i ${manifest.sourceCommit}. Yayımlanan eşdeğer kaynak ${manifest.publishedSourceCommit || 'manifest içine eklenmedi'}. Eşdeğer kaynak ağacı ${manifest.sourceTree || 'manifest içine eklenmedi'}.`,
  '', '## Tekrarlanabilir girdiler ve kalan risk', '',
  'Bütün proje/amaç satırları [cases.csv](./commercial-stage0/results/cases.csv) ve [cases.json](./commercial-stage0/results/cases.json) içindedir. [summary.json](./commercial-stage0/results/summary.json) geliştirme ve kabul özetlerini ayrı tutar. [campaign.json.gz](./commercial-stage0/results/campaign.json.gz) seed ile birlikte tam parça/stok listelerini, fiziksel tanıkları, seçilmiş planları ve yakınsama izlerini içerir.',
  '',
  'Üretecin parça listesi tasarım varsayımlarından gelir. Sınırlı stok adetleri bağımsız tanığın tüketimine tampon eklenerek oluşturulur. Bu yöntem mümkünlüğü gösterir, saha stok dağılımını kanıtlamaz. Fiziksel doğrulama tam kerfi içeride tutan mevcut modelle yapılır. B1 kenar taşması, masif, otomatik malzeme ataması ve gerçek iPhone bu deneyin açık kapsamlarıdır.',
  '',
  'Aşağıdaki örnekler bilinen daha iyi plana göre en yüksek farkı gösteren kabul girdileridir. Bütün eşik aşımları summary.json failures alanındadır.',
  '', '| Seed | Hedef | Kısa koşu | Bilinen en iyi | Güvenli alt sınır | Bilinen en iyiye fark |', '|---|---|---:|---:|---:|---:|');
for (const row of rows.filter(row => row.split === 'acceptance').sort((a, b) =>
  (b.bestKnownGapPercent ?? Infinity) - (a.bestKnownGapPercent ?? Infinity)).slice(0, 10)) {
  report.push(`| ${row.seed} | ${row.objective} | ${row.upper ?? 'eksik'} | ${row.bestKnown} | ${row.lower} | %${number(row.bestKnownGapPercent)} |`);
}
report.push('', 'Yeniden çalıştırma ve yöntem ayrıntıları [README.md](./commercial-stage0/README.md) içindedir. Süre bütçeli aramanın aynı planı bulması makine yüküne bağlıdır. Kaydedilmiş seçilmiş planlar doğrudan yeniden denetlenebilir.', '',
  '## Sıradaki aşama', '',
  'Aşama 1 için öneri B1 son kesim fiziğini üç üretim katmanında tutarlı düzeltmek, bağımsız kesim tekrarını taşan son kerfi denetleyecek şekilde geliştirmek ve mevcut bütün alt sınırları gevşetilmiş modelde sınamaktır. Küçük brute-force karşılaştırmalarında iki korunacak parçanın arasındaki yetersiz kerf reddedilmelidir. Aşama 1 kullanıcı onayını bekler.', '');
const reportPath = destination === path.join(__dirname, 'results')
  ? path.resolve(__dirname, '../MOTOR-APARTMENT-STAGE0-RESULTS.md')
  : path.join(destination, 'MOTOR-APARTMENT-STAGE0-RESULTS.md');
fs.writeFileSync(reportPath, report.join('\n'));
console.log(JSON.stringify(summary, null, 2));
