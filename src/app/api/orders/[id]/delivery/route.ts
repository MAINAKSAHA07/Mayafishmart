import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCourier, refreshBorzoOrder } from "@/lib/borzo/client";

async function loadOrder(id: string, pickup?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data } = await supabase
      .from("orders")
      .select(
        "id, pickup_code, customer_id, fulfillment, borzo_order_id, borzo_delivery_status, borzo_tracking_url"
      )
      .eq("id", id)
      .maybeSingle();
    if (data) return data;
  }

  if (pickup) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .select(
        "id, pickup_code, customer_id, fulfillment, borzo_order_id, borzo_delivery_status, borzo_tracking_url"
      )
      .eq("id", id)
      .eq("pickup_code", pickup)
      .maybeSingle();
    return data;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pickup = request.nextUrl.searchParams.get("pickup");
  const order = await loadOrder(id, pickup);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (order.fulfillment !== "delivery" || !order.borzo_order_id) {
    return NextResponse.json({
      fulfillment: order.fulfillment,
      status: order.borzo_delivery_status,
      trackingUrl: order.borzo_tracking_url,
      courier: null,
    });
  }

  const admin = createAdminClient();
  let trackingUrl = order.borzo_tracking_url as string | null;
  let status = order.borzo_delivery_status as string | null;

  if (!trackingUrl) {
    const refreshed = await refreshBorzoOrder(Number(order.borzo_order_id));
    if (refreshed.ok) {
      trackingUrl = refreshed.data.trackingUrl;
      status = refreshed.data.status ?? status;
      if (trackingUrl || refreshed.data.status) {
        await admin
          .from("orders")
          .update({
            borzo_tracking_url: trackingUrl,
            borzo_delivery_status: status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);
      }
    }
  }

  const courierResult = await getCourier(Number(order.borzo_order_id));
  const courier = courierResult.ok ? courierResult.data.courier : null;

  return NextResponse.json({
    fulfillment: "delivery",
    borzoOrderId: order.borzo_order_id,
    status,
    trackingUrl,
    courier,
  });
}
