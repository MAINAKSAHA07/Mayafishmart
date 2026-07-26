import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@mayafishmart/shared/supabase/server";
import { requireStaff } from "@mayafishmart/shared/auth";
import type { Order, OrderItem } from "@mayafishmart/shared/types";
import { ReceiptDocument } from "@/components/admin/ReceiptDocument";
import { ReceiptPrintControls } from "@/components/admin/ReceiptPrintControls";

export default async function OrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const order = data as Order & { order_items: OrderItem[] };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#12263a]">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt {
            max-width: 80mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            padding: 4mm !important;
          }
          .receipt-code {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 6mm; size: auto; }
        }
        .receipt {
          margin: 1rem auto;
          padding: 1.25rem 1.35rem;
          border-radius: 1rem;
          box-shadow: 0 8px 28px rgba(11,42,114,0.08);
        }
        .receipt-logo { border-radius: 999px; }
      `}</style>
      <Suspense fallback={null}>
        <ReceiptPrintControls />
      </Suspense>
      <ReceiptDocument order={order} items={order.order_items ?? []} variant="admin" />
    </div>
  );
}
