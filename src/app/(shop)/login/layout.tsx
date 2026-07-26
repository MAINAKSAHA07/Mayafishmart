import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Login",
  description: "Sign in to Maya Fish Mart to place a pickup order.",
  path: "/login",
  noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
