"use client";

import Link from "next/link";
import { CartQtyInput } from "@/components/shop/CartQtyInput";
import { useCart } from "@/lib/cart/store";
import { formatInr } from "@/lib/money";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotalPaise, totalPaise, pruneInvalid, clear } =
    useCart();
  const [ready, setReady] = useState(false);
  const [pruned, setPruned] = useState(0);

  useEffect(() => {
    const removed = pruneInvalid();
    setPruned(removed);
    setReady(true);
  }, [pruneInvalid]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-muted" aria-live="polite">
        Loading cart…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Your cart is empty</h1>
        <p className="mt-3 text-muted">
          {pruned > 0
            ? "Outdated demo items were cleared. Add fresh stock from today's catch."
            : "Add something fresh from today's catch."}
        </p>
        <Link href="/catch" className="btn-primary mt-8 inline-flex">
          Browse catch
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Cart</h1>
      {pruned > 0 && (
        <p className="mt-3 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral" role="status">
          Removed {pruned} outdated item{pruned === 1 ? "" : "s"} that couldn&apos;t be ordered.
        </p>
      )}
      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <li key={item.productId} className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xl text-ocean-deep">{item.name}</p>
              <p className="text-sm text-muted">
                {formatInr(item.pricePaise)} / {item.unit}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <CartQtyInput
                productId={item.productId}
                name={item.name}
                qty={item.qty}
                minOrderQty={item.minOrderQty || 1}
                unit={item.unit}
                onCommit={updateQty}
              />
              <p className="w-24 text-right font-semibold tracking-[-0.01em]">
                {formatInr(Math.round(item.qty * item.pricePaise))}
              </p>
              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                className="pressable px-2 py-1 text-sm font-medium text-coral"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-2 rounded-[1.35rem] bg-ocean-deep p-6 text-foam">
        <div className="flex justify-between text-sm text-foam/80">
          <span>Subtotal</span>
          <span>{formatInr(subtotalPaise())}</span>
        </div>
        {/* GST disabled for now
        <div className="flex justify-between text-sm text-foam/70">
          <span>CGST</span>
          <span>{formatInr(cgst)}</span>
        </div>
        <div className="flex justify-between text-sm text-foam/70">
          <span>SGST</span>
          <span>{formatInr(sgst)}</span>
        </div>
        */}
        <div className="flex justify-between border-t border-white/15 pt-3 text-lg font-semibold tracking-[-0.01em]">
          <span>Total</span>
          <span>{formatInr(totalPaise())}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/checkout" className="btn-primary inline-flex justify-center">
          Continue to checkout
        </Link>
        <button type="button" onClick={() => clear()} className="btn-ghost">
          Clear cart
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">Guest checkout available. Pickup only.</p>
    </div>
  );
}
