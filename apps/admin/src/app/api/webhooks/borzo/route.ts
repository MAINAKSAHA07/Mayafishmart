import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import {
  type BorzoWebhookPayload,
  verifyBorzoSignature,
} from "@/lib/borzo";

export const dynamic = "force-dynamic";

/**
 * Borzo status callback.
 * Paste this URL in Borzo cabinet → Callback URL for statuses receiving:
 *   https://mayafishmart-ops.netlify.app/api/webhooks/borzo
 *
 * Auth: X-DV-Signature = HMAC-SHA256(rawBody, BORZO_CALLBACK_SECRET)
 * (Callback Secret Key from Borzo — not the same as BORZO_API_TOKEN)
 */
export async function POST(request: NextRequest) {
  const secret = process.env.BORZO_CALLBACK_SECRET;
  if (!secret) {
    console.error("borzo webhook: BORZO_CALLBACK_SECRET is not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-dv-signature");

  if (!verifyBorzoSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: BorzoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as BorzoWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event_type ?? "unknown";
  const borzoOrderId =
    payload.order?.order_id ?? payload.delivery?.order_id ?? null;
  const borzoDeliveryId = payload.delivery?.delivery_id ?? null;
  const status = payload.order?.status ?? payload.delivery?.status ?? null;

  const admin = createAdminClient();
  const { error } = await admin.from("borzo_webhook_events").insert({
    event_type: eventType,
    event_datetime: payload.event_datetime ?? null,
    borzo_order_id: borzoOrderId,
    borzo_delivery_id: borzoDeliveryId,
    status,
    payload,
  });

  if (error) {
    // Still 200 after valid signature so Borzo does not retry for 24h on our DB blips;
    // log for ops follow-up.
    console.error("borzo webhook persist failed", error.message, {
      eventType,
      borzoOrderId,
      borzoDeliveryId,
      status,
    });
  } else {
    console.info("borzo webhook ok", { eventType, borzoOrderId, borzoDeliveryId, status });
  }

  return NextResponse.json({ ok: true });
}
