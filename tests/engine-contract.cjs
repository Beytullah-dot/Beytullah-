/* Architecture contract regression for the shipped browser engine.
 * No test copies of production algorithms; reads the real deployed modules.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const docs=path.join(__dirname,'../docs');
const archiveSource=fs.readFileSync(path.join(docs,'engine/production-archive.js'),'utf8');
const policySource=fs.readFileSync(path.join(docs,'engine/material-policy.js'),'utf8');
const allocationSource=fs.readFileSync(path.join(docs,'engine/material-allocator.js'),'utf8');
const auditSource=fs.readFileSync(path.join(docs,'engine/production-audit.js'),'utf8');
const repairSource=fs.readFileSync(path.join(docs,'engine/guillotine-block-repair.js'),'utf8');
const engineSource=fs.readFileSync(path.join(docs,'engine/cutting-engine.js'),'utf8');
const html=fs.readFileSync(path.join(docs,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(docs,'sw.js'),'utf8');
const win={};
vm.runInNewContext(archiveSource,{window:win},{filename:'production-archive.js'});
vm.runInNewContext(policySource,{window:win},{filename:'material-policy.js'});
vm.runInNewContext(allocationSource,{window:win},{filename:'material-allocator.js'});
vm.runInNewContext(auditSource,{window:win},{filename:'production-audit.js'});
vm.runInNewContext(repairSource,{window:win},{filename:'guillotine-block-repair.js'});
vm.runInNewContext(engineSource,{window:win},{filename:'cutting-engine.js'});
assert.equal(win.BeythausCutEngine.contractVersion,1);
assert.equal(win.BeythausGuillotineBlockRepair.version,1);
assert.ok(html.includes('<script src="./engine/guillotine-block-repair.js"></script>'));
assert.ok(sw.includes('./engine/guillotine-block-repair.js'));
assert.equal(win.BeythausCutProductionAudit.contractVersion,1);
const expectedMethods=['optimize','binCost','mkBin','collectOffcuts','auditCutPlan',
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
for(const name of expectedMethods)assert.equal(typeof engine[name],'function','Facade: '+name);
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
assert.ok(sw.includes('./engine/material-policy.js')&&sw.includes('./engine/material-allocator.js'));
assert.ok(sw.includes('./engine/production-audit.js')&&sw.includes('./engine/cutting-engine.js'));

const materialPolicy=win.BeythausMaterialPolicy;
assert.equal(materialPolicy.nextGrain(''),'width');
assert.equal(materialPolicy.nextGrain('width'),'length');
assert.equal(materialPolicy.nextGrain('length'),'');
assert.equal(materialPolicy.grainSymbol('width'),'=');
assert.equal(materialPolicy.grainSymbol('length'),'Ⅱ');
assert.equal(materialPolicy.stockPrice({l:1000,w:500,t:20,priceUnit:'panel',price:950}),950);
assert.equal(materialPolicy.stockPrice({l:1000,w:500,t:20,priceUnit:'m3',price:25000}),250);
assert.equal(materialPolicy.stockPrice({l:1000,w:500,t:20,priceUnit:'m3',price:30000}),300);
assert.equal(materialPolicy.stockPrice({l:1000,w:500,t:20,priceUnit:'m3',price:''}),null);
assert.equal(materialPolicy.stockPrice({isRemnant:true,bookValue:77}),77);
assert.equal(materialPolicy.stockPrice({isRemnant:true,bookValue:null}),null);
const grainPiece={id:'grain-piece',l:40,w:20,t:null,material:'wood',label:'G',rotate:true,grain:'width',order:0};
const grainStock={id:'grain-stock',l:100,w:100,t:null,material:'wood',grain:'length',qty:1,price:100,priceUnit:'panel',category:'panel',order:0};
const grainData={parts:[grainPiece],stocks:[grainStock],trim:0,kerf:0,minEdge:0,minArea:0,m3:0};
const grainPlan=engine.optimize(grainData,true,false);
assert.equal(grainPlan.unplaced.length,0,'Grain-compatible placement exists');
assert.equal(grainPlan.bins[0].placed[0].rotated,true,'Grain requires a 90-degree turn');
assert.equal(engine.auditCutPlan(grainPlan,grainData).ok,true);
const forbidden=JSON.parse(JSON.stringify(grainPlan));
forbidden.bins[0].placed[0].rotated=false;
assert.equal(engine.auditCutPlan(forbidden,grainData).ok,false,'Independent audit rejects forbidden grain');
const squareGrain={...grainPiece,id:'square',l:20,w:20};
const squareData={...grainData,parts:[squareGrain]};
const squarePlan=engine.optimize(squareData,true,false);
assert.equal(squarePlan.bins[0].placed[0].rotated,true,'Square still has meaningful grain rotation');
assert.equal(engine.auditCutPlan(squarePlan,squareData).ok,true);
const stockPine={...grainStock,id:'pine',material:'panel|pine',grain:'',price:60};
const stockBeech={...grainStock,id:'beech',material:'panel|beech',grain:'',price:140};
const autoData={parts:[{...grainPiece,id:'auto',category:'panel',material:'__AUTO__',grain:'',l:40,w:20,order:0}],
 stocks:[stockPine,stockBeech],trim:0,kerf:0,minEdge:0,minArea:0,m3:0};
const allocator=win.BeythausMaterialAllocator.createAllocator({
 optimize:engine.optimize,audit:engine.auditCutPlan,
 offcutMetrics:engine.offcutMetrics,binCost:engine.binCost
});
const choice=allocator.allocate(autoData);
assert.ok(choice.economic&&choice.minimum&&choice.candidates===2);
assert.equal(choice.economic.plan.bins[0].stock.id,'pine','User stock pricing picks cheaper stock');
assert.equal(choice.proven,false,'Bounded allocation must not claim global proof');

const archived=win.BeythausProductionArchive.createPdfDefinition({
 id:'B-TEST',projectName:'Test üretim',createdAt:Date.now(),productionCompleted:true,
 grossStockCost:200,offcutBookValue:40,materialCost:160,extraCost:15,totalCost:175,
 planSnapshot:{kerf:3,trim:0,bins:[{stock:{l:100,w:80,t:18,material:'Beyaz MDF'},
 pieces:[{x:0,y:0,w:40,h:40,label:'P01',rotated:false}],
 cuts:[{axis:'vertical',source:{x:0,y:0,w:100,h:80},at:43,number:1}]}]}
});
assert.ok(archived.content.some(c=>typeof c.svg==='string'&&c.svg.includes('<line ')));
assert.ok(archived.content.some(c=>c.table?.body?.some(r=>r[0]==='Toplam proje maliyeti')));
assert.ok(sw.includes('./engine/production-archive.js'));
console.log('Engine architecture contract: 20 public methods preserved, mutable project switching safe, independent audit rejects partial cuts, load order/PWA verified.');
