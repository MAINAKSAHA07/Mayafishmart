import { createMiddlewareClient } from "@mayafishmart/shared/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const path = request.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/api/")) {
    return response;
  }

  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["owner", "manager", "staff", "viewer"].includes(profile.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "staff_only");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)"],
};
