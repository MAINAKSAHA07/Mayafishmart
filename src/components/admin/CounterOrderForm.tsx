"use client";

import type { Product } from "@/lib/types";
import { formatInr } from "@/lib/money";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export function CounterOrderForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [name, setName] = useState("Walk-in");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () =>
      products
        .filter((p) => (qtyMap[p.id] || 0) > 0)
        .map((p) => ({ product: p, qty: qtyMap[p.id] })),
    [products, qtyMap]
  );

  const total = lines.reduce((s, l) => s + Math.round(l.qty * l.product.price_paise), 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/counter-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        customerPhone: phone || "0000000000",
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.push("/admin/orders");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input-field bg-white text-ink"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          required
        />
        <input
          className="input-field bg-white text-ink"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
        />
      </div>
      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
          >
            <div>
              <p className="text-white">{p.name}</p>
              <p className="text-xs text-foam/50">
                {formatInr(p.price_paise)} / {p.unit}
              </p>
            </div>
            <input
              type="number"
              min={0}
              step={p.unit === "kg" ? 0.25 : 1}
              className="input-field w-28 bg-white text-ink"
              value={qtyMap[p.id] || ""}
              onChange={(e) =>
                setQtyMap((m) => ({ ...m, [p.id]: Number(e.target.value) || 0 }))
              }
              placeholder="Qty"
            />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded-xl bg-aqua/20 px-4 py-3">
        <span>Total (ex GST estimate)</span>
        <span className="font-semibold text-white">{formatInr(total)}</span>
      </div>
      {error && <p className="text-sm text-coral">{error}</p>}
      <button
        type="submit"
        disabled={loading || !lines.length}
        className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create counter order"}
      </button>
    </form>
  );
}
