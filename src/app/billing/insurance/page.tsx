"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import BillingTabs from "@/components/BillingTabs";
import { cardStyle, btnPrimary, chipBase } from "@/lib/styles";
import { formatCurrency, formatDate } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InsuranceClaim {
  id: string;
  claimNumber: string;
  invoiceId: string;
  providerId: string;
  patientId: string | null;
  patientName: string;
  claimAmount: number;
  approvedAmount: number | null;
  settledAmount: number | null;
  status: string;
  submittedDate: string;
  reviewDate: string | null;
  approvedDate: string | null;
  settledDate: string | null;
  rejectionReason: string | null;
  notes: string | null;
  provider: { id?: string; name: string; code: string };
  invoice?: { id: string; invoiceNumber: string; totalAmount: number; status: string };
}

interface Provider {
  id: string;
  name: string;
  code: string;
}

interface ClaimStats {
  totalClaims: number;
  pendingAmount: number;
  approvedAwaitingSettlement: number;
  settledThisMonth: number;
}

type SortField = "claimNumber" | "submittedDate" | "patientName" | "claimAmount" | "status" | "approvedAmount";
type SortDir = "asc" | "desc";

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted: { bg: "#fff3e0", color: "#f57c00" },
  under_review: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  approved: { bg: "#e8f5e9", color: "var(--green)" },
  partially_approved: { bg: "#e0f2f1", color: "#00897b" },
  rejected: { bg: "#ffebee", color: "var(--red)" },
  settled: { bg: "#f3e5f5", color: "#7b1fa2" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "partially_approved", label: "Partially Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "settled", label: "Settled" },
];

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

// ─── Sort Header ────────────────────────────────────────────────────────────
function SortHeader({ label, field, currentField, direction, onSort }: {
  label: string; field: SortField; currentField: SortField; direction: SortDir; onSort: (f: SortField) => void;
}) {
  const isActive = currentField === field;
  return (
    <th
      className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer select-none"
      style={{ color: isActive ? "var(--blue-500)" : "var(--grey-600)" }}
      onClick={() => onSort(field)}
      role="columnheader"
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
            {direction === "asc" ? <path d="M6 2l4 5H2z" /> : <path d="M6 10l4-5H2z" />}
          </svg>
        )}
      </span>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function InsuranceClaimsPage() {
  const [mounted, setMounted] = useState(false);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<ClaimStats>({ totalClaims: 0, pendingAmount: 0, approvedAwaitingSettlement: 0, settledThisMonth: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("submittedDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Providers (for filter dropdown) ─────────────────────────────
  useEffect(() => {
    fetch("/api/insurance/providers?isActive=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProviders(data);
      })
      .catch(() => {});
  }, []);

  // ─── Compute Stats from Claims ─────────────────────────────────────────
  const computeStats = useCallback((claimsList: InsuranceClaim[]) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthClaims = claimsList.filter((c) => new Date(c.submittedDate) >= monthStart);
    const pendingClaims = claimsList.filter((c) => c.status === "submitted" || c.status === "under_review");
    const approvedUnsettled = claimsList.filter((c) => c.status === "approved" || c.status === "partially_approved");
    const settledThisMonth = claimsList.filter(
      (c) => c.status === "settled" && c.settledDate && new Date(c.settledDate) >= monthStart
    );

    setStats({
      totalClaims: thisMonthClaims.length,
      pendingAmount: pendingClaims.reduce((sum, c) => sum + (c.claimAmount ?? 0), 0),
      approvedAwaitingSettlement: approvedUnsettled.reduce((sum, c) => sum + (c.approvedAmount ?? c.claimAmount ?? 0), 0),
      settledThisMonth: settledThisMonth.reduce((sum, c) => sum + (c.settledAmount ?? 0), 0),
    });
  }, []);

  // ─── Fetch Claims ─────────────────────────────────────────────────────
  const fetchClaims = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (providerFilter !== "all") params.set("providerId", providerFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/insurance/claims?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        const mapped: InsuranceClaim[] = Array.isArray(data) ? data : [];
        setClaims(mapped);
        computeStats(mapped);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter, providerFilter, dateFrom, dateTo, computeStats]);

  useEffect(() => {
    const timeout = setTimeout(fetchClaims, 300);
    return () => clearTimeout(timeout);
  }, [fetchClaims]);

  // ─── Client-side sorting ──────────────────────────────────────────────
  const sorted = useMemo(() => {
    const result = [...claims];
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "claimNumber": return dir * a.claimNumber.localeCompare(b.claimNumber);
        case "submittedDate": return dir * (new Date(a.submittedDate).getTime() - new Date(b.submittedDate).getTime());
        case "patientName": return dir * a.patientName.localeCompare(b.patientName);
        case "claimAmount": return dir * ((a.claimAmount ?? 0) - (b.claimAmount ?? 0));
        case "approvedAmount": return dir * ((a.approvedAmount ?? 0) - (b.approvedAmount ?? 0));
        case "status": return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });
    return result;
  }, [claims, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function getStatusStyle(status: string) {
    return STATUS_COLORS[status] || { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Tab Navigation ─────────────────────────────────────── */}
      <BillingTabs />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Insurance Claims</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {sorted.length} claim{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/billing/new?type=insurance"
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Claim
          </Link>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Claims</p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>This month</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.totalClaims}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Pending Amount</p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Submitted + Under Review</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: stats.pendingAmount > 0 ? "#f57c00" : "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.pendingAmount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
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
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Approved Awaiting</p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Settlement pending</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.approvedAwaitingSettlement ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#c8e6c9", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Settled This Month</p>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Total received</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.settledThisMonth ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#e1bee7", borderRadius: "var(--radius-sm)", color: "#7b1fa2" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + Filters Row ────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by claim # or patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[15px]"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
              aria-label="Search claims"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center" style={{ color: "var(--grey-500)" }} aria-label="Clear search">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 150 }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 150 }}
          >
            <option value="all">All Providers</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 140 }}
            aria-label="Date from"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 140 }}
            aria-label="Date to"
          />
        </div>

        {(search || statusFilter !== "all" || providerFilter !== "all" || dateFrom || dateTo) && (
          <div className="flex items-center">
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setProviderFilter("all"); setDateFrom(""); setDateTo(""); }}
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
          <p className="text-[15px] font-medium">Failed to load claims: {error}</p>
          <button onClick={fetchClaims} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || statusFilter !== "all" || providerFilter !== "all" || dateFrom || dateTo ? "No claims match your filters" : "No insurance claims found"}
          </p>
          {(search || statusFilter !== "all" || providerFilter !== "all" || dateFrom || dateTo) ? (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setProviderFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="text-[14px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/billing/new?type=insurance" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Submit your first claim
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop Table ─────────────────────────────────────── */}
          <div className="hidden md:block overflow-hidden" style={cardStyle}>
            <table className="w-full" role="table">
              <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <tr>
                  <SortHeader label="Claim #" field="claimNumber" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Date" field="submittedDate" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Patient" field="patientName" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Provider</th>
                  <SortHeader label="Claim Amt" field="claimAmount" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Approved Amt" field="approvedAmount" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((claim, i) => {
                  const statusStyle = getStatusStyle(claim.status);
                  return (
                    <tr
                      key={claim.id}
                      className="transition-colors duration-100 group"
                      style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>
                          {claim.claimNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(claim.submittedDate)}</td>
                      <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{claim.patientName}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>
                        <span className="font-medium">{claim.provider?.name}</span>
                        <span className="ml-1 text-[12px]" style={{ color: "var(--grey-500)" }}>({claim.provider?.code})</span>
                      </td>
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(claim.claimAmount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={chipBase}
                          style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {formatStatusLabel(claim.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: claim.approvedAmount != null ? "var(--green)" : "var(--grey-400)" }}>
                        {claim.approvedAmount != null ? formatCurrency(claim.approvedAmount) : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/billing/${claim.invoiceId}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ───────────────────────────────────────── */}
          <div className="md:hidden space-y-2">
            {sorted.map((claim) => {
              const statusStyle = getStatusStyle(claim.status);
              return (
                <Link
                  key={claim.id}
                  href={`/billing/${claim.invoiceId}`}
                  className="block p-4 transition-shadow duration-150 active:shadow-md"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>{claim.claimNumber}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatDate(claim.submittedDate)}</p>
                    </div>
                    <span
                      className={chipBase}
                      style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {formatStatusLabel(claim.status)}
                    </span>
                  </div>
                  <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--grey-900)" }}>{claim.patientName}</p>
                  <p className="text-[13px] mb-2" style={{ color: "var(--grey-500)" }}>{claim.provider?.name} ({claim.provider?.code})</p>
                  <div className="flex gap-4 text-[14px]">
                    <span style={{ color: "var(--grey-600)" }}>Claim: <strong style={{ color: "var(--grey-900)" }}>{formatCurrency(claim.claimAmount)}</strong></span>
                    {claim.approvedAmount != null && (
                      <span style={{ color: "var(--grey-600)" }}>Approved: <strong style={{ color: "var(--green)" }}>{formatCurrency(claim.approvedAmount)}</strong></span>
                    )}
                    {claim.settledAmount != null && (
                      <span style={{ color: "#7b1fa2" }}>Settled: <strong>{formatCurrency(claim.settledAmount)}</strong></span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
