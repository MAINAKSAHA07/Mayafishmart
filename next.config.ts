import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/shop", destination: "/catch", permanent: true },
      { source: "/shop/:category", destination: "/catch/:category", permanent: true },
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
      { source: "/menu", destination: "/catch", permanent: true },
      { source: "/catalog", destination: "/catch", permanent: true },
      // Backoffice moved to standalone admin app
      {
        source: "/admin",
        destination: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: `${process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001"}/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
