import { createClient } from "@/lib/supabase/server";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatInr } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; focus?: string }>;
}) {
  const { status, focus } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);

  const { data } = await query;
  const orders = (data as Array<Order & { order_items: OrderItem[] }> | null) ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {["", "placed", "confirmed", "ready", "picked_up", "cancelled"].map((s) => (
          <a
            key={s || "all"}
            href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              (status || "") === s
                ? "bg-aqua text-ocean-deep"
                : "bg-white/10 text-foam/80 hover:bg-white/15"
            }`}
          >
            {s || "all"}
          </a>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {orders.map((order) => (
          <li
            key={order.id}
            id={order.id}
            className={`rounded-2xl bg-white/5 p-5 ring-1 ${
              focus === order.id ? "ring-aqua" : "ring-white/10"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-bold tracking-wider text-white">
                  {order.pickup_code}
                </p>
                <p className="text-sm text-foam/70">
                  {order.customer_name} · {order.customer_phone}
                </p>
                <p className="text-xs text-foam/50">{order.pickup_slot}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-white">{formatInr(order.total_paise)}</p>
                <p className="text-xs text-aqua uppercase">
                  {order.status} · {order.payment_status}
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-foam/80">
              {order.order_items?.map((item) => (
                <li key={item.id}>
                  {item.product_name} × {item.qty} {item.unit}
                </li>
              ))}
            </ul>
            <OrderActions order={order} />
          </li>
        ))}
        {!orders.length && (
          <li className="rounded-2xl bg-white/5 py-12 text-center text-foam/50">No orders found</li>
        )}
      </ul>
    </div>
  );
}
