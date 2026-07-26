"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart/store";
import type { Product } from "@/lib/types";

export function QtyPicker({ product, disabled }: { product: Product; disabled?: boolean }) {
  const min = product.min_order_qty > 0 ? product.min_order_qty : 1;
  const [qty, setQty] = useState(min);
  const addItem = useCart((s) => s.addItem);

  return (
    <div className="mt-6 flex items-center gap-3">
      <label className="label mb-0" htmlFor="qty">
        Qty ({product.unit})
      </label>
      <input
        id="qty"
        type="number"
        min={min}
        step={0.5}
        value={qty}
        disabled={disabled}
        onChange={(e) => setQty(Number(e.target.value))}
        className="input-field w-28"
      />
      <button
        type="button"
        disabled={disabled || !qty || qty < min}
        className="btn-secondary !py-2 text-sm disabled:opacity-50"
        onClick={() => addItem(product, qty >= min ? qty : min)}
      >
        Add {qty || min} {product.unit}
      </button>
    </div>
  );
}
