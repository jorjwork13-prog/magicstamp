-- Add stamp_icon to businesses: which glyph the stamp grid uses on the
-- wallet pass (hex / cup / clippers), set per business in Settings.
-- IF NOT EXISTS / duplicate_object guards make this safe to re-run.

alter table public.businesses
  add column if not exists stamp_icon text not null default 'hex';

do $$
begin
  alter table public.businesses
    add constraint businesses_stamp_icon_check
    check (stamp_icon in ('hex', 'cup', 'clippers'));
exception
  when duplicate_object then null;
end $$;
