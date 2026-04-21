"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import BranchSelector from "@/components/BranchSelector";
import { getVisibleNavItems } from "@/lib/permissions";

const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1", mobileBottom: true },
  { href: "/onboarding/dashboard", label: "Setup Guide", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/doctor", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1", mobileBottom: true },
  { href: "/patients", label: "Patients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", mobileBottom: true },
  { href: "/patients/new", label: "Register", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  { href: "/appointments", label: "Appts", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", mobileBottom: true },
  { href: "/appointments/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM12 11v4m0 0h4m-4 0H8" },
  { href: "/packages", label: "Packages", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { href: "/prescriptions", label: "Rx", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/inventory", label: "Inventory", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/billing", label: "Billing", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", mobileBottom: true },
  { href: "/reports", label: "Reports", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/communications", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/cme/admin", label: "CME / Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/feedback", label: "Feedback", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { href: "/waitlist", label: "Waitlist", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/admin/import", label: "Import", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
  { href: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/security", label: "Security", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
];

interface SearchResult {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  staffIdNumber?: string;
  patientIdNumber?: string;
  _type?: string;
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
  const { user, logout, rolePermissions } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const userRole = user?.role || "staff";
  const visibleNav = getVisibleNavItems(userRole, rolePermissions);
  const filteredNavItems = navItems.filter((item) => visibleNav[item.href] !== false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Account dropdown state (top-right avatar menu)
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Help modal state
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpInfo, setHelpInfo] = useState<{ plan?: string; status?: string; trialDaysRemaining?: number | null; clinicName?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState<AlertItem[]>([]);
  const [pendingReminders, setPendingReminders] = useState<ReminderItem[]>([]);
  const [transferNotifications, setTransferNotifications] = useState<NotificationItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Clinic branding
  const [clinicName, setClinicName] = useState("");
  const [clinicLogoUrl, setClinicLogoUrl] = useState<string | null>(null);
  const clinicInitials = clinicName.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const userInitials = (user?.name || "").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  // Filter upcoming appointments (not yet passed)
  const upcomingAppointments = todayAppointments.filter((a) => {
    if (!a.time) return true;
    const now = new Date();
    const [h, m] = (a.time as string).split(":").map(Number);
    const apptTime = new Date();
    apptTime.setHours(h, m, 0, 0);
    return apptTime >= now;
  });

  const totalNotifCount = lowStockAlerts.length + pendingReminders.length + transferNotifications.length + upcomingAppointments.length;

  useEffect(() => {
    setMounted(true);
    // Fetch clinic name + logo from settings
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(data => {
      if (data?.clinicName) setClinicName(data.clinicName);
      if (data?.logoUrl) setClinicLogoUrl(data.logoUrl);
    }).catch(() => {});
  }, []);

  // Fetch notifications on mount and every 60s
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [alertsRes, remindersRes, notificationsRes, appointmentsRes] = await Promise.allSettled([
        fetch("/api/inventory/alerts"),
        fetch("/api/reminders?status=pending"),
        fetch("/api/notifications"),
        fetch("/api/appointments/today"),
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

      if (appointmentsRes.status === "fulfilled" && appointmentsRes.value.ok) {
        const data = await appointmentsRes.value.json();
        setTodayAppointments(Array.isArray(data) ? data : []);
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
        // Global search: patients + staff + appointments
        const [patientsRes, staffRes] = await Promise.allSettled([
          fetch(`/api/patients?search=${encodeURIComponent(searchTerm.trim())}&limit=5`),
          fetch(`/api/staff?search=${encodeURIComponent(searchTerm.trim())}`),
        ]);

        const allResults: SearchResult[] = [];

        if (patientsRes.status === "fulfilled" && patientsRes.value.ok) {
          const data = await patientsRes.value.json();
          const patients = Array.isArray(data) ? data : data.patients || data.items || [];
          patients.slice(0, 5).forEach((p: SearchResult & { patientIdNumber?: string }) => {
            allResults.push({ ...p, _type: "patient" as string } as SearchResult);
          });
        }

        if (staffRes.status === "fulfilled" && staffRes.value.ok) {
          const data = await staffRes.value.json();
          const staffList = Array.isArray(data) ? data : data.staff || [];
          staffList.slice(0, 3).forEach((s: SearchResult & { role?: string }) => {
            allResults.push({ ...s, _type: "staff" as string } as SearchResult);
          });
        }

        setSearchResults(allResults);
        setSearchOpen(true);
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
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
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

  function handleSearchResultClick(result: SearchResult) {
    setSearchTerm("");
    setMobileSearchTerm("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
    if (result._type === "staff") {
      router.push(`/admin/staff`);
    } else {
      router.push(`/patients/${result.id}`);
    }
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
          {/* Clinic logo removed from mobile header to eliminate all duplicates */}
          <div style={{ marginLeft: 4 }}>
            <BranchSelector />
          </div>
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
          {/* Help (mobile) */}
          <button
            onClick={() => { setHelpOpen(true); setMobileMenuOpen(false); setMobileSearchOpen(false); setNotifOpen(false); }}
            aria-label="Help and support"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="rgba(255,255,255,0.8)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {/* Avatar (mobile) */}
          <button
            onClick={() => { setAccountOpen(!accountOpen); setMobileMenuOpen(false); setMobileSearchOpen(false); setNotifOpen(false); }}
            aria-label="Account menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: 4 }}
          >
            {clinicLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clinicLogoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 99, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div style={{ width: 30, height: 30, borderRadius: 99, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, border: "1.5px solid rgba(255,255,255,0.3)" }}>
                {userInitials}
              </div>
            )}
          </button>
        </div>
      </header>

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

              {/* My Account */}
              <Link
                href="/account"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 8,
                  color: pathname === "/account" ? "#fff" : "rgba(255,255,255,0.6)",
                  backgroundColor: pathname === "/account" ? "rgba(255,255,255,0.12)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "left",
                }}
              >
                <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Account
              </Link>

              {/* Subscription */}
              <Link
                href="/subscription"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 8,
                  color: pathname === "/subscription" ? "#fff" : "rgba(255,255,255,0.6)",
                  backgroundColor: pathname === "/subscription" ? "rgba(255,255,255,0.12)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "left",
                }}
              >
                <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Subscription
              </Link>

              {/* Help */}
              <Link
                href="/help"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 8,
                  color: pathname === "/help" ? "#fff" : "rgba(255,255,255,0.6)",
                  backgroundColor: pathname === "/help" ? "rgba(255,255,255,0.12)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: "none",
                  textAlign: "left",
                }}
              >
                <svg style={{ width: 22, height: 22, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </Link>

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
          {clinicLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinicLogoUrl}
              alt={clinicName || "Clinic"}
              className="flex-shrink-0"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
            />
          ) : (
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
              {clinicInitials || "·"}
            </div>
          )}
          {/* Clinic name/subtitle removed to eliminate overlap with mobile header */}
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
              placeholder="Search patients, staff..."
              aria-label="Search patients and staff"
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
              {searchResults.map((patient, idx) => {
                const isStaff = (patient as SearchResult & { _type?: string })._type === "staff";
                return (
                <button
                  key={patient.id || idx}
                  onClick={() => handleSearchResultClick(patient)}
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
                      backgroundColor: isStaff ? "#dbeafe" : "var(--blue-50)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: 14, height: 14 }} fill="none" stroke={isStaff ? "#1e40af" : "var(--blue-500)"} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--grey-900, #111)" }}>
                      {getPatientDisplayName(patient)}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", padding: "1px 5px", borderRadius: 3, backgroundColor: isStaff ? "#dbeafe" : "#d1f2e0", color: isStaff ? "#1e40af" : "#14532d", alignSelf: "flex-start" }}>
                      {isStaff ? ((patient as SearchResult & { role?: string }).role || "Staff") : "Patient"}
                    </span>
                  </div>
                </button>
                );
              })}
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
                No results found
              </span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 hide-scrollbar" style={{ overflowY: "auto" }}>
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
