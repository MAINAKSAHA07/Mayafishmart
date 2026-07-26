import { createClient } from "@mayafishmart/shared/supabase/server";
import { InventoryAdjustForm } from "@/components/admin/InventoryAdjustForm";
import type { Product } from "@mayafishmart/shared/types";

export default async function AdminInventoryPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: movements }] = await Promise.all([
    supabase.from("inventory").select("*, products(*)").order("updated_at", { ascending: false }),
    supabase
      .from("inventory_movements")
      .select("*, products(name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const products =
    ((rows as Array<{
      product_id: string;
      qty_on_hand: number;
      reserved_qty: number;
      low_stock_threshold: number;
      products: Product;
    }> | null) ?? []).map((r) => ({
      id: r.product_id,
      name: r.products?.name ?? "Product",
      qty: r.qty_on_hand,
      reserved: r.reserved_qty,
      threshold: r.low_stock_threshold,
      unit: r.products?.unit ?? "kg",
    }));

  return (
    <div>
      <h1 className="font-display ops-page-title">Inventory</h1>
      <InventoryAdjustForm products={products.map((p) => ({ id: p.id, name: p.name }))} />

      {/* Mobile cards */}
      <ul className="mt-6 space-y-3 md:hidden">
        {products.map((p) => (
          <li key={p.id} className="ops-card">
            <p className="font-semibold text-white">{p.name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-white/5 px-2 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-foam/50">On hand</p>
                <p className="mt-0.5 tabular-nums text-white">
                  {p.qty} {p.unit}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 px-2 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-foam/50">Reserved</p>
                <p className="mt-0.5 tabular-nums text-white">{p.reserved}</p>
              </div>
              <div className="rounded-xl bg-white/5 px-2 py-2">
                <p className="text-[0.65rem] uppercase tracking-wide text-foam/50">Low at</p>
                <p className={`mt-0.5 tabular-nums ${p.qty <= p.threshold ? "text-coral" : "text-white"}`}>
                  {p.threshold}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl ring-1 ring-white/10 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs tracking-wide text-aqua uppercase">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3">Reserved</th>
              <th className="px-4 py-3">Threshold</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="px-4 py-3 text-white">{p.name}</td>
                <td className="px-4 py-3">
                  {p.qty} {p.unit}
                </td>
                <td className="px-4 py-3">{p.reserved}</td>
                <td className={`px-4 py-3 ${p.qty <= p.threshold ? "text-coral" : ""}`}>
                  {p.threshold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display mt-10 text-xl text-white">Recent movements</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {((movements as Array<{
          id: string;
          delta: number;
          reason: string;
          note: string | null;
          created_at: string;
          products: { name: string } | null;
        }> | null) ?? []).map((m) => (
          <li key={m.id} className="ops-card !py-3">
            <span className="text-white">{m.products?.name}</span>{" "}
            <span className={m.delta >= 0 ? "text-aqua" : "text-coral"}>
              {m.delta > 0 ? "+" : ""}
              {m.delta}
            </span>{" "}
            <span className="text-foam/50">
              {m.reason} · {new Date(m.created_at).toLocaleString("en-IN")}
            </span>
            {m.note && <span className="block text-xs text-foam/40">{m.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
