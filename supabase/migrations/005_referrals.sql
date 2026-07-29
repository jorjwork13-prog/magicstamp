-- Referral system.
--
-- Adds per-member share codes, a referrals ledger, per-business reward
-- configuration, and the two RPCs the public /join flow calls with the
-- anonymous key.  IF NOT EXISTS / duplicate_object guards make the whole
-- file safe to re-run.
--
-- Why RPCs instead of straight table access from the join form: the join
-- flow runs as `anon`, and anon has no select/update policy on members (by
-- design — member rows hold names and phone numbers).  Both functions are
-- SECURITY DEFINER with a narrow signature and return only what the join
-- screen needs, so the anon surface stays at "resolve a code" and "record a
-- referral" rather than "read the member table".

-- ─────────────────────────────────────────
-- businesses: per-business referral configuration
-- ─────────────────────────────────────────
alter table public.businesses
  add column if not exists referral_threshold     integer not null default 3,
  add column if not exists referral_reward_stamps integer not null default 1;

-- ─────────────────────────────────────────
-- members: own share code + who referred them
-- ─────────────────────────────────────────
alter table public.members
  add column if not exists referral_code         text,
  add column if not exists referred_by_member_id uuid references public.members(id) on delete set null;

-- ─────────────────────────────────────────
-- Referral code generation
--
-- 4 characters from a 32-symbol alphabet with 0/O/1/I dropped, so a code
-- read off someone else's phone can't be mistyped into a different member.
-- 32^4 = 1,048,576 codes; the unique index plus the retry loop below absorb
-- collisions.  Retries stay rare well past 100k members — revisit the length
-- if a single deployment ever approaches that.
-- ─────────────────────────────────────────
create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code     text := '';
begin
  for i in 1..4 loop
    code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return code;
end;
$$;

revoke all on function public.generate_referral_code() from public;

-- Fills referral_code on insert when the caller didn't supply one.
-- SECURITY DEFINER so the uniqueness probe sees every row: the join flow
-- inserts as `anon`, which cannot select members under RLS and would
-- otherwise think every candidate code was free.
create or replace function public.members_set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if new.referral_code is not null and new.referral_code <> '' then
    new.referral_code := upper(trim(new.referral_code));
    return new;
  end if;

  -- Bounded so a saturated key space fails loudly instead of spinning.
  for i in 1..50 loop
    candidate := public.generate_referral_code();
    if not exists (select 1 from public.members where referral_code = candidate) then
      new.referral_code := candidate;
      return new;
    end if;
  end loop;

  raise exception 'could not generate a unique referral_code after 50 attempts';
end;
$$;

drop trigger if exists members_set_referral_code_trigger on public.members;
create trigger members_set_referral_code_trigger
  before insert on public.members
  for each row execute function public.members_set_referral_code();

-- Backfill rows that predate the column.  The trigger is BEFORE INSERT only,
-- so existing rows need this explicit pass.
do $$
declare
  r         record;
  candidate text;
begin
  for r in select id from public.members where referral_code is null loop
    loop
      candidate := public.generate_referral_code();
      exit when not exists (select 1 from public.members where referral_code = candidate);
    end loop;
    update public.members set referral_code = candidate where id = r.id;
  end loop;
end;
$$;

create unique index if not exists members_referral_code_key
  on public.members(referral_code);

alter table public.members alter column referral_code set not null;

create index if not exists members_referred_by_member_id_idx
  on public.members(referred_by_member_id);

-- ─────────────────────────────────────────
-- Table: referrals
-- ─────────────────────────────────────────
create table if not exists public.referrals (
  id                 uuid primary key default gen_random_uuid(),
  referrer_member_id uuid not null references public.members(id) on delete cascade,
  referred_member_id uuid not null unique references public.members(id) on delete cascade,
  business_id        uuid not null references public.businesses(id) on delete cascade,
  reward_granted     boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint referrals_no_self_referral check (referrer_member_id <> referred_member_id)
);

create index if not exists referrals_referrer_member_id_idx on public.referrals(referrer_member_id);
create index if not exists referrals_business_id_idx         on public.referrals(business_id);

-- ─────────────────────────────────────────
-- Row Level Security — same shape as members / stamps
-- ─────────────────────────────────────────
alter table public.referrals enable row level security;

do $$
begin
  create policy "referrals: owner access"
    on public.referrals
    for all
    using (
      business_id in (
        select id from public.businesses
        where email = auth.jwt() ->> 'email'
      )
    )
    with check (
      business_id in (
        select id from public.businesses
        where email = auth.jwt() ->> 'email'
      )
    );
exception
  when duplicate_object then null;
end;
$$;

-- ─────────────────────────────────────────
-- RPC: resolve a share code to a member id, scoped to one business.
-- Returns only the id — never a name or phone number.
-- ─────────────────────────────────────────
create or replace function public.lookup_referral_code(
  p_business_id uuid,
  p_code        text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.members
   where business_id = p_business_id
     and referral_code = upper(trim(p_code))
   limit 1;
$$;

revoke all on function public.lookup_referral_code(uuid, text) from public;
grant execute on function public.lookup_referral_code(uuid, text) to anon, authenticated;

-- ─────────────────────────────────────────
-- RPC: record a referral and grant the referrer's reward when they reach the
-- business threshold.  One statement-level unit so the count, the stamp
-- bump and the reward_granted flip can't drift apart under concurrency.
-- ─────────────────────────────────────────
create or replace function public.register_referral(
  p_referrer_member_id uuid,
  p_referred_member_id uuid,
  p_business_id        uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold     integer;
  v_reward_stamps integer;
  v_max_stamps    integer;
  v_pending       integer;
  v_stamp_count   integer;
  v_new_count     integer;
  v_rewarded      boolean := false;
begin
  -- The referred member must already carry this referrer on
  -- referred_by_member_id (written once, at signup).  That link is what keeps
  -- this anon-callable function from being used to invent referrals between
  -- arbitrary member ids.
  if not exists (
    select 1 from public.members
     where id = p_referred_member_id
       and business_id = p_business_id
       and referred_by_member_id = p_referrer_member_id
  ) then
    return jsonb_build_object('ok', false);
  end if;

  if not exists (
    select 1 from public.members
     where id = p_referrer_member_id
       and business_id = p_business_id
  ) then
    return jsonb_build_object('ok', false);
  end if;

  -- referred_member_id is unique: a member counts as "referred" exactly once,
  -- so a replayed call is a no-op rather than a second credit.
  insert into public.referrals (referrer_member_id, referred_member_id, business_id)
  values (p_referrer_member_id, p_referred_member_id, p_business_id)
  on conflict (referred_member_id) do nothing;

  select referral_threshold, referral_reward_stamps, max_stamps
    into v_threshold, v_reward_stamps, v_max_stamps
    from public.businesses
   where id = p_business_id;

  select count(*)
    into v_pending
    from public.referrals
   where referrer_member_id = p_referrer_member_id
     and business_id = p_business_id
     and reward_granted = false;

  select stamp_count into v_stamp_count
    from public.members
   where id = p_referrer_member_id
     for update;

  v_new_count := v_stamp_count;

  if v_pending >= coalesce(v_threshold, 3) then
    -- OVERFLOW POLICY — open question, decide later.  The bonus is clamped to
    -- max_stamps, so a referrer whose card is nearly full silently loses the
    -- remainder.  The scan flow does the opposite (wraps to 0 and hands out
    -- the reward).  Options when we settle it: wrap like a scan, bank the
    -- excess as pending stamps, or keep clamping.
    v_new_count := least(
      v_stamp_count + coalesce(v_reward_stamps, 1),
      coalesce(v_max_stamps, 10)
    );

    update public.members
       set stamp_count = v_new_count
     where id = p_referrer_member_id;

    update public.referrals
       set reward_granted = true
     where referrer_member_id = p_referrer_member_id
       and business_id = p_business_id
       and reward_granted = false;

    v_rewarded := true;
  end if;

  return jsonb_build_object(
    'ok',                 true,
    'rewarded',           v_rewarded,
    'referrer_member_id', p_referrer_member_id,
    'stamp_count',        v_new_count
  );
end;
$$;

revoke all on function public.register_referral(uuid, uuid, uuid) from public;
grant execute on function public.register_referral(uuid, uuid, uuid) to anon, authenticated;
