alter table public.members
  add column if not exists wallet_message text;

alter table public.members
  add column if not exists wallet_message_at timestamptz;

comment on column public.members.wallet_message is
  'Short message shown on the back of the Apple Wallet pass.';
comment on column public.members.wallet_message_at is
  'When that message was last written. The pass web service treats a member as
   changed at the LATER of last_visit and this, so sending a message does not have
   to fake a visit — last_visit stays a real visit, which the analytics depend on.';
