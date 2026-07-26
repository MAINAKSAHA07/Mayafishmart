"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { AppRole } from "@mayafishmart/shared/types";
import { Logo } from "@/components/ui/Logo";

const NAV: Array<{ href: string; label: string; roles?: AppRole[] }> = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/orders/new", label: "Counter order", roles: ["owner", "manager", "staff"] },
  { href: "/products", label: "Catalog", roles: ["owner", "manager"] },
  { href: "/coupons", label: "Coupons", roles: ["owner", "manager"] },
  { href: "/inventory", label: "Inventory", roles: ["owner", "manager", "staff"] },
  { href: "/customers", label: "Customers" },
  { href: "/stock-scan", label: "Image stock", roles: ["owner", "manager", "staff"] },
  { href: "/insights", label: "AI Insights", roles: ["owner", "manager"] },
  { href: "/users", label: "Users", roles: ["owner"] },
];

const SHEET_WIDTH = 288;
const STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

/** Apple-style exponential projection for flick landing. */
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function NavLinks({
  role,
  onNavigate,
}: {
  role: AppRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1 px-2 pb-6" aria-label="Backoffice">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            data-active={active}
            className="admin-nav-item"
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href={STOREFRONT}
        className="admin-nav-item mt-3 text-aqua"
        onClick={onNavigate}
      >
        Storefront
      </a>
    </nav>
  );
}

function Brand({ role }: { role: AppRole }) {
  return (
    <div className="px-5 py-5">
      <Link href="/" className="flex items-center gap-2.5">
        <Logo size={36} />
        <span className="font-display text-[1.2rem] tracking-[-0.02em] text-white">
          Maya Ops
        </span>
      </Link>
      <p className="eyebrow mt-2 text-aqua">{role}</p>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-4 w-5" aria-hidden>
      <span
        className={`absolute left-0 h-0.5 w-5 rounded-full bg-white transition-[transform,top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "top-1.5 rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-white transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 h-0.5 w-5 rounded-full bg-white transition-[transform,top] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "top-1.5 -rotate-45" : "top-3"
        }`}
      />
    </span>
  );
}

export function AdminShell({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const x = useMotionValue(0);
  const scrimOpacity = useTransform(x, [-SHEET_WIDTH, 0], [0, 0.55]);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => setOpen(true), []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = x.get() + project(info.velocity.x);
    const shouldClose = projected < -SHEET_WIDTH * 0.35 || info.velocity.x < -400;
    if (shouldClose) {
      close();
    } else {
      animate(x, 0, {
        type: "spring",
        bounce: Math.abs(info.velocity.x) > 200 ? 0.15 : 0,
        duration: 0.35,
        velocity: info.velocity.x,
      });
    }
  }

  return (
    <div className="min-h-dvh bg-[#08183c] text-foam">
      {/* Mobile top chrome — translucent material */}
      <header className="ops-topbar sticky top-0 z-40 lg:hidden">
        <div className="safe-x flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} />
            <div className="min-w-0">
              <p className="font-display truncate text-[1.05rem] leading-tight tracking-[-0.02em] text-white">
                Maya Ops
              </p>
              <p className="eyebrow text-[0.65rem] text-aqua">{role}</p>
            </div>
          </Link>
          <button
            type="button"
            className="pressable ops-icon-btn"
            aria-expanded={open}
            aria-controls={titleId}
            aria-label={open ? "Close menu" : "Open menu"}
            onPointerDown={(e) => {
              // Instant press feedback before release
              e.currentTarget.dataset.pressed = "true";
            }}
            onPointerUp={(e) => {
              e.currentTarget.dataset.pressed = "false";
            }}
            onPointerLeave={(e) => {
              e.currentTarget.dataset.pressed = "false";
            }}
            onClick={() => (open ? close() : openMenu())}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <aside className="glass-dark hidden lg:block lg:min-h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-white/8">
          <Brand role={role} />
          <NavLinks role={role} />
        </aside>

        <main className="safe-x flex-1 py-6 lg:py-9">{children}</main>
      </div>

      {/* Mobile sheet — interruptible, velocity-aware */}
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <motion.button
              type="button"
              aria-label="Dismiss menu"
              className="absolute inset-0 bg-black"
              style={{ opacity: scrimOpacity }}
              onClick={close}
            />
            <motion.aside
              ref={sheetRef}
              id={titleId}
              className="ops-sheet absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col will-change-transform"
              style={{ x }}
              initial={{ x: -SHEET_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -SHEET_WIDTH }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              drag="x"
              dragConstraints={{ left: -SHEET_WIDTH, right: 0 }}
              dragElastic={{ left: 0.08, right: 0.02 }}
              onDragEnd={onDragEnd}
            >
              <Brand role={role} />
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <NavLinks role={role} onNavigate={close} />
              </div>
              <p className="safe-b px-5 pb-5 text-[0.7rem] text-foam/40">
                Swipe left or tap outside to close
              </p>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
