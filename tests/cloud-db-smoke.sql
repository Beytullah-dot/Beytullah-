\set ON_ERROR_STOP on
-- Test SECURITY DEFINER membership, stock versions, atomic event recording
-- with the real PostgreSQL migration. Stop on ANY unexpected server error.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
set role authenticated;
select public.beythaus_cloud_create_workspace('Beythaus Test') as ws \gset
select set_config('test.ws', :'ws',false);
select public.beythaus_cloud_create_invite(current_setting('test.ws')::uuid) as invite_token \gset
select public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,'import',
 '{"created":[{"id":"R-A","l":100,"w":70,"t":18,"material":"Meşe","location":"Raf A","notes":"","status":"available","sourceKey":"batch:A"}]}'::jsonb);
do $$begin
 if jsonb_array_length(public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid)->'pieces')<>1
 then raise exception 'Initial cloud import not visible';end if;
end$$;
-- Replaying the same operation must not create another physical piece/event.
select public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
 'aaaaaaaa-0000-4000-8000-000000000001'::uuid,'import',
 '{"created":[{"id":"R-A","l":999,"w":999,"material":"Meşe"}]}'::jsonb);
do $$begin
 if jsonb_array_length(public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid)->'pieces')<>1
 then raise exception 'Repeated operation created duplicate physical pieces';end if;
end$$;

-- Separate authenticated team member joins only with a time-limited invite.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.beythaus_cloud_join(:'invite_token') as joined \gset
do $$begin
 if current_setting('test.ws')<>current_setting('test.ws') then raise exception 'Impossible';end if;
 if jsonb_array_length(public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid)->'pieces')<>1
 then raise exception 'Invited member cannot view shared physical stock';end if;
end$$;
-- Worker cannot import arbitrary stock and mint material.
do $$declare denied boolean:=false;
begin
 begin
 perform public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
  'aaaaaaaa-0000-4000-8000-000000000002'::uuid,'import',
  '{"created":[{"id":"FORGED","l":20,"w":20,"material":"Meşe"}]}'::jsonb);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Worker imported stock without owner permission';end if;
end$$;
-- User 2 consumes; a stale second device must not consume the same board.
select public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
 'aaaaaaaa-0000-4000-8000-000000000003'::uuid,'consume',
 '{"id":"R-A","expectedVersion":1,"source":"qr"}'::jsonb);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
  'aaaaaaaa-0000-4000-8000-000000000004'::uuid,'consume',
  '{"id":"R-A","expectedVersion":1}'::jsonb);
 exception when sqlstate '40001' then rejected:=true;end;
 if not rejected then raise exception 'Stale device consumed the same stock';end if;
end$$;

-- Production is atomic: consuming R-A and creating R-B succeeds only after
-- R-A is restored and its CURRENT version is supplied.
select public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
 'aaaaaaaa-0000-4000-8000-000000000005'::uuid,'restore',
 '{"id":"R-A","expectedVersion":2}'::jsonb);
select public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
 'aaaaaaaa-0000-4000-8000-000000000006'::uuid,'production',
 '{"batchId":"B-physical-1","projectName":"Gerçek üretim","signature":"test",
   "consumed":[{"id":"R-A","expectedVersion":3}],
   "created":[{"id":"R-B","l":60,"w":40,"t":18,"material":"Meşe",
     "location":"Raf A","sourceKey":"batch:physical-1"}]}'::jsonb);
do $$declare data jsonb;
begin
 data=public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid);
 if jsonb_array_length(data->'pieces')<>2 then
  raise exception 'New physical offcut missing';end if;
 if not exists(select 1 from jsonb_array_elements(data->'pieces') p
   where p->>'id'='R-A' and p->>'status'='used') then
  raise exception 'Consumed board stayed available';end if;
 if not exists(select 1 from jsonb_array_elements(data->'pieces') p
   where p->>'id'='R-B' and p->>'status'='available') then
  raise exception 'New board not available';end if;
 if jsonb_array_length(data->'movements')<>5 then
  raise exception 'Missing atomic stock movement events';end if;
end$$;
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_mutate(current_setting('test.ws')::uuid,
  'aaaaaaaa-0000-4000-8000-000000000007'::uuid,'production',
  '{"batchId":"B-physical-2","consumed":[{"id":"R-A","expectedVersion":3}],
    "created":[{"id":"R-C","l":5,"w":5,"material":"Meşe"}]}'::jsonb);
 exception when sqlstate '40001' then rejected:=true;end;
 if not rejected then raise exception 'Production with stale stock version succeeded';end if;
 if jsonb_array_length(public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid)->'pieces')<>2
 then raise exception 'Failed production partially minted stock';end if;
end$$;

-- Unrelated authenticated person cannot read this workspace.
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$declare rejected boolean:=false;
begin
 begin
 perform public.beythaus_cloud_snapshot(current_setting('test.ws')::uuid);
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Unauthorized cross-tenant snapshot succeeded';end if;
end$$;
-- Direct table read must fail even as authenticated.
do $$declare rejected boolean:=false; n integer;
begin
 begin select count(*) into n from public.beythaus_stock;
 exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Direct stock table read not denied';end if;
end$$;
select 'Beythaus cloud PostgreSQL: membership, RLS, atomic stock transitions, idempotency, and stale versions passed' as success;
