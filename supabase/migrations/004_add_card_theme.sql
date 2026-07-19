-- Add card_theme to businesses: which of the three wallet-pass themes
-- (honey / ink / cream) the business uses for its loyalty card.
-- IF NOT EXISTS / duplicate_object guards make this safe to re-run.

alter table public.businesses
  add column if not exists card_theme text not null default 'honey';

do $$
begin
  alter table public.businesses
    add constraint businesses_card_theme_check
    check (card_theme in ('honey', 'ink', 'cream'));
exception
  when duplicate_object then null;
end $$;
