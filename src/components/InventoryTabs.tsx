"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/inventory", label: "Items" },
  { href: "/inventory/alerts", label: "Alerts" },
  { href: "/inventory/stock-audit", label: "Stock Audit" },
  { href: "/inventory/reports", label: "Reports" },
  { href: "/inventory/transfers", label: "Transfers" },
  { href: "/inventory/branch-stock", label: "Branch Stock" },
  { href: "/inventory/purchase-orders", label: "Purchase Orders" },
  { href: "/inventory/suppliers", label: "Suppliers" },
  { href: "/inventory/import", label: "Import" },
];

export default function InventoryTabs() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/inventory") return pathname === "/inventory";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div
      className="flex gap-0 mb-6 overflow-x-auto"
      style={{
        borderBottom: "2px solid var(--grey-200)",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150"
            style={{
              color: active ? "var(--blue-500)" : "var(--grey-600)",
              borderBottom: active ? "2px solid var(--blue-500)" : "2px solid transparent",
              marginBottom: "-2px",
              background: active ? "var(--blue-50, rgba(33,150,243,0.04))" : "transparent",
              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
