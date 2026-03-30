"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/treatments", label: "Catalog" },
  { href: "/admin/treatments/plans", label: "Treatment Plans" },
  { href: "/admin/treatments/progress", label: "Progress Tracker" },
];

export default function TreatmentTabs() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/treatments") return pathname === "/admin/treatments";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-pill)",
              border: active ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
              background: active ? "var(--blue-50)" : "var(--white)",
              color: active ? "var(--blue-500)" : "var(--grey-600)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
