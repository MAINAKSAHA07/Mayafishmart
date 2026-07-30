import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookBorzoForOrder } from "@/lib/borzo/book";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error: findError } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (findError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: "Payment does not match order" }, { status: 400 });
  }

  const { error } = await admin
    .from("orders")
    .update({
      payment_status: "paid",
      razorpay_payment_id,
      status: "confirmed",
    })
    .eq("id", orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let borzoWarning: string | null = null;
  if (order.fulfillment === "delivery") {
    const { data: items } = await admin
      .from("order_items")
      .select("qty, unit")
      .eq("order_id", orderId);
    let totalWeightKg = 0;
    for (const item of items ?? []) {
      if (item.unit === "kg") totalWeightKg += Number(item.qty);
      else totalWeightKg += Number(item.qty) * 0.5;
    }

    const booked = await bookBorzoForOrder(
      admin,
      {
        id: order.id,
        pickup_code: order.pickup_code,
        customer_phone: order.customer_phone,
        customer_name: order.customer_name,
        customer_address: order.customer_address,
        borzo_order_id: order.borzo_order_id,
        fulfillment: order.fulfillment,
      },
      totalWeightKg
    );
    if (!booked.ok) {
      borzoWarning = booked.error;
    }
  }

  return NextResponse.json({ ok: true, borzoWarning });
}
