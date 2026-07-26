import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { formatInr } from "@/lib/money";
import type { Order, OrderItem } from "@/lib/types";
import { PrintReceiptButton } from "@/components/shop/PrintReceiptButton";

const STEPS = ["placed", "confirmed", "ready", "picked_up"] as const;

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pickup?: string }>;
}) {
  const { id } = await params;
  const { pickup } = await searchParams;
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

  let order: (Order & { order_items: OrderItem[] }) | null = null;

  if (user) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .maybeSingle();
    order = data as (Order & { order_items: OrderItem[] }) | null;
  }

  // Guests can open the confirmation link with matching pickup code
  if (!order && pickup) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .eq("pickup_code", pickup)
      .maybeSingle();
    order = data as (Order & { order_items: OrderItem[] }) | null;
  }

  if (!user && !pickup) {
    redirect(`/login?next=/orders/${id}`);
  }

  if (!order) notFound();
  const o = order;
  // GST disabled for now
  // const { cgst, sgst } = splitCgstSgst(o.gst_paise);

  const stepIndex =
    o.status === "cancelled" ? -1 : STEPS.indexOf(o.status as (typeof STEPS)[number]);

  const when = new Date(o.created_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
          .receipt-print {
            box-shadow: none !important;
            border: none !important;
            max-width: 80mm;
            margin: 0 auto;
          }
          .receipt-code {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 6mm; }
        }
      `}</style>

      {user ? (
        <Link href="/account" className="no-print text-sm text-aqua hover:underline">
          ← All orders
        </Link>
      ) : (
        <Link href="/catch" className="no-print text-sm text-aqua hover:underline">
          ← Back to catch
        </Link>
      )}
      <h1 className="font-display no-print mt-4 text-4xl tracking-[-0.03em] text-ocean-deep">
        Order confirmed
      </h1>
      <p className="no-print mt-2 text-lg">
        Pickup code{" "}
        <span className="rounded-lg bg-ocean px-3 py-1 font-mono text-xl font-bold tracking-widest text-white">
          {o.pickup_code}
        </span>
      </p>
      <p className="no-print mt-3 text-muted">{o.pickup_slot}</p>

      {o.status !== "cancelled" ? (
        <ol className="no-print mt-8 flex flex-wrap gap-2">
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
        <p className="no-print mt-6 font-semibold text-coral">Cancelled</p>
      )}

      <article className="receipt-print mt-8 rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={48} height={48} className="mx-auto rounded-full" />
          <h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-ocean-deep">
            Maya Fish Mart
          </h2>
          <p className="text-xs text-muted">Pickup receipt · {when}</p>
        </div>

        <div className="receipt-code my-4 rounded-xl bg-ocean-deep px-3 py-3 text-center text-white">
          <p className="text-[0.65rem] tracking-[0.14em] uppercase opacity-80">Pickup code</p>
          <p className="font-mono text-[2rem] font-bold tracking-[0.16em]">{o.pickup_code}</p>
        </div>

        <ul className="space-y-2 text-sm">
          {o.order_items?.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.product_name} × {item.qty} {item.unit}
              </span>
              <span className="tabular-nums">{formatInr(item.line_total_paise)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatInr(o.subtotal_paise)}</span>
          </div>
          {(o.discount_paise ?? 0) > 0 && (
            <div className="flex justify-between text-aqua">
              <span>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</span>
              <span className="tabular-nums">−{formatInr(o.discount_paise)}</span>
            </div>
          )}
          {/* GST disabled for now
          <div className="flex justify-between text-muted">
            <span>CGST</span>
            <span className="tabular-nums">{formatInr(cgst)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>SGST</span>
            <span className="tabular-nums">{formatInr(sgst)}</span>
          </div>
          */}
          <div className="flex justify-between border-t border-line pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatInr(o.total_paise)}</span>
          </div>
          <p className="pt-1 text-xs text-muted">
            Payment: {o.payment_method} · {o.payment_status} · {o.pickup_slot}
          </p>
        </div>
      </article>

      <div className="no-print mt-6 rounded-2xl bg-foam p-5 text-sm text-ink">
        <p className="font-semibold">{o.customer_name}</p>
        <p>
          {o.customer_phone} · {o.customer_email}
        </p>
        <p className="mt-1 text-muted">
          {o.customer_address.line1}
          {o.customer_address.line2 ? `, ${o.customer_address.line2}` : ""},{" "}
          {o.customer_address.city}, {o.customer_address.state} {o.customer_address.pincode}
        </p>
      </div>

      <PrintReceiptButton />
    </div>
  );
}
