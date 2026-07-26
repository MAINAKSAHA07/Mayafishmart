"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/store";
import { formatInr, splitCgstSgst } from "@/lib/money";
import { useEffect, useState } from "react";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotalPaise, gstPaise, totalPaise } = useCart();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

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
        <p className="mt-3 text-muted">Add something fresh from today&apos;s catch.</p>
        <Link href="/catch" className="btn-primary mt-8 inline-flex">
          Browse catch
        </Link>
      </div>
    );
  }

  const gst = gstPaise();
  const { cgst, sgst } = splitCgstSgst(gst);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Cart</h1>
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
              <input
                type="number"
                min={item.minOrderQty}
                step={item.unit === "kg" ? 0.25 : 1}
                value={item.qty}
                aria-label={`Quantity for ${item.name}`}
                onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                className="input-field w-24"
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
        <div className="flex justify-between text-sm text-foam/70">
          <span>CGST</span>
          <span>{formatInr(cgst)}</span>
        </div>
        <div className="flex justify-between text-sm text-foam/70">
          <span>SGST</span>
          <span>{formatInr(sgst)}</span>
        </div>
        <div className="flex justify-between border-t border-white/15 pt-3 text-lg font-semibold tracking-[-0.01em]">
          <span>Total</span>
          <span>{formatInr(totalPaise())}</span>
        </div>
      </div>

      <Link href="/checkout" className="btn-primary mt-6 inline-flex w-full justify-center sm:w-auto">
        Continue to checkout
      </Link>
      <p className="mt-3 text-sm text-muted">Login required to place an order. Pickup only.</p>
    </div>
  );
}
