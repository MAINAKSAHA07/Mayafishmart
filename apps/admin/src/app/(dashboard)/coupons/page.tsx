import { createClient } from "@mayafishmart/shared/supabase/server";
import { requireManager } from "@mayafishmart/shared/auth";
import type { Coupon } from "@mayafishmart/shared/types";
import { formatInr, paiseToRupees } from "@mayafishmart/shared/money";
import { CouponForm } from "@/components/admin/CouponForm";

function couponValueLabel(coupon: Coupon) {
  return coupon.type === "percent"
    ? `${Number(coupon.value)}% off`
    : `${formatInr(Number(coupon.value))} off`;
}

export default async function CouponsPage() {
  await requireManager();
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  const coupons = (data as Coupon[] | null) ?? [];

  const withCounts = await Promise.all(
    coupons.map(async (c) => {
      const { count } = await supabase
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", c.id);
      return { ...c, redemption_count: count ?? 0 };
    })
  );

  return (
    <div>
      <h1 className="font-display ops-page-title">Coupons</h1>
      <p className="mt-1 text-sm text-foam/60">Percent or fixed discounts · validated at checkout</p>

      <CouponForm />

      <ul className="mt-8 space-y-3">
        {withCounts.map((c) => (
          <li
            key={c.id}
            className="rounded-xl bg-white/5 px-4 py-4 ring-1 ring-white/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-bold tracking-wide text-white">{c.code}</p>
                <p className="text-sm text-foam/70">
                  {couponValueLabel(c)} · min ₹{paiseToRupees(c.min_subtotal_paise).toFixed(0)} ·{" "}
                  {c.is_active ? "active" : "inactive"} · used {c.redemption_count}
                  {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </p>
                <p className="mt-1 text-xs text-foam/45">
                  {c.starts_at ? `from ${new Date(c.starts_at).toLocaleString("en-IN")}` : "no start"} ·{" "}
                  {c.ends_at ? `until ${new Date(c.ends_at).toLocaleString("en-IN")}` : "no end"}
                </p>
              </div>
              <p className="text-aqua text-sm uppercase tracking-wide">{c.type}</p>
            </div>
            <CouponForm coupon={c} mode="edit" />
          </li>
        ))}
        {!withCounts.length && (
          <li className="rounded-xl bg-white/5 py-10 text-center text-sm text-foam/50">
            No coupons yet
          </li>
        )}
      </ul>
    </div>
  );
}
