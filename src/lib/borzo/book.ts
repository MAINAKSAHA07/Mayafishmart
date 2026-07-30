import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDelivery, createDelivery } from "@/lib/borzo/client";
import type { CustomerAddressInput } from "@/lib/borzo/shop";

type Admin = ReturnType<typeof createAdminClient>;

export async function quoteDeliveryFee(opts: {
  phone: string;
  fullName?: string;
  address: CustomerAddressInput;
  totalWeightKg?: number;
}): Promise<{ ok: true; deliveryFeePaise: number } | { ok: false; error: string }> {
  const result = await calculateDelivery({
    customerPhone: opts.phone,
    customerName: opts.fullName,
    address: opts.address,
    totalWeightKg: opts.totalWeightKg,
  });
  if (!result.ok) return result;
  return { ok: true, deliveryFeePaise: result.data.deliveryFeePaise };
}

/** Book Borzo for a Maya order. Idempotent if borzo_order_id already set. */
export async function bookBorzoForOrder(
  admin: Admin,
  order: {
    id: string;
    pickup_code: string;
    customer_phone: string;
    customer_name: string;
    customer_address: CustomerAddressInput;
    borzo_order_id?: number | null;
    fulfillment?: string;
  },
  totalWeightKg?: number
): Promise<{ ok: true; borzoOrderId: number } | { ok: false; error: string }> {
  if (order.fulfillment && order.fulfillment !== "delivery") {
    return { ok: false, error: "Not a delivery order" };
  }
  if (order.borzo_order_id) {
    return { ok: true, borzoOrderId: order.borzo_order_id };
  }

  const created = await createDelivery({
    pickupCode: order.pickup_code,
    customerPhone: order.customer_phone,
    customerName: order.customer_name,
    address: order.customer_address,
    totalWeightKg,
  });

  if (!created.ok) {
    await admin
      .from("orders")
      .update({
        borzo_delivery_status: "booking_failed",
        notes: `Borzo booking failed: ${created.error}`.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    return created;
  }

  await admin
    .from("orders")
    .update({
      borzo_order_id: created.data.borzoOrderId,
      borzo_delivery_status: created.data.status ?? "new",
      borzo_tracking_url: created.data.trackingUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  return { ok: true, borzoOrderId: created.data.borzoOrderId };
}
