-- 010_billing.sql — who pays, how much, and whether they have paid.
--
-- v2, revised after reading a real Georgian B2B billing page (Westore). Three
-- things came from there and are marked [westore] below: the invoice number
-- carries its own billing period, VAT columns exist before VAT applies, and the
-- business's tax id is a first-class field rather than something looked up by
-- hand at invoice time.
--
-- Deliberately rail-agnostic. Today every invoice is settled by bank transfer
-- and marked paid by hand in the Supabase Table Editor. When a card rail (TBC
-- or BOG) is added later, nothing here changes shape: `method` becomes 'card'
-- and `provider_ref` holds the bank's saved-card id.
--
-- Safe to run twice, and safe to run on top of v1 of this file.

-- ── legal requisites on the business ────────────────────────────────────────
-- [westore] An invoice a Georgian accountant will accept needs the payer's
-- legal name and tax id (ს/კ). Westore goes further and uses the tax id as the
-- login itself — the account IS the legal entity. Collecting it at signup is
-- free; going back to ask 30 businesses for it later is not.

alter table public.businesses add column if not exists legal_name text;
alter table public.businesses add column if not exists tax_id text;
alter table public.businesses add column if not exists legal_address text;

comment on column public.businesses.tax_id is
  'საიდენტიფიკაციო კოდი (ს/კ). Required before an invoice can be issued to this business.';

-- ── subscriptions ───────────────────────────────────────────────────────────
-- One row per business. `price_gel` is what THIS business actually pays now,
-- not what the price list says: founder partners sit at 69 while the list price
-- is 99, and the list price must be free to change without silently re-pricing
-- anyone who already signed.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,

  plan text not null default 'starter'
    check (plan in ('starter', 'growth', 'network')),

  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled')),

  -- numeric, never float: 99.00 must stay 99.00 after a year of arithmetic.
  price_gel numeric(10,2) not null default 0,

  billing_period text not null default 'monthly'
    check (billing_period in ('monthly', 'yearly')),

  -- Free period ends here. Founder cohort = 2 months.
  trial_ends_at timestamptz,

  -- The date the next invoice is due.
  current_period_end timestamptz,

  -- When the founder rate expires and they roll to the list price. NULL for
  -- everyone outside the founder cohort. Without this column the 6-month offer
  -- quietly becomes a forever offer, which is exactly what it must not be.
  founder_rate_until timestamptz,

  -- 'transfer' today, 'card' later. Not a check constraint — a new rail should
  -- not require a migration.
  method text not null default 'transfer',

  -- The bank's saved-card / recurring identifier once card-on-file is live.
  -- NOT a card number and never will be: the bank holds the card, we hold a
  -- reference to it.
  provider text,
  provider_ref text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.subscriptions.price_gel is
  'Agreed monthly price for this business, in GEL, before VAT. Independent of the public price list.';
comment on column public.subscriptions.founder_rate_until is
  'End of the 6-month founder rate. After this date the business rolls to list price.';

-- ── invoices ────────────────────────────────────────────────────────────────

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,

  number text not null unique,

  subtotal_gel numeric(10,2) not null check (subtotal_gel >= 0),

  period_start date not null,
  period_end date not null,
  check (period_end >= period_start),

  status text not null default 'open'
    check (status in ('open', 'paid', 'void')),

  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,

  method text,        -- 'transfer' | 'card'
  provider_ref text,  -- bank transaction id, when there is one
  notes text,

  created_at timestamptz not null default now()
);

-- v1 of this file called it amount_gel. Rename rather than add, so no invoice
-- written under v1 is orphaned.
do $$
begin
  if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'invoices'
           and column_name = 'amount_gel')
     and not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'invoices'
           and column_name = 'subtotal_gel')
  then
    alter table public.invoices rename column amount_gel to subtotal_gel;
  end if;
end $$;

-- [westore] VAT columns exist from day one and sit at zero until registration.
-- Georgia's VAT registration is mandatory once taxable turnover passes
-- ₾100,000 over any rolling 12 months, at 18%. Westore's own invoices show the
-- switch happening mid-year: identical layout, VAT 0.00 before, "VAT 18%"
-- after. Adding these columns retroactively, with live invoices in the table,
-- is the version of this that hurts.
alter table public.invoices add column if not exists vat_rate numeric(5,2) not null default 0;
alter table public.invoices add column if not exists vat_gel  numeric(10,2) not null default 0;

do $$
begin
  if not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'invoices'
           and column_name = 'total_gel')
  then
    alter table public.invoices
      add column total_gel numeric(10,2)
      generated always as (subtotal_gel + vat_gel) stored;
  end if;
end $$;

comment on column public.invoices.subtotal_gel is 'Service amount before VAT.';
comment on column public.invoices.vat_gel is 'VAT amount. Zero until Taply is VAT-registered (₾100k turnover threshold).';
comment on column public.invoices.total_gel is 'What the business actually transfers. Generated — never write to it.';

create index if not exists invoices_business_issued_idx
  on public.invoices (business_id, issued_at desc);
create index if not exists invoices_status_due_idx
  on public.invoices (status, due_at)
  where status = 'open';

-- ── invoice numbering ───────────────────────────────────────────────────────
-- [westore] TAPLY-202609-000012 — prefix, the BILLING PERIOD as YYYYMM, then a
-- global counter. Westore uses exactly this shape (WST-202608-000767) and the
-- reason is reconciliation: a bank statement line reading "TAPLY-202609-000012"
-- tells you the month without opening anything. A number keyed to the issue
-- date instead would put an invoice for August into the September series.
--
-- A sequence, not max()+1: no table lock, no gap-filling, no collision under
-- concurrency. Gaps in the numbering are fine and normal.

create sequence if not exists public.invoice_seq start 1;

drop function if exists public.next_invoice_number();

create or replace function public.next_invoice_number(p_period_start date)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return 'TAPLY-' || to_char(p_period_start, 'YYYYMM') || '-'
         || lpad(nextval('public.invoice_seq')::text, 6, '0');
end;
$$;

revoke all on function public.next_invoice_number(date) from public, anon, authenticated;
grant execute on function public.next_invoice_number(date) to service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- A business may READ its own billing and nothing else. It may not write:
-- otherwise a customer could mark their own invoice paid. All writes go through
-- the service role — today that means Giorgi in the Table Editor.

alter table public.subscriptions enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "subscriptions: owner read" on public.subscriptions;
create policy "subscriptions: owner read"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = subscriptions.business_id
        and b.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "invoices: owner read" on public.invoices;
create policy "invoices: owner read"
  on public.invoices for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = invoices.business_id
        and b.email = auth.jwt() ->> 'email'
    )
  );

-- ── backfill ────────────────────────────────────────────────────────────────
-- Every existing business gets a trialing subscription, so the dashboard never
-- has to handle "no row".

insert into public.subscriptions (business_id, plan, status, price_gel, trial_ends_at)
select b.id, 'starter', 'trialing', 0, b.created_at + interval '60 days'
from public.businesses b
where not exists (select 1 from public.subscriptions s where s.business_id = b.id);

create or replace function public.create_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.subscriptions (business_id, plan, status, price_gel, trial_ends_at)
  values (new.id, 'starter', 'trialing', 0, now() + interval '60 days')
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists businesses_default_subscription on public.businesses;
create trigger businesses_default_subscription
  after insert on public.businesses
  for each row execute function public.create_default_subscription();
