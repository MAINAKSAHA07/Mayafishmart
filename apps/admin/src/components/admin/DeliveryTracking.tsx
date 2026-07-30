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
  status?: string | null;
  trackingUrl?: string | null;
  courier?: Courier | null;
  error?: string;
};

export function DeliveryTracking({
  orderId,
  initialStatus,
  initialTrackingUrl,
}: {
  orderId: string;
  initialStatus?: string | null;
  initialTrackingUrl?: string | null;
}) {
  const [status, setStatus] = useState(initialStatus ?? null);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl ?? null);
  const [courier, setCourier] = useState<Courier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}/delivery`, { cache: "no-store" });
        const data = (await res.json()) as DeliveryPayload;
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
  }, [orderId]);

  const lat = courier?.latitude ? Number(courier.latitude) : NaN;
  const lng = courier?.longitude ? Number(courier.longitude) : NaN;
  const hasLive = Number.isFinite(lat) && Number.isFinite(lng);
  const courierName = [courier?.name, courier?.surname].filter(Boolean).join(" ") || null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foam/85">
      <p className="font-semibold text-foam">Delivery tracking</p>
      <p className="mt-1 text-foam/55">
        Status:{" "}
        <span className="font-medium uppercase tracking-wide text-aqua">
          {status?.replace(/_/g, " ") || "pending"}
        </span>
      </p>

      {trackingUrl ? (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex rounded-full bg-aqua px-4 py-2 text-sm font-semibold text-ocean-deep"
        >
          Open live tracking
        </a>
      ) : (
        <p className="mt-2 text-foam/55">
          Tracking link appears once Borzo assigns a courier.
        </p>
      )}

      {courierName || courier?.phone ? (
        <p className="mt-3 text-foam/55">
          Courier
          {courierName ? `: ${courierName}` : ""}
          {courier?.phone ? ` · ${courier.phone}` : ""}
        </p>
      ) : null}

      {hasLive ? (
        <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
          <iframe
            title="Courier location"
            className="h-44 w-full border-0 bg-white"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
          <p className="px-2 py-1.5 text-xs text-foam/45">
            Live location · refreshes ~20s while courier is active
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-coral">{error}</p> : null}
    </div>
  );
}
