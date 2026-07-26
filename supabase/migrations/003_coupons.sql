-- Coupons + order discount snapshots for Maya Fish Mart

create type public.coupon_type as enum ('percent', 'fixed');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type public.coupon_type not null,
  -- percent: 1–100; fixed: discount in paise
  value numeric(12, 2) not null check (value > 0),
  min_subtotal_paise int not null default 0 check (min_subtotal_paise >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses int,
  max_uses_per_customer int,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_code_normalized check (code = upper(trim(code))),
  constraint coupons_percent_range check (
    type <> 'percent' or (value > 0 and value <= 100)
  ),
  constraint coupons_dates_ok check (
    starts_at is null or ends_at is null or starts_at <= ends_at
  )
);

create unique index coupons_code_unique on public.coupons (code);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  discount_paise int not null check (discount_paise >= 0),
  created_at timestamptz not null default now(),
  constraint coupon_redemptions_order_unique unique (order_id)
);

create index coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id);
create index coupon_redemptions_customer_coupon_idx
  on public.coupon_redemptions (customer_id, coupon_id);

alter table public.orders
  add column if not exists coupon_id uuid references public.coupons (id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists discount_paise int not null default 0 check (discount_paise >= 0);

create trigger coupons_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "coupons_staff_read"
  on public.coupons for select
  using (public.is_staff(auth.uid()));

create policy "coupons_manager_write"
  on public.coupons for all
  using (public.is_manager_plus(auth.uid()))
  with check (public.is_manager_plus(auth.uid()));

create policy "coupon_redemptions_staff_read"
  on public.coupon_redemptions for select
  using (public.is_staff(auth.uid()) or customer_id = auth.uid());

create policy "coupon_redemptions_service_insert"
  on public.coupon_redemptions for insert
  with check (true);
