"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AlertItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
  lastTransactionDate?: string;
}

interface AlertsData {
  lowStock: AlertItem[];
  expiringSoon: AlertItem[];
  expired: AlertItem[];
  outOfStock: AlertItem[];
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

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysOverdue(dateStr: string): number {
  return Math.abs(daysUntil(dateStr));
}

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 text-[13px] font-semibold text-white yoda-slide-in-right"
      style={{
        background: type === "success" ? "var(--green)" : "var(--red)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function StockAlertsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertsData>({ lowStock: [], expiringSoon: [], expired: [], outOfStock: [] });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ lowStock: true, expiringSoon: true, expired: true, outOfStock: true });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/inventory/alerts")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => setAlerts(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleMarkExpired(item: AlertItem) {
    setActionLoading(item.id);
    try {
      const res = await fetch(`/api/inventory/${item.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "expired", quantity: item.currentStock, notes: "Marked expired from alerts" }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: `${item.name} marked as expired`, type: "success" });
      fetchAlerts();
    } catch {
      setToast({ message: "Failed to mark item as expired", type: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWriteOff(item: AlertItem) {
    setActionLoading(item.id);
    try {
      const res = await fetch(`/api/inventory/${item.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "expired", quantity: item.currentStock, notes: "Written off from alerts - expired stock" }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: `${item.name} written off successfully`, type: "success" });
      fetchAlerts();
    } catch {
      setToast({ message: "Failed to write off item", type: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  const totalAlerts = alerts.lowStock.length + alerts.expiringSoon.length + alerts.expired.length + alerts.outOfStock.length;

  function getStockPercentage(current: number, reorder: number): number {
    if (reorder === 0) return 100;
    return Math.min(100, Math.round((current / reorder) * 100));
  }

  function getProgressColor(pct: number): string {
    if (pct > 50) return "var(--green)";
    if (pct >= 25) return "#d97706";
    return "var(--red)";
  }

  function getDaysLeftColor(days: number): { bg: string; color: string } {
    if (days < 7) return { bg: "#fef2f2", color: "var(--red)" };
    if (days <= 14) return { bg: "#fff7ed", color: "var(--orange)" };
    return { bg: "#fffbeb", color: "#d97706" };
  }

  // ─── Loading skeleton ────────────────────────────────────────────────────
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

  // ─── Section Header ──────────────────────────────────────────────────────
  function SectionHeader({ title, count, color, sectionKey }: { title: string; count: number; color: string; sectionKey: string }) {
    return (
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors duration-150"
        style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}
      >
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{title}</span>
          <span className="inline-flex px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: "var(--radius-pill)", background: color + "18", color }}>{count}</span>
        </div>
        <svg
          className="w-4 h-4 transition-transform duration-200"
          style={{ color: "var(--grey-500)", transform: expanded[sectionKey] ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Subtitle ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Stock Alerts</h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {totalAlerts} active alert{totalAlerts !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
      </div>

      {/* ── Alert Category Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #d97706" }} onClick={() => toggleSection("lowStock")}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#d97706" }}>Low Stock</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: alerts.lowStock.length > 0 ? "#d97706" : "var(--grey-900)" }}>{alerts.lowStock.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--orange)" }} onClick={() => toggleSection("expiringSoon")}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--orange)" }}>Expiring Soon</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: alerts.expiringSoon.length > 0 ? "var(--orange)" : "var(--grey-900)" }}>{alerts.expiringSoon.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--red)" }} onClick={() => toggleSection("expired")}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--red)" }}>Expired</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: alerts.expired.length > 0 ? "var(--red)" : "var(--grey-900)" }}>{alerts.expired.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #991b1b" }} onClick={() => toggleSection("outOfStock")}>
          <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "#991b1b" }}>Out of Stock</p>
          <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: alerts.outOfStock.length > 0 ? "#991b1b" : "var(--grey-900)" }}>{alerts.outOfStock.length}</p>
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[13px] font-medium">Failed to load alerts: {error}</p>
          <button onClick={fetchAlerts} className="text-[12px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          ))}
        </div>
      ) : totalAlerts === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "#e8f5e9", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>All clear! No stock alerts at this time.</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Inventory levels are healthy across all items.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ═══ LOW STOCK SECTION ═══ */}
          {alerts.lowStock.length > 0 && (
            <div>
              <SectionHeader title="Low Stock Items" count={alerts.lowStock.length} color="#d97706" sectionKey="lowStock" />
              {expanded.lowStock && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--grey-600)" }}>Items below reorder level</p>
                    <Link
                      href="/inventory/purchase-orders/new?reorder=true"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors duration-150"
                      style={btnPrimary}
                    >
                      Reorder All
                    </Link>
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Category</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Current Stock</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reorder Level</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Shortage</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.lowStock.map((item, i) => {
                          const shortage = item.reorderLevel - item.currentStock;
                          const pct = getStockPercentage(item.currentStock, item.reorderLevel);
                          const pColor = getProgressColor(pct);
                          return (
                            <tr key={item.id} style={{ borderBottom: i < alerts.lowStock.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>{item.category}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</span>
                                </div>
                                <div className="w-full h-1.5 mt-1" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: pColor, borderRadius: "var(--radius-pill)", transition: "width 0.3s ease" }} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-700)" }}>{item.reorderLevel} {item.unit}</td>
                              <td className="px-4 py-3">
                                <span className="text-[13px] font-bold" style={{ color: "var(--red)" }}>-{shortage}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/inventory/purchase-orders/new?itemId=${item.id}`}
                                  className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150"
                                  style={btnPrimary}
                                >
                                  Create PO
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                    {alerts.lowStock.map((item) => {
                      const shortage = item.reorderLevel - item.currentStock;
                      const pct = getStockPercentage(item.currentStock, item.reorderLevel);
                      const pColor = getProgressColor(pct);
                      return (
                        <div key={item.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[11px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="text-[13px] font-bold" style={{ color: "var(--red)" }}>-{shortage}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            <span>Reorder: {item.reorderLevel}</span>
                          </div>
                          <div className="w-full h-1.5" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pColor, borderRadius: "var(--radius-pill)" }} />
                          </div>
                          <Link href={`/inventory/purchase-orders/new?itemId=${item.id}`} className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white" style={btnPrimary}>Create PO</Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPIRING SOON SECTION ═══ */}
          {alerts.expiringSoon.length > 0 && (
            <div>
              <SectionHeader title="Expiring Soon" count={alerts.expiringSoon.length} color="var(--orange)" sectionKey="expiringSoon" />
              {expanded.expiringSoon && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Batch</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Stock</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Expiry Date</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Days Left</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.expiringSoon.map((item, i) => {
                          const days = item.expiryDate ? daysUntil(item.expiryDate) : 0;
                          const daysColor = getDaysLeftColor(days);
                          return (
                            <tr key={item.id} style={{ borderBottom: i < alerts.expiringSoon.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-700)" }}>{item.batchNumber || "\u2014"}</td>
                              <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</td>
                              <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-700)" }}>{item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: daysColor.bg, color: daysColor.color }}>
                                  {days}d
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleMarkExpired(item)}
                                  disabled={actionLoading === item.id}
                                  className="inline-flex px-3 py-1.5 text-[11px] font-semibold transition-colors duration-150 disabled:opacity-50"
                                  style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)", border: "1px solid #fecaca" }}
                                >
                                  {actionLoading === item.id ? "..." : "Mark Expired"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                    {alerts.expiringSoon.map((item) => {
                      const days = item.expiryDate ? daysUntil(item.expiryDate) : 0;
                      const daysColor = getDaysLeftColor(days);
                      return (
                        <div key={item.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[11px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="inline-flex px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: daysColor.bg, color: daysColor.color }}>{days}d left</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            <span>Exp: {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</span>
                          </div>
                          <button onClick={() => handleMarkExpired(item)} disabled={actionLoading === item.id} className="inline-flex px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)", border: "1px solid #fecaca" }}>
                            {actionLoading === item.id ? "..." : "Mark Expired"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPIRED SECTION ═══ */}
          {alerts.expired.length > 0 && (
            <div>
              <SectionHeader title="Expired Items" count={alerts.expired.length} color="var(--red)" sectionKey="expired" />
              {expanded.expired && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Batch</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Stock</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Expiry Date</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Days Overdue</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.expired.map((item, i) => {
                          const overdue = item.expiryDate ? daysOverdue(item.expiryDate) : 0;
                          return (
                            <tr key={item.id} style={{ borderBottom: i < alerts.expired.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-700)" }}>{item.batchNumber || "\u2014"}</td>
                              <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</td>
                              <td className="px-4 py-3 text-[12px]" style={{ color: "var(--red)" }}>{item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)" }}>
                                  {overdue}d overdue
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleWriteOff(item)}
                                  disabled={actionLoading === item.id}
                                  className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 disabled:opacity-50"
                                  style={{ borderRadius: "var(--radius-sm)", background: "var(--red)" }}
                                >
                                  {actionLoading === item.id ? "..." : "Write Off"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                    {alerts.expired.map((item) => {
                      const overdue = item.expiryDate ? daysOverdue(item.expiryDate) : 0;
                      return (
                        <div key={item.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[11px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="inline-flex px-2 py-0.5 text-[11px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)" }}>{overdue}d overdue</span>
                          </div>
                          <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            <span style={{ color: "var(--red)" }}>Exp: {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</span>
                          </div>
                          <button onClick={() => handleWriteOff(item)} disabled={actionLoading === item.id} className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", background: "var(--red)" }}>
                            {actionLoading === item.id ? "..." : "Write Off"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ OUT OF STOCK SECTION ═══ */}
          {alerts.outOfStock.length > 0 && (
            <div>
              <SectionHeader title="Out of Stock" count={alerts.outOfStock.length} color="#991b1b" sectionKey="outOfStock" />
              {expanded.outOfStock && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Category</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reorder Level</th>
                          <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Last Transaction</th>
                          <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.outOfStock.map((item, i) => (
                          <tr key={item.id} style={{ borderBottom: i < alerts.outOfStock.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                            <td className="px-4 py-3">
                              <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                            </td>
                            <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>{item.category}</span>
                            </td>
                            <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-700)" }}>{item.reorderLevel} {item.unit}</td>
                            <td className="px-4 py-3 text-[12px]" style={{ color: "var(--grey-600)" }}>{item.lastTransactionDate ? formatDate(item.lastTransactionDate) : "\u2014"}</td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/inventory/purchase-orders/new?itemId=${item.id}`}
                                className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150"
                                style={btnPrimary}
                              >
                                Reorder
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                    {alerts.outOfStock.map((item) => (
                      <div key={item.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/inventory/${item.id}`} className="text-[13px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                            <p className="text-[11px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                          </div>
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "#991b1b" }}>Out of Stock</span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px]" style={{ color: "var(--grey-600)" }}>
                          <span>{item.category}</span>
                          <span>Reorder: {item.reorderLevel} {item.unit}</span>
                        </div>
                        <Link href={`/inventory/purchase-orders/new?itemId=${item.id}`} className="inline-flex px-3 py-1.5 text-[11px] font-semibold text-white" style={btnPrimary}>Reorder</Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
