"use client";

import type { Category, Product } from "@mayafishmart/shared/types";
import { paiseToRupees } from "@mayafishmart/shared/money";
import { slugify } from "@mayafishmart/shared/slug";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type Mode = "create" | "edit";

function inventoryQty(product?: Product | null) {
  if (!product?.inventory) return 0;
  const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
  return Number(inv?.qty_on_hand ?? 0);
}

export function ProductForm({
  categories,
  product,
  open: controlledOpen,
  onClose,
  mode = "create",
  formId,
}: {
  categories: Category[];
  product?: Product | null;
  open?: boolean;
  onClose?: () => void;
  mode?: Mode;
  formId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!product;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setSlug(product?.slug ?? "");
    setSlugTouched(isEdit);
    setError(null);
    // Bring edit form into view (was easy to miss at top of long lists)
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [open, product, isEdit]);

  function close() {
    if (onClose) onClose();
    else setInternalOpen(false);
  }

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("name", name);
    form.set("slug", slugify(slug || name));
    if (isEdit && product) form.set("id", product.id);

    const res = await fetch("/api/products", {
      method: isEdit ? "PATCH" : "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    close();
    router.refresh();
  }

  const remountKey = `${product?.id ?? "new"}-${open ? "1" : "0"}`;

  const form = open ? (
    <form
      id={formId}
      key={remountKey}
      onSubmit={onSubmit}
      className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:grid-cols-2"
    >
      <input
        name="name"
        required
        placeholder="Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="input-field bg-white text-ink"
      />
      <div>
        <input
          name="slug"
          required
          placeholder="slug (auto)"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="input-field bg-white text-ink"
        />
        <p className="mt-1 text-[11px] text-foam/50">Auto from name — edit only if needed</p>
      </div>
      <select
        name="category_id"
        className="input-field bg-white text-ink"
        defaultValue={product?.category_id ?? ""}
      >
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
        defaultValue={product ? paiseToRupees(product.price_paise) : undefined}
        className="input-field bg-white text-ink"
      />
      <select
        name="unit"
        className="input-field bg-white text-ink"
        defaultValue={product?.unit ?? "kg"}
      >
        <option value="kg">kg</option>
        <option value="piece">piece</option>
      </select>
      <input
        name="qty_on_hand"
        type="number"
        step="0.1"
        min={0}
        defaultValue={isEdit ? inventoryQty(product) : 10}
        placeholder="Stock on hand"
        className="input-field bg-white text-ink"
      />
      <select
        name="is_active"
        className="input-field bg-white text-ink"
        defaultValue={product?.is_active === false ? "false" : "true"}
      >
        <option value="true">Available (visible)</option>
        <option value="false">Not available (hidden)</option>
      </select>
      <textarea
        name="description"
        placeholder="Description"
        className="input-field bg-white text-ink sm:col-span-2"
        rows={2}
        defaultValue={product?.description ?? ""}
      />
      <input
        name="cut_notes"
        placeholder="Cut notes (optional)"
        defaultValue={product?.cut_notes ?? ""}
        className="input-field bg-white text-ink sm:col-span-2"
      />
      {isEdit && product?.image_url ? (
        <p className="text-xs text-foam/55 sm:col-span-2">
          Current image kept unless you upload a new one.
        </p>
      ) : null}
      <input name="image" type="file" accept="image/*" className="text-sm text-foam/80 sm:col-span-2" />
      {error && <p className="text-sm text-coral sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep disabled:opacity-50"
        >
          {loading ? "Saving…" : isEdit ? "Update product" : "Save product"}
        </button>
        <button
          type="button"
          onClick={close}
          className="rounded-full bg-white/10 px-4 py-2 text-sm text-foam"
        >
          Cancel
        </button>
      </div>
    </form>
  ) : null;

  if (controlledOpen !== undefined) {
    return (
      <div ref={rootRef} className="mt-3">
        {form}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="mt-6">
      <button
        type="button"
        onClick={() => setInternalOpen((v) => !v)}
        className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white"
      >
        {open ? "Close" : "Add product"}
      </button>
      {form}
    </div>
  );
}
