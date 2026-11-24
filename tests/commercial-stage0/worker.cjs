'use strict';

const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { loadEngine, loadWorker, rng, norm } = require('./vendor/lib.js');
const { construct, score, better } = require('./reference.cjs');

const [mode, instancePath, objective = 'count', budgetText = '5000'] = process.argv.slice(2);
const instance = JSON.parse(fs.readFileSync(instancePath, 'utf8'));
const { data, seed } = instance;
const budget = Number(budgetText);
const started = performance.now();
const { engine } = loadEngine();
const best = {};
let attempts = 0;
const invalid = [];

function publish(candidate, source) {
  attempts++;
  const result = score(data, candidate);
  if (!result.ok) {
    const failure = { source, errors: result.errors };
    invalid.push(failure);
    process.send?.({ type: 'invalid', ...failure });
  }
  for (const target of mode === 'reference' ? ['count', 'cost'] : [objective]) {
    if (!better(result, best[target]?.score, target)) continue;
    const elapsedMs = performance.now() - started;
    if (elapsedMs > budget) continue;
    const record = { type: 'candidate', target, score: result, source, elapsedMs, plan: candidate };
    best[target] = record;
    process.send?.(record);
  }
  return result;
}

function workerLayouts(response, incumbent) {
  const bins = incumbent.bins.slice();
  for (const group of response?.groups || []) {
    if (group.status !== 'improved' || !group.layout) continue;
    const retained = bins.filter(bin => norm(bin.stock.material) !== group.material);
    const replacement = group.layout.map(bin => ({
      stock: bin.stock, cuts: bin.cuts || [], free: bin.free || [],
      placed: bin.pieces.map(piece => ({ ...data.parts.find(part => part.id === piece.id), ...piece }))
    }));
    bins.splice(0, bins.length, ...retained, ...replacement);
  }
  return { bins, unplaced: incumbent.unplaced };
}

async function main() {
if (mode === 'baseline') {
  let plan = engine.optimize(structuredClone(data), true, false, objective === 'count' ? 'minimum' : 'economic');
  const first = publish(plan, 'production-enhanced-optimize');
  process.send?.({ type: 'initial', score: first, elapsedMs: performance.now() - started });
  await new Promise(resolve => setImmediate(resolve));
  if (!first.complete && performance.now() - started < budget) {
    const constructive = loadWorker('constructive-worker.js');
    constructive.onmessage({ data: { type: 'construct', requestId: 1, mode: 'guillotine',
      objective, priceMode: 'panel', m3: null, data: structuredClone(data) } });
    if (constructive.result?.plan) publish(constructive.result.plan, 'production-constructive-worker');
  }
  if (best[objective] && performance.now() - started < budget - 100) {
    const worker = loadWorker('optimization-worker.js');
    for (const type of objective === 'cost' ? ['solve', 'economy'] : ['solve']) {
      const remaining = budget - (performance.now() - started) - 30;
      if (remaining < 50) break;
      plan = best[objective].plan;
      worker.onmessage({ data: { type, requestId: 2, mode: 'guillotine', cutMode: 'guillotine',
        objective: 'cost', priceMode: 'panel', m3: null, data: structuredClone(data),
        incumbentBins: plan.bins.map(bin => ({ stockId: bin.stock.id, material: bin.stock.material })),
        bounds: engine.certifyStockCount(plan,data,engine.auditCutPlan(plan,data)).details || [], timeBudgetMs: Math.floor(remaining), maxNodes: 300000 } });
      process.send?.({ type: 'worker-status', stage: type, status: worker.result?.status,
        groups: worker.result?.groups?.map(group => ({ material: group.material, status: group.status })) });
      publish(workerLayouts(worker.result, plan), `production-${type}-worker`);
      await new Promise(resolve => setImmediate(resolve));
    }
  }
} else if (mode === 'reference') {
  publish(instance.witness, 'independent-feasibility-witness');
  // Include every validated short-run plan, so reference quality cannot regress.
  for (const short of instance.baselines || []) {
    if (short.best) publish(short.best.plan, `short-run-${short.objective}`);
  }
  const random = rng(seed ^ 0x5a17);
  let trial = 0;
  while (performance.now() - started < budget - 100) {
    // Independent geometric construction and production restarts share no code.
    publish(construct(data, seed + trial * 7919, trial % 2 ? 'cost' : 'count', trial), `independent-restart-${trial}`);
    if (trial % 4 === 0 && performance.now() - started < budget - 500) {
      const shuffled = structuredClone(data);
      const shuffle = list => {
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        list.forEach((item, index) => { item.order = index; });
      };
      shuffle(shuffled.parts);
      shuffle(shuffled.stocks);
      const target = ['minimum', 'economic', 'area'][Math.floor(trial / 4) % 3];
      const candidate = engine.optimize(shuffled, true, false, target);
      publish(candidate, `production-restart-${trial}-${target}`);
    }
    trial++;
    process.send?.({ type: 'progress', attempts, elapsedMs: performance.now() - started });
    await new Promise(resolve => setImmediate(resolve));
  }
} else {
  throw new Error(`Unknown mode ${mode}`);
}

process.send({ type: 'done', attempts, invalid, elapsedMs: performance.now() - started,
  peakRssMiB: process.resourceUsage().maxRSS / 1024 }, () => process.disconnect());
}

main().catch(error => { console.error(error); process.exitCode = 1; process.disconnect?.(); });
