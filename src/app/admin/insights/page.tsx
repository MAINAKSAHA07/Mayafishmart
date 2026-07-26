import { createClient } from "@/lib/supabase/server";
import { InsightsPanel } from "@/components/admin/InsightsPanel";
import type { AiInsight } from "@/lib/types";
import { requireManager } from "@/lib/auth";

export default async function InsightsPage() {
  await requireManager();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">AI Insights</h1>
      <p className="mt-1 text-sm text-foam/60">Sales trends and stock recommendations</p>
      <InsightsPanel initial={(data as AiInsight[] | null) ?? []} />
    </div>
  );
}
