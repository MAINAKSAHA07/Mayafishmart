import { createClient } from "@mayafishmart/shared/supabase/server";
import { CounterOrderForm } from "@/components/admin/CounterOrderForm";
import type { Product } from "@mayafishmart/shared/types";

export default async function CounterOrderPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, inventory(*)")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Counter order</h1>
      <p className="mt-1 text-sm text-foam/60">Walk-in sale — pay at counter</p>
      <CounterOrderForm products={(data as Product[] | null) ?? []} />
    </div>
  );
}
