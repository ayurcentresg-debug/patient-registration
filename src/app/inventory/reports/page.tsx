"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  packing: string | null;
  manufacturerCode: string | null;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  unitPrice: number;
  expiryDate: string | null;
  batchNumber: string | null;
  status: string;
}

type ReportTab = "stock-summary" | "low-stock" | "expiry" | "transfers";

interface TransferData {
  summary: {
    totalTransfers: number;
    inTransit: number;
    received: number;
    cancelled: number;
    totalItemsMoved: number;
    totalValueMoved: number;
  };
  transfers: Array<{
    id: string;
    transferNumber: string;
    fromBranch: { name: string; code: string };
    toBranch: { name: string; code: string };
    status: string;
    itemCount: number;
    totalQty: number;
    totalValue: number;
    transferDate: string;
    receivedDate: string | null;
  }>;
  branchSummary: Array<{
    branchName: string;
    branchCode: string;
    sentCount: number;
    sentQty: number;
    receivedCount: number;
    receivedQty: number;
    netQty: number;
  }>;
  topTransferredItems: Array<{
    name: string;
    totalQty: number;
    transferCount: number;
  }>;
}

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--blue-500)",
  borderRadius: "var(--radius-sm)",
  color: "white",
};
const btnSecondary: React.CSSProperties = {
  background: "var(--grey-100)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-700)",
};
const btnSuccess: React.CSSProperties = {
  background: "#2e7d32",
  borderRadius: "var(--radius-sm)",
  color: "white",
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil (Thailam)" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
];

// ─── Utilities ──────────────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function todayFormatted(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntilExpiry(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function StockReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("stock-summary");
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [expiryItems, setExpiryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Fetch Branches ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const fetchAllItems = useCallback(() => {
    setLoading(true);
    setError(null);

    const itemsPromise = fetch("/api/inventory")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch inventory");
        return r.json();
      });

    // If branch selected, also fetch branch stock to overlay quantities
    const branchStockPromise = selectedBranchId
      ? fetch(`/api/branches/stock?branchId=${selectedBranchId}`)
          .then((r) => (r.ok ? r.json() : []))
      : Promise.resolve(null);

    Promise.all([itemsPromise, branchStockPromise])
      .then(([items, branchStock]) => {
        if (branchStock && Array.isArray(branchStock)) {
          // Overlay branch quantities onto items
          const branchQtyMap = new Map<string, number>();
          for (const bs of branchStock) {
            branchQtyMap.set(bs.itemId, bs.quantity);
          }
          const overlaid = items.map((item: InventoryItem) => ({
            ...item,
            currentStock: branchQtyMap.get(item.id) ?? 0,
          }));
          setAllItems(overlaid);
        } else {
          setAllItems(items);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedBranchId]);

  const fetchLowStock = useCallback(() => {
    // When branch is selected, low stock is computed client-side from allItems
    // (since allItems already has branch-overlaid quantities)
    if (selectedBranchId) {
      // Low stock will be derived from allItems in useMemo, skip API call
      setLowStockItems([]);
      return;
    }
    fetch("/api/inventory?lowStock=true")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then(setLowStockItems)
      .catch(() => {});
  }, [selectedBranchId]);

  const fetchExpiryItems = useCallback(() => {
    // Fetch items expiring within 90 days and already expired
    fetch("/api/inventory?expiringSoon=true")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setExpiryItems(data);
      })
      .catch(() => {});
  }, []);

  const fetchTransfers = useCallback(() => {
    setTransferLoading(true);
    fetch("/api/reports/transfers?period=month")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch transfer reports");
        return r.json();
      })
      .then((data) => {
        setTransferData(data);
        setTransferLoading(false);
      })
      .catch(() => {
        setTransferLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchAllItems();
    fetchLowStock();
    fetchExpiryItems();
  }, [fetchAllItems, fetchLowStock, fetchExpiryItems]);

  // Lazy-load transfers when tab is selected
  useEffect(() => {
    if (activeTab === "transfers" && !transferData && !transferLoading) {
      fetchTransfers();
    }
  }, [activeTab, transferData, transferLoading, fetchTransfers]);

  // ─── Branch-aware low stock (derived from overlaid allItems) ────────────────
  const effectiveLowStockItems = useMemo(() => {
    if (selectedBranchId) {
      // Compute low stock from branch-overlaid allItems
      return allItems.filter(
        (item) => item.currentStock <= item.reorderLevel && item.status !== "discontinued"
      );
    }
    return lowStockItems;
  }, [selectedBranchId, allItems, lowStockItems]);

  // ─── Computed: expiry items with wider range ──────────────────────────────
  const expiryReportItems = useMemo(() => {
    // Combine API expiring-soon items with any expired items from full list
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const allExpiryRelevant = allItems.filter((item) => {
      if (!item.expiryDate) return false;
      const expDate = new Date(item.expiryDate);
      return expDate <= ninetyDaysFromNow;
    });

    // Merge: use allExpiryRelevant as it's more comprehensive
    const seen = new Set<string>();
    const merged: InventoryItem[] = [];
    for (const item of [...expiryItems, ...allExpiryRelevant]) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    // Sort by expiry date ascending (most urgent first)
    merged.sort((a, b) => {
      const da = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
      const db = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      return da - db;
    });

    return merged;
  }, [allItems, expiryItems]);

  // ─── Stock Summary: filtered items ────────────────────────────────────────
  const filteredStockItems = useMemo(() => {
    if (categoryFilter === "all") return allItems;
    return allItems.filter((item) => item.category === categoryFilter);
  }, [allItems, categoryFilter]);

  const stockTotals = useMemo(() => {
    const totalItems = filteredStockItems.length;
    const totalValue = filteredStockItems.reduce(
      (sum, item) => sum + item.currentStock * (item.unitPrice || 0),
      0
    );
    return { totalItems, totalValue };
  }, [filteredStockItems]);

  // ─── Low Stock Totals ─────────────────────────────────────────────────────
  const lowStockTotals = useMemo(() => {
    const totalToReorder = effectiveLowStockItems.length;
    const totalEstimatedCost = effectiveLowStockItems.reduce((sum, item) => {
      const shortage = Math.max(0, item.reorderLevel - item.currentStock);
      return sum + shortage * (item.costPrice || 0);
    }, 0);
    return { totalToReorder, totalEstimatedCost };
  }, [effectiveLowStockItems]);

  // ─── Expiry Totals ────────────────────────────────────────────────────────
  const expiryTotals = useMemo(() => {
    const totalItems = expiryReportItems.length;
    const totalValue = expiryReportItems.reduce(
      (sum, item) => sum + item.currentStock * (item.unitPrice || 0),
      0
    );
    const expiredCount = expiryReportItems.filter(
      (item) => item.expiryDate && daysUntilExpiry(item.expiryDate) < 0
    ).length;
    return { totalItems, totalValue, expiredCount };
  }, [expiryReportItems]);

  // ─── CSV Export: Stock Summary ────────────────────────────────────────────
  function exportStockSummaryCSV() {
    const headers = [
      "Name", "SKU", "Mfr Code", "Category", "Subcategory",
      "Packing", "Unit", "Current Stock", "Unit Price (MRP)",
      "Stock Value", "Status",
    ];
    const rows = filteredStockItems.map((item) => [
      escapeCSV(item.name),
      escapeCSV(item.sku),
      escapeCSV(item.manufacturerCode),
      escapeCSV(item.category),
      escapeCSV(item.subcategory),
      escapeCSV(item.packing),
      escapeCSV(item.unit),
      escapeCSV(item.currentStock),
      escapeCSV((item.unitPrice || 0).toFixed(2)),
      escapeCSV((item.currentStock * (item.unitPrice || 0)).toFixed(2)),
      escapeCSV(item.status),
    ]);

    // Totals row
    rows.push([
      "TOTAL", "", "", "", "", "", "",
      escapeCSV(filteredStockItems.reduce((s, i) => s + i.currentStock, 0)),
      "",
      escapeCSV(stockTotals.totalValue.toFixed(2)),
      "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`stock-summary-${dateStr}.csv`, csv);
  }

  // ─── CSV Export: Low Stock ────────────────────────────────────────────────
  function exportLowStockCSV() {
    const headers = [
      "Name", "SKU", "Packing", "Current Stock", "Reorder Level",
      "Shortage", "Unit", "Estimated Cost",
    ];
    const rows = effectiveLowStockItems.map((item) => {
      const shortage = Math.max(0, item.reorderLevel - item.currentStock);
      return [
        escapeCSV(item.name),
        escapeCSV(item.sku),
        escapeCSV(item.packing),
        escapeCSV(item.currentStock),
        escapeCSV(item.reorderLevel),
        escapeCSV(shortage),
        escapeCSV(item.unit),
        escapeCSV((shortage * (item.costPrice || 0)).toFixed(2)),
      ];
    });

    rows.push([
      "TOTAL", "", "", "", "", "", "",
      escapeCSV(lowStockTotals.totalEstimatedCost.toFixed(2)),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`low-stock-report-${dateStr}.csv`, csv);
  }

  // ─── Kottakkal Indent Export ──────────────────────────────────────────────
  function exportKottakkalIndent() {
    const headers = ["Code", "Name of Medicine", "Unit", "Qty"];
    const rows = effectiveLowStockItems.map((item) => {
      const shortage = Math.max(0, item.reorderLevel - item.currentStock);
      return [
        escapeCSV(item.manufacturerCode || item.sku),
        escapeCSV(item.name),
        escapeCSV(item.unit),
        escapeCSV(shortage),
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`kottakkal-indent-${dateStr}.csv`, csv);
  }

  // ─── CSV Export: Expiry Report ────────────────────────────────────────────
  function exportExpiryCSV() {
    const headers = [
      "Name", "SKU", "Batch Number", "Packing", "Current Stock",
      "Expiry Date", "Days Left/Overdue", "Stock Value",
    ];
    const rows = expiryReportItems.map((item) => {
      const days = item.expiryDate ? daysUntilExpiry(item.expiryDate) : 0;
      const daysLabel = days < 0 ? `${Math.abs(days)} days overdue` : `${days} days left`;
      return [
        escapeCSV(item.name),
        escapeCSV(item.sku),
        escapeCSV(item.batchNumber),
        escapeCSV(item.packing),
        escapeCSV(item.currentStock),
        escapeCSV(item.expiryDate ? formatDate(item.expiryDate) : ""),
        escapeCSV(daysLabel),
        escapeCSV((item.currentStock * (item.unitPrice || 0)).toFixed(2)),
      ];
    });

    rows.push([
      "TOTAL", "", "", "", "", "", "",
      escapeCSV(expiryTotals.totalValue.toFixed(2)),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`expiry-report-${dateStr}.csv`, csv);
  }

  // ─── CSV Export: Transfers ────────────────────────────────────────────────
  function exportTransfersCSV() {
    if (!transferData) return;
    const headers = [
      "Transfer #", "From Branch", "To Branch", "Status",
      "Items", "Qty", "Value", "Transfer Date", "Received Date",
    ];
    const rows = transferData.transfers.map((t) => [
      escapeCSV(t.transferNumber),
      escapeCSV(`${t.fromBranch.name} (${t.fromBranch.code})`),
      escapeCSV(`${t.toBranch.name} (${t.toBranch.code})`),
      escapeCSV(t.status),
      escapeCSV(t.itemCount),
      escapeCSV(t.totalQty),
      escapeCSV(t.totalValue.toFixed(2)),
      escapeCSV(t.transferDate ? formatDate(t.transferDate) : ""),
      escapeCSV(t.receivedDate ? formatDate(t.receivedDate) : ""),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`transfer-report-${dateStr}.csv`, csv);
  }

  // ─── Print Handler ────────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ─── Expiry Row Color ─────────────────────────────────────────────────────
  function getExpiryRowStyle(expiryDate: string | null): React.CSSProperties {
    if (!expiryDate) return {};
    const days = daysUntilExpiry(expiryDate);
    if (days < 0) return { background: "#ffebee", color: "#c62828" }; // Expired — red
    if (days < 30) return { background: "#fff3e0", color: "#e65100" }; // <30 days — orange
    if (days < 90) return { background: "#fffde7", color: "#f57f17" }; // <90 days — yellow
    return {};
  }

  function getExpiryBadge(expiryDate: string | null): { label: string; bg: string; color: string } | null {
    if (!expiryDate) return null;
    const days = daysUntilExpiry(expiryDate);
    if (days < 0)
      return { label: `${Math.abs(days)}d overdue`, bg: "#ffcdd2", color: "#b71c1c" };
    if (days < 30)
      return { label: `${days}d left`, bg: "#ffe0b2", color: "#e65100" };
    if (days < 90)
      return { label: `${days}d left`, bg: "#fff9c4", color: "#f57f17" };
    return { label: `${days}d left`, bg: "#e8f5e9", color: "#2e7d32" };
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────
  if (!mounted) return null;

  // ─── Report Tab Buttons ───────────────────────────────────────────────────
  const reportTabs: { key: ReportTab; label: string; icon: string }[] = [
    { key: "stock-summary", label: "Current Stock Summary", icon: "📦" },
    { key: "low-stock", label: "Low Stock / Reorder", icon: "⚠️" },
    { key: "expiry", label: "Expiry Report", icon: "📅" },
    { key: "transfers", label: "Transfers", icon: "🔄" },
  ];

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ─── Print-only Header ──────────────────────────────────────────── */}
      <div className="print-header" style={{ display: "none" }}>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", textAlign: "center", margin: 0 }}>
          Ayur Centre Pte. Ltd.
        </h1>
        <p style={{ fontSize: "13px", textAlign: "center", margin: "2px 0 0" }}>
          Stock Report &mdash; {todayFormatted()}
        </p>
        <hr style={{ margin: "8px 0", border: "1px solid #000" }} />
      </div>

      {/* ─── Screen Layout ──────────────────────────────────────────────── */}
      <div className="no-print mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <div className="no-print">
        <InventoryTabs />
      </div>

      <div>
        {/* ─── Page Header ──────────────────────────────────────────────── */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
              Stock Reports
            </h2>
            {selectedBranchId && branches.length > 0 && (
              <p className="text-[14px] mt-0.5" style={{ color: "var(--blue-500)" }}>
                {branches.find((b) => b.id === selectedBranchId)?.name || "Branch"}
              </p>
            )}
          </div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 text-[14px]"
            style={{ ...cardStyle, cursor: "pointer", minWidth: 200 }}
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* ─── Report Type Tabs ─────────────────────────────────────────── */}
        <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {reportTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 text-[14px] font-semibold transition-all duration-150"
              style={{
                ...cardStyle,
                cursor: "pointer",
                border: activeTab === tab.key ? "2px solid var(--blue-500)" : "1px solid var(--grey-300)",
                background: activeTab === tab.key ? "var(--blue-50, rgba(33,150,243,0.06))" : "var(--white)",
                color: activeTab === tab.key ? "var(--blue-500)" : "var(--grey-700)",
              }}
            >
              <span style={{ marginRight: 6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── Loading / Error States ───────────────────────────────────── */}
        {loading && (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--grey-500)", fontSize: 15 }}>Loading inventory data...</p>
          </div>
        )}

        {error && (
          <div style={{ ...cardStyle, padding: 20, borderColor: "var(--red)", background: "#ffebee" }}>
            <p style={{ color: "var(--red)", fontSize: 14, fontWeight: 600 }}>Error: {error}</p>
            <button
              onClick={() => { fetchAllItems(); fetchLowStock(); fetchExpiryItems(); }}
              className="mt-2 px-3 py-1 text-[13px] font-semibold"
              style={btnPrimary}
            >
              Retry
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REPORT 1: CURRENT STOCK SUMMARY                               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!loading && !error && activeTab === "stock-summary" && (
          <div>
            {/* ─── Toolbar ──────────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-[14px]"
                style={{ ...cardStyle, cursor: "pointer", minWidth: 180 }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <div style={{ flex: 1 }} />

              <button
                onClick={handlePrint}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnSecondary}
              >
                🖨️ Print
              </button>
              <button
                onClick={exportStockSummaryCSV}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnPrimary}
              >
                📥 Export CSV
              </button>
            </div>

            {/* ─── Summary Stats ────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Total Items</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--grey-900)" }}>{stockTotals.totalItems}</p>
              </div>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Total Stock Value</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--blue-500)" }}>{formatCurrency(stockTotals.totalValue)}</p>
              </div>
            </div>

            {/* ─── Table ────────────────────────────────────────────────── */}
            <div style={{ ...cardStyle, overflow: "auto" }}>
              <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                    {["Name", "SKU", "Mfr Code", "Category", "Subcategory", "Packing", "Unit", "Stock", "Unit Price (MRP)", "Stock Value", "Status"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 32, textAlign: "center", color: "var(--grey-400)" }}>
                        No items found
                      </td>
                    </tr>
                  ) : (
                    filteredStockItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                        <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                          {item.name}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)", fontFamily: "monospace" }}>
                          {item.sku}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)", fontFamily: "monospace" }}>
                          {item.manufacturerCode || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)", textTransform: "capitalize" }}>
                          {item.category}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                          {item.subcategory || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                          {item.packing || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                          {item.unit}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: item.currentStock <= item.reorderLevel ? "var(--red)" : "var(--grey-900)" }}>
                          {item.currentStock}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)", textAlign: "right" }}>
                          {formatCurrency(item.unitPrice || 0)}
                        </td>
                        <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--blue-500)", textAlign: "right" }}>
                          {formatCurrency(item.currentStock * (item.unitPrice || 0))}
                        </td>
                        <td className="px-4 py-2.5 text-[12px]">
                          <span
                            className="inline-flex px-2 py-0.5 font-bold uppercase tracking-wide"
                            style={{
                              borderRadius: "var(--radius-sm)",
                              background:
                                item.status === "active" ? "#e8f5e9" :
                                item.status === "discontinued" ? "#ffebee" : "#fff3e0",
                              color:
                                item.status === "active" ? "#2e7d32" :
                                item.status === "discontinued" ? "#c62828" : "#e65100",
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredStockItems.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--grey-300)", background: "var(--grey-50, #fafafa)" }}>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>
                        TOTAL ({stockTotals.totalItems} items)
                      </td>
                      <td colSpan={8} />
                      <td className="px-4 py-3 text-[14px] font-bold" style={{ color: "var(--blue-500)", textAlign: "right" }}>
                        {formatCurrency(stockTotals.totalValue)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REPORT 2: LOW STOCK / REORDER REPORT                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!loading && !error && activeTab === "low-stock" && (
          <div>
            {/* ─── Toolbar ──────────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }} />
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnSecondary}
              >
                🖨️ Print
              </button>
              <button
                onClick={exportLowStockCSV}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnPrimary}
              >
                📥 Export CSV
              </button>
              <button
                onClick={exportKottakkalIndent}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnSuccess}
              >
                📋 Export as Kottakkal Indent
              </button>
            </div>

            {/* ─── Summary Stats ────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Items to Reorder</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#e65100" }}>{lowStockTotals.totalToReorder}</p>
              </div>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Estimated Reorder Cost</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--red)" }}>{formatCurrency(lowStockTotals.totalEstimatedCost)}</p>
              </div>
            </div>

            {/* ─── Table ────────────────────────────────────────────────── */}
            <div style={{ ...cardStyle, overflow: "auto" }}>
              <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                    {["Name", "SKU", "Packing", "Current Stock", "Reorder Level", "Shortage", "Unit", "Estimated Cost"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {effectiveLowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--grey-400)" }}>
                        No low stock items found — all items are adequately stocked
                      </td>
                    </tr>
                  ) : (
                    effectiveLowStockItems.map((item) => {
                      const shortage = Math.max(0, item.reorderLevel - item.currentStock);
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-100)", background: item.currentStock === 0 ? "#ffebee" : "transparent" }}>
                          <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)", fontFamily: "monospace" }}>
                            {item.sku}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                            {item.packing || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: item.currentStock === 0 ? "#c62828" : "#e65100" }}>
                            {item.currentStock}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>
                            {item.reorderLevel}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: "#c62828" }}>
                            {shortage}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                            {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--red)", textAlign: "right" }}>
                            {formatCurrency(shortage * (item.costPrice || 0))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {effectiveLowStockItems.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--grey-300)", background: "var(--grey-50, #fafafa)" }}>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>
                        TOTAL ({lowStockTotals.totalToReorder} items)
                      </td>
                      <td colSpan={6} />
                      <td className="px-4 py-3 text-[14px] font-bold" style={{ color: "var(--red)", textAlign: "right" }}>
                        {formatCurrency(lowStockTotals.totalEstimatedCost)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REPORT 3: EXPIRY REPORT                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!loading && !error && activeTab === "expiry" && (
          <div>
            {/* ─── Toolbar ──────────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }} />
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnSecondary}
              >
                🖨️ Print
              </button>
              <button
                onClick={exportExpiryCSV}
                className="px-4 py-2 text-[13px] font-semibold"
                style={btnPrimary}
              >
                📥 Export CSV
              </button>
            </div>

            {/* ─── Summary Stats ────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Items Expiring/Expired</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#e65100" }}>{expiryTotals.totalItems}</p>
              </div>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Already Expired</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#c62828" }}>{expiryTotals.expiredCount}</p>
              </div>
              <div style={{ ...cardStyle, padding: "12px 20px", flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>At-Risk Stock Value</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--red)" }}>{formatCurrency(expiryTotals.totalValue)}</p>
              </div>
            </div>

            {/* ─── Legend ────────────────────────────────────────────────── */}
            <div className="no-print" style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: "#ffcdd2", display: "inline-block" }} /> Expired
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: "#ffe0b2", display: "inline-block" }} /> &lt;30 days
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: "#fff9c4", display: "inline-block" }} /> &lt;90 days
              </span>
            </div>

            {/* ─── Table ────────────────────────────────────────────────── */}
            <div style={{ ...cardStyle, overflow: "auto" }}>
              <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                    {["Name", "SKU", "Batch Number", "Packing", "Current Stock", "Expiry Date", "Days Left / Overdue", "Stock Value"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expiryReportItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--grey-400)" }}>
                        No items expiring within 90 days
                      </td>
                    </tr>
                  ) : (
                    expiryReportItems.map((item) => {
                      const badge = getExpiryBadge(item.expiryDate);
                      return (
                        <tr key={item.id} style={{ ...getExpiryRowStyle(item.expiryDate), borderBottom: "1px solid var(--grey-100)" }}>
                          <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "inherit" }}>
                            {item.name}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]" style={{ fontFamily: "monospace" }}>
                            {item.sku}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]">
                            {item.batchNumber || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]">
                            {item.packing || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-bold">
                            {item.currentStock}
                          </td>
                          <td className="px-4 py-2.5 text-[13px]">
                            {item.expiryDate ? formatDate(item.expiryDate) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-[12px]">
                            {badge && (
                              <span
                                className="inline-flex px-2 py-0.5 font-bold uppercase tracking-wide"
                                style={{ borderRadius: "var(--radius-sm)", background: badge.bg, color: badge.color }}
                              >
                                {badge.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ textAlign: "right" }}>
                            {formatCurrency(item.currentStock * (item.unitPrice || 0))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {expiryReportItems.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--grey-300)", background: "var(--grey-50, #fafafa)" }}>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>
                        TOTAL ({expiryTotals.totalItems} items)
                      </td>
                      <td colSpan={6} />
                      <td className="px-4 py-3 text-[14px] font-bold" style={{ color: "var(--red)", textAlign: "right" }}>
                        {formatCurrency(expiryTotals.totalValue)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* REPORT 4: TRANSFERS                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {!loading && !error && activeTab === "transfers" && (
          <div>
            {/* ─── Loading ─────────────────────────────────────────────── */}
            {transferLoading && (
              <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--grey-500)", fontSize: 15 }}>Loading transfer data...</p>
              </div>
            )}

            {!transferLoading && !transferData && (
              <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--grey-400)", fontSize: 15 }}>No transfer data available.</p>
              </div>
            )}

            {!transferLoading && transferData && (
              <>
                {/* ─── Toolbar ──────────────────────────────────────────── */}
                <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 text-[13px] font-semibold"
                    style={btnSecondary}
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={exportTransfersCSV}
                    className="px-4 py-2 text-[13px] font-semibold"
                    style={btnPrimary}
                  >
                    📥 Export CSV
                  </button>
                </div>

                {/* ─── Summary Stats ────────────────────────────────────── */}
                <div className="no-print" style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                  <div style={{ ...cardStyle, padding: "12px 20px", flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Total Transfers</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "var(--grey-900)" }}>{transferData.summary.totalTransfers}</p>
                  </div>
                  <div style={{ ...cardStyle, padding: "12px 20px", flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Items Moved</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "var(--blue-500)" }}>{transferData.summary.totalItemsMoved}</p>
                  </div>
                  <div style={{ ...cardStyle, padding: "12px 20px", flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Value Moved</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#2e7d32" }}>{formatCurrency(transferData.summary.totalValueMoved)}</p>
                  </div>
                  <div style={{ ...cardStyle, padding: "12px 20px", flex: 1, minWidth: 140 }}>
                    <p style={{ fontSize: 12, color: "var(--grey-500)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>In Transit</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#1976d2" }}>{transferData.summary.inTransit}</p>
                  </div>
                </div>

                {/* ─── Transfers Table ──────────────────────────────────── */}
                <div style={{ ...cardStyle, overflow: "auto", marginBottom: 24 }}>
                  <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                        {["Transfer #", "From → To", "Items", "Qty", "Value", "Status", "Date"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                            style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transferData.transfers.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--grey-400)" }}>
                            No transfers in this period
                          </td>
                        </tr>
                      ) : (
                        transferData.transfers.map((t) => {
                          const statusColors: Record<string, { bg: string; color: string }> = {
                            received: { bg: "#e8f5e9", color: "#2e7d32" },
                            in_transit: { bg: "#e3f2fd", color: "#1565c0" },
                            cancelled: { bg: "#ffebee", color: "#c62828" },
                            draft: { bg: "#f5f5f5", color: "#757575" },
                          };
                          const sc = statusColors[t.status] || statusColors.draft;
                          return (
                            <tr key={t.id} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                              <td className="px-4 py-2.5 text-[13px] font-semibold">
                                <Link
                                  href={`/inventory/transfers/${t.id}`}
                                  style={{ color: "var(--blue-500)", textDecoration: "none" }}
                                >
                                  {t.transferNumber}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>
                                <span style={{ fontWeight: 600 }}>{t.fromBranch.code}</span>
                                <span style={{ margin: "0 4px", color: "var(--grey-400)" }}>→</span>
                                <span style={{ fontWeight: 600 }}>{t.toBranch.code}</span>
                              </td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>
                                {t.itemCount}
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>
                                {t.totalQty}
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--grey-700)", textAlign: "right" }}>
                                {formatCurrency(t.totalValue)}
                              </td>
                              <td className="px-4 py-2.5 text-[12px]">
                                <span
                                  className="inline-flex px-2 py-0.5 font-bold uppercase tracking-wide"
                                  style={{ borderRadius: "var(--radius-sm)", background: sc.bg, color: sc.color }}
                                >
                                  {t.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-600)" }}>
                                {formatDate(t.transferDate)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ─── Branch Flow Summary ──────────────────────────────── */}
                {transferData.branchSummary.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-800)", marginBottom: 12 }}>Branch Flow Summary</h3>
                    <div style={{ ...cardStyle, overflow: "auto" }}>
                      <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                            {["Branch", "Sent (Count)", "Sent (Qty)", "Received (Count)", "Received (Qty)", "Net Qty"].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                                style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {transferData.branchSummary.map((b) => (
                            <tr key={b.branchCode} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                              <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                                {b.branchName} <span style={{ color: "var(--grey-400)", fontWeight: 400 }}>({b.branchCode})</span>
                              </td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>{b.sentCount}</td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>{b.sentQty}</td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>{b.receivedCount}</td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>{b.receivedQty}</td>
                              <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: b.netQty > 0 ? "#2e7d32" : b.netQty < 0 ? "#c62828" : "var(--grey-700)" }}>
                                {b.netQty > 0 ? "+" : ""}{b.netQty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── Top Transferred Items ────────────────────────────── */}
                {transferData.topTransferredItems.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-800)", marginBottom: 12 }}>Top Transferred Items</h3>
                    <div style={{ ...cardStyle, overflow: "auto" }}>
                      <table className="report-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--grey-200)" }}>
                            {["Item Name", "Total Qty", "# Transfers"].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-[12px] font-bold uppercase tracking-wider"
                                style={{ color: "var(--grey-600)", whiteSpace: "nowrap" }}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {transferData.topTransferredItems.map((item) => (
                            <tr key={item.name} style={{ borderBottom: "1px solid var(--grey-100)" }}>
                              <td className="px-4 py-2.5 text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                                {item.name}
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-bold" style={{ color: "var(--blue-500)" }}>
                                {item.totalQty}
                              </td>
                              <td className="px-4 py-2.5 text-[13px]" style={{ color: "var(--grey-700)" }}>
                                {item.transferCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRINT STYLES                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @media print {
          /* Hide everything except the report */
          nav,
          aside,
          header,
          footer,
          .no-print,
          [data-sidebar],
          [data-nav],
          [class*="sidebar"],
          [class*="Sidebar"] {
            display: none !important;
          }

          /* Show print header */
          .print-header {
            display: block !important;
            margin-bottom: 12px;
          }

          /* Clean page layout */
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            font-size: 11px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Remove card styling for print */
          .report-table {
            border: 1px solid #333;
          }

          .report-table th {
            background: #f0f0f0 !important;
            color: #000 !important;
            border-bottom: 2px solid #333 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
          }

          .report-table td {
            border-bottom: 1px solid #ccc !important;
            padding: 4px 8px !important;
            font-size: 10px !important;
            color: #000 !important;
          }

          .report-table tfoot td {
            border-top: 2px solid #333 !important;
            font-weight: bold !important;
            font-size: 11px !important;
          }

          /* Preserve expiry row colors in print */
          tr[style*="ffebee"] {
            background: #ffebee !important;
          }
          tr[style*="fff3e0"] {
            background: #fff3e0 !important;
          }
          tr[style*="fffde7"] {
            background: #fffde7 !important;
          }

          /* Page settings */
          @page {
            size: landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
