"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";

// roles: "all" = everyone, "admin" = admin/receptionist/staff only, "clinical" = doctor/therapist + admin
const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1", access: "admin", mobileBottom: true },
  { href: "/doctor", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1", access: "clinical", mobileBottom: true },
  { href: "/patients", label: "Patients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", access: "all", mobileBottom: true },
  { href: "/patients/new", label: "Register", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", access: "admin" },
  { href: "/appointments", label: "Appts", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", access: "all", mobileBottom: true },
  { href: "/packages", label: "Packages", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", access: "admin" },
  { href: "/prescriptions", label: "Rx", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", access: "all" },
  { href: "/inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", access: "admin" },
  { href: "/billing", label: "Billing", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", access: "admin", mobileBottom: true },
  { href: "/reports", label: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", access: "admin" },
  { href: "/communications", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", access: "admin" },
  { href: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", access: "admin" },
  { href: "/security", label: "Security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", access: "admin" },
];

interface SearchResult {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface AlertItem {
  id: string;
  name?: string;
  itemName?: string;
  message?: string;
  currentStock?: number;
  reorderLevel?: number;
}

interface ReminderItem {
  id: string;
  patientName?: string;
  message?: string;
  type?: string;
  dueDate?: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  branchId?: string;
  isRead: boolean;
  createdAt: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const isClinical = user?.role === "doctor" || user?.role === "therapist";
  const filteredNavItems = navItems.filter((item) => {
    if (item.access === "all") return true;
    if (item.access === "clinical") return isClinical;
    if (item.access === "admin") return !isClinical;
    return true;
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState<AlertItem[]>([]);
  const [pendingReminders, setPendingReminders] = useState<ReminderItem[]>([]);
  const [transferNotifications, setTransferNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Clinic branding
  const [clinicName, setClinicName] = useState("AYUR GATE");
  const clinicInitials = clinicName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const totalNotifCount = lowStockAlerts.length + pendingReminders.length + transferNotifications.length;

  useEffect(() => {
    setMounted(true);
    // Fetch clinic name from settings
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.clinicName) setClinicName(data.clinicName);
    }).catch(() => {});
  }, []);

  // Fetch notifications on mount and every 60s
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [alertsRes, remindersRes, notificationsRes] = await Promise.allSettled([
        fetch("/api/inventory/alerts"),
        fetch("/api/reminders?status=pending"),
        fetch("/api/notifications"),
      ]);

      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        setLowStockAlerts(Array.isArray(data) ? data : data.alerts || data.items || []);
      }

      if (remindersRes.status === "fulfilled" && remindersRes.value.ok) {
        const data = await remindersRes.value.json();
        setPendingReminders(Array.isArray(data) ? data : data.reminders || data.items || []);
      }

      if (notificationsRes.status === "fulfilled" && notificationsRes.value.ok) {
        const data = await notificationsRes.value.json();
        setTransferNotifications(Array.isArray(data) ? data : data.notifications || []);
      }
    } catch {
      // Silently fail - notifications are non-critical
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [mounted, fetchNotifications]);

  // Search with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data) ? data : data.patients || data.items || [];
          setSearchResults(results);
          setSearchOpen(true);
        }
      } catch {
        // Silently fail
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function isActive(href: string) {
    if (!mounted) return false;
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  function getPatientDisplayName(patient: SearchResult): string {
    if (patient.name) return patient.name;
    if (patient.firstName || patient.lastName) {
      return [patient.firstName, patient.lastName].filter(Boolean).join(" ");
    }
    return `Patient #${patient.id}`;
  }

  function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function handleSearchResultClick(patientId: string) {
    setSearchTerm("");
    setMobileSearchTerm("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    router.push(`/patients/${patientId}`);
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  // Focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchRef.current) {
      mobileSearchRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Mobile search uses the same debounced search
  useEffect(() => {
    if (!mobileSearchTerm.trim()) return;
    setSearchTerm(mobileSearchTerm);
  }, [mobileSearchTerm]);

  return (
    <>
      {/* ============ MOBILE TOP HEADER (< md) ============ */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "var(--sidebar-bg, #1b3a2d)",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {/* Left: Hamburger + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg style={{ width: 22, height: 22 }} fill="none" stroke="#fff" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              backgroundColor: "#14532d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "1px",
            }}
          >
            AG
          </div>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "1px" }}>
            AYUR GATE
          </span>
        </div>

        {/* Right: Search + Notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
            aria-label="Search patients"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="rgba(255,255,255,0.8)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setMobileMenuOpen(false); setMobileSearchOpen(false); }}
              aria-label="View notifications"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              <svg style={{ width: 20, height: 20 }} fill="none" stroke="rgba(255,255,255,0.8)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {totalNotifCount > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 99, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                  {totalNotifCount > 99 ? "99+" : totalNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ============ DESKTOP TOP BAR (md+) — right of sidebar ============ */}
      <header
        className="hidden md:flex fixed top-0 right-0 z-40 items-center justify-between"
        style={{
          left: 64,
          height: 56,
          backgroundColor: "var(--sidebar-bg, #1b3a2d)",
          padding: "0 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Left: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#14532d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "1px",
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}
          >
            AG
          </div>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: "1.5px" }}>
            AYUR GATE
          </span>
          {clinicName !== "AYUR GATE" && (
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, marginLeft: 4 }}>
              — {clinicName}
            </span>
          )}
        </div>

        {/* Right: Search + Notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Search */}
          <div ref={searchRef} style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "0 12px",
                height: 36,
                width: searchTerm ? 260 : 200,
                transition: "width 0.2s ease",
              }}
            >
              <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" stroke="rgba(255,255,255,0.6)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  padding: "0 8px",
                  fontSize: 13,
                  color: "#fff",
                }}
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); setSearchOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
                  <svg style={{ width: 14, height: 14 }} fill="none" stroke="rgba(255,255,255,0.6)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Desktop search results dropdown */}
            {searchOpen && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, backgroundColor: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #e5e7eb", zIndex: 100, overflow: "hidden" }}>
                {searchResults.map((patient, idx) => (
                  <button
                    key={patient.id || idx}
                    onClick={() => handleSearchResultClick(patient.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", cursor: "pointer", textAlign: "left", borderBottom: idx < searchResults.length - 1 ? "1px solid #f3f4f6" : "none" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#d1f2e0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg style={{ width: 14, height: 14 }} fill="none" stroke="#14532d" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{getPatientDisplayName(patient)}</span>
                  </button>
                ))}
              </div>
            )}
            {searchOpen && searchResults.length === 0 && searchTerm.trim() && !searchLoading && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, backgroundColor: "#fff", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #e5e7eb", zIndex: 100, padding: 16, textAlign: "center", fontSize: 13, color: "#6b7280" }}>
                No patients found
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: "relative" }}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                backgroundColor: notifOpen ? "rgba(255,255,255,0.15)" : "transparent",
                border: "none",
                cursor: "pointer",
                position: "relative",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { if (!notifOpen) e.currentTarget.style.backgroundColor = "transparent"; }}
              title="Notifications"
            >
              <svg style={{ width: 20, height: 20 }} fill="none" stroke="rgba(255,255,255,0.8)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {totalNotifCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, backgroundColor: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 99, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                  {totalNotifCount > 99 ? "99+" : totalNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 320, backgroundColor: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #e5e7eb", zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Notifications</span>
                  {totalNotifCount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: 99 }}>{totalNotifCount}</span>
                  )}
                </div>
                <div style={{ maxHeight: 340, overflowY: "auto" }}>
                  {notifLoading && totalNotifCount === 0 && (
                    <div style={{ padding: "20px 16px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>Loading...</div>
                  )}
                  {!notifLoading && totalNotifCount === 0 && (
                    <div style={{ padding: "20px 16px", fontSize: 13, color: "#6b7280", textAlign: "center" }}>No new notifications</div>
                  )}
                  {lowStockAlerts.length > 0 && (
                    <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Low Stock</div>
                      {lowStockAlerts.slice(0, 5).map((alert, idx) => (
                        <Link key={alert.id || idx} href="/inventory/alerts" onClick={() => setNotifOpen(false)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", borderBottom: "1px solid #f3f4f6" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg style={{ width: 14, height: 14 }} fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{alert.name || alert.itemName || "Item"}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{alert.message || `Stock: ${alert.currentStock ?? "?"}`}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  {pendingReminders.length > 0 && (
                    <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reminders</div>
                      {pendingReminders.slice(0, 5).map((r, idx) => (
                        <Link key={r.id || idx} href="/communications" onClick={() => setNotifOpen(false)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", borderBottom: "1px solid #f3f4f6" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg style={{ width: 14, height: 14 }} fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{r.patientName || r.type || "Reminder"}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{r.message || "Pending"}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                  {transferNotifications.length > 0 && (
                    <>
                      <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transfers</div>
                      {transferNotifications.slice(0, 5).map((n) => (
                        <Link key={n.id} href={n.link || "/inventory/transfers"} onClick={() => { setNotifOpen(false); fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => {}); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", textDecoration: "none", borderBottom: "1px solid #f3f4f6" }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <svg style={{ width: 14, height: 14 }} fill="none" stroke="#3b82f6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{n.title}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{getTimeAgo(n.createdAt)}</div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
                {totalNotifCount > 0 && (
                  <div style={{ borderTop: "1px solid #e5e7eb", padding: "8px 16px", display: "flex", justifyContent: "space-between" }}>
                    <Link href="/inventory/alerts" onClick={() => setNotifOpen(false)} style={{ fontSize: 12, fontWeight: 600, color: "#14532d", textDecoration: "none" }}>View all</Link>
                    <button onClick={async () => { await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) }).catch(() => {}); setTransferNotifications([]); }}
                      style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Mark all read</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ============ MOBILE SEARCH BAR (below header) ============ */}
      {mobileSearchOpen && (
        <div
          className="md:hidden fixed left-0 right-0 z-40"
          style={{ top: 56, backgroundColor: "#fff", padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", borderBottom: "1px solid var(--grey-200)" }}
        >
          <div style={{ display: "flex", alignItems: "center", backgroundColor: "var(--grey-100)", borderRadius: 8, padding: "0 12px", height: 40 }}>
            <svg style={{ width: 18, height: 18, flexShrink: 0 }} fill="none" stroke="var(--grey-500)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={mobileSearchRef}
              type="text"
              placeholder="Search patients..."
              aria-label="Search patients"
              value={mobileSearchTerm}
              onChange={(e) => setMobileSearchTerm(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "0 10px", fontSize: 14, color: "var(--grey-900)" }}
            />
            {mobileSearchTerm && (
              <button onClick={() => { setMobileSearchTerm(""); setSearchTerm(""); setSearchOpen(false); }} aria-label="Clear search" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <svg style={{ width: 16, height: 16 }} fill="none" stroke="var(--grey-500)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {/* Mobile search results */}
          {searchOpen && searchResults.length > 0 && (
            <div style={{ marginTop: 8, backgroundColor: "#fff", borderRadius: 8, border: "1px solid var(--grey-200)", overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
              {searchResults.map((patient, idx) => (
                <button
                  key={patient.id || idx}
                  onClick={() => handleSearchResultClick(patient.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px", border: "none", backgroundColor: "transparent", cursor: "pointer", textAlign: "left", borderBottom: idx < searchResults.length - 1 ? "1px solid var(--grey-100)" : "none" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="var(--blue-500)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-900)" }}>{getPatientDisplayName(patient)}</span>
                </button>
              ))}
            </div>
          )}
          {searchOpen && searchResults.length === 0 && mobileSearchTerm.trim() && !searchLoading && (
            <div style={{ marginTop: 8, padding: 16, textAlign: "center", fontSize: 13, color: "var(--grey-500)" }}>No patients found</div>
          )}
        </div>
      )}

      {/* ============ MOBILE SLIDE-OUT MENU ============ */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 mobile-overlay-fade"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <nav
            className="md:hidden fixed top-14 left-0 bottom-0 z-50 mobile-menu-slide"
            style={{
              width: 280,
              backgroundColor: "var(--sidebar-bg, #1b3a2d)",
              overflowY: "auto",
              paddingBottom: 80,
            }}
          >
            {/* User info */}
            {user && (
              <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{user.name || user.email}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, textTransform: "capitalize" }}>{user.role}</div>
              </div>
            )}

            {/* All nav items */}
            <div style={{ padding: "12px 10px" }}>
              {filteredNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 14px",
                      borderRadius: 8,
                      color: active ? "#fff" : "rgba(255,255,255,0.6)",
                      backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
                      textDecoration: "none",
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Dark mode toggle + Logout */}
            <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.7)",
                  backgroundColor: "transparent",
                  border: "none",
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {theme === "dark" ? (
                    <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </div>
                {/* Toggle pill */}
                <div
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: theme === "dark" ? "#4ade80" : "rgba(255,255,255,0.2)",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: theme === "dark" ? 23 : 3,
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                    }}
                  />
                </div>
              </button>

              {/* Logout */}
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.6)",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </>
      )}

      {/* ============ MOBILE BOTTOM NAV (5 key items only) ============ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white z-50" style={{ borderTop: "1px solid var(--grey-300)", boxShadow: "0 -2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex justify-around" style={{ paddingTop: 6, paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}>
          {filteredNavItems.filter(item => item.mobileBottom).map((item) => {
            const active = mounted && isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center transition-colors"
                style={{
                  color: active ? "var(--blue-500)" : "var(--grey-600)",
                  padding: "4px 0",
                  minWidth: 56,
                }}
              >
                <svg style={{ width: 22, height: 22 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d={item.icon} />
                </svg>
                <span style={{ marginTop: 2, fontSize: 10, fontWeight: active ? 700 : 600, letterSpacing: "-0.01em" }}>{item.label}</span>
                {active && <div style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "var(--blue-500)", marginTop: 2 }} />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar — collapsed icon bar, expands as overlay on hover */}
      <aside
        className="hidden md:flex md:flex-col min-h-screen flex-shrink-0"
        style={{
          width: "64px",
          backgroundColor: "var(--sidebar-bg, #3c2415)",
        }}
      >
        {/* This is the spacer that reserves layout space */}
      </aside>

      {/* Overlay sidebar that expands on hover — only interactive after mount */}
      {mounted ? (<div
        className="hidden md:flex md:flex-col fixed top-0 left-0 h-screen"
        style={{
          width: expanded ? 220 : 64,
          backgroundColor: "var(--sidebar-bg, #3c2415)",
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          zIndex: 50,
          boxShadow: expanded ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Logo */}
        <div
          className="flex items-center py-5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            height: 56,
            paddingLeft: expanded ? 18 : 0,
            justifyContent: expanded ? "flex-start" : "center",
            transition: "padding-left 0.2s ease",
          }}
        >
          <div
            className="flex items-center justify-center rounded-lg text-white font-black flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#14532d",
              fontSize: 12,
              letterSpacing: "1px",
            }}
          >
            AG
          </div>
          <div
            className="ml-3 overflow-hidden whitespace-nowrap"
            style={{
              opacity: expanded ? 1 : 0,
              transition: "opacity 0.15s ease",
              flex: 1,
              minWidth: 0,
            }}
          >
            <h1 className="text-[15px] font-bold text-white" style={{ letterSpacing: "1.5px" }}>AYUR GATE</h1>
            <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{clinicName !== "AYUR GATE" ? clinicName : "Ayurveda Clinic"}</p>
          </div>

        </div>

        {/* Search Bar (sidebar collapsed: icon only) */}
        <div
          ref={searchRef}
          style={{
            padding: expanded ? "10px 14px" : "10px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            position: "relative",
            transition: "padding 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 8,
              height: 36,
              paddingLeft: expanded ? 10 : 0,
              justifyContent: expanded ? "flex-start" : "center",
              overflow: "hidden",
              transition: "padding-left 0.2s ease",
            }}
          >
            {/* Magnifying Glass Icon */}
            <svg
              style={{ width: 18, height: 18, flexShrink: 0 }}
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search patients..."
              aria-label="Search patients"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setSearchOpen(true);
              }}
              style={{
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                width: expanded ? "100%" : 0,
                opacity: expanded ? 1 : 0,
                padding: expanded ? "0 8px" : 0,
                transition: "opacity 0.15s ease, width 0.15s ease",
                lineHeight: "36px",
              }}
            />
            {searchLoading && expanded && (
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "rgba(255,255,255,0.6)",
                  borderRadius: "50%",
                  animation: "sidebar-spin 0.6s linear infinite",
                  marginRight: 10,
                  flexShrink: 0,
                }}
              />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchOpen && searchResults.length > 0 && expanded && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 14,
                right: 14,
                backgroundColor: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                border: "1px solid var(--grey-200, #e5e7eb)",
                zIndex: 100,
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              {searchResults.map((patient, idx) => (
                <button
                  key={patient.id || idx}
                  onClick={() => handleSearchResultClick(patient.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: idx < searchResults.length - 1 ? "1px solid var(--grey-100, #f3f4f6)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--grey-50, #f9fafb)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "var(--blue-50, #eff6ff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke="var(--blue-500, #3b82f6)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--grey-900, #111)" }}>
                    {getPatientDisplayName(patient)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {searchOpen && searchResults.length === 0 && searchTerm.trim() && !searchLoading && expanded && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 14,
                right: 14,
                backgroundColor: "#fff",
                borderRadius: 10,
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                border: "1px solid var(--grey-200, #e5e7eb)",
                zIndex: 100,
                padding: "12px 14px",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--grey-500, #6b7280)" }}>
                No patients found
              </span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4" style={{ overflowY: "auto" }}>
          <div className="space-y-1" style={{ padding: expanded ? "0 10px" : "0 8px" }}>
            {filteredNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!expanded ? item.label : undefined}
                  className="flex items-center transition-all duration-150"
                  style={{
                    borderRadius: 8,
                    color: active ? "#fff" : "rgba(255,255,255,0.55)",
                    backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
                    height: 44,
                    paddingLeft: expanded ? 14 : 0,
                    justifyContent: expanded ? "flex-start" : "center",
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                    }
                  }}
                >
                  <svg
                    className="flex-shrink-0"
                    style={{ width: 24, height: 24 }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                  </svg>
                  <span
                    className="text-[15px] font-semibold whitespace-nowrap overflow-hidden"
                    style={{
                      opacity: expanded ? 1 : 0,
                      width: expanded ? "auto" : 0,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Dark mode toggle + Logout */}
        <div style={{ padding: expanded ? "0 10px 8px" : "0 8px 8px" }}>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={!expanded ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
            className="flex items-center transition-all duration-150 w-full"
            style={{
              borderRadius: 8,
              color: "rgba(255,255,255,0.55)",
              backgroundColor: "transparent",
              height: 44,
              paddingLeft: expanded ? 14 : 0,
              justifyContent: expanded ? "flex-start" : "center",
              gap: 12,
              border: "none",
              marginBottom: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            {theme === "dark" ? (
              <svg className="flex-shrink-0" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="flex-shrink-0" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            <span className="text-[15px] font-semibold whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.15s ease" }}>
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            title={!expanded ? "Logout" : undefined}
            className="flex items-center transition-all duration-150 w-full"
            style={{
              borderRadius: 8,
              color: "rgba(255,255,255,0.55)",
              backgroundColor: "transparent",
              height: 44,
              paddingLeft: expanded ? 14 : 0,
              justifyContent: expanded ? "flex-start" : "center",
              gap: 12,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.15)"; e.currentTarget.style.color = "#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
          >
            <svg className="flex-shrink-0" style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[15px] font-semibold whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.15s ease" }}>
              Logout
            </span>
          </button>
        </div>

        {/* Footer */}
        <div
          className="py-4 flex items-center justify-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          {expanded ? (
            <p className="text-[12px] font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
              YODA Design v1.0
            </p>
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Spinner keyframes injected via style tag */}
        <style>{`
          @keyframes sidebar-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>) : null}
    </>
  );
}
