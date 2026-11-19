/* Regression: real 19 Nov 2026 atelier PDF case.
 * Distinguishes rectangle packing from full-through guillotine cuts,
 * verifies exact one-board infeasibility and PDF "not for production" marking.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const gcode=fs.readFileSync(path.join(root,'docs/guillotine-exact.js'),'utf8');
const G=new Function('self',gcode+';return GuillotineExact')({});
const {createEngine}=require('./engine-harness.cjs');
const state={mode:'nest',kerf:'3',priceMode:'m3',m3Price:25000,
 project:'Atölye projesi',unit:'cm',
 offcutMinEdgeMm:50,offcutMinAreaCm2:100,
 partsThicknessEnabled:true,parts:[]};
const number=x=>Number(String(x).replace(',','.'));
const mkey=x=>String(x||'').trim().toLocaleLowerCase('tr-TR');
const fmt=(x,d)=>Number(x).toFixed(d??0);
const app=createEngine(state,number,mkey,fmt);
const specs=[
 ['P01',400,240,2],['P02',380,240,1],
 ['P03',310,240,1],['P04',1800,50,2],
 ['P05',400,50,3],['P06',520,120,2]
];
const parts=specs.flatMap(([label,l,w,qty],order)=>
 Array.from({length:qty},(_,i)=>({
  id:label+'-'+i,label,l,w,t:30,material:'Ahşap',rotate:true,order
 })));
const stock={id:'S1',l:3000,w:300,t:30,material:'Ahşap',qty:3,price:0,order:0};
const data={parts,stocks:[stock],kerf:3,trim:0,m3:25000};
state.parts=specs.map(([label,l,w,qty])=>({
 label,l:l/10,w:w/10,t:30,qty,material:'Ahşap',rotate:true
}));
assert.equal(parts.length,11);
state.mode='nest';
const free=app.optimize(data,true,false);
const freeAudit=app.auditCutPlan(free,data);
assert.equal(free.bins.length,1,'Free rectangular packing fits in 1 panel');
assert.ok(freeAudit.ok,'Free coordinates valid');
assert.equal(free.bins[0].cuts.length,0,'Free plan has no physical cutting sequence');
state.mode='guillotine';
const strict=app.optimize(data,true,false);
const strictAudit=app.auditCutPlan(strict,data);
assert.equal(strict.bins.length,2,'Physical guillotine packing uses 2 panels');
assert.ok(strictAudit.ok,'Every guillotine cut must replay end-to-end');
assert.ok(strict.bins.every(b=>b.cuts.length>0));
for(const bin of strict.bins)for(const cut of bin.cuts){
 const source=cut.source;
 if(cut.axis==='vertical'){
  assert.ok(Math.abs(cut.y1-source.y)<1e-6);
  assert.ok(Math.abs(cut.y2-(source.y+source.h))<1e-6)
 }else{
  assert.ok(Math.abs(cut.x1-source.x)<1e-6);
  assert.ok(Math.abs(cut.x2-(source.x+source.w))<1e-6)
 }
}
const exact=G.feasible(parts,[stock],1,data,Date.now()+6500,500000);
assert.equal(exact.status,'infeasible',
 'Full-through model must mathematically exclude single-stock atelier layout');
assert.ok(exact.nodes<500000,'Proof must not run into node cap');
// Reject a forged "cut" whose endpoint stops inside the active rectangle.
const forged={...strict,bins:strict.bins.map((b,i)=>i?b:{...b,
 cuts:b.cuts.map((c,j)=>j?c:{...c,y2:c.axis==='vertical'?
 c.y2-1:c.y2,x2:c.axis==='horizontal'?c.x2-1:c.x2})
})};
assert.equal(app.auditCutPlan(forged,data).ok,false,
 'A partial-length cut can never pass production audit');
// Inspect actual PDFMake document object without a PDF runtime.
const start=html.indexOf('function makePdfDocument(){');
const end=html.indexOf('\nlet cachedPdf=',start);
assert.ok(start>0&&end>start);
const pdfFactory=new Function('state','lastAudit','normalize','solution',
 'dimFactor','fmt','thicknessText','activeProjectId','stockProofDescription',
 'grossWasteProofDescription','offcutOptimizationDescription','svgFor',
 'collectOffcuts','cutStepRows','val',
 html.slice(start,end)+';return makePdfDocument;');
function pdf(mode,plan){
 state.mode=mode;
 const factory=pdfFactory(state,{ok:true},()=>data,plan,
  ()=>10,fmt,x=>x===null?'—':x+' mm','atolye',
  ()=>'Stok ispatı',()=>'Alan sınırı',()=>'Artıklar',
  ()=>
   '<svg viewBox="0 0 120 30"><rect x="0" y="0" width="120" height="30"/></svg>',
  ()=>({pieces:[]}),()=>[],number
 );
 return factory()
}
const draft=pdf('nest',free);
assert.ok(draft.watermark,'Free-mode PDF must be visibly watermarked');
assert.ok(JSON.stringify(draft.content).includes('ÜRETİME UYGUN DEĞİL'),
 'Production warning must appear in exported PDF');
assert.ok(!JSON.stringify(draft.content[0]).includes('ÜRETİM DOSYASI'),
 'Free-mode PDF cannot be titled production document');
const cutDocument=pdf('guillotine',strict);
assert.equal(cutDocument.watermark,undefined,'Verified guillotine has no warning watermark');
assert.ok(JSON.stringify(cutDocument.content[0]).includes('ÜRETİM DOSYASI'));
assert.ok(JSON.stringify(cutDocument.content).includes('GEOMETRİK KESİM SIRASI'));
// Existing projects in free mode must show safety warning and a switch action.
const bannerFrom=html.indexOf('function refreshProductionSafety(){');
const bannerTo=html.indexOf('function showResult(',bannerFrom);
assert.ok(bannerFrom>=0&&bannerTo>bannerFrom);
const toggle=[];
const refresh=new Function('state','byId',html.slice(bannerFrom,bannerTo)+
 ';return refreshProductionSafety;')(state,()=>({classList:{
 toggle(name,hidden){toggle.push({name,hidden})}
}}));
state.mode='nest';refresh();
state.mode='guillotine';refresh();
assert.deepEqual(toggle,[{name:'hidden',hidden:false},{name:'hidden',hidden:true}]);
const defaultAt=html.indexOf('const defaultData=');
assert.ok(defaultAt>0&&html.slice(defaultAt,defaultAt+800).includes("mode:'guillotine'"),'New projects must default to physical cutting');
assert.ok(!html.slice(defaultAt,defaultAt+800).includes('qty:999'),'New projects must not create fake physical stock');
console.log('Atelier 11-part PDF: free=1 stock / no cuts, guillotine=2 stocks with valid full cuts; '+
 '1-stock guillotine impossibility proved ('+exact.nodes+' nodes). '+
 'Forged partial cut rejected. Free PDF marked NOT FOR PRODUCTION.');
