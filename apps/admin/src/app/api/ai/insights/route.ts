import { NextResponse } from "next/server";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { createAdminClient } from "@mayafishmart/shared/supabase/admin";
import { MANAGER_ROLES } from "@mayafishmart/shared/types";
import { format, subDays } from "date-fns";

/** Manual trigger only — called from Ops AI Insights "Generate" button. No cron. */
export async function POST() {
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

  const admin = createAdminClient();
  const periodEnd = new Date();
  const periodStart = subDays(periodEnd, 14);

  const [{ data: orders }, { data: inventory }] = await Promise.all([
    admin
      .from("orders")
      .select("*, order_items(*)")
      .gte("created_at", periodStart.toISOString())
      .neq("status", "cancelled"),
    admin.from("inventory").select("*, products(name, unit)"),
  ]);

  const salesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders ?? []) {
    for (const item of order.order_items ?? []) {
      const cur = salesMap.get(item.product_id) || {
        name: item.product_name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += Number(item.qty);
      cur.revenue += Number(item.line_total_paise);
      salesMap.set(item.product_id, cur);
    }
  }

  const sales = [...salesMap.values()].sort((a, b) => b.qty - a.qty);
  const stockRows = (inventory ?? []).map((row) => ({
    name: row.products?.name ?? "Product",
    qty_on_hand: Number(row.qty_on_hand),
    reserved: Number(row.reserved_qty),
    threshold: Number(row.low_stock_threshold),
    sold: salesMap.get(row.product_id)?.qty ?? 0,
  }));

  const heuristicPayload = {
    summary: `Over the last 14 days you had ${orders?.length ?? 0} orders. Top mover: ${
      sales[0]?.name ?? "n/a"
    }.`,
    top_sellers: sales.slice(0, 5).map((s) => ({ name: s.name, qty: Number(s.qty.toFixed(2)) })),
    slow_movers: sales
      .slice()
      .reverse()
      .slice(0, 5)
      .map((s) => ({ name: s.name, qty: Number(s.qty.toFixed(2)) })),
    reorder_suggestions: stockRows
      .filter((s) => s.qty_on_hand <= s.threshold || (s.sold > 0 && s.qty_on_hand < s.sold))
      .map((s) => ({
        name: s.name,
        suggested_qty: Math.max(s.threshold * 2, Math.ceil(s.sold)),
        reason:
          s.qty_on_hand <= s.threshold
            ? "Below low-stock threshold"
            : "Recent sales outpacing on-hand",
      })),
    day_patterns: [
      "Weekend evenings typically see higher prawn and pomfret demand.",
      "Freshwater curry fish (Rohu/Katla) moves steadily on weekdays.",
    ],
  };

  let payload = heuristicPayload;

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const prompt = {
        sales,
        stock: stockRows,
        orderCount: orders?.length ?? 0,
      };
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
                "You are an analyst for an Indian fish mart (pickup only). Return JSON with keys: summary (string), top_sellers (array of {name, qty}), slow_movers (array), reorder_suggestions (array of {name, suggested_qty, reason}), day_patterns (string array).",
            },
            {
              role: "user",
              content: JSON.stringify(prompt),
            },
          ],
        }),
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const content = aiJson.choices?.[0]?.message?.content;
        if (content) payload = JSON.parse(content);
      }
    } catch {
      // keep heuristic payload
    }
  }

  const { data: insight, error } = await admin
    .from("ai_insights")
    .insert({
      type: "sales",
      period_start: format(periodStart, "yyyy-MM-dd"),
      period_end: format(periodEnd, "yyyy-MM-dd"),
      payload,
    })
    .select("*")
    .single();

  if (error || !insight) {
    return NextResponse.json({ error: error?.message || "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ insight });
}
