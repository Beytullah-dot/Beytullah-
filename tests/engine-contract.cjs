/* Architecture contract regression for the shipped browser engine.
 * No test copies of production algorithms; reads the real deployed modules.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs');
const auditSource=fs.readFileSync(path.join(docs,'engine/production-audit.js'),'utf8');
const engineSource=fs.readFileSync(path.join(docs,'engine/cutting-engine.js'),'utf8');
const html=fs.readFileSync(path.join(docs,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(docs,'sw.js'),'utf8');
const win={};
vm.runInNewContext(auditSource,{window:win},{filename:'production-audit.js'});
vm.runInNewContext(engineSource,{window:win},{filename:'cutting-engine.js'});
assert.equal(win.BeythausCutEngine.contractVersion,1);
assert.equal(win.BeythausCutProductionAudit.contractVersion,1);
const exports=['optimize','binCost','mkBin','collectOffcuts','auditCutPlan',
 'auditGuillotineCuts','certifyStockCount','minStockCountLowerBound',
 'stockProofDescription','grossWasteProofDescription','exactRefinePlan',
 'exactGrossAreaRefine','exactVariableFeasibility','exactUniformFeasibility',
 'refineUsableOffcuts','offcutOptimizationDescription','offcutMetrics',
 'betterOffcuts','enumerateBoardMultisets','validateLayout'];
let active={mode:'nest',kerf:0,priceMode:'panel',
 offcutMinEdgeMm:50,offcutMinAreaCm2:100};
const engine=win.BeythausCutEngine.createEngine({
 getState:()=>active,val:Number,
 mkey:s=>String(s).trim().toLocaleLowerCase('tr-TR'),
 fmt:(v,n=0)=>Number(v).toFixed(n)
});
for(const name of exports)assert.equal(typeof engine[name],'function','Facade: '+name);
assert.ok(Object.isFrozen(engine));
assert.throws(()=>win.BeythausCutEngine.createEngine({}),/dependencies/);
assert.throws(()=>win.BeythausCutProductionAudit.createAudit({}),/requires/);
const part={id:'piece',l:40,w:40,t:null,material:'wood',rotate:false,label:'P',order:0};
const stock={id:'stock',l:100,w:100,t:null,material:'wood',qty:2,price:10,order:0};
const data={parts:[part],stocks:[stock],trim:0,kerf:0,minEdge:0,minArea:0,m3:0};
const free=engine.optimize(data,true,false);
assert.ok(engine.auditCutPlan(free,data).ok,'Free packing passed');
assert.equal(free.bins[0].cuts.length,0);
active={...active,mode:'guillotine'};
const physical=engine.optimize(data,true,false);
assert.ok(engine.auditCutPlan(physical,data).ok,'Current project mode is dynamically observed');
assert.ok(physical.bins[0].cuts.length>0);
const forged=JSON.parse(JSON.stringify(physical));
forged.bins[0].cuts[0].x2=forged.bins[0].cuts[0].x2-1;
assert.equal(engine.auditCutPlan(forged,data).ok,false,'Cut stopping short of an edge rejected');
const auditor=win.BeythausCutProductionAudit.createAudit({
 getState:()=>active,mkey:s=>String(s).toLowerCase()
});
assert.ok(auditor.auditCutPlan(physical,data).ok,'Production audit runs without optimizer');
assert.equal(auditor.auditCutPlan(forged,data).ok,false);
const auditTag=html.indexOf('<script src="./engine/production-audit.js"></script>');
const coreTag=html.indexOf('<script src="./engine/cutting-engine.js"></script>');
const inlineTag=html.indexOf('<script>\n(()=>{');
assert.ok(auditTag>=0&&coreTag>auditTag&&inlineTag>coreTag,'Browser loads in dependency order');
assert.equal(html.includes('function auditCutPlan('),false,'Auditor not duplicated in HTML');
assert.equal(html.includes('function optimize(data,enhanced=true,exact=true)'),false,'Solver not duplicated in HTML');
assert.ok(html.includes('window.BeythausCutEngine?.createEngine'));
assert.ok(sw.includes('./engine/production-audit.js')&&sw.includes('./engine/cutting-engine.js'));
console.log('Engine architecture contract: 20 public methods preserved, mutable project switching safe, independent audit rejects partial cuts, load order/PWA verified.');
