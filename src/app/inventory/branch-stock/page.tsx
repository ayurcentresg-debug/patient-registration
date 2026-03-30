"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import InventoryTabs from "@/components/InventoryTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

interface ComparisonItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  packing: string | null;
  unit: string;
  reorderLevel: number;
  totalStock: number;
  branchStock: Record<string, number>;
}

interface ComparisonSummary {
  totalItems: number;
  itemsInAllBranches: number;
  itemsInOneBranchOnly: number;
  imbalancedItems: number;
}

interface ComparisonData {
  branches: BranchInfo[];
  items: ComparisonItem[];
  summary: ComparisonSummary;
}

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const inputStyle = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};
const btnPrimary = {
  background: "var(--blue-500)",
  borderRadius: "var(--radius-sm)",
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "medicine", label: "Medicine" },
  { value: "herb", label: "Herb" },
  { value: "oil", label: "Oil (Thailam)" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function BranchStockPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/inventory/branch-comparison?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load branch comparison:", err);
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter for differences only
  const displayItems = data
    ? showDifferencesOnly
      ? data.items.filter((item) => {
          const vals = Object.values(item.branchStock);
          if (vals.length < 2) return false;
          return new Set(vals).size > 1;
        })
      : data.items
    : [];

  // ─── Export CSV ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!data) return;
    const headers = [
      "Item Name",
      "SKU",
      "Packing",
      "Total Stock",
      ...data.branches.map((b) => b.name),
    ];
    const rows = displayItems.map((item) => [
      `"${item.name}"`,
      item.sku,
      item.packing || "",
      item.totalStock,
      ...data.branches.map((b) => item.branchStock[b.id] ?? 0),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branch-stock-comparison-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function isImbalanced(item: ComparisonItem, branches: BranchInfo[]): boolean {
    const vals = branches.map((b) => item.branchStock[b.id] ?? 0);
    const hasZero = vals.some((v) => v === 0);
    const hasStock = vals.some((v) => v > 0);
    return hasZero && hasStock;
  }

  function getTransferLink(item: ComparisonItem, branches: BranchInfo[]): string | null {
    if (branches.length < 2) return null;
    let maxBranch = branches[0];
    let minBranch = branches[0];
    let maxQty = item.branchStock[branches[0].id] ?? 0;
    let minQty = item.branchStock[branches[0].id] ?? 0;
    for (const b of branches) {
      const qty = item.branchStock[b.id] ?? 0;
      if (qty > maxQty) {
        maxQty = qty;
        maxBranch = b;
      }
      if (qty < minQty) {
        minQty = qty;
        minBranch = b;
      }
    }
    if (maxQty === minQty) return null;
    return `/inventory/transfers/new?fromBranch=${maxBranch.id}&toBranch=${minBranch.id}&itemId=${item.id}`;
  }

  function stockCellStyle(
    qty: number | undefined,
    reorderLevel: number,
    hasRecord: boolean
  ): React.CSSProperties {
    if (!hasRecord || qty === undefined) return { color: "var(--grey-400)" };
    if (qty === 0) return { background: "var(--red-50, #FEF2F2)", color: "var(--red-600)" };
    if (qty <= reorderLevel) return { color: "var(--orange-500, #F97316)" };
    return { color: "var(--green-600, #16A34A)" };
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Inventory</h1>
        <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage stock and supplies</p>
      </div>

      <InventoryTabs />

      {/* Sub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-[18px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Branch Stock Comparison
          </h2>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Side-by-side stock levels across all branches
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-[14px] font-semibold"
            style={{
              ...cardStyle,
              color: "var(--grey-700)",
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-[14px] font-semibold"
            style={{
              ...cardStyle,
              color: "var(--grey-700)",
              cursor: "pointer",
            }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Total Items"
            value={data.summary.totalItems}
            color="var(--blue-500)"
          />
          <SummaryCard
            label="In All Branches"
            value={data.summary.itemsInAllBranches}
            color="var(--green)"
          />
          <SummaryCard
            label="Single Branch Only"
            value={data.summary.itemsInOneBranchOnly}
            color="var(--orange)"
          />
          <SummaryCard
            label="Imbalanced"
            value={data.summary.imbalancedItems}
            color="var(--red)"
          />
        </div>
      )}

      {/* Filters */}
      <div
        className="flex flex-col sm:flex-row gap-3 mb-6 p-4 print:hidden"
        style={cardStyle}
      >
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-[15px]"
          style={inputStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 text-[15px] flex-1 min-w-[200px]"
          style={inputStyle}
        />
        <label className="flex items-center gap-2 text-[14px] whitespace-nowrap cursor-pointer select-none"
          style={{ color: "var(--grey-700)" }}
        >
          <input
            type="checkbox"
            checked={showDifferencesOnly}
            onChange={(e) => setShowDifferencesOnly(e.target.checked)}
            className="accent-blue-500 w-4 h-4"
          />
          Show only items with stock differences
        </label>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--blue-500)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Table (desktop) */}
      {!loading && data && (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block overflow-x-auto mb-6"
            style={cardStyle}
          >
            <table className="w-full text-[14px]" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--grey-50)",
                    borderBottom: "2px solid var(--grey-200)",
                  }}
                >
                  <th
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                    style={{ color: "var(--grey-700)", minWidth: 200 }}
                  >
                    Item Name
                  </th>
                  <th
                    className="text-left px-3 py-3 font-semibold whitespace-nowrap"
                    style={{ color: "var(--grey-700)" }}
                  >
                    SKU
                  </th>
                  <th
                    className="text-left px-3 py-3 font-semibold whitespace-nowrap"
                    style={{ color: "var(--grey-700)" }}
                  >
                    Packing
                  </th>
                  <th
                    className="text-right px-3 py-3 font-semibold whitespace-nowrap"
                    style={{ color: "var(--grey-700)" }}
                  >
                    Total Stock
                  </th>
                  {data.branches.map((b) => (
                    <th
                      key={b.id}
                      className="text-right px-3 py-3 font-semibold whitespace-nowrap"
                      style={{ color: "var(--grey-700)", minWidth: 120 }}
                    >
                      {b.name}
                    </th>
                  ))}
                  <th
                    className="text-center px-3 py-3 font-semibold whitespace-nowrap print:hidden"
                    style={{ color: "var(--grey-700)" }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4 + data.branches.length + 1}
                      className="text-center py-12 text-[15px]"
                      style={{ color: "var(--grey-400)" }}
                    >
                      No items found
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item) => {
                    const imbalanced = isImbalanced(item, data.branches);
                    const transferLink = imbalanced
                      ? getTransferLink(item, data.branches)
                      : null;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid var(--grey-200)",
                          background: imbalanced
                            ? "var(--red-50, #FEF2F2)"
                            : "transparent",
                        }}
                      >
                        <td
                          className="px-4 py-3 font-medium"
                          style={{ color: "var(--grey-900)" }}
                        >
                          {item.name}
                        </td>
                        <td
                          className="px-3 py-3"
                          style={{ color: "var(--grey-600)" }}
                        >
                          {item.sku}
                        </td>
                        <td
                          className="px-3 py-3"
                          style={{ color: "var(--grey-600)" }}
                        >
                          {item.packing || "\u2014"}
                        </td>
                        <td
                          className="px-3 py-3 text-right font-semibold"
                          style={{ color: "var(--grey-900)" }}
                        >
                          {item.totalStock}
                        </td>
                        {data.branches.map((b) => {
                          const qty = item.branchStock[b.id];
                          const hasRecord = qty !== undefined && qty !== null;
                          const displayQty = hasRecord ? qty : undefined;
                          return (
                            <td
                              key={b.id}
                              className="px-3 py-3 text-right font-semibold"
                              style={stockCellStyle(
                                displayQty,
                                item.reorderLevel,
                                hasRecord
                              )}
                            >
                              {hasRecord ? qty : "\u2014"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center print:hidden">
                          {transferLink ? (
                            <Link
                              href={transferLink}
                              className="text-[13px] font-semibold"
                              style={{ color: "var(--blue-500)" }}
                            >
                              Transfer
                            </Link>
                          ) : (
                            <span style={{ color: "var(--grey-300)" }}>\u2014</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 mb-6">
            {displayItems.length === 0 ? (
              <div
                className="text-center py-12 text-[15px]"
                style={{ color: "var(--grey-400)", ...cardStyle }}
              >
                No items found
              </div>
            ) : (
              displayItems.map((item) => {
                const imbalanced = isImbalanced(item, data.branches);
                const transferLink = imbalanced
                  ? getTransferLink(item, data.branches)
                  : null;
                return (
                  <div
                    key={item.id}
                    className="p-4"
                    style={{
                      ...cardStyle,
                      background: imbalanced
                        ? "var(--red-50, #FEF2F2)"
                        : "var(--white)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div
                          className="text-[15px] font-semibold"
                          style={{ color: "var(--grey-900)" }}
                        >
                          {item.name}
                        </div>
                        <div
                          className="text-[13px]"
                          style={{ color: "var(--grey-500)" }}
                        >
                          {item.sku}
                          {item.packing ? ` \u00B7 ${item.packing}` : ""}
                        </div>
                      </div>
                      <div
                        className="text-[15px] font-bold"
                        style={{ color: "var(--grey-900)" }}
                      >
                        {item.totalStock}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {data.branches.map((b) => {
                        const qty = item.branchStock[b.id];
                        const hasRecord = qty !== undefined && qty !== null;
                        return (
                          <div
                            key={b.id}
                            className="flex justify-between text-[13px]"
                          >
                            <span style={{ color: "var(--grey-600)" }}>
                              {b.name}
                            </span>
                            <span
                              className="font-semibold"
                              style={stockCellStyle(
                                hasRecord ? qty : undefined,
                                item.reorderLevel,
                                hasRecord
                              )}
                            >
                              {hasRecord ? qty : "\u2014"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {transferLink && (
                      <div className="mt-3 pt-2" style={{ borderTop: "1px solid var(--grey-200)" }}>
                        <Link
                          href={transferLink}
                          className="text-[13px] font-semibold"
                          style={{ color: "var(--blue-500)" }}
                        >
                          Transfer stock to balance
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Result count */}
          <div
            className="text-[13px] text-center pb-4"
            style={{ color: "var(--grey-500)" }}
          >
            Showing {displayItems.length} of {data.summary.totalItems} items
            {data.branches.length > 0 &&
              ` across ${data.branches.length} branch${data.branches.length > 1 ? "es" : ""}`}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="p-4"
      style={{
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="text-[13px] font-medium mb-1" style={{ color: "var(--grey-500)" }}>
        {label}
      </div>
      <div className="text-[26px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
