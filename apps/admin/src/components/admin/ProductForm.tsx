"use client";

import type { Category, Product } from "@mayafishmart/shared/types";
import { paiseToRupees } from "@mayafishmart/shared/money";
import { slugify } from "@mayafishmart/shared/slug";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Mode = "create" | "edit";

export function ProductForm({
  categories,
  product,
  open: controlledOpen,
  onClose,
  mode = "create",
}: {
  categories: Category[];
  product?: Product | null;
  open?: boolean;
  onClose?: () => void;
  mode?: Mode;
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

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setSlug(product?.slug ?? "");
    setSlugTouched(isEdit);
    setError(null);
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

  const form = open ? (
    <form
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
        key={`cat-${product?.id ?? "new"}-${open}`}
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
        key={`price-${product?.id ?? "new"}-${open}`}
      />
      <select
        name="unit"
        className="input-field bg-white text-ink"
        defaultValue={product?.unit ?? "kg"}
        key={`unit-${product?.id ?? "new"}-${open}`}
      >
        <option value="kg">kg</option>
        <option value="piece">piece</option>
      </select>
      {!isEdit && (
        <input
          name="qty_on_hand"
          type="number"
          step="0.1"
          defaultValue={10}
          placeholder="Initial stock"
          className="input-field bg-white text-ink"
        />
      )}
      <select
        name="is_active"
        className="input-field bg-white text-ink"
        defaultValue={product?.is_active === false ? "false" : "true"}
        key={`active-${product?.id ?? "new"}-${open}`}
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
        key={`desc-${product?.id ?? "new"}-${open}`}
      />
      <input name="image" type="file" accept="image/*" className="text-sm text-foam/80 sm:col-span-2" />
      {error && <p className="text-sm text-coral sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep"
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
    return form;
  }

  return (
    <div className="mt-6">
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
