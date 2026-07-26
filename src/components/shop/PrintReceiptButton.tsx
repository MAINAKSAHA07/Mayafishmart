"use client";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="pressable btn-primary no-print mt-6 inline-flex"
    >
      Print / save receipt
    </button>
  );
}
