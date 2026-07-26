import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@mayafishmart/shared"],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default nextConfig;
