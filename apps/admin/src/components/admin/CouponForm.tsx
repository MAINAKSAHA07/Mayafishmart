"use client";

import type { Coupon } from "@mayafishmart/shared/types";
import { paiseToRupees } from "@mayafishmart/shared/money";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CouponForm({
  coupon,
  mode = "create",
}: {
  coupon?: Coupon | null;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!coupon;
  const [open, setOpen] = useState(!isEdit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    if (isEdit && coupon) form.set("id", coupon.id);
    const res = await fetch("/api/coupons", {
      method: isEdit ? "PATCH" : "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    if (isEdit) setOpen(false);
    else (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className={isEdit ? "mt-3" : "mt-6"}>
      {!isEdit && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="pressable rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white"
        >
          {open ? "Close" : "Add coupon"}
        </button>
      )}
      {isEdit && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pressable rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-foam"
        >
          Edit
        </button>
      )}
      {open && (
        <form
          onSubmit={onSubmit}
          className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:grid-cols-2"
        >
          <input
            name="code"
            required
            placeholder="Code (e.g. FRESH10)"
            defaultValue={coupon?.code ?? ""}
            className="input-field bg-white text-ink uppercase"
          />
          <select
            name="type"
            defaultValue={coupon?.type ?? "percent"}
            className="input-field bg-white text-ink"
          >
            <option value="percent">Percent off</option>
            <option value="fixed">Fixed ₹ off</option>
          </select>
          <input
            name="value"
            type="number"
            step="0.01"
            required
            placeholder="Value"
            defaultValue={
              coupon
                ? coupon.type === "fixed"
                  ? paiseToRupees(Number(coupon.value))
                  : Number(coupon.value)
                : undefined
            }
            className="input-field bg-white text-ink"
          />
          <input
            name="min_subtotal_rupees"
            type="number"
            step="0.01"
            defaultValue={coupon ? paiseToRupees(coupon.min_subtotal_paise) : 0}
            placeholder="Min order ₹"
            className="input-field bg-white text-ink"
          />
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={coupon?.starts_at ? coupon.starts_at.slice(0, 16) : ""}
            className="input-field bg-white text-ink"
          />
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={coupon?.ends_at ? coupon.ends_at.slice(0, 16) : ""}
            className="input-field bg-white text-ink"
          />
          <input
            name="max_uses"
            type="number"
            min={1}
            placeholder="Max total uses"
            defaultValue={coupon?.max_uses ?? ""}
            className="input-field bg-white text-ink"
          />
          <input
            name="max_uses_per_customer"
            type="number"
            min={1}
            placeholder="Max per customer"
            defaultValue={coupon?.max_uses_per_customer ?? ""}
            className="input-field bg-white text-ink"
          />
          <select
            name="is_active"
            defaultValue={coupon?.is_active === false ? "false" : "true"}
            className="input-field bg-white text-ink sm:col-span-2"
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          {error && <p className="text-sm text-coral sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="pressable rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep"
            >
              {loading ? "Saving…" : isEdit ? "Update" : "Create coupon"}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pressable rounded-full bg-white/10 px-4 py-2 text-sm text-foam"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
