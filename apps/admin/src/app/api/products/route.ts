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

function inventoryRow(product: { inventory?: unknown }) {
  const inv = product.inventory;
  if (Array.isArray(inv)) return inv[0] as { qty_on_hand?: number } | undefined;
  return inv as { qty_on_hand?: number } | null | undefined;
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
  const cut_notes = String(form.get("cut_notes") || "") || null;
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
      cut_notes,
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
  const user = gate.user!;

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("products")
    .select("id, slug, inventory(*)")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawSlug = String(form.get("slug") || "").trim();
  const slug = await uniqueSlug(admin, slugify(rawSlug || name), id);

  const category_id = String(form.get("category_id") || "") || null;
  const price_rupees = Number(form.get("price_rupees") || 0);
  const unit = String(form.get("unit") || "kg");
  const description = String(form.get("description") || "");
  const cut_notes = String(form.get("cut_notes") || "") || null;
  const is_active = String(form.get("is_active") || "true") !== "false";
  const image = form.get("image") as File | null;
  const qtyRaw = form.get("qty_on_hand");
  const hasQty = qtyRaw !== null && String(qtyRaw).trim() !== "";

  const patch: Record<string, unknown> = {
    name,
    slug,
    category_id,
    price_paise: rupeesToPaise(price_rupees),
    unit,
    description,
    cut_notes,
    is_active,
    min_order_qty: defaultMinOrderQty(name || slug, unit),
    updated_at: new Date().toISOString(),
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

  if (hasQty) {
    const nextQty = Number(qtyRaw);
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      return NextResponse.json({ error: "Invalid stock quantity" }, { status: 400 });
    }
    const prev = Number(inventoryRow(existing)?.qty_on_hand ?? 0);
    const delta = nextQty - prev;
    const { data: invRow } = await admin
      .from("inventory")
      .select("product_id")
      .eq("product_id", id)
      .maybeSingle();
    if (invRow) {
      await admin
        .from("inventory")
        .update({ qty_on_hand: nextQty, updated_at: new Date().toISOString() })
        .eq("product_id", id);
    } else {
      await admin.from("inventory").insert({
        product_id: id,
        qty_on_hand: nextQty,
        reserved_qty: 0,
        low_stock_threshold: 2,
      });
    }
    if (delta !== 0) {
      await admin.from("inventory_movements").insert({
        product_id: id,
        delta,
        reason: "adjustment",
        actor_id: user.id,
        note: "Catalog edit",
      });
    }
  }

  return NextResponse.json({ product });
}

export async function DELETE(request: NextRequest) {
  const gate = await requireManagerUser();
  if ("error" in gate && gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");
  if (!id) {
    try {
      const body = await request.json();
      id = String(body.id || "");
    } catch {
      id = "";
    }
  }
  if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin.from("products").select("id, name").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { count } = await admin
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if ((count ?? 0) > 0) {
    // Soft-delete: keep history, hide from storefront
    const { error } = await admin
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message: "Product has past orders — hidden from storefront instead of permanently deleted.",
    });
  }

  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, softDeleted: false });
}
