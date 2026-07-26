-- Expand Maya Fish Mart catalog + enforce min order qtys
-- Rohu / Catla (Katla) / Prawns → 1 kg; all other kg fish → 0.5 kg

insert into public.categories (name, slug, description, sort_order) values
  ('Freshwater', 'freshwater', 'River and pond favourites', 1),
  ('Seawater', 'seawater', 'Coastal catch of the day', 2),
  ('Prawns & Shellfish', 'shellfish', 'Prawns, crabs, and more', 3)
on conflict (slug) do nothing;

with cats as (
  select id, slug from public.categories
),
catalog as (
  select * from (
    values
      -- Freshwater
      ('freshwater', 'Rohu', 'rohu',
        'Firm freshwater favourite (Rui, Roho Labeo) — ideal for curry and fry.',
        'Cleaned, steak-cut on request', 'kg', 28000, 1.0),
      ('freshwater', 'Catla (Katla)', 'katla',
        'Rich, oily freshwater fish — Bengali classic. Also called Katla.',
        'Whole or pieces', 'kg', 32000, 1.0),
      ('freshwater', 'Tilapia', 'tilapia',
        'Mild white fish (Chilapi, Jalebi Fish) — great fried or curried.',
        'Whole or pieces', 'kg', 22000, 0.5),
      ('freshwater', 'Pangasius', 'pangasius',
        'Indian Basa (Pangas) — boneless-friendly fillets popular for fry.',
        'Fillet or pieces', 'kg', 26000, 0.5),
      ('freshwater', 'Mrigal', 'mrigal',
        'Mrigal Carp — firm flesh for everyday curry.',
        'Whole or pieces', 'kg', 25000, 0.5),
      ('freshwater', 'Roopchand', 'roopchand',
        'River Pomfret / Chinese Pomfret — mild and flaky.',
        'Whole or pieces', 'kg', 36000, 0.5),
      ('freshwater', 'Murrel', 'murrel',
        'Snakehead (Sol, Soul Fish) — meaty freshwater favourite.',
        'Whole or pieces', 'kg', 42000, 0.5),
      ('freshwater', 'Magur', 'magur',
        'Desi Mangur / Walking Catfish — rich curry fish.',
        'Whole or pieces', 'kg', 48000, 0.5),
      ('freshwater', 'Singhi', 'singhi',
        'Desi Singhi / Stinging Catfish — traditional Bengali favourite.',
        'Whole or pieces', 'kg', 45000, 0.5),
      ('freshwater', 'Pabda', 'pabda',
        'Pabda Catfish — delicate and prized for mustard gravy.',
        'Whole', 'kg', 52000, 0.5),
      ('freshwater', 'Tengra', 'tengra',
        'Tyangra / Kolkata Tengra — small catfish, excellent fried.',
        'Whole', 'kg', 38000, 0.5),
      ('freshwater', 'Koi Mach', 'koi-mach',
        'Climbing Perch — firm texture, classic Bengali dish.',
        'Whole', 'kg', 40000, 0.5),
      ('freshwater', 'Boal', 'boal',
        'Buwal / Attu Vaala — large freshwater catfish.',
        'Steak-cut on request', 'kg', 35000, 0.5),
      ('freshwater', 'Aar Fish', 'aar-fish',
        'Aor / Long-whiskered Catfish — thick steaks for curry.',
        'Steak-cut on request', 'kg', 38000, 0.5),
      ('freshwater', 'Chital', 'chital',
        'Chittol / Clown Knifefish — celebrated festive fish.',
        'Whole or pieces', 'kg', 55000, 0.5),
      ('freshwater', 'Bata Fish', 'bata-fish',
        'Bata Labeo — small carp, great for light fry.',
        'Whole', 'kg', 30000, 0.5),
      ('freshwater', 'Kachki', 'kachki',
        'Tiny freshwater fish — crisp fry favourite.',
        'Whole', 'kg', 28000, 0.5),
      ('freshwater', 'Hilsa (Ilish)', 'hilsa',
        'Seasonal prized hilsa — limited stock.',
        'Whole or pieces', 'kg', 120000, 0.5),
      -- Seawater
      ('seawater', 'Surmai', 'surmai',
        'Kingfish / Seer — firm steaks for fry and gravy.',
        'Steak-cut on request', 'kg', 72000, 0.5),
      ('seawater', 'Pomfret', 'pomfret',
        'Classic pomfret — perfect for fry or steam.',
        'Whole, gutted', 'kg', 78000, 0.5),
      ('seawater', 'Bombil', 'bombil',
        'Bombay Duck — soft coastal fish, excellent fried.',
        'Whole', 'kg', 32000, 0.5),
      ('seawater', 'Bangda (Mackerel)', 'bangda',
        'Oily coastal mackerel — great grilled or fried.',
        'Whole', 'kg', 24000, 0.5),
      -- Shellfish
      ('shellfish', 'Prawns', 'tiger-prawns',
        'Fresh prawns — medium size.',
        'Deveined on request', 'kg', 65000, 1.0)
  ) as v(cat_slug, name, slug, description, cut_notes, unit, price_paise, min_qty)
)
insert into public.products (
  category_id, name, slug, description, cut_notes, unit, price_paise, gst_rate, is_active, min_order_qty
)
select
  c.id,
  catalog.name,
  catalog.slug,
  catalog.description,
  catalog.cut_notes,
  catalog.unit::public.product_unit,
  catalog.price_paise,
  5,
  true,
  catalog.min_qty
from catalog
join cats c on c.slug = catalog.cat_slug
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  cut_notes = excluded.cut_notes,
  category_id = excluded.category_id,
  price_paise = excluded.price_paise,
  min_order_qty = excluded.min_order_qty,
  is_active = true,
  updated_at = now();

-- Align legacy / keyword mins
update public.products
set min_order_qty = 1, is_active = true, updated_at = now()
where slug in ('rohu', 'katla', 'tiger-prawns', 'prawns')
   or lower(name) like '%prawn%'
   or lower(name) like '%rohu%'
   or lower(name) like '%katla%'
   or lower(name) like '%catla%';

update public.products
set min_order_qty = 0.5, updated_at = now()
where unit = 'kg'
  and slug not in ('rohu', 'katla', 'tiger-prawns', 'prawns')
  and lower(name) not like '%prawn%'
  and lower(name) not like '%rohu%'
  and lower(name) not like '%katla%'
  and lower(name) not like '%catla%';

-- Keep white-pomfret if present (alongside new pomfret)
update public.products
set
  name = 'Pomfret (White)',
  min_order_qty = 0.5,
  is_active = true,
  updated_at = now()
where slug = 'white-pomfret';

insert into public.inventory (product_id, qty_on_hand, reserved_qty, low_stock_threshold)
select p.id,
  case
    when p.slug in ('rohu', 'katla') then 40
    when p.slug in ('prawns', 'tiger-prawns') then 20
    when p.slug = 'hilsa' then 6
    else 15
  end,
  0,
  case when p.slug = 'hilsa' then 2 else 4 end
from public.products p
on conflict (product_id) do nothing;
