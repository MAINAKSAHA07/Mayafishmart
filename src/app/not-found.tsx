import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Page not found",
  description: "This page does not exist on Maya Fish Mart.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <p className="eyebrow text-aqua">404</p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,2.75rem)] text-ocean-deep">Page not found</h1>
      <p className="mt-3 text-muted">
        That link may be old or mistyped. Browse today&apos;s catch instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/catch" className="btn-primary">
          Today&apos;s catch
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
