import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { MANAGER_ROLES } from "@mayafishmart/shared/types";
import { rupeesToPaise } from "@mayafishmart/shared/money";
import { slugify } from "@mayafishmart/shared/slug";
import { defaultMinOrderQty } from "@mayafishmart/shared/min-order";

async function requireManagerUser() {
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

async function uniqueSlug(admin: ReturnType<typeof createAdminClient>, base: string, excludeId?: string) {
  let candidate = base || `product-${Date.now()}`;
  let n = 2;
  for (;;) {
    const { data } = await admin.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!data || (excludeId && data.id === excludeId)) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

async function uploadImage(
  admin: ReturnType<typeof createAdminClient>,
  image: File | null,
  slug: string
) {
  if (!image || image.size <= 0) return null;
  const path = `products/${slug}-${Date.now()}.${image.name.split(".").pop() || "jpg"}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("product-images")
    .upload(path, buffer, { contentType: image.type, upsert: true });
  if (uploadError) return null;
  const { data } = admin.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: NextRequest) {
  const gate = await requireManagerUser();
  if ("error" in gate && gate.error) return gate.error;
  const user = gate.user!;

  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = await uniqueSlug(
    createAdminClient(),
    slugify(String(form.get("slug") || name))
  );
  const category_id = String(form.get("category_id") || "") || null;
  const price_rupees = Number(form.get("price_rupees") || 0);
  const unit = String(form.get("unit") || "kg");
  const description = String(form.get("description") || "");
  const qty_on_hand = Number(form.get("qty_on_hand") || 0);
  const image = form.get("image") as File | null;
  const is_active = String(form.get("is_active") || "true") !== "false";

  const admin = createAdminClient();
  const image_url = await uploadImage(admin, image, slug);

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
      is_active,
      gst_rate: 5,
      min_order_qty: defaultMinOrderQty(name || slug, unit),
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

export async function PATCH(request: NextRequest) {
  const gate = await requireManagerUser();
  if ("error" in gate && gate.error) return gate.error;

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("products").select("id, slug").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Keep existing slug unless name changes enough that client sent a new slug intent.
  // Auto-regen only when slug field is empty / omitted — otherwise use provided (still sanitized).
  const rawSlug = String(form.get("slug") || "").trim();
  const slug = await uniqueSlug(admin, slugify(rawSlug || name), id);

  const category_id = String(form.get("category_id") || "") || null;
  const price_rupees = Number(form.get("price_rupees") || 0);
  const unit = String(form.get("unit") || "kg");
  const description = String(form.get("description") || "");
  const is_active = String(form.get("is_active") || "true") !== "false";
  const image = form.get("image") as File | null;

  const patch: Record<string, unknown> = {
    name,
    slug,
    category_id,
    price_paise: rupeesToPaise(price_rupees),
    unit,
    description,
    is_active,
    min_order_qty: defaultMinOrderQty(name || slug, unit),
  };

  const image_url = await uploadImage(admin, image, slug);
  if (image_url) patch.image_url = image_url;

  const { data: product, error } = await admin
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !product) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }

  return NextResponse.json({ product });
}
