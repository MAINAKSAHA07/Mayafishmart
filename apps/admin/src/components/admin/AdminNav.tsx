"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@mayafishmart/shared/types";

const NAV: Array<{ href: string; label: string; roles?: AppRole[] }> = [
  { href: "/", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/orders/new", label: "Counter order", roles: ["owner", "manager", "staff"] },
  { href: "/products", label: "Catalog", roles: ["owner", "manager"] },
  { href: "/inventory", label: "Inventory", roles: ["owner", "manager", "staff"] },
  { href: "/customers", label: "Customers" },
  { href: "/insights", label: "AI Insights", roles: ["owner", "manager"] },
  { href: "/stock-scan", label: "Image stock", roles: ["owner", "manager", "staff"] },
  { href: "/users", label: "Users", roles: ["owner"] },
];

export function AdminNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const links = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:pb-6" aria-label="Backoffice">
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
            className="admin-nav-item whitespace-nowrap"
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href={process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000"}
        className="admin-nav-item mt-2 whitespace-nowrap text-aqua"
      >
        Storefront
      </a>
    </nav>
  );
}
