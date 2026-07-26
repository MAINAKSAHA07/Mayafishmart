import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { WRITE_STAFF_ROLES } from "@mayafishmart/shared/types";
import { purgeExpiredStockScanImages } from "@/lib/stock-scan-images";

/**
 * Purge expired stock-scan images.
 * - Staff session: allowed
 * - Or Authorization: Bearer $CRON_SECRET / x-cron-secret header
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-cron-secret");
  const cronOk = Boolean(cronSecret && (bearer === cronSecret || headerSecret === cronSecret));

  if (!cronOk) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !WRITE_STAFF_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await purgeExpiredStockScanImages(100);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  return POST(request);
}
