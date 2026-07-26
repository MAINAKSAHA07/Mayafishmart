import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { QtyPicker } from "@/components/shop/QtyPicker";
import { Logo } from "@/components/ui/Logo";
import { getAllProductSlugs, getProductBySlug, getProducts } from "@/lib/catalog";
import { formatInr } from "@/lib/money";
import {
  breadcrumbJsonLd,
  buildMetadata,
  jsonLdScript,
  productJsonLd,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return buildMetadata({ title: "Product not found", path: `/products/${slug}`, noIndex: true });
  }

  const available =
    (product.inventory?.qty_on_hand ?? 0) - (product.inventory?.reserved_qty ?? 0);
  const price = formatInr(product.price_paise);
  const description =
    product.description ??
    `Buy fresh ${product.name} at Maya Fish Mart for ${price} per ${product.unit}. Counter pickup.`;

  return buildMetadata({
    title: `${product.name} — ${price}/${product.unit}`,
    description,
    path: `/products/${product.slug}`,
    image: product.image_url,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const available =
    (product.inventory?.qty_on_hand ?? 0) - (product.inventory?.reserved_qty ?? 0);
  const related = (await getProducts(product.categories?.slug))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const category = product.categories;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Today's catch", href: "/catch" },
    ...(category
      ? [{ name: category.name, href: `/catch/${category.slug}` }]
      : []),
    { name: product.name },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript([
          breadcrumbJsonLd(
            crumbs.map((c) => ({
              name: c.name,
              path: "href" in c && c.href ? c.href : `/products/${product.slug}`,
            }))
          ),
          productJsonLd({
            name: product.name,
            slug: product.slug,
            description: product.description,
            image_url: product.image_url,
            price_paise: product.price_paise,
            unit: product.unit,
            is_active: product.is_active,
            available,
          }),
        ])}
      />

      <Breadcrumbs items={crumbs} />

      <div className="mt-2 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="overflow-hidden rounded-[1.75rem] bg-foam shadow-[var(--shadow-soft)]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={`${product.name} — fresh fish at Maya Fish Mart`}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-aqua/20 to-ocean/30">
              <Logo size={168} className="opacity-80" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          {category ? (
            <Link href={`/catch/${category.slug}`} className="eyebrow text-aqua hover:text-ocean">
              {category.name}
            </Link>
          ) : (
            <p className="eyebrow text-aqua">Fresh</p>
          )}
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
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-2xl text-ocean-deep">
            Also on ice
          </h2>
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
