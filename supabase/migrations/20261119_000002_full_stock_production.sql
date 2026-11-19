-- Beythaus Cut / cloud production v2: full-stock + valued remnants + immutable cost
-- Backward-compatible additive migration. No existing stock or production is deleted.
-- All writes require an authenticated workspace member and serialize on workspace row.
create table if not exists public.beythaus_full_stocks (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 id text not null check (char_length(id) between 1 and 90),
 l numeric(12,3) not null check(l>0 and l<=10000000),
 w numeric(12,3) not null check(w>0 and w<=10000000),
 t numeric(12,3) check(t is null or (t>0 and t<=100000)),
 category text not null check(category in ('panel','masif')),
 material text not null check(char_length(material) between 1 and 80),
 grain text not null default '' check(grain in ('','width','length')),
 qty integer not null check(qty between 0 and 100000),
 price numeric(18,4) check(price is null or price>=0),
 price_unit text not null check(price_unit in ('panel','m3')),
 location text not null default '' check(char_length(location)<=80),
 notes text not null default '' check(char_length(notes)<=220),
 version integer not null default 1 check(version>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(workspace_id,id),
 constraint beythaus_full_stock_unit_check check(
  (category='panel' and price_unit='panel') or
  (category='masif' and price_unit='m3'))
);
alter table public.beythaus_stock
 add column if not exists category text not null default 'panel'
  check(category in ('panel','masif')),
 add column if not exists grain text not null default ''
  check(grain in ('','width','length')),
 add column if not exists book_value numeric(18,4)
  check(book_value is null or book_value>=0);
create table if not exists public.beythaus_production_records (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 id text not null check(char_length(id) between 1 and 90),
 operation_id uuid not null,
 actor_id uuid not null references auth.users(id),
 project_name text not null default '' check(char_length(project_name)<=60),
 signature text not null default '' check(char_length(signature)<=180),
 plan_snapshot jsonb not null,
 used_full jsonb not null,
 used_offcuts jsonb not null,
 created_offcuts jsonb not null,
 gross_stock_cost numeric(18,4),
 offcut_book_value numeric(18,4),
 material_cost numeric(18,4),
 extra_cost numeric(18,4) not null default 0 check(extra_cost>=0),
 extra_note text not null default '' check(char_length(extra_note)<=120),
 total_cost numeric(18,4),
 created_at timestamptz not null default now(),
 primary key(workspace_id,id),
 unique(workspace_id,operation_id)
);
create table if not exists public.beythaus_full_stock_movements (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 stock_id text not null,
 actor_id uuid not null references auth.users(id),
 kind text not null check(kind in ('created','corrected','consumed')),
 before_value jsonb,
 after_value jsonb,
 batch_id text not null default '',
 happened_at timestamptz not null default now()
);
create index if not exists beythaus_full_stock_movement_idx
 on public.beythaus_full_stock_movements(workspace_id,happened_at desc);
alter table public.beythaus_full_stocks enable row level security;
alter table public.beythaus_production_records enable row level security;
alter table public.beythaus_full_stock_movements enable row level security;
revoke all on public.beythaus_full_stocks, public.beythaus_production_records,
 public.beythaus_full_stock_movements from public, anon, authenticated;

-- Idempotent, serialized, version-checked creation or editing of physical full stock.
create or replace function public.beythaus_cloud_save_full_stock(
 p_workspace uuid,p_operation uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_id text;v_expected integer;
 v_old public.beythaus_full_stocks%rowtype;
 v_new public.beythaus_full_stocks%rowtype;v_result jsonb;
 v_l numeric;v_w numeric;v_t numeric;v_qty integer;v_price numeric;
 v_category text;v_material text;v_grain text;v_price_unit text;
 v_location text;v_notes text;v_kind text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000';end if;
 if p_operation is null or jsonb_typeof(p_payload)<>'object' then
  raise exception 'Invalid full stock operation' using errcode='22023';end if;
 perform 1 from public.beythaus_workspaces where id=p_workspace for update;
 if not found then raise exception 'Workspace missing' using errcode='22023';end if;
 if not exists(select 1 from public.beythaus_members where workspace_id=p_workspace and user_id=v_uid) then
  raise exception 'Workspace access denied' using errcode='42501';end if;
 select result into v_result from public.beythaus_operations
  where workspace_id=p_workspace and operation_id=p_operation;
 if found then return v_result;end if;
 v_id=p_payload->>'id';v_expected=nullif(p_payload->>'expectedVersion','')::integer;
 v_l=(p_payload->>'l')::numeric;v_w=(p_payload->>'w')::numeric;
 v_t=nullif(p_payload->>'t','')::numeric;v_qty=(p_payload->>'qty')::integer;
 v_price=nullif(p_payload->>'price','')::numeric;
 v_category=p_payload->>'category';v_material=trim(coalesce(p_payload->>'material',''));
 v_grain=coalesce(p_payload->>'grain','');
 v_price_unit=p_payload->>'priceUnit';
 v_location=trim(coalesce(p_payload->>'location',''));
 v_notes=trim(coalesce(p_payload->>'notes',''));
 if v_id is null or char_length(v_id) not between 1 and 90 or
    v_l is null or v_w is null or v_l<=0 or v_w<=0 or
    v_l>10000000 or v_w>10000000 or
    (v_t is not null and (v_t<=0 or v_t>100000)) or
    v_qty is null or v_qty<0 or v_qty>100000 or
    v_category not in ('panel','masif') or
    v_material='' or char_length(v_material)>80 or
    v_grain not in ('','width','length') or
    not ((v_category='panel' and v_price_unit='panel') or
         (v_category='masif' and v_price_unit='m3')) or
    (v_price is not null and (v_price<0 or v_price>1000000000000)) or
    char_length(v_location)>80 or char_length(v_notes)>220 then
  raise exception 'Invalid full stock fields' using errcode='22023';end if;
 select * into v_old from public.beythaus_full_stocks
  where workspace_id=p_workspace and id=v_id for update;
 if found then
  if v_expected is null or v_expected<>v_old.version then
   raise exception 'Full stock changed on another device; refresh' using errcode='40001';end if;
  update public.beythaus_full_stocks set l=v_l,w=v_w,t=v_t,qty=v_qty,category=v_category,
   material=v_material,grain=v_grain,price=v_price,price_unit=v_price_unit,
   location=v_location,notes=v_notes,version=version+1,updated_at=now()
   where workspace_id=p_workspace and id=v_id returning * into v_new;
  v_kind='corrected';
 else
  if v_expected is not null then raise exception 'Full stock no longer exists; refresh' using errcode='40001';end if;
  insert into public.beythaus_full_stocks(workspace_id,id,l,w,t,qty,category,
   material,grain,price,price_unit,location,notes)
   values(p_workspace,v_id,v_l,v_w,v_t,v_qty,v_category,
    v_material,v_grain,v_price,v_price_unit,v_location,v_notes) returning * into v_new;
  v_kind='created';
 end if;
 insert into public.beythaus_full_stock_movements(workspace_id,stock_id,actor_id,
  kind,before_value,after_value)
 values(p_workspace,v_id,v_uid,v_kind,
  case when v_kind='created' then null else to_jsonb(v_old) end,to_jsonb(v_new));
 v_result=jsonb_build_object('ok',true,'kind','full_stock_save','id',v_id,'version',v_new.version);
 insert into public.beythaus_operations(workspace_id,operation_id,actor_id,kind,result)
 values(p_workspace,p_operation,v_uid,'full_stock_save',v_result);
 return v_result;
end $$;

-- One server transaction: consume full stock quantities, consume reused offcuts,
-- create proportionally valued offcuts, and permanently archive production cost.
-- The browser must first independently audit physical guillotine geometry.
create or replace function public.beythaus_cloud_production_v2(
 p_workspace uuid,p_operation uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_batch text;v_project text;v_signature text;
 v_full public.beythaus_full_stocks%rowtype;
 v_rem public.beythaus_stock%rowtype;v_new public.beythaus_stock%rowtype;
 v_item jsonb;v_bin jsonb;v_ctx jsonb;v_ctxs jsonb:='[]'::jsonb;
 v_created jsonb:='[]'::jsonb;v_result jsonb;v_used_full jsonb;v_consumed jsonb;
 v_bins jsonb;v_offcuts jsonb;v_snapshot jsonb;
 v_id text;v_type text;v_index integer;v_qty integer;v_version integer;v_i integer:=0;
 v_l numeric;v_w numeric;v_t numeric;v_cost numeric;v_book numeric;
 v_gross numeric:=0;v_offcut numeric:=0;v_extra numeric;
 v_gross_known boolean:=true;v_offcut_known boolean:=true;
 v_cost_material numeric;v_total numeric;v_areas jsonb:='{}'::jsonb;
 v_unit_cost numeric;v_source_area numeric;v_area numeric;
 v_note text;v_location text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000';end if;
 if p_operation is null or jsonb_typeof(p_payload)<>'object' then
  raise exception 'Invalid production request' using errcode='22023';end if;
 perform 1 from public.beythaus_workspaces where id=p_workspace for update;
 if not found then raise exception 'Workspace missing' using errcode='22023';end if;
 if not exists(select 1 from public.beythaus_members where workspace_id=p_workspace and user_id=v_uid) then
  raise exception 'Workspace access denied' using errcode='42501';end if;
 select result into v_result from public.beythaus_operations
  where workspace_id=p_workspace and operation_id=p_operation;
 if found then return v_result;end if;
 v_batch=p_payload->>'batchId';v_project=left(coalesce(p_payload->>'projectName',''),60);
 v_signature=left(coalesce(p_payload->>'signature',''),180);
 v_used_full=p_payload->'usedFull';v_consumed=p_payload->'consumed';
 v_offcuts=p_payload->'created';v_snapshot=p_payload->'planSnapshot';
 v_bins=v_snapshot->'bins';
 v_extra=coalesce((p_payload->>'extraCost')::numeric,0);
 v_note=coalesce(p_payload->>'extraNote','');
 if v_batch is null or char_length(v_batch) not between 1 and 90 or
    jsonb_typeof(v_used_full)<>'array' or jsonb_typeof(v_consumed)<>'array' or
    jsonb_typeof(v_offcuts)<>'array' or jsonb_typeof(v_bins)<>'array' or
    jsonb_array_length(v_bins) not between 1 and 100 or
    jsonb_array_length(v_used_full)>100 or jsonb_array_length(v_consumed)>100 or
    jsonb_array_length(v_offcuts)>300 or
    octet_length(v_snapshot::text)>500000 or
    v_extra<0 or v_extra>1000000000000 or char_length(v_note)>120 then
  raise exception 'Invalid production structure' using errcode='22023';end if;
 if exists(select 1 from public.beythaus_production_records
  where workspace_id=p_workspace and id=v_batch) then
  raise exception 'Production batch already recorded' using errcode='23505';end if;
 if exists(select 1 from (select value->>'id' id from jsonb_array_elements(v_used_full)
  union all select value->>'id' from jsonb_array_elements(v_consumed)) q
  group by q.id having count(*)>1) then
  raise exception 'Duplicate consumed stock ID' using errcode='22023';end if;
 -- Lock every physical stock before validating the inventory snapshot.
 for v_item in select value from jsonb_array_elements(v_used_full) loop
  v_id=v_item->>'id';v_qty=(v_item->>'qty')::integer;v_version=(v_item->>'expectedVersion')::integer;
  select * into v_full from public.beythaus_full_stocks
   where workspace_id=p_workspace and id=v_id for update;
  if not found or v_qty is null or v_qty<1 or v_version is null or
     v_full.version<>v_version or v_full.qty<v_qty then
   raise exception 'Full stock changed or insufficient; refresh' using errcode='40001';end if;
 end loop;
 for v_item in select value from jsonb_array_elements(v_consumed) loop
  v_id=v_item->>'id';v_version=(v_item->>'expectedVersion')::integer;
  select * into v_rem from public.beythaus_stock
   where workspace_id=p_workspace and id=v_id for update;
  if not found or v_version is null or v_rem.version<>v_version or v_rem.status<>'available' then
   raise exception 'Remnant already consumed or changed; refresh' using errcode='40001';end if;
 end loop;
 -- Every used full board counts once and every reused remnant exactly once.
 if jsonb_array_length(v_bins)<>(
  select coalesce(sum((value->>'qty')::integer),0)
  from jsonb_array_elements(v_used_full))
  +jsonb_array_length(v_consumed) then
  raise exception 'Physical source count mismatch' using errcode='22023';end if;
 for v_bin in select value from jsonb_array_elements(v_bins) loop
  v_type=v_bin->>'sourceType';v_id=v_bin->>'sourceId';
  if v_type='full' then
   if not exists(select 1 from jsonb_array_elements(v_used_full) s
      where s.value->>'id'=v_id) then
    raise exception 'Unlisted full-stock source' using errcode='22023';end if;
   select * into v_full from public.beythaus_full_stocks
    where workspace_id=p_workspace and id=v_id;
   v_l=v_full.l;v_w=v_full.w;v_t=v_full.t;
   v_cost=case when v_full.price is null then null
    when v_full.price_unit='panel' then v_full.price
    when v_t is not null then v_full.price*(v_l*v_w*v_t)/1000000000
    else null end;
   v_ctx=jsonb_build_object('category',v_full.category,'grain',v_full.grain,
    'material',v_full.material,'l',v_l,'w',v_w,'t',v_t,'cost',v_cost);
  elsif v_type='remnant' then
   if not exists(select 1 from jsonb_array_elements(v_consumed) s
      where s.value->>'id'=v_id) then
    raise exception 'Unlisted remnant source' using errcode='22023';end if;
   select * into v_rem from public.beythaus_stock
    where workspace_id=p_workspace and id=v_id;
   v_l=v_rem.l;v_w=v_rem.w;v_t=v_rem.t;v_cost=v_rem.book_value;
   v_ctx=jsonb_build_object('category',v_rem.category,'grain',v_rem.grain,
    'material',v_rem.material,'l',v_l,'w',v_w,'t',v_t,'cost',v_cost);
  else
   raise exception 'Invalid bin source' using errcode='22023';
  end if;
  if (v_bin->'stock'->>'l')::numeric is distinct from v_l or
     (v_bin->'stock'->>'w')::numeric is distinct from v_w or
     (v_bin->'stock'->>'t')::numeric is distinct from v_t or
     (v_bin->'stock'->>'material') is distinct from (v_ctx->>'material') then
    raise exception 'Plan source differs from server stock' using errcode='40001';end if;
  v_ctxs=v_ctxs||jsonb_build_array(v_ctx);
  if v_cost is null then v_gross_known=false;
  else v_gross=v_gross+v_cost;end if;
 end loop;
 for v_item in select value from jsonb_array_elements(v_used_full) loop
  v_id=v_item->>'id';v_qty=(v_item->>'qty')::integer;
  if (select count(*) from jsonb_array_elements(v_bins) b
      where b.value->>'sourceType'='full' and b.value->>'sourceId'=v_id)<>v_qty then
   raise exception 'Full stock bin count mismatch' using errcode='22023';end if;
 end loop;
 for v_item in select value from jsonb_array_elements(v_consumed) loop
  v_id=v_item->>'id';
  if (select count(*) from jsonb_array_elements(v_bins) b
      where b.value->>'sourceType'='remnant' and b.value->>'sourceId'=v_id)<>1 then
   raise exception 'Remnant bin count mismatch' using errcode='22023';end if;
 end loop;
 for v_item in select value from jsonb_array_elements(v_offcuts) loop
  v_id=v_item->>'id';v_index=(v_item->>'binIndex')::integer;
  v_l=(v_item->>'l')::numeric;v_w=(v_item->>'w')::numeric;
  v_location=left(trim(coalesce(v_item->>'location','')),80);
  v_note=left(trim(coalesce(v_item->>'notes','')),220);
  if v_id is null or char_length(v_id) not between 1 and 90 or
     v_index is null or v_index<0 or v_index>=jsonb_array_length(v_ctxs) or
     v_l is null or v_w is null or v_l<=0 or v_w<=0 then
   raise exception 'Invalid offcut record' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(v_created) x
    where x.value->>'id'=v_id) then
   raise exception 'Duplicate offcut ID' using errcode='22023';end if;
  v_ctx=v_ctxs->v_index;v_source_area=(v_ctx->>'l')::numeric*(v_ctx->>'w')::numeric;
  if v_l>(v_ctx->>'l')::numeric or v_w>(v_ctx->>'w')::numeric then
   raise exception 'Offcut larger than source' using errcode='22023';end if;
  v_area=coalesce((v_areas->>v_index::text)::numeric,0)+v_l*v_w;
  if v_area>v_source_area then raise exception 'Offcuts exceed source stock area' using errcode='22023';end if;
  v_areas=jsonb_set(v_areas,array[v_index::text],to_jsonb(v_area),true);
  v_unit_cost=(v_ctx->>'cost')::numeric;
  v_book=case when v_unit_cost is null then null
   else round(v_unit_cost*v_l*v_w/v_source_area,4) end;
  if v_book is null then v_offcut_known=false;
  else v_offcut=v_offcut+v_book;end if;
  v_created=v_created||jsonb_build_array(jsonb_build_object(
   'id',v_id,'l',v_l,'w',v_w,'t',v_ctx->'t','category',v_ctx->>'category',
   'material',v_ctx->>'material','grain',v_ctx->>'grain','bookValue',v_book,
   'location',v_location,'notes',v_note,'binIndex',v_index));
 end loop;
 -- All business preconditions are now checked. Errors below roll the entire RPC back.
 for v_item in select value from jsonb_array_elements(v_used_full) loop
  v_id=v_item->>'id';v_qty=(v_item->>'qty')::integer;
  select * into v_full from public.beythaus_full_stocks
   where workspace_id=p_workspace and id=v_id;
  update public.beythaus_full_stocks set qty=qty-v_qty,version=version+1,updated_at=now()
   where workspace_id=p_workspace and id=v_id;
  insert into public.beythaus_full_stock_movements(workspace_id,stock_id,actor_id,
   kind,before_value,after_value,batch_id)
  select p_workspace,v_id,v_uid,'consumed',to_jsonb(v_full),
   to_jsonb(s),v_batch from public.beythaus_full_stocks s
   where s.workspace_id=p_workspace and s.id=v_id;
 end loop;
 for v_item in select value from jsonb_array_elements(v_consumed) loop
  v_id=v_item->>'id';
  select * into v_rem from public.beythaus_stock
   where workspace_id=p_workspace and id=v_id;
  update public.beythaus_stock set status='used',version=version+1,
    updated_at=now(),used_at=now() where workspace_id=p_workspace and id=v_id;
  insert into public.beythaus_events(workspace_id,piece_id,kind,source,actor_id,
   project_name,batch_id,before_value,after_value)
  values(p_workspace,v_id,'consumed','production',v_uid,v_project,v_batch,
   jsonb_build_object('status','available','bookValue',v_rem.book_value),
   jsonb_build_object('status','used','bookValue',v_rem.book_value));
 end loop;
 for v_item in select value from jsonb_array_elements(v_created) loop
  insert into public.beythaus_stock(workspace_id,id,l,w,t,category,material,grain,
   book_value,location,notes,status,source_key,project_name)
  values(p_workspace,v_item->>'id',(v_item->>'l')::numeric,(v_item->>'w')::numeric,
   (v_item->>'t')::numeric,v_item->>'category',v_item->>'material',
   v_item->>'grain',(v_item->>'bookValue')::numeric,
   v_item->>'location',v_item->>'notes','available',
   v_batch||':'||(v_item->>'id'),v_project) returning * into v_new;
  insert into public.beythaus_events(workspace_id,piece_id,kind,source,actor_id,
   project_name,batch_id,before_value,after_value)
  values(p_workspace,v_new.id,'created','production',v_uid,v_project,v_batch,
   null,jsonb_build_object('status','available','bookValue',v_new.book_value));
 end loop;
 v_cost_material=case when v_gross_known and v_offcut_known then
  greatest(0,round(v_gross-v_offcut,4)) else null end;
 v_total=case when v_cost_material is not null then round(v_cost_material+v_extra,4) else null end;
 insert into public.beythaus_production_records(workspace_id,id,operation_id,actor_id,
  project_name,signature,plan_snapshot,used_full,used_offcuts,created_offcuts,
  gross_stock_cost,offcut_book_value,material_cost,extra_cost,extra_note,total_cost)
 values(p_workspace,v_batch,p_operation,v_uid,v_project,v_signature,v_snapshot,
  v_used_full,v_consumed,v_created,
  case when v_gross_known then round(v_gross,4) else null end,
  case when v_offcut_known then round(v_offcut,4) else null end,
  v_cost_material,v_extra,v_note,v_total);
 insert into public.beythaus_batches(workspace_id,id,project_name,signature,operation_id)
 values(p_workspace,v_batch,v_project,v_signature,p_operation);
 v_result=jsonb_build_object('ok',true,'kind','production_v2','batchId',v_batch,
  'grossStockCost',case when v_gross_known then round(v_gross,4) else null end,
  'offcutBookValue',case when v_offcut_known then round(v_offcut,4) else null end,
  'materialCost',v_cost_material,'extraCost',v_extra,'totalCost',v_total);
 insert into public.beythaus_operations(workspace_id,operation_id,actor_id,kind,result)
 values(p_workspace,p_operation,v_uid,'production_v2',v_result);
 return v_result;
end $$;

-- Returns original snapshot fields for compatibility, plus authoritative full stock
-- and durable cost/archive records. Old clients keep using snapshot v1.
create or replace function public.beythaus_cloud_snapshot_v2(p_workspace uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_base jsonb;v_full jsonb;v_pieces jsonb;v_batches jsonb;v_moves jsonb;
begin
 v_base=public.beythaus_cloud_snapshot(p_workspace); -- membership checked
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'l',s.l,'w',s.w,'t',s.t,'category',s.category,
  'material',s.material,'grain',s.grain,'qty',s.qty,'price',s.price,
  'priceUnit',s.price_unit,'location',s.location,'notes',s.notes,
  'version',s.version) order by s.created_at,s.id),'[]'::jsonb)
  into v_full from public.beythaus_full_stocks s where s.workspace_id=p_workspace;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',s.id,'l',s.l,'w',s.w,'t',s.t,'material',s.material,
  'category',s.category,'grain',s.grain,'bookValue',s.book_value,
  'location',s.location,'notes',s.notes,'status',s.status,'version',s.version,
  'sourceKey',s.source_key,'projectName',s.project_name,
  'createdAt',floor(extract(epoch from s.created_at)*1000)::bigint,
  'updatedAt',floor(extract(epoch from s.updated_at)*1000)::bigint,
  'usedAt',case when s.used_at is null then null
   else floor(extract(epoch from s.used_at)*1000)::bigint end)
  order by s.created_at,s.id),'[]'::jsonb)
  into v_pieces from public.beythaus_stock s where s.workspace_id=p_workspace;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',b.id,'projectName',b.project_name,'signature',b.signature,
  'createdAt',floor(extract(epoch from b.created_at)*1000)::bigint,
  'productionCompleted',true,'planSnapshot',r.plan_snapshot,
  'usedFullStocks',r.used_full,'usedIds',r.used_offcuts,
  'createdOffcuts',r.created_offcuts,
  'createdIds',(select coalesce(jsonb_agg(x.value->>'id'),'[]'::jsonb)
   from jsonb_array_elements(r.created_offcuts) x),
  'grossStockCost',r.gross_stock_cost,
  'offcutBookValue',r.offcut_book_value,'materialCost',r.material_cost,
  'extraCost',r.extra_cost,'extraNote',r.extra_note,'totalCost',r.total_cost)
  order by b.created_at desc),'[]'::jsonb)
  into v_batches from public.beythaus_batches b
  join public.beythaus_production_records r on r.workspace_id=b.workspace_id and r.id=b.id
  where b.workspace_id=p_workspace;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',e.id::text,'stockId',e.stock_id,'kind',e.kind,
  'at',floor(extract(epoch from e.happened_at)*1000)::bigint,
  'batchId',e.batch_id,'before',e.before_value,'after',e.after_value)
  order by e.happened_at desc),'[]'::jsonb)
  into v_moves from (select * from public.beythaus_full_stock_movements
   where workspace_id=p_workspace order by happened_at desc limit 3000) e;
 return v_base||jsonb_build_object('pieces',v_pieces,'fullStocks',v_full,
  'batches',v_batches,'fullMovements',v_moves);
end $$;

revoke all on function public.beythaus_cloud_save_full_stock(uuid,uuid,jsonb) from public,anon;
revoke all on function public.beythaus_cloud_production_v2(uuid,uuid,jsonb) from public,anon;
revoke all on function public.beythaus_cloud_snapshot_v2(uuid) from public,anon;
grant execute on function public.beythaus_cloud_save_full_stock(uuid,uuid,jsonb) to authenticated;
grant execute on function public.beythaus_cloud_production_v2(uuid,uuid,jsonb) to authenticated;
grant execute on function public.beythaus_cloud_snapshot_v2(uuid) to authenticated;
