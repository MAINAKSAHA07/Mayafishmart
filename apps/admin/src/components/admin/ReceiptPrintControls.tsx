"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ReceiptPrintControls() {
  const search = useSearchParams();
  const router = useRouter();
  const auto = search.get("print") === "1";

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => {
      window.print();
    }, 350);
    const onAfter = () => {
      // keep page open for re-print; strip auto flag if present
      if (search.get("print") === "1") {
        router.replace(window.location.pathname);
      }
    };
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [auto, router, search]);

  return (
    <div className="no-print mx-auto flex max-w-[420px] gap-2 px-4 py-4">
      <button
        type="button"
        onClick={() => window.print()}
        className="pressable flex-1 rounded-full bg-[#0b2a72] px-4 py-2.5 text-sm font-semibold text-white"
      >
        Print receipt
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="pressable rounded-full bg-[#eef2f7] px-4 py-2.5 text-sm font-semibold text-[#12263a]"
      >
        Close
      </button>
    </div>
  );
}
