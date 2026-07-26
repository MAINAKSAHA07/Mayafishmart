"use client";

import { useCart } from "@/lib/cart/store";
import type { Product } from "@/lib/types";
import { Pressable } from "@/components/ui/Motion";
import { useState } from "react";

export function AddToCartButton({
  product,
  disabled,
  qty,
}: {
  product: Product;
  disabled?: boolean;
  qty?: number;
}) {
  const addItem = useCart((s) => s.addItem);
  const [added, setAdded] = useState(false);

  return (
    <Pressable
      disabled={disabled}
      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      onClick={() => {
        addItem(product, qty);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 900);
      }}
    >
      {disabled ? "Sold out" : added ? "Added" : "Add to cart"}
    </Pressable>
  );
}
