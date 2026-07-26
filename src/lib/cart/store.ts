"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/lib/types";
import { calcGstPaise, calcLineTotalPaise } from "@/lib/money";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
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
        const addQty = qty ?? product.min_order_qty;
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
                minOrderQty: product.min_order_qty,
              },
            ],
          };
        });
      },
      updateQty: (productId, qty) => {
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, qty } : i
                ),
        }));
      },
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [] }),
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
    { name: "maya-cart" }
  )
);
