import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Cart",
  description: "Your Maya Fish Mart cart — review items before pickup checkout.",
  path: "/cart",
  noIndex: true,
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
