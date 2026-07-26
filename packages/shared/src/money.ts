export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function calcLineTotalPaise(qty: number, unitPricePaise: number): number {
  return Math.round(qty * unitPricePaise);
}

export function calcGstPaise(_subtotalPaise: number, _gstRate: number): number {
  // GST disabled for now — re-enable: return Math.round((_subtotalPaise * _gstRate) / 100);
  return 0;
}

export function splitCgstSgst(gstPaise: number): { cgst: number; sgst: number } {
  const half = Math.floor(gstPaise / 2);
  return { cgst: half, sgst: gstPaise - half };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Discount applied before GST; never exceeds subtotal. */
export function calcDiscountPaise(
  subtotalPaise: number,
  type: "percent" | "fixed",
  value: number
): number {
  if (subtotalPaise <= 0) return 0;
  const raw =
    type === "percent"
      ? Math.round((subtotalPaise * Number(value)) / 100)
      : Math.round(Number(value));
  return Math.max(0, Math.min(subtotalPaise, raw));
}

/**
 * Proportional GST after discount: scale original line GST by taxable/subtotal.
 */
export function calcGstAfterDiscount(
  _subtotalPaise: number,
  _discountPaise: number,
  _preDiscountGstPaise: number
): number {
  // GST disabled for now — re-enable proportional GST after discount:
  // const taxable = Math.max(0, _subtotalPaise - _discountPaise);
  // if (_subtotalPaise <= 0) return 0;
  // return Math.round((_preDiscountGstPaise * taxable) / _subtotalPaise);
  return 0;
}
