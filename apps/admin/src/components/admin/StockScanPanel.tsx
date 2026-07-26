"use client";

import type { Product, StockScan } from "@mayafishmart/shared/types";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function StockScanPanel({
  scans,
  products,
}: {
  scans: StockScan[];
  products: Array<Pick<Product, "id" | "name" | "unit">>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [localScans, setLocalScans] = useState(scans);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWarning(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/ai/stock-vision", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Scan failed");
      return;
    }
    if (data.warning) setWarning(String(data.warning));
    setLocalScans((prev) => [data.scan, ...prev]);
    e.currentTarget.reset();
    router.refresh();
  }

  async function applyScan(scanId: string, action: "applied" | "rejected") {
    const res = await fetch(`/api/ai/stock-vision/${scanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const data = await res.json();
      setLocalScans((prev) => prev.map((s) => (s.id === scanId ? data.scan : s)));
      router.refresh();
    }
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={onUpload}
        className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
      >
        <p className="text-sm leading-relaxed text-foam/70">
          Works with tray photos <span className="text-foam/40">and</span> handwritten notes,
          chalkboards, whiteboards, or printed stock sheets. Keep writing in frame and well lit.
        </p>
        <input
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          required
          className="mt-4 w-full text-sm text-foam/80"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-4 w-full disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Reading image…" : "Upload & analyze"}
        </button>
        {error && (
          <p className="mt-3 text-sm text-coral" role="alert">
            {error}
          </p>
        )}
        {warning && !error && (
          <p className="mt-3 text-sm text-coral/90" role="status">
            {warning}
          </p>
        )}
      </form>

      <ul className="mt-8 space-y-4">
        {localScans.map((scan) => (
          <li key={scan.id} className="ops-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs tracking-wide text-aqua uppercase">{scan.status}</p>
              <p className="text-xs text-foam/50">
                {new Date(scan.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {scan.image_path && !scan.image_purged_at ? (
              <img
                src={scan.image_path}
                alt="Stock scan"
                className="mt-3 max-h-56 w-full max-w-full rounded-xl object-cover"
              />
            ) : (
              <p className="mt-3 rounded-xl bg-white/5 px-3 py-6 text-center text-sm text-foam/45">
                Image removed
                {scan.status === "rejected"
                  ? " (rejected images delete after 24h)"
                  : scan.status === "applied"
                    ? " (applied images delete after 7 days)"
                    : ""}
              </p>
            )}
            {scan.image_expires_at && !scan.image_purged_at && scan.status !== "pending_review" && (
              <p className="mt-2 text-[0.7rem] text-foam/40">
                Image deletes{" "}
                {new Date(scan.image_expires_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            <ul className="mt-4 space-y-2 text-sm">
              {typeof (scan.raw_ai_json as { source?: string } | null)?.source === "string" && (
                <li className="text-xs tracking-wide text-aqua uppercase">
                  Detected: {(scan.raw_ai_json as { source: string }).source}
                </li>
              )}
              {typeof (scan.raw_ai_json as { transcribed_text?: string } | null)?.transcribed_text ===
                "string" &&
                (scan.raw_ai_json as { transcribed_text: string }).transcribed_text.trim() && (
                  <li className="rounded-xl bg-white/5 px-3 py-2 text-foam/75">
                    <span className="text-foam/45">Read: </span>
                    {(scan.raw_ai_json as { transcribed_text: string }).transcribed_text}
                  </li>
                )}
              {typeof (scan.raw_ai_json as { warning?: string } | null)?.warning === "string" && (
                <li className="text-sm text-coral/90">
                  {(scan.raw_ai_json as { warning: string }).warning}
                </li>
              )}
              {typeof (scan.raw_ai_json as { error?: string } | null)?.error === "string" && (
                <li className="text-sm text-coral" role="alert">
                  {(scan.raw_ai_json as { error: string }).error}
                </li>
              )}
              {scan.proposed_updates.length === 0 &&
                !(scan.raw_ai_json as { warning?: string } | null)?.warning &&
                !(scan.raw_ai_json as { error?: string } | null)?.error && (
                  <li className="text-foam/50">No stock quantities detected in this image.</li>
                )}
              {scan.proposed_updates.map((u, idx) => (
                <li key={`${u.product_name}-${idx}`} className="text-foam/80">
                  <span className="text-white">{u.product_name}</span> → set qty ≈{" "}
                  {u.suggested_qty}{" "}
                  <span className="text-foam/50">
                    ({Math.round(u.confidence * 100)}%
                    {u.notes ? ` · ${u.notes}` : ""})
                  </span>
                  {!u.product_id && products.length > 0 && (
                    <span className="block text-xs text-coral">Unmatched — map manually in inventory</span>
                  )}
                </li>
              ))}
            </ul>
            {scan.status === "pending_review" && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {scan.proposed_updates.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => applyScan(scan.id, "applied")}
                    className="ops-action flex-1 bg-aqua text-ocean-deep"
                  >
                    Apply to inventory
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => applyScan(scan.id, "rejected")}
                  className="ops-action flex-1 text-coral ring-1 ring-coral/40"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
        {!localScans.length && (
          <li className="rounded-2xl bg-white/5 py-10 text-center text-foam/50">No scans yet</li>
        )}
      </ul>
    </div>
  );
}
