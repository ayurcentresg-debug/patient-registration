"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import BillingTabs from "@/components/BillingTabs";
import { downloadCSV } from "@/lib/csv-export";
import { PageGuide } from "@/components/HelpTip";
import { TablePageSkeleton } from "@/components/Skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  patientName: string;
  patientId: string | null;
  itemsCount: number;
  total: number;
  paid: number;
  balance: number;
  status: string;
  isPackageSale: boolean;
  packageInfo: { id: string; packageNumber: string; packageName: string } | null;
}

interface BillingStats {
  todayRevenue: number;
  monthRevenue: number;
  pendingAmount: number;
  totalInvoices: number;
}

type SortField = "invoiceNumber" | "date" | "patientName" | "total" | "balance" | "status";
type SortDir = "asc" | "desc";

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--grey-200)", color: "var(--grey-600)" },
  pending: { bg: "#fff3e0", color: "#f57c00" },
  paid: { bg: "#e8f5e9", color: "var(--green)" },
  partially_paid: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  cancelled: { bg: "#ffebee", color: "var(--red)" },
  refunded: { bg: "#f3e5f5", color: "#7b1fa2" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

// ─── Utility ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
export default function BillingPage() {
  const [mounted, setMounted] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<BillingStats>({ todayRevenue: 0, monthRevenue: 0, pendingAmount: 0, totalInvoices: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<{ id: string; name: string; code: string; isMainBranch: boolean }[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => { setMounted(true); }, []);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.ok ? r.json() : [])
      .then((list) => setBranches(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  // ─── Fetch Stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    fetch("/api/billing/stats")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => {
        setStats({
          todayRevenue: data.todayRevenue ?? 0,
          monthRevenue: data.monthRevenue ?? 0,
          pendingAmount: data.pendingAmount ?? 0,
          totalInvoices: data.totalInvoices ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  // ─── Fetch Invoices ───────────────────────────────────────────────────────
  const fetchInvoices = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (branchFilter !== "all") params.set("branchId", branchFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/invoices?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        // Map API response fields to frontend interface
        const mapped: Invoice[] = data.map((inv: Record<string, unknown>) => ({
          id: inv.id as string,
          invoiceNumber: inv.invoiceNumber as string,
          date: inv.date as string,
          patientName: inv.patientName as string,
          patientId: (inv.patientId as string | null) || null,
          itemsCount: (inv._count as Record<string, number>)?.items ?? (inv.items as unknown[])?.length ?? 0,
          total: (inv.totalAmount as number) ?? 0,
          paid: (inv.paidAmount as number) ?? 0,
          balance: (inv.balanceAmount as number) ?? 0,
          status: (inv.status as string) || "draft",
          isPackageSale: (inv.isPackageSale as boolean) || false,
          packageInfo: (inv.packageInfo as Invoice["packageInfo"]) || null,
        }));
        setInvoices(mapped);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter, branchFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timeout = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timeout);
  }, [fetchInvoices]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ─── Client-side sorting ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const result = [...invoices];
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "invoiceNumber": return dir * a.invoiceNumber.localeCompare(b.invoiceNumber);
        case "date": return dir * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case "patientName": return dir * a.patientName.localeCompare(b.patientName);
        case "total": return dir * (a.total - b.total);
        case "balance": return dir * (a.balance - b.balance);
        case "status": return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });
    return result;
  }, [invoices, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function getStatusStyle(status: string) {
    return STATUS_COLORS[status] || STATUS_COLORS.draft;
  }

  function formatStatusLabel(status: string): string {
    return status.replace(/_/g, " ");
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
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Billing</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {sorted.length} invoice{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              const exportData = sorted.map((inv) => ({
                invoiceNumber: inv.invoiceNumber,
                date: formatDate(inv.date),
                patientName: inv.patientName,
                items: inv.itemsCount,
                total: inv.total.toFixed(2),
                paid: inv.paid.toFixed(2),
                balance: inv.balance.toFixed(2),
                status: inv.status,
              }));
              downloadCSV(exportData, [
                { key: "invoiceNumber", label: "Invoice #" },
                { key: "date", label: "Date" },
                { key: "patientName", label: "Patient" },
                { key: "items", label: "Items" },
                { key: "total", label: "Total" },
                { key: "paid", label: "Paid" },
                { key: "balance", label: "Balance" },
                { key: "status", label: "Status" },
              ], `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold transition-colors"
            style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", background: "var(--white)", color: "var(--grey-700)" }}
            title="Export to CSV"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/billing/new"
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </Link>
          <Link
            href="/billing/new?from=appointment"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Generate from Appointment
          </Link>
        </div>
      </div>

      <PageGuide
        storageKey="billing"
        title="Billing & Invoicing Guide"
        subtitle="Create invoices, record payments, and track revenue."
        steps={[
          { icon: "🧾", title: "Create Invoice", description: "Click 'New Invoice' to create a bill. Select a patient, add consultation fees, medicines, or treatments as line items." },
          { icon: "💳", title: "Record Payment", description: "Click any pending invoice to open it. Use 'Record Payment' to log cash, card, or UPI payments. Partial payments are supported." },
          { icon: "🧾", title: "Invoice Status", description: "Draft = not sent, Pending = awaiting payment, Paid = fully paid, Partially Paid = balance remaining." },
          { icon: "📦", title: "Package Billing", description: "Sell treatment packages from Billing > Packages tab. Package invoices are auto-linked to the treatment plan." },
          { icon: "🏥", title: "Insurance Claims", description: "Manage insurance claims from the Insurance tab. Link claims to invoices for tracking." },
          { icon: "📊", title: "Revenue Tracking", description: "The stats cards above show today's revenue, monthly revenue, and pending amounts at a glance." },
        ]}
      />

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Today&apos;s Revenue</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.todayRevenue ?? 0).toLocaleString("en-SG")}
              </p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#c8e6c9", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Monthly Revenue</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.monthRevenue ?? 0).toLocaleString("en-SG")}
              </p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Pending Payments</p>
              <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: stats.pendingAmount > 0 ? "#f57c00" : "var(--grey-900)" }}>
                <span className="text-[16px]" style={{ color: "var(--grey-500)" }}>{"S$"}</span>{(stats.pendingAmount ?? 0).toLocaleString("en-SG")}
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
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Invoices</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.totalInvoices}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#e1bee7", borderRadius: "var(--radius-sm)", color: "#7b1fa2" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
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
              placeholder="Search by invoice # or patient name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[15px]"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
              aria-label="Search invoices"
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

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-3 py-2 text-[15px]"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 150 }}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

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

        {(search || statusFilter !== "all" || branchFilter !== "all" || dateFrom || dateTo) && (
          <div className="flex items-center">
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setBranchFilter("all"); setDateFrom(""); setDateTo(""); }}
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
          <p className="text-[15px] font-medium">Failed to load invoices: {error}</p>
          <button onClick={fetchInvoices} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <TablePageSkeleton columns={6} rows={6} />
      ) : sorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || statusFilter !== "all" || branchFilter !== "all" || dateFrom || dateTo ? "No invoices match your filters" : "No invoices found"}
          </p>
          {(search || statusFilter !== "all" || branchFilter !== "all" || dateFrom || dateTo) ? (
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setBranchFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="text-[14px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/billing/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Create your first invoice
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
                  <SortHeader label="Invoice #" field="invoiceNumber" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Date" field="date" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Patient" field="patientName" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Items</th>
                  <SortHeader label="Total" field="total" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Paid</th>
                  <SortHeader label="Balance" field="balance" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv, i) => {
                  const statusStyle = getStatusStyle(inv.status);
                  return (
                    <tr
                      key={inv.id}
                      className="transition-colors duration-100 group"
                      style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/billing/${inv.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
                            {inv.invoiceNumber}
                          </Link>
                          {inv.isPackageSale && (
                            <Link
                              href={`/packages/${inv.packageInfo?.id || ""}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide hover:opacity-80"
                              style={{ borderRadius: "var(--radius-sm)", background: "#e8f5e9", color: "var(--green)" }}
                              title={inv.packageInfo?.packageName || "Package"}
                            >
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              Package
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{inv.patientName}</td>
                      <td className="px-4 py-3 text-[14px] text-center" style={{ color: "var(--grey-600)" }}>{inv.itemsCount}</td>
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: "var(--green)" }}>{formatCurrency(inv.paid)}</td>
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: inv.balance > 0 ? "#f57c00" : "var(--grey-600)" }}>
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={chipBase}
                          style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {formatStatusLabel(inv.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/billing/${inv.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
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
            {sorted.map((inv) => {
              const statusStyle = getStatusStyle(inv.status);
              return (
                <Link
                  key={inv.id}
                  href={`/billing/${inv.id}`}
                  className="block p-4 transition-shadow duration-150 active:shadow-md"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>{inv.invoiceNumber}</p>
                        {inv.isPackageSale && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                            style={{ borderRadius: "var(--radius-sm)", background: "#e8f5e9", color: "var(--green)" }}
                          >
                            Package
                          </span>
                        )}
                      </div>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{formatDate(inv.date)}</p>
                    </div>
                    <span
                      className={chipBase}
                      style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {formatStatusLabel(inv.status)}
                    </span>
                  </div>
                  <p className="text-[16px] font-semibold mb-1" style={{ color: "var(--grey-900)" }}>{inv.patientName}</p>
                  <div className="flex gap-4 text-[14px]">
                    <span style={{ color: "var(--grey-600)" }}>Total: <strong style={{ color: "var(--grey-900)" }}>{formatCurrency(inv.total)}</strong></span>
                    <span style={{ color: "var(--grey-600)" }}>Paid: <strong style={{ color: "var(--green)" }}>{formatCurrency(inv.paid)}</strong></span>
                    {inv.balance > 0 && (
                      <span style={{ color: "#f57c00" }}>Due: <strong>{formatCurrency(inv.balance)}</strong></span>
                    )}
                  </div>
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>{inv.itemsCount} item{inv.itemsCount !== 1 ? "s" : ""}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
