import { createClient } from "@/lib/supabase/server";
import { DEMO_CATEGORIES, DEMO_PRODUCTS, isSupabaseConfigured } from "@/lib/demo-data";
import type { Category, Product } from "@/lib/types";

export async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return DEMO_CATEGORIES;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error || !data?.length) return DEMO_CATEGORIES;
    return data as Category[];
  } catch {
    return DEMO_CATEGORIES;
  }
}

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) {
    return categorySlug
      ? DEMO_PRODUCTS.filter((p) => p.categories?.slug === categorySlug)
      : DEMO_PRODUCTS;
  }
  try {
    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select("*, categories(*), inventory(*)")
      .eq("is_active", true)
      .order("name");

    const { data, error } = await query;
    if (error || !data?.length) return DEMO_PRODUCTS;

    const products = data as Product[];
    if (categorySlug) {
      return products.filter((p) => p.categories?.slug === categorySlug);
    }
    return products;
  } catch {
    return DEMO_PRODUCTS;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(*), inventory(*)")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) {
      return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
    }
    return data as Product;
  } catch {
    return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  }
}
