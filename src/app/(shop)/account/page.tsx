import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { formatInr } from "@/lib/money";
import type { Order } from "@/lib/types";
import { LogoutButton } from "@/components/shop/LogoutButton";

export default async function AccountPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl text-ocean-deep">Your orders</h1>
        <p className="mt-3 text-muted">
          Connect Supabase to view order history. Browse the demo catalog without login.
        </p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Login
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Your orders</h1>
          <p className="mt-2 text-[0.975rem] text-muted">
            Contact details update the next time you checkout.
          </p>
        </div>
        <LogoutButton />
      </div>

      <ul className="mt-8 space-y-3">
        {(orders as Order[] | null)?.length ? (
          (orders as Order[]).map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="surface pressable block p-5 transition-[box-shadow] hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-xl tracking-[-0.02em] text-ocean-deep">
                    Pickup {order.pickup_code}
                  </p>
                  <span className="chip chip-idle !py-1 text-xs">
                    {order.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {new Date(order.created_at).toLocaleString("en-IN")} · {order.pickup_slot}
                </p>
                <p className="mt-1 font-semibold tracking-[-0.01em]">
                  {formatInr(order.total_paise)}
                </p>
              </Link>
            </li>
          ))
        ) : (
          <li className="surface p-10 text-center text-muted">
            No orders yet.{" "}
            <Link href="/catch" className="text-aqua hover:underline">
              Shop the catch
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
