import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";

type BorzoCourier = {
  courier_id?: number;
  name?: string | null;
  surname?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

function borzoBase() {
  return (
    process.env.BORZO_API_BASE?.replace(/\/$/, "") ||
    "https://robotapitest-in.borzodelivery.com/api/business/1.8"
  );
}

async function borzoGet(path: string) {
  const token = process.env.BORZO_API_TOKEN?.trim();
  if (!token) return { ok: false as const, error: "Borzo not configured" };
  const res = await fetch(`${borzoBase()}${path}`, {
    headers: { "X-DV-Auth-Token": token },
    cache: "no-store",
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json.is_successful === false) {
    return {
      ok: false as const,
      error: typeof json.errors === "string" ? json.errors : "Borzo request failed",
    };
  }
  return { ok: true as const, data: json };
}

export async function GET(
  _request: NextRequest,
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

  if (!profile || !["owner", "manager", "staff", "viewer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, fulfillment, borzo_order_id, borzo_delivery_status, borzo_tracking_url, pickup_code"
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.fulfillment !== "delivery" || !order.borzo_order_id) {
    return NextResponse.json({
      fulfillment: order.fulfillment,
      status: order.borzo_delivery_status,
      trackingUrl: order.borzo_tracking_url,
      courier: null,
    });
  }

  let trackingUrl = order.borzo_tracking_url as string | null;
  let status = order.borzo_delivery_status as string | null;

  const ordersRes = await borzoGet("/orders");
  if (ordersRes.ok) {
    const list = (ordersRes.data.orders as Array<Record<string, unknown>> | undefined) ?? [];
    const match = list.find((o) => Number(o.order_id) === Number(order.borzo_order_id));
    if (match) {
      status = typeof match.status === "string" ? match.status : status;
      const points = (match.points as Array<Record<string, unknown>> | undefined) ?? [];
      for (const p of points) {
        if (typeof p.tracking_url === "string" && p.tracking_url) trackingUrl = p.tracking_url;
        const delivery = p.delivery as { tracking_url?: string } | null | undefined;
        if (delivery?.tracking_url) trackingUrl = delivery.tracking_url;
      }
      if (trackingUrl !== order.borzo_tracking_url || status !== order.borzo_delivery_status) {
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

  const courierRes = await borzoGet(
    `/courier?order_id=${encodeURIComponent(String(order.borzo_order_id))}`
  );
  const courier =
    courierRes.ok ? ((courierRes.data.courier as BorzoCourier | null) ?? null) : null;

  return NextResponse.json({
    fulfillment: "delivery",
    borzoOrderId: order.borzo_order_id,
    pickupCode: order.pickup_code,
    status,
    trackingUrl,
    courier,
  });
}
