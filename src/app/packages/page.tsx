"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PatientPackage {
  id: string;
  packageNumber: string;
  status: string;
  patientName: string;
  patientId: string;
  patientIdNumber: string;
  treatmentName: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  totalPrice: number;
  paidAmount: number;
  expiryDate: string;
  purchaseDate: string;
  createdAt: string;
}

interface PackageStats {
  active: number;
  expiringSoon: number;
  completed: number;
  totalRevenue: number;
}

type SortOption = "recent" | "expiring" | "sessions";
type StatusFilter = "all" | "active" | "completed" | "expired" | "refunded";

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: "#e8f5e9", color: "var(--green)" },
  completed: { bg: "var(--grey-200)", color: "var(--grey-600)" },
  expired: { bg: "#ffebee", color: "var(--red)" },
  cancelled: { bg: "#ffebee", color: "var(--red)" },
  refunded: { bg: "#fff3e0", color: "#f57c00" },
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "sessions", label: "Most Sessions" },
];

// ─── Utility ────────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function daysRemaining(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryColor(days: number): string {
  if (days < 0) return "var(--red)";
  if (days < 7) return "var(--red)";
  if (days < 30) return "#f57c00";
  return "var(--grey-600)";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PackagesPage() {
  const [mounted, setMounted] = useState(false);
  const [packages, setPackages] = useState<PatientPackage[]>([]);
  const [stats, setStats] = useState<PackageStats>({ active: 0, expiringSoon: 0, completed: 0, totalRevenue: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Packages ───────────────────────────────────────────────────────
  const fetchPackages = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);

    fetch(`/api/patient-packages?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.packages || data.items || [];
        const mapped: PatientPackage[] = list.map((pkg: Record<string, unknown>) => ({
          id: pkg.id as string,
          packageNumber: (pkg.packageNumber as string) || `PKG-${String(pkg.id).slice(0, 8)}`,
          status: (pkg.status as string) || "active",
          patientName: (pkg.patientName as string) || "",
          patientId: (pkg.patientId as string) || "",
          patientIdNumber: (pkg.patientIdNumber as string) || "",
          treatmentName: (pkg.treatmentName as string) || "",
          packageName: (pkg.packageName as string) || "",
          totalSessions: (pkg.totalSessions as number) ?? 0,
          usedSessions: (pkg.usedSessions as number) ?? 0,
          totalPrice: (pkg.totalPrice as number) ?? 0,
          paidAmount: (pkg.paidAmount as number) ?? 0,
          expiryDate: (pkg.expiryDate as string) || "",
          purchaseDate: (pkg.purchaseDate as string) || (pkg.createdAt as string) || "",
          createdAt: (pkg.createdAt as string) || "",
        }));
        setPackages(mapped);

        // Compute stats from the data
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const activeCount = mapped.filter((p) => p.status === "active").length;
        const completedCount = mapped.filter((p) => p.status === "completed").length;
        const expiringSoonCount = mapped.filter((p) => {
          if (p.status !== "active" || !p.expiryDate) return false;
          const exp = new Date(p.expiryDate);
          return exp > now && exp <= thirtyDaysFromNow;
        }).length;
        const totalRev = mapped.reduce((sum, p) => sum + p.paidAmount, 0);

        setStats({ active: activeCount, expiringSoon: expiringSoonCount, completed: completedCount, totalRevenue: totalRev });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchPackages, 300);
    return () => clearTimeout(timeout);
  }, [fetchPackages]);

  // ─── Client-side sorting ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const result = [...packages];
    result.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.createdAt || b.purchaseDate).getTime() - new Date(a.createdAt || a.purchaseDate).getTime();
        case "expiring":
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        case "sessions":
          return b.totalSessions - a.totalSessions;
        default:
          return 0;
      }
    });
    return result;
  }, [packages, sortBy]);

  function getStatusStyle(status: string) {
    return STATUS_COLORS[status] || STATUS_COLORS.active;
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Packages</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {sorted.length} package{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/packages/new"
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sell New Package
        </Link>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Active Packages</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.active}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#c8e6c9", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Expiring Soon</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: stats.expiringSoon > 0 ? "#f57c00" : "var(--grey-900)" }}>{stats.expiringSoon}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#ffe0b2", borderRadius: "var(--radius-sm)", color: "#f57c00" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Completed</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.completed}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#e1bee7", borderRadius: "var(--radius-sm)", color: "#7b1fa2" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Revenue</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.totalRevenue ?? 0).toLocaleString("en-SG")}
              </p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100, #bbdefb)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Chips */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className="px-3 py-1.5 text-[14px] font-semibold transition-colors duration-150"
                style={{
                  borderRadius: "var(--radius-pill)",
                  background: statusFilter === s.value ? "var(--blue-500)" : "var(--white)",
                  color: statusFilter === s.value ? "var(--white)" : "var(--grey-700)",
                  border: statusFilter === s.value ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by patient name, package #, treatment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[15px]"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
              aria-label="Search packages"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center" style={{ color: "var(--grey-500)" }} aria-label="Clear search">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 150 }}
          >
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {(search || statusFilter !== "all") && (
          <div className="flex items-center">
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-[13px] font-semibold hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load packages: {error}</p>
          <button onClick={fetchPackages} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || statusFilter !== "all" ? "No packages match your filters" : "No packages found"}
          </p>
          {(search || statusFilter !== "all") ? (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
              className="text-[14px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/packages/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Sell your first package
            </Link>
          )}
        </div>
      ) : (
        /* ── Package Cards ───────────────────────────────────────── */
        <div className="space-y-3">
          {sorted.map((pkg) => {
            const statusStyle = getStatusStyle(pkg.status);
            const remaining = pkg.totalSessions - pkg.usedSessions;
            const progressPercent = pkg.totalSessions > 0 ? (pkg.usedSessions / pkg.totalSessions) * 100 : 0;
            const days = pkg.expiryDate ? daysRemaining(pkg.expiryDate) : null;

            return (
              <div
                key={pkg.id}
                className="p-4 md:p-5 transition-shadow duration-150 hover:shadow-md"
                style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Package # + Status */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Link href={`/packages/${pkg.id}`} className="text-[16px] font-bold hover:underline" style={{ color: "var(--blue-500)" }}>
                        {pkg.packageNumber}
                      </Link>
                      <span
                        className={chipBase}
                        style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {pkg.status}
                      </span>
                    </div>

                    {/* Row 2: Patient */}
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                        style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                      >
                        {pkg.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{pkg.patientName}</span>
                      {pkg.patientIdNumber && (
                        <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{pkg.patientIdNumber}</span>
                      )}
                    </div>

                    {/* Row 3: Treatment + Package */}
                    <p className="text-[14px] mb-3" style={{ color: "var(--grey-600)" }}>
                      {pkg.treatmentName}{pkg.packageName ? ` — ${pkg.packageName}` : ""}
                    </p>

                    {/* Session Progress Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
                          {pkg.usedSessions} of {pkg.totalSessions} sessions used
                        </span>
                        <span className="text-[14px] font-medium" style={{ color: "var(--grey-500)" }}>
                          {remaining} remaining
                        </span>
                      </div>
                      <div className="w-full h-2" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                        <div
                          className="h-2 transition-all duration-300"
                          style={{
                            width: `${Math.min(progressPercent, 100)}%`,
                            background: progressPercent >= 100 ? "var(--grey-500)" : "var(--blue-500)",
                            borderRadius: "var(--radius-pill)",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Price, Expiry, Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0" style={{ minWidth: 180 }}>
                    {/* Price */}
                    <div className="text-right">
                      <span className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(pkg.paidAmount)}</span>
                      {pkg.paidAmount < pkg.totalPrice && (
                        <span className="text-[14px] ml-1" style={{ color: "var(--grey-500)" }}>/ {formatCurrency(pkg.totalPrice)}</span>
                      )}
                    </div>

                    {/* Expiry */}
                    {pkg.expiryDate && (
                      <div className="text-right">
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Expires {formatDate(pkg.expiryDate)}</p>
                        {days !== null && pkg.status === "active" && (
                          <p className="text-[13px] font-semibold" style={{ color: expiryColor(days) }}>
                            {days < 0 ? `Expired ${Math.abs(days)} days ago` : days === 0 ? "Expires today" : `${days} days remaining`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-1.5 mt-1">
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="px-3 py-1.5 text-[13px] font-semibold transition-colors"
                        style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}
                      >
                        View
                      </Link>
                      {pkg.status === "active" && (
                        <Link
                          href={`/packages/${pkg.id}?action=record-session`}
                          className="px-3 py-1.5 text-[13px] font-semibold transition-colors"
                          style={{ borderRadius: "var(--radius-sm)", background: "#e8f5e9", color: "var(--green)" }}
                        >
                          Record Session
                        </Link>
                      )}
                      <Link
                        href={`/packages/${pkg.id}?tab=payment`}
                        className="px-3 py-1.5 text-[13px] font-semibold transition-colors"
                        style={{ borderRadius: "var(--radius-sm)", background: "var(--grey-100)", color: "var(--grey-600)" }}
                      >
                        Share
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
