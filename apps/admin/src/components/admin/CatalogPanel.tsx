"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Product } from "@mayafishmart/shared/types";
import { formatInr } from "@mayafishmart/shared/money";
import { ProductForm } from "@/components/admin/ProductForm";

function AvailabilityToggle({ product }: { product: Product }) {
  const router = useRouter();
  const [active, setActive] = useState(product.is_active !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !active;
    setSaving(true);
    setError(null);
    setActive(next);
    try {
      const res = await fetch("/api/products/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, is_active: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }
      router.refresh();
    } catch (err) {
      setActive(!next);
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={`Mark ${product.name} ${active ? "not available" : "available"}`}
        onClick={toggle}
        disabled={saving}
        className={`pressable relative inline-flex h-11 w-full min-w-[7.5rem] items-center rounded-full px-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors disabled:opacity-60 sm:w-[7.5rem] ${
          active ? "bg-aqua text-ocean-deep" : "bg-white/15 text-foam/70"
        }`}
      >
        <span className={`relative z-10 ${active ? "ml-2" : "ml-auto mr-2"}`}>
          {active ? "Available" : "Hidden"}
        </span>
        <span
          className={`absolute top-1 h-9 w-9 rounded-full bg-white shadow transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            active ? "left-[calc(100%-2.5rem)]" : "left-1"
          }`}
        />
      </button>
      {error && <span className="mt-1 text-[10px] text-coral">{error}</span>}
    </div>
  );
}

export function CatalogPanel({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div>
      <ProductForm categories={categories} />

      {editing && (
        <div className="mt-6">
          <h2 className="font-display text-xl text-white">Edit · {editing.name}</h2>
          <ProductForm
            categories={categories}
            product={editing}
            mode="edit"
            open
            onClose={() => setEditing(null)}
          />
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {products.map((p) => {
          const active = p.is_active !== false;
          return (
            <li
              key={p.id}
              className={`ops-card transition-colors ${
                active ? "" : "border-coral/35 bg-coral/10"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {p.name}
                    {!active && (
                      <span className="ml-2 rounded-full bg-coral/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coral">
                        Not available
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-foam/60">
                    {p.categories?.name ?? "—"} · /{p.slug} · stock{" "}
                    {p.inventory?.qty_on_hand ?? 0} {p.unit}
                  </p>
                  <p className="mt-1 text-sm text-aqua sm:hidden">
                    {formatInr(p.price_paise)} / {p.unit}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <p className="hidden text-aqua sm:block">
                    {formatInr(p.price_paise)} / {p.unit}
                  </p>
                  <AvailabilityToggle product={p} />
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="ops-action w-full bg-white/10 text-foam hover:bg-white/15 sm:w-auto"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
