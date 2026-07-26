import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WRITE_STAFF_ROLES } from "@/lib/types";

export async function POST(request: NextRequest) {
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

  const { productId, delta, reason, note } = await request.json();
  if (!productId || typeof delta !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: inv } = await admin
    .from("inventory")
    .select("*")
    .eq("product_id", productId)
    .single();
  if (!inv) return NextResponse.json({ error: "Inventory not found" }, { status: 404 });

  const nextQty = Number(inv.qty_on_hand) + delta;
  if (nextQty < 0) {
    return NextResponse.json({ error: "Would go negative" }, { status: 400 });
  }

  await admin
    .from("inventory")
    .update({ qty_on_hand: nextQty, updated_at: new Date().toISOString() })
    .eq("product_id", productId);

  await admin.from("inventory_movements").insert({
    product_id: productId,
    delta,
    reason: reason || "adjustment",
    actor_id: user.id,
    note: note || null,
  });

  return NextResponse.json({ ok: true, qty_on_hand: nextQty });
}
