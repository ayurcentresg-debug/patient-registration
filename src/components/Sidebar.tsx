"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { href: "/patients", label: "Patients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/patients/new", label: "Register", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  { href: "/appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/treatments", label: "Treatments", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { href: "/inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/billing", label: "Billing", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
  { href: "/reports", label: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/communications", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/security", label: "Security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const totalNotifCount = lowStockAlerts.length + pendingReminders.length;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications on mount and every 60s
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [alertsRes, remindersRes] = await Promise.allSettled([
        fetch("/api/inventory/alerts"),
        fetch("/api/reminders?status=pending"),
      ]);

      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        const data = await alertsRes.value.json();
        setLowStockAlerts(Array.isArray(data) ? data : data.alerts || data.items || []);
      }

      if (remindersRes.status === "fulfilled" && remindersRes.value.ok) {
        const data = await remindersRes.value.json();
        setPendingReminders(Array.isArray(data) ? data : data.reminders || data.items || []);
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

  function handleSearchResultClick(patientId: string) {
    setSearchTerm("");
    setSearchOpen(false);
    router.push(`/patients/${patientId}`);
  }

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: "var(--grey-300)" }}>
        <div className="flex justify-around py-1.5">
          {navItems.map((item) => {
            const active = mounted && isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center px-2 py-1.5 transition-colors"
                style={{ color: active ? "var(--blue-500)" : "var(--grey-600)" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="mt-0.5 text-[10px] font-semibold tracking-tight">{item.label}</span>
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
        {/* Logo + Notification Bell */}
        <div
          className="flex items-center py-5"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            height: 64,
            paddingLeft: expanded ? 18 : 0,
            justifyContent: expanded ? "flex-start" : "center",
            transition: "padding-left 0.2s ease",
          }}
        >
          <div
            className="flex items-center justify-center rounded-lg text-white font-black tracking-tight flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              backgroundColor: "var(--blue-500)",
              fontSize: 13,
            }}
          >
            PR
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
            <h1 className="text-[13px] font-bold text-white tracking-tight">PatientReg</h1>
            <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Clinic System</p>
          </div>

          {/* Notification Bell */}
          <div
            ref={notifRef}
            style={{
              position: "relative",
              opacity: expanded ? 1 : 0,
              width: expanded ? "auto" : 0,
              overflow: expanded ? "visible" : "hidden",
              transition: "opacity 0.15s ease",
              marginRight: expanded ? 14 : 0,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                position: "relative",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Notifications"
            >
              <svg
                style={{ width: 20, height: 20 }}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {totalNotifCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 99,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    lineHeight: 1,
                    transform: "translate(4px, -4px)",
                  }}
                >
                  {totalNotifCount > 99 ? "99+" : totalNotifCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  width: 280,
                  backgroundColor: "#fff",
                  borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                  border: "1px solid var(--grey-200, #e5e7eb)",
                  zIndex: 100,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px 8px",
                    borderBottom: "1px solid var(--grey-200, #e5e7eb)",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--grey-900, #111)" }}>
                    Notifications
                  </span>
                </div>

                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {notifLoading && totalNotifCount === 0 && (
                    <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--grey-500, #6b7280)", textAlign: "center" }}>
                      Loading...
                    </div>
                  )}

                  {!notifLoading && totalNotifCount === 0 && (
                    <div style={{ padding: "16px 14px", fontSize: 12, color: "var(--grey-500, #6b7280)", textAlign: "center" }}>
                      No new notifications
                    </div>
                  )}

                  {/* Low Stock Alerts */}
                  {lowStockAlerts.length > 0 && (
                    <>
                      <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--grey-500, #6b7280)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Low Stock Alerts
                      </div>
                      {lowStockAlerts.slice(0, 5).map((alert, idx) => (
                        <Link
                          key={alert.id || idx}
                          href="/inventory/alerts"
                          onClick={() => setNotifOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "8px 14px",
                            textDecoration: "none",
                            borderBottom: "1px solid var(--grey-100, #f3f4f6)",
                            cursor: "pointer",
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
                              borderRadius: 6,
                              backgroundColor: "#fef2f2",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <svg style={{ width: 14, height: 14 }} fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--grey-900, #111)", lineHeight: 1.3 }}>
                              {alert.name || alert.itemName || "Item"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--grey-500, #6b7280)", marginTop: 1 }}>
                              {alert.message || (alert.currentStock !== undefined
                                ? `Stock: ${alert.currentStock} (reorder at ${alert.reorderLevel || 0})`
                                : "Low stock warning")}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {/* Pending Reminders */}
                  {pendingReminders.length > 0 && (
                    <>
                      <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--grey-500, #6b7280)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Pending Reminders
                      </div>
                      {pendingReminders.slice(0, 5).map((reminder, idx) => (
                        <Link
                          key={reminder.id || idx}
                          href="/communications/reminders"
                          onClick={() => setNotifOpen(false)}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            padding: "8px 14px",
                            textDecoration: "none",
                            borderBottom: "1px solid var(--grey-100, #f3f4f6)",
                            cursor: "pointer",
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
                              borderRadius: 6,
                              backgroundColor: "#fffbeb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            <svg style={{ width: 14, height: 14 }} fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--grey-900, #111)", lineHeight: 1.3 }}>
                              {reminder.patientName || reminder.type || "Reminder"}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--grey-500, #6b7280)", marginTop: 1 }}>
                              {reminder.message || (reminder.dueDate ? `Due: ${reminder.dueDate}` : "Pending reminder")}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>

                {totalNotifCount > 0 && (
                  <div style={{ borderTop: "1px solid var(--grey-200, #e5e7eb)", padding: "8px 14px" }}>
                    <Link
                      href="/inventory/alerts"
                      onClick={() => setNotifOpen(false)}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--blue-500, #3b82f6)",
                        textDecoration: "none",
                      }}
                    >
                      View all alerts
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
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
            {navItems.map((item) => {
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
                    className="text-[13px] font-semibold whitespace-nowrap overflow-hidden"
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

        {/* Logout button */}
        <div style={{ padding: expanded ? "0 10px 8px" : "0 8px 8px" }}>
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
            <span className="text-[13px] font-semibold whitespace-nowrap overflow-hidden" style={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0, transition: "opacity 0.15s ease" }}>
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
            <p className="text-[10px] font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
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
