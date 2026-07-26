import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { MANAGER_ROLES } from "@mayafishmart/shared/types";
import { normalizeCouponCode, rupeesToPaise } from "@mayafishmart/shared/money";

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !MANAGER_ROLES.includes(profile.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET() {
  const gate = await requireManager();
  if ("error" in gate && gate.error) return gate.error;
  const admin = createAdminClient();
  const { data: coupons, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withCounts = await Promise.all(
    (coupons ?? []).map(async (c) => {
      const { count } = await admin
        .from("coupon_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", c.id);
      return { ...c, redemption_count: count ?? 0 };
    })
  );

  return NextResponse.json({ coupons: withCounts });
}

export async function POST(request: NextRequest) {
  const gate = await requireManager();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  const form = await request.formData();
  const code = normalizeCouponCode(String(form.get("code") || ""));
  const type = String(form.get("type") || "percent") as "percent" | "fixed";
  const valueRaw = Number(form.get("value") || 0);
  const value = type === "fixed" ? rupeesToPaise(valueRaw) : valueRaw;
  const min_subtotal_paise = rupeesToPaise(Number(form.get("min_subtotal_rupees") || 0));
  const starts_at = String(form.get("starts_at") || "") || null;
  const ends_at = String(form.get("ends_at") || "") || null;
  const max_uses = String(form.get("max_uses") || "") ? Number(form.get("max_uses")) : null;
  const max_uses_per_customer = String(form.get("max_uses_per_customer") || "")
    ? Number(form.get("max_uses_per_customer"))
    : null;
  const is_active = String(form.get("is_active") || "true") !== "false";

  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });
  if (!(value > 0)) return NextResponse.json({ error: "Value must be > 0" }, { status: 400 });
  if (type === "percent" && value > 100) {
    return NextResponse.json({ error: "Percent max is 100" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .insert({
      code,
      type,
      value,
      min_subtotal_paise,
      starts_at,
      ends_at,
      max_uses,
      max_uses_per_customer,
      is_active,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireManager();
  if ("error" in gate && gate.error) return gate.error;

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const code = normalizeCouponCode(String(form.get("code") || ""));
  const type = String(form.get("type") || "percent") as "percent" | "fixed";
  const valueRaw = Number(form.get("value") || 0);
  const value = type === "fixed" ? rupeesToPaise(valueRaw) : valueRaw;
  const min_subtotal_paise = rupeesToPaise(Number(form.get("min_subtotal_rupees") || 0));
  const starts_at = String(form.get("starts_at") || "") || null;
  const ends_at = String(form.get("ends_at") || "") || null;
  const max_uses = String(form.get("max_uses") || "") ? Number(form.get("max_uses")) : null;
  const max_uses_per_customer = String(form.get("max_uses_per_customer") || "")
    ? Number(form.get("max_uses_per_customer"))
    : null;
  const is_active = String(form.get("is_active") || "true") !== "false";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("coupons")
    .update({
      code,
      type,
      value,
      min_subtotal_paise,
      starts_at,
      ends_at,
      max_uses,
      max_uses_per_customer,
      is_active,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}
