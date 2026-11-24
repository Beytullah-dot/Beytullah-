'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const V=require('../../physical-guillotine-verifier.cjs');
const out=path.resolve(__dirname,'../results/visual');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BEY_CHROMIUM?{executablePath:process.env.BEY_CHROMIUM}:{}),args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:true});
 await context.route('**/*',async route=>{const url=route.request().url();if(url==='http://127.0.0.1:8765/index.html'){const html=fs.readFileSync(path.resolve(__dirname,'../../../docs/index.html'),'utf8').replace('window.BeythausCut={','window.__stage1ReadOnly={getPlan:()=>solution,getData:()=>normalize()};window.BeythausCut={');return route.fulfill({body:html,contentType:'text/html'});}if(url.startsWith('http://127.0.0.1:8765/'))return route.continue();if(url.startsWith('https://cdn.jsdelivr.net/npm/pdfmake@0.2.23/build/'))return route.fulfill({path:require.resolve('pdfmake/build/'+url.split('/').at(-1)),contentType:'application/javascript'});return route.abort();});
 const rows=[];
 for(const id of ['mutfak','banyo','wc']){
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8765/index.html');await page.waitForFunction(()=>window.BeythausCut);
  const input=JSON.parse(fs.readFileSync(path.join(__dirname,`../results/${id}-input.json`)));
  let result=await page.evaluate(async state=>{
   const app=window.BeythausCut;
   for(const flag of ['missing','undefined',false]){const check={...state};delete check.allowNarrowScrapCuts;if(flag==='undefined')check.allowNarrowScrapCuts=undefined;if(flag===false)check.allowNarrowScrapCuts=false;app.setState(check);if(app.getState().allowNarrowScrapCuts!==false||document.querySelector('#narrowScrapSelect').value!=='closed')throw Error('UI default is not closed');}
   app.setState({...state,allowNarrowScrapCuts:false});
   const select=document.querySelector('#narrowScrapSelect');select.value='open';select.dispatchEvent(new Event('change',{bubbles:true}));
   const data=app.normalize();const plan=app.optimize(data,true,false,'area');
   await app.run();return {data,plan,audit:app.auditCutPlan(plan,data)};
  },input.state);
  await page.waitForFunction(()=>document.querySelector('#downloadPdfTopBtn')&&!document.querySelector('#downloadPdfTopBtn').disabled,null,{timeout:30000});
  result=await page.evaluate(()=>({data:window.__stage1ReadOnly.getData(),plan:window.__stage1ReadOnly.getPlan()}));
  const verified=V.verifyPlan(result.data,result.plan);assert(verified.ok&&verified.complete,JSON.stringify(verified));const cuts=result.plan.bins.flatMap(b=>b.cuts).filter(c=>c.overhang);assert(cuts.length>0,id+' no overhang');
  await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
  const text=await page.locator('body').innerText();assert(text.includes('Dar artık kesimi (taşmalı)'),id+' marker absent');
  const plan=page.locator('.cut-svg').first();await plan.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,id+'-screen.png'),fullPage:true});
  const buttons=await page.locator('button').evaluateAll(bs=>bs.filter(b=>/PDF/.test(b.innerText)).map(b=>({id:b.id,text:b.innerText,disabled:b.disabled})));
  fs.writeFileSync(path.join(out,id+'-plan.json'),JSON.stringify({...result,independent:verified,cuts,buttons,errors},null,2));
  const pdfButton=buttons.find(b=>!b.disabled&&b.id);assert(pdfButton,JSON.stringify(buttons));
  const downloadPromise=page.waitForEvent('download',{timeout:30000});await page.locator('#'+pdfButton.id).click();const download=await downloadPromise;await download.saveAs(path.join(out,id+'.pdf'));
  rows.push({id,pieces:verified.placed,sheets:verified.count,overhangCuts:cuts.length,independentOK:verified.ok,errors,pdfButton:pdfButton.id});await page.close();
 }
 fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify(rows,null,2));await browser.close();console.log(rows);
})().catch(e=>{console.error(e);process.exit(1)});
