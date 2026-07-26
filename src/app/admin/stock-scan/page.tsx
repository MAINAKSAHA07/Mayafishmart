import { createClient } from "@/lib/supabase/server";
import { StockScanPanel } from "@/components/admin/StockScanPanel";
import type { Product, StockScan } from "@/lib/types";

export default async function StockScanPage() {
  const supabase = await createClient();
  const [{ data: scans }, { data: products }] = await Promise.all([
    supabase
      .from("stock_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("products").select("id, name, unit").eq("is_active", true).order("name"),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Image stock update</h1>
      <p className="mt-1 text-sm text-foam/60">
        Upload a tray/crate photo — AI proposes matches. You approve before stock changes.
      </p>
      <StockScanPanel
        scans={(scans as StockScan[] | null) ?? []}
        products={(products as Pick<Product, "id" | "name" | "unit">[] | null) ?? []}
      />
    </div>
  );
}
