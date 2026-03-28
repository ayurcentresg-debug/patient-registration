"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InventoryTabs from "@/components/InventoryTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  status: "draft" | "submitted" | "partial" | "received" | "cancelled";
  items: { quantity: number; unitPrice: number; gstPercent: number }[];
  totalAmount: number;
  createdAt: string;
}

interface POStats {
  total: number;
  draft: number;
  submitted: number;
  received: number;
  totalValue: number;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function formatCurrency(amount: number): string {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getStatusStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case "draft": return { bg: "var(--grey-200)", color: "var(--grey-700)" };
    case "submitted": return { bg: "#dbeafe", color: "#1d4ed8" };
    case "partial": return { bg: "#fef3c7", color: "#d97706" };
    case "received": return { bg: "#dcfce7", color: "var(--green)" };
    case "cancelled": return { bg: "#fef2f2", color: "var(--red)" };
    default: return { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    fetch(`/api/purchase-orders?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : data.orders || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    const timeout = setTimeout(fetchOrders, 300);
    return () => clearTimeout(timeout);
  }, [fetchOrders]);

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats: POStats = useMemo(() => {
    return {
      total: orders.length,
      draft: orders.filter((o) => o.status === "draft").length,
      submitted: orders.filter((o) => o.status === "submitted").length,
      received: orders.filter((o) => o.status === "received").length,
      totalValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    };
  }, [orders]);

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
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
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Sub Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Purchase Orders</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>{stats.total} order{stats.total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/inventory/purchase-orders/new"
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[13px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New PO
        </Link>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total POs</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.total}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Draft</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-700)" }}>{stats.draft}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Submitted</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "#1d4ed8" }}>{stats.submitted}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Received</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--green)" }}>{stats.received}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Value</p>
          <p className="text-[22px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-[13px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 140 }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="partial">Partial</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search PO number, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-[13px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          />
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 text-[13px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 text-[13px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
          placeholder="To"
        />
      </div>

      {/* ── Error State ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[13px] font-medium">Failed to load purchase orders: {error}</p>
          <button onClick={fetchOrders} className="text-[12px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>No purchase orders found</p>
          <Link href="/inventory/purchase-orders/new" className="text-[12px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
            Create your first purchase order
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden" style={cardStyle}>
            <table className="w-full">
              <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>PO Number</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Supplier</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Expected</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Items</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const statusStyle = getStatusStyle(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="transition-colors duration-100 cursor-pointer"
                      style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                      onClick={() => router.push(`/inventory/purchase-orders/${order.id}`)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: "var(--blue-500)" }}>{order.poNumber}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-900)" }}>{order.supplierName}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-600)" }}>{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-600)" }}>{order.expectedDate ? formatDate(order.expectedDate) : "\u2014"}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-700)" }}>{order.items?.length || 0}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-right" style={{ color: "var(--grey-900)" }}>{formatCurrency(order.totalAmount || 0)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/inventory/purchase-orders/${order.id}`} className="text-[12px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }} onClick={(e) => e.stopPropagation()}>
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
            {orders.map((order) => {
              const statusStyle = getStatusStyle(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/inventory/purchase-orders/${order.id}`}
                  className="block p-4 transition-shadow duration-150 active:shadow-md"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "var(--blue-500)" }}>{order.poNumber}</p>
                      <p className="text-[12px]" style={{ color: "var(--grey-700)" }}>{order.supplierName}</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-[11px]" style={{ color: "var(--grey-500)" }}>
                      <span>{formatDate(order.orderDate)}</span>
                      <span>{order.items?.length || 0} items</span>
                    </div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(order.totalAmount || 0)}</p>
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
