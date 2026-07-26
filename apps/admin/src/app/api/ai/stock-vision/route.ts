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
- If the image mentions one fish (e.g. only "ROHU"), return at most that one match. Do NOT add Catla, Prawns, or any other catalog item that is not in the image.
- If unsure a product is present, omit it. Empty updates is better than guessing.
- Never invent quantities. If no stock quantity is written or clearly countable, omit that product from updates (you may still put what you read in transcribed_text).

Images may be:
1) Photos of fish trays/crates (estimate only fish you actually see)
2) Handwritten / printed notes, labels, chalkboards
3) Mixed photo + text

PRICE vs STOCK QUANTITY (critical):
- Patterns like "Rohu - 240/kg", "₹240/kg", "240 / kg", "Rs 200 per kg" are PRICES, not stock on hand.
- Do NOT use a price number as suggested_qty.
- Stock qty looks like: "Rohu 12kg", "Rohu = 12", "stock 12", "12 kg left", tray counts you can estimate.
- If the note only has a product name + price, set updates to [] and explain in notes/transcribed_text.

Handwriting:
- Read carefully; prefer final uncrossed values.
- Bengali/Hindi/English mix and abbreviations OK (Rui→Rohu, Katla→Catla, Ilish→Hilsa).

Matching:
- Fuzzy-match to the provided catalog only.
- suggested_qty = on-hand amount in catalog unit (usually kg).
- confidence 0–1 (clear handwriting with explicit qty ≥0.8; visual estimate ≤0.7; never high confidence on guesses).

Return ONLY JSON:
{
  "source": "handwritten" | "photo" | "printed" | "mixed",
  "transcribed_text": "exact text you read, or brief visual description",
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

function looksLikePriceNote(notes: string, transcribed: string): boolean {
  const text = `${notes} ${transcribed}`.toLowerCase();
  return /(?:rs\.?|₹|inr)?\s*\d+(\.\d+)?\s*\/\s*kg\b|\bper\s*kg\b|\bprice\b/.test(text);
}

function coerceUpdates(
  raw: unknown,
  catalog: CatalogRow[],
): ProposedUpdate[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { updates?: unknown; transcribed_text?: unknown };
  const updates = obj.updates;
  if (!Array.isArray(updates)) return [];
  const transcribed = String(obj.transcribed_text ?? "");

  const out: ProposedUpdate[] = [];
  const seen = new Set<string>();

  for (const row of updates) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = String(r.product_name ?? "").trim();
    const qty = Number(r.suggested_qty);
    const notes = String(r.notes ?? "");
    if (!name || !Number.isFinite(qty) || qty < 0) continue;

    // Drop price-as-qty mistakes (e.g. 240 from "240/kg")
    if (looksLikePriceNote(notes, transcribed) && qty >= 50) {
      continue;
    }
    if (/\b\/\s*kg\b/i.test(`${name} ${notes} ${transcribed}`) && qty >= 50) {
      continue;
    }

    const byId =
      typeof r.product_id === "string"
        ? catalog.find((p) => p.id === r.product_id)
        : undefined;
    const matched = byId ?? matchCatalog(name, catalog);
    if (!matched) continue;

    if (seen.has(matched.id)) continue;
    seen.add(matched.id);

    out.push({
      product_id: matched.id,
      product_name: matched.name,
      suggested_qty: Math.round(qty * 100) / 100,
      confidence: Math.min(1, Math.max(0, Number(r.confidence) || 0.5)),
      notes: notes.slice(0, 240),
    });
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

  const imageUrl = signed?.signedUrl || path;

  const { data: products } = await admin
    .from("products")
    .select("id, name, unit")
    .eq("is_active", true);

  const catalog = (products ?? []) as CatalogRow[];

  // Never invent catalog rows. Empty until vision succeeds.
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
                  text: `Read ONLY what is in this image. Do not invent products or quantities.\nCatalog JSON:\n${JSON.stringify(catalog)}`,
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
              ? `Read “${transcribed}” but found no stock quantity to apply (price-only notes are ignored).`
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

  return NextResponse.json({ scan, warning });
}
