"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function InventoryAdjustForm({
  products,
}: {
  products: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: form.get("productId"),
        delta: Number(form.get("delta")),
        reason: form.get("reason"),
        note: form.get("note"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Stock updated");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 sm:grid-cols-4"
    >
      <select name="productId" required className="input-field bg-white text-ink">
        <option value="">Product</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        name="delta"
        type="number"
        step="0.1"
        required
        placeholder="Delta (+/-)"
        className="input-field bg-white text-ink"
      />
      <select name="reason" className="input-field bg-white text-ink" defaultValue="adjustment">
        <option value="restock">Restock</option>
        <option value="adjustment">Adjustment</option>
        <option value="waste">Waste</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep"
      >
        {loading ? "…" : "Apply"}
      </button>
      <input
        name="note"
        placeholder="Note"
        className="input-field bg-white text-ink sm:col-span-4"
      />
      {msg && <p className="text-sm text-aqua sm:col-span-4">{msg}</p>}
    </form>
  );
}
