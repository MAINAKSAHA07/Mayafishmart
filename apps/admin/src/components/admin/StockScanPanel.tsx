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
  const [localScans, setLocalScans] = useState(scans);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
        <input name="image" type="file" accept="image/*" required className="text-sm text-foam/80" />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Analyzing image…" : "Upload & analyze"}
        </button>
        {error && <p className="mt-3 text-sm text-coral">{error}</p>}
      </form>

      <ul className="mt-8 space-y-4">
        {localScans.map((scan) => (
          <li key={scan.id} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs tracking-wide text-aqua uppercase">{scan.status}</p>
              <p className="text-xs text-foam/50">
                {new Date(scan.created_at).toLocaleString("en-IN")}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scan.image_path}
              alt="Stock scan"
              className="mt-3 max-h-48 rounded-xl object-cover"
            />
            <ul className="mt-4 space-y-2 text-sm">
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
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => applyScan(scan.id, "applied")}
                  className="rounded-full bg-aqua px-4 py-1.5 text-xs font-semibold text-ocean-deep"
                >
                  Apply to inventory
                </button>
                <button
                  type="button"
                  onClick={() => applyScan(scan.id, "rejected")}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold text-coral ring-1 ring-coral/40"
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
