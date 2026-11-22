#!/usr/bin/env node
/* Beythaus Cut — read-only WebKit/iPhone acceptance smoke.
 * Runs against an isolated, locally served copy of docs/ with a fresh
 * Playwright browser profile. Never signs in or calls stock-changing RPCs.
 * This is emulation, NOT real iPhone/Safari or two-user field acceptance.
 */
'use strict';
const assert = require('node:assert/strict');
const { webkit, devices } = require('playwright');

const baseUrl = process.env.BEYTHAUS_TEST_URL || 'http://127.0.0.1:8765/index.html';
const timeout = 20000;
let browser;
async function main() {
  browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    serviceWorkers: 'block', // isolate tests from an older device cache
    permissions: []
  });
  const page = await context.newPage();
  const uncaught = [];
  page.on('pageerror', err => { uncaught.push(String(err.message || err)); console.error('WebKit page error',err.stack); });
  page.on('requestfailed', req => console.warn('Request failed',req.url(),req.failure()?.errorText));
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.BeythausCut &&
    window.BeythausCutWorkspace && document.querySelector('#bhDrawerHandle')),
    null, { timeout });
  assert.match(await page.title(), /Beythaus Cut/i);
  console.log('PASS 1: Mobile WebKit page loads, existing app and drawer initialize');

  // Real browser Worker invocation on synthetic stock. This is WebKit
  // emulation, not a physical iPhone acceptance test.
  const webkitConstructive=await page.evaluate(async()=>{
    const common={category:'panel',material:'panel|webkit-lazy',
      t:18,grain:'length',rotate:false};
    const widths=[8,14,10,12,9,13,7,15];
    const data={parts:widths.map((l,i)=>({...common,
      id:'wk-p'+i,label:'WK'+i,l,w:16})),
      stocks:[[52,36,100],[54,38,114],[56,40,129],[60,42,157]]
        .map(([l,w,price],i)=>({...common,id:'wk-s'+i,
          l,w,price,priceUnit:'panel',qty:1})),trim:1,kerf:2,m3:null};
    const worker=new Worker('./constructive-worker.js');
    return new Promise((resolve,reject)=>{
      const limit=setTimeout(()=>{worker.terminate();reject(Error('Constructive browser Worker timeout'))},9000);
      worker.onerror=e=>{clearTimeout(limit);worker.terminate();
        reject(Error('Constructive Worker exception: '+e.message))};
      worker.onmessage=e=>{clearTimeout(limit);worker.terminate();
        const r=e.data;resolve({status:r.status,proof:r.proof,
          researchOnly:r.researchOnly,placedCount:r.plan?.placedCount,
          unplacedCount:r.plan?.unplaced?.length,
          cuts:r.plan?.bins?.flatMap(b=>b.cuts).length,
          plan:r.plan,data})};
      worker.postMessage({type:'construct',requestId:910,mode:'guillotine',
        objective:'cost',priceMode:'panel',m3:null,data});
    });
  });
  assert.equal(webkitConstructive.status,'feasible-uncertified');
  assert.equal(webkitConstructive.proof,'none');
  assert.equal(webkitConstructive.researchOnly,true);
  assert.equal(webkitConstructive.placedCount,8);
  assert.equal(webkitConstructive.unplacedCount,0);
  assert(webkitConstructive.cuts>0);
  // Replay the returned tree through the production auditor in this browser.
  const checkedWorker=await page.evaluate(({data,plan})=>{
    const state=window.BeythausCut.getState();
    const original=state.mode;state.mode='guillotine';
    try{return window.BeythausCut.auditCutPlan(plan,data)}
    finally{state.mode=original}
  },webkitConstructive);
  assert.equal(checkedWorker.ok,true,'browser Worker plan re-audited in WebKit');
  console.log('PASS 1b: WebKit constructive Worker and browser physical cut-tree re-audit');


  // Same persistent handle both opens and closes the drawer.
  const handle = page.locator('#bhDrawerHandle');
  await handle.click();
  assert.equal(await handle.getAttribute('aria-expanded'), 'true');
  await handle.click();
  assert.equal(await handle.getAttribute('aria-expanded'), 'false');
  const sections = {
    inventory: 'Stok Envanteri',
    costs: 'Maliyet Kayıtları',
    account: 'Hesap Ayarları'
  };
  for (const [key, heading] of Object.entries(sections)) {
    await handle.click();
    await page.locator('#bhWorkspaceDrawer [data-bh-view="' + key + '"]').click();
    assert.equal((await page.locator('#bhSectionTitle').textContent()).trim(), heading);
    assert.equal(await handle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('#bhContentScreen').isVisible(), true);
  }
  await page.locator('#bhBackToPlan').click();
  assert.equal(await page.locator('#bhContentScreen').isVisible(), false);
  console.log('PASS 2: Drawer and all four main sections, including return to cutting plan');

  await page.locator('#projectsBtn').click();
  assert.equal(await page.locator('#projectsOverlay').isVisible(), true);
  assert.equal(await page.locator('#projectsSearch').isVisible(), false);
  await page.locator('#projectsSearchToggle').click();
  assert.equal(await page.locator('#projectsSearch').isVisible(), true);
  await page.locator('#projectsClose').click();
  console.log('PASS 3: Projects list opens directly; search appears only on request');

  // Browser-only demo measurements. No Supabase credentials, remote writes,
  // physical production confirmation or real stock data are used.
  await page.evaluate(() => {
    const app = window.BeythausCut;
    const d = app.defaultData();
    d.project = 'WEBKIT-TEST-ONLY';
    d.singleCategory = 'panel';
    d.singleMaterial = 'Test-Mese';
    d.parts = [{
      id: 'uat-part', l: 60, w: 30, t: 18, qty: 1,
      category: 'panel', material: 'Test-Mese', grain: '',
      rotate: true, label: 'P01'
    }];
    d.stocks = [{
      id: 'uat-A', l: 120, w: 60, t: 18, qty: 1,
      category: 'panel', material: 'Test-Mese',
      priceUnit: 'panel', price: 1800, grain: '', location: 'TEST'
    }, {
      id: 'uat-B', l: 120, w: 60, t: 18, qty: 1,
      category: 'panel', material: 'Test-Ceviz',
      priceUnit: 'panel', price: 2500, grain: '', location: 'TEST'
    }];
    app.setState(d);
  });
  const part = page.locator('#partRows .grain-cycle').first();
  for (const expected of ['width', 'length', '']) {
    await part.click();
    assert.equal(await part.getAttribute('data-grain'), expected);
  }
  await page.evaluate(() => window.BeythausCutWorkspace.show('inventory'));
  assert.equal(await page.locator('#stockRows .grain-cycle').count(), 0,
    'Stock dimensions define axes; stock no longer has a direction control');
  await page.locator('#bhBackToPlan').click();
  console.log('PASS 4: Part-only direction cycle: empty → width → length → empty');

  await page.locator('#materialModeSelect').selectOption('auto');
  const excluded = page.locator('#autoStockChoices input[data-stock-id="uat-B"]');
  await page.locator('#autoStockChoices details')
    .filter({ has: page.locator('input[data-stock-id="uat-B"]') })
    .locator('summary .material-tag').click();
  await excluded.uncheck();
  const policy = await page.evaluate(() => ({
    allow: window.BeythausCut.getState().allowedStockIds,
    stocks: window.BeythausCut.normalize().stocks.map(s => s.id)
  }));
  assert.ok(policy.allow.includes('uat-A'), 'Included stock must remain selectable');
  assert.ok(!policy.allow.includes('uat-B'), 'Excluded stock must not be selectable');
  assert.ok(!policy.stocks.includes('uat-B'), 'Excluded stock must not enter optimizer');
  await page.locator('#objectiveSegment [data-objective="area"]').click();
  assert.equal(await page.evaluate(()=>window.BeythausCut.getState().objective),'area');
  // In phone layout the desktop run button is intentionally hidden.
  await page.locator('#mobileRunBtn').click();
  await page.waitForFunction(() =>
    !document.querySelector('#autoPlanChoice').classList.contains('hidden'),
    null, { timeout });
  const audited = await page.evaluate(() => ({
    audit: window.BeythausCut.getLastAudit(),
    quantities: window.BeythausCut.getState().stocks.map(s => s.qty)
  }));
  assert.equal(audited.audit?.ok, true, 'Production plan must pass independent cut audit');
  assert.deepEqual(audited.quantities, [1, 1], 'Calculating must not consume stock');
  for (const choice of ['economic', 'area']) {
    await page.locator('#autoPlanChoice [data-choice="' + choice + '"]').click();
  }
  await page.waitForFunction(() => {
    const area=document.querySelector('#grossWasteProofRow');
    const cost=document.querySelector('#globalCostProofRow');
    const count=document.querySelector('#optimalityRow');
    return area?.classList.contains('is-proven') &&
      cost?.classList.contains('is-proven') &&
      count?.classList.contains('is-proven');
  }, null, { timeout });
  console.log('PASS 5: Pre-run selected gross area, explicit stock exclusion, audited alternative goals and no stock consumption');

  // Drive the actual form, worker and result acceptance using only local test stock.
  const beng=require('node:child_process').execFileSync('python3',['-c',
    'import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]))',
    require('node:path').join(__dirname,'fixtures/2dpacklib-beng.zip'),
    'BENG/BENG/BENG02.ins2D'],{encoding:'utf8'}).trim().split(/\r?\n/)
    .slice(2).map(line=>line.split(/\s+/).map(Number));
  await page.evaluate(rows=>{
    const app=window.BeythausCut,d=app.defaultData();
    Object.assign(d,{unit:'mm',mode:'guillotine',materialMode:'single',
      singleCategory:'panel',singleMaterial:'BENG02',kerf:0,trim:0});
    const common={t:18,category:'panel',material:'BENG02'};
    d.parts=rows.map(([id,l,w])=>({...common,id:'p'+id,label:'P'+id,
      l,w,qty:1,grain:'length',rotate:false}));
    d.stocks=[{...common,id:'sheet',l:25,w:10,qty:40,priceUnit:'panel',price:1}];
    app.setState(d);
  },beng);
  await page.locator('#mobileRunBtn').click();
  await page.waitForFunction(()=>{
    const audit=window.BeythausCut.getLastAudit();
    return audit?.ok&&audit.checkedStocks===6&&audit.checkedParts===40&&
      document.querySelector('#optimalityRow').classList.contains('is-proven')&&
      document.querySelector('#globalCostProofRow').classList.contains('is-proven');
  },null,{timeout}).catch(async error=>{
    console.error(await page.evaluate(()=>({audit:window.BeythausCut.getLastAudit(),
      status:document.querySelector('#exactSearchLine')?.textContent,
      errors:window.BeythausCut.normalize().errors})));
    throw error
  });
  assert.equal(await page.evaluate(()=>window.BeythausCut.getState().stocks[0].qty),40);
  console.log('PASS: BENG02 from mobile calculation through background search and audited six-sheet result');
  // Save and reopen just beyond the former silent row truncation points.
  await page.evaluate(()=>{
    const app=window.BeythausCut,d=app.getState();
    d.parts=Array.from({length:251},(_,i)=>({...d.parts[0],id:'row-'+i}));
    d.stocks=Array.from({length:101},(_,i)=>({...d.stocks[0],id:'stock-'+i}));
    d.allowedStockIds=Array.from({length:801},(_,i)=>'old-stock-'+i).concat('stock-100');
    d.materialMode='auto';
    app.setState(d)
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.BeythausCutWorkspace), null, { timeout });
  const reopened=await page.evaluate(()=>{
    const app=window.BeythausCut,d=app.getState(),job=app.normalize();
    return [d.parts.length,d.parts.at(-1).id,d.stocks.length,d.stocks.at(-1).id,
      d.allowedStockIds.length,job.parts.length,job.stocks.map(s=>s.id),job.errors]
  });
  assert.deepEqual(reopened,[251,'row-250',101,'stock-100',802,251,['stock-100'],[]]);
  assert.equal(await page.locator('#bhDrawerHandle').getAttribute('aria-expanded'), 'false');
  await page.locator('#bhDrawerHandle').click();
  assert.equal(await page.locator('#bhDrawerHandle').getAttribute('aria-expanded'), 'true');
  assert.deepEqual(uncaught, [], 'Unexpected uncaught browser errors');
  console.log('PASS 6: Refresh and navigation survive; no uncaught WebKit errors');

  await page.locator('#bhDrawerHandle').click();
  // Serve the exact CDN assets from the pinned package so PDF export works offline in CI.
  await page.route('https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/*', route=>{
    const asset=new URL(route.request().url()).pathname.split('/').pop();
    return route.fulfill({path:require.resolve('pdfmake/build/'+asset),contentType:'application/javascript'})
  });
  await page.evaluate(()=>{
    const app=window.BeythausCut,d=app.defaultData();
    Object.assign(d,{unit:'mm',mode:'guillotine',materialMode:'single',singleCategory:'panel',singleMaterial:'TEST',kerf:3,trim:2,useRemnantStock:false});
    d.parts=[{id:'piece',category:'panel',material:'TEST',l:22,w:22,t:18,qty:2001,label:'P01'}];
    d.stocks=[{id:'board',category:'panel',material:'TEST',l:104,w:104,t:18,qty:126}];
    app.setState(d);
  });
  await page.locator('#mobileRunBtn').click();
  const card=page.locator('#quantityResult');
  assert.match(await card.innerText(),/2001 parça · 126 levha/);
  assert.match(await card.innerText(),/Levha 1–125 · 125 tekrar/);
  assert.match(await card.innerText(),/Levha 126 · 1 tekrar/);
  const received=page.waitForEvent('download',{timeout:30000});
  await card.locator('button').click();
  const file=await received;
  assert.equal(file.suggestedFilename(),'beythaus-seri-kesim.pdf');
  const bytes=require('node:fs').readFileSync(await file.path());
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
  const parsed=await require('pdf-parse/lib/pdf-parse.js')(bytes);
  assert.match(parsed.text,/2001 parça · 126 levha/);
  assert.match(parsed.text,/Levha 1–125 · 125 tekrar/);
  assert.match(parsed.text,/Levha 126 · 1 tekrar/);
  assert.equal(await page.evaluate(()=>window.BeythausCut.getState().stocks[0].qty),126);
  console.log('PASS: 2001-piece mobile job, two audited patterns, actual PDF download, stock preserved');

  await page.evaluate(()=>{
    const app=window.BeythausCut,d=app.getState(),part=d.parts[0];
    d.parts=[{...part,id:'side',label:'YAN',qty:751,l:100,w:53,grain:'length'},
     {...part,id:'base',label:'TABAN',qty:751,l:44,w:100,grain:'width'}];
    d.stocks[0].qty=751;app.setState(d);
  });
  await page.locator('#mobileRunBtn').click();
  assert.match(await card.innerText(),/1502 parça · 751 levha/);
  const mixedDownload=page.waitForEvent('download',{timeout:30000});
  await card.locator('button').click();
  const mixedFile=await mixedDownload;
  const mixedPdf=await require('pdf-parse/lib/pdf-parse.js')(
    require('node:fs').readFileSync(await mixedFile.path()));
  assert.match(mixedPdf.text,/Levha 1–751 · 751 tekrar/);
  assert.match(mixedPdf.text,/YAN · dönüş 0°/);
  assert.match(mixedPdf.text,/TABAN · dönüş 90°/);
  assert.equal(await page.evaluate(()=>window.BeythausCut.getState().stocks[0].qty),751);
  assert.deepEqual(uncaught,[]);
  console.log('PASS: mixed repeated board, two directed labels and physical quantities preserved in PDF');

  await context.close();
  console.log('PASS: Isolated WebKit iPhone-emulation smoke complete. Manual iOS/cloud UAT still required.');
}
main().catch(err => {
  console.error('FAIL: ' + (err.stack || err));
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
});
