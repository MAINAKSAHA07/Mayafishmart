"use client";

import type { Product } from "@mayafishmart/shared/types";
import { formatInr } from "@mayafishmart/shared/money";
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
    const res = await fetch("/api/counter-order", {
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
    router.push("/orders");
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
              inputMode="decimal"
              className="input-field w-full max-w-[8rem] bg-white text-ink"
              value={qtyMap[p.id] || ""}
              onChange={(e) =>
                setQtyMap((m) => ({ ...m, [p.id]: Number(e.target.value) || 0 }))
              }
              placeholder="Qty"
              aria-label={`Quantity for ${p.name}`}
            />
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 space-y-3 border-t border-white/10 bg-[#08183c]/90 px-4 py-3 backdrop-blur-xl safe-b sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex items-center justify-between rounded-xl bg-aqua/20 px-4 py-3">
          <span>Total</span>
          <span className="font-semibold text-white">{formatInr(total)}</span>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          disabled={loading || !lines.length}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create counter order"}
        </button>
      </div>
    </form>
  );
}
