import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Your orders",
  description: "View your Maya Fish Mart pickup orders.",
  path: "/account",
  noIndex: true,
});

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
