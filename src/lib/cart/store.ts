"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/lib/types";
import { calcGstPaise, calcLineTotalPaise } from "@/lib/money";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLiveProductId(id: string) {
  return UUID_RE.test(id);
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  /** Drop demo/stale IDs that cannot be ordered against Supabase. */
  pruneInvalid: () => number;
  subtotalPaise: () => number;
  gstPaise: () => number;
  totalPaise: () => number;
  itemCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, qty) => {
        const min = product.min_order_qty > 0 ? product.min_order_qty : 1;
        const addQty = qty && qty > 0 ? qty : min;
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, qty: Math.round((i.qty + addQty) * 1000) / 1000 }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                name: product.name,
                slug: product.slug,
                unit: product.unit,
                pricePaise: product.price_paise,
                gstRate: Number(product.gst_rate),
                imageUrl: product.image_url,
                qty: addQty,
                minOrderQty: min,
              },
            ],
          };
        });
      },
      updateQty: (productId, qty) => {
        // Never auto-remove here — cart UI commits only valid qtys;
        // explicit removeItem is the only way to drop a line.
        if (!Number.isFinite(qty) || qty <= 0) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  qty: Math.round(qty * 1000) / 1000,
                }
              : i
          ),
        }));
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [] }),
      pruneInvalid: () => {
        const before = get().items;
        const next = before.filter((i) => isLiveProductId(i.productId));
        const removed = before.length - next.length;
        if (removed > 0) set({ items: next });
        return removed;
      },
      subtotalPaise: () =>
        get().items.reduce(
          (sum, i) => sum + calcLineTotalPaise(i.qty, i.pricePaise),
          0
        ),
      gstPaise: () =>
        get().items.reduce((sum, i) => {
          const line = calcLineTotalPaise(i.qty, i.pricePaise);
          return sum + calcGstPaise(line, i.gstRate);
        }, 0),
      totalPaise: () => get().subtotalPaise() + get().gstPaise(),
      itemCount: () => get().items.length,
    }),
    {
      name: "maya-cart",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as { items?: CartItem[] } | undefined;
        return {
          items: (state?.items ?? [])
            .filter((i) => isLiveProductId(i.productId))
            .map((i) => ({
              ...i,
              minOrderQty: 1,
              qty: i.qty > 0 ? i.qty : 1,
            })),
        };
      },
    }
  )
);
