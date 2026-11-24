'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const G = require('./generator.cjs');
const R = require('./reference.cjs');
const L = require('./vendor/lib.js');
const small = require('./vendor/gen.js');

let witnessCount = 0;
for (const seed of [...G.DEVELOPMENT_SEEDS, ...G.ACCEPTANCE_SEEDS]) {
  const instance = R.addWitness(G.apartment(seed));
  assert.deepEqual(instance, R.addWitness(G.apartment(seed)), `determinism ${seed}`);
  assert(instance.counts.parts >= 100 && instance.counts.parts <= 260);
  assert(instance.counts.types >= 25 && instance.counts.types <= 90);
  assert(instance.counts.groups >= 3 && instance.counts.groups <= 7);
  assert(instance.witnessScore.ok && instance.witnessScore.complete);
  const bounds = R.lowerBounds(instance.data);
  assert(bounds.count <= instance.witnessScore.count);
  assert(bounds.cost <= instance.witnessScore.cost);
  witnessCount++;
}

let oracleCount = 0;
for (let seed = 810000; seed < 810100; seed++) {
  const data = small.family('generic', seed);
  const exact = L.oracle(data, { sliver: 'relaxed' });
  const bounds = R.lowerBounds(data);
  if (exact.feasible) {
    assert(bounds.count <= exact.count, `count bound seed ${seed}`);
    assert(bounds.cost <= exact.cost, `cost bound seed ${seed}`);
    oracleCount++;
  }
}

const sample = R.addWitness(G.apartment(G.DEVELOPMENT_SEEDS[0]));
const mutate = fn => { const plan = structuredClone(sample.witness); fn(plan); assert(!R.score(sample.data, plan).ok); };
mutate(plan => { plan.bins[0].placed[0].x += 1; });
mutate(plan => { plan.bins[0].cuts.shift(); });
mutate(plan => { plan.bins[0].stock.t = 99; });
mutate(plan => { plan.bins[0].placed.push(plan.bins[0].placed[0]); });
mutate(plan => { plan.bins[0].placed[0].w += 10; });
// The tie-break must not trust a forged free-rectangle list.
const forged = structuredClone(sample.witness);
forged.bins[0].free = [{ x: 0, y: 0, w: 1e9, h: 1e9 }];
assert.equal(R.score(sample.data, forged).largestOffcut, sample.witnessScore.largestOffcut);

const missingPrice = structuredClone(sample.data);
missingPrice.stocks[0].price = null;
assert.equal(R.lowerBounds(missingPrice).cost, null);

for (const script of ['selftest-oracle.js', 'selftest-pareto.js']) {
  process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, 'vendor', script)], { encoding: 'utf8' }));
}
console.log(JSON.stringify({ deterministicWitnesses: witnessCount, relaxedOracleBoundChecks: oracleCount,
  tamperChecks: 6, unknownPriceCheck: true }));
