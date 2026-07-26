import { createClient } from "@mayafishmart/shared/supabase/server";
import { OrderActions } from "@/components/admin/OrderActions";
import { formatInr } from "@mayafishmart/shared/money";
import type { Order, OrderItem } from "@mayafishmart/shared/types";

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
      <h1 className="font-display ops-page-title">Orders</h1>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {["", "placed", "confirmed", "ready", "picked_up", "cancelled"].map((s) => (
          <a
            key={s || "all"}
            href={s ? `/orders?status=${s}` : "/orders"}
            data-active={(status || "") === s}
            className="ops-chip shrink-0"
          >
            {s || "all"}
          </a>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {orders.map((order) => (
          <li
            key={order.id}
            id={order.id}
            className={`ops-card ${
              focus === order.id ? "border-aqua/60 shadow-[0_0_0_1px_rgba(53,179,239,0.45)]" : ""
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
                <p className="font-semibold text-white tabular-nums">{formatInr(order.total_paise)}</p>
                {(order.discount_paise ?? 0) > 0 && (
                  <p className="text-xs text-aqua">
                    −{formatInr(order.discount_paise)}
                    {order.coupon_code ? ` · ${order.coupon_code}` : ""}
                  </p>
                )}
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
