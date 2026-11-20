// Finite workshop stock. Known cutting witnesses stay outside the optimizer.
'use strict';
const assert=require('node:assert/strict');
const {engine,makeCase}=require('./motor-scalability-profile.cjs');
const oracle=require('./optimization-oracle.cjs');

function run(name,data,reference){
 const counts=data.stocks.map(s=>s.qty);
 const start=performance.now();
 const plan=engine.optimize(data,true,false,'minimum');
 const replay=engine.auditCutPlan(plan,data);
 assert.ok(replay.ok,name+' '+JSON.stringify(replay));
 const independent=oracle.audit(data,plan,'guillotine');
 assert.ok(independent.ok,name+' '+JSON.stringify(independent));
 assert.deepEqual(data.stocks.map(s=>s.qty),counts);
 const cert=engine.certifyStockCount(plan,data,replay);
 const complete=plan.unplaced.length===0&&plan.placedCount===data.parts.length;
 assert.ok(complete||!cert.proven);
 if(reference!==undefined){
  assert.equal(reference.status,'optimal',name);
  assert.ok(cert.lowerBound<=reference.minimumBoards,name);
  if(complete)assert.ok(plan.bins.length>=reference.minimumBoards,name);
  if(cert.proven)assert.equal(plan.bins.length,reference.minimumBoards,name);
 }
 const result={name,parts:data.parts.length,boards:plan.bins.length,missing:plan.unplaced.length,
  lower:cert.lowerBound,kerfArea:cert.details.reduce((sum,g)=>sum+g.kerfAreaLowerBound,0),countProven:cert.proven,oracle:reference?.minimumBoards,
  gap:complete&&cert.lowerBound!==null?plan.bins.length-cert.lowerBound:null,
  grossWaste:complete?plan.stockArea-plan.partArea:null,cost:complete?plan.cost:null,
  ms:Math.round(performance.now()-start)};
 console.log(JSON.stringify(result));
 return result
}

function grain(p,index){
 // Preserve the generator's known orientation even when the input axes swap.
 if(index%3===1)return {...p,l:p.w,w:p.l,grain:'width',rotate:true};
 if(index%3===2)return {...p,grain:'',rotate:true};
 return {...p,grain:'length',rotate:true}
}

const rows=[];
for(let seed=0;seed<12;seed++){
 const trim=2+seed%4,kerf=3;
 const depth=[2,3,4][seed%3],boards=[5,10,25,10][seed%4];
 const margin=[12,130,240][Math.floor(seed/4)];
 const data=makeCase({boards,depth,variable:true,seed:9000+seed,margin});
 data.trim=trim;data.kerf=kerf;
 data.stocks=data.stocks.map(s=>({...s,l:s.l+2*trim,w:s.w+2*trim}));
 data.parts=data.parts.map(grain);
 // Each planted board starts with the same trim, then two full-edge
 // exterior cuts remove the margin (which includes the 3 mm kerf).
 const result=run('planted-'+seed,data);
 assert.equal(result.missing,0,result.name);
 if(seed===2){assert.equal(result.kerfArea,25);assert.equal(result.countProven,true)}
 rows.push(result);
}
for(let i=0;i<12;i++){
 const kerf=1+i%2,trim=1+(i%3===0?1:0);
 const material=i%2?'masif|mese':'panel|ceviz',category=i%2?'masif':'panel';
 const common={material,category,t:18};
 const sizes=[[4+i%3,7],[6+Math.floor(i/3),7],[5,4+i%3],[5,6]];
 const stocks=[[sizes[0][0]+kerf+sizes[1][0],7],[5,sizes[2][1]+kerf+sizes[3][1]],[11,9]];
 if(i%3===0)stocks[2]=[stocks[0][0]+kerf+5,Math.max(7,stocks[1][1])];
 if(i%3===2)sizes.push([11,9]);
 const data={trim,kerf,parts:sizes.map(([l,w],j)=>grain({...common,id:'p'+j,label:'P'+j,l,w,order:j},j)),
  stocks:stocks.map(([l,w],j)=>({...common,id:'s'+j,l:l+2*trim,w:w+2*trim,order:j,
   qty:j===2?2:1,priceUnit:category==='panel'?'panel':'m3',price:category==='panel'?85+j:25000+j}))};
 const ref=oracle.solve(data,'guillotine');
 const result=run('oracle-'+i,data,ref);
 assert.equal(result.missing,0,result.name);
 rows.push(result)
}
// Separate panel and solid-wood lots on the same ticket. Only pieces carry
// orientation; the different stock axes stay in their original order.
for(const boards of [5,10]){
 const data={parts:[],stocks:[],trim:4,kerf:3};
 for(const category of ['panel','masif']){
  const lot=makeCase({boards,variable:true,depth:3,margin:130,seed:9300+boards+(category==='masif'?1:0)});
  const common={category,t:category==='panel'?18:32,material:category+'|mese'};
  data.parts.push(...lot.parts.map((p,j)=>({...grain(p,j),...common,id:category+p.id})));
  data.stocks.push(...lot.stocks.map(s=>({...s,...common,id:category+s.id,l:s.l+8,w:s.w+8,
   priceUnit:category==='panel'?'panel':'m3',price:category==='panel'?s.price:25000})))
 }
 const result=run('two-materials-'+boards,data);
 assert.equal(result.missing,0,result.name);
 rows.push(result)
}
// Nonzero-kerf edge cases for the reference itself. A 1 mm sliver cannot
// be removed with a 2 mm blade. A required 90-degree turn needs permission.
const sample={parts:[{id:'p',l:8,w:7,t:18,material:'oak',grain:'length',rotate:true}],
 stocks:[{id:'s',l:11,w:9,qty:1,t:18,material:'oak'}],kerf:2,trim:1};
assert.equal(oracle.solve(sample,'guillotine').status,'infeasible');
sample.stocks[0].l=12;
assert.equal(oracle.solve(sample,'guillotine').minimumBoards,1);
sample.parts[0].grain='width';
assert.equal(oracle.solve(sample,'guillotine').status,'infeasible');
console.log('WORKSHOP_SUMMARY '+JSON.stringify({cases:rows.length,complete:rows.filter(r=>r.missing===0).length,
 proven:rows.filter(r=>r.countProven).length,partial:rows.filter(r=>r.missing>0).map(r=>r.name)}));


if(process.argv.includes('--quantity-probe')){
 // Direct engine input to distinguish the form limit from solver behavior.
 for(const n of [1500,1501,2001]){
  const common={t:18,material:'panel|repeat',category:'panel'};
  const data={kerf:3,trim:2,
   parts:Array.from({length:n},(_,i)=>({...common,id:'p'+i,l:22,w:22,label:'test',order:0,rotate:false,grain:'length'})),
   stocks:[{...common,id:'s',l:104,w:104,qty:Math.ceil(n/16),price:10,priceUnit:'panel'}]};
  const result=run('direct-quantity-'+n,data);
  assert.equal(result.missing,0);
  assert.equal(result.boards,Math.ceil(n/16))
 }
}
