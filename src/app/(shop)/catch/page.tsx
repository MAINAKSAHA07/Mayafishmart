import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import { getCategories, getProducts } from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  buildMetadata,
  jsonLdScript,
} from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Today's catch",
  description:
    "Browse today's fresh catch at Maya Fish Mart — freshwater, seawater, prawns and shellfish. Order online for counter pickup.",
  path: "/catch",
});

export default async function CatchPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Today's catch", path: "/catch" },
          ])
        )}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Today's catch" },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Today&apos;s catch</h1>
        <p className="mt-2 max-w-2xl text-[0.975rem] leading-relaxed text-muted">
          Priced per kg or piece. Pickup at the shop or delivery — pay online or later.
        </p>
      </header>

      <div className="mb-10 flex flex-wrap gap-2" role="navigation" aria-label="Categories">
        <Link href="/catch" className="chip chip-active" aria-current="page">
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/catch/${c.slug}`} className="chip chip-idle">
            {c.name}
          </Link>
        ))}
      </div>

      {categories.map((category) => {
        const items = products.filter((p) => p.category_id === category.id);
        if (!items.length) return null;
        return (
          <section key={category.id} className="mb-14" aria-labelledby={`cat-${category.slug}`}>
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <h2 id={`cat-${category.slug}`} className="text-[1.5rem] text-ocean">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                )}
              </div>
              <Link href={`/catch/${category.slug}`} className="text-sm font-medium text-aqua hover:text-ocean">
                View all
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
