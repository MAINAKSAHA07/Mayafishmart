"use client";

import type { Order } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(payload: Record<string, string>) {
    setLoading(true);
    await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    router.refresh();
  }

  function printSlip() {
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return;
    w.document.write(`
      <html><head><title>Pickup ${order.pickup_code}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;padding:28px;color:#12263a}
        h1{font-size:22px;letter-spacing:-0.02em;margin:0 0 12px}
        .code{font-size:40px;letter-spacing:0.12em;font-weight:700;margin:8px 0 16px}
        p{margin:6px 0;line-height:1.45}
      </style>
      </head><body>
      <h1>Maya Fish Mart</h1>
      <p class="code">${order.pickup_code}</p>
      <p>${order.customer_name}<br/>${order.customer_phone}</p>
      <p>${order.pickup_slot}</p>
      <p>Total: ₹${(order.total_paise / 100).toFixed(2)} · ${order.payment_method} / ${order.payment_status}</p>
      <script>window.print()</script>
      </body></html>
    `);
    w.document.close();
  }

  const btn =
    "pressable rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide disabled:opacity-50";

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {order.status === "placed" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update({ status: "confirmed" })}
          className={`${btn} bg-aqua text-ocean-deep`}
        >
          Confirm
        </button>
      )}
      {(order.status === "placed" || order.status === "confirmed") && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update({ status: "ready" })}
          className={`${btn} bg-white/15 text-white`}
        >
          Mark ready
        </button>
      )}
      {order.status === "ready" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update({ status: "picked_up", payment_status: "paid" })}
          className={`${btn} bg-coral text-white`}
        >
          Picked up
        </button>
      )}
      {order.payment_status === "pending" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update({ payment_status: "paid" })}
          className={`${btn} bg-white/15 text-white`}
        >
          Mark paid
        </button>
      )}
      {order.status !== "cancelled" && order.status !== "picked_up" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => update({ status: "cancelled" })}
          className={`${btn} text-coral ring-1 ring-coral/40`}
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={printSlip}
        className={`${btn} text-foam/80 ring-1 ring-white/20`}
      >
        Print slip
      </button>
    </div>
  );
}
