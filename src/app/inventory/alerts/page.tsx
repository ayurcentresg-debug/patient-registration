"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle } from "@/lib/styles";
import { formatDate } from "@/lib/formatters";

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
  daysLeft?: number;
  daysPast?: number;
  branchQuantity?: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
}

interface AlertsData {
  lowStock: AlertItem[];
  expiringSoon: AlertItem[];
  expiring90: AlertItem[];
  expired: AlertItem[];
  outOfStock: AlertItem[];
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysOverdue(dateStr: string): number {
  return Math.abs(daysUntil(dateStr));
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="mx-4 w-full max-w-md p-6" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
        <h3 className="text-[18px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>{title}</h3>
        <p className="text-[15px] mb-6" style={{ color: "var(--grey-600)" }}>{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-[14px] font-semibold transition-colors duration-150"
            style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-[14px] font-semibold text-white transition-colors duration-150 disabled:opacity-50"
            style={{ borderRadius: "var(--radius-sm)", background: "var(--red)" }}
          >
            {loading ? "Writing off..." : "Write Off"}
          </button>
        </div>
      </div>
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
  const [alerts, setAlerts] = useState<AlertsData>({ lowStock: [], expiringSoon: [], expiring90: [], expired: [], outOfStock: [] });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ lowStock: true, expiringSoon: true, expiring90: false, expired: true, outOfStock: true });
  const { showFlash } = useFlash();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Branch filter
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // Bulk write-off
  const [selectedExpired, setSelectedExpired] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkWriteOffLoading, setBulkWriteOffLoading] = useState(false);

  // Expiry check
  const [expiryCheckLoading, setExpiryCheckLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBranches(data);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = selectedBranch
      ? `/api/inventory/alerts?branchId=${selectedBranch}`
      : "/api/inventory/alerts";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setAlerts({
          lowStock: data.lowStock || [],
          expiringSoon: data.expiringSoon || [],
          expiring90: data.expiring90 || [],
          expired: data.expired || [],
          outOfStock: data.outOfStock || [],
        });
        setSelectedExpired(new Set());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedBranch]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  function toggleSection(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── Single item actions ──────────────────────────────────────────────────
  async function handleMarkExpired(item: AlertItem) {
    setActionLoading(item.id);
    try {
      const res = await fetch(`/api/inventory/${item.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "expired", quantity: item.currentStock, notes: "Marked expired from alerts" }),
      });
      if (!res.ok) throw new Error("Failed");
      showFlash({ type: "success", title: "Success", message: `${item.name} marked as expired` });
      fetchAlerts();
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to mark item as expired" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleWriteOff(item: AlertItem) {
    setActionLoading(item.id);
    try {
      const body: Record<string, unknown> = { itemIds: [item.id] };
      if (selectedBranch) body.branchId = selectedBranch;

      const res = await fetch("/api/inventory/write-off-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      showFlash({ type: "success", title: "Success", message: `${item.name} written off successfully` });
      fetchAlerts();
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to write off item" });
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Bulk write-off ───────────────────────────────────────────────────────
  function toggleSelectExpired(id: string) {
    setSelectedExpired((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllExpired() {
    if (selectedExpired.size === alerts.expired.length) {
      setSelectedExpired(new Set());
    } else {
      setSelectedExpired(new Set(alerts.expired.map((i) => i.id)));
    }
  }

  const selectedExpiredItems = alerts.expired.filter((i) => selectedExpired.has(i.id));
  const totalUnitsToWriteOff = selectedExpiredItems.reduce((sum, i) => {
    if (selectedBranch && i.branchQuantity !== undefined) return sum + i.branchQuantity;
    return sum + i.currentStock;
  }, 0);

  async function handleBulkWriteOff() {
    setBulkWriteOffLoading(true);
    try {
      const body: Record<string, unknown> = {
        itemIds: Array.from(selectedExpired),
      };
      if (selectedBranch) body.branchId = selectedBranch;

      const res = await fetch("/api/inventory/write-off-expired", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      showFlash({ type: "success", title: "Success", message: `Written off ${data.writtenOff} item(s) successfully` });
      setConfirmOpen(false);
      setSelectedExpired(new Set());
      fetchAlerts();
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to write off expired items" });
    } finally {
      setBulkWriteOffLoading(false);
    }
  }

  // ─── Expiry check ─────────────────────────────────────────────────────────
  async function handleExpiryCheck() {
    setExpiryCheckLoading(true);
    try {
      const res = await fetch("/api/inventory/expiry-check", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      showFlash({ type: "success", title: "Success", message: `Expiry check complete: ${data.warnings} warning(s), ${data.expired} expired notification(s) created` });
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to run expiry check" });
    } finally {
      setExpiryCheckLoading(false);
    }
  }

  const totalAlerts = alerts.lowStock.length + alerts.expiringSoon.length + alerts.expiring90.length + alerts.expired.length + alerts.outOfStock.length;

  function getStockPercentage(current: number, reorder: number): number {
    if (reorder === 0) return 100;
    return Math.min(100, Math.round((current / reorder) * 100));
  }

  function getProgressColor(pct: number): string {
    if (pct > 50) return "var(--green)";
    if (pct >= 25) return "#37845e";
    return "var(--red)";
  }

  function getDaysLeftColor(days: number): { bg: string; color: string } {
    if (days < 7) return { bg: "#fef2f2", color: "var(--red)" };
    if (days <= 14) return { bg: "#fff7ed", color: "var(--orange)" };
    return { bg: "#f0faf4", color: "#37845e" };
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
          <span className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{title}</span>
          <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-pill)", background: color + "18", color }}>{count}</span>
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

  // ─── Table header cell ───────────────────────────────────────────────────
  const th = "text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider";
  const thStyle = { color: "var(--grey-600)" };

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Bulk Write-Off"
        message={`Write off ${selectedExpired.size} item(s) (${totalUnitsToWriteOff} unit(s) total)${selectedBranch ? ` for selected branch` : ""}? This action cannot be undone.`}
        onConfirm={handleBulkWriteOff}
        onCancel={() => setConfirmOpen(false)}
        loading={bulkWriteOffLoading}
      />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* ── Subtitle + Actions Row ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Stock Alerts</h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {totalAlerts} active alert{totalAlerts !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 text-[14px] font-medium"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--grey-300)",
              color: "var(--grey-700)",
              background: "var(--white)",
              minWidth: "160px",
            }}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.isMainBranch ? " (Main)" : ""}
              </option>
            ))}
          </select>

          {/* Check Expiry Button */}
          <button
            onClick={handleExpiryCheck}
            disabled={expiryCheckLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold transition-colors duration-150 disabled:opacity-50"
            style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--orange)",
              color: "var(--orange)",
              background: "#fff7ed",
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {expiryCheckLoading ? "Checking..." : "Check for Expiring Items"}
          </button>
        </div>
      </div>

      {/* ── Alert Category Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #37845e" }} onClick={() => toggleSection("lowStock")}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "#37845e" }}>Low Stock</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: alerts.lowStock.length > 0 ? "#37845e" : "var(--grey-900)" }}>{alerts.lowStock.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--red)" }} onClick={() => toggleSection("expired")}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--red)" }}>Expired</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: alerts.expired.length > 0 ? "var(--red)" : "var(--grey-900)" }}>{alerts.expired.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid var(--orange)" }} onClick={() => toggleSection("expiringSoon")}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--orange)" }}>Expiring &lt;30d</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: alerts.expiringSoon.length > 0 ? "var(--orange)" : "var(--grey-900)" }}>{alerts.expiringSoon.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #ca8a04" }} onClick={() => toggleSection("expiring90")}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "#ca8a04" }}>Expiring &lt;90d</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: alerts.expiring90.length > 0 ? "#ca8a04" : "var(--grey-900)" }}>{alerts.expiring90.length}</p>
        </div>
        <div className="p-4 transition-shadow duration-150 hover:shadow-md cursor-pointer" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)", borderLeft: "4px solid #991b1b" }} onClick={() => toggleSection("outOfStock")}>
          <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "#991b1b" }}>Out of Stock</p>
          <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: alerts.outOfStock.length > 0 ? "#991b1b" : "var(--grey-900)" }}>{alerts.outOfStock.length}</p>
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load alerts: {error}</p>
          <button onClick={fetchAlerts} className="text-[14px] font-semibold underline">Retry</button>
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
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>All clear! No stock alerts at this time.</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Inventory levels are healthy across all items.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ═══ EXPIRED ITEMS SECTION ═══ */}
          {alerts.expired.length > 0 && (
            <div>
              <SectionHeader title="Expired Items" count={alerts.expired.length} color="var(--red)" sectionKey="expired" />
              {expanded.expired && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  {/* Bulk Actions Bar */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--grey-200)", background: "#fef2f2" }}>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedExpired.size === alerts.expired.length && alerts.expired.length > 0}
                          onChange={toggleSelectAllExpired}
                          className="w-4 h-4 accent-red-600"
                        />
                        <span className="text-[14px] font-semibold" style={{ color: "var(--red)" }}>
                          {selectedExpired.size > 0 ? `${selectedExpired.size} selected` : "Select All"}
                        </span>
                      </label>
                    </div>
                    <button
                      onClick={() => setConfirmOpen(true)}
                      disabled={selectedExpired.size === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-[14px] font-semibold text-white transition-colors duration-150 disabled:opacity-40"
                      style={{ borderRadius: "var(--radius-sm)", background: "var(--red)" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Write Off Selected ({selectedExpired.size})
                    </button>
                  </div>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className="text-left px-4 py-2.5 w-10"></th>
                          <th className={th} style={thStyle}>Item Name</th>
                          <th className={th} style={thStyle}>SKU</th>
                          <th className={th} style={thStyle}>Batch #</th>
                          <th className={th} style={thStyle}>Expiry Date</th>
                          <th className={th} style={thStyle}>Days Overdue</th>
                          <th className={th} style={thStyle}>Stock</th>
                          {selectedBranch && <th className={th} style={thStyle}>Branch Stock</th>}
                          <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={thStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.expired.map((item, i) => {
                          const overdue = item.expiryDate ? daysOverdue(item.expiryDate) : (item.daysPast || 0);
                          return (
                            <tr
                              key={item.id}
                              style={{
                                borderBottom: i < alerts.expired.length - 1 ? "1px solid var(--grey-200)" : "none",
                                background: selectedExpired.has(item.id) ? "#fef2f2" : "transparent",
                              }}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedExpired.has(item.id)}
                                  onChange={() => toggleSelectExpired(item.id)}
                                  className="w-4 h-4 accent-red-600"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>{item.batchNumber || "\u2014"}</td>
                              <td className="px-4 py-3 text-[14px] font-semibold" style={{ color: "var(--red)" }}>{item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)" }}>
                                  {overdue}d overdue
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</td>
                              {selectedBranch && (
                                <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>
                                  {item.branchQuantity !== undefined ? item.branchQuantity : "\u2014"}
                                </td>
                              )}
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleWriteOff(item)}
                                  disabled={actionLoading === item.id}
                                  className="inline-flex px-3 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150 disabled:opacity-50"
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
                      const overdue = item.expiryDate ? daysOverdue(item.expiryDate) : (item.daysPast || 0);
                      return (
                        <div key={item.id} className="p-4 space-y-2" style={{ background: selectedExpired.has(item.id) ? "#fef2f2" : "transparent" }}>
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedExpired.has(item.id)}
                              onChange={() => toggleSelectExpired(item.id)}
                              className="w-4 h-4 mt-1 accent-red-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                                  <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                                </div>
                                <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "var(--red)" }}>{overdue}d overdue</span>
                              </div>
                              <div className="flex items-center gap-3 text-[14px] mt-1" style={{ color: "var(--grey-600)" }}>
                                <span>Stock: {item.currentStock} {item.unit}</span>
                                {selectedBranch && item.branchQuantity !== undefined && (
                                  <span>Branch: {item.branchQuantity}</span>
                                )}
                                <span style={{ color: "var(--red)" }}>Exp: {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</span>
                              </div>
                              <button onClick={() => handleWriteOff(item)} disabled={actionLoading === item.id} className="mt-2 inline-flex px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", background: "var(--red)" }}>
                                {actionLoading === item.id ? "..." : "Write Off"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPIRING IN 30 DAYS SECTION ═══ */}
          {alerts.expiringSoon.length > 0 && (
            <div>
              <SectionHeader title="Expiring in 30 Days" count={alerts.expiringSoon.length} color="var(--orange)" sectionKey="expiringSoon" />
              {expanded.expiringSoon && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className={th} style={thStyle}>Item Name</th>
                          <th className={th} style={thStyle}>SKU</th>
                          <th className={th} style={thStyle}>Batch #</th>
                          <th className={th} style={thStyle}>Expiry Date</th>
                          <th className={th} style={thStyle}>Days Left</th>
                          <th className={th} style={thStyle}>Stock</th>
                          {selectedBranch && <th className={th} style={thStyle}>Branch Stock</th>}
                          <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={thStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.expiringSoon.map((item, i) => {
                          const days = item.daysLeft ?? (item.expiryDate ? daysUntil(item.expiryDate) : 0);
                          const daysColor = getDaysLeftColor(days);
                          return (
                            <tr key={item.id} style={{ borderBottom: i < alerts.expiringSoon.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>{item.batchNumber || "\u2014"}</td>
                              <td className="px-4 py-3 text-[14px]" style={{ color: "var(--orange)" }}>{item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: daysColor.bg, color: daysColor.color }}>
                                  {days}d
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</td>
                              {selectedBranch && (
                                <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>
                                  {item.branchQuantity !== undefined ? item.branchQuantity : "\u2014"}
                                </td>
                              )}
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleMarkExpired(item)}
                                  disabled={actionLoading === item.id}
                                  className="inline-flex px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 disabled:opacity-50"
                                  style={{ borderRadius: "var(--radius-sm)", background: "#fff7ed", color: "var(--orange)", border: "1px solid #fed7aa" }}
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
                      const days = item.daysLeft ?? (item.expiryDate ? daysUntil(item.expiryDate) : 0);
                      const daysColor = getDaysLeftColor(days);
                      return (
                        <div key={item.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: daysColor.bg, color: daysColor.color }}>{days}d left</span>
                          </div>
                          <div className="flex items-center gap-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            {selectedBranch && item.branchQuantity !== undefined && <span>Branch: {item.branchQuantity}</span>}
                            <span>Exp: {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</span>
                          </div>
                          <button onClick={() => handleMarkExpired(item)} disabled={actionLoading === item.id} className="inline-flex px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", background: "#fff7ed", color: "var(--orange)", border: "1px solid #fed7aa" }}>
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

          {/* ═══ EXPIRING IN 90 DAYS SECTION ═══ */}
          {alerts.expiring90.length > 0 && (
            <div>
              <SectionHeader title="Expiring in 90 Days" count={alerts.expiring90.length} color="#ca8a04" sectionKey="expiring90" />
              {expanded.expiring90 && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                        <tr>
                          <th className={th} style={thStyle}>Item Name</th>
                          <th className={th} style={thStyle}>SKU</th>
                          <th className={th} style={thStyle}>Batch #</th>
                          <th className={th} style={thStyle}>Expiry Date</th>
                          <th className={th} style={thStyle}>Days Left</th>
                          <th className={th} style={thStyle}>Stock</th>
                          {selectedBranch && <th className={th} style={thStyle}>Branch Stock</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.expiring90.map((item, i) => {
                          const days = item.daysLeft ?? (item.expiryDate ? daysUntil(item.expiryDate) : 0);
                          return (
                            <tr key={item.id} style={{ borderBottom: i < alerts.expiring90.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                              <td className="px-4 py-3">
                                <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-700)" }}>{item.batchNumber || "\u2014"}</td>
                              <td className="px-4 py-3 text-[14px]" style={{ color: "#ca8a04" }}>{item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fefce8", color: "#ca8a04" }}>
                                  {days}d
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</td>
                              {selectedBranch && (
                                <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-700)" }}>
                                  {item.branchQuantity !== undefined ? item.branchQuantity : "\u2014"}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
                    {alerts.expiring90.map((item) => {
                      const days = item.daysLeft ?? (item.expiryDate ? daysUntil(item.expiryDate) : 0);
                      return (
                        <div key={item.id} className="p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="inline-flex px-2 py-0.5 text-[13px] font-bold" style={{ borderRadius: "var(--radius-sm)", background: "#fefce8", color: "#ca8a04" }}>{days}d left</span>
                          </div>
                          <div className="flex items-center gap-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            {selectedBranch && item.branchQuantity !== undefined && <span>Branch: {item.branchQuantity}</span>}
                            <span>Exp: {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ LOW STOCK SECTION ═══ */}
          {alerts.lowStock.length > 0 && (
            <div>
              <SectionHeader title="Low Stock Items" count={alerts.lowStock.length} color="#37845e" sectionKey="lowStock" />
              {expanded.lowStock && (
                <div className="mt-2 yoda-fade-in" style={cardStyle}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>Items below reorder level</p>
                    <Link
                      href="/inventory/purchase-orders/new?reorder=true"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white transition-colors duration-150"
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
                          <th className={th} style={thStyle}>Item Name</th>
                          <th className={th} style={thStyle}>SKU</th>
                          <th className={th} style={thStyle}>Category</th>
                          <th className={th} style={thStyle}>Current Stock</th>
                          <th className={th} style={thStyle}>Reorder Level</th>
                          <th className={th} style={thStyle}>Shortage</th>
                          <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={thStyle}>Action</th>
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
                                <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              </td>
                              <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>{item.category}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.currentStock} {item.unit}</span>
                                </div>
                                <div className="w-full h-1.5 mt-1" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: pColor, borderRadius: "var(--radius-pill)", transition: "width 0.3s ease" }} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-700)" }}>{item.reorderLevel} {item.unit}</td>
                              <td className="px-4 py-3">
                                <span className="text-[15px] font-bold" style={{ color: "var(--red)" }}>-{shortage}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  href={`/inventory/purchase-orders/new?itemId=${item.id}`}
                                  className="inline-flex px-3 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150"
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
                              <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                              <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                            </div>
                            <span className="text-[15px] font-bold" style={{ color: "var(--red)" }}>-{shortage}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                            <span>Stock: {item.currentStock} {item.unit}</span>
                            <span>Reorder: {item.reorderLevel}</span>
                          </div>
                          <div className="w-full h-1.5" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pColor, borderRadius: "var(--radius-pill)" }} />
                          </div>
                          <Link href={`/inventory/purchase-orders/new?itemId=${item.id}`} className="inline-flex px-3 py-1.5 text-[13px] font-semibold text-white" style={btnPrimary}>Create PO</Link>
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
                          <th className={th} style={thStyle}>Item Name</th>
                          <th className={th} style={thStyle}>SKU</th>
                          <th className={th} style={thStyle}>Category</th>
                          <th className={th} style={thStyle}>Reorder Level</th>
                          <th className={th} style={thStyle}>Last Transaction</th>
                          <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={thStyle}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.outOfStock.map((item, i) => (
                          <tr key={item.id} style={{ borderBottom: i < alerts.outOfStock.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                            <td className="px-4 py-3">
                              <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                            </td>
                            <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>{item.category}</span>
                            </td>
                            <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-700)" }}>{item.reorderLevel} {item.unit}</td>
                            <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{item.lastTransactionDate ? formatDate(item.lastTransactionDate) : "\u2014"}</td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/inventory/purchase-orders/new?itemId=${item.id}`}
                                className="inline-flex px-3 py-1.5 text-[13px] font-semibold text-white transition-colors duration-150"
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
                            <Link href={`/inventory/${item.id}`} className="text-[15px] font-semibold hover:underline" style={{ color: "var(--grey-900)" }}>{item.name}</Link>
                            <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                          </div>
                          <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase" style={{ borderRadius: "var(--radius-sm)", background: "#fef2f2", color: "#991b1b" }}>Out of Stock</span>
                        </div>
                        <div className="flex items-center gap-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                          <span>{item.category}</span>
                          <span>Reorder: {item.reorderLevel} {item.unit}</span>
                        </div>
                        <Link href={`/inventory/purchase-orders/new?itemId=${item.id}`} className="inline-flex px-3 py-1.5 text-[13px] font-semibold text-white" style={btnPrimary}>Reorder</Link>
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
