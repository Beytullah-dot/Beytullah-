'use strict';
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process'),{performance}=require('perf_hooks');
const file=path.resolve(__dirname,'../../motor-capacity-matrix.cjs'),rows=[];
// Slowest main-engine family/size in both full 105-case sweeps. Diagnostic only;
// retain existing 4 s baseline watchdog, never change a product acceptance gate.
for(const enabled of [false,true])for(let repeat=0;repeat<5;repeat++){
 const started=performance.now();const p=spawnSync(process.execPath,[file,'--baseline','strip4','1000','area'],{encoding:'utf8',timeout:4000,env:{...process.env,BEY_NARROW_SCRAP:enabled?'1':'0'}});
 if(p.status!==0)throw Error(p.error||p.stderr);
 rows.push({enabled,repeat,wallMs:performance.now()-started,...JSON.parse(p.stdout.trim())});
}
fs.writeFileSync(path.resolve(__dirname,'../results/capacity-repeat.json'),JSON.stringify(rows,null,2));console.log(rows.map(r=>({flag:r.enabled,ms:r.baselineMs,rssMiB:r.baselineMaxRSSKiB/1024})));
