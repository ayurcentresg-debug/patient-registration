"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

// ─── Types ──────────────────────────────────────────────────────────────────
interface POItem {
  id: string;
  inventoryItemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  gstPercent: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierContact?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  status: "draft" | "submitted" | "partial" | "received" | "cancelled";
  items: POItem[];
  subtotal: number;
  gstTotal: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
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

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 text-[13px] font-semibold text-white yoda-slide-in-right"
      style={{ background: type === "success" ? "var(--green)" : "var(--red)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}
    >
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "default"; onConfirm: () => void }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  useEffect(() => { setMounted(true); }, []);

  const fetchOrder = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/purchase-orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setOrder(data);
        // Init receive quantities
        const qtys: Record<string, number> = {};
        (data.items || []).forEach((item: POItem) => {
          qtys[item.id] = 0;
        });
        setReceiveQtys(qtys);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: `Purchase order ${action === "submit" ? "submitted" : action === "cancel" ? "cancelled" : action === "complete" ? "marked complete" : action + "d"} successfully`, type: "success" });
      fetchOrder();
    } catch {
      setToast({ message: `Failed to ${action} purchase order`, type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  function handleDelete() {
    setConfirmDialog({
      open: true,
      title: "Delete Purchase Order",
      message: "Remove this purchase order? This action cannot be undone.",
      confirmLabel: "Delete Order",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        setActionLoading(true);
        try {
          const res = await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error("Failed");
          setToast({ message: "Purchase order deleted", type: "success" });
          setTimeout(() => router.push("/inventory/purchase-orders"), 500);
        } catch {
          setToast({ message: "Failed to delete purchase order", type: "error" });
        } finally {
          setActionLoading(false);
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  async function handleReceiveItems() {
    setActionLoading(true);
    try {
      const items = Object.entries(receiveQtys)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));

      if (items.length === 0) {
        setToast({ message: "Please enter quantities to receive", type: "error" });
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed");
      setToast({ message: "Items received successfully", type: "success" });
      setShowReceive(false);
      fetchOrder();
    } catch {
      setToast({ message: "Failed to receive items", type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Loading Skeleton ────────────────────────────────────────────────────
  if (!mounted || loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-4 w-32 animate-pulse mb-4" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 md:p-8">
        <Link href="/inventory/purchase-orders" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Purchase Orders
        </Link>
        <div className="text-center py-16">
          <p className="text-[14px] font-semibold" style={{ color: "var(--red)" }}>Failed to load purchase order</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>{error}</p>
          <button onClick={fetchOrder} className="text-[12px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Retry</button>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(order.status);

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Back Button ──────────────────────────────────────────── */}
      <Link href="/inventory/purchase-orders" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Purchase Orders
      </Link>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{order.poNumber}</h1>
          <span className="inline-flex px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
            {order.status}
          </span>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {order.status === "draft" && (
            <>
              <button onClick={() => handleAction("submit")} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>Submit</button>
              <Link href={`/inventory/purchase-orders/${id}/edit`} className="px-4 py-2 text-[13px] font-semibold" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Edit</Link>
              <button onClick={handleDelete} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", color: "var(--red)", background: "#fef2f2" }}>Delete</button>
            </>
          )}
          {order.status === "submitted" && (
            <>
              <button onClick={() => setShowReceive(true)} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>Receive Items</button>
              <button onClick={() => handleAction("cancel")} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", color: "var(--red)", background: "#fef2f2" }}>Cancel</button>
            </>
          )}
          {order.status === "partial" && (
            <>
              <button onClick={() => setShowReceive(true)} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>Receive More</button>
              <button onClick={() => handleAction("complete")} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Mark Complete</button>
            </>
          )}
          {order.status === "received" && (
            <button onClick={() => window.print()} className="px-4 py-2 text-[13px] font-semibold" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Supplier Info + Dates ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Supplier</h3>
          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{order.supplierName}</p>
          {order.supplierContact && <p className="text-[13px] mt-1" style={{ color: "var(--grey-700)" }}>{order.supplierContact}</p>}
          {order.supplierPhone && <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>{order.supplierPhone}</p>}
          {order.supplierEmail && <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>{order.supplierEmail}</p>}
          {order.supplierAddress && <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>{order.supplierAddress}</p>}
        </div>
        <div className="p-5" style={cardStyle}>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Dates</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Order Date</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{formatDate(order.orderDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Expected Date</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{order.expectedDate ? formatDate(order.expectedDate) : "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[13px]" style={{ color: "var(--grey-600)" }}>Received Date</span>
              <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{order.receivedDate ? formatDate(order.receivedDate) : "\u2014"}</span>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</p>
              <p className="text-[13px]" style={{ color: "var(--grey-700)" }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Items Table ──────────────────────────────────────────── */}
      <div className="mb-6" style={cardStyle}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <h3 className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>Order Items</h3>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
              <tr>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty Ordered</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty Received</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Unit Price</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST%</th>
                <th className="text-right px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => {
                const receivePct = item.quantity > 0 ? Math.round((item.receivedQty / item.quantity) * 100) : 0;
                const lineTotal = item.unitPrice * item.quantity;
                const lineGst = lineTotal * (item.gstPercent / 100);
                return (
                  <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku}</td>
                    <td className="px-4 py-3 text-center text-[13px]" style={{ color: "var(--grey-800)" }}>{item.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[13px] font-semibold" style={{ color: receivePct >= 100 ? "var(--green)" : "var(--grey-800)" }}>{item.receivedQty}</span>
                      <div className="w-full h-1.5 mt-1 mx-auto max-w-[80px]" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                        <div style={{
                          width: `${Math.min(100, receivePct)}%`,
                          height: "100%",
                          background: receivePct >= 100 ? "var(--green)" : receivePct > 0 ? "#37845e" : "var(--grey-300)",
                          borderRadius: "var(--radius-pill)",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[13px]" style={{ color: "var(--grey-800)" }}>{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-[12px]" style={{ color: "var(--grey-600)" }}>{item.gstPercent}%</td>
                    <td className="px-4 py-3 text-right text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(lineTotal + lineGst)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
          {order.items.map((item) => {
            const receivePct = item.quantity > 0 ? Math.round((item.receivedQty / item.quantity) * 100) : 0;
            const lineTotal = item.unitPrice * item.quantity;
            const lineGst = lineTotal * (item.gstPercent / 100);
            return (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku}</p>
                  </div>
                  <p className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(lineTotal + lineGst)}</p>
                </div>
                <div className="flex gap-4 text-[12px]" style={{ color: "var(--grey-600)" }}>
                  <span>Ordered: {item.quantity}</span>
                  <span>Received: {item.receivedQty}</span>
                  <span>{formatCurrency(item.unitPrice)} ea</span>
                </div>
                <div className="w-full h-1.5" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-pill)" }}>
                  <div style={{ width: `${Math.min(100, receivePct)}%`, height: "100%", background: receivePct >= 100 ? "var(--green)" : receivePct > 0 ? "#37845e" : "var(--grey-300)", borderRadius: "var(--radius-pill)" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Totals ──────────────────────────────────────────────── */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
          <div className="max-w-xs ml-auto space-y-1.5">
            <div className="flex justify-between text-[13px]" style={{ color: "var(--grey-600)" }}>
              <span>Subtotal</span>
              <span style={{ color: "var(--grey-800)" }}>{formatCurrency(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-[13px]" style={{ color: "var(--grey-600)" }}>
              <span>GST</span>
              <span style={{ color: "var(--grey-800)" }}>{formatCurrency(order.gstTotal || 0)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-bold pt-1.5" style={{ borderTop: "1px solid var(--grey-300)", color: "var(--grey-900)" }}>
              <span>Total</span>
              <span>{formatCurrency(order.totalAmount || 0)}</span>
            </div>
            {order.paidAmount > 0 && (
              <div className="flex justify-between text-[13px]" style={{ color: "var(--green)" }}>
                <span>Paid</span>
                <span>{formatCurrency(order.paidAmount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Receive Items Modal ──────────────────────────────────── */}
      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-lg mx-4 yoda-fade-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-200)" }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Receive Items</h3>
              <button onClick={() => setShowReceive(false)} className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--grey-500)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {order.items.filter((item) => item.receivedQty < item.quantity).map((item) => {
                const remaining = item.quantity - item.receivedQty;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)" }}>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                      <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                        Ordered: {item.quantity} | Received: {item.receivedQty} | Remaining: {remaining}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      value={receiveQtys[item.id] || 0}
                      onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-20 px-3 py-1.5 text-[13px] text-center"
                      style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" }}
                    />
                  </div>
                );
              })}
              {order.items.filter((item) => item.receivedQty < item.quantity).length === 0 && (
                <p className="text-[13px] text-center py-4" style={{ color: "var(--grey-500)" }}>All items have been fully received.</p>
              )}
            </div>
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <button onClick={() => setShowReceive(false)} className="px-4 py-2 text-[13px] font-semibold" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Cancel</button>
              <button onClick={handleReceiveItems} disabled={actionLoading} className="px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>
                {actionLoading ? "Receiving..." : "Confirm Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        loading={confirmLoading}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => { setConfirmDialog(prev => ({ ...prev, open: false })); setConfirmLoading(false); }}
      />
    </div>
  );
}
