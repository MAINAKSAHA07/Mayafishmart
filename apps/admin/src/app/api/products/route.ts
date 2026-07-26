import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { MANAGER_ROLES } from "@mayafishmart/shared/types";
import { rupeesToPaise } from "@mayafishmart/shared/money";

export async function POST(request: NextRequest) {
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
  if (!profile || !MANAGER_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const name = String(form.get("name") || "");
  const slug = String(form.get("slug") || "").toLowerCase().replace(/\s+/g, "-");
  const category_id = String(form.get("category_id") || "") || null;
  const price_rupees = Number(form.get("price_rupees") || 0);
  const unit = String(form.get("unit") || "kg");
  const description = String(form.get("description") || "");
  const qty_on_hand = Number(form.get("qty_on_hand") || 0);
  const image = form.get("image") as File | null;

  const admin = createAdminClient();
  let image_url: string | null = null;

  if (image && image.size > 0) {
    const path = `products/${slug}-${Date.now()}.${image.name.split(".").pop() || "jpg"}`;
    const buffer = Buffer.from(await image.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("product-images")
      .upload(path, buffer, { contentType: image.type, upsert: true });
    if (!uploadError) {
      const { data } = admin.storage.from("product-images").getPublicUrl(path);
      image_url = data.publicUrl;
    }
  }

  const { data: product, error } = await admin
    .from("products")
    .insert({
      name,
      slug,
      category_id,
      price_paise: rupeesToPaise(price_rupees),
      unit,
      description,
      image_url,
      is_active: true,
      gst_rate: 5,
      min_order_qty: unit === "kg" ? 0.5 : 1,
    })
    .select("*")
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }

  await admin.from("inventory").insert({
    product_id: product.id,
    qty_on_hand,
    reserved_qty: 0,
    low_stock_threshold: 2,
  });

  await admin.from("inventory_movements").insert({
    product_id: product.id,
    delta: qty_on_hand,
    reason: "restock",
    actor_id: user.id,
    note: "Initial stock",
  });

  return NextResponse.json({ product });
}
