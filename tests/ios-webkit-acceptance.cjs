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
  page.on('pageerror', err => uncaught.push(String(err.message || err)));
  await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.BeythausCut &&
    window.BeythausCutWorkspace && document.querySelector('#bhDrawerHandle')),
    null, { timeout });
  assert.match(await page.title(), /Beythaus Cut/i);
  console.log('PASS 1: Mobile WebKit page loads, existing app and drawer initialize');

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
  const stock = page.locator('#stockRows tr[data-id="uat-A"] .grain-cycle');
  for (const expected of ['width', 'length', '']) {
    await stock.click();
    assert.equal(await stock.getAttribute('data-grain'), expected);
  }
  await page.locator('#bhBackToPlan').click();
  console.log('PASS 4: Part and stock grain cycle: empty → width → length → empty');

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
  for (const choice of ['minimum', 'economic']) {
    await page.locator('#autoPlanChoice [data-choice="' + choice + '"]').click();
  }
  console.log('PASS 5: Explicit stock exclusion, audited cut, two plan choices, no stock consumption');

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.BeythausCutWorkspace), null, { timeout });
  assert.equal(await page.locator('#bhDrawerHandle').getAttribute('aria-expanded'), 'false');
  await page.locator('#bhDrawerHandle').click();
  assert.equal(await page.locator('#bhDrawerHandle').getAttribute('aria-expanded'), 'true');
  assert.deepEqual(uncaught, [], 'Unexpected uncaught browser errors');
  console.log('PASS 6: Refresh and navigation survive; no uncaught WebKit errors');

  await context.close();
  console.log('PASS: Isolated WebKit iPhone-emulation smoke complete. Manual iOS/cloud UAT still required.');
}
main().catch(err => {
  console.error('FAIL: ' + (err.stack || err));
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
});
