-- ─────────────────────────────────────────────────────────────────────────────
-- 007_visit_history.sql
--
-- Until now nothing was ever written to public.stamps: a scan only bumped
-- members.stamp_count and members.last_visit. That left the product with no
-- visit history at all, which makes visit frequency, trends, cohorts and peak
-- hours impossible to compute — and, because stamp_count resets to 0 the moment
-- a reward is issued, it also made the "return rate" KPI understate reality for
-- exactly the customers who matter most.
--
-- public.stamps already exists (001) with the right shape and an owner-access
-- policy, so the scan flow can simply start inserting into it. Lifetime totals
-- are then a count of those rows — no separate counter to drift out of sync.
--
-- What this migration adds:
--   1. public.rewards — one row per reward actually issued (a reward is an
--      event, not a state, and the reset erases every trace of it today).
--   2. Composite indexes for the two ways analytics reads history.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Reward log ───────────────────────────────────────────────────────────
create table if not exists public.rewards (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id)    on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  -- How many stamps the card held when the reward was earned. Stored rather
  -- than derived: max_stamps is editable, so the threshold in force at the
  -- time is not recoverable later.
  stamps_required integer,
  created_at  timestamptz not null default now()
);

create index if not exists rewards_member_id_idx   on public.rewards(member_id);
create index if not exists rewards_business_created_idx on public.rewards(business_id, created_at desc);

alter table public.rewards enable row level security;

-- Same shape as the stamps policy in 001: reachable only through the owning
-- business (the service role bypasses RLS as usual).
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'rewards'
       and policyname = 'rewards: owner access'
  ) then
    create policy "rewards: owner access"
      on public.rewards
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
  end if;
end $$;

-- ── 2. Indexes for reading visit history ────────────────────────────────────
-- Analytics reads stamps by business over a time window, and per member for one
-- customer's history; 001 indexed those two columns only separately.
create index if not exists stamps_business_created_idx on public.stamps(business_id, created_at desc);
create index if not exists stamps_member_created_idx   on public.stamps(member_id, created_at desc);
