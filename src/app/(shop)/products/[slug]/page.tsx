import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { QtyPicker } from "@/components/shop/QtyPicker";
import { Logo } from "@/components/ui/Logo";
import { getProductBySlug, getProducts } from "@/lib/catalog";
import { formatInr } from "@/lib/money";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const available =
    (product.inventory?.qty_on_hand ?? 0) - (product.inventory?.reserved_qty ?? 0);
  const related = (await getProducts()).filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/#catch" className="nav-hit text-aqua">
        ← Back to catch
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden rounded-[1.75rem] bg-foam shadow-[var(--shadow-soft)]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-aqua/20 to-ocean/30">
              <Logo size={168} className="opacity-80" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="eyebrow text-aqua">{product.categories?.name ?? "Fresh"}</p>
          <h1 className="mt-2 text-[clamp(2.25rem,5vw,3.25rem)] text-ocean-deep">
            {product.name}
          </h1>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-muted">{product.description}</p>
          {product.cut_notes && (
            <p className="surface mt-4 px-4 py-3 text-sm leading-relaxed text-ink">
              <span className="font-semibold">Cut notes:</span> {product.cut_notes}
            </p>
          )}
          <p className="mt-6 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">
            {formatInr(product.price_paise)}
            <span className="text-base font-normal tracking-normal text-muted">
              {" "}
              / {product.unit}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            GST {product.gst_rate}% · Min {product.min_order_qty} {product.unit}
          </p>
          <p className="mt-1 text-sm text-muted">
            {available > 0 ? `${available} ${product.unit} in stock` : "Sold out today"}
          </p>
          <QtyPicker product={product} disabled={available <= 0} />
          <div className="mt-4 max-w-sm">
            <AddToCartButton product={product} disabled={available <= 0} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl text-ocean-deep">Also on ice</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="chip chip-idle">
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
