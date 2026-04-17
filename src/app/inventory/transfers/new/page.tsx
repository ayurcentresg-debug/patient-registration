"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, inputStyle } from "@/lib/styles";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Branch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isMainBranch: boolean;
}

interface BranchStockItem {
  itemId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  sku: string;
  packing: string | null;
  unit: string;
  category: string;
  status: string;
}

interface TransferLineItem {
  tempId: string;
  itemId: string;
  variantId: string | null;
  itemName: string;
  sku: string;
  packing: string | null;
  availableStock: number;
  quantitySent: number;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function NewTransferPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([]);
  const [branchStockLoading, setBranchStockLoading] = useState(false);
  const { showFlash } = useFlash();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<TransferLineItem[]>([]);

  // Item search
  const [itemSearch, setItemSearch] = useState("");

  // Template pre-fill
  const templateId = searchParams.get("templateId");
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fetch active branches
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch branch stock when "From Branch" changes
  const fetchBranchStock = useCallback((branchId: string) => {
    if (!branchId) {
      setBranchStock([]);
      return;
    }
    setBranchStockLoading(true);
    fetch(`/api/branches/stock?branchId=${branchId}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setBranchStock(Array.isArray(data) ? data : []))
      .catch(() => setBranchStock([]))
      .finally(() => setBranchStockLoading(false));
  }, []);

  useEffect(() => {
    // Skip branch stock fetch if template is handling it
    if (templateId && !templateLoaded) return;
    fetchBranchStock(fromBranchId);
    // Clear line items when branch changes since available stock differs
    setLineItems([]);
  }, [fromBranchId, fetchBranchStock, templateId, templateLoaded]);

  // Load template data when templateId is present and branches + branch stock are ready
  useEffect(() => {
    if (!templateId || templateLoaded || branches.length === 0) return;

    fetch(`/api/transfers/templates/${templateId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Template not found");
        return r.json();
      })
      .then((tpl) => {
        setTemplateName(tpl.name);
        setFromBranchId(tpl.fromBranchId);
        setToBranchId(tpl.toBranchId);
        setTemplateLoaded(true);

        // Fetch branch stock for the from branch, then set line items
        fetch(`/api/branches/stock?branchId=${tpl.fromBranchId}`)
          .then((r) => r.ok ? r.json() : [])
          .then((stockData: BranchStockItem[]) => {
            setBranchStock(stockData);
            const stockMap = new Map<string, BranchStockItem>();
            for (const s of stockData) {
              stockMap.set(`${s.itemId}-${s.variantId || ""}`, s);
            }
            const items: TransferLineItem[] = [];
            for (const ti of tpl.items) {
              const stock = stockMap.get(`${ti.itemId}-${ti.variantId || ""}`)
                || stockMap.get(`${ti.itemId}-`);
              items.push({
                tempId: generateTempId(),
                itemId: ti.itemId,
                variantId: ti.variantId || null,
                itemName: ti.item?.name || "Unknown",
                sku: ti.item?.sku || "",
                packing: ti.item?.packing || null,
                availableStock: stock?.quantity || 0,
                quantitySent: ti.quantity,
              });
            }
            setLineItems(items);
          })
          .catch(() => {});
      })
      .catch(() => {
        showFlash({ type: "error", title: "Error", message: "Failed to load template" });
        setTemplateLoaded(true);
      });
  }, [templateId, templateLoaded, branches]);

  // Filter available stock items for the search dropdown
  const filteredStockItems = branchStock.filter((item) => {
    if (!itemSearch) return true;
    const q = itemSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.packing && item.packing.toLowerCase().includes(q))
    );
  }).filter((item) => {
    // Exclude items already added
    return !lineItems.some((li) => li.itemId === item.itemId && li.variantId === item.variantId);
  });

  function addItem(stockItem: BranchStockItem) {
    setLineItems((prev) => [
      ...prev,
      {
        tempId: generateTempId(),
        itemId: stockItem.itemId,
        variantId: stockItem.variantId,
        itemName: stockItem.name,
        sku: stockItem.sku,
        packing: stockItem.packing,
        availableStock: stockItem.quantity,
        quantitySent: 1,
      },
    ]);
    setItemSearch("");
  }

  function removeItem(tempId: string) {
    setLineItems((prev) => prev.filter((li) => li.tempId !== tempId));
  }

  function updateQuantity(tempId: string, qty: number) {
    setLineItems((prev) =>
      prev.map((li) => (li.tempId === tempId ? { ...li, quantitySent: qty } : li))
    );
  }

  // Totals
  const totalQty = lineItems.reduce((sum, li) => sum + li.quantitySent, 0);

  async function handleSubmit() {
    if (!fromBranchId) {
      showFlash({ type: "error", title: "Error", message: "Please select a source branch" });
      return;
    }
    if (!toBranchId) {
      showFlash({ type: "error", title: "Error", message: "Please select a destination branch" });
      return;
    }
    if (fromBranchId === toBranchId) {
      showFlash({ type: "error", title: "Error", message: "Source and destination branches must be different" });
      return;
    }
    if (lineItems.length === 0) {
      showFlash({ type: "error", title: "Error", message: "Please add at least one item" });
      return;
    }

    // Validate quantities
    for (const li of lineItems) {
      if (li.quantitySent <= 0) {
        showFlash({ type: "error", title: "Error", message: `Quantity must be greater than 0 for "${li.itemName}"` });
        return;
      }
      if (li.quantitySent > li.availableStock) {
        showFlash({ type: "error", title: "Error", message: `Quantity exceeds available stock for "${li.itemName}" (available: ${li.availableStock})` });
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId,
          toBranchId,
          notes: notes || undefined,
          initiatedBy: user?.id,
          items: lineItems.map((li) => ({
            itemId: li.itemId,
            variantId: li.variantId || undefined,
            quantitySent: li.quantitySent,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create transfer");
      }

      const data = await res.json();
      showFlash({ type: "success", title: "Success", message: "Transfer created successfully" });
      setTimeout(() => router.push(`/inventory/transfers/${data.id || ""}`), 500);
    } catch (err) {
      showFlash({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Failed to create transfer" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-4 w-32 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  // Branches for "To" dropdown — exclude selected "From" branch
  const toBranches = branches.filter((b) => b.id !== fromBranchId);

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* ── Back Button ──────────────────────────────────────────── */}
      <Link href="/inventory/transfers" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Transfers
      </Link>

      <h1 className="text-[24px] font-bold tracking-tight mb-4" style={{ color: "var(--grey-900)" }}>New Stock Transfer</h1>

      {templateName && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-4" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-200)", borderRadius: "var(--radius-sm)" }}>
          <svg className="w-4 h-4 shrink-0" style={{ color: "var(--blue-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="text-[14px] font-semibold" style={{ color: "var(--blue-700)" }}>Creating from template: {templateName}</span>
        </div>
      )}

      {/* ── Branch Selection ─────────────────────────────────────── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Branch Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>From Branch</label>
            <select
              value={fromBranchId}
              onChange={(e) => {
                setFromBranchId(e.target.value);
                // Reset "To" if it becomes same as "From"
                if (e.target.value === toBranchId) setToBranchId("");
              }}
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            >
              <option value="">Select source branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>To Branch</label>
            <select
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
              disabled={!fromBranchId}
            >
              <option value="">Select destination branch...</option>
              {toBranches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
            {!fromBranchId && (
              <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>Select a source branch first</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Items ────────────────────────────────────────────── */}
      <div className="mb-4" style={cardStyle}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <h3 className="text-[17px] font-semibold" style={{ color: "var(--grey-900)" }}>Items</h3>
          {lineItems.length > 0 && (
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-600)" }}>
              {lineItems.length} item{lineItems.length !== 1 ? "s" : ""} &middot; Total Qty: {totalQty}
            </span>
          )}
        </div>

        {/* Item Search */}
        {fromBranchId && (
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
            <label className="block text-[13px] font-semibold mb-1 uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Search & Add Items</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by item name, SKU, or packing..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-[15px]"
                style={inputStyle}
              />
            </div>

            {branchStockLoading && (
              <p className="text-[14px] mt-2" style={{ color: "var(--grey-500)" }}>Loading branch stock...</p>
            )}

            {!branchStockLoading && branchStock.length === 0 && fromBranchId && (
              <p className="text-[14px] mt-2" style={{ color: "var(--grey-500)" }}>No stock found at this branch.</p>
            )}

            {/* Search results dropdown */}
            {itemSearch && filteredStockItems.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto" style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", background: "var(--white)" }}>
                {filteredStockItems.slice(0, 20).map((item) => (
                  <button
                    key={`${item.itemId}-${item.variantId || "base"}`}
                    onClick={() => addItem(item)}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors duration-100"
                    style={{ borderBottom: "1px solid var(--grey-100)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.name}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                        {item.sku}{item.packing ? ` | ${item.packing}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Stock: {item.quantity}</p>
                      <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{item.unit}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {itemSearch && filteredStockItems.length === 0 && !branchStockLoading && (
              <p className="text-[14px] mt-2" style={{ color: "var(--grey-500)" }}>No matching items found.</p>
            )}
          </div>
        )}

        {!fromBranchId && (
          <div className="text-center py-10">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>Select a source branch to add items.</p>
          </div>
        )}

        {fromBranchId && lineItems.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No items added yet. Search and select items above.</p>
          </div>
        )}

        {lineItems.length > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 100 }}>SKU</th>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 100 }}>Packing</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 120 }}>Available</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 120 }}>Transfer Qty</th>
                    <th className="px-4 py-2.5" style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => (
                    <tr key={li.tempId} style={{ borderBottom: i < lineItems.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                      <td className="px-4 py-3 text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{li.itemName}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{li.sku}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{li.packing || "—"}</td>
                      <td className="px-4 py-3 text-[15px] text-center" style={{ color: "var(--grey-700)" }}>{li.availableStock}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          max={li.availableStock}
                          value={li.quantitySent}
                          onChange={(e) => updateQuantity(li.tempId, parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 text-[15px] text-center"
                          style={{
                            ...inputStyle,
                            borderColor: li.quantitySent > li.availableStock ? "var(--red)" : "var(--grey-400)",
                          }}
                        />
                        {li.quantitySent > li.availableStock && (
                          <p className="text-[12px] mt-0.5 text-center" style={{ color: "var(--red)" }}>Exceeds stock</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeItem(li.tempId)}
                          className="w-7 h-7 flex items-center justify-center transition-colors duration-150"
                          style={{ color: "var(--grey-400)", borderRadius: "var(--radius-sm)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "#fef2f2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--grey-400)"; e.currentTarget.style.background = "transparent"; }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
              {lineItems.map((li) => (
                <div key={li.tempId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{li.itemName}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>{li.sku}{li.packing ? ` | ${li.packing}` : ""}</p>
                    </div>
                    <button onClick={() => removeItem(li.tempId)} className="ml-2 w-7 h-7 flex items-center justify-center" style={{ color: "var(--red)" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Available</label>
                      <p className="text-[15px]" style={{ color: "var(--grey-700)" }}>{li.availableStock}</p>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Transfer Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={li.availableStock}
                        value={li.quantitySent}
                        onChange={(e) => updateQuantity(li.tempId, parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 text-[15px] text-center"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────────────── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this transfer..."
          rows={3}
          className="w-full px-3 py-2 text-[15px] resize-none"
          style={inputStyle}
        />
      </div>

      {/* ── Action Buttons ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Link
          href="/inventory/transfers"
          className="px-5 py-2.5 text-[15px] font-semibold text-center transition-colors duration-150"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 disabled:opacity-50"
          style={btnPrimary}
        >
          {submitting ? "Creating..." : "Create Transfer"}
        </button>
      </div>
    </div>
  );
}

export default function NewTransferPage() {
  return (
    <Suspense fallback={
      <div className="p-6 md:p-8">
        <div className="h-4 w-32 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
      </div>
    }>
      <NewTransferPageInner />
    </Suspense>
  );
}
