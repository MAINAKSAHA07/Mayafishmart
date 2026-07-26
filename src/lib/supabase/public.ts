import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for public catalog reads.
 * Safe in generateStaticParams / SSG — does not call next/headers cookies().
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
