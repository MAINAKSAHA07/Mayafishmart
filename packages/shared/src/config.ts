export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  if (url.includes("your-project")) return false;
  if (anon.includes("your-anon-key") || anon.length < 40) return false;
  return true;
}

export function getStorefrontUrl() {
  return (process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getAdminUrl() {
  return (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001").replace(/\/$/, "");
}
