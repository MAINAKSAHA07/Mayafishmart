import { createHmac, timingSafeEqual } from "crypto";

export function verifyBorzoSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type BorzoWebhookPayload = {
  event_datetime?: string;
  event_type?: string;
  order?: {
    order_id?: number;
    status?: string;
    [key: string]: unknown;
  };
  delivery?: {
    delivery_id?: number;
    order_id?: number;
    status?: string;
    [key: string]: unknown;
  };
};
