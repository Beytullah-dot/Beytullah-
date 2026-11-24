'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { fork, execFileSync } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const G = require('./generator.cjs');
const R = require('./reference.cjs');

const output = path.resolve(process.argv[2] || 'stage0-results');
const pilot = process.argv.includes('--pilot');
const referenceMs = pilot ? 3000 : 60000;
const concurrency = pilot ? 1 : 6;
const seeds = pilot ? G.DEVELOPMENT_SEEDS.slice(0, 2) : [...G.DEVELOPMENT_SEEDS, ...G.ACCEPTANCE_SEEDS];
fs.mkdirSync(output, { recursive: true });
const manifest = {
  generator: G.VERSION, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: __dirname, encoding: 'utf8' }).trim(),
  motorCommit: '27d0513c155d87128e18b8718aeb034aea427153',
  started: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`,
  cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, baselineMs: 5000, referenceMs, referenceConcurrency: concurrency,
  referencePool: 'One shared count/cost candidate pool per project, bounded by referenceMs. Both short runs included.',
  developmentSeeds: G.DEVELOPMENT_SEEDS, acceptanceSeeds: G.ACCEPTANCE_SEEDS,
  status: 'running', pilot
};
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));

function runChild(mode, instancePath, objective, budget) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = fork(path.join(__dirname, 'worker.cjs'), [mode, instancePath, objective, String(budget)],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const result = { mode, objective, best: null, pool: {}, history: [], workerStatuses: [], invalid: [], peakRssMiB: 0, deadlineHit: false, stderr: '' };
    child.stderr.on('data', chunk => { result.stderr += chunk.toString(); });
    child.on('message', message => {
      if (message.type === 'candidate') {
        if (message.elapsedMs > budget || performance.now() - started > budget + 250) return;
        result.pool[message.target] = message;
        if (message.target === objective) result.best = message;
        const { plan, ...entry } = message;
        result.history.push(entry);
      } else if (message.type === 'initial') result.initial = message;
      else if (message.type === 'worker-status') result.workerStatuses.push(message);
      else if (message.type === 'done') result.done = message;
      else if (message.type === 'invalid') result.invalid.push(message);
      else if (message.type === 'progress') result.progress = message;
    });
    // Linux process peak includes the VM engines and both independent checks.
    const memoryPoll = setInterval(() => {
      try {
        const match = fs.readFileSync(`/proc/${child.pid}/status`, 'utf8').match(/VmHWM:\s+(\d+) kB/);
        if (match) result.peakRssMiB = Math.max(result.peakRssMiB, Number(match[1]) / 1024);
      } catch { /* Process may have exited between polls. */ }
    }, 25);
    // Startup allowance is excluded from the child search budget, included in wall time.
    const deadline = setTimeout(() => { result.deadlineHit = true; child.kill('SIGKILL'); }, budget + 250);
    child.on('close', (code, signal) => {
      clearInterval(memoryPoll);
      clearTimeout(deadline);
      result.wallMs = performance.now() - started;
      result.exitCode = code;
      result.signal = signal;
      result.peakRssMiB = Math.max(result.peakRssMiB, result.done?.peakRssMiB || 0);
      resolve(result);
    });
  });
}

(async () => {
  // Serial short runs avoid reference-job CPU contention in latency statistics.
  for (const seed of seeds) {
    const instance = R.addWitness(G.apartment(seed));
    instance.split = G.ACCEPTANCE_SEEDS.includes(seed) ? 'acceptance' : 'development';
    instance.bounds = R.lowerBounds(instance.data);
    const filename = path.join(output, `${seed}.json`);
    fs.writeFileSync(filename, JSON.stringify(instance));
    instance.baselines = [];
    for (const objective of ['count', 'cost']) {
      const result = await runChild('baseline', filename, objective, 5000);
      instance.baselines.push(result);
      console.log(JSON.stringify({ phase: 'baseline', seed, objective, initial: result.initial?.score.complete,
        best: result.best?.score[objective], ms: Math.round(result.wallMs), rss: Math.round(result.peakRssMiB) }));
    }
    fs.writeFileSync(filename, JSON.stringify(instance));
  }
  let next = 0;
  async function queue() {
    while (next < seeds.length) {
      const seed = seeds[next++];
      const filename = path.join(output, `${seed}.json`);
      const instance = JSON.parse(fs.readFileSync(filename, 'utf8'));
      instance.reference = await runChild('reference', filename, 'count', referenceMs);
      fs.writeFileSync(filename, JSON.stringify(instance));
      console.log(JSON.stringify({ phase: 'reference', seed,
        count: instance.reference.pool.count?.score.count, cost: instance.reference.pool.cost?.score.cost,
        attempts: instance.reference.done?.attempts, deadlineHit: instance.reference.deadlineHit }));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => queue()));
  manifest.status = 'completed';
  manifest.finished = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
