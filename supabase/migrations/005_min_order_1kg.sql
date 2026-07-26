-- Default all catalog items to 1 kg (or 1 unit) minimum for now.
update public.products
set min_order_qty = 1, updated_at = now()
where min_order_qty is distinct from 1;
