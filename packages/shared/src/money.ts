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

export function calcGstPaise(subtotalPaise: number, gstRate: number): number {
  return Math.round((subtotalPaise * gstRate) / 100);
}

export function splitCgstSgst(gstPaise: number): { cgst: number; sgst: number } {
  const half = Math.floor(gstPaise / 2);
  return { cgst: half, sgst: gstPaise - half };
}
