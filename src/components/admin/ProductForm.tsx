"use client";

import type { Category } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {open ? "Close" : "Add product"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:grid-cols-2">
          <input name="name" required placeholder="Name" className="input-field bg-white text-ink" />
          <input name="slug" required placeholder="slug" className="input-field bg-white text-ink" />
          <select name="category_id" className="input-field bg-white text-ink">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="price_rupees"
            type="number"
            step="0.01"
            required
            placeholder="Price ₹"
            className="input-field bg-white text-ink"
          />
          <select name="unit" className="input-field bg-white text-ink" defaultValue="kg">
            <option value="kg">kg</option>
            <option value="piece">piece</option>
          </select>
          <input
            name="qty_on_hand"
            type="number"
            step="0.1"
            defaultValue={10}
            placeholder="Initial stock"
            className="input-field bg-white text-ink"
          />
          <textarea
            name="description"
            placeholder="Description"
            className="input-field bg-white text-ink sm:col-span-2"
            rows={2}
          />
          <input name="image" type="file" accept="image/*" className="text-sm text-foam/80 sm:col-span-2" />
          {error && <p className="text-sm text-coral sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep sm:col-span-2"
          >
            {loading ? "Saving…" : "Save product"}
          </button>
        </form>
      )}
    </div>
  );
}
