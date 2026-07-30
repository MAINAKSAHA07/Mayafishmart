"use client";

import { useEffect, useState } from "react";

type Courier = {
  name?: string | null;
  surname?: string | null;
  phone?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type DeliveryPayload = {
  fulfillment?: string;
  status?: string | null;
  trackingUrl?: string | null;
  courier?: Courier | null;
};

export function DeliveryTracking({
  orderId,
  pickupCode,
  initialStatus,
  initialTrackingUrl,
  variant = "shop",
}: {
  orderId: string;
  pickupCode?: string;
  initialStatus?: string | null;
  initialTrackingUrl?: string | null;
  variant?: "shop" | "ops";
}) {
  const [status, setStatus] = useState(initialStatus ?? null);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl ?? null);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const qs = pickupCode ? `?pickup=${encodeURIComponent(pickupCode)}` : "";
        const res = await fetch(`/api/orders/${orderId}/delivery${qs}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as DeliveryPayload & { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not load tracking");
        if (cancelled) return;
        setStatus(data.status ?? null);
        setTrackingUrl(data.trackingUrl ?? null);
        setCourier(data.courier ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Tracking unavailable");
        }
      }
    }

    load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [orderId, pickupCode]);

  const lat = courier?.latitude ? Number(courier.latitude) : NaN;
  const lng = courier?.longitude ? Number(courier.longitude) : NaN;
  const hasLive = Number.isFinite(lat) && Number.isFinite(lng);
  const courierName = [courier?.name, courier?.surname].filter(Boolean).join(" ") || null;

  const shell =
    variant === "ops"
      ? "mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foam/85"
      : "no-print mt-6 rounded-2xl bg-foam p-5 text-sm text-ink";

  const title =
    variant === "ops" ? "text-foam font-semibold" : "font-semibold text-ocean-deep";
  const muted = variant === "ops" ? "text-foam/55" : "text-muted";
  const btn =
    variant === "ops"
      ? "inline-flex rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep"
      : "btn-primary inline-flex !py-2.5 text-sm";

  return (
    <div className={shell}>
      <p className={title}>Delivery tracking</p>
      <p className={`mt-1 ${muted}`}>
        Status:{" "}
        <span className="font-medium uppercase tracking-wide">
          {status?.replace(/_/g, " ") || "pending"}
        </span>
      </p>

      {trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} mt-3`}
        >
          Open live tracking
        </a>
      ) : (
        <p className={`mt-2 ${muted}`}>
          Tracking link appears once Borzo assigns a courier.
        </p>
      )}

      {courierName || courier?.phone ? (
        <p className={`mt-3 ${muted}`}>
          Courier
          {courierName ? `: ${courierName}` : ""}
          {courier?.phone ? ` · ${courier.phone}` : ""}
        </p>
      ) : null}

      {hasLive ? (
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-black/10">
          <iframe
            title="Courier location"
            className="h-48 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
          <p className={`px-2 py-1.5 text-xs ${muted}`}>
            Live location · refreshes about every 20s while active
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-coral">{error}</p> : null}
    </div>
  );
}
