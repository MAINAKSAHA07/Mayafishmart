-- Borzo delivery webhook event log (order_* / delivery_* callbacks)

create table public.borzo_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_datetime timestamptz,
  borzo_order_id bigint,
  borzo_delivery_id bigint,
  status text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index borzo_webhook_events_order_idx
  on public.borzo_webhook_events (borzo_order_id, received_at desc);

create index borzo_webhook_events_delivery_idx
  on public.borzo_webhook_events (borzo_delivery_id, received_at desc);

create index borzo_webhook_events_type_idx
  on public.borzo_webhook_events (event_type, received_at desc);

alter table public.borzo_webhook_events enable row level security;

-- Inserts only via service role (webhook). Staff can read for ops debugging.
create policy "borzo_webhook_events_staff_read"
  on public.borzo_webhook_events for select
  using (public.is_staff(auth.uid()));
