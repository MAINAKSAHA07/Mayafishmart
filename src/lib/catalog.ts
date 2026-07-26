import { DEMO_CATEGORIES, DEMO_PRODUCTS, isSupabaseConfigured } from "@/lib/demo-data";
import { createPublicClient } from "@/lib/supabase/public";
import type { Category, Product } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return DEMO_CATEGORIES;
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) {
      console.error("getCategories", error.message);
      return [];
    }
    return (data as Category[]) ?? [];
  } catch (err) {
    console.error("getCategories", err);
    return [];
  }
}

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return categorySlug
      ? DEMO_PRODUCTS.filter((p) => p.categories?.slug === categorySlug)
      : DEMO_PRODUCTS;
  }
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*), inventory(*)")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("getProducts", error.message);
      return [];
    }

    const products = (data as Product[]) ?? [];
    if (categorySlug) {
      return products.filter((p) => p.categories?.slug === categorySlug);
    }
    return products;
  } catch (err) {
    console.error("getProducts", err);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*), inventory(*)")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) {
      console.error("getProductBySlug", error.message);
      return null;
    }
    return (data as Product) ?? null;
  } catch (err) {
    console.error("getProductBySlug", err);
    return null;
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.map((p) => p.slug);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const categories = await getCategories();
  return categories.map((c) => c.slug);
}
