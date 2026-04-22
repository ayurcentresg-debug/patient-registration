"use client";

/**
 * Desktop top bar — white, 56px tall, sits at top of the viewport to the
 * right of the sidebar. Mobile uses the existing mobile header inside
 * Sidebar.tsx, so this component is hidden below md (`hidden md:flex`).
 *
 * Layout contract:
 *   - Sidebar: fixed top:0, left:0, width 64px (or 220 expanded)
 *   - TopBar:  fixed top:0, left:64px, right:0, height 56px
 *   - Main:    pt-14 to clear the top bar
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

// Map URL prefixes to human-readable breadcrumb labels.
// Longest match wins so /admin/staff resolves to "Staff" not "Admin".
const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/appointments": "Appointments",
  "/packages": "Packages",
  "/prescriptions": "Prescriptions",
  "/inventory": "Inventory",
  "/billing": "Billing",
  "/communications": "Communications",
  "/reports": "Reports",
  "/feedback": "Feedback",
  "/treatments": "Treatments",
  "/doctors": "Doctors",
  "/therapists": "Therapists",
  "/admin": "Admin",
  "/admin/settings": "Clinic Settings",
  "/admin/staff": "Staff",
  "/admin/permissions": "Permissions",
  "/admin/treatments": "Treatments",
  "/admin/branches": "Branches",
  "/admin/payroll": "Payroll",
  "/admin/commission": "Commission",
  "/admin/ket": "KET",
  "/admin/merge": "Merge Duplicates",
  "/admin/audit-log": "Audit Log",
  "/admin/import": "Import",
  "/admin/clinics": "Clinics",
  "/admin/users": "Users",
  "/account": "My Account",
  "/security": "Security",
  "/subscription": "Subscription",
  "/help": "Help",
  "/doctor": "Doctor Portal",
};

function getBreadcrumbLabel(pathname: string): string {
  let bestMatch = "";
  let bestLabel = "";
  for (const [prefix, label] of Object.entries(PATH_LABELS)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      if (prefix.length > bestMatch.length) {
        bestMatch = prefix;
        bestLabel = label;
      }
    }
  }
  return bestLabel || "Home";
}

export default function TopBar() {
  const pathname = usePathname() || "";
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Wire Cmd+K / Ctrl+K to focus the search bar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initials = (user?.name || user?.email || "U")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const breadcrumb = getBreadcrumbLabel(pathname);

  return (
    <header
      className="hidden md:flex fixed top-0 right-0 z-40 items-center justify-between"
      style={{
        left: 64,                                // sit to the right of the collapsed sidebar
        height: 56,
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 20px",
        gap: 16,
      }}
    >
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2" style={{ minWidth: 0, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>AyurGate</span>
        <span style={{ color: "#d1d5db", fontSize: 13 }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          {breadcrumb}
        </span>
      </div>

      {/* Center: search */}
      <div className="flex-1 flex justify-center" style={{ minWidth: 0 }}>
        <div className="relative" style={{ width: "100%", maxWidth: 360 }}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Quick search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{
              width: "100%",
              height: 36,
              padding: "0 70px 0 36px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13,
              color: "#374151",
              background: "#f9fafb",
              outline: "none",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2d6a4f"; e.currentTarget.style.background = "#fff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#f9fafb"; }}
          />
          {/* Search icon */}
          <svg
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af", pointerEvents: "none" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* Cmd+K hint */}
          <kbd
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: "#9ca3af",
              padding: "3px 6px",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              background: "#fff",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              pointerEvents: "none",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: bell, help, dark mode, avatar */}
      <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
        {/* Bell — links to dashboard for now (notifications panel lives elsewhere) */}
        <button
          style={{ background: "none", border: "none", padding: 8, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Notifications"
          title="Notifications"
        >
          <svg style={{ width: 20, height: 20, color: "#374151" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Help */}
        <Link
          href="/help"
          style={{ padding: 8, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Help"
          title="Help"
        >
          <svg style={{ width: 20, height: 20, color: "#374151" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          style={{ background: "none", border: "none", padding: 8, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <svg style={{ width: 20, height: 20, color: "#374151" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {theme === "dark" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
        </button>

        {/* Avatar — links to account page */}
        <Link href="/account" aria-label="Account menu" style={{ display: "block", padding: 4 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              border: "1.5px solid #e5e7eb",
            }}
          >
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
