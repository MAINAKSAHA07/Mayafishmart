import Link from "next/link";
import { subDays } from "date-fns";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { formatInr } from "@mayafishmart/shared/money";
import type { Order, OrderItem, Product } from "@mayafishmart/shared/types";
import { aggregateSales } from "@/lib/sales-aggregates";
import {
  BreakdownChart,
  OrdersBarChart,
  RevenueTrendChart,
  TopProductsChart,
} from "@/components/admin/SalesCharts";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const periodStart = subDays(start, 29).toISOString();

  const [{ data: todayOrders }, { data: lowStock }, { data: pending }, { data: periodOrders }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false }),
      supabase.from("inventory").select("*, products(*)").order("qty_on_hand"),
      supabase
        .from("orders")
        .select("*")
        .in("status", ["placed", "confirmed", "ready"])
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .gte("created_at", periodStart)
        .neq("status", "cancelled")
        .order("created_at", { ascending: true }),
    ]);

  const orders = (todayOrders as Order[] | null) ?? [];
  const revenue = orders
    .filter((o) => o.payment_status === "paid" || o.status === "picked_up")
    .reduce((s, o) => s + o.total_paise, 0);

  const low = (
    (lowStock as Array<{
      qty_on_hand: number;
      low_stock_threshold: number;
      products: Product;
    }> | null) ?? []
  )
    .filter((row) => Number(row.qty_on_hand) <= Number(row.low_stock_threshold))
    .slice(0, 6);

  const sales = aggregateSales(
    (periodOrders as Array<Order & { order_items: OrderItem[] }> | null) ?? [],
    30
  );

  return (
    <div>
      <h1 className="font-display ops-page-title">Dashboard</h1>
      <p className="mt-1 text-sm text-foam/60">Today&apos;s counter pulse · 30-day sales</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Orders today", String(orders.length)],
          ["Revenue (paid/picked)", formatInr(revenue)],
          ["Awaiting pickup", String((pending as Order[] | null)?.length ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.25rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
            <p className="eyebrow text-aqua">{label}</p>
            <p className="mt-3 font-display text-[1.85rem] tracking-[-0.03em] text-white tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl tracking-[-0.02em] text-white">Sales (30 days)</h2>
            <p className="text-sm text-foam/55">
              {sales.orderTotal} orders · {formatInr(sales.revenueTotal)} paid/picked revenue
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.25rem] bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
            <p className="eyebrow mb-3 text-aqua">Revenue trend</p>
            <RevenueTrendChart series={sales.series} />
          </div>
          <div className="rounded-[1.25rem] bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
            <p className="eyebrow mb-3 text-aqua">Orders per day</p>
            <OrdersBarChart series={sales.series} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[1.25rem] bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5 lg:col-span-2">
            <p className="eyebrow mb-3 text-aqua">Top products by revenue</p>
            {sales.topProducts.length ? (
              <TopProductsChart products={sales.topProducts} />
            ) : (
              <p className="py-8 text-center text-sm text-foam/50">No sales in this period</p>
            )}
          </div>
          <div className="space-y-6">
            <div className="rounded-[1.25rem] bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
              <p className="eyebrow mb-2 text-aqua">Payment mix</p>
              <BreakdownChart slices={sales.paymentSlices} title="Pay" />
            </div>
            <div className="rounded-[1.25rem] bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
              <p className="eyebrow mb-2 text-aqua">Status mix</p>
              <BreakdownChart slices={sales.statusSlices} title="Status" />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Active orders</h2>
            <Link href="/orders" className="text-sm text-aqua hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {((pending as Order[] | null) ?? []).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders?focus=${o.id}`}
                  className="pressable flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10"
                >
                  <div>
                    <p className="font-mono font-semibold text-white">{o.pickup_code}</p>
                    <p className="text-xs text-foam/60">
                      {o.customer_name} · {o.pickup_slot}
                    </p>
                  </div>
                  <span className="text-xs tracking-wide text-aqua uppercase">{o.status}</span>
                </Link>
              </li>
            ))}
            {!pending?.length && (
              <li className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-foam/50">
                No active orders
              </li>
            )}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Low stock</h2>
            <Link href="/inventory" className="text-sm text-aqua hover:underline">
              Inventory
            </Link>
          </div>
          <ul className="space-y-2">
            {low.map((row) => (
              <li
                key={row.products?.id ?? Math.random()}
                className="flex justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
              >
                <span>{row.products?.name ?? "Product"}</span>
                <span className="text-coral tabular-nums">
                  {row.qty_on_hand} / thr {row.low_stock_threshold}
                </span>
              </li>
            ))}
            {!low.length && (
              <li className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-foam/50">
                Stock looks healthy
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
