import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { formatInr } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";

const STEPS = ["placed", "confirmed", "ready", "picked_up"] as const;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-muted">
        Connect Supabase to view orders.
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();
  const o = order as Order & { order_items: OrderItem[] };

  const stepIndex =
    o.status === "cancelled" ? -1 : STEPS.indexOf(o.status as (typeof STEPS)[number]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/account" className="text-sm text-aqua hover:underline">
        ← All orders
      </Link>
      <h1 className="font-display mt-4 text-4xl text-ocean-deep">Order confirmed</h1>
      <p className="mt-2 text-lg">
        Pickup code{" "}
        <span className="rounded-lg bg-ocean px-3 py-1 font-mono text-xl font-bold tracking-widest text-white">
          {o.pickup_code}
        </span>
      </p>
      <p className="mt-3 text-muted">{o.pickup_slot}</p>

      {o.status !== "cancelled" ? (
        <ol className="mt-8 flex flex-wrap gap-2">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                i <= stepIndex ? "bg-aqua text-white" : "bg-white text-muted ring-1 ring-line"
              }`}
            >
              {step.replace("_", " ")}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 font-semibold text-coral">Cancelled</p>
      )}

      <div className="mt-8 rounded-2xl bg-white/80 p-5 ring-1 ring-line">
        <h2 className="font-display text-xl text-ocean">Items</h2>
        <ul className="mt-3 space-y-2">
          {o.order_items?.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.product_name} × {item.qty} {item.unit}
              </span>
              <span>{formatInr(item.line_total_paise)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-line pt-3 font-semibold">
          <span>Total</span>
          <span>{formatInr(o.total_paise)}</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Payment: {o.payment_method} · {o.payment_status}
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-foam p-5 text-sm text-ink">
        <p className="font-semibold">{o.customer_name}</p>
        <p>{o.customer_phone} · {o.customer_email}</p>
        <p className="mt-1 text-muted">
          {o.customer_address.line1}
          {o.customer_address.line2 ? `, ${o.customer_address.line2}` : ""},{" "}
          {o.customer_address.city}, {o.customer_address.state} {o.customer_address.pincode}
        </p>
      </div>
    </div>
  );
}
