import { createClient } from "@mayafishmart/shared/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { formatInr } from "@mayafishmart/shared/money";
import type { Category, Product } from "@mayafishmart/shared/types";
import { requireManager } from "@mayafishmart/shared/auth";

export default async function AdminProductsPage() {
  await requireManager();
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*, categories(*), inventory(*)").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Catalog</h1>
      <p className="mt-1 text-sm text-foam/60">Products, prices, and images</p>

      <ProductForm categories={(categories as Category[]) ?? []} />

      <ul className="mt-8 space-y-3">
        {((products as Product[] | null) ?? []).map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
          >
            <div>
              <p className="font-semibold text-white">{p.name}</p>
              <p className="text-xs text-foam/60">
                {p.categories?.name ?? "—"} · {p.is_active ? "active" : "hidden"} · stock{" "}
                {p.inventory?.qty_on_hand ?? 0} {p.unit}
              </p>
            </div>
            <p className="text-aqua">
              {formatInr(p.price_paise)} / {p.unit}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
