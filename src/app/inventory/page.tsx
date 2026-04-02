"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";
import { HelpTip, PageGuide, SectionNote } from "@/components/HelpTip";
import { TablePageSkeleton } from "@/components/Skeleton";
import { cardStyle, btnPrimary, chipBase } from "@/lib/styles";
import { formatDate } from "@/lib/formatters";

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
  costPrice: number | null;
  unitPrice: number | null;
  sellingPrice?: number | null;
  expiryDate: string | null;
  status: string;
  createdAt: string;
  _count?: { variants: number };
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

type SortField = "sku" | "name" | "category" | "stock" | "unitPrice" | "expiryDate" | "status";
type SortDir = "asc" | "desc";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil (Thailam)" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
];

const SUBCATEGORY_OPTIONS = [
  { value: "all", label: "All Sub Categories" },
  { value: "Arishtam", label: "Arishtam" },
  { value: "Asavam", label: "Asavam" },
  { value: "Bhasmam", label: "Bhasmam" },
  { value: "Bhasmam & Ksharam", label: "Bhasmam & Ksharam" },
  { value: "Churnam", label: "Churnam" },
  { value: "Classical Tablet", label: "Classical Tablet" },
  { value: "Cream", label: "Cream" },
  { value: "Gel", label: "Gel" },
  { value: "Ghritam", label: "Ghritam" },
  { value: "Ghritam & Sneham", label: "Ghritam & Sneham" },
  { value: "Granule", label: "Granule" },
  { value: "Gulika", label: "Gulika" },
  { value: "Gulika & Tablet", label: "Gulika & Tablet" },
  { value: "Gutika", label: "Gutika" },
  { value: "Ksharam", label: "Ksharam" },
  { value: "Kuzhampu", label: "Kuzhampu" },
  { value: "Lehyam", label: "Lehyam" },
  { value: "Lehyam & Rasayanam", label: "Lehyam & Rasayanam" },
  { value: "Liniment", label: "Liniment" },
  { value: "Mashi", label: "Mashi" },
  { value: "Oil", label: "Oil" },
  { value: "Oil & Tailam", label: "Oil & Tailam" },
  { value: "Ointment", label: "Ointment" },
  { value: "Personal Care", label: "Personal Care" },
  { value: "Personal Care - Shampoo", label: "Personal Care - Shampoo" },
  { value: "Personal Care - Soap", label: "Personal Care - Soap" },
  { value: "Proprietary Medicine", label: "Proprietary Medicine" },
  { value: "Proprietary Syrup", label: "Proprietary Syrup" },
  { value: "Proprietary Tablet", label: "Proprietary Tablet" },
  { value: "Rasakriya", label: "Rasakriya" },
  { value: "Rasayanam", label: "Rasayanam" },
  { value: "Sneham", label: "Sneham" },
  { value: "Tailam", label: "Tailam" },
];

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Sort Header Component ─────────────────────────────────────────────────
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

// ─── Stock Color Helper ─────────────────────────────────────────────────────
function getStockColor(stock: number, reorderLevel: number): string {
  if (stock <= reorderLevel) return "var(--red)";
  if (stock <= reorderLevel * 2) return "#f57c00"; // orange
  return "var(--green)";
}

function getStockBg(stock: number, reorderLevel: number): string {
  if (stock <= reorderLevel) return "#ffebee";
  if (stock <= reorderLevel * 2) return "#fff3e0";
  return "#e8f5e9";
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function InventoryPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ totalItems: 0, totalValue: 0, lowStockCount: 0, expiringSoonCount: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"lowStock" | "expiringSoon" | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(() => {
    fetch("/api/inventory/stats")
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(setStats)
      .catch(() => {});
  }, []);

  // ─── Data fetching ────────────────────────────────────────────────────────
  const fetchItems = useCallback(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (subcategoryFilter !== "all") params.set("subcategory", subcategoryFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (quickFilter === "lowStock") params.set("lowStock", "true");
    if (quickFilter === "expiringSoon") params.set("expiringSoon", "true");

    fetch(`/api/inventory?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, categoryFilter, subcategoryFilter, statusFilter, quickFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ─── Client-side sorting ──────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const result = [...items];
    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "sku": return dir * a.sku.localeCompare(b.sku);
        case "name": return dir * a.name.localeCompare(b.name);
        case "category": return dir * a.category.localeCompare(b.category);
        case "stock": return dir * (a.currentStock - b.currentStock);
        case "unitPrice": return dir * ((a.unitPrice || 0) - (b.unitPrice || 0));
        case "expiryDate":
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return dir * (new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        case "status": return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });
    return result;
  }, [items, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // ─── Bulk selection helpers ──────────────────────────────────────────────
  const allSelected = sorted.length > 0 && sorted.every((item) => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((item) => item.id)));
    }
  }

  function toggleSelectItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkStatusUpdate(newStatus: string) {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action: "updateStatus", status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setSelectedIds(new Set());
      setBulkAction("");
      fetchItems();
      fetchStats();
    } catch {
      setError("Failed to update items. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  }

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
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {sorted.length} item{sorted.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          href="/inventory/new"
          className="inline-flex items-center justify-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
          style={btnPrimary}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </Link>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <InventoryTabs />

      {/* ── Getting Started Guide ────────────────────────────────── */}
      <PageGuide
        storageKey="inventory"
        title="Inventory Quick Guide"
        subtitle="Manage your clinic's medicines, herbs, oils, and equipment in one place."
        steps={[
          { icon: "📦", title: "Add Items", description: "Click 'Add Item' to add new medicines or supplies. Each item gets a unique SKU automatically." },
          { icon: "✅", title: "Bulk Status Update", description: "Use checkboxes to select items, then change status to Active, Inactive, or Discontinued in one click." },
          { icon: "🔍", title: "Search & Filter", description: "Search by name/SKU, filter by category or status. Use 'Low Stock' and 'Expiring Soon' quick filters." },
          { icon: "📊", title: "Stock Management", description: "Click any item to view details, adjust stock, record purchases, or view transaction history." },
          { icon: "🏷️", title: "Status Meanings", description: "Active = in use, Inactive = temporarily unavailable, Discontinued = no longer stocked." },
          { icon: "⚠️", title: "Alerts & Reorder", description: "Items turn red when stock falls below reorder level. Check 'Alerts' tab for all low-stock items." },
        ]}
      />

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide inline-flex items-center gap-1" style={{ color: "var(--grey-600)" }}>Total Items <HelpTip text="Total number of inventory items across all categories and statuses." size={13} /></p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats.totalItems}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Value</p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>
                <span className="text-[18px]" style={{ color: "var(--grey-500)" }}>S$</span>{stats.totalValue.toLocaleString("en-SG")}
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
              <p className="text-[14px] font-semibold uppercase tracking-wide inline-flex items-center gap-1" style={{ color: "var(--grey-600)" }}>Low Stock <HelpTip text="Items where current stock is at or below the reorder level. These need to be restocked soon." size={13} /></p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: stats.lowStockCount > 0 ? "var(--red)" : "var(--grey-900)" }}>{stats.lowStockCount}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#ffcdd2", borderRadius: "var(--radius-sm)", color: "var(--red)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-wide inline-flex items-center gap-1" style={{ color: "var(--grey-600)" }}>Expiring Soon <HelpTip text="Items expiring within 30 days. Consider using or replacing these items before they expire." size={13} /></p>
              <p className="text-[30px] font-bold mt-1 tracking-tight" style={{ color: stats.expiringSoonCount > 0 ? "#f57c00" : "var(--grey-900)" }}>{stats.expiringSoonCount}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#ffe0b2", borderRadius: "var(--radius-sm)", color: "#f57c00" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              placeholder="Search by name, SKU, batch number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-[15px]"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
              aria-label="Search inventory"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center" style={{ color: "var(--grey-500)" }} aria-label="Clear search">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 160 }}
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          {/* Sub Category Filter */}
          <select
            value={subcategoryFilter}
            onChange={(e) => setSubcategoryFilter(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 180 }}
          >
            {SUBCATEGORY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-[15px]"
            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", minWidth: 140 }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Quick filter buttons */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setQuickFilter(quickFilter === "lowStock" ? null : "lowStock")}
            className="px-3 py-1.5 text-[13px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5"
            style={{
              borderRadius: "var(--radius-pill)",
              border: quickFilter === "lowStock" ? "1.5px solid var(--red)" : "1px solid var(--grey-300)",
              background: quickFilter === "lowStock" ? "#ffebee" : "var(--white)",
              color: quickFilter === "lowStock" ? "var(--red)" : "var(--grey-600)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Low Stock
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "expiringSoon" ? null : "expiringSoon")}
            className="px-3 py-1.5 text-[13px] font-semibold transition-all duration-150 inline-flex items-center gap-1.5"
            style={{
              borderRadius: "var(--radius-pill)",
              border: quickFilter === "expiringSoon" ? "1.5px solid #f57c00" : "1px solid var(--grey-300)",
              background: quickFilter === "expiringSoon" ? "#fff3e0" : "var(--white)",
              color: quickFilter === "expiringSoon" ? "#f57c00" : "var(--grey-600)",
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Expiring Soon
          </button>
          {(search || categoryFilter !== "all" || subcategoryFilter !== "all" || statusFilter !== "all" || quickFilter) && (
            <button
              onClick={() => { setSearch(""); setCategoryFilter("all"); setSubcategoryFilter("all"); setStatusFilter("all"); setQuickFilter(null); }}
              className="text-[13px] font-semibold ml-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Actions Toolbar ──────────────────────────────── */}
      {someSelected && (
        <div
          className="mb-4 px-4 py-3 flex flex-wrap items-center gap-3 yoda-fade-in"
          style={{ background: "var(--blue-50)", borderRadius: "var(--radius)", border: "1px solid var(--blue-200)" }}
        >
          <span className="text-[15px] font-semibold" style={{ color: "var(--blue-500)" }}>
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <span style={{ width: 1, height: 20, background: "var(--blue-200)" }} />
          <span className="text-[14px] font-medium" style={{ color: "var(--grey-700)" }}>Set status:</span>
          <button
            onClick={() => handleBulkStatusUpdate("active")}
            disabled={bulkLoading}
            className="px-3 py-1 text-[14px] font-semibold transition-colors"
            style={{ borderRadius: "var(--radius-sm)", background: "#e8f5e9", color: "var(--green)", border: "1px solid #a5d6a7" }}
          >
            {bulkLoading ? "..." : "Active"}
          </button>
          <button
            onClick={() => handleBulkStatusUpdate("inactive")}
            disabled={bulkLoading}
            className="px-3 py-1 text-[14px] font-semibold transition-colors"
            style={{ borderRadius: "var(--radius-sm)", background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-400)" }}
          >
            {bulkLoading ? "..." : "Inactive"}
          </button>
          <button
            onClick={() => handleBulkStatusUpdate("discontinued")}
            disabled={bulkLoading}
            className="px-3 py-1 text-[14px] font-semibold transition-colors"
            style={{ borderRadius: "var(--radius-sm)", background: "#ffebee", color: "var(--red)", border: "1px solid #ef9a9a" }}
          >
            {bulkLoading ? "..." : "Discontinued"}
          </button>
          <span className="flex-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[14px] font-semibold hover:underline"
            style={{ color: "var(--grey-600)" }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load inventory: {error}</p>
          <button onClick={fetchItems} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      )}

      {/* ── Loading State ───────────────────────────────────────── */}
      {loading ? (
        <TablePageSkeleton columns={7} rows={6} />
      ) : sorted.length === 0 ? (
        /* ── Empty State ─────────────────────────────────────────── */
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {search || categoryFilter !== "all" || subcategoryFilter !== "all" || statusFilter !== "all" || quickFilter ? "No items match your filters" : "No inventory items found"}
          </p>
          {(search || categoryFilter !== "all" || subcategoryFilter !== "all" || statusFilter !== "all" || quickFilter) ? (
            <button
              onClick={() => { setSearch(""); setCategoryFilter("all"); setSubcategoryFilter("all"); setStatusFilter("all"); setQuickFilter(null); }}
              className="text-[14px] font-semibold mt-2 hover:underline"
              style={{ color: "var(--blue-500)" }}
            >
              Clear all filters
            </button>
          ) : (
            <Link href="/inventory/new" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
              Add your first inventory item
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
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer accent-[var(--blue-500)]"
                      aria-label="Select all items"
                    />
                  </th>
                  <SortHeader label="SKU" field="sku" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Item Name" field="name" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Category" field="category" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Sub Category</th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Packing</th>
                  <SortHeader label="Stock" field="stock" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Unit Price" field="unitPrice" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Expiry Date" field="expiryDate" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <SortHeader label="Status" field="status" currentField={sortField} direction={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => {
                  const stockColor = getStockColor(item.currentStock, item.reorderLevel);
                  const stockBg = getStockBg(item.currentStock, item.reorderLevel);
                  const expiryDays = item.expiryDate ? daysUntil(item.expiryDate) : null;
                  const expiryWarning = expiryDays !== null && expiryDays <= 30;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors duration-100 group"
                      style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 cursor-pointer accent-[var(--blue-500)]"
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                      <td className="px-4 py-3">
                        <Link href={`/inventory/${item.id}`} className="group/link">
                          <p className="text-[15px] font-semibold group-hover/link:underline" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                        {item.subcategory || "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>
                        {item.packing || "\u2014"}
                        {item._count && item._count.variants > 0 && (
                          <span className="ml-1 text-[11px] font-semibold px-1.5 py-0.5" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
                            +{item._count.variants}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex px-2 py-0.5 text-[14px] font-bold"
                          style={{ borderRadius: "var(--radius-sm)", background: stockBg, color: stockColor }}
                        >
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-800)" }}>
                        {item.unitPrice != null ? `S$${item.unitPrice.toLocaleString("en-SG")}` : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: expiryWarning ? "var(--red)" : "var(--grey-600)", fontWeight: expiryWarning ? 600 : 400 }}>
                        {item.expiryDate ? formatDate(item.expiryDate) : "\u2014"}
                        {expiryWarning && expiryDays !== null && (
                          <span className="block text-[12px]" style={{ color: "var(--red)" }}>
                            {expiryDays <= 0 ? "Expired" : `${expiryDays}d left`}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={chipBase}
                          style={{
                            borderRadius: "var(--radius-sm)",
                            background: item.status === "active" ? "#e8f5e9" : item.status === "discontinued" ? "#ffebee" : "var(--grey-200)",
                            color: item.status === "active" ? "var(--green)" : item.status === "discontinued" ? "var(--red)" : "var(--grey-600)",
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/inventory/${item.id}`} className="text-[14px] font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
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
            {sorted.map((item) => {
              const stockColor = getStockColor(item.currentStock, item.reorderLevel);
              const stockBg = getStockBg(item.currentStock, item.reorderLevel);
              const expiryDays = item.expiryDate ? daysUntil(item.expiryDate) : null;
              const expiryWarning = expiryDays !== null && expiryDays <= 30;

              return (
                <div
                  key={item.id}
                  className="block p-4 transition-shadow duration-150"
                  style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="w-4 h-4 mt-1 cursor-pointer accent-[var(--blue-500)]"
                      />
                      <Link href={`/inventory/${item.id}`} className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: "var(--blue-50)", color: "var(--blue-500)" }}>
                          {item.category}
                        </span>
                        <span className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</span>
                      </div>
                      <p className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                      {item.subcategory && <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>{item.subcategory}{item.packing ? ` · ${item.packing}` : ""}</p>}
                      <div className="flex gap-4 mt-2">
                        {item.unitPrice != null && (
                          <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>{"S$"}{item.unitPrice.toLocaleString("en-SG")}</span>
                        )}
                        {item.expiryDate && (
                          <span className="text-[13px]" style={{ color: expiryWarning ? "var(--red)" : "var(--grey-500)" }}>
                            Exp: {formatDate(item.expiryDate)}
                            {expiryWarning && expiryDays !== null && (expiryDays <= 0 ? " (Expired)" : ` (${expiryDays}d)`)}
                          </span>
                        )}
                      </div>
                      </Link>
                    </div>
                    <span
                      className="inline-flex px-2 py-0.5 text-[14px] font-bold ml-2 flex-shrink-0"
                      style={{ borderRadius: "var(--radius-sm)", background: stockBg, color: stockColor }}
                    >
                      {item.currentStock} {item.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
