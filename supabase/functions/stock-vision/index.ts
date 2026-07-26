// Edge Function: stock-vision
// Prefer app route POST /api/ai/stock-vision for multipart uploads from the admin UI.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  return new Response(
    JSON.stringify({
      message: "Use Next.js /api/ai/stock-vision for uploads.",
      echo: body,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
