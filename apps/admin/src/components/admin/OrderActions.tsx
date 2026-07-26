"use client";

import type { Order } from "@mayafishmart/shared/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(payload: Record<string, string>) {
    setLoading(true);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    router.refresh();
  }

  function printReceipt() {
    window.open(`/receipt/${order.id}?print=1`, "_blank", "noopener,noreferrer");
  }

  const btn = "ops-action disabled:opacity-50";

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
        onClick={printReceipt}
        className={`${btn} text-foam/80 ring-1 ring-white/20`}
      >
        Print receipt
      </button>
    </div>
  );
}
