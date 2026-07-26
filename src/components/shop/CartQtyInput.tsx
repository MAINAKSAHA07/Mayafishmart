"use client";

import { useEffect, useState } from "react";

/**
 * Local draft qty so clearing the field (or typing through 0) does not
 * instantly remove the cart line — commit on blur / Enter only.
 */
export function CartQtyInput({
  productId,
  name,
  qty,
  minOrderQty,
  unit,
  onCommit,
}: {
  productId: string;
  name: string;
  qty: number;
  minOrderQty: number;
  unit: string;
  onCommit: (productId: string, qty: number) => void;
}) {
  const min = minOrderQty > 0 ? minOrderQty : 1;
  const [draft, setDraft] = useState(String(qty));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(qty));
  }, [qty, focused]);

  function commit() {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      // Empty / zero while editing — keep the line, restore last good qty
      setDraft(String(qty));
      return;
    }
    const next = Math.round(parsed * 1000) / 1000;
    if (next < min) {
      setDraft(String(min));
      onCommit(productId, min);
      return;
    }
    setDraft(String(next));
    if (next !== qty) onCommit(productId, next);
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={0.5}
      value={draft}
      aria-label={`Quantity for ${name} (${unit})`}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className="input-field w-24"
    />
  );
}
