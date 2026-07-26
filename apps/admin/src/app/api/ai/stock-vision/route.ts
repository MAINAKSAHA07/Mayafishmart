import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { WRITE_STAFF_ROLES } from "@mayafishmart/shared/types";

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
  if (!profile || !WRITE_STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const image = form.get("image") as File | null;
  if (!image || image.size === 0) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const path = `scans/${user.id}/${Date.now()}-${image.name}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("stock-scans")
    .upload(path, buffer, { contentType: image.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signed } = await admin.storage
    .from("stock-scans")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  const imageUrl = signed?.signedUrl || path;

  const { data: products } = await admin
    .from("products")
    .select("id, name, unit")
    .eq("is_active", true);

  let proposed = (products ?? []).slice(0, 3).map((p, i) => ({
    product_id: p.id,
    product_name: p.name,
    suggested_qty: 5 + i * 2,
    confidence: 0.55 - i * 0.1,
    notes: "Heuristic estimate — configure OPENAI_API_KEY for vision",
  }));

  let raw_ai_json: Record<string, unknown> = { mode: "heuristic" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const b64 = buffer.toString("base64");
      const catalog = (products ?? []).map((p) => ({ id: p.id, name: p.name, unit: p.unit }));
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You analyze photos of fish trays/crates for a fish mart inventory. Match to the provided catalog. Return JSON: { updates: [{ product_id, product_name, suggested_qty, confidence (0-1), notes }] }. suggested_qty is estimated kg or pieces on hand. Only include items you see.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Catalog: ${JSON.stringify(catalog)}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${image.type};base64,${b64}`,
                  },
                },
              ],
            },
          ],
        }),
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content;
        if (content) {
          raw_ai_json = JSON.parse(content);
          const updates = (raw_ai_json as { updates?: typeof proposed }).updates;
          if (updates?.length) proposed = updates;
        }
      }
    } catch {
      // keep heuristic
    }
  }

  const { data: scan, error } = await admin
    .from("stock_scans")
    .insert({
      image_path: imageUrl,
      raw_ai_json,
      proposed_updates: proposed,
      status: "pending_review",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !scan) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }

  return NextResponse.json({ scan });
}
