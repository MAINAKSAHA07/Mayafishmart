import type { Coupon, PriceSummary } from "./types";
import {
  calcDiscountPaise,
  calcGstAfterDiscount,
  normalizeCouponCode,
} from "./money";

export type CouponAdminClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string | boolean) => {
        maybeSingle: () => Promise<{ data: Coupon | null; error: { message: string } | null }>;
        select?: never;
      };
    };
  };
};

type CountResult = { count: number | null; error: { message: string } | null };

export type CouponLookupDeps = {
  findCouponByCode: (code: string) => Promise<Coupon | null>;
  countRedemptions: (couponId: string) => Promise<number>;
  countCustomerRedemptions: (couponId: string, customerId: string) => Promise<number>;
};

export function buildPriceSummary(
  subtotalPaise: number,
  preDiscountGstPaise: number,
  coupon: Coupon | null,
  discountPaise = 0
): PriceSummary {
  const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
  const gstPaise = calcGstAfterDiscount(subtotalPaise, discountPaise, preDiscountGstPaise);
  return {
    subtotalPaise,
    discountPaise,
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
    coupon,
  };
}

export async function validateCouponForOrder(
  deps: CouponLookupDeps,
  opts: {
    code: string | null | undefined;
    customerId?: string | null;
    subtotalPaise: number;
    preDiscountGstPaise: number;
    now?: Date;
  }
): Promise<{ ok: true; summary: PriceSummary } | { ok: false; error: string }> {
  const raw = opts.code?.trim();
  if (!raw) {
    return {
      ok: true,
      summary: buildPriceSummary(opts.subtotalPaise, opts.preDiscountGstPaise, null, 0),
    };
  }

  const code = normalizeCouponCode(raw);
  const coupon = await deps.findCouponByCode(code);
  if (!coupon || !coupon.is_active) {
    return { ok: false, error: "Invalid or inactive coupon code" };
  }

  const now = opts.now ?? new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { ok: false, error: "This coupon is not active yet" };
  }
  if (coupon.ends_at && new Date(coupon.ends_at) < now) {
    return { ok: false, error: "This coupon has expired" };
  }
  if (opts.subtotalPaise < Number(coupon.min_subtotal_paise || 0)) {
    const min = Number(coupon.min_subtotal_paise) / 100;
    return {
      ok: false,
      error: `Minimum order of ₹${min.toFixed(2)} required for this coupon`,
    };
  }

  if (coupon.max_uses != null) {
    const totalUses = await deps.countRedemptions(coupon.id);
    if (totalUses >= Number(coupon.max_uses)) {
      return { ok: false, error: "This coupon has reached its usage limit" };
    }
  }

  if (coupon.max_uses_per_customer != null && opts.customerId) {
    const customerUses = await deps.countCustomerRedemptions(coupon.id, opts.customerId);
    if (customerUses >= Number(coupon.max_uses_per_customer)) {
      return { ok: false, error: "You have already used this coupon the maximum times" };
    }
  }

  const discountPaise = calcDiscountPaise(
    opts.subtotalPaise,
    coupon.type,
    Number(coupon.value)
  );

  return {
    ok: true,
    summary: buildPriceSummary(
      opts.subtotalPaise,
      opts.preDiscountGstPaise,
      coupon,
      discountPaise
    ),
  };
}

/** Supabase admin client adapter for coupon validation. */
export function createCouponDeps(admin: {
  from: (t: string) => any;
}): CouponLookupDeps {
  return {
    async findCouponByCode(code) {
      const { data, error } = await admin
        .from("coupons")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (error || !data) return null;
      return data as Coupon;
    },
    async countRedemptions(couponId) {
      const { count }: CountResult = await admin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", couponId);
      return count ?? 0;
    },
    async countCustomerRedemptions(couponId, customerId) {
      const { count }: CountResult = await admin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", couponId)
        .eq("customer_id", customerId);
      return count ?? 0;
    },
  };
}
