"use client";

import type { AiInsight } from "@mayafishmart/shared/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InsightsPanel({ initial }: { initial: AiInsight[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState(initial);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/ai/insights", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to generate insights");
      return;
    }
    setInsights((prev) => [data.insight, ...prev]);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="btn-primary disabled:opacity-60"
      >
        {loading ? "Analyzing…" : "Generate insights"}
      </button>
      <p className="mt-2 text-xs text-foam/45">
        On-demand only — no schedule or background jobs.
      </p>
      {error && (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {insights.map((insight) => {
          const payload = insight.payload as {
            summary?: string;
            top_sellers?: Array<{ name: string; qty: number }>;
            slow_movers?: Array<{ name: string; qty: number }>;
            reorder_suggestions?: Array<{ name: string; suggested_qty: number; reason: string }>;
            day_patterns?: string[];
          };
          return (
            <li key={insight.id} className="ops-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs tracking-wide text-aqua uppercase">{insight.type} insight</p>
                <p className="text-xs text-foam/50">
                  {insight.period_start} → {insight.period_end}
                </p>
              </div>
              <p className="mt-3 text-white">{payload.summary}</p>
              {payload.top_sellers?.length ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-foam/80">Top sellers</p>
                  <ul className="mt-1 text-sm text-foam/70">
                    {payload.top_sellers.map((t) => (
                      <li key={t.name}>
                        {t.name} — {t.qty}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {payload.reorder_suggestions?.length ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-foam/80">Reorder</p>
                  <ul className="mt-1 text-sm text-foam/70">
                    {payload.reorder_suggestions.map((r) => (
                      <li key={r.name}>
                        {r.name}: +{r.suggested_qty} — {r.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {payload.day_patterns?.length ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-foam/60">
                  {payload.day_patterns.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
        {!insights.length && (
          <li className="rounded-2xl bg-white/5 py-10 text-center text-foam/50">
            No insights yet — tap Generate when you want a report
          </li>
        )}
      </ul>
    </div>
  );
}
