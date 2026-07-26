import type { MetadataRoute } from "next";
import { getAllCategorySlugs, getAllProductSlugs } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const [productSlugs, categorySlugs] = await Promise.all([
    getAllProductSlugs(),
    getAllCategorySlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/catch`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${base}/catch/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${base}/products/${slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
