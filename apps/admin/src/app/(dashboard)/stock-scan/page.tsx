import { createClient } from "@mayafishmart/shared/supabase/server";
import { StockScanPanel } from "@/components/admin/StockScanPanel";
import type { Product, StockScan } from "@mayafishmart/shared/types";
import {
  purgeExpiredStockScanImages,
  signStockScanImage,
} from "@/lib/stock-scan-images";

export default async function StockScanPage() {
  const supabase = await createClient();

  // Lazy retention: rejected images after 24h, applied after 7d
  await purgeExpiredStockScanImages(40);

  const [{ data: scans }, { data: products }] = await Promise.all([
    supabase
      .from("stock_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("products").select("id, name, unit").eq("is_active", true).order("name"),
  ]);

  const rows = (scans as StockScan[] | null) ?? [];
  const withUrls: StockScan[] = await Promise.all(
    rows.map(async (scan) => {
      if (scan.image_purged_at) {
        return { ...scan, image_path: "" };
      }
      const url = await signStockScanImage(
        scan.image_path,
        scan.storage_path,
        scan.image_purged_at,
      );
      return { ...scan, image_path: url || scan.image_path };
    }),
  );

  return (
    <div>
      <h1 className="font-display ops-page-title">Image stock update</h1>
      <p className="mt-1 text-sm text-foam/60">
        Write notes as <span className="text-foam/80">qty → product → price/kg</span> (e.g.{" "}
        <span className="text-foam/80">40kg Katla Rs 240/kg</span>). Rejected images delete after 24h;
        applied after 7 days.
      </p>
      <StockScanPanel
        scans={withUrls}
        products={(products as Pick<Product, "id" | "name" | "unit">[] | null) ?? []}
      />
    </div>
  );
}
