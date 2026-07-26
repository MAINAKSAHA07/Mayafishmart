-- Maya Fish Mart — initial schema + RLS

create extension if not exists "pgcrypto";

-- Roles
create type public.app_role as enum (
  'customer',
  'owner',
  'manager',
  'staff',
  'viewer'
);

create type public.order_status as enum (
  'placed',
  'confirmed',
  'ready',
  'picked_up',
  'cancelled'
);

create type public.payment_method as enum (
  'razorpay',
  'counter',
  'cod'
);

create type public.payment_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded'
);

create type public.inventory_reason as enum (
  'sale',
  'restock',
  'adjustment',
  'image_scan',
  'waste',
  'reserve',
  'release'
);

create type public.product_unit as enum ('kg', 'piece');

create type public.scan_status as enum (
  'pending_review',
  'applied',
  'rejected'
);

create type public.insight_type as enum ('sales', 'stock');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customer_addresses_one_primary
  on public.customer_addresses (customer_id)
  where is_primary;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  cut_notes text,
  unit public.product_unit not null default 'kg',
  price_paise int not null check (price_paise >= 0),
  gst_rate numeric(5, 2) not null default 5.00,
  image_url text,
  is_active boolean not null default true,
  min_order_qty numeric(10, 3) not null default 0.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  product_id uuid primary key references public.products (id) on delete cascade,
  qty_on_hand numeric(12, 3) not null default 0,
  reserved_qty numeric(12, 3) not null default 0,
  low_stock_threshold numeric(12, 3) not null default 2,
  updated_at timestamptz not null default now(),
  constraint inventory_non_negative check (
    qty_on_hand >= 0 and reserved_qty >= 0
  )
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  delta numeric(12, 3) not null,
  reason public.inventory_reason not null,
  actor_id uuid references public.profiles (id) on delete set null,
  note text,
  image_path text,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  pickup_code text not null unique,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  status public.order_status not null default 'placed',
  fulfillment text not null default 'pickup',
  pickup_slot text not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  subtotal_paise int not null default 0,
  gst_paise int not null default 0,
  total_paise int not null default 0,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_address jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  unit public.product_unit not null,
  qty numeric(12, 3) not null check (qty > 0),
  unit_price_paise int not null,
  gst_rate numeric(5, 2) not null,
  line_total_paise int not null
);

create table public.customers_meta (
  customer_id uuid primary key references public.profiles (id) on delete cascade,
  staff_notes text,
  last_order_at timestamptz
);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  type public.insight_type not null,
  period_start date not null,
  period_end date not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.stock_scans (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  raw_ai_json jsonb,
  proposed_updates jsonb not null default '[]'::jsonb,
  status public.scan_status not null default 'pending_review',
  created_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.role in ('owner', 'manager', 'staff', 'viewer')
  );
$$;

create or replace function public.is_manager_plus(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.role in ('owner', 'manager')
  );
$$;

create or replace function public.is_owner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'owner'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

create or replace function public.generate_pickup_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  return code;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers_meta enable row level security;
alter table public.ai_insights enable row level security;
alter table public.stock_scans enable row level security;

-- Profiles policies
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff(auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid() or public.is_owner(auth.uid()))
  with check (id = auth.uid() or public.is_owner(auth.uid()));

create policy "profiles_owner_insert_staff"
  on public.profiles for insert
  with check (public.is_owner(auth.uid()) or id = auth.uid());

-- Addresses
create policy "addresses_select_own_or_staff"
  on public.customer_addresses for select
  using (customer_id = auth.uid() or public.is_staff(auth.uid()));

create policy "addresses_upsert_own"
  on public.customer_addresses for insert
  with check (customer_id = auth.uid());

create policy "addresses_update_own"
  on public.customer_addresses for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Catalog public read
create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "categories_staff_write"
  on public.categories for all
  using (public.is_manager_plus(auth.uid()))
  with check (public.is_manager_plus(auth.uid()));

create policy "products_public_read_active"
  on public.products for select
  using (is_active = true or public.is_staff(auth.uid()));

create policy "products_staff_write"
  on public.products for all
  using (public.is_manager_plus(auth.uid()))
  with check (public.is_manager_plus(auth.uid()));

create policy "inventory_staff_read"
  on public.inventory for select
  using (public.is_staff(auth.uid()) or true);

create policy "inventory_staff_write"
  on public.inventory for all
  using (public.is_staff(auth.uid()) and not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'viewer'
  ))
  with check (public.is_manager_plus(auth.uid()) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'
  ));

create policy "movements_staff_read"
  on public.inventory_movements for select
  using (public.is_staff(auth.uid()));

create policy "movements_staff_insert"
  on public.inventory_movements for insert
  with check (public.is_staff(auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'manager', 'staff')
  ));

-- Orders
create policy "orders_select_own_or_staff"
  on public.orders for select
  using (customer_id = auth.uid() or public.is_staff(auth.uid()));

create policy "orders_insert_own"
  on public.orders for insert
  with check (customer_id = auth.uid() or public.is_staff(auth.uid()));

create policy "orders_update_staff_or_own_cancel"
  on public.orders for update
  using (
    public.is_staff(auth.uid())
    or (customer_id = auth.uid())
  )
  with check (
    public.is_staff(auth.uid())
    or (customer_id = auth.uid())
  );

create policy "order_items_select"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.is_staff(auth.uid()))
    )
  );

create policy "order_items_insert"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.is_staff(auth.uid()))
    )
  );

create policy "customers_meta_staff"
  on public.customers_meta for all
  using (public.is_staff(auth.uid()))
  with check (public.is_manager_plus(auth.uid()) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'staff'
  ));

create policy "insights_staff_read"
  on public.ai_insights for select
  using (public.is_staff(auth.uid()));

create policy "insights_manager_write"
  on public.ai_insights for insert
  with check (public.is_manager_plus(auth.uid()));

create policy "scans_staff"
  on public.stock_scans for all
  using (public.is_staff(auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'manager', 'staff')
  ))
  with check (public.is_staff(auth.uid()) and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner', 'manager', 'staff')
  ));

-- Storage buckets (run in dashboard or via API)
-- product-images (public), stock-scans (private)
