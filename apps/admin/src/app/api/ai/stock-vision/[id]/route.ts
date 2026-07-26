import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { WRITE_STAFF_ROLES } from "@mayafishmart/shared/types";
import { rupeesToPaise } from "@mayafishmart/shared/money";
import { imageExpiresAtForStatus } from "@/lib/stock-scan-images";

function extractPricePerKg(text: string): number | null {
  const m = text.match(/(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)\s*\/\s*kg\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function resolvePriceRupees(
  update: { suggested_price_rupees?: number | null; notes?: string },
  transcribed?: string | null,
): number | null {
  const direct = Number(update.suggested_price_rupees);
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct * 100) / 100;
  return extractPricePerKg(`${update.notes ?? ""} ${transcribed ?? ""}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const { action } = await request.json();
  const admin = createAdminClient();
  const { data: scan } = await admin.from("stock_scans").select("*").eq("id", id).single();
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scan.status !== "pending_review") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
  }

  if (action === "rejected") {
    const reviewedAt = new Date();
    const { data, error } = await admin
      .from("stock_scans")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: reviewedAt.toISOString(),
        image_expires_at: imageExpiresAtForStatus("rejected", reviewedAt),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ scan: data });
  }

  if (action === "applied") {
    const updates = scan.proposed_updates as Array<{
      product_id?: string;
      product_name: string;
      suggested_qty: number;
      suggested_price_rupees?: number | null;
      notes?: string;
    }>;
    const transcribed =
      typeof scan.raw_ai_json === "object" && scan.raw_ai_json
        ? String((scan.raw_ai_json as { transcribed_text?: string }).transcribed_text ?? "")
        : "";

    if (!updates?.length) {
      return NextResponse.json(
        { error: "No proposed stock updates to apply" },
        { status: 400 },
      );
    }

    for (const u of updates) {
      if (!u.product_id) continue;
      const { data: inv } = await admin
        .from("inventory")
        .select("*")
        .eq("product_id", u.product_id)
        .maybeSingle();
      if (!inv) continue;

      const delta = Number(u.suggested_qty) - Number(inv.qty_on_hand);
      await admin
        .from("inventory")
        .update({
          qty_on_hand: Number(u.suggested_qty),
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", u.product_id);

      const priceRupees = resolvePriceRupees(u, transcribed);
      const priceNote =
        priceRupees != null
          ? `; catalog price → ₹${priceRupees}/kg`
          : "";

      if (priceRupees != null) {
        await admin
          .from("products")
          .update({
            price_paise: rupeesToPaise(priceRupees),
            updated_at: new Date().toISOString(),
          })
          .eq("id", u.product_id);
      }

      await admin.from("inventory_movements").insert({
        product_id: u.product_id,
        delta,
        reason: "image_scan",
        actor_id: user.id,
        note: `Applied stock scan ${id}${priceNote}`,
        image_path: scan.storage_path || scan.image_path,
      });
    }

    const reviewedAt = new Date();
    const { data, error } = await admin
      .from("stock_scans")
      .update({
        status: "applied",
        reviewed_by: user.id,
        reviewed_at: reviewedAt.toISOString(),
        image_expires_at: imageExpiresAtForStatus("applied", reviewedAt),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ scan: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
