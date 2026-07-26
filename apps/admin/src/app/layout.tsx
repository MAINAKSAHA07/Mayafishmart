import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "Maya Ops",
    template: "%s · Maya Ops",
  },
  description: "Maya Fish Mart backoffice — orders, inventory, and AI ops.",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport = {
  themeColor: "#0b2a72",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${outfit.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
