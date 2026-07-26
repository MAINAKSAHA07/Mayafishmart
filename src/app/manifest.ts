import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Maya Fish",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f1f8fd",
    theme_color: "#0b2a72",
    icons: [
      {
        src: "/logo.png",
        sizes: "1080x1350",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["shopping", "food"],
    lang: "en-IN",
    id: getSiteUrl(),
  };
}
