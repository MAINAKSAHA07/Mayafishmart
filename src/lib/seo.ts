import type { Metadata } from "next";

export const SITE_NAME = "Maya Fish Mart";
export const SITE_TAGLINE = "Serving since 2004";
export const SITE_DESCRIPTION =
  "Order fresh fish online for counter pickup at Maya Fish Mart. Rohu, pomfret, prawns and more — pay online or at the counter. Serving since 2004.";

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const DEFAULT_OG_IMAGE = {
  url: "/logo.png",
  width: 1080,
  height: 1350,
  alt: "Maya Fish Mart logo",
};

type BuildMetaInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image,
  noIndex = false,
  type = "website",
}: BuildMetaInput = {}): Metadata {
  const url = absoluteUrl(path);
  const pageTitle = title ? title : SITE_NAME;
  const ogImage = image || DEFAULT_OG_IMAGE.url;

  return {
    title: title ? { absolute: `${title} · ${SITE_NAME}` } : undefined,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      locale: "en_IN",
      url,
      siteName: SITE_NAME,
      title: pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} · ${SITE_NAME}`,
      description,
      images: [
        {
          url: absoluteUrl(ogImage),
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
          alt: DEFAULT_OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} · ${SITE_NAME}`,
      description,
      images: [absoluteUrl(ogImage)],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  };
}

export function jsonLdScript(data: Record<string, unknown> | Array<Record<string, unknown>>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FishStore",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/logo.png"),
    foundingDate: "2004",
    slogan: SITE_TAGLINE,
    priceRange: "₹₹",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, UPI, Razorpay",
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(product: {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price_paise: number;
  unit: string;
  is_active: boolean;
  available: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? `Fresh ${product.name} for pickup at Maya Fish Mart.`,
    image: product.image_url ? [product.image_url] : [absoluteUrl("/logo.png")],
    sku: product.slug,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`),
      priceCurrency: "INR",
      price: (product.price_paise / 100).toFixed(2),
      availability:
        product.is_active && product.available > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  };
}
