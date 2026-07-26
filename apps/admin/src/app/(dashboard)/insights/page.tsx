import { createClient } from "@mayafishmart/shared/supabase/server";
import { InsightsPanel } from "@/components/admin/InsightsPanel";
import type { AiInsight } from "@mayafishmart/shared/types";
import { requireManager } from "@mayafishmart/shared/auth";

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
      <h1 className="font-display ops-page-title">AI Insights</h1>
      <p className="mt-1 text-sm text-foam/60">
        Manual trigger only — nothing runs until you generate a report.
      </p>
      <InsightsPanel initial={(data as AiInsight[] | null) ?? []} />
    </div>
  );
}
