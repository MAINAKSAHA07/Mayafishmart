import { createClient } from "@mayafishmart/shared/supabase/server";
import { formatInr } from "@mayafishmart/shared/money";
import type { CustomerAddress, Order, Profile } from "@mayafishmart/shared/types";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "customer")
    .order("updated_at", { ascending: false });

  const list = (customers as Profile[] | null) ?? [];
  const enriched = await Promise.all(
    list.map(async (c) => {
      const [{ data: address }, { data: orders }, { data: meta }] = await Promise.all([
        supabase
          .from("customer_addresses")
          .select("*")
          .eq("customer_id", c.id)
          .eq("is_primary", true)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id, total_paise, created_at, pickup_code, status")
          .eq("customer_id", c.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("customers_meta").select("*").eq("customer_id", c.id).maybeSingle(),
      ]);
      return {
        profile: c,
        address: address as CustomerAddress | null,
        orders: (orders as Pick<Order, "id" | "total_paise" | "created_at" | "pickup_code" | "status">[] | null) ?? [],
        notes: meta?.staff_notes as string | null,
      };
    })
  );

  return (
    <div>
      <h1 className="font-display ops-page-title">Customers</h1>
      <p className="mt-1 text-sm text-foam/60">
        Contact details saved from checkout (email, phone, address)
      </p>
      <ul className="mt-6 space-y-4">
        {enriched.map(({ profile, address, orders, notes }) => (
          <li key={profile.id} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="font-semibold text-white">{profile.full_name || "Unnamed"}</p>
            <p className="text-sm text-foam/70">
              {profile.email || "—"} · {profile.phone || "—"}
            </p>
            {address && (
              <p className="mt-2 text-sm text-foam/60">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state}{" "}
                {address.pincode}
              </p>
            )}
            {notes && <p className="mt-2 text-xs text-aqua">Staff note: {notes}</p>}
            <ul className="mt-3 space-y-1 text-xs text-foam/50">
              {orders.map((o) => (
                <li key={o.id}>
                  {o.pickup_code} · {o.status} · {formatInr(o.total_paise)}
                </li>
              ))}
              {!orders.length && <li>No orders yet</li>}
            </ul>
          </li>
        ))}
        {!enriched.length && (
          <li className="rounded-2xl bg-white/5 py-10 text-center text-foam/50">No customers yet</li>
        )}
      </ul>
    </div>
  );
}
