/* Beythaus Cut independent optimization regression.
 * Run: node tests/optimization-regression.cjs
 * JSON: node tests/optimization-regression.cjs --json tests/report.json
 * No external dependencies.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {solve,audit}=require('./optimization-oracle.cjs');
const {createEngine}=require('./engine-harness.cjs');
const state={mode:'nest',kerf:'0',offcutMinEdgeMm:50,offcutMinAreaCm2:100,priceMode:'panel'};
const val=x=>Number(String(x).replace(',','.'));
const mkey=x=>String(x).trim().toLocaleLowerCase('tr-TR');
const fmt=(x,n)=>Number(x).toFixed(n??0);
const engine=createEngine(state,val,mkey,fmt);

const fixtures=[
 {name:'four quarters, zero kerf',board:[100,100],pieces:[[50,50],[50,50],[50,50],[50,50]],kerf:0,expected:1},
 {name:'four quarters, 2mm kerf',board:[100,100],pieces:[[50,50],[50,50],[50,50],[50,50]],kerf:2,expected:4},
 {name:'three oversized squares',board:[100,100],pieces:[[60,60],[60,60],[60,60]],kerf:0,expected:3},
 {name:'two full-height strips',board:[100,100],pieces:[[30,100],[70,100]],kerf:0,expected:1},
 {name:'two full-height strips with kerf',board:[100,100],pieces:[[30,100],[70,100]],kerf:2,expected:2},
 {name:'rotation required',board:[5,6],pieces:[[6,2],[6,3]],kerf:0,rotate:true,expected:1},
 {name:'alternate stock types',pieces:[[50,100],[50,100]],kerf:0,expected:1,
  stocks:[{l:100,w:100,qty:1,price:100},{l:50,w:100,qty:2,price:25}]},
 {name:'edge trim and kerf',board:[10,10],pieces:[[4,4],[4,4]],kerf:1,trim:1,expected:2}
];
function input(f,i){
 const stocks=(f.stocks||[{l:f.board[0],w:f.board[1],qty:f.pieces.length+1,price:100}])
  .map((s,j)=>({id:'s'+i+'-'+j,l:s.l,w:s.w,qty:s.qty,t:s.t??null,
    material:s.material||'MDF',price:s.price??100,order:j}));
 const parts=f.pieces.map((p,j)=>({id:'p'+i+'-'+j,l:p[0],w:p[1],
  t:p[2]??null,material:p[3]||'MDF',label:'P'+j,rotate:!!f.rotate||!!p[4],order:j}));
 return {parts,stocks,kerf:f.kerf||0,trim:f.trim||0,m3:1,minEdge:50,minArea:100};
}
let seed=0x2a91b30f;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296}
const pick=(a,b)=>a+Math.floor(random()*(b-a+1));
function generated(i){
 const W=pick(5,8),H=pick(5,8),n=pick(2,4);
 const f={name:'generated-'+i,board:[W,H],kerf:pick(0,1),trim:pick(0,1),
  pieces:Array.from({length:n},()=>[pick(1,W),pick(1,H),null,'MDF',random()>.5])};
 if(i%4===0)f.stocks=[{l:W,w:H,qty:n},{l:pick(3,W),w:pick(3,H),qty:n-1}];
 if(i%7===0)f.pieces[0][3]='Other'; // deliberately no matching stock
 return f;
}
const cases=[...fixtures,...Array.from({length:28},(_,i)=>generated(i+1))];
const failures=[],qualityGaps=[],unknown=[];
const count={cases:0,valid:0,oracleOptimal:0,oracleInfeasible:0,
 matches:0,gaps:0,countProven:0,areaProven:0,unproven:0,incomplete:0};
function fail(name,mode,problem,details){failures.push({name,mode,problem,...details})}
for(let i=0;i<cases.length;i++){
 const f=cases[i],data=input(f,i);
 for(const mode of ['nest','guillotine']){
  count.cases++;state.mode=mode;state.kerf=String(data.kerf);
  let ref,plan,appCheck,independent,certificate;
  try{
   ref=solve(data,mode,{maxNodes:4500000});
   plan=engine.optimize(data,true,true,'minimum');
   appCheck=engine.auditCutPlan(plan,data);
   independent=audit(data,plan,mode);
   certificate=engine.certifyStockCount(plan,data,appCheck);
  }catch(e){fail(f.name,mode,'exception',{message:String(e)});continue}
  if(!appCheck.ok||!independent.ok){
   fail(f.name,mode,'invalid-plan',{
    appIssues:appCheck.issues?.slice(0,4),independentIssues:independent.issues?.slice(0,4)
   });continue;
  }
  count.valid++;
  const complete=plan.unplaced.length===0&&plan.placedCount===data.parts.length;
  if(certificate.proven)count.countProven++;else count.unproven++;
  if(plan.areaProof?.proven)count.areaProven++;
  if(ref.status==='unknown'){
   unknown.push({name:f.name,mode,nodes:ref.nodes});
   if(f.expected!=null)fail(f.name,mode,'fixture-oracle-incomplete',{});
   continue;
  }
  if(ref.status==='infeasible'){
   count.oracleInfeasible++;
   if(complete)fail(f.name,mode,'oracle-says-infeasible-but-app-packed',{});
   if(certificate.proven)fail(f.name,mode,'infeasible-plan-certified',{});
   if(f.expected!=null)fail(f.name,mode,'fixture-not-feasible',{expected:f.expected});
   continue;
  }
  count.oracleOptimal++;
  if(f.expected!=null&&ref.minimumBoards!==f.expected)
   fail(f.name,mode,'fixture-reference-mismatch',{expected:f.expected,oracle:ref.minimumBoards});
  if(!complete){
   count.incomplete++;
   qualityGaps.push({name:f.name,mode,problem:'feasible-instance-not-completed'});
   if(certificate.proven)fail(f.name,mode,'incomplete-plan-certified',{});
   continue;
  }
  const n=plan.bins.length;
  if(n<ref.minimumBoards)fail(f.name,mode,'plan-beats-exact-reference',{got:n,oracle:ref.minimumBoards});
  if(certificate.proven&&n!==ref.minimumBoards)
   fail(f.name,mode,'false-stock-count-proof',{got:n,oracle:ref.minimumBoards});
  if(plan.areaProof?.proven&&n===ref.minimumBoards&&
     Math.abs(plan.stockArea-ref.minimumAreaAtMinBoards)>1e-6)
   fail(f.name,mode,'false-gross-area-proof',{
     got:plan.stockArea,oracle:ref.minimumAreaAtMinBoards
   });
  if(n===ref.minimumBoards)count.matches++;
  else{
   count.gaps++;
   qualityGaps.push({name:f.name,mode,found:n,optimum:ref.minimumBoards});
  }
 }
}
const report={generatedAt:new Date().toISOString(),source:'docs/index.html',
 oracle:'independent integer grid and guillotine-tree exhaustive reference',
 seed:'0x2a91b30f',known:fixtures.length,generated:cases.length-fixtures.length,
 summary:count,failures,qualityGaps,unknown};
console.log('Beythaus Cut regression: '+count.cases+' scenarios, '+count.valid+
 ' valid plans, '+count.matches+' matching optimum, '+count.gaps+
 ' gaps, '+failures.length+' correctness errors, '+unknown.length+' unresolved references');
for(const err of failures)console.error('[FAIL] '+JSON.stringify(err));
for(const gap of qualityGaps.slice(0,12))console.log('[QUALITY] '+JSON.stringify(gap));
if(unknown.length)console.warn('Reference budget exceeded. No optimum claim was inferred.');
const j=process.argv.indexOf('--json');
if(j>=0){
 const target=process.argv[j+1];
 if(!target)throw Error('Missing path after --json');
 fs.mkdirSync(path.dirname(path.resolve(target)),{recursive:true});
 fs.writeFileSync(path.resolve(target),JSON.stringify(report,null,2)+'\n');
 console.log('Report saved: '+target);
}
if(failures.length)process.exitCode=1;
