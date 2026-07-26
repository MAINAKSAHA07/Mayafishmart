import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/ProductCard";
import { Breadcrumbs } from "@/components/shop/Breadcrumbs";
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
} from "@/lib/catalog";
import {
  breadcrumbJsonLd,
  buildMetadata,
  jsonLdScript,
} from "@/lib/seo";

type Props = { params: Promise<{ category: string }> };

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return buildMetadata({ title: "Category not found", path: `/catch/${slug}`, noIndex: true });
  }
  const description =
    category.description ??
    `Shop fresh ${category.name.toLowerCase()} at Maya Fish Mart. Order online for counter pickup.`;
  return buildMetadata({
    title: category.name,
    description,
    path: `/catch/${category.slug}`,
  });
}

export default async function CatchCategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const [category, categories, products] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getProducts(slug),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Today's catch", path: "/catch" },
            { name: category.name, path: `/catch/${category.slug}` },
          ])
        )}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Today's catch", href: "/catch" },
          { name: category.name },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">{category.name}</h1>
        <p className="mt-2 max-w-2xl text-[0.975rem] leading-relaxed text-muted">
          {category.description ?? "Fresh catch for counter pickup."}
        </p>
      </header>

      <div className="mb-10 flex flex-wrap gap-2" role="navigation" aria-label="Categories">
        <Link href="/catch" className="chip chip-idle">
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catch/${c.slug}`}
            className={`chip ${c.slug === category.slug ? "chip-active" : "chip-idle"}`}
            aria-current={c.slug === category.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {products.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="surface-solid p-10 text-center text-muted">
          Nothing in this category today.{" "}
          <Link href="/catch" className="text-aqua hover:underline">
            Browse all catch
          </Link>
        </p>
      )}
    </div>
  );
}
