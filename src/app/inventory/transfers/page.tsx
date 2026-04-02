"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InventoryTabs from "@/components/InventoryTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TransferItem {
  id: string;
  itemId: string;
  quantitySent: number;
  quantityReceived: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranch: Branch;
  toBranch: Branch;
  status: "draft" | "in_transit" | "received" | "cancelled";
  transferDate: string;
  receivedDate: string | null;
  notes: string | null;
  items: TransferItem[];
  itemCount: number;
  totalQtySent: number;
  createdAt: string;
}

interface TransferStats {
  total: number;
  inTransit: number;
  receivedThisMonth: number;
  cancelled: number;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getStatusStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case "draft": return { bg: "var(--grey-200)", color: "var(--grey-700)" };
    case "in_transit": return { bg: "var(--blue-100)", color: "var(--blue-700)" };
    case "received": return { bg: "#dcfce7", color: "var(--green)" };
    case "cancelled": return { bg: "#fef2f2", color: "var(--red)" };
    default: return { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case "in_transit": return "In Transit";
    case "received": return "Received";
    case "cancelled": return "Cancelled";
    case "draft": return "Draft";
    default: return status;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
interface TransferTemplateListItem {
  id: string;
  name: string;
  fromBranch: { name: string };
  toBranch: { name: string };
  itemCount: number;
}

export default function TransfersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Templates dropdown
  const [templates, setTemplates] = useState<TransferTemplateListItem[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchTransfers = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/transfers?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        // Handle both array and paginated response
        const list = Array.isArray(data) ? data : data.data || [];
        setTransfers(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timeout = setTimeout(fetchTransfers, 300);
    return () => clearTimeout(timeout);
  }, [fetchTransfers]);

  // Fetch templates for dropdown
  useEffect(() => {
    fetch("/api/transfers/templates")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats: TransferStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      total: transfers.length,
      inTransit: transfers.filter((t) => t.status === "in_transit").length,
      receivedThisMonth: transfers.filter(
        (t) => t.status === "received" && new Date(t.receivedDate || t.transferDate) >= monthStart
      ).length,
      cancelled: transfers.filter((t) => t.status === "cancelled").length,
    };
  }, [transfers]);

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Sub Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Stock Transfers</h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Move stock between branches and track deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          {/* From Template dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-[15px] font-semibold transition-colors duration-150"
              style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              From Template
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showTemplateDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTemplateDropdown(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-80 z-50 overflow-y-auto"
                  style={{ background: "var(--white)", borderRadius: "var(--radius)", border: "1px solid var(--grey-300)", boxShadow: "var(--shadow-lg)", maxHeight: 300 }}
                >
                  {templates.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No templates yet</p>
                      <p className="text-[13px] mt-1" style={{ color: "var(--grey-400)" }}>Save a transfer as a template first</p>
                    </div>
                  ) : (
                    templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          setShowTemplateDropdown(false);
                          router.push(`/inventory/transfers/new?templateId=${tpl.id}`);
                        }}
                        className="w-full text-left px-4 py-3 transition-colors duration-100"
                        style={{ borderBottom: "1px solid var(--grey-100)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{tpl.name}</p>
                        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                          {tpl.fromBranch?.name} &rarr; {tpl.toBranch?.name} &middot; {tpl.itemCount} item{tpl.itemCount !== 1 ? "s" : ""}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
          <Link
            href="/inventory/transfers/new"
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Transfer
          </Link>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Transfers</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.total}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>In Transit</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--blue-700)" }}>{stats.inTransit}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Received This Month</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--green)" }}>{stats.receivedThisMonth}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Cancelled</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-500)" }}>{stats.cancelled}</p>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[15px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 140 }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="in_transit">In Transit</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search transfer number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          />
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 text-[15px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 text-[15px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          placeholder="To"
        />
      </div>

      {/* ── Error State ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load transfers: {error}</p>
          <button onClick={fetchTransfers} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No transfers found</p>
          <Link href="/inventory/transfers/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
            Create your first transfer
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden" style={cardStyle}>
            <table className="w-full">
              <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Transfer #</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>From &rarr; To</th>
                  <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Items</th>
                  <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total Qty</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer, i) => {
                  const statusStyle = getStatusStyle(transfer.status);
                  const itemCount = transfer.itemCount ?? transfer.items?.length ?? 0;
                  const totalQty = transfer.totalQtySent ?? transfer.items?.reduce((s, it) => s + it.quantitySent, 0) ?? 0;
                  return (
                    <tr
                      key={transfer.id}
                      className="transition-colors duration-100 cursor-pointer"
                      style={{ borderBottom: i < transfers.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                      onClick={() => router.push(`/inventory/transfers/${transfer.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>{transfer.transferNumber}</td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-900)" }}>
                        {transfer.fromBranch?.name || "—"} <span style={{ color: "var(--grey-400)" }}>&rarr;</span> {transfer.toBranch?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-[15px] text-center" style={{ color: "var(--grey-700)" }}>{itemCount}</td>
                      <td className="px-4 py-3 text-[15px] text-center font-semibold" style={{ color: "var(--grey-900)" }}>{totalQty}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                          {formatStatusLabel(transfer.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(transfer.transferDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/inventory/transfers/${transfer.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }} onClick={(e) => e.stopPropagation()}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {transfers.map((transfer) => {
              const statusStyle = getStatusStyle(transfer.status);
              const itemCount = transfer.itemCount ?? transfer.items?.length ?? 0;
              const totalQty = transfer.totalQtySent ?? transfer.items?.reduce((s, it) => s + it.quantitySent, 0) ?? 0;
              return (
                <Link
                  key={transfer.id}
                  href={`/inventory/transfers/${transfer.id}`}
                  className="block p-4 transition-shadow duration-150 active:shadow-md"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[16px] font-semibold" style={{ color: "var(--blue-500)" }}>{transfer.transferNumber}</p>
                      <p className="text-[14px]" style={{ color: "var(--grey-700)" }}>
                        {transfer.fromBranch?.name || "—"} &rarr; {transfer.toBranch?.name || "—"}
                      </p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                      {formatStatusLabel(transfer.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-[13px]" style={{ color: "var(--grey-500)" }}>
                      <span>{formatDate(transfer.transferDate)}</span>
                      <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                      <span>Qty: {totalQty}</span>
                    </div>
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
