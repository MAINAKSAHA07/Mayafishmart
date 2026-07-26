import { formatInr } from "@mayafishmart/shared/money";
import type { Order, OrderItem } from "@mayafishmart/shared/types";

export function ReceiptDocument({
  order,
  items,
  variant = "admin",
}: {
  order: Order;
  items: OrderItem[];
  variant?: "admin" | "customer";
}) {
  // GST disabled for now
  // const { cgst, sgst } = splitCgstSgst(order.gst_paise);
  const when = new Date(order.created_at).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <article className="receipt mx-auto max-w-[420px] bg-white text-[#12263a]">
      <header className="receipt-header text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={56} height={56} className="receipt-logo mx-auto" />
        <h1 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em]">Maya Fish Mart</h1>
        <p className="text-[0.75rem] text-[#5b6b7c]">Fresh catch · Pickup only · Serving since 2004</p>
        <p className="mt-1 text-[0.7rem] text-[#7a8a9a]">
          {variant === "admin" ? "Staff receipt" : "Customer receipt"} · IST
        </p>
      </header>

      <div className="receipt-code my-4 rounded-lg bg-[#0b2a72] px-3 py-3 text-center text-white">
        <p className="text-[0.65rem] tracking-[0.14em] uppercase opacity-80">Pickup code</p>
        <p className="font-mono text-[2rem] font-bold tracking-[0.16em]">{order.pickup_code}</p>
      </div>

      <dl className="receipt-meta space-y-1 text-[0.8rem]">
        <div className="flex justify-between gap-3">
          <dt className="text-[#5b6b7c]">Date</dt>
          <dd className="tabular-nums">{when}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#5b6b7c]">Slot</dt>
          <dd>{order.pickup_slot}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#5b6b7c]">Customer</dt>
          <dd className="text-right">
            {order.customer_name}
            <br />
            {order.customer_phone}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#5b6b7c]">Payment</dt>
          <dd className="capitalize">
            {order.payment_method} · {order.payment_status}
          </dd>
        </div>
      </dl>

      <table className="receipt-items mt-4 w-full border-t border-[#d7dee8] pt-2 text-[0.8rem]">
        <thead>
          <tr className="text-left text-[0.65rem] uppercase tracking-wide text-[#7a8a9a]">
            <th className="py-1 font-medium">Item</th>
            <th className="py-1 font-medium text-right">Qty</th>
            <th className="py-1 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-[#eef2f7]">
              <td className="py-2 pr-2">{item.product_name}</td>
              <td className="py-2 text-right tabular-nums">
                {item.qty} {item.unit}
              </td>
              <td className="py-2 text-right tabular-nums">{formatInr(item.line_total_paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="receipt-totals mt-3 space-y-1 border-t border-[#d7dee8] pt-3 text-[0.85rem]">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatInr(order.subtotal_paise)}</span>
        </div>
        {(order.discount_paise ?? 0) > 0 && (
          <div className="flex justify-between text-[#0b6e4f]">
            <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
            <span className="tabular-nums">−{formatInr(order.discount_paise)}</span>
          </div>
        )}
        {/* GST disabled for now
        <div className="flex justify-between text-[#5b6b7c]">
          <span>CGST</span>
          <span className="tabular-nums">{formatInr(cgst)}</span>
        </div>
        <div className="flex justify-between text-[#5b6b7c]">
          <span>SGST</span>
          <span className="tabular-nums">{formatInr(sgst)}</span>
        </div>
        */}
        <div className="flex justify-between border-t border-[#d7dee8] pt-2 text-[1.05rem] font-semibold tracking-[-0.02em]">
          <span>Total</span>
          <span className="tabular-nums">{formatInr(order.total_paise)}</span>
        </div>
      </div>

      <p className="receipt-note mt-5 text-center text-[0.7rem] text-[#7a8a9a]">
        Thank you · Please present this pickup code at the counter
      </p>
    </article>
  );
}
