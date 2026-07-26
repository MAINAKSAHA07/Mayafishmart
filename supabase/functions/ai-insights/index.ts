// Edge Function: ai-insights
// Deploy with: supabase functions deploy ai-insights
// Secrets: OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: orders } = await supabase
    .from("orders")
    .select("id, total_paise, created_at, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(100);

  const payload = {
    summary: `Edge cron snapshot: ${(orders ?? []).length} recent orders.`,
    top_sellers: [],
    slow_movers: [],
    reorder_suggestions: [],
    day_patterns: ["Run from admin UI for full LLM analysis."],
  };

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("ai_insights")
    .insert({
      type: "sales",
      period_start: today,
      period_end: today,
      payload,
    })
    .select("*")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ insight: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
