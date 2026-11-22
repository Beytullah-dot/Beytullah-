\set ON_ERROR_STOP on
-- Real PostgreSQL test of v2 full stock, server valuation and rollback.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
set role authenticated;
select public.beythaus_cloud_create_workspace('Beythaus V2 Test') as ws2 \gset
select set_config('test.ws2', :'ws2',false);
select public.beythaus_cloud_save_full_stock(current_setting('test.ws2')::uuid,
 'bbbbbbbb-0000-4000-8000-000000000001'::uuid,
 '{"id":"F-P","l":1000,"w":500,"t":18,"qty":1,"category":"panel",
  "material":"Beyaz Meşe","grain":"length","price":1000,"priceUnit":"panel",
  "location":"Raf A","notes":""}'::jsonb);
select public.beythaus_cloud_save_full_stock(current_setting('test.ws2')::uuid,
 'bbbbbbbb-0000-4000-8000-000000000002'::uuid,
 '{"id":"F-M","l":2000,"w":100,"t":40,"qty":1,"category":"masif",
  "material":"Meşe","grain":"width","price":25000,"priceUnit":"m3",
  "location":"Raf B","notes":""}'::jsonb);
do $$declare snap jsonb;
begin
 snap=public.beythaus_cloud_snapshot_v2(current_setting('test.ws2')::uuid);
 if jsonb_array_length(snap->'fullStocks')<>2 then raise exception 'Full stock snapshot incomplete';end if;
 if jsonb_array_length(snap->'batches')<>0 then raise exception 'Premature production batch';end if;
end$$;
-- The v2 transaction derives the cost from server stock prices, not browser totals.
select public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
 'bbbbbbbb-0000-4000-8000-000000000003'::uuid,
 '{
  "batchId":"B-v2-1","projectName":"Üretim maliyeti",
  "signature":"test","extraCost":50,"extraNote":"Bantlama",
  "usedFull":[{"id":"F-P","qty":1,"expectedVersion":1},
              {"id":"F-M","qty":1,"expectedVersion":1}],
  "consumed":[],
  "created":[{"id":"R-PA","binIndex":0,"l":498.5,"w":500,"location":"Raf A"},
             {"id":"R-MA","binIndex":1,"l":998.5,"w":100,"location":"Raf B"}],
  "planSnapshot":{"kerf":3,"trim":0,"bins":[
    {"sourceType":"full","sourceId":"F-P",
     "stock":{"l":1000,"w":500,"t":18,"material":"Beyaz Meşe"},
     "cuts":[{"axis":"vertical","source":{"x":0,"y":0,"w":1000,"h":500},"at":500}],
     "pieces":[{"id":"P-P","x":0,"y":0,"w":498.5,"h":500,"rotated":false}]},
    {"sourceType":"full","sourceId":"F-M",
     "stock":{"l":2000,"w":100,"t":40,"material":"Meşe"},
     "cuts":[{"axis":"vertical","source":{"x":0,"y":0,"w":2000,"h":100},"at":1000}],
     "pieces":[{"id":"P-M","x":0,"y":0,"w":998.5,"h":100,"rotated":false}]}
  ]}
 }'::jsonb);
do $$declare s jsonb;b jsonb;
begin
 s=public.beythaus_cloud_snapshot_v2(current_setting('test.ws2')::uuid);
 if exists(select 1 from jsonb_array_elements(s->'fullStocks') f
    where (f->>'qty')::integer<>0 or (f->>'version')::integer<>2) then
  raise exception 'Full stock not decremented/versioned';end if;
 b=s->'batches'->0;
 if b is null or (b->>'grossStockCost')::numeric<>1200 or
  (b->>'offcutBookValue')::numeric<>598.35 or
  (b->>'materialCost')::numeric<>601.65 or
  (b->>'extraCost')::numeric<>50 or (b->>'totalCost')::numeric<>651.65 or
  (b->>'extraNote')<>'Bantlama' then
  raise exception 'Production cost or note mismatch';end if;
 if (select (p->>'bookValue')::numeric from jsonb_array_elements(s->'pieces') p
  where p->>'id'='R-PA')<>498.5 then
  raise exception 'Panel offcut value mismatch';end if;
 if (select (p->>'bookValue')::numeric from jsonb_array_elements(s->'pieces') p
  where p->>'id'='R-MA')<>99.85 then
  raise exception 'Solid wood offcut value mismatch';end if;
 if jsonb_array_length(s->'batches')<>1 or
  (s->'batches'->0->>'productionCompleted')<>'true' then
  raise exception 'Production archive missing';end if;
end$$;
-- Repeated operation UUID can never consume physical stock a second time.
select public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
 'bbbbbbbb-0000-4000-8000-000000000003'::uuid,
 '{"batchId":"B-forged-retry"}'::jsonb);
do $$begin
 if jsonb_array_length(public.beythaus_cloud_snapshot_v2(
   current_setting('test.ws2')::uuid)->'batches')<>1 then
  raise exception 'Repeated operation duplicated production';end if;
end$$;
-- Stale second device rolls back the whole request; no third offcut is created.
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
  'bbbbbbbb-0000-4000-8000-000000000004'::uuid,
  '{"batchId":"B-v2-stale","usedFull":[{"id":"F-P","qty":1,"expectedVersion":1}],
   "consumed":[],"created":[{"id":"R-FAIL","binIndex":0,"l":10,"w":10}],
   "planSnapshot":{"bins":[{"sourceType":"full","sourceId":"F-P",
     "stock":{"l":1000,"w":500,"t":18,"material":"Beyaz Meşe"}}]}}'::jsonb);
 exception when sqlstate '40001' then rejected:=true;end;
 if not rejected then raise exception 'Stale full stock not rejected';end if;
 if exists(select 1 from jsonb_array_elements(public.beythaus_cloud_snapshot_v2(
  current_setting('test.ws2')::uuid)->'pieces') p where p->>'id'='R-FAIL') then
  raise exception 'Failed production left a partial remnant';end if;
end$$;
-- Client cannot mint offcuts from a bin without matching physical source usage.
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
  'bbbbbbbb-0000-4000-8000-000000000005'::uuid,
  '{"batchId":"B-v2-phantom","usedFull":[],"consumed":[],"created":[],
   "planSnapshot":{"bins":[{"sourceType":"full","sourceId":"F-P",
     "stock":{"l":1000,"w":500,"t":18,"material":"Beyaz Meşe"}}]}}'::jsonb);
 exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Phantom full stock source accepted';end if;
end$$;
-- A forged remnant smaller than a stock but NOT equal to any real residual
-- cut-tree leaf must roll back ALL production and stock mutations.
select public.beythaus_cloud_save_full_stock(current_setting('test.ws2')::uuid,
 'bbbbbbbb-0000-4000-8000-000000000006'::uuid,
 '{"id":"F-X","l":100,"w":100,"t":18,"qty":1,"category":"panel",
   "material":"Fizik Test","grain":"","price":100,"priceUnit":"panel"}'::jsonb);
do $declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
  'bbbbbbbb-0000-4000-8000-000000000007'::uuid,
  '{"batchId":"B-forged-offcut","usedFull":[{"id":"F-X","qty":1,"expectedVersion":1}],
    "consumed":[],"created":[{"id":"R-FORGED","binIndex":0,"l":48,"w":100}],
    "planSnapshot":{"kerf":2,"trim":0,"bins":[{
      "sourceType":"full","sourceId":"F-X",
      "stock":{"l":100,"w":100,"t":18,"material":"Fizik Test"},
      "cuts":[{"axis":"vertical","source":{"x":0,"y":0,"w":100,"h":100},"at":50}],
      "pieces":[{"id":"P-X","x":0,"y":0,"w":49,"h":100}]
    }]}}'::jsonb);
 exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Forged 48 mm offcut was accepted';end if;
 if exists(select 1 from public.beythaus_stock
  where workspace_id=current_setting('test.ws2')::uuid and id='R-FORGED') then
  raise exception 'Rejected production created an offcut';end if;
 if (select qty from public.beythaus_full_stocks
   where workspace_id=current_setting('test.ws2')::uuid and id='F-X')<>1 then
  raise exception 'Rejected production still consumed full stock';end if;
 if exists(select 1 from public.beythaus_production_records
   where workspace_id=current_setting('test.ws2')::uuid and id='B-forged-offcut') then
  raise exception 'Rejected plan produced a durable batch';end if;
end$;
-- The original RPC stock-and-area checks would accept this attack:
-- two 49x100 offcuts total 9800 <=10000. Physical leaves permit only ONE
-- unused 49x100 leaf once the piece has been cut.
do $declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
  'bbbbbbbb-0000-4000-8000-000000000008'::uuid,
  '{"batchId":"B-duplicate-offcut","usedFull":[{"id":"F-X","qty":1,"expectedVersion":1}],
    "consumed":[],"created":[{"id":"R-DUP-1","binIndex":0,"l":49,"w":100},
       {"id":"R-DUP-2","binIndex":0,"l":49,"w":100}],
    "planSnapshot":{"kerf":2,"trim":0,"bins":[{
      "sourceType":"full","sourceId":"F-X",
      "stock":{"l":100,"w":100,"t":18,"material":"Fizik Test"},
      "cuts":[{"axis":"vertical","source":{"x":0,"y":0,"w":100,"h":100},"at":50}],
      "pieces":[{"id":"P-X","x":0,"y":0,"w":49,"h":100}]
    }]}}'::jsonb);
 exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Residual leaf double-spent';end if;
 if (select qty from public.beythaus_full_stocks
   where workspace_id=current_setting('test.ws2')::uuid and id='F-X')<>1 then
  raise exception 'Duplicate remnant attack consumed stock';end if;
end$;
-- Forging a part rectangle not generated as an exact guillotine leaf.
do $declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_production_v2(current_setting('test.ws2')::uuid,
  'bbbbbbbb-0000-4000-8000-000000000009'::uuid,
  '{"batchId":"B-forged-part","usedFull":[{"id":"F-X","qty":1,"expectedVersion":1}],
    "consumed":[],"created":[],
    "planSnapshot":{"kerf":2,"trim":0,"bins":[{
      "sourceType":"full","sourceId":"F-X",
      "stock":{"l":100,"w":100,"t":18,"material":"Fizik Test"},
      "cuts":[{"axis":"vertical","source":{"x":0,"y":0,"w":100,"h":100},"at":50}],
      "pieces":[{"id":"P-X","x":0,"y":0,"w":100,"h":100}]
    }]}}'::jsonb);
 exception when sqlstate '22023' then rejected:=true;end;
 if not rejected then raise exception 'Phantom whole-board part accepted';end if;
end$;
select 'Physical tree guard: forged and duplicate offcuts / phantom cut pieces rejected, rollback PASS' as security_success;

-- Only valid workspace members may read the new inventory or write its ledger.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_snapshot_v2(current_setting('test.ws2')::uuid);
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Cross-tenant snapshot allowed';end if;
end$$;
do $$declare denied boolean:=false;n integer;
begin
 begin select count(*) into n from public.beythaus_full_stocks;
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct full-stock read allowed';end if;
end$$;
select 'Cloud production v2: full stock versions, valuation, archive, idempotency, rollback, RLS PASS' as success;
