"use client";

import { useCart } from "@/lib/cart/store";
import { useEffect, useState } from "react";

export function CartBadge() {
  const itemCount = useCart((s) => s.itemCount);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(itemCount());
  }, [itemCount]);

  useEffect(() => {
    return useCart.subscribe(() => setCount(useCart.getState().itemCount()));
  }, []);

  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1.5 -right-2.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white shadow-[0_2px_6px_rgba(232,93,76,0.35)]"
      aria-label={`${count} items in cart`}
    >
      {count}
    </span>
  );
}
