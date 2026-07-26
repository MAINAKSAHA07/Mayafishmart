"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartBadge } from "@/components/shop/CartBadge";
import { LogoutButton } from "@/components/shop/LogoutButton";
import { Logo } from "@/components/ui/Logo";
import type { Profile } from "@/lib/types";

export default function ShopLayoutShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={`glass-bar sticky top-0 z-40 transition-[box-shadow] duration-200 ${
          scrolled ? "shadow-[0_8px_24px_rgba(11,42,114,0.08)]" : ""
        }`}
      >
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="nav-hit group flex items-center gap-2.5 !p-0">
            <Logo size={42} priority className="shadow-[0_2px_8px_rgba(11,42,114,0.18)]" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-ocean-deep transition-colors group-hover:text-ocean">
                Maya Fish Mart
              </span>
              <span className="eyebrow mt-0.5 text-aqua">Serving since 2004</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
            <Link href="/#catch" className="nav-hit hidden sm:inline-flex">
              Today&apos;s catch
            </Link>
            <Link href="/cart" className="nav-hit relative px-2">
              Cart
              <CartBadge />
            </Link>
            {profile ? (
              <>
                <Link href="/account" className="nav-hit">
                  Orders
                </Link>
                {["owner", "manager", "staff", "viewer"].includes(profile.role) && (
                  <Link href="/admin" className="nav-hit text-aqua">
                    Ops
                  </Link>
                )}
                <span className="ml-1 hidden sm:inline">
                  <LogoutButton />
                </span>
              </>
            ) : (
              <Link href="/login" className="btn-primary ml-1 !px-4 !py-2 text-sm">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 bg-ocean-deep text-foam">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <Logo size={52} />
              <div>
                <p className="font-display text-[1.6rem] tracking-[-0.02em]">Maya Fish Mart</p>
                <p className="eyebrow text-aqua">Serving since 2004</p>
              </div>
            </div>
            <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-foam/70">
              Fresh catch, counter pickup. Order online, collect when ready.
            </p>
          </div>
          <p className="text-xs tracking-wide text-foam/45">
            © {new Date().getFullYear()} Maya Fish Mart
          </p>
        </div>
      </footer>
    </div>
  );
}
