// Edge Function: ai-insights
// Manual / trigger-only. Do NOT schedule this on a cron.
// Prefer Ops UI → AI Insights → "Generate" (POST /api/ai/insights).
//
// If you must call this edge function, send:
//   POST with header: x-trigger-secret: $INSIGHTS_TRIGGER_SECRET
// Optional body: { "trigger": true }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("INSIGHTS_TRIGGER_SECRET")?.trim();
  const provided =
    req.headers.get("x-trigger-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  let bodyTrigger = false;
  try {
    const body = await req.json();
    bodyTrigger = body?.trigger === true;
  } catch {
    // no JSON body
  }

  // No secret configured → refuse automatic/cron use; force Ops UI
  if (!expected) {
    return new Response(
      JSON.stringify({
        error: "AI insights are trigger-based only. Use Maya Ops → AI Insights → Generate.",
        hint: "Set INSIGHTS_TRIGGER_SECRET only if you need a manual edge invoke.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!provided || provided !== expected || !bodyTrigger) {
    return new Response(
      JSON.stringify({
        error: "Missing manual trigger. Send x-trigger-secret and JSON { \"trigger\": true }.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      error: "Use Maya Ops POST /api/ai/insights for full analysis. Edge cron snapshots are disabled.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
});
