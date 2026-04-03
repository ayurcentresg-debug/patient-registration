"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/settings", label: "Clinic Settings" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/treatments", label: "Treatments" },
  { href: "/admin/branches", label: "Branches" },
  { href: "/admin/commission", label: "Commission" },
  { href: "/admin/payroll", label: "Payroll" },
  { href: "/admin/merge", label: "Merge Duplicates" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div
      className="flex gap-0 mb-6 overflow-x-auto hide-scrollbar"
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
            className="px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-150"
            style={{
              color: active ? "var(--blue-500)" : "var(--grey-600)",
              borderBottom: active ? "2px solid var(--blue-500)" : "2px solid transparent",
              marginBottom: "-2px",
              background: active ? "var(--blue-50)" : "transparent",
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
