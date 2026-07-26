"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppRole } from "@/lib/types";

const NAV: Array<{ href: string; label: string; roles?: AppRole[] }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/new", label: "Counter order", roles: ["owner", "manager", "staff"] },
  { href: "/admin/products", label: "Catalog", roles: ["owner", "manager"] },
  { href: "/admin/inventory", label: "Inventory", roles: ["owner", "manager", "staff"] },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/insights", label: "AI Insights", roles: ["owner", "manager"] },
  { href: "/admin/stock-scan", label: "Image stock", roles: ["owner", "manager", "staff"] },
  { href: "/admin/users", label: "Users", roles: ["owner"] },
];

export function AdminNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const links = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:overflow-visible lg:pb-6" aria-label="Backoffice">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
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
      <Link href="/" className="admin-nav-item mt-2 whitespace-nowrap text-aqua">
        Storefront
      </Link>
    </nav>
  );
}
