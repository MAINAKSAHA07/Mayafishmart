import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/seo";

/**
 * Handles Supabase email confirmation / magic-link redirects.
 * Configure Site URL + Redirect URLs in Supabase to point at production,
 * and set NEXT_PUBLIC_APP_URL on Netlify to https://mayafishmart.netlify.app
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/account";
  const site = getSiteUrl();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const dest = next.startsWith("/") ? `${site}${next}` : `${site}/account`;
  return NextResponse.redirect(dest);
}
