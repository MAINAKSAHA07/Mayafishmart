import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Order details",
  description: "Maya Fish Mart order status and pickup details.",
  path: "/orders",
  noIndex: true,
});

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
