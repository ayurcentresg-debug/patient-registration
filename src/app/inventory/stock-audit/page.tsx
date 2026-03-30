"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  currentStock: number;
  status: string;
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

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "15px" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

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

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
}

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
      console.error("Failed to fetch inventory items:", err);
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

  const discrepancyCount = useMemo(() => {
    let count = 0;
    for (const item of items) {
      const val = physicalCounts[item.id];
      if (val !== undefined && val !== "") {
        const physical = parseInt(val, 10);
        if (!isNaN(physical) && physical !== item.currentStock) {
          count++;
        }
      }
    }
    return count;
  }, [items, physicalCounts]);

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
      alert("No physical counts entered. Please enter at least one count.");
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
        body: JSON.stringify({ items: entries }),
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

        // Clear counts and refresh items
        setPhysicalCounts({});
        fetchItems();
      } else {
        const err = await res.json();
        alert(`Audit failed: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Audit submission error:", err);
      alert("Failed to submit audit. Please try again.");
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

  return (
    <div className="p-6 min-h-screen" style={{ background: "var(--grey-50)" }}>
      <InventoryTabs />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Stock Audit
          </h1>
          <p className="text-[15px] mt-1" style={{ color: "var(--grey-600)" }}>
            Count physical stock and reconcile with system
          </p>
          {lastAuditedAt && (
            <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
              Last audited: {formatDateTime(lastAuditedAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
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
                  const countStr = physicalCounts[item.id] ?? "";
                  const hasCount = countStr !== "";
                  const physical = hasCount ? parseInt(countStr, 10) : NaN;
                  const diff = hasCount && !isNaN(physical) ? physical - item.currentStock : null;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--grey-200)",
                        background: hasCount
                          ? diff !== null && diff !== 0
                            ? diff < 0
                              ? "rgba(229,57,53,0.04)"
                              : "rgba(67,160,71,0.04)"
                            : "rgba(33,150,243,0.03)"
                          : "transparent",
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
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="—"
                          value={countStr}
                          onChange={(e) => handleCountChange(item.id, e.target.value)}
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
