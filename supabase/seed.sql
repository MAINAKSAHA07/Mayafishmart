-- Seed categories + products + inventory for Maya Fish Mart
-- Run after 001_init.sql

insert into public.categories (name, slug, description, sort_order) values
  ('Freshwater', 'freshwater', 'River and pond favourites', 1),
  ('Seawater', 'seawater', 'Coastal catch of the day', 2),
  ('Prawns & Shellfish', 'shellfish', 'Prawns, crabs, and more', 3)
on conflict (slug) do nothing;

with cats as (
  select id, slug from public.categories
)
insert into public.products (
  category_id, name, slug, description, cut_notes, unit, price_paise, gst_rate, is_active, min_order_qty
)
select c.id, v.name, v.slug, v.description, v.cut_notes, v.unit::public.product_unit, v.price_paise, 5, true, v.min_qty
from (
  values
    ('freshwater', 'Rohu', 'rohu', 'Firm freshwater favourite — ideal for curry and fry.', 'Cleaned, steak-cut on request', 'kg', 28000, 0.5),
    ('freshwater', 'Katla', 'katla', 'Rich, oily freshwater fish — Bengali classic.', 'Whole or pieces', 'kg', 32000, 0.5),
    ('freshwater', 'Hilsa (Ilish)', 'hilsa', 'Seasonal prized hilsa — limited stock.', 'Whole or pieces', 'kg', 120000, 0.5),
    ('seawater', 'White Pomfret', 'white-pomfret', 'Delicate seawater pomfret — perfect for fry.', 'Whole, gutted', 'kg', 78000, 0.5),
    ('seawater', 'Bangda (Mackerel)', 'bangda', 'Oily coastal mackerel — great grilled or fried.', 'Whole', 'kg', 24000, 0.5),
    ('shellfish', 'Tiger Prawns', 'tiger-prawns', 'Firm tiger prawns — medium size.', 'Deveined on request', 'kg', 65000, 0.25)
) as v(cat_slug, name, slug, description, cut_notes, unit, price_paise, min_qty)
join cats c on c.slug = v.cat_slug
on conflict (slug) do nothing;

insert into public.inventory (product_id, qty_on_hand, reserved_qty, low_stock_threshold)
select p.id,
  case p.slug
    when 'rohu' then 45
    when 'katla' then 30
    when 'hilsa' then 6
    when 'white-pomfret' then 12
    when 'bangda' then 28
    when 'tiger-prawns' then 18
    else 10
  end,
  0,
  case when p.slug = 'hilsa' then 2 else 4 end
from public.products p
on conflict (product_id) do nothing;

-- Promote first owner manually after signup:
-- update public.profiles set role = 'owner' where email = 'you@example.com';
