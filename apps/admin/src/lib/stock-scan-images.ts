import { createAdminClient } from "@mayafishmart/shared/supabase/admin";

export const REJECTED_IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
export const APPLIED_IMAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function imageExpiresAtForStatus(status: "rejected" | "applied", from = new Date()) {
  const ms = status === "rejected" ? REJECTED_IMAGE_TTL_MS : APPLIED_IMAGE_TTL_MS;
  return new Date(from.getTime() + ms).toISOString();
}

/** Resolve bucket object path from storage_path or legacy signed URL / path. */
export function resolveStockScanObjectPath(
  imagePath: string | null | undefined,
  storagePath?: string | null,
): string | null {
  if (storagePath && storagePath.trim()) return storagePath.trim();
  if (!imagePath) return null;
  const raw = imagePath.trim();
  if (raw.startsWith("scans/")) return raw;
  const match = raw.match(/\/object\/(?:sign|public)\/stock-scans\/([^?]+)/i);
  if (match?.[1]) return decodeURIComponent(match[1]);
  const alt = raw.match(/\/stock-scans\/([^?]+)/i);
  if (alt?.[1]) return decodeURIComponent(alt[1]);
  return null;
}

export async function signStockScanImage(
  imagePath: string | null | undefined,
  storagePath?: string | null,
  purgedAt?: string | null,
): Promise<string | null> {
  if (purgedAt) return null;
  const objectPath = resolveStockScanObjectPath(imagePath, storagePath);
  if (!objectPath) {
    // Legacy: already a usable URL
    if (imagePath?.startsWith("http")) return imagePath;
    return null;
  }
  const admin = createAdminClient();
  const { data } = await admin.storage.from("stock-scans").createSignedUrl(objectPath, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

/**
 * Delete expired stock-scan images from storage and mark rows purged.
 * Safe to call on page load or via cron.
 */
export async function purgeExpiredStockScanImages(limit = 40): Promise<{
  purged: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const errors: string[] = [];
  let purged = 0;

  const { data: due, error } = await admin
    .from("stock_scans")
    .select("id, image_path, storage_path")
    .is("image_purged_at", null)
    .not("image_expires_at", "is", null)
    .lte("image_expires_at", now)
    .limit(limit);

  if (error) {
    return { purged: 0, errors: [error.message] };
  }

  for (const scan of due ?? []) {
    const objectPath = resolveStockScanObjectPath(scan.image_path, scan.storage_path);
    if (objectPath) {
      const { error: delError } = await admin.storage.from("stock-scans").remove([objectPath]);
      if (delError) {
        errors.push(`${scan.id}: ${delError.message}`);
        // Still mark purged if object is already gone
        if (!/not found|404/i.test(delError.message)) continue;
      }
      await admin
        .from("inventory_movements")
        .update({ image_path: null })
        .eq("image_path", scan.image_path);
      if (scan.storage_path) {
        await admin
          .from("inventory_movements")
          .update({ image_path: null })
          .eq("image_path", scan.storage_path);
      }
    }

    const { error: updError } = await admin
      .from("stock_scans")
      .update({
        image_purged_at: now,
        image_path: "",
      })
      .eq("id", scan.id);

    if (updError) {
      errors.push(`${scan.id}: ${updError.message}`);
      continue;
    }
    purged += 1;
  }

  return { purged, errors };
}
