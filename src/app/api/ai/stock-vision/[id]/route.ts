import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WRITE_STAFF_ROLES } from "@/lib/types";

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
    const { data, error } = await admin
      .from("stock_scans")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
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
    }>;

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
      await admin.from("inventory_movements").insert({
        product_id: u.product_id,
        delta,
        reason: "image_scan",
        actor_id: user.id,
        note: `Applied stock scan ${id}`,
        image_path: scan.image_path,
      });
    }

    const { data, error } = await admin
      .from("stock_scans")
      .update({
        status: "applied",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ scan: data });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
