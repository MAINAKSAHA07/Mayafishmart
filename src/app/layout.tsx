import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { buildMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Fresh fish for pickup`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Maya Fish Mart",
    "fresh fish",
    "fish market",
    "buy fish online",
    "fish pickup",
    "rohu",
    "pomfret",
    "prawns",
    "seafood India",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  ...buildMetadata({
    path: "/",
    description: SITE_DESCRIPTION,
  }),
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b2a72" },
    { media: "(prefers-color-scheme: dark)", color: "#0b2a72" },
  ],
  width: "device-width" as const,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${outfit.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
