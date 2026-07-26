import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { WRITE_STAFF_ROLES } from "@mayafishmart/shared/types";

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

  const body = await request.json();
  const admin = createAdminClient();

  const { data: existing } = await admin.from("orders").select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, string> = {};
  if (body.status) updates.status = body.status;
  if (body.payment_status) updates.payment_status = body.payment_status;

  // On pickup or cancel, adjust inventory reservation
  if (body.status === "picked_up" || body.status === "cancelled") {
    const { data: items } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", id);

    for (const item of items ?? []) {
      const { data: inv } = await admin
        .from("inventory")
        .select("*")
        .eq("product_id", item.product_id)
        .single();
      if (!inv) continue;

      if (body.status === "picked_up") {
        await admin
          .from("inventory")
          .update({
            qty_on_hand: Math.max(0, Number(inv.qty_on_hand) - Number(item.qty)),
            reserved_qty: Math.max(0, Number(inv.reserved_qty) - Number(item.qty)),
          })
          .eq("product_id", item.product_id);
        await admin.from("inventory_movements").insert({
          product_id: item.product_id,
          delta: -Number(item.qty),
          reason: "sale",
          actor_id: user.id,
          note: `Sold order ${existing.pickup_code}`,
        });
      } else if (body.status === "cancelled") {
        await admin
          .from("inventory")
          .update({
            reserved_qty: Math.max(0, Number(inv.reserved_qty) - Number(item.qty)),
          })
          .eq("product_id", item.product_id);
        await admin.from("inventory_movements").insert({
          product_id: item.product_id,
          delta: Number(item.qty),
          reason: "release",
          actor_id: user.id,
          note: `Released order ${existing.pickup_code}`,
        });
      }
    }
  }

  const { data, error } = await admin
    .from("orders")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data });
}
