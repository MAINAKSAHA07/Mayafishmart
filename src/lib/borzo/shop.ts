/** Locked Maya Fish Mart shop — Borzo pickup point */

export const DEFAULT_BORZO_SHOP_ADDRESS =
  "Shop number 6, TMC GALA, near krishna bar and restaurants, beside happy valley society, Happy Valley, Manpada, Thane West, Thane, Maharashtra 400610, India";

export const DEFAULT_BORZO_SHOP_LAT = 19.236832678869682;
export const DEFAULT_BORZO_SHOP_LNG = 72.97205704973466;

export type CustomerAddressInput = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export function getBorzoShopConfig() {
  const address = process.env.BORZO_SHOP_ADDRESS?.trim() || DEFAULT_BORZO_SHOP_ADDRESS;
  const lat = Number(process.env.BORZO_SHOP_LAT || DEFAULT_BORZO_SHOP_LAT);
  const lng = Number(process.env.BORZO_SHOP_LNG || DEFAULT_BORZO_SHOP_LNG);
  const phone = process.env.BORZO_SHOP_PHONE?.trim() || "";
  return { address, lat, lng, phone };
}

export function formatCustomerAddress(addr: CustomerAddressInput): string {
  const parts = [
    addr.line1.trim(),
    addr.line2?.trim(),
    addr.city.trim(),
    addr.state.trim(),
    addr.pincode.trim(),
    "India",
  ].filter(Boolean);
  return parts.join(", ");
}

/** Borzo expects phones like 918880000001 */
export function normalizeIndiaPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
}

export function rupeesToPaise(amount: string | number | null | undefined): number {
  const n = typeof amount === "number" ? amount : Number.parseFloat(String(amount ?? "0"));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
