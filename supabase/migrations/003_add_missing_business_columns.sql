-- Add brand_color and starting_stamps to businesses table.
-- These columns are referenced throughout the app but were absent from the
-- initial schema migration.  IF NOT EXISTS guards make this safe to run even
-- if the columns were already added directly in the Supabase dashboard.

alter table public.businesses
  add column if not exists brand_color     text,
  add column if not exists starting_stamps integer not null default 0;
