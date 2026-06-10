-- Allow anon users to read business info (needed for the public /join page)
create policy "businesses: public read"
  on public.businesses
  for select
  to anon
  using (true);

-- Allow anon users to insert members (join via QR code link)
create policy "members: public insert"
  on public.members
  for insert
  to anon
  with check (
    business_id in (select id from public.businesses)
  );
