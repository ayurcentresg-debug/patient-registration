"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/cme/admin", label: "Dashboard" },
  { href: "/cme/admin/events/new", label: "Create Event" },
  { href: "/cme/admin/speakers", label: "Speakers" },
];

export default function CMEAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sub-navigation bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 sm:px-8 flex flex-wrap items-center">
        <span className="text-[15px] font-extrabold text-amber-400 mr-8 py-3.5 tracking-wide">
          CME / Webinar Admin
        </span>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/cme/admin"
              ? pathname === "/cme/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3.5 px-4 sm:px-5 text-[13px] no-underline transition-colors duration-150 border-b-2 ${
                isActive
                  ? "font-bold text-amber-400 border-amber-400"
                  : "font-medium text-gray-400 border-transparent hover:text-gray-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      <div className="px-4 sm:px-8 py-6 max-w-[1200px] mx-auto">
        {children}
      </div>
    </div>
  );
}
