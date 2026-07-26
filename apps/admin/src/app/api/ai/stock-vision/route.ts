import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { WRITE_STAFF_ROLES } from "@mayafishmart/shared/types";

type ProposedUpdate = {
  product_id: string;
  product_name: string;
  suggested_qty: number;
  confidence: number;
  notes: string;
};

type CatalogRow = { id: string; name: string; unit: string };

const SYSTEM_PROMPT = `You are inventory vision for Maya Fish Mart (India fish shop).

STRICT RULES — never hallucinate:
- ONLY return products you can see or read in THIS image.
- If the image mentions one fish, return at most that one match. Do NOT invent other catalog items.
- Never invent quantities.

SHOP HANDWRITING PATTERN (most common — follow this):
  <quantity> <product> <price>/kg
Examples:
- "40kg Katla Rs 240/kg" → Katla stock qty = 40 (₹240 is PRICE, not stock)
- "12 Rohu Rs 200/kg" → Rohu qty = 12
- "5.5 prawns 450/kg" → Prawns qty = 5.5
The FIRST number is always on-hand quantity. The number before "/kg" (often with Rs/₹) is PRICE — never use it as suggested_qty.
OCR may add junk before the qty (e.g. "0-40kg" or "O-40kg") — use 40 as qty.

Also accept:
- Qty with product: "Katla 40kg", "Rohu = 12"
- Tray photos: estimate only fish you see
- Price-only notes with NO leading quantity (e.g. "Rohu - 240/kg") → updates: [] but still set transcribed_text

Handwriting: Bengali/Hindi/English OK (Rui→Rohu, Katla→Catla, Ilish→Hilsa).
Match product_id to the provided catalog.

Return ONLY JSON:
{
  "source": "handwritten" | "photo" | "printed" | "mixed",
  "transcribed_text": "exact text you read",
  "updates": [
    { "product_id": "...", "product_name": "...", "suggested_qty": number, "confidence": number, "notes": "..." }
  ]
}`;

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchCatalog(name: string, catalog: CatalogRow[]): CatalogRow | undefined {
  const n = normalizeName(name);
  if (!n) return undefined;
  const exact = catalog.find((p) => normalizeName(p.name) === n);
  if (exact) return exact;
  const contains = catalog.find(
    (p) => normalizeName(p.name).includes(n) || n.includes(normalizeName(p.name)),
  );
  if (contains) return contains;
  const aliases: Record<string, string[]> = {
    katla: ["catla"],
    catla: ["katla"],
    prawn: ["prawns", "shrimp", "shrimps"],
    prawns: ["prawn", "shrimp"],
    rohu: ["rui"],
    rui: ["rohu"],
    hilsa: ["ilish", "ilisha"],
    ilish: ["hilsa"],
  };
  for (const p of catalog) {
    const pn = normalizeName(p.name);
    const keys = [pn, ...(aliases[pn] ?? [])];
    if (keys.some((k) => n.includes(k) || k.includes(n))) return p;
  }
  return undefined;
}

function extractPricePerKg(text: string): number | null {
  const m = text.match(/(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)\s*\/\s*kg\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Parse shop notes: qty first, then product, then optional price/kg. */
function parseShopHandwriting(transcribed: string, catalog: CatalogRow[]): ProposedUpdate[] {
  const lines = transcribed
    .split(/[\n;]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: ProposedUpdate[] = [];
  const seen = new Set<string>();

  for (const line of lines.length ? lines : [transcribed.trim()]) {
    if (!line) continue;
    const price = extractPricePerKg(line);

    // "0-40kg Katla Rs 240/kg" | "40kg Katla Rs 240/kg" | "40 Katla 240/kg"
    const m = line.match(
      /^(?:[o0q]-)?(\d+(?:\.\d+)?)\s*(?:kg|kgs)?\s+([A-Za-z][A-Za-z0-9\s().'-]+?)(?=\s+(?:rs\.?|₹|inr)?\s*\d|\s*$)/i,
    );
    if (!m) continue;

    const qty = Number(m[1]);
    const productPart = m[2].trim().replace(/\s+/g, " ");
    if (!Number.isFinite(qty) || qty < 0 || !productPart) continue;
    if (price != null && qty === price) continue;

    const matched = matchCatalog(productPart, catalog);
    if (!matched || seen.has(matched.id)) continue;
    seen.add(matched.id);
    out.push({
      product_id: matched.id,
      product_name: matched.name,
      suggested_qty: Math.round(qty * 100) / 100,
      confidence: 0.85,
      notes: `Parsed shop note (qty → product → price)${price != null ? `; price ₹${price}/kg ignored` : ""}`,
    });
  }
  return out;
}

function coerceUpdates(raw: unknown, catalog: CatalogRow[]): ProposedUpdate[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { updates?: unknown; transcribed_text?: unknown };
  const transcribed = String(obj.transcribed_text ?? "");
  const price = extractPricePerKg(transcribed);
  const updates = obj.updates;

  const out: ProposedUpdate[] = [];
  const seen = new Set<string>();

  if (Array.isArray(updates)) {
    for (const row of updates) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const name = String(r.product_name ?? "").trim();
      const qty = Number(r.suggested_qty);
      const notes = String(r.notes ?? "");
      if (!name || !Number.isFinite(qty) || qty < 0) continue;
      if (price != null && qty === price) continue;

      const byId =
        typeof r.product_id === "string"
          ? catalog.find((p) => p.id === r.product_id)
          : undefined;
      const matched = byId ?? matchCatalog(name, catalog);
      if (!matched || seen.has(matched.id)) continue;
      seen.add(matched.id);

      out.push({
        product_id: matched.id,
        product_name: matched.name,
        suggested_qty: Math.round(qty * 100) / 100,
        confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0.5)),
        notes: notes.slice(0, 240),
      });
    }
  }

  if (!out.length && transcribed.trim()) {
    return parseShopHandwriting(transcribed, catalog);
  }
  return out;
}

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
  const path = `scans/${user.id}/${Date.now()}-${image.name.replace(/[^\w.\-]+/g, "_")}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("stock-scans")
    .upload(path, buffer, { contentType: image.type || "image/jpeg", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signed } = await admin.storage
    .from("stock-scans")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  const displayUrl = signed?.signedUrl || path;

  const { data: products } = await admin
    .from("products")
    .select("id, name, unit")
    .eq("is_active", true);

  const catalog = (products ?? []) as CatalogRow[];

  let proposed: ProposedUpdate[] = [];
  let raw_ai_json: Record<string, unknown> = {};
  let aiError: string | null = null;
  let warning: string | null = null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    aiError = "OPENAI_API_KEY is not configured on Maya Ops";
    warning = aiError;
    raw_ai_json = { mode: "unavailable", error: aiError };
  } else {
    try {
      const b64 = buffer.toString("base64");
      const mime = image.type || "image/jpeg";
      const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Shop note pattern is: quantity, then product, then price/kg. Read ONLY this image.\nCatalog JSON:\n${JSON.stringify(catalog)}`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mime};base64,${b64}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!aiRes.ok) {
        const errBody = await aiRes.text();
        aiError = `Vision API ${aiRes.status}: ${errBody.slice(0, 240)}`;
        raw_ai_json = { error: aiError };
      } else {
        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content;
        if (!content) {
          aiError = "Vision returned empty content";
          raw_ai_json = { error: aiError };
        } else {
          raw_ai_json = JSON.parse(content) as Record<string, unknown>;
          proposed = coerceUpdates(raw_ai_json, catalog);
          if (!proposed.length) {
            const transcribed = String(raw_ai_json.transcribed_text ?? "").trim();
            warning = transcribed
              ? `Read “${transcribed}” but could not find a leading stock quantity (expected: qty → product → price/kg).`
              : "No matching stock quantities found in the image.";
            raw_ai_json = { ...raw_ai_json, warning };
          }
        }
      }
    } catch (err) {
      aiError = err instanceof Error ? err.message : "Vision parse failed";
      raw_ai_json = { error: aiError };
    }
  }

  if (aiError) {
    raw_ai_json = { ...raw_ai_json, error: aiError };
    warning = warning || aiError;
  }

  const { data: scan, error } = await admin
    .from("stock_scans")
    .insert({
      image_path: displayUrl,
      storage_path: path,
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

  return NextResponse.json({ scan, warning });
}
