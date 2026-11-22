/* Real cutting-engine -> browser-compatible cloud production JSON -> isolated
 * PostgreSQL RPC+trigger compatibility. SYNTHETIC ONLY, never Supabase network.
 */
'use strict';
const assert=require('node:assert/strict');
const {createEngine}=require('./engine-harness.cjs');
const state={mode:'guillotine',priceMode:'panel',objective:'area',
 offcutMinEdgeMm:0,offcutMinAreaCm2:0};
const engine=createEngine(state,Number,
 (material,t)=>String(material).toLocaleLowerCase('tr-TR')+'|'+String(t),Number);
const stock={id:'F-REAL',category:'panel',material:'panel|physical-test',
 l:100,w:100,t:18,qty:1,grain:'',rotate:false,price:100,priceUnit:'panel'};
const part={id:'P-REAL',label:'Physical fixture',l:49,w:100,t:18,
 category:'panel',material:stock.material,grain:'length',rotate:false};
const data={parts:[part],stocks:[stock],kerf:2,trim:0,m3:null};
const plan=engine.optimize(data,true,false,'area');
assert.equal(plan.unplaced.length,0);
assert.equal(plan.placedCount,1);
assert.equal(plan.bins.length,1);
assert.equal(engine.auditCutPlan(plan,data).ok,true,'production cut audit');
const bin=plan.bins[0],offcuts=engine.collectOffcuts(bin).pieces;
assert(bin.cuts.length>=1,'real cutting engine generated full-edge cuts');
assert(offcuts.length>=1,'real cutting engine produced physical remnant');
const usedFull=[{id:'F-REAL',qty:1,expectedVersion:1}];
const created=offcuts.map((r,i)=>({id:'R-REAL-'+i,binIndex:0,l:r.w,w:r.h,
 location:'SYNTHETIC',notes:''}));
const payload={batchId:'B-real-engine-compat',projectName:'Synthetic worker-to-RPC',
 signature:'independently-audited',usedFull,consumed:[],created,extraCost:0,extraNote:'',
 planSnapshot:{kerf:data.kerf,trim:data.trim,bins:[{
  sourceType:'full',sourceId:'F-REAL',
  stock:{id:'F-REAL',l:bin.stock.l,w:bin.stock.w,t:bin.stock.t,
   material:'Physical Test',category:'panel',grain:'',isRemnant:false},
  cuts:bin.cuts.map(c=>({axis:c.axis,source:c.source,at:c.at,
   number:c.number,label:c.label})),
  pieces:bin.placed.map(p=>({id:p.id,label:p.label,x:p.x,y:p.y,
   w:p.w,h:p.h,rotated:!!p.rotated}))
 }]}};
const quoted=JSON.stringify(payload).replaceAll("'", "''");
const stockPayload=JSON.stringify({
 id:'F-REAL',l:100,w:100,t:18,qty:1,category:'panel',
 material:'Physical Test',grain:'',price:100,priceUnit:'panel'
}).replaceAll("'", "''");
const sql=String.raw`\set ON_ERROR_STOP on
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
set role authenticated;
select public.beythaus_cloud_create_workspace('Synthetic real engine compatibility') as ws_compat \gset
select public.beythaus_cloud_save_full_stock(:'ws_compat'::uuid,
 'cccccccc-0000-4000-8000-000000000001'::uuid,
 '${stockPayload}'::jsonb);
select public.beythaus_cloud_production_v2(:'ws_compat'::uuid,
 'cccccccc-0000-4000-8000-000000000002'::uuid,
 '${quoted}'::jsonb);
select set_config('test.ws_compat', :'ws_compat',false);
do $compat$
declare s jsonb;
begin
 s=public.beythaus_cloud_snapshot_v2(current_setting('test.ws_compat')::uuid);
 if jsonb_array_length(s->'batches')<>1 then
  raise exception 'Engine-produced plan did not commit precisely once';end if;
 if (select (x->>'qty')::int from jsonb_array_elements(s->'fullStocks') x
  where x->>'id'='F-REAL')<>0 then
  raise exception 'Successful engine plan did not consume exactly one board';end if;
 if jsonb_array_length(s->'pieces')<1 then
  raise exception 'Engine physical remnant was not recorded';end if;
end $compat$;
select 'Physical CI: real shipped engine full-edge cuts accepted by server guard and atomically stored' as success;
`;
process.stdout.write(sql);
process.stderr.write('REAL-ENGINE-PAYLOAD '+JSON.stringify({
 parts:plan.placedCount,cutCount:bin.cuts.length,offcutCount:offcuts.length,
 independentProductionAudit:true,bins:plan.bins.length})+'\n');
