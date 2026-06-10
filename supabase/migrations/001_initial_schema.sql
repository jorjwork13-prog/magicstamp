-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- Table: businesses
-- ─────────────────────────────────────────
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  logo_url    text,
  max_stamps  integer not null default 10,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- Table: members
-- ─────────────────────────────────────────
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null,
  phone        text not null,
  stamp_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  last_visit   timestamptz
);

-- ─────────────────────────────────────────
-- Table: stamps
-- ─────────────────────────────────────────
create table public.stamps (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.members(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
create index members_business_id_idx on public.members(business_id);
create index stamps_member_id_idx    on public.stamps(member_id);
create index stamps_business_id_idx  on public.stamps(business_id);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
alter table public.businesses enable row level security;
alter table public.members     enable row level security;
alter table public.stamps      enable row level security;

-- Businesses: a business row is accessible only to the auth user whose email
-- matches, or to the service role (used by server-side code / admin).
create policy "businesses: owner access"
  on public.businesses
  for all
  using (email = auth.jwt() ->> 'email')
  with check (email = auth.jwt() ->> 'email');

-- Members: accessible only through the owning business.
create policy "members: owner access"
  on public.members
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

-- Stamps: accessible only through the owning business.
create policy "stamps: owner access"
  on public.stamps
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
