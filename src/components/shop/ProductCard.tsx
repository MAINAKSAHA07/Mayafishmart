"use client";

import Link from "next/link";
import { formatInr } from "@/lib/money";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { MotionCard } from "@/components/ui/Motion";
import { Logo } from "@/components/ui/Logo";

export function ProductCard({ product }: { product: Product }) {
  const available =
    (product.inventory?.qty_on_hand ?? 0) - (product.inventory?.reserved_qty ?? 0);

  return (
    <MotionCard className="product-card flex flex-col">
      <Link href={`/products/${product.slug}`} className="block flex-1 outline-none">
        <div className="relative aspect-[4/3] overflow-hidden bg-foam">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-aqua/25 to-ocean/35">
              <Logo size={76} className="opacity-75" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ocean-deep/75 via-ocean-deep/20 to-transparent px-4 pb-3 pt-10">
            <p className="eyebrow text-foam/90">{product.categories?.name ?? "Fresh"}</p>
          </div>
        </div>
        <div className="space-y-1.5 p-4 pb-2">
          <h3 className="font-display text-[1.35rem] text-ocean-deep">{product.name}</h3>
          <p className="text-[0.9rem] leading-relaxed text-muted line-clamp-2">
            {product.description ?? "Fresh catch, cleaned for pickup."}
          </p>
          <p className="pt-1 text-lg font-semibold tracking-[-0.01em] text-ink">
            {formatInr(product.price_paise)}
            <span className="text-sm font-normal tracking-normal text-muted">
              {" "}
              / {product.unit}
            </span>
          </p>
          <p className="text-xs text-muted">
            {available > 0 ? `${available} ${product.unit} available` : "Sold out today"}
          </p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToCartButton product={product} disabled={available <= 0} />
      </div>
    </MotionCard>
  );
}
