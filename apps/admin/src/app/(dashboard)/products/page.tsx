import { createClient } from "@mayafishmart/shared/supabase/server";
import { CatalogPanel } from "@/components/admin/CatalogPanel";
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
      <h1 className="font-display ops-page-title">Catalog</h1>
      <p className="mt-1 text-sm text-foam/60">Products, prices, and images</p>

      <CatalogPanel
        products={(products as Product[] | null) ?? []}
        categories={(categories as Category[]) ?? []}
      />
    </div>
  );
}
