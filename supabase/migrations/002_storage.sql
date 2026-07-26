-- Storage buckets + policies (run in SQL editor after creating buckets in dashboard
-- or create buckets via: insert into storage.buckets ...)

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('stock-scans', 'stock-scans', false)
on conflict (id) do nothing;

create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Staff upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'manager')
    )
  );

create policy "Staff read stock scans"
  on storage.objects for select
  using (
    bucket_id = 'stock-scans'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'manager', 'staff', 'viewer')
    )
  );

create policy "Staff upload stock scans"
  on storage.objects for insert
  with check (
    bucket_id = 'stock-scans'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner', 'manager', 'staff')
    )
  );
