"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import InventoryTabs from "@/components/InventoryTabs";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, btnPrimary, inputStyle, chipBase } from "@/lib/styles";
import { formatDateTime } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  subcategory: string | null;
  unit: string;
  packing: string | null;
  currentStock: number;
  status: string;
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
}

interface BranchStockEntry {
  itemId: string;
  quantity: number;
}

interface AuditEntry {
  itemId: string;
  physicalCount: number;
}

interface AuditResult {
  adjusted: number;
  matched: number;
  total: number;
  errors: string[];
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil (Thailam)" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
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

// ─── Component ──────────────────────────────────────────────────────────────
export default function StockAuditPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [subcategory, setSubcategory] = useState("all");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [showOnlyEntered, setShowOnlyEntered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [lastAuditedAt, setLastAuditedAt] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Scan mode state
  const [scanMode, setScanMode] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const { showFlash } = useFlash();
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Branch-aware state
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [branchStockMap, setBranchStockMap] = useState<Record<string, number>>({});

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (subcategory !== "all") params.set("subcategory", subcategory);
      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      // Fetch failed — silently handled
    } finally {
      setLoading(false);
    }
  }, [category, subcategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Load last audited timestamp from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lastStockAuditAt");
    if (saved) setLastAuditedAt(saved);
  }, []);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.ok ? r.json() : [])
      .then((list: BranchOption[]) => {
        setBranches(list);
        const main = list.find((b) => b.isMainBranch);
        if (main) setSelectedBranchId(main.id);
      })
      .catch(() => {});
  }, []);

  // Fetch branch stock when branch changes
  useEffect(() => {
    if (!selectedBranchId) {
      setBranchStockMap({});
      return;
    }
    fetch(`/api/branches/stock?branchId=${selectedBranchId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: BranchStockEntry[]) => {
        const map: Record<string, number> = {};
        for (const entry of data) {
          map[entry.itemId] = entry.quantity;
        }
        setBranchStockMap(map);
      })
      .catch(() => setBranchStockMap({}));
  }, [selectedBranchId]);

  // Update physical count for an item
  const handleCountChange = useCallback((itemId: string, value: string) => {
    // Allow empty or valid non-negative integers
    if (value === "" || /^\d+$/.test(value)) {
      setPhysicalCounts((prev) => ({ ...prev, [itemId]: value }));
    }
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = items;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.packing && item.packing.toLowerCase().includes(q))
      );
    }

    // Show only rows with entered physical counts
    if (showOnlyEntered) {
      result = result.filter((item) => physicalCounts[item.id] !== undefined && physicalCounts[item.id] !== "");
    }

    return result;
  }, [items, search, showOnlyEntered, physicalCounts]);

  // Stats
  const enteredCount = useMemo(() => {
    return Object.values(physicalCounts).filter((v) => v !== "" && v !== undefined).length;
  }, [physicalCounts]);

  // Helper to get the system stock for an item (branch stock if branch selected, otherwise global)
  const getSystemStock = useCallback((item: InventoryItem): number => {
    if (selectedBranchId && branchStockMap) {
      return branchStockMap[item.id] ?? 0;
    }
    return item.currentStock;
  }, [selectedBranchId, branchStockMap]);

  const discrepancyCount = useMemo(() => {
    let count = 0;
    for (const item of items) {
      const val = physicalCounts[item.id];
      if (val !== undefined && val !== "") {
        const physical = parseInt(val, 10);
        if (!isNaN(physical) && physical !== getSystemStock(item)) {
          count++;
        }
      }
    }
    return count;
  }, [items, physicalCounts, getSystemStock]);

  // Submit audit
  const handleSubmitAudit = async () => {
    const entries: AuditEntry[] = [];

    for (const item of items) {
      const val = physicalCounts[item.id];
      if (val !== undefined && val !== "") {
        const physical = parseInt(val, 10);
        if (!isNaN(physical)) {
          entries.push({ itemId: item.id, physicalCount: physical });
        }
      }
    }

    if (entries.length === 0) {
      showFlash({ type: "error", title: "Error", message: "No physical counts entered. Please enter at least one count." });
      return;
    }

    if (!confirm(`Submit audit for ${entries.length} items? ${discrepancyCount} discrepancies will be adjusted.`)) {
      return;
    }

    setSubmitting(true);
    setSubmitProgress(0);
    setAuditResult(null);

    try {
      // Simulate progress for UX (the API call is a single batch)
      const progressInterval = setInterval(() => {
        setSubmitProgress((prev) => Math.min(prev + 15, 85));
      }, 200);

      const res = await fetch("/api/inventory/stock-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: entries,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        }),
      });

      clearInterval(progressInterval);
      setSubmitProgress(100);

      if (res.ok) {
        const result: AuditResult = await res.json();
        setAuditResult(result);

        // Save audit timestamp
        const now = new Date().toISOString();
        setLastAuditedAt(now);
        localStorage.setItem("lastStockAuditAt", now);

        // Clear counts and refresh items + branch stock
        setPhysicalCounts({});
        fetchItems();
        // Refresh branch stock map if branch-specific audit
        if (selectedBranchId) {
          fetch(`/api/branches/stock?branchId=${selectedBranchId}`)
            .then((r) => r.ok ? r.json() : [])
            .then((data: BranchStockEntry[]) => {
              const map: Record<string, number> = {};
              for (const entry of data) {
                map[entry.itemId] = entry.quantity;
              }
              setBranchStockMap(map);
            })
            .catch(() => {});
        }
      } else {
        const err = await res.json();
        showFlash({ type: "error", title: "Error", message: `Audit failed: ${err.error || "Unknown error"}` });
      }
    } catch (err) {
      // Submission failed
      showFlash({ type: "error", title: "Error", message: "Failed to submit audit. Please try again." });
    } finally {
      setSubmitting(false);
      setSubmitProgress(0);
    }
  };

  // Clear all counts
  const handleClearAll = () => {
    if (Object.keys(physicalCounts).length > 0 && confirm("Clear all entered counts?")) {
      setPhysicalCounts({});
    }
  };

  // Show toast notification
  const showToast = useCallback((message: string, type: "success" | "error") => {
    showFlash({ type, title: type === "success" ? "Success" : "Error", message });
  }, [showFlash]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        showToast(`Item not found: ${code}`, "error");
        return;
      }
      const data = await res.json();
      const itemId = data.id as string;
      const itemName = data.name as string;

      // Check if item is in the current filtered list
      const itemInList = filteredItems.find((i) => i.id === itemId);
      if (!itemInList) {
        // Item exists but not in current filter view - clear filters to show it
        setSearch("");
        setCategory("all");
        setSubcategory("all");
        setShowOnlyEntered(false);
      }

      // Highlight the row
      setHighlightedItemId(itemId);
      setTimeout(() => setHighlightedItemId(null), 2000);

      // Scroll to the row and focus the physical count input
      // Use a short delay to allow any filter changes to render
      setTimeout(() => {
        const row = rowRefs.current[itemId];
        if (row) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = row.querySelector<HTMLInputElement>('input[data-audit-input]');
          if (input) {
            input.focus();
            input.select();
          }
        }
      }, 150);

      showToast(`Found: ${itemName}`, "success");
    } catch {
      showToast(`Lookup failed for: ${code}`, "error");
    }
  }, [filteredItems, showToast]);

  // Handle Enter/Tab on physical count input in scan mode - refocus scanner
  const handleCountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (scanMode && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      // Refocus scanner input after a brief delay
      setTimeout(() => {
        const scannerInput = document.querySelector<HTMLInputElement>('[data-scanner-input]');
        if (scannerInput) scannerInput.focus();
      }, 50);
    }
  }, [scanMode]);


  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* Sub Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Stock Audit
          </h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Count physical stock and reconcile with system
          </p>
          {lastAuditedAt && (
            <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
              Last audited: {formatDateTime(lastAuditedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Scan Mode Toggle */}
          <button
            onClick={() => setScanMode((prev) => !prev)}
            className="px-4 py-2.5 text-[14px] font-semibold inline-flex items-center gap-2 transition-colors"
            style={{
              borderRadius: "var(--radius-sm)",
              background: scanMode ? "var(--blue-500)" : "var(--white)",
              color: scanMode ? "white" : "var(--grey-700)",
              border: scanMode ? "1px solid var(--blue-500)" : "1px solid var(--grey-400)",
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            {scanMode ? "Scan Mode ON" : "Scan Mode"}
          </button>

          {enteredCount > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-[14px] font-semibold rounded-md transition-colors"
              style={{ color: "var(--grey-600)", border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)" }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={handleSubmitAudit}
            disabled={submitting || enteredCount === 0}
            className="px-5 py-2.5 text-[14px] font-bold text-white transition-colors disabled:opacity-50"
            style={btnPrimary}
          >
            {submitting ? "Submitting..." : `Submit Audit (${enteredCount} items)`}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {submitting && (
        <div className="mb-4 rounded overflow-hidden" style={{ height: "4px", background: "var(--grey-200)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${submitProgress}%`, background: "var(--blue-500)" }}
          />
        </div>
      )}

      {/* Audit Result Banner */}
      {auditResult && (
        <div
          className="mb-6 p-4 rounded-lg flex items-center justify-between"
          style={{ background: "var(--green-bg, #e8f5e9)", border: "1px solid var(--green, #43a047)" }}
        >
          <div>
            <p className="text-[15px] font-bold" style={{ color: "var(--green, #2e7d32)" }}>
              Audit Completed Successfully
            </p>
            <p className="text-[14px] mt-1" style={{ color: "var(--grey-700)" }}>
              {auditResult.adjusted} items adjusted, {auditResult.matched} items matched
              {auditResult.errors.length > 0 && `, ${auditResult.errors.length} errors`}
            </p>
            {auditResult.errors.length > 0 && (
              <ul className="mt-2 text-[13px]" style={{ color: "var(--red, #e53935)" }}>
                {auditResult.errors.map((err, i) => (
                  <li key={i}>- {err}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => setAuditResult(null)}
            className="text-[13px] font-semibold px-3 py-1 rounded"
            style={{ color: "var(--grey-600)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg" style={cardStyle}>
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>
            Total Items
          </p>
          <p className="text-[24px] font-bold mt-1" style={{ color: "var(--grey-900)" }}>
            {items.length}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={cardStyle}>
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>
            Counts Entered
          </p>
          <p className="text-[24px] font-bold mt-1" style={{ color: "var(--blue-500)" }}>
            {enteredCount}
          </p>
        </div>
        <div className="p-4 rounded-lg" style={cardStyle}>
          <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>
            Discrepancies
          </p>
          <p className="text-[24px] font-bold mt-1" style={{ color: discrepancyCount > 0 ? "var(--red, #e53935)" : "var(--green, #43a047)" }}>
            {discrepancyCount}
          </p>
        </div>
      </div>

      {/* Branch Selector */}
      {branches.length > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-3" style={{ ...cardStyle, background: "var(--blue-50)" }}>
          <label className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>
            Branch
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setPhysicalCounts({});
              setAuditResult(null);
            }}
            className="px-3 py-1.5 text-[14px] font-medium"
            style={{ ...inputStyle, minWidth: "200px" }}
          >
            <option value="">All (Global Stock)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code}){b.isMainBranch ? " - Main" : ""}
              </option>
            ))}
          </select>
          {selectedBranchId && (
            <span className="text-[12px] ml-2" style={{ color: "var(--grey-500)" }}>
              System stock shows branch-level quantities
            </span>
          )}
        </div>
      )}

      {/* Barcode Scanner (visible when scan mode is on) */}
      {scanMode && (
        <div className="mb-6 p-4 rounded-lg" style={{ ...cardStyle, border: "2px solid var(--blue-500)", background: "var(--blue-50)" }}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-[14px] font-bold" style={{ color: "var(--blue-500)" }}>
              Barcode Scanner Active
            </span>
            <span className="text-[13px] ml-2" style={{ color: "var(--grey-500)" }}>
              Scan a barcode to find and jump to an item
            </span>
          </div>
          <BarcodeScanner onScan={handleBarcodeScan} placeholder="Scan barcode or type SKU / manufacturer code..." />
        </div>
      )}

      {/* Filters */}
      <div className="p-4 rounded-lg mb-6" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, SKU, packing..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 w-64"
            style={inputStyle}
          />

          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("all");
            }}
            className="px-3 py-2"
            style={inputStyle}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Subcategory */}
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="px-3 py-2"
            style={inputStyle}
          >
            {SUBCATEGORY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Toggle: show only entered */}
          <label className="flex items-center gap-2 text-[14px] cursor-pointer ml-auto" style={{ color: "var(--grey-700)" }}>
            <input
              type="checkbox"
              checked={showOnlyEntered}
              onChange={(e) => setShowOnlyEntered(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--blue-500)" }}
            />
            Show only counted
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-12 text-center">
            <div
              className="w-8 h-8 border-3 rounded-full animate-spin mx-auto"
              style={{ borderColor: "var(--grey-300)", borderTopColor: "var(--blue-500)" }}
            />
            <p className="mt-3 text-[14px]" style={{ color: "var(--grey-500)" }}>Loading inventory...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>
              {showOnlyEntered ? "No counts entered yet. Start counting items above." : "No items found for the selected filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--grey-100)" }}>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    SKU
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    Packing
                  </th>
                  <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    Unit
                  </th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    System Stock
                  </th>
                  <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    Physical Count
                  </th>
                  <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const systemStock = getSystemStock(item);
                  const countStr = physicalCounts[item.id] ?? "";
                  const hasCount = countStr !== "";
                  const physical = hasCount ? parseInt(countStr, 10) : NaN;
                  const diff = hasCount && !isNaN(physical) ? physical - systemStock : null;

                  const isHighlighted = highlightedItemId === item.id;

                  return (
                    <tr
                      key={item.id}
                      ref={(el) => { rowRefs.current[item.id] = el; }}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--grey-200)",
                        background: isHighlighted
                          ? "rgba(255, 235, 59, 0.35)"
                          : hasCount
                            ? diff !== null && diff !== 0
                              ? diff < 0
                                ? "rgba(229,57,53,0.04)"
                                : "rgba(67,160,71,0.04)"
                              : "rgba(33,150,243,0.03)"
                            : "transparent",
                        transition: "background-color 0.5s ease",
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                          {item.name}
                        </span>
                        {item.subcategory && (
                          <span className="block text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                            {item.subcategory}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-mono" style={{ color: "var(--grey-600)" }}>
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-700)" }}>
                        {item.packing || "—"}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-700)" }}>
                        {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>
                          {systemStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="—"
                          value={countStr}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
                          onKeyDown={handleCountKeyDown}
                          data-audit-input
                          className="w-24 px-3 py-1.5 text-center mx-auto block"
                          style={{
                            ...inputStyle,
                            fontWeight: 600,
                            border: hasCount
                              ? diff !== null && diff !== 0
                                ? diff < 0
                                  ? "1.5px solid var(--red, #e53935)"
                                  : "1.5px solid var(--green, #43a047)"
                                : "1.5px solid var(--blue-500)"
                              : inputStyle.border,
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {diff !== null ? (
                          <span
                            className="text-[15px] font-bold"
                            style={{
                              color:
                                diff === 0
                                  ? "var(--grey-500)"
                                  : diff < 0
                                    ? "var(--red, #e53935)"
                                    : "var(--green, #43a047)",
                            }}
                          >
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        ) : (
                          <span className="text-[13px]" style={{ color: "var(--grey-400)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!loading && filteredItems.length > 0 && (
          <div
            className="px-4 py-3 flex items-center justify-between text-[13px]"
            style={{ borderTop: "1px solid var(--grey-200)", color: "var(--grey-500)" }}
          >
            <span>
              Showing {filteredItems.length} of {items.length} items
            </span>
            <span>
              {enteredCount} counted &middot; {discrepancyCount} discrepancies
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
