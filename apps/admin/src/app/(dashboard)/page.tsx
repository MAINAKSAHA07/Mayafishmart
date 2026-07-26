import Link from "next/link";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { formatInr } from "@mayafishmart/shared/money";
import type { Order, Product } from "@mayafishmart/shared/types";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [{ data: todayOrders }, { data: lowStock }, { data: pending }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("inventory")
      .select("*, products(*)")
      .order("qty_on_hand"),
    supabase
      .from("orders")
      .select("*")
      .in("status", ["placed", "confirmed", "ready"])
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const orders = (todayOrders as Order[] | null) ?? [];
  const revenue = orders
    .filter((o) => o.payment_status === "paid" || o.status === "picked_up")
    .reduce((s, o) => s + o.total_paise, 0);

  const low = ((lowStock as Array<{ qty_on_hand: number; low_stock_threshold: number; products: Product }> | null) ?? [])
    .filter((row) => Number(row.qty_on_hand) <= Number(row.low_stock_threshold))
    .slice(0, 6);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-foam/60">Today&apos;s counter pulse</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Orders today", String(orders.length)],
          ["Revenue (paid/picked)", formatInr(revenue)],
          ["Awaiting pickup", String((pending as Order[] | null)?.length ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.25rem] bg-white/[0.06] p-5 ring-1 ring-white/10">
            <p className="eyebrow text-aqua">{label}</p>
            <p className="mt-3 font-display text-[1.85rem] tracking-[-0.03em] text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

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
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10"
                >
                  <div>
                    <p className="font-mono font-semibold text-white">{o.pickup_code}</p>
                    <p className="text-xs text-foam/60">{o.customer_name} · {o.pickup_slot}</p>
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
                <span className="text-coral">
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
