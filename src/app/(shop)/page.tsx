import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { RiseIn } from "@/components/ui/Motion";
import { Logo } from "@/components/ui/Logo";
import { getCategories, getProducts } from "@/lib/catalog";
import { jsonLdScript, organizationJsonLd, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const featured = products.slice(0, 6);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(organizationJsonLd())}
      />

      <section className="relative min-h-[min(88vh,820px)] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(115deg, rgba(11,42,114,0.94) 0%, rgba(22,86,196,0.7) 45%, rgba(53,179,239,0.42) 100%), url('https://images.unsplash.com/photo-1498654200943-1088dd4438ae?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="relative mx-auto flex min-h-[min(88vh,820px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24">
          <RiseIn>
            <Logo size={92} priority className="shadow-[0_8px_30px_rgba(4,18,52,0.45)]" />
          </RiseIn>
          <RiseIn delay={0.04} className="mt-5">
            <p className="eyebrow text-aqua">Fresh · Local · Pickup</p>
          </RiseIn>
          <RiseIn delay={0.08}>
            <h1 className="mt-2 max-w-[11ch] text-[clamp(2.75rem,8vw,4.75rem)] text-white">
              Maya Fish Mart
            </h1>
          </RiseIn>
          <RiseIn delay={0.12} className="mt-4 max-w-md">
            <p className="text-[1.125rem] leading-relaxed text-foam/88">
              Order today&apos;s catch online. Pay now or later. Pickup at the shop or get it
              delivered.
            </p>
          </RiseIn>
          <RiseIn delay={0.18} className="mt-8 flex flex-wrap gap-3">
            <Link href="/catch" className="btn-primary">
              Shop today&apos;s catch
            </Link>
            <Link href="/cart" className="btn-ghost">
              View cart
            </Link>
          </RiseIn>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="catch-heading">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="catch-heading" className="text-[clamp(1.75rem,4vw,2.35rem)] text-ocean-deep">
              Today&apos;s catch
            </h2>
            <p className="mt-2 text-[0.975rem] text-muted">
              Priced per kg or piece. Pickup at the shop or delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="navigation" aria-label="Categories">
            <Link href="/catch" className="chip chip-active">
              All
            </Link>
            {categories.map((c) => (
              <Link key={c.id} href={`/catch/${c.slug}`} className="chip chip-idle">
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/catch" className="btn-secondary inline-flex">
            View full catch
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-[1.75rem] bg-ocean-deep px-6 py-11 text-foam sm:px-11">
          <h2 className="text-[clamp(1.6rem,3vw,2.1rem)]">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              ["01", "Order & pay", "Share contact details at checkout, pay online or later."],
              ["02", "We prep", "Staff confirm and pack your catch for pickup or courier."],
              ["03", "Collect or receive", "Show your code at the counter, or track Borzo delivery."],
            ].map(([n, title, body]) => (
              <li key={n}>
                <span className="eyebrow text-aqua">{n}</span>
                <p className="font-display mt-2 text-xl tracking-[-0.02em]">{title}</p>
                <p className="mt-2 text-[0.925rem] leading-relaxed text-foam/70">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
