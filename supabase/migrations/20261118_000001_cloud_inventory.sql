-- Beythaus Cut Cloud Inventory — Supabase PostgreSQL migration (v1).
-- Execute once in the Supabase SQL editor with the project owner account.
-- NEVER place the service_role / secret key in GitHub Pages or the browser.
-- All writes below are server-side, membership-checked and serialized by
-- locking the workspace row. Direct table DML is intentionally denied.

create table if not exists public.beythaus_workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 1 and 80),
 owner_id uuid not null references auth.users(id) on delete cascade,
 default_location text not null default '' check(char_length(default_location)<=80),
 created_at timestamptz not null default now()
);
create table if not exists public.beythaus_members (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','worker')),
 joined_at timestamptz not null default now(),
 primary key(workspace_id,user_id)
);
create table if not exists public.beythaus_invites (
 token text primary key check(char_length(token)=64),
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 expires_at timestamptz not null,
 remaining_uses integer not null default 5 check(remaining_uses between 0 and 50)
);
create table if not exists public.beythaus_stock (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 id text not null check(char_length(id) between 1 and 90),
 l numeric(12,3) not null check(l>0 and l<=10000000),
 w numeric(12,3) not null check(w>0 and w<=10000000),
 t numeric(12,3) check(t is null or (t>0 and t<=100000)),
 material text not null check(char_length(material) between 1 and 80),
 location text not null default '' check(char_length(location)<=80),
 notes text not null default '' check(char_length(notes)<=220),
 status text not null default 'available' check(status in ('available','used')),
 version integer not null default 1 check(version>=1),
 source_key text check(source_key is null or char_length(source_key)<=180),
 project_name text not null default '' check(char_length(project_name)<=60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 used_at timestamptz,
 primary key(workspace_id,id)
);
create unique index if not exists beythaus_stock_source_idx
 on public.beythaus_stock(workspace_id,source_key) where source_key is not null;
create table if not exists public.beythaus_batches (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 id text not null check(char_length(id) between 1 and 90),
 project_name text not null default '',
 signature text not null default '',
 operation_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(workspace_id,id),
 unique(workspace_id,operation_id)
);
create table if not exists public.beythaus_events (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 piece_id text not null,
 kind text not null check(kind in ('created','consumed','restored','moved','corrected','deleted','imported')),
 source text not null check(source in ('manual','qr','production','backup')),
 actor_id uuid not null references auth.users(id),
 project_name text not null default '',
 batch_id text not null default '',
 before_value jsonb,
 after_value jsonb,
 happened_at timestamptz not null default now()
);
create index if not exists beythaus_events_recent_idx on public.beythaus_events(workspace_id,happened_at desc);
create table if not exists public.beythaus_operations (
 workspace_id uuid not null references public.beythaus_workspaces(id) on delete cascade,
 operation_id uuid not null,
 actor_id uuid not null references auth.users(id),
 kind text not null,
 completed_at timestamptz not null default now(),
 result jsonb not null,
 primary key(workspace_id,operation_id)
);

alter table public.beythaus_workspaces enable row level security;
alter table public.beythaus_members enable row level security;
alter table public.beythaus_invites enable row level security;
alter table public.beythaus_stock enable row level security;
alter table public.beythaus_batches enable row level security;
alter table public.beythaus_events enable row level security;
alter table public.beythaus_operations enable row level security;
-- With no permissive policies and no table grants the REST Data API cannot
-- bypass the validation, version checks or atomic writes in RPC functions.
revoke all on public.beythaus_workspaces,public.beythaus_members,
 public.beythaus_invites,public.beythaus_stock,public.beythaus_batches,
 public.beythaus_events,public.beythaus_operations from public,anon,authenticated;

create or replace function public.beythaus_cloud_create_workspace(p_name text)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 80 then
  raise exception 'Workspace name required' using errcode='22023'; end if;
 insert into public.beythaus_workspaces(name,owner_id)
 values(trim(p_name),v_uid) returning id into v_id;
 insert into public.beythaus_members(workspace_id,user_id,role) values(v_id,v_uid,'owner');
 return v_id;
end $$;

create or replace function public.beythaus_cloud_workspaces()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role)
  order by w.created_at desc)
 from public.beythaus_members m join public.beythaus_workspaces w on w.id=m.workspace_id
 where m.user_id=auth.uid()),'[]'::jsonb);
end $$;

create or replace function public.beythaus_cloud_create_invite(p_workspace uuid)
returns text
language plpgsql security definer set search_path=''
as $$
declare v_token text;
begin
 if not exists(select 1 from public.beythaus_members
  where workspace_id=p_workspace and user_id=auth.uid() and role='owner') then
  raise exception 'Only workspace owners may invite members' using errcode='42501';end if;
 v_token=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.beythaus_invites(token,workspace_id,expires_at,remaining_uses)
 values(v_token,p_workspace,now()+interval '48 hours',5);
 return v_token;
end $$;

create or replace function public.beythaus_cloud_join(p_token text)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_workspace uuid; v_uid uuid := auth.uid();
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000';end if;
 select workspace_id into v_workspace from public.beythaus_invites
 where token=p_token and remaining_uses>0 and expires_at>now() for update;
 if v_workspace is null then raise exception 'Invite invalid or expired' using errcode='22023';end if;
 insert into public.beythaus_members(workspace_id,user_id,role)
 values(v_workspace,v_uid,'worker') on conflict(workspace_id,user_id) do nothing;
 update public.beythaus_invites set remaining_uses=remaining_uses-1 where token=p_token;
 return v_workspace;
end $$;

create or replace function public.beythaus_cloud_snapshot(p_workspace uuid)
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_out jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.beythaus_members
  where workspace_id=p_workspace and user_id=auth.uid()) then
  raise exception 'No access to this workspace' using errcode='42501';end if;
 select jsonb_build_object(
  'workspace',jsonb_build_object('id',w.id,'name',w.name,'defaultLocation',w.default_location),
  'pieces',coalesce((select jsonb_agg(jsonb_build_object(
   'id',s.id,'l',s.l,'w',s.w,'t',s.t,'material',s.material,
   'location',s.location,'notes',s.notes,'status',s.status,'version',s.version,
   'sourceKey',s.source_key,'projectName',s.project_name,
   'createdAt',floor(extract(epoch from s.created_at)*1000)::bigint,
   'updatedAt',floor(extract(epoch from s.updated_at)*1000)::bigint,
   'usedAt',case when s.used_at is null then null else
       floor(extract(epoch from s.used_at)*1000)::bigint end)
   order by s.created_at,s.id) from public.beythaus_stock s
   where s.workspace_id=p_workspace),'[]'::jsonb),
  'batches',coalesce((select jsonb_agg(jsonb_build_object(
   'id',b.id,'projectName',b.project_name,'signature',b.signature,
   'createdAt',floor(extract(epoch from b.created_at)*1000)::bigint)
   order by b.created_at desc) from public.beythaus_batches b
   where b.workspace_id=p_workspace),'[]'::jsonb),
  'movements',coalesce((select jsonb_agg(jsonb_build_object(
   'id',e.id::text,'type',e.kind,'source',e.source,'pieceId',e.piece_id,
   'actorId',e.actor_id::text,'at',floor(extract(epoch from e.happened_at)*1000)::bigint,
   'projectName',e.project_name,'batchId',e.batch_id,
   'before',e.before_value,'after',e.after_value) order by e.happened_at desc)
   from (select * from public.beythaus_events where workspace_id=p_workspace
    order by happened_at desc limit 3000) e),'[]'::jsonb)
 ) into v_out
 from public.beythaus_workspaces w where w.id=p_workspace;
 return v_out;
end $$;

-- Server-side validation, serialization and event creation; one RPC = one
-- database transaction. operation_id retries are idempotent.
create or replace function public.beythaus_cloud_mutate(
 p_workspace uuid,p_operation uuid,p_kind text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_uid uuid := auth.uid(); v_role text; v_old public.beythaus_stock%rowtype;
 v_new public.beythaus_stock%rowtype; v_item jsonb; v_delta jsonb;
 v_id text; v_status text; v_batch text; v_source text;
 v_count integer; v_expected integer; v_result jsonb;
 v_old_json jsonb; v_new_json jsonb; v_kind text;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_operation is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then
  raise exception 'Invalid operation' using errcode='22023';end if;
 -- Serialize EVERY writer in this workspace, even across separate devices.
 perform 1 from public.beythaus_workspaces where id=p_workspace for update;
 if not found then raise exception 'Workspace not found' using errcode='22023';end if;
 select role into v_role from public.beythaus_members
  where workspace_id=p_workspace and user_id=v_uid;
 if v_role is null then raise exception 'Workspace access denied' using errcode='42501';end if;
 select result into v_result from public.beythaus_operations
  where workspace_id=p_workspace and operation_id=p_operation;
 if found then return v_result;end if;
 v_source=case when p_payload->>'source'='qr' then 'qr' else 'manual' end;

 if p_kind in ('update','consume','restore','delete') then
  v_id=p_payload->>'id';
  v_expected=(p_payload->>'expectedVersion')::integer;
  if v_id is null or v_expected is null then raise exception 'Item id/version missing' using errcode='22023';end if;
  select * into v_old from public.beythaus_stock
   where workspace_id=p_workspace and id=v_id for update;
  if not found then raise exception 'Item no longer exists' using errcode='P0002';end if;
  if v_old.version<>v_expected then raise exception 'Stock changed on another device; refresh' using errcode='40001';end if;
  v_old_json=jsonb_build_object('l',v_old.l,'w',v_old.w,'t',v_old.t,'material',v_old.material,
   'location',v_old.location,'notes',v_old.notes,'status',v_old.status,'projectName',v_old.project_name);
  if p_kind='delete' then
   delete from public.beythaus_stock where workspace_id=p_workspace and id=v_id;
   v_kind='deleted';v_new_json=null;
  elsif p_kind='consume' or p_kind='restore' then
   v_status=case when p_kind='consume' then 'used' else 'available' end;
   if v_old.status=v_status then raise exception 'Stock already in that state' using errcode='22023';end if;
   update public.beythaus_stock set status=v_status,version=version+1,updated_at=now(),
    used_at=case when v_status='used' then now() else null end
    where workspace_id=p_workspace and id=v_id returning * into v_new;
   v_kind=case when v_status='used' then 'consumed' else 'restored' end;
   v_new_json=jsonb_build_object('l',v_new.l,'w',v_new.w,'t',v_new.t,'material',v_new.material,
   'location',v_new.location,'notes',v_new.notes,'status',v_new.status,'projectName',v_new.project_name);
  else
   v_delta=p_payload->'changes';
   if jsonb_typeof(v_delta)<>'object' then raise exception 'Changes required' using errcode='22023';end if;
   update public.beythaus_stock set
    l=case when v_delta ? 'l' then (v_delta->>'l')::numeric else l end,
    w=case when v_delta ? 'w' then (v_delta->>'w')::numeric else w end,
    t=case when v_delta ? 't' then (v_delta->>'t')::numeric else t end,
    material=case when v_delta ? 'material' then trim(v_delta->>'material') else material end,
    location=case when v_delta ? 'location' then trim(v_delta->>'location') else location end,
    notes=case when v_delta ? 'notes' then trim(v_delta->>'notes') else notes end,
    version=version+1,updated_at=now()
   where workspace_id=p_workspace and id=v_id returning * into v_new;
   v_new_json=jsonb_build_object('l',v_new.l,'w',v_new.w,'t',v_new.t,'material',v_new.material,
    'location',v_new.location,'notes',v_new.notes,'status',v_new.status,'projectName',v_new.project_name);
   v_kind='corrected';
   if v_old.l=v_new.l and v_old.w=v_new.w and v_old.t is not distinct from v_new.t and
     v_old.material=v_new.material and v_old.notes=v_new.notes and v_old.location<>v_new.location then
     v_kind='moved';end if;
  end if;
  insert into public.beythaus_events(workspace_id,piece_id,kind,source,actor_id,
    project_name,before_value,after_value)
  values(p_workspace,v_id,v_kind,v_source,v_uid,v_old.project_name,v_old_json,v_new_json);

 elsif p_kind='settings' then
  if char_length(coalesce(p_payload->>'defaultLocation',''))>80 then
   raise exception 'Shelf name too long' using errcode='22023';end if;
  update public.beythaus_workspaces set
   default_location=trim(coalesce(p_payload->>'defaultLocation','')) where id=p_workspace;

 elsif p_kind='production' or p_kind='import' then
  if p_kind='import' and v_role<>'owner' then raise exception 'Only owner may import stock' using errcode='42501';end if;
  if jsonb_typeof(p_payload->'created')<>'array' then raise exception 'New stock list required' using errcode='22023';end if;
  v_count=jsonb_array_length(p_payload->'created');
  if v_count>100 then raise exception 'Maximum 100 items per operation' using errcode='22023';end if;
  v_batch=left(coalesce(p_payload->>'batchId',''),90);
  if p_kind='production' then
   if v_batch='' then raise exception 'Production batch ID required' using errcode='22023';end if;
   if jsonb_typeof(p_payload->'consumed')<>'array' then raise exception 'Consumption list required' using errcode='22023';end if;
   if jsonb_array_length(p_payload->'consumed')>100 then raise exception 'Too many consumed items' using errcode='22023';end if;
   insert into public.beythaus_batches(workspace_id,id,project_name,signature,operation_id)
    values(p_workspace,v_batch,left(coalesce(p_payload->>'projectName',''),60),
     left(coalesce(p_payload->>'signature',''),180),p_operation);
   for v_item in select value from jsonb_array_elements(p_payload->'consumed') loop
    v_id=v_item->>'id';v_expected=(v_item->>'expectedVersion')::integer;
    select * into v_old from public.beythaus_stock
     where workspace_id=p_workspace and id=v_id for update;
    if not found or v_expected is null or v_old.status<>'available' or v_old.version<>v_expected then
     raise exception 'Physical stock already consumed or changed; refresh' using errcode='40001';end if;
    update public.beythaus_stock set status='used',version=version+1,
      updated_at=now(),used_at=now() where workspace_id=p_workspace and id=v_id
      returning * into v_new;
    insert into public.beythaus_events(workspace_id,piece_id,kind,source,actor_id,project_name,batch_id,before_value,after_value)
    values(p_workspace,v_id,'consumed','production',v_uid,left(coalesce(p_payload->>'projectName',''),60),v_batch,
     jsonb_build_object('status','available','location',v_old.location,'l',v_old.l,'w',v_old.w),
     jsonb_build_object('status','used','location',v_new.location,'l',v_new.l,'w',v_new.w));
   end loop;
  end if;
  for v_item in select value from jsonb_array_elements(p_payload->'created') loop
   v_id=v_item->>'id';
   if v_id is null or char_length(v_id) not between 1 and 90 then
     raise exception 'Invalid new stock identity' using errcode='22023';end if;
   if p_kind='import' and exists(select 1 from public.beythaus_stock
      where workspace_id=p_workspace and id=v_id) then continue;end if;
   v_status=case when p_kind='import' and v_item->>'status'='used' then 'used' else 'available' end;
   insert into public.beythaus_stock(workspace_id,id,l,w,t,material,location,notes,status,
    source_key,project_name,used_at)
   values(p_workspace,v_id,(v_item->>'l')::numeric,(v_item->>'w')::numeric,
    (v_item->>'t')::numeric,left(trim(coalesce(v_item->>'material','')),80),
    left(coalesce(v_item->>'location',''),80),left(coalesce(v_item->>'notes',''),220),
    v_status,nullif(left(coalesce(v_item->>'sourceKey',''),180),''),
    left(coalesce(v_item->>'projectName',p_payload->>'projectName',''),60),
    case when v_status='used' then now() else null end)
   returning * into v_new;
   insert into public.beythaus_events(workspace_id,piece_id,kind,source,actor_id,project_name,batch_id,before_value,after_value)
   values(p_workspace,v_id,case when p_kind='production' then 'created' else 'imported' end,
    case when p_kind='production' then 'production' else 'backup' end,v_uid,
    v_new.project_name,v_batch,null,jsonb_build_object('l',v_new.l,'w',v_new.w,
      't',v_new.t,'material',v_new.material,'location',v_new.location,
      'notes',v_new.notes,'status',v_new.status,'projectName',v_new.project_name));
  end loop;
 else raise exception 'Unsupported mutation action' using errcode='22023';
 end if;
 v_result=jsonb_build_object('ok',true,'operationId',p_operation,'kind',p_kind);
 insert into public.beythaus_operations(workspace_id,operation_id,actor_id,kind,result)
  values(p_workspace,p_operation,v_uid,p_kind,v_result);
 return v_result;
end $$;

-- PUBLIC execution on SECURITY DEFINER functions is dangerous.
revoke all on function public.beythaus_cloud_create_workspace(text) from public,anon;
revoke all on function public.beythaus_cloud_workspaces() from public,anon;
revoke all on function public.beythaus_cloud_create_invite(uuid) from public,anon;
revoke all on function public.beythaus_cloud_join(text) from public,anon;
revoke all on function public.beythaus_cloud_snapshot(uuid) from public,anon;
revoke all on function public.beythaus_cloud_mutate(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.beythaus_cloud_create_workspace(text) to authenticated;
grant execute on function public.beythaus_cloud_workspaces() to authenticated;
grant execute on function public.beythaus_cloud_create_invite(uuid) to authenticated;
grant execute on function public.beythaus_cloud_join(text) to authenticated;
grant execute on function public.beythaus_cloud_snapshot(uuid) to authenticated;
grant execute on function public.beythaus_cloud_mutate(uuid,uuid,text,jsonb) to authenticated;
