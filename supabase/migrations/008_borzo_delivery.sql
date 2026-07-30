-- Borzo delivery fields on Maya orders

alter table public.orders
  add column if not exists delivery_fee_paise int not null default 0
    check (delivery_fee_paise >= 0),
  add column if not exists borzo_order_id bigint,
  add column if not exists borzo_delivery_status text,
  add column if not exists borzo_tracking_url text;

create index if not exists orders_borzo_order_id_idx
  on public.orders (borzo_order_id)
  where borzo_order_id is not null;

comment on column public.orders.delivery_fee_paise is
  'Courier fee in paise (added to total_paise for delivery orders)';
comment on column public.orders.borzo_order_id is
  'Borzo Business API order_id after create-order';
comment on column public.orders.borzo_delivery_status is
  'Latest Borzo order/delivery status from webhook or booking';
comment on column public.orders.borzo_tracking_url is
  'Courier tracking URL when provided by Borzo';
