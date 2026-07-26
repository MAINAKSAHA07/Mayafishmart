-- Stock scan image retention:
-- rejected → purge after 24h; applied → purge after 7d (set in app on review)

alter table public.stock_scans
  add column if not exists storage_path text,
  add column if not exists image_expires_at timestamptz,
  add column if not exists image_purged_at timestamptz;

comment on column public.stock_scans.storage_path is
  'Object path inside stock-scans bucket (not a signed URL)';
comment on column public.stock_scans.image_expires_at is
  'When the stored image may be deleted (rejected: +24h, applied: +7d)';
comment on column public.stock_scans.image_purged_at is
  'When the storage object was deleted';

create index if not exists stock_scans_image_expiry_idx
  on public.stock_scans (image_expires_at)
  where image_purged_at is null and image_expires_at is not null;

-- Best-effort backfill for rows that already store a bare storage path
update public.stock_scans
set storage_path = image_path
where storage_path is null
  and image_path like 'scans/%';

-- Backfill expiry for already-reviewed scans (rejected 24h, applied 7d from review)
update public.stock_scans
set image_expires_at = coalesce(reviewed_at, created_at) + interval '24 hours'
where status = 'rejected'
  and image_expires_at is null
  and image_purged_at is null;

update public.stock_scans
set image_expires_at = coalesce(reviewed_at, created_at) + interval '7 days'
where status = 'applied'
  and image_expires_at is null
  and image_purged_at is null;
