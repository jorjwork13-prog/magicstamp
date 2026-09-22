-- ─────────────────────────────────────────────────────────────────────────────
-- 008_record_scan.sql
--
-- REQUIRES 007_visit_history.sql (public.rewards). The guard below fails loudly
-- if it has not been run, rather than letting this create and then break on the
-- first scan.
--
-- Until now a scan was three independent writes issued from the browser: update
-- members, insert into stamps, insert into rewards. Any one of them could land
-- without the others — a closed tab, a dropped connection, a failed insert — so
-- members.stamp_count and the visit history were guaranteed to drift apart over
-- time. That matters because the number we intend to sell on ("your customers
-- come back X% more often") is read from that history.
--
-- It also moved a decision to the client that belongs on the server: the browser
-- computed the new count and decided whether a reward was earned, then wrote the
-- result. Anyone holding an owner session could simply write whatever they liked.
--
-- record_scan() does all of it inside one transaction, reading max_stamps from
-- the businesses row rather than trusting an argument.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.rewards') is null then
    raise exception 'run 007_visit_history.sql first — public.rewards does not exist';
  end if;
end $$;

create or replace function public.record_scan(
  p_member_id   uuid,
  p_business_id uuid
)
returns table (member_name text, stamp_count integer, rewarded boolean)
language plpgsql
security definer
-- Pinned so the function cannot be redirected at a caller-controlled schema.
set search_path = public, pg_temp
as $$
declare
  v_max      integer;
  v_current  integer;
  v_next     integer;
  v_rewarded boolean;
  v_save     integer;
  v_name     text;
begin
  select b.max_stamps into v_max
    from public.businesses b
   where b.id = p_business_id;

  if v_max is null then
    raise exception 'business not found' using errcode = 'no_data_found';
  end if;

  -- Locked for the duration of the transaction: two tills scanning the same
  -- card at once would otherwise both read the same balance and one increment
  -- would vanish.
  select m.stamp_count, m.name into v_current, v_name
    from public.members m
   where m.id = p_member_id
     and m.business_id = p_business_id
   for update;

  if not found then
    raise exception 'member not found' using errcode = 'no_data_found';
  end if;

  v_next     := v_current + 1;
  v_rewarded := v_next >= v_max;
  v_save     := case when v_rewarded then 0 else v_next end;

  update public.members
     set stamp_count = v_save,
         last_visit  = now()
   where id = p_member_id;

  insert into public.stamps (member_id, business_id)
  values (p_member_id, p_business_id);

  if v_rewarded then
    insert into public.rewards (member_id, business_id, stamps_required)
    values (p_member_id, p_business_id, v_max);
  end if;

  return query select v_name, v_save, v_rewarded;
end;
$$;

-- SECURITY DEFINER bypasses RLS, so this must not be callable by the browser.
-- The API route checks the caller owns the business and then calls it with the
-- service role.
revoke all on function public.record_scan(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_scan(uuid, uuid) to service_role;
