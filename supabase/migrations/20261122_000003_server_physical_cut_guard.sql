-- Beythaus Cut v1 C — Physical guillotine server boundary (repo-only migration).
-- This migration is tested against isolated PostgreSQL in CI. Do NOT apply to
-- a live Supabase workspace without a staged compatibility/rollback rehearsal.
-- Zero updates to existing inventory / production rows.
--
-- A SECURITY DEFINER RPC may receive client-controlled plan_snapshot JSON.
-- Before a new production record can commit, replay its complete kerf-aware
-- full-edge cutting tree. Only physical residual leaves can become offcuts.
-- The existing RPC handles tenant membership, stock version locks and quantity;
-- this trigger adds geometrical integrity (not global optimality).
create or replace function public.beythaus_physical_tree_v1(
 p_plan jsonb,p_created jsonb)
returns boolean language plpgsql
security invoker set search_path=''
as $$
declare
 v_bins jsonb;v_bin jsonb;v_stock jsonb;v_cut jsonb;v_piece jsonb;v_off jsonb;
 v_leaves jsonb;v_new jsonb;v_leaf jsonb;v_src jsonb;
 v_seen jsonb:='{}'::jsonb;
 v_k numeric;v_trim numeric;v_w numeric;v_h numeric;
 v_at numeric;v_left numeric;v_right numeric;
 v_i integer;v_match integer;v_bin_index integer:=0;v_parts integer:=0;
 v_x numeric;v_y numeric;v_lw numeric;v_lh numeric;
 v_eps constant numeric:=0.00001;
begin
 if jsonb_typeof(p_plan)<>'object' or jsonb_typeof(p_created)<>'array' then
  raise exception 'Physical plan and offcuts required' using errcode='22023';
 end if;
 v_bins:=p_plan->'bins';
 if jsonb_typeof(v_bins)<>'array' or jsonb_array_length(v_bins)=0 or
    jsonb_typeof(p_plan->'kerf')<>'number' or
    jsonb_typeof(p_plan->'trim')<>'number' then
  raise exception 'Missing physical plan parameters' using errcode='22023';
 end if;
 v_k:=(p_plan->>'kerf')::numeric;
 v_trim:=(p_plan->>'trim')::numeric;
 if v_k<0 or v_trim<0 or v_k::text='NaN' or v_trim::text='NaN' then
  raise exception 'Invalid kerf or trim' using errcode='22023';
 end if;

 for v_bin in select value from jsonb_array_elements(v_bins) loop
  v_stock:=v_bin->'stock';
  if jsonb_typeof(v_stock)<>'object' or
     jsonb_typeof(v_stock->'l')<>'number' or
     jsonb_typeof(v_stock->'w')<>'number' or
     jsonb_typeof(v_bin->'cuts')<>'array' or
     jsonb_typeof(v_bin->'pieces')<>'array' then
   raise exception 'Stock, pieces or cut tree missing' using errcode='22023';
  end if;
  v_w:=(v_stock->>'l')::numeric;v_h:=(v_stock->>'w')::numeric;
  if v_w::text='NaN' or v_h::text='NaN' or v_w<=2*v_trim or v_h<=2*v_trim then
   raise exception 'Invalid usable stock rectangle' using errcode='22023';
  end if;
  if jsonb_array_length(v_bin->'pieces')=0 then
   raise exception 'Cannot consume empty cut board' using errcode='22023';
  end if;
  v_leaves:=jsonb_build_array(jsonb_build_object(
   'x',v_trim,'y',v_trim,'w',v_w-2*v_trim,'h',v_h-2*v_trim));

  for v_cut in select value from jsonb_array_elements(v_bin->'cuts') loop
   v_src:=v_cut->'source';
   if jsonb_typeof(v_src)<>'object' or
      jsonb_typeof(v_src->'x')<>'number' or
      jsonb_typeof(v_src->'y')<>'number' or
      jsonb_typeof(v_src->'w')<>'number' or
      jsonb_typeof(v_src->'h')<>'number' or
      jsonb_typeof(v_cut->'at')<>'number' or
      v_cut->>'axis' not in ('vertical','horizontal') then
    raise exception 'Malformed full-edge cut tree' using errcode='22023';
   end if;
   v_match:=-1;
   for v_i in 0..jsonb_array_length(v_leaves)-1 loop
    v_leaf:=v_leaves->v_i;
    if abs((v_leaf->>'x')::numeric-(v_src->>'x')::numeric)<=v_eps and
       abs((v_leaf->>'y')::numeric-(v_src->>'y')::numeric)<=v_eps and
       abs((v_leaf->>'w')::numeric-(v_src->>'w')::numeric)<=v_eps and
       abs((v_leaf->>'h')::numeric-(v_src->>'h')::numeric)<=v_eps then
     v_match:=v_i;exit;
    end if;
   end loop;
   if v_match<0 then
    raise exception 'Cut source is not a live leaf' using errcode='22023';
   end if;
   v_leaf:=v_leaves->v_match;
   v_x:=(v_leaf->>'x')::numeric;v_y:=(v_leaf->>'y')::numeric;
   v_lw:=(v_leaf->>'w')::numeric;v_lh:=(v_leaf->>'h')::numeric;
   v_at:=(v_cut->>'at')::numeric;
   if v_at::text='NaN' then raise exception 'Invalid cut location' using errcode='22023';end if;
   select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb)
    into v_new from jsonb_array_elements(v_leaves) with ordinality
    where ordinality<>(v_match+1);
   if v_cut->>'axis'='vertical' then
    v_left:=v_at-v_x-v_k/2;
    v_right:=v_x+v_lw-v_at-v_k/2;
    if v_left < -v_eps or v_right < -v_eps then
     raise exception 'Cut crosses outside full live edge' using errcode='22023';
    end if;
    if v_left>v_eps then
     v_new:=v_new||jsonb_build_array(jsonb_build_object(
      'x',v_x,'y',v_y,'w',v_left,'h',v_lh));
    end if;
    if v_right>v_eps then
     v_new:=v_new||jsonb_build_array(jsonb_build_object(
      'x',v_at+v_k/2,'y',v_y,'w',v_right,'h',v_lh));
    end if;
   else
    v_left:=v_at-v_y-v_k/2;
    v_right:=v_y+v_lh-v_at-v_k/2;
    if v_left < -v_eps or v_right < -v_eps then
     raise exception 'Cut crosses outside full live edge' using errcode='22023';
    end if;
    if v_left>v_eps then
     v_new:=v_new||jsonb_build_array(jsonb_build_object(
      'x',v_x,'y',v_y,'w',v_lw,'h',v_left));
    end if;
    if v_right>v_eps then
     v_new:=v_new||jsonb_build_array(jsonb_build_object(
      'x',v_x,'y',v_at+v_k/2,'w',v_lw,'h',v_right));
    end if;
   end if;
   v_leaves:=v_new;
  end loop;

  for v_piece in select value from jsonb_array_elements(v_bin->'pieces') loop
   if jsonb_typeof(v_piece->'x')<>'number' or
      jsonb_typeof(v_piece->'y')<>'number' or
      jsonb_typeof(v_piece->'w')<>'number' or
      jsonb_typeof(v_piece->'h')<>'number' or
      coalesce(v_piece->>'id','')='' then
    raise exception 'Malformed cut piece' using errcode='22023';
   end if;
   if v_seen ? (v_piece->>'id') then
    raise exception 'Duplicate part assigned to multiple leaves' using errcode='22023';
   end if;
   v_seen:=v_seen||jsonb_build_object(v_piece->>'id',true);
   v_match:=-1;
   for v_i in 0..jsonb_array_length(v_leaves)-1 loop
    v_leaf:=v_leaves->v_i;
    if abs((v_leaf->>'x')::numeric-(v_piece->>'x')::numeric)<=v_eps and
       abs((v_leaf->>'y')::numeric-(v_piece->>'y')::numeric)<=v_eps and
       abs((v_leaf->>'w')::numeric-(v_piece->>'w')::numeric)<=v_eps and
       abs((v_leaf->>'h')::numeric-(v_piece->>'h')::numeric)<=v_eps then
     v_match:=v_i;exit;
    end if;
   end loop;
   if v_match<0 then
    raise exception 'Part is not an exact cut-tree leaf' using errcode='22023';
   end if;
   select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb)
    into v_leaves from jsonb_array_elements(v_leaves) with ordinality
    where ordinality<>(v_match+1);
   v_parts:=v_parts+1;
  end loop;

  -- Client includes offcut dimensions but not positions. Match each to a
  -- DIFFERENT residual leaf, preserving multiplicity; unclaimed leaves = scrap.
  for v_off in select value from jsonb_array_elements(p_created)
   where (value->>'binIndex')::integer=v_bin_index loop
   if jsonb_typeof(v_off->'l')<>'number' or jsonb_typeof(v_off->'w')<>'number' then
    raise exception 'Malformed remnant dimensions' using errcode='22023';
   end if;
   v_match:=-1;
   for v_i in 0..jsonb_array_length(v_leaves)-1 loop
    v_leaf:=v_leaves->v_i;
    if abs((v_leaf->>'w')::numeric-(v_off->>'l')::numeric)<=v_eps and
       abs((v_leaf->>'h')::numeric-(v_off->>'w')::numeric)<=v_eps then
     v_match:=v_i;exit;
    end if;
   end loop;
   if v_match<0 then
    raise exception 'Created remnant is not a distinct residual leaf' using errcode='22023';
   end if;
   select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb)
    into v_leaves from jsonb_array_elements(v_leaves) with ordinality
    where ordinality<>(v_match+1);
  end loop;
  v_bin_index:=v_bin_index+1;
 end loop;
 if v_parts=0 then raise exception 'No cut pieces supplied' using errcode='22023';end if;
 return true;
end $$;

-- Trigger runs within the production RPC transaction AFTER stock/quantity and
-- membership checks. Invalid cut trees abort ALL stock and remnant writes.
create or replace function public.beythaus_production_physical_guard_v1()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 perform public.beythaus_physical_tree_v1(new.plan_snapshot,new.created_offcuts);
 return new;
end $$;
drop trigger if exists beythaus_production_physical_guard on public.beythaus_production_records;
create trigger beythaus_production_physical_guard
before insert on public.beythaus_production_records for each row
execute function public.beythaus_production_physical_guard_v1();

-- Only the internal RPC/trigger owner calls these, never the Data API.
revoke all on function public.beythaus_physical_tree_v1(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.beythaus_production_physical_guard_v1() from public,anon,authenticated;
