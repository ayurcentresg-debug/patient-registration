"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useAuth } from "@/components/AuthProvider";
import { useFlash } from "@/components/FlashCardProvider";
import { cardStyle, inputStyle } from "@/lib/styles";
import { formatDate, formatDateTime } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TransferItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  packing: string | null;
  quantitySent: number;
  quantityReceived: number;
  notes: string | null;
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  status: "draft" | "in_transit" | "received" | "cancelled";
  initiatedBy: string | null;
  initiatedByName?: string | null;
  receivedBy: string | null;
  receivedByName?: string | null;
  notes: string | null;
  transferDate: string;
  receivedDate: string | null;
  createdAt: string;
  updatedAt: string;
  fromBranch: BranchInfo;
  toBranch: BranchInfo;
  items: TransferItem[];
}

// ─── Design Tokens ──────────────────────────────────────────────────────────
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)", color: "white" };

function getStatusStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case "draft": return { bg: "var(--grey-200)", color: "var(--grey-700)" };
    case "in_transit": return { bg: "var(--blue-100)", color: "var(--blue-700)" };
    case "received": return { bg: "#dcfce7", color: "var(--green)" };
    case "cancelled": return { bg: "#fef2f2", color: "var(--red)" };
    default: return { bg: "var(--grey-200)", color: "var(--grey-600)" };
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "Draft";
    case "in_transit": return "In Transit";
    case "received": return "Received";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function getItemStatus(sent: number, received: number): { label: string; color: string } {
  if (received === 0) return { label: "Pending", color: "var(--grey-600)" };
  if (received >= sent) return { label: "Received", color: "var(--green)" };
  return { label: "Partial", color: "#d97706" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const { showFlash } = useFlash();
  const [actionLoading, setActionLoading] = useState(false);
  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; variant: "danger" | "warning" | "default"; onConfirm: () => void }>({ open: false, title: "", message: "", confirmLabel: "Confirm", variant: "default", onConfirm: () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);
  // Receive section
  const [showReceive, setShowReceive] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState<Record<string, string>>({});
  const [scannerActive, setScannerActive] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  // Save as Template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchTransfer = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/transfers/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data) => {
        // Map nested item data to flat structure
        const mapped = {
          ...data,
          initiatedByName: data.initiatedByUser?.name || data.initiatedBy || null,
          receivedByName: data.receivedByUser?.name || data.receivedBy || null,
          items: (data.items || []).map((ti: { id: string; itemId: string; item?: { name?: string; sku?: string; packing?: string | null }; itemName?: string; sku?: string; packing?: string | null; quantitySent: number; quantityReceived: number; notes: string | null }) => ({
            ...ti,
            itemName: ti.item?.name || ti.itemName || "Unknown",
            sku: ti.item?.sku || ti.sku || "",
            packing: ti.item?.packing || ti.packing || null,
          })),
        };
        setTransfer(mapped);
        // Init receive quantities
        const qtys: Record<string, number> = {};
        const notes: Record<string, string> = {};
        (mapped.items || []).forEach((item: TransferItem) => {
          qtys[item.id] = 0;
          notes[item.id] = "";
        });
        setReceiveQtys(qtys);
        setReceiveNotes(notes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchTransfer(); }, [fetchTransfer]);

  // ─── Ship Transfer (draft → in_transit) ───────────────────────────────────
  function handleShipTransfer() {
    setConfirmDialog({
      open: true,
      title: "Ship Transfer",
      message: "Mark this transfer as shipped? Items will be in transit to the destination branch.",
      confirmLabel: "Ship Transfer",
      variant: "default",
      onConfirm: async () => {
        setConfirmLoading(true);
        setActionLoading(true);
        try {
          const res = await fetch(`/api/transfers/${id}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to ship transfer");
          }
          showFlash({ type: "success", title: "Success", message: "Transfer shipped successfully" });
          fetchTransfer();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to ship transfer";
          showFlash({ type: "error", title: "Error", message: msg });
        } finally {
          setActionLoading(false);
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  // ─── Cancel Transfer ──────────────────────────────────────────────────────
  function handleCancelTransfer() {
    setConfirmDialog({
      open: true,
      title: "Cancel Transfer",
      message: "Are you sure you want to cancel this transfer? This action cannot be undone.",
      confirmLabel: "Cancel Transfer",
      variant: "danger",
      onConfirm: async () => {
        setConfirmLoading(true);
        setActionLoading(true);
        try {
          const res = await fetch(`/api/transfers/${id}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel" }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to cancel transfer");
          }
          showFlash({ type: "success", title: "Success", message: "Transfer cancelled" });
          fetchTransfer();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to cancel transfer";
          showFlash({ type: "error", title: "Error", message: msg });
        } finally {
          setActionLoading(false);
          setConfirmLoading(false);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  }

  // ─── Save as Template ──────────────────────────────────────────────────────
  async function handleSaveTemplate() {
    if (!transfer) return;
    if (!templateName.trim()) {
      showFlash({ type: "error", title: "Error", message: "Please enter a template name" });
      return;
    }
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/transfers/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDesc.trim() || undefined,
          fromBranchId: transfer.fromBranchId,
          toBranchId: transfer.toBranchId,
          createdBy: user?.id,
          items: transfer.items.map((item) => ({
            itemId: item.itemId,
            variantId: undefined,
            quantity: item.quantitySent,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save template");
      }
      showFlash({ type: "success", title: "Success", message: `Template saved: ${templateName.trim()}` });
      setShowTemplateModal(false);
      setTemplateName("");
      setTemplateDesc("");
    } catch (e) {
      showFlash({ type: "error", title: "Error", message: e instanceof Error ? e.message : "Failed to save template" });
    } finally {
      setSavingTemplate(false);
    }
  }

  // ─── Barcode Scan Handler ──────────────────────────────────────────────────
  const handleBarcodeScan = useCallback(async (code: string) => {
    if (!transfer) return;

    // First try to match directly against transfer items by SKU or item name
    let matchedItem = transfer.items.find(
      (item) =>
        item.sku?.toLowerCase() === code.toLowerCase() ||
        item.itemName.toLowerCase() === code.toLowerCase()
    );

    // If no direct match, call the lookup API
    if (!matchedItem) {
      try {
        const res = await fetch(`/api/inventory/lookup?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          const lookupData = await res.json();
          // Match the lookup result against transfer items by itemId, SKU, or name
          matchedItem = transfer.items.find(
            (item) =>
              item.itemId === lookupData.id ||
              item.sku?.toLowerCase() === (lookupData.sku || "").toLowerCase() ||
              item.itemName.toLowerCase() === (lookupData.name || "").toLowerCase()
          );
        }
      } catch {
        // Lookup failed, continue with no match
      }
    }

    if (!matchedItem) {
      showFlash({ type: "error", title: "Error", message: `Item not found in this transfer: ${code}` });
      return;
    }

    const remaining = matchedItem.quantitySent - matchedItem.quantityReceived;
    if (remaining <= 0) {
      showFlash({ type: "error", title: "Error", message: `${matchedItem.itemName} is already fully received` });
      return;
    }

    // Auto-set quantity: if already has a value, increment by 1; otherwise set to remaining
    setReceiveQtys((prev) => {
      const current = prev[matchedItem!.id] || 0;
      const newQty = current > 0 ? Math.min(remaining, current + 1) : remaining;
      return { ...prev, [matchedItem!.id]: newQty };
    });

    // Highlight the matched row briefly
    setHighlightedItemId(matchedItem.id);
    setTimeout(() => setHighlightedItemId(null), 1500);

    showFlash({ type: "success", title: "Success", message: `Scanned: ${matchedItem.itemName}` });
  }, [transfer]);

  // ─── Receive Items ────────────────────────────────────────────────────────
  async function handleReceiveItems() {
    setActionLoading(true);
    try {
      const items = Object.entries(receiveQtys)
        .filter(([, qty]) => qty > 0)
        .map(([transferItemId, qty]) => {
          // Map transfer item ID to inventory item ID
          const ti = transfer?.items.find((i) => i.id === transferItemId);
          return {
            itemId: ti?.itemId || transferItemId,
            quantityReceived: qty,
            notes: receiveNotes[transferItemId] || undefined,
          };
        });

      if (items.length === 0) {
        showFlash({ type: "error", title: "Error", message: "Please enter quantities to receive" });
        setActionLoading(false);
        return;
      }

      const res = await fetch(`/api/transfers/${id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, receivedBy: user?.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to receive items");
      }
      showFlash({ type: "success", title: "Success", message: "Items received successfully" });
      setShowReceive(false);
      fetchTransfer();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to receive items";
      showFlash({ type: "error", title: "Error", message: msg });
    } finally {
      setActionLoading(false);
    }
  }

  // ─── Loading Skeleton ─────────────────────────────────────────────────────
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

  if (error || !transfer) {
    return (
      <div className="p-6 md:p-8">
        <Link href="/inventory/transfers" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4" style={{ color: "var(--blue-500)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Transfers
        </Link>
        <div className="text-center py-16">
          <p className="text-[16px] font-semibold" style={{ color: "var(--red)" }}>Failed to load transfer</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>{error}</p>
          <button onClick={fetchTransfer} className="text-[14px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>Retry</button>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(transfer.status);

  return (
    <>
      {/* ── Print Styles ───────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
          button, a[href] { display: none !important; }
        }
      `}</style>

      <div className="p-6 md:p-8 yoda-fade-in print-area">
        {/* ── Back Button ──────────────────────────────────────────── */}
        <Link href="/inventory/transfers" className="inline-flex items-center gap-1 text-[15px] font-semibold hover:underline mb-4 no-print" style={{ color: "var(--blue-500)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Transfers
        </Link>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{transfer.transferNumber}</h1>
            <span className="inline-flex px-2.5 py-0.5 text-[13px] font-bold uppercase tracking-wide" style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color }}>
              {getStatusLabel(transfer.status)}
            </span>
          </div>
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 no-print">
            {transfer.status === "draft" && (
              <>
                <button onClick={handleShipTransfer} disabled={actionLoading} className="px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Ship Transfer
                  </span>
                </button>
                <button onClick={handleCancelTransfer} disabled={actionLoading} className="px-4 py-2 text-[15px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", color: "var(--red)", background: "#fef2f2" }}>Cancel</button>
              </>
            )}
            {transfer.status === "in_transit" && (
              <>
                <button onClick={() => setShowReceive(true)} disabled={actionLoading} className="px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-50" style={btnPrimary}>
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0v10l-8 4m8-14l-8-4-8 4m0 0v10l8 4" /></svg>
                    Receive Items
                  </span>
                </button>
                <button onClick={handleCancelTransfer} disabled={actionLoading} className="px-4 py-2 text-[15px] font-semibold disabled:opacity-50" style={{ borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", color: "var(--red)", background: "#fef2f2" }}>Cancel</button>
              </>
            )}
            {transfer.status === "received" && (
              <button onClick={() => window.print()} className="px-4 py-2 text-[15px] font-semibold" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print
                </span>
              </button>
            )}
            {/* Save as Template — available for any status */}
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 text-[15px] font-semibold"
              style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save as Template
              </span>
            </button>
          </div>
        </div>

        {/* ── Branch Info Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 mb-6 items-stretch">
          {/* From Branch */}
          <div className="p-5" style={cardStyle}>
            <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>From Branch</h3>
            <p className="text-[17px] font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.fromBranch.name}</p>
            <p className="text-[14px] font-mono mt-0.5" style={{ color: "var(--grey-500)" }}>Code: {transfer.fromBranch.code}</p>
            {transfer.fromBranch.address && <p className="text-[15px] mt-2" style={{ color: "var(--grey-600)" }}>{transfer.fromBranch.address}</p>}
            {(transfer.fromBranch.city || transfer.fromBranch.state || transfer.fromBranch.zipCode) && (
              <p className="text-[15px]" style={{ color: "var(--grey-600)" }}>
                {[transfer.fromBranch.city, transfer.fromBranch.state, transfer.fromBranch.zipCode].filter(Boolean).join(", ")}
              </p>
            )}
            {transfer.fromBranch.phone && <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>{transfer.fromBranch.phone}</p>}
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center px-2">
            <svg className="w-8 h-8" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          {/* Mobile Arrow */}
          <div className="flex md:hidden items-center justify-center py-1">
            <svg className="w-6 h-6" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* To Branch */}
          <div className="p-5" style={cardStyle}>
            <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>To Branch</h3>
            <p className="text-[17px] font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.toBranch.name}</p>
            <p className="text-[14px] font-mono mt-0.5" style={{ color: "var(--grey-500)" }}>Code: {transfer.toBranch.code}</p>
            {transfer.toBranch.address && <p className="text-[15px] mt-2" style={{ color: "var(--grey-600)" }}>{transfer.toBranch.address}</p>}
            {(transfer.toBranch.city || transfer.toBranch.state || transfer.toBranch.zipCode) && (
              <p className="text-[15px]" style={{ color: "var(--grey-600)" }}>
                {[transfer.toBranch.city, transfer.toBranch.state, transfer.toBranch.zipCode].filter(Boolean).join(", ")}
              </p>
            )}
            {transfer.toBranch.phone && <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>{transfer.toBranch.phone}</p>}
          </div>
        </div>

        {/* ── Transfer Details ──────────────────────────────────────── */}
        <div className="mb-6 p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--grey-600)" }}>Transfer Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex justify-between sm:justify-start sm:gap-4">
              <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>Transfer Date</span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{formatDate(transfer.transferDate)}</span>
            </div>
            <div className="flex justify-between sm:justify-start sm:gap-4">
              <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>Initiated By</span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.initiatedByName || transfer.initiatedBy || "\u2014"}</span>
            </div>
            <div className="flex justify-between sm:justify-start sm:gap-4">
              <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>Received By</span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.receivedByName || transfer.receivedBy || "\u2014"}</span>
            </div>
            <div className="flex justify-between sm:justify-start sm:gap-4">
              <span className="text-[15px]" style={{ color: "var(--grey-600)" }}>Received Date</span>
              <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.receivedDate ? formatDate(transfer.receivedDate) : "\u2014"}</span>
            </div>
          </div>
          {transfer.notes && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</p>
              <p className="text-[15px]" style={{ color: "var(--grey-700)" }}>{transfer.notes}</p>
            </div>
          )}
        </div>

        {/* ── Items Table ──────────────────────────────────────────── */}
        <div className="mb-6" style={cardStyle}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
            <h3 className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>Transfer Items</h3>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                <tr>
                  <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                  <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>SKU</th>
                  <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Packing</th>
                  <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty Sent</th>
                  <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty Received</th>
                  <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item, i) => {
                  const itemStatus = getItemStatus(item.quantitySent, item.quantityReceived);
                  return (
                    <tr key={item.id} style={{ borderBottom: i < transfer.items.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                      <td className="px-4 py-3">
                        <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                      </td>
                      <td className="px-4 py-3 text-[14px] font-mono" style={{ color: "var(--grey-600)" }}>{item.sku || "\u2014"}</td>
                      <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{item.packing || "\u2014"}</td>
                      <td className="px-4 py-3 text-center text-[15px] font-semibold" style={{ color: "var(--grey-800)" }}>{item.quantitySent}</td>
                      <td className="px-4 py-3 text-center">
                        {transfer.status === "draft" || (transfer.status === "in_transit" && item.quantityReceived === 0) ? (
                          <span className="text-[15px]" style={{ color: "var(--grey-400)" }}>{"\u2014"}</span>
                        ) : (
                          <span className="text-[15px] font-semibold" style={{ color: item.quantityReceived >= item.quantitySent ? "var(--green)" : "var(--grey-800)" }}>
                            {item.quantityReceived}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold" style={{ borderRadius: "var(--radius-sm)", color: itemStatus.color }}>
                          {itemStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
            {transfer.items.map((item) => {
              const itemStatus = getItemStatus(item.quantitySent, item.quantityReceived);
              return (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                      <p className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku || "N/A"}</p>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: itemStatus.color }}>{itemStatus.label}</span>
                  </div>
                  <div className="flex gap-4 text-[14px]" style={{ color: "var(--grey-600)" }}>
                    {item.packing && <span>Pack: {item.packing}</span>}
                    <span>Sent: {item.quantitySent}</span>
                    <span>Received: {item.quantityReceived > 0 || transfer.status === "received" ? item.quantityReceived : "\u2014"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary ──────────────────────────────────────────────── */}
          <div className="px-5 py-4" style={{ borderTop: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
            <div className="flex justify-between text-[15px]">
              <span style={{ color: "var(--grey-600)" }}>Total Items</span>
              <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{transfer.items.length} item(s), {transfer.items.reduce((sum, it) => sum + it.quantitySent, 0)} unit(s)</span>
            </div>
          </div>
        </div>

        {/* ── Receive Items Section (inline, appears when clicked) ─── */}
        {showReceive && transfer.status === "in_transit" && (
          <div className="mb-6" style={cardStyle}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
              <h3 className="text-[16px] font-semibold" style={{ color: "var(--grey-900)" }}>Receive Items</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScannerActive((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold transition-colors no-print"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: scannerActive ? "var(--blue-500)" : "var(--white)",
                    color: scannerActive ? "white" : "var(--blue-500)",
                    border: "1px solid var(--blue-500)",
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  {scannerActive ? "Hide Scanner" : "Barcode Scanner"}
                </button>
                <button onClick={() => setShowReceive(false)} className="w-8 h-8 flex items-center justify-center no-print" style={{ color: "var(--grey-500)" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Barcode Scanner */}
            {scannerActive && (
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)", background: "#f0f7ff" }}>
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  placeholder="Scan barcode or type SKU to auto-fill receiving qty..."
                />
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Item Name</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty Sent</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Already Received</th>
                    <th className="text-center px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Receiving Now</th>
                    <th className="text-left px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transfer.items.map((item, i) => {
                    const remaining = item.quantitySent - item.quantityReceived;
                    const isFullyReceived = remaining <= 0;
                    const isHighlighted = highlightedItemId === item.id;
                    return (
                      <tr key={item.id} style={{
                        borderBottom: i < transfer.items.length - 1 ? "1px solid var(--grey-200)" : "none",
                        background: isHighlighted ? "var(--blue-100)" : isFullyReceived ? "var(--grey-50)" : "var(--white)",
                        opacity: isFullyReceived ? 0.6 : 1,
                        transition: "background 0.3s ease",
                      }}>
                        <td className="px-4 py-3">
                          <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                          <p className="text-[12px] font-mono" style={{ color: "var(--grey-500)" }}>{item.sku || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-[15px]" style={{ color: "var(--grey-800)" }}>{item.quantitySent}</td>
                        <td className="px-4 py-3 text-center text-[15px] font-semibold" style={{ color: item.quantityReceived > 0 ? "var(--green)" : "var(--grey-500)" }}>
                          {item.quantityReceived}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isFullyReceived ? (
                            <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "var(--green)" }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Complete
                            </span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={remaining}
                              value={receiveQtys[item.id] || 0}
                              onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)) }))}
                              className="w-20 px-3 py-1.5 text-[15px] text-center mx-auto block"
                              style={inputStyle}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!isFullyReceived && (
                            <input
                              type="text"
                              placeholder="Optional notes"
                              value={receiveNotes[item.id] || ""}
                              onChange={(e) => setReceiveNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                              className="w-full px-3 py-1.5 text-[14px]"
                              style={inputStyle}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y" style={{ borderColor: "var(--grey-200)" }}>
              {transfer.items.map((item) => {
                const remaining = item.quantitySent - item.quantityReceived;
                const isFullyReceived = remaining <= 0;
                const isHighlightedMobile = highlightedItemId === item.id;
                return (
                  <div key={item.id} className="p-4 space-y-2" style={{ opacity: isFullyReceived ? 0.6 : 1, background: isHighlightedMobile ? "var(--blue-100)" : "transparent", transition: "background 0.3s ease" }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{item.itemName}</p>
                        <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                          Sent: {item.quantitySent} | Received: {item.quantityReceived} | Remaining: {remaining}
                        </p>
                      </div>
                      {isFullyReceived ? (
                        <span className="text-[13px] font-semibold" style={{ color: "var(--green)" }}>Done</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={receiveQtys[item.id] || 0}
                          onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)) }))}
                          className="w-20 px-3 py-1.5 text-[15px] text-center shrink-0"
                          style={inputStyle}
                        />
                      )}
                    </div>
                    {!isFullyReceived && (
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={receiveNotes[item.id] || ""}
                        onChange={(e) => setReceiveNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full px-3 py-1.5 text-[14px]"
                        style={inputStyle}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Confirm Button */}
            <div className="px-5 py-4 flex items-center justify-between no-print" style={{ borderTop: "1px solid var(--grey-200)", background: "var(--grey-50)" }}>
              <p className="text-[14px]" style={{ color: "var(--grey-600)" }}>
                {Object.values(receiveQtys).filter((q) => q > 0).length > 0
                  ? `Receiving ${Object.values(receiveQtys).reduce((sum, q) => sum + q, 0)} units across ${Object.values(receiveQtys).filter((q) => q > 0).length} item(s)`
                  : "Enter quantities to receive"}
              </p>
              <button
                onClick={handleReceiveItems}
                disabled={actionLoading || Object.values(receiveQtys).every((q) => q === 0)}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                style={btnPrimary}
              >
                {actionLoading ? "Receiving..." : "Confirm Receipt"}
              </button>
            </div>
          </div>
        )}

        {/* ── Status Timeline ──────────────────────────────────────── */}
        <div className="mb-6 p-5" style={cardStyle}>
          <h3 className="text-[14px] font-bold uppercase tracking-wider mb-4" style={{ color: "var(--grey-600)" }}>Status Timeline</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
            {/* Step 1: Created */}
            <TimelineStep
              label="Created"
              date={formatDateTime(transfer.createdAt)}
              who={transfer.initiatedByName || transfer.initiatedBy || undefined}
              isActive={true}
              isCompleted={true}
              color="var(--green)"
            />
            <TimelineConnector isActive={transfer.status !== "draft" && transfer.status !== "cancelled"} />

            {/* Step 2: Shipped */}
            <TimelineStep
              label="Shipped"
              date={transfer.status !== "draft" && transfer.status !== "cancelled" ? formatDateTime(transfer.updatedAt) : undefined}
              isActive={transfer.status === "in_transit" || transfer.status === "received"}
              isCompleted={transfer.status === "in_transit" || transfer.status === "received"}
              color="var(--blue-700)"
            />
            <TimelineConnector isActive={transfer.status === "received"} />

            {/* Step 3: Received */}
            <TimelineStep
              label="Received"
              date={transfer.receivedDate ? formatDateTime(transfer.receivedDate) : undefined}
              who={transfer.receivedByName || transfer.receivedBy || undefined}
              isActive={transfer.status === "received"}
              isCompleted={transfer.status === "received"}
              color="var(--green)"
            />

            {/* Cancelled - show instead if cancelled */}
            {transfer.status === "cancelled" && (
              <>
                <TimelineConnector isActive={true} color="var(--red)" />
                <TimelineStep
                  label="Cancelled"
                  date={formatDateTime(transfer.updatedAt)}
                  isActive={true}
                  isCompleted={true}
                  color="var(--red)"
                />
              </>
            )}
          </div>
        </div>

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

        {/* Save as Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowTemplateModal(false)}>
            <div className="w-full max-w-md mx-4 p-6" style={{ background: "var(--white)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[18px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Save as Template</h3>
              <p className="text-[14px] mb-4" style={{ color: "var(--grey-500)" }}>
                Save this transfer&apos;s branches and items as a reusable template.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Weekly Bedok Restock"
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Description</label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Optional description..."
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  />
                </div>
                <div className="text-[13px] px-3 py-2" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }}>
                  {transfer?.fromBranch.name} &rarr; {transfer?.toBranch.name} &middot; {transfer?.items.length} item{(transfer?.items.length || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => { setShowTemplateModal(false); setTemplateName(""); setTemplateDesc(""); }}
                  className="px-4 py-2 text-[15px] font-semibold"
                  style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  className="px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                  style={btnPrimary}
                >
                  {savingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Timeline Components ────────────────────────────────────────────────────
function TimelineStep({ label, date, who, isActive, isCompleted, color }: {
  label: string;
  date?: string;
  who?: string;
  isActive: boolean;
  isCompleted: boolean;
  color: string;
}) {
  return (
    <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-1 py-2 sm:py-0 sm:px-4 min-w-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isCompleted ? color : "var(--grey-200)",
          border: isActive && !isCompleted ? `2px solid ${color}` : "none",
        }}
      >
        {isCompleted ? (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: isActive ? color : "var(--grey-400)" }} />
        )}
      </div>
      <div className="text-left sm:text-center min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: isActive ? "var(--grey-900)" : "var(--grey-400)" }}>{label}</p>
        {date && <p className="text-[12px]" style={{ color: isActive ? "var(--grey-600)" : "var(--grey-400)" }}>{date}</p>}
        {who && <p className="text-[12px]" style={{ color: isActive ? "var(--grey-500)" : "var(--grey-400)" }}>{who}</p>}
        {!date && !isActive && <p className="text-[12px]" style={{ color: "var(--grey-400)" }}>Pending</p>}
      </div>
    </div>
  );
}

function TimelineConnector({ isActive, color }: { isActive: boolean; color?: string }) {
  return (
    <>
      {/* Desktop: horizontal line */}
      <div className="hidden sm:block flex-1 min-w-[40px] h-0.5" style={{ background: isActive ? (color || "var(--green)") : "var(--grey-200)" }} />
      {/* Mobile: vertical line */}
      <div className="sm:hidden w-0.5 h-6 ml-4" style={{ background: isActive ? (color || "var(--green)") : "var(--grey-200)" }} />
    </>
  );
}
