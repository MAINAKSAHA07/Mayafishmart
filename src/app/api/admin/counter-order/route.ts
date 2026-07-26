import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcGstPaise, calcLineTotalPaise } from "@/lib/money";
import { generatePickupCode, getPickupSlots } from "@/lib/pickup";
import { WRITE_STAFF_ROLES } from "@/lib/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();
  if (!profile || !WRITE_STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const items: Array<{ productId: string; qty: number }> = body.items || [];
  if (!items.length) return NextResponse.json({ error: "No items" }, { status: 400 });

  const admin = createAdminClient();
  const ids = items.map((i) => i.productId);
  const { data: products } = await admin.from("products").select("*, inventory(*)").in("id", ids);
  if (!products?.length) return NextResponse.json({ error: "Products missing" }, { status: 400 });

  const map = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  let gstTotal = 0;
  const lineItems = [];

  for (const item of items) {
    const product = map.get(item.productId);
    if (!product) continue;
    const line = calcLineTotalPaise(item.qty, product.price_paise);
    const gst = calcGstPaise(line, Number(product.gst_rate));
    subtotal += line;
    gstTotal += gst;
    lineItems.push({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      qty: item.qty,
      unit_price_paise: product.price_paise,
      gst_rate: Number(product.gst_rate),
      line_total_paise: line,
    });
  }

  const pickupCode = generatePickupCode();
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      pickup_code: pickupCode,
      customer_id: user.id,
      status: "confirmed",
      fulfillment: "pickup",
      pickup_slot: getPickupSlots(1)[0] || "ASAP counter",
      payment_method: "counter",
      payment_status: "pending",
      subtotal_paise: subtotal,
      gst_paise: gstTotal,
      total_paise: subtotal + gstTotal,
      customer_name: body.customerName || "Walk-in",
      customer_email: profile.email || "counter@mayafishmart.local",
      customer_phone: body.customerPhone || "0000000000",
      customer_address: {
        line1: "Counter sale",
        city: "Local",
        state: "NA",
        pincode: "000000",
      },
      notes: "Created at counter",
    })
    .select("*")
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }

  await admin.from("order_items").insert(lineItems.map((li) => ({ ...li, order_id: order.id })));

  for (const item of items) {
    const product = map.get(item.productId);
    const inv = product
      ? Array.isArray(product.inventory)
        ? product.inventory[0]
        : product.inventory
      : null;
    if (!inv) continue;
    await admin
      .from("inventory")
      .update({
        qty_on_hand: Math.max(0, Number(inv.qty_on_hand) - item.qty),
      })
      .eq("product_id", item.productId);
    await admin.from("inventory_movements").insert({
      product_id: item.productId,
      delta: -item.qty,
      reason: "sale",
      actor_id: user.id,
      note: `Counter ${pickupCode}`,
    });
  }

  return NextResponse.json({ order });
}
