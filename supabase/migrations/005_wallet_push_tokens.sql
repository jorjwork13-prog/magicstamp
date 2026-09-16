-- Phase 2 scaffolding: Apple Wallet push updates (PassKit Web Service).
--
-- ⚠️ NOT applied to production — this file only. A human should review the
-- whole Phase 2 PR (webServiceURL routes, APNs push, scan-flow hook) before
-- running this migration for real.
--
-- One row per device that asked to be notified about one pass. Apple's
-- PassKit Web Service protocol registers by
-- (deviceLibraryIdentifier, passTypeIdentifier, serialNumber) — a phone can
-- hold several passes, and in principle several phones could watch the same
-- pass, so all three are part of the identity, not just the device.
create table public.wallet_push_tokens (
  id                       uuid primary key default gen_random_uuid(),
  device_library_identifier text not null,
  pass_type_identifier      text not null,
  -- Matches PKPass.serialNumber, i.e. "{businessId}.{memberId}" — see
  -- app/api/wallet/apple/route.ts.
  serial_number              text not null,
  push_token                 text not null,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (device_library_identifier, pass_type_identifier, serial_number)
);

create index wallet_push_tokens_serial_idx
  on public.wallet_push_tokens (pass_type_identifier, serial_number);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────
-- The webServiceURL routes are the only caller, they authenticate each
-- request themselves against the pass's own authenticationToken (see
-- lib/wallet-webservice-auth.ts), and they talk to Postgres with the
-- service-role key — which bypasses RLS entirely. No anon/authenticated
-- policy is defined on purpose: this table should never be reachable from
-- the browser or from a business owner's session.
alter table public.wallet_push_tokens enable row level security;

-- Note for whoever reviews/applies this: `members` already carries a
-- `last_visit` timestamp that's bumped on every stamp update (see
-- app/dashboard/QrScanner.tsx) — the "GET registrations ... ?passesUpdatedSince="
-- endpoint reuses that column instead of adding a new one here.
