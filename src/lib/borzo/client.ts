import {
  formatCustomerAddress,
  getBorzoShopConfig,
  normalizeIndiaPhone,
  rupeesToPaise,
  type CustomerAddressInput,
} from "@/lib/borzo/shop";

type BorzoPoint = {
  address: string;
  latitude?: number;
  longitude?: number;
  contact_person: { phone: string; name?: string };
  client_order_id?: string;
  note?: string;
};

type BorzoOrderPayload = {
  matter: string;
  total_weight_kg?: number;
  points: BorzoPoint[];
};

export type BorzoApiResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
  status?: number;
};

function getBaseUrl() {
  return (
    process.env.BORZO_API_BASE?.replace(/\/$/, "") ||
    "https://robotapitest-in.borzodelivery.com/api/business/1.8"
  );
}

function getToken() {
  return process.env.BORZO_API_TOKEN?.trim() || "";
}

export function isBorzoConfigured() {
  const shop = getBorzoShopConfig();
  return Boolean(getToken() && shop.phone);
}

async function borzoPost<T>(path: string, body: unknown): Promise<BorzoApiResult<T>> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: "Borzo is not configured (missing BORZO_API_TOKEN)" };
  }

  const res = await fetch(`${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-DV-Auth-Token": token,
    },
    body: JSON.stringify(body),
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Borzo returned non-JSON (${res.status})`, status: res.status };
  }

  if (!res.ok || json.is_successful === false) {
    const errors = json.errors;
    const message =
      typeof errors === "string"
        ? errors
        : Array.isArray(errors)
          ? errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("; ")
          : errors
            ? JSON.stringify(errors)
            : `Borzo request failed (${res.status})`;
    return { ok: false, error: message, status: res.status };
  }

  return { ok: true, data: json as T };
}

export function buildDeliveryPoints(opts: {
  customerPhone: string;
  customerName?: string;
  address: CustomerAddressInput;
  clientOrderId?: string;
}): { ok: true; payload: Pick<BorzoOrderPayload, "points"> } | { ok: false; error: string } {
  const shop = getBorzoShopConfig();
  if (!shop.phone) {
    return { ok: false, error: "Shop phone is not configured (BORZO_SHOP_PHONE)" };
  }
  const shopPhone = normalizeIndiaPhone(shop.phone);
  const customerPhone = normalizeIndiaPhone(opts.customerPhone);
  if (shopPhone.length < 12) {
    return { ok: false, error: "Invalid BORZO_SHOP_PHONE — use a 10-digit Indian mobile" };
  }
  if (customerPhone.length < 12) {
    return { ok: false, error: "Enter a valid 10-digit mobile number for delivery" };
  }

  return {
    ok: true,
    payload: {
      points: [
        {
          address: shop.address,
          latitude: shop.lat,
          longitude: shop.lng,
          contact_person: { phone: shopPhone, name: "Maya Fish Mart" },
        },
        {
          address: formatCustomerAddress(opts.address),
          contact_person: {
            phone: customerPhone,
            name: opts.customerName?.trim() || undefined,
          },
          client_order_id: opts.clientOrderId,
        },
      ],
    },
  };
}

export type BorzoCalculateResponse = {
  is_successful?: boolean;
  order?: {
    payment_amount?: string;
    delivery_fee_amount?: string;
    status?: string;
    points?: Array<{ address?: string; latitude?: string; longitude?: string }>;
  };
};

export async function calculateDelivery(opts: {
  customerPhone: string;
  customerName?: string;
  address: CustomerAddressInput;
  totalWeightKg?: number;
}): Promise<
  BorzoApiResult<{
    deliveryFeePaise: number;
    paymentAmountPaise: number;
    points: Array<{ address?: string; latitude?: string; longitude?: string }>;
  }>
> {
  const built = buildDeliveryPoints(opts);
  if (!built.ok) return built;

  const body: BorzoOrderPayload = {
    matter: "Fresh fish order",
    points: built.payload.points,
  };
  if (opts.totalWeightKg && opts.totalWeightKg > 0) {
    body.total_weight_kg = Math.max(1, Math.ceil(opts.totalWeightKg));
  }

  const result = await borzoPost<BorzoCalculateResponse>("/calculate-order", body);
  if (!result.ok) return result;

  const order = result.data.order;
  const fee = rupeesToPaise(order?.delivery_fee_amount ?? order?.payment_amount);
  return {
    ok: true,
    data: {
      deliveryFeePaise: fee,
      paymentAmountPaise: rupeesToPaise(order?.payment_amount),
      points: order?.points ?? [],
    },
  };
}

export type BorzoCreateResponse = {
  is_successful?: boolean;
  order?: {
    order_id?: number;
    status?: string;
    points?: Array<{
      tracking_url?: string | null;
      delivery?: { status?: string; tracking_url?: string | null } | null;
    }>;
  };
};

export async function createDelivery(opts: {
  pickupCode: string;
  customerPhone: string;
  customerName?: string;
  address: CustomerAddressInput;
  totalWeightKg?: number;
}): Promise<
  BorzoApiResult<{
    borzoOrderId: number;
    status: string | null;
    trackingUrl: string | null;
    deliveryFeePaise: number;
  }>
> {
  const built = buildDeliveryPoints({
    ...opts,
    clientOrderId: opts.pickupCode,
  });
  if (!built.ok) return built;

  const body: BorzoOrderPayload = {
    matter: `Fresh fish — ${opts.pickupCode}`,
    points: built.payload.points,
  };
  if (opts.totalWeightKg && opts.totalWeightKg > 0) {
    body.total_weight_kg = Math.max(1, Math.ceil(opts.totalWeightKg));
  }

  const result = await borzoPost<BorzoCreateResponse>("/create-order", body);
  if (!result.ok) return result;

  const order = result.data.order;
  const borzoOrderId = order?.order_id;
  if (!borzoOrderId) {
    return { ok: false, error: "Borzo create-order returned no order_id" };
  }

  const drop = order?.points?.[1];
  const trackingUrl =
    drop?.tracking_url || drop?.delivery?.tracking_url || null;

  return {
    ok: true,
    data: {
      borzoOrderId,
      status: order?.status ?? drop?.delivery?.status ?? null,
      trackingUrl,
      deliveryFeePaise: 0,
    },
  };
}

export type BorzoCourier = {
  courier_id?: number;
  name?: string | null;
  surname?: string | null;
  middlename?: string | null;
  phone?: string | null;
  photo_url?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export async function getCourier(
  borzoOrderId: number
): Promise<BorzoApiResult<{ courier: BorzoCourier | null }>> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: "Borzo is not configured (missing BORZO_API_TOKEN)" };
  }

  const url = `${getBaseUrl()}/courier?order_id=${encodeURIComponent(String(borzoOrderId))}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-DV-Auth-Token": token },
    cache: "no-store",
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Borzo returned non-JSON (${res.status})`, status: res.status };
  }

  if (!res.ok || json.is_successful === false) {
    const errors = json.errors;
    const message =
      typeof errors === "string"
        ? errors
        : errors
          ? JSON.stringify(errors)
          : `Borzo courier request failed (${res.status})`;
    return { ok: false, error: message, status: res.status };
  }

  return {
    ok: true,
    data: { courier: (json.courier as BorzoCourier | null) ?? null },
  };
}

/** Refresh tracking URL + status from Borzo orders list for one order_id */
export async function refreshBorzoOrder(
  borzoOrderId: number
): Promise<
  BorzoApiResult<{ status: string | null; trackingUrl: string | null }>
> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: "Borzo is not configured (missing BORZO_API_TOKEN)" };
  }

  // List endpoint with order_id filter isn't documented; use orders and find, or courier alone.
  // Prefer dedicated fetch via orders? — docs show GET /orders. Filter client-side if needed.
  const url = `${getBaseUrl()}/orders`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-DV-Auth-Token": token },
    cache: "no-store",
  });

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: `Borzo returned non-JSON (${res.status})`, status: res.status };
  }

  if (!res.ok || json.is_successful === false) {
    return {
      ok: false,
      error: typeof json.errors === "string" ? json.errors : "Failed to load Borzo orders",
      status: res.status,
    };
  }

  const orders = (json.orders as Array<Record<string, unknown>> | undefined) ?? [];
  const match = orders.find((o) => Number(o.order_id) === borzoOrderId);
  if (!match) {
    return { ok: true, data: { status: null, trackingUrl: null } };
  }

  const points = (match.points as Array<Record<string, unknown>> | undefined) ?? [];
  let trackingUrl: string | null = null;
  for (const p of points) {
    if (typeof p.tracking_url === "string" && p.tracking_url) {
      trackingUrl = p.tracking_url;
    }
    const delivery = p.delivery as { tracking_url?: string } | null | undefined;
    if (delivery?.tracking_url) trackingUrl = delivery.tracking_url;
  }

  return {
    ok: true,
    data: {
      status: typeof match.status === "string" ? match.status : null,
      trackingUrl,
    },
  };
}
