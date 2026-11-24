'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib');
const {fork}=require('node:child_process'),{performance}=require('node:perf_hooks');
const baseline=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]);
fs.mkdirSync(output,{recursive:true});
const archive=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'../commercial-stage0/results/campaign.json.gz'))));
function runChild(mode, instancePath, objective, budget) {
  return new Promise(resolve => {
    const started = performance.now();
    const child = fork(path.join(__dirname, '../commercial-stage0/worker.cjs'), [mode, instancePath, objective, String(budget)],
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

(async()=>{
 const records=[];
 for(const instance of archive.instances){
  for(const variant of ['before','after']){
   process.env.BEY_SRC=variant==='before'?baseline:path.resolve(__dirname,'../../docs');
   const data={...instance.data,allowNarrowScrapCuts:variant==='after'};
   const filename=path.join(output,'input.json');
   fs.writeFileSync(filename,JSON.stringify({seed:instance.seed,data}));
   for(const objective of ['count','cost']){
    const run=await runChild('baseline',filename,objective,5000);
    records.push({seed:instance.seed,split:instance.split,variant,objective,run});
    fs.writeFileSync(path.join(output,'paired.json.gz'),zlib.gzipSync(JSON.stringify({node:process.version,cpu:os.cpus()[0].model,records})));
    console.log(JSON.stringify({seed:instance.seed,variant,objective,count:run.best?.score.count,cost:run.best?.score.cost,ms:run.wallMs,invalid:run.invalid.length}));
   }
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
