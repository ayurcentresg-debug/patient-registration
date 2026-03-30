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

interface SuggestionItem {
  itemId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  avgMonthlyUsage: number;
  daysRemaining: number;
  suggestedQty: number;
  costPrice: number;
  estimatedCost: number;
  supplierId: string | null;
  supplierName: string | null;
}

interface FastMovingItem {
  itemId: string;
  name: string;
  currentStock: number;
  avgMonthlyUsage: number;
  daysRemaining: number;
}

interface SuggestionsData {
  suggestions: SuggestionItem[];
  totalEstimatedCost: number;
  urgentCount: number;
  fastMovingItems: FastMovingItem[];
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
    case "partial": return { bg: "#d1f2e0", color: "#37845e" };
    case "received": return { bg: "#dcfce7", color: "var(--green)" };
    case "cancelled": return { bg: "#fef2f2", color: "var(--red)" };
    default: return { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }
}

function getDaysColor(days: number): string {
  if (days < 14) return "var(--red)";
  if (days < 30) return "#ea580c";
  return "var(--grey-900)";
}

function getDaysBg(days: number): string {
  if (days < 14) return "#fef2f2";
  if (days < 30) return "#fff7ed";
  return "transparent";
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

  // Suggestions state
  const [suggestionsData, setSuggestionsData] = useState<SuggestionsData | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Fast-moving items state
  const [showFastMoving, setShowFastMoving] = useState(false);

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

  // ─── Fetch Suggestions ─────────────────────────────────────────────────
  const fetchSuggestions = useCallback(() => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    fetch("/api/purchase-orders/suggestions")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data: SuggestionsData) => {
        setSuggestionsData(data);
        setShowSuggestions(true);
        // Pre-select all items
        const allIds = new Set(data.suggestions.map((s) => s.itemId));
        setSelectedItems(allIds);
      })
      .catch((e) => setSuggestionsError(e.message))
      .finally(() => setSuggestionsLoading(false));
  }, []);

  // ─── Selection helpers ─────────────────────────────────────────────────
  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!suggestionsData) return;
    const allIds = suggestionsData.suggestions.map((s) => s.itemId);
    if (selectedItems.size === allIds.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(allIds));
    }
  };

  const convertToPO = () => {
    if (selectedItems.size === 0) return;
    const ids = Array.from(selectedItems).join(",");
    router.push(`/inventory/purchase-orders/new?suggestedItems=${ids}`);
  };

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
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Sub Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Purchase Orders</h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>{stats.total} order{stats.total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuggestions}
            disabled={suggestionsLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-50"
            style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-500)", color: "var(--blue-500)", background: "var(--white)" }}
          >
            {suggestionsLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
            {suggestionsLoading ? "Analyzing..." : "Suggested Order"}
          </button>
          <Link
            href="/inventory/purchase-orders/new"
            className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New PO
          </Link>
        </div>
      </div>

      {/* ── Smart PO Suggestions Panel ───────────────────────────── */}
      {suggestionsError && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load suggestions: {suggestionsError}</p>
          <button onClick={fetchSuggestions} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {showSuggestions && suggestionsData && (
        <div className="mb-6" style={cardStyle}>
          {/* Panel Header */}
          <div
            className="px-5 py-3 flex items-center justify-between cursor-pointer"
            style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)", borderRadius: "var(--radius) var(--radius) 0 0" }}
            onClick={() => setShowSuggestions((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Smart PO Suggestions</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setShowSuggestions(false); setSuggestionsData(null); }}
                className="text-[13px] font-semibold px-2 py-1 transition-colors duration-100"
                style={{ color: "var(--grey-500)", borderRadius: "var(--radius-sm)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--grey-700)"; e.currentTarget.style.background = "var(--grey-200)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--grey-500)"; e.currentTarget.style.background = "transparent"; }}
              >
                Dismiss
              </button>
              <svg className="w-4 h-4" style={{ color: "var(--grey-500)", transform: "rotate(180deg)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Summary Card */}
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)" }}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center" style={{ background: "#dbeafe", borderRadius: "var(--radius-sm)" }}>
                  <svg className="w-4 h-4" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                  {suggestionsData.suggestions.length} item{suggestionsData.suggestions.length !== 1 ? "s" : ""} need reordering
                </span>
              </div>
              <span style={{ color: "var(--grey-300)" }}>|</span>
              <div className="flex items-center gap-2">
                <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>Estimated cost:</span>
                <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(suggestionsData.totalEstimatedCost)}</span>
              </div>
              {suggestionsData.urgentCount > 0 && (
                <>
                  <span style={{ color: "var(--grey-300)" }}>|</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />
                    <span className="text-[15px] font-semibold" style={{ color: "var(--red)" }}>
                      {suggestionsData.urgentCount} item{suggestionsData.urgentCount !== 1 ? "s" : ""} urgent (&lt; 14 days stock)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Suggestions Table */}
          {suggestionsData.suggestions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No items currently need reordering.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                    <tr>
                      <th className="text-left px-4 py-2.5" style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.size === suggestionsData.suggestions.length && suggestionsData.suggestions.length > 0}
                          onChange={toggleAll}
                          className="w-4 h-4 cursor-pointer"
                          style={{ accentColor: "var(--blue-500)" }}
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Current Stock</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Avg Monthly Usage</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Days Remaining</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Suggested Qty</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestionsData.suggestions.map((item, i) => (
                      <tr
                        key={item.itemId}
                        className="transition-colors duration-100"
                        style={{
                          borderBottom: i < suggestionsData.suggestions.length - 1 ? "1px solid var(--grey-200)" : "none",
                          background: getDaysBg(item.daysRemaining),
                        }}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.itemId)}
                            onChange={() => toggleItem(item.itemId)}
                            className="w-4 h-4 cursor-pointer"
                            style={{ accentColor: "var(--blue-500)" }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                          <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-700)" }}>{item.currentStock}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-700)" }}>{item.avgMonthlyUsage}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[15px] font-semibold" style={{ color: getDaysColor(item.daysRemaining) }}>
                            {item.daysRemaining} day{item.daysRemaining !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[15px] font-semibold text-right" style={{ color: "var(--grey-900)" }}>{item.suggestedQty}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-700)" }}>{formatCurrency(item.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                <div className="px-4 py-2 flex items-center gap-2" style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === suggestionsData.suggestions.length && suggestionsData.suggestions.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 cursor-pointer"
                    style={{ accentColor: "var(--blue-500)" }}
                  />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--grey-600)" }}>Select All</span>
                </div>
                {suggestionsData.suggestions.map((item) => (
                  <div key={item.itemId} className="p-4" style={{ background: getDaysBg(item.daysRemaining) }}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.itemId)}
                        onChange={() => toggleItem(item.itemId)}
                        className="w-4 h-4 mt-1 cursor-pointer"
                        style={{ accentColor: "var(--blue-500)" }}
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                            <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                          </div>
                          <span className="text-[14px] font-semibold" style={{ color: getDaysColor(item.daysRemaining) }}>
                            {item.daysRemaining}d left
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--grey-600)" }}>
                          <span>Stock: {item.currentStock}</span>
                          <span>Usage: {item.avgMonthlyUsage}/mo</span>
                          <span>Qty: {item.suggestedQty}</span>
                          <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(item.estimatedCost)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Convert to PO Button */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: "1px solid var(--grey-200)", background: "var(--grey-50)", borderRadius: "0 0 var(--radius) var(--radius)" }}>
                <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                  {selectedItems.size} of {suggestionsData.suggestions.length} item{suggestionsData.suggestions.length !== 1 ? "s" : ""} selected
                </p>
                <button
                  onClick={convertToPO}
                  disabled={selectedItems.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 text-[15px] font-semibold text-white transition-colors duration-150 disabled:opacity-40"
                  style={btnPrimary}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Convert to PO
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total POs</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.total}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Draft</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-700)" }}>{stats.draft}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Submitted</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "#1d4ed8" }}>{stats.submitted}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Received</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--green)" }}>{stats.received}</p>
        </div>
        <div className="p-4" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Value</p>
          <p className="text-[24px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* ── Fast-Moving Items ────────────────────────────────────── */}
      {suggestionsData && suggestionsData.fastMovingItems.length > 0 && (
        <div className="mb-6" style={cardStyle}>
          <div
            className="px-5 py-3 flex items-center justify-between cursor-pointer"
            style={{ background: "var(--grey-50)", borderRadius: showFastMoving ? "var(--radius) var(--radius) 0 0" : "var(--radius)" }}
            onClick={() => setShowFastMoving((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: "#ea580c" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Fast-Moving Items</h3>
              <span className="text-[13px] px-2 py-0.5 font-semibold" style={{ background: "var(--grey-200)", color: "var(--grey-600)", borderRadius: "var(--radius-sm)" }}>
                Top 10
              </span>
            </div>
            <svg
              className="w-4 h-4 transition-transform duration-200"
              style={{ color: "var(--grey-500)", transform: showFastMoving ? "rotate(180deg)" : "rotate(0deg)" }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {showFastMoving && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto" style={{ borderTop: "1px solid var(--grey-200)" }}>
                <table className="w-full">
                  <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Current Stock</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Monthly Usage</th>
                      <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Days of Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestionsData.fastMovingItems.map((item, i) => (
                      <tr
                        key={item.itemId}
                        style={{
                          borderBottom: i < suggestionsData.fastMovingItems.length - 1 ? "1px solid var(--grey-200)" : "none",
                          background: getDaysBg(item.daysRemaining),
                        }}
                      >
                        <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-700)" }}>{item.currentStock}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-700)" }}>{item.avgMonthlyUsage}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[15px] font-semibold" style={{ color: getDaysColor(item.daysRemaining) }}>
                            {item.daysRemaining} day{item.daysRemaining !== 1 ? "s" : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y" style={{ borderTop: "1px solid var(--grey-200)", borderColor: "var(--grey-200)" }}>
                {suggestionsData.fastMovingItems.map((item) => (
                  <div key={item.itemId} className="px-4 py-3" style={{ background: getDaysBg(item.daysRemaining) }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                      <span className="text-[14px] font-semibold" style={{ color: getDaysColor(item.daysRemaining) }}>
                        {item.daysRemaining}d
                      </span>
                    </div>
                    <div className="flex gap-4 text-[13px]" style={{ color: "var(--grey-600)" }}>
                      <span>Stock: {item.currentStock}</span>
                      <span>Usage: {item.avgMonthlyUsage}/mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
          <p className="text-[15px] font-medium">Failed to load purchase orders: {error}</p>
          <button onClick={fetchOrders} className="text-[14px] font-semibold underline">Retry</button>
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
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No purchase orders found</p>
          <Link href="/inventory/purchase-orders/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
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
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>PO Number</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Supplier</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Expected</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Items</th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
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
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>{order.poNumber}</td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-900)" }}>{order.supplierName}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(order.orderDate)}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{order.expectedDate ? formatDate(order.expectedDate) : "\u2014"}</td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-700)" }}>{order.items?.length || 0}</td>
                      <td className="px-4 py-3 text-[15px] font-semibold text-right" style={{ color: "var(--grey-900)" }}>{formatCurrency(order.totalAmount || 0)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/inventory/purchase-orders/${order.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }} onClick={(e) => e.stopPropagation()}>
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
                      <p className="text-[16px] font-semibold" style={{ color: "var(--blue-500)" }}>{order.poNumber}</p>
                      <p className="text-[14px]" style={{ color: "var(--grey-700)" }}>{order.supplierName}</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-[13px]" style={{ color: "var(--grey-500)" }}>
                      <span>{formatDate(order.orderDate)}</span>
                      <span>{order.items?.length || 0} items</span>
                    </div>
                    <p className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(order.totalAmount || 0)}</p>
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
