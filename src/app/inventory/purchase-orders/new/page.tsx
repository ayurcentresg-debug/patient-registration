"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import { cardStyle, inputStyle } from "@/lib/styles";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  costPrice: number | null;
  currentStock: number;
  reorderLevel: number;
}

interface POLineItem {
  tempId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function formatCurrency(amount: number): string {
  return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preItemId = searchParams.get("itemId");
  const preReorder = searchParams.get("reorder");
  const suggestedItems = searchParams.get("suggestedItems");

  const [mounted, setMounted] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // Fetch suppliers
  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSuppliers(Array.isArray(data) ? data : data.suppliers || []))
      .catch(() => {});
  }, []);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : data.branches || [];
        setBranches(list);
        // Default to main branch
        const main = list.find((b: Branch) => b.isMainBranch);
        if (main) setBranchId(main.id);
      })
      .catch(() => {});
  }, []);

  // Fetch inventory items
  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setInventoryItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Pre-populate with specific item
  useEffect(() => {
    if (preItemId && inventoryItems.length > 0 && lineItems.length === 0) {
      const item = inventoryItems.find((i) => i.id === preItemId);
      if (item) {
        const shortage = Math.max(0, item.reorderLevel - item.currentStock);
        setLineItems([{
          tempId: generateTempId(),
          inventoryItemId: item.id,
          itemName: item.name,
          quantity: shortage > 0 ? shortage : item.reorderLevel,
          unitPrice: item.costPrice || 0,
          gstPercent: 9,
        }]);
      }
    }
  }, [preItemId, inventoryItems, lineItems.length]);

  // Pre-populate with all low stock items
  useEffect(() => {
    if (preReorder === "true" && inventoryItems.length > 0 && lineItems.length === 0) {
      fetch("/api/inventory/alerts")
        .then((r) => r.ok ? r.json() : { lowStock: [] })
        .then((data) => {
          const lowStockItems = data.lowStock || [];
          if (lowStockItems.length > 0) {
            setLineItems(lowStockItems.map((item: InventoryItem & { reorderLevel: number; currentStock: number }) => ({
              tempId: generateTempId(),
              inventoryItemId: item.id,
              itemName: item.name,
              quantity: Math.max(1, item.reorderLevel - item.currentStock),
              unitPrice: item.costPrice || 0,
              gstPercent: 9,
            })));
          }
        })
        .catch(() => {});
    }
  }, [preReorder, inventoryItems, lineItems.length]);

  // Pre-populate with suggested items from Smart PO Suggestions
  useEffect(() => {
    if (suggestedItems && inventoryItems.length > 0 && lineItems.length === 0) {
      const itemIds = suggestedItems.split(",").filter(Boolean);
      if (itemIds.length > 0) {
        // Fetch suggestions to get suggested quantities
        fetch("/api/purchase-orders/suggestions")
          .then((r) => r.ok ? r.json() : { suggestions: [] })
          .then((data) => {
            const suggestionsMap = new Map<string, { suggestedQty: number; costPrice: number }>();
            for (const s of data.suggestions || []) {
              suggestionsMap.set(s.itemId, { suggestedQty: s.suggestedQty, costPrice: s.costPrice });
            }
            const items: POLineItem[] = [];
            for (const id of itemIds) {
              const invItem = inventoryItems.find((i) => i.id === id);
              const suggestion = suggestionsMap.get(id);
              if (invItem) {
                items.push({
                  tempId: generateTempId(),
                  inventoryItemId: invItem.id,
                  itemName: invItem.name,
                  quantity: suggestion?.suggestedQty || Math.max(1, invItem.reorderLevel - invItem.currentStock),
                  unitPrice: suggestion?.costPrice || invItem.costPrice || 0,
                  gstPercent: 9,
                });
              }
            }
            if (items.length > 0) setLineItems(items);
          })
          .catch(() => {
            // Fallback: use inventory data without suggestion quantities
            const items: POLineItem[] = [];
            for (const id of itemIds) {
              const invItem = inventoryItems.find((i) => i.id === id);
              if (invItem) {
                items.push({
                  tempId: generateTempId(),
                  inventoryItemId: invItem.id,
                  itemName: invItem.name,
                  quantity: Math.max(1, invItem.reorderLevel - invItem.currentStock),
                  unitPrice: invItem.costPrice || 0,
                  gstPercent: 9,
                });
              }
            }
            if (items.length > 0) setLineItems(items);
          });
      }
    }
  }, [suggestedItems, inventoryItems, lineItems.length]);

  function addLineItem() {
    setLineItems((prev) => [...prev, {
      tempId: generateTempId(),
      inventoryItemId: "",
      itemName: "",
      quantity: 1,
      unitPrice: 0,
      gstPercent: 9,
    }]);
  }

  function removeLineItem(tempId: string) {
    setLineItems((prev) => prev.filter((li) => li.tempId !== tempId));
  }

  function updateLineItem(tempId: string, field: keyof POLineItem, value: string | number) {
    setLineItems((prev) => prev.map((li) => {
      if (li.tempId !== tempId) return li;
      const updated = { ...li, [field]: value };
      // If inventory item changed, update name and price
      if (field === "inventoryItemId") {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          updated.itemName = item.name;
          updated.unitPrice = item.costPrice || 0;
        }
      }
      return updated;
    }));
  }

  // Totals
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const gstTotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice * (li.gstPercent / 100), 0);
  const grandTotal = subtotal + gstTotal;

  async function handleSubmit(asDraft: boolean) {
    if (!supplierId && !newSupplierName) {
      setToast({ message: "Please select or enter a supplier", type: "error" });
      return;
    }
    if (lineItems.length === 0) {
      setToast({ message: "Please add at least one item", type: "error" });
      return;
    }
    if (lineItems.some((li) => !li.inventoryItemId)) {
      setToast({ message: "Please select an inventory item for each line", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          supplierName: newSupplierName || undefined,
          branchId: branchId || undefined,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          status: asDraft ? "draft" : "submitted",
          items: lineItems.map((li) => ({
            inventoryItemId: li.inventoryItemId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            gstPercent: li.gstPercent,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to create purchase order");
      const data = await res.json();
      setToast({ message: `Purchase order ${asDraft ? "saved as draft" : "submitted"} successfully`, type: "success" });
      setTimeout(() => router.push(`/inventory/purchase-orders/${data.id || ""}`), 500);
    } catch {
      setToast({ message: "Failed to create purchase order", type: "error" });
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

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Back Button ──────────────────────────────────────────── */}
      <Link href="/inventory/purchase-orders" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Purchase Orders
      </Link>

      <h1 className="text-[24px] font-bold tracking-tight mb-6" style={{ color: "var(--grey-900)" }}>New Purchase Order</h1>

      {/* ── Supplier Selection ───────────────────────────────────── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Supplier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Select Existing Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => { setSupplierId(e.target.value); if (e.target.value) setNewSupplierName(""); }}
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            >
              <option value="">Choose supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Or Enter New Supplier Name</label>
            <input
              type="text"
              value={newSupplierName}
              onChange={(e) => { setNewSupplierName(e.target.value); if (e.target.value) setSupplierId(""); }}
              placeholder="New supplier name..."
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Receiving Branch ───────────────────────────────────────── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Receiving Branch</h3>
        <div>
          <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full md:w-1/2 px-3 py-2 text-[15px]"
            style={inputStyle}
          >
            <option value="">Select branch...</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
          </select>
          <p className="text-[13px] mt-1.5" style={{ color: "var(--grey-500)" }}>Stock will be added to this branch when received</p>
        </div>
      </div>

      {/* ── Dates & Notes ────────────────────────────────────────── */}
      <div className="p-5 mb-4" style={cardStyle}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Expected Delivery Date</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full px-3 py-2 text-[15px] resize-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── Line Items ───────────────────────────────────────────── */}
      <div className="mb-4" style={cardStyle}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <h3 className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>Items</h3>
          <button
            onClick={addLineItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white transition-colors duration-150"
            style={btnPrimary}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        </div>

        {lineItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No items added yet. Click &quot;Add Item&quot; to begin.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Inventory Item</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 100 }}>Qty</th>
                    <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 140 }}>Unit Price</th>
                    <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 90 }}>GST%</th>
                    <th className="text-right px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 140 }}>Line Total</th>
                    <th className="px-4 py-2.5" style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, i) => {
                    const lineSubtotal = li.quantity * li.unitPrice;
                    const lineGst = lineSubtotal * (li.gstPercent / 100);
                    const lineTotal = lineSubtotal + lineGst;
                    return (
                      <tr key={li.tempId} style={{ borderBottom: i < lineItems.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3">
                          <select
                            value={li.inventoryItemId}
                            onChange={(e) => updateLineItem(li.tempId, "inventoryItemId", e.target.value)}
                            className="w-full px-2 py-1.5 text-[15px]"
                            style={inputStyle}
                          >
                            <option value="">Select item...</option>
                            {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={1}
                            value={li.quantity}
                            onChange={(e) => updateLineItem(li.tempId, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 text-[15px] text-center"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={li.unitPrice}
                            onChange={(e) => updateLineItem(li.tempId, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-[15px] text-right"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={li.gstPercent}
                            onChange={(e) => updateLineItem(li.tempId, "gstPercent", parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-[15px] text-right"
                            style={inputStyle}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeLineItem(li.tempId)}
                            className="w-7 h-7 flex items-center justify-center transition-colors duration-150"
                            style={{ color: "var(--grey-400)", borderRadius: "var(--radius-sm)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--grey-400)"; e.currentTarget.style.background = "transparent"; }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
              {lineItems.map((li) => {
                const lineSubtotal = li.quantity * li.unitPrice;
                const lineGst = lineSubtotal * (li.gstPercent / 100);
                const lineTotal = lineSubtotal + lineGst;
                return (
                  <div key={li.tempId} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <select
                        value={li.inventoryItemId}
                        onChange={(e) => updateLineItem(li.tempId, "inventoryItemId", e.target.value)}
                        className="flex-1 px-2 py-1.5 text-[15px]"
                        style={inputStyle}
                      >
                        <option value="">Select item...</option>
                        {inventoryItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>)}
                      </select>
                      <button onClick={() => removeLineItem(li.tempId)} className="ml-2 w-7 h-7 flex items-center justify-center" style={{ color: "var(--red)" }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Qty</label>
                        <input type="number" min={1} value={li.quantity} onChange={(e) => updateLineItem(li.tempId, "quantity", parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 text-[15px] text-center" style={inputStyle} />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>Price</label>
                        <input type="number" min={0} step={0.01} value={li.unitPrice} onChange={(e) => updateLineItem(li.tempId, "unitPrice", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 text-[15px] text-right" style={inputStyle} />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold uppercase" style={{ color: "var(--grey-500)" }}>GST%</label>
                        <input type="number" min={0} max={100} value={li.gstPercent} onChange={(e) => updateLineItem(li.tempId, "gstPercent", parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 text-[15px] text-right" style={inputStyle} />
                      </div>
                    </div>
                    <p className="text-right text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>Line Total: {formatCurrency(lineTotal)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Running Totals ─────────────────────────────────────── */}
        {lineItems.length > 0 && (
          <div className="px-5 py-4" style={{ borderTop: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
            <div className="max-w-xs ml-auto space-y-1.5">
              <div className="flex justify-between text-[15px]" style={{ color: "var(--grey-600)" }}>
                <span>Subtotal</span>
                <span style={{ color: "var(--grey-800)" }}>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[15px]" style={{ color: "var(--grey-600)" }}>
                <span>GST</span>
                <span style={{ color: "var(--grey-800)" }}>{formatCurrency(gstTotal)}</span>
              </div>
              <div className="flex justify-between text-[17px] font-bold pt-1.5" style={{ borderTop: "1px solid var(--grey-300)", color: "var(--grey-900)" }}>
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Buttons ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Link
          href="/inventory/purchase-orders"
          className="px-5 py-2.5 text-[15px] font-semibold text-center transition-colors duration-150"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
        >
          Cancel
        </Link>
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="px-5 py-2.5 text-[15px] font-semibold transition-colors duration-150 disabled:opacity-50"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", background: "var(--white)" }}
        >
          {submitting ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="px-5 py-2.5 text-[15px] font-semibold text-white transition-colors duration-150 disabled:opacity-50"
          style={btnPrimary}
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
