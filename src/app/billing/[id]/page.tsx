"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";
import { cardStyle, inputStyle, chipBase } from "@/lib/styles";
import { formatCurrencyExact as formatCurrency, formatDate } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstPercent: number;
  gstAmount: number;
  amount: number;
  hsnSacCode?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string | null;
  status: string;
  patientName: string;
  patientPhone: string | null;
  patientId: string | null;
  appointmentId: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes: string | null;
  items: InvoiceItem[];
  payments: Payment[];
}

interface ClinicSettings {
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  gstRegistrationNo: string;
  logoUrl?: string;
  termsAndConditions?: string;
}

interface InsuranceClaim {
  id: string;
  claimNumber: string;
  providerName: string;
  status: string;
  claimAmount: number;
  approvedAmount: number | null;
  settledAmount: number | null;
  preAuthNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface InsuranceProvider {
  id: string;
  name: string;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  reason: string;
  amount: number;
  status: string;
  refundMethod?: string | null;
  refundReference?: string | null;
  createdAt: string;
  items?: { itemId: string; description: string; amount: number }[];
}

// ─── Status colors ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft: { bg: "var(--grey-200)", color: "var(--grey-600)" },
  pending: { bg: "#fff3e0", color: "#f57c00" },
  submitted: { bg: "#fff3e0", color: "#f57c00" },
  paid: { bg: "#e8f5e9", color: "var(--green)" },
  approved: { bg: "#e8f5e9", color: "var(--green)" },
  partially_paid: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  under_review: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  cancelled: { bg: "#ffebee", color: "var(--red)" },
  rejected: { bg: "#ffebee", color: "var(--red)" },
  settled: { bg: "#f3e5f5", color: "#7b1fa2" },
  refunded: { bg: "#f3e5f5", color: "#7b1fa2" },
  issued: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  applied: { bg: "#e8f5e9", color: "var(--green)" },
};

// ─── Item type colors ───────────────────────────────────────────────────────
const ITEM_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  consultation: { bg: "#e8f5e9", color: "var(--green)" },
  therapy: { bg: "#f3e5f5", color: "#7b1fa2" },
  medicine: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  procedure: { bg: "#fff3e0", color: "#f57c00" },
  lab: { bg: "#e0f2f1", color: "#00897b" },
  other: { bg: "var(--grey-200)", color: "var(--grey-600)" },
};

// ─── Payment method colors ──────────────────────────────────────────────────
const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  cash: { bg: "#e8f5e9", color: "var(--green)" },
  card: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  upi: { bg: "#f3e5f5", color: "#7b1fa2" },
  insurance: { bg: "#fff3e0", color: "#f57c00" },
  bank_transfer: { bg: "#e0f2f1", color: "#00897b" },
};

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function getStatusStyle(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.draft;
}

function getItemTypeStyle(type: string) {
  return ITEM_TYPE_COLORS[type] || ITEM_TYPE_COLORS.other;
}

function getMethodStyle(method: string) {
  return METHOD_COLORS[method.toLowerCase().replace(/\s+/g, "_")] || { bg: "var(--grey-200)", color: "var(--grey-600)" };
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million"];
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  function convertChunk(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertChunk(n % 100) : "");
  }
  let result = "";
  let scaleIdx = 0;
  let remaining = intPart;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      result = convertChunk(chunk) + (scales[scaleIdx] ? " " + scales[scaleIdx] : "") + (result ? " " + result : "");
    }
    remaining = Math.floor(remaining / 1000);
    scaleIdx++;
  }
  if (decPart > 0) {
    result += " and " + convertChunk(decPart) + " Cents";
  }
  return result.trim() + " Only";
}

// ─── Print Styles ───────────────────────────────────────────────────────────
const printStyles = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
  #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
  #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px 40px; }
  #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px 40px; }
  nav, aside, header, [data-sidebar], .print\\:hidden { display: none !important; }
  @page { margin: 15mm; }
  .watermark { display: block !important; }
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [mounted, setMounted] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Receipt printing
  const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);

  // Insurance claims
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [claimProviderId, setClaimProviderId] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimPreAuth, setClaimPreAuth] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Credit notes
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(false);
  const [showCreditNoteForm, setShowCreditNoteForm] = useState(false);
  const [cnReason, setCnReason] = useState("");
  const [cnSelectedItems, setCnSelectedItems] = useState<Record<string, boolean>>({});
  const [cnItemAmounts, setCnItemAmounts] = useState<Record<string, string>>({});
  const [submittingCreditNote, setSubmittingCreditNote] = useState(false);
  const [refundModal, setRefundModal] = useState<{ creditNoteId: string } | null>(null);
  const [refundMethod, setRefundMethod] = useState("Cash");
  const [refundReference, setRefundReference] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch Clinic Settings ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => { if (r.ok) return r.json(); return null; })
      .then((data) => { if (data) setClinicSettings(data); })
      .catch(() => { /* use fallback */ });
  }, []);

  // ─── Fetch Invoice ──────────────────────────────────────────────────────
  const fetchInvoice = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/invoices/${id}`)
      .then((r) => { if (!r.ok) throw new Error(`Not found (${r.status})`); return r.json(); })
      .then((data) => {
        setInvoice(data);
        setPayAmount(String(data.balanceAmount || ""));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { if (id) fetchInvoice(); }, [id, fetchInvoice]);

  // ─── Fetch Insurance Claims ────────────────────────────────────────────
  const fetchClaims = useCallback(() => {
    setLoadingClaims(true);
    fetch(`/api/insurance/claims?invoiceId=${id}`)
      .then((r) => { if (r.ok) return r.json(); return []; })
      .then((data) => setClaims(Array.isArray(data) ? data : data.claims || []))
      .catch(() => setClaims([]))
      .finally(() => setLoadingClaims(false));
  }, [id]);

  useEffect(() => { if (id) fetchClaims(); }, [id, fetchClaims]);

  // ─── Fetch Credit Notes ────────────────────────────────────────────────
  const fetchCreditNotes = useCallback(() => {
    setLoadingCreditNotes(true);
    fetch(`/api/credit-notes?invoiceId=${id}`)
      .then((r) => { if (r.ok) return r.json(); return []; })
      .then((data) => setCreditNotes(Array.isArray(data) ? data : data.creditNotes || []))
      .catch(() => setCreditNotes([]))
      .finally(() => setLoadingCreditNotes(false));
  }, [id]);

  useEffect(() => { if (id) fetchCreditNotes(); }, [id, fetchCreditNotes]);

  // ─── Record Payment ────────────────────────────────────────────────────
  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setToast({ message: "Enter a valid amount", type: "error" });
      return;
    }
    setSubmittingPayment(true);
    fetch(`/api/invoices/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method: payMethod, reference: payReference || null, notes: payNotes || null }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to record payment"); return r.json(); })
      .then(() => {
        setToast({ message: "Payment recorded successfully", type: "success" });
        setPayReference("");
        setPayNotes("");
        fetchInvoice();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }))
      .finally(() => setSubmittingPayment(false));
  }

  // ─── Cancel Invoice ────────────────────────────────────────────────────
  function handleCancelInvoice() {
    setCancelling(true);
    fetch(`/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to cancel invoice"); return r.json(); })
      .then(() => {
        setToast({ message: "Invoice cancelled", type: "success" });
        setShowCancelConfirm(false);
        fetchInvoice();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }))
      .finally(() => setCancelling(false));
  }

  // ─── Submit Insurance Claim ─────────────────────────────────────────────
  function handleSubmitClaim(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(claimAmount);
    if (!claimProviderId || !amount || amount <= 0) {
      setToast({ message: "Select provider and enter valid amount", type: "error" });
      return;
    }
    setSubmittingClaim(true);
    fetch("/api/insurance/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: id,
        providerId: claimProviderId,
        claimAmount: amount,
        preAuthNumber: claimPreAuth || null,
        notes: claimNotes || null,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to submit claim"); return r.json(); })
      .then(() => {
        setToast({ message: "Insurance claim submitted", type: "success" });
        setShowClaimForm(false);
        setClaimProviderId("");
        setClaimAmount("");
        setClaimPreAuth("");
        setClaimNotes("");
        fetchClaims();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }))
      .finally(() => setSubmittingClaim(false));
  }

  // ─── Update Claim Status ───────────────────────────────────────────────
  function handleClaimStatusChange(claimId: string, newStatus: string) {
    fetch(`/api/insurance/claims/${claimId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to update claim"); return r.json(); })
      .then(() => {
        setToast({ message: `Claim marked as ${formatStatusLabel(newStatus)}`, type: "success" });
        fetchClaims();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }));
  }

  // ─── Issue Credit Note ────────────────────────────────────────────────
  function handleIssueCreditNote(e: React.FormEvent) {
    e.preventDefault();
    const selectedItems = Object.entries(cnSelectedItems)
      .filter(([, v]) => v)
      .map(([itemId]) => ({
        itemId,
        amount: parseFloat(cnItemAmounts[itemId] || "0"),
      }))
      .filter((x) => x.amount > 0);
    if (!cnReason.trim() || selectedItems.length === 0) {
      setToast({ message: "Provide reason and select at least one item", type: "error" });
      return;
    }
    setSubmittingCreditNote(true);
    fetch("/api/credit-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: id,
        reason: cnReason,
        items: selectedItems,
        amount: selectedItems.reduce((s, i) => s + i.amount, 0),
      }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to issue credit note"); return r.json(); })
      .then(() => {
        setToast({ message: "Credit note created", type: "success" });
        setShowCreditNoteForm(false);
        setCnReason("");
        setCnSelectedItems({});
        setCnItemAmounts({});
        fetchCreditNotes();
        fetchInvoice();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }))
      .finally(() => setSubmittingCreditNote(false));
  }

  // ─── Credit Note Status Actions ────────────────────────────────────────
  function handleCreditNoteAction(cnId: string, action: string, extra?: Record<string, string>) {
    fetch(`/api/credit-notes/${cnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    })
      .then((r) => { if (!r.ok) throw new Error("Failed to update credit note"); return r.json(); })
      .then(() => {
        setToast({ message: `Credit note ${action} successful`, type: "success" });
        setRefundModal(null);
        setRefundMethod("Cash");
        setRefundReference("");
        fetchCreditNotes();
        fetchInvoice();
      })
      .catch((e) => setToast({ message: e.message, type: "error" }));
  }

  // ─── Open Claim Form (fetch providers) ─────────────────────────────────
  function openClaimForm() {
    setShowClaimForm(true);
    if (invoice) setClaimAmount(String(invoice.balanceAmount || ""));
    fetch("/api/insurance/providers")
      .then((r) => { if (r.ok) return r.json(); return []; })
      .then((data) => setInsuranceProviders(Array.isArray(data) ? data : data.providers || []))
      .catch(() => setInsuranceProviders([]));
  }

  // ─── Open Credit Note Form ────────────────────────────────────────────
  function openCreditNoteForm() {
    setShowCreditNoteForm(true);
    setCnReason("");
    const sel: Record<string, boolean> = {};
    const amts: Record<string, string> = {};
    if (invoice) {
      invoice.items.forEach((item) => {
        sel[item.id] = false;
        amts[item.id] = String(item.amount);
      });
    }
    setCnSelectedItems(sel);
    setCnItemAmounts(amts);
  }

  // ─── GST Summary computation ──────────────────────────────────────────
  function computeGstSummary(items: InvoiceItem[]) {
    const map: Record<number, { taxable: number; gst: number }> = {};
    items.forEach((item) => {
      const taxable = item.quantity * item.unitPrice - item.discount;
      if (!map[item.gstPercent]) map[item.gstPercent] = { taxable: 0, gst: 0 };
      map[item.gstPercent].taxable += taxable;
      map[item.gstPercent].gst += item.gstAmount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([rate, vals]) => ({ rate: Number(rate), ...vals }));
  }

  // ─── Print receipt handler ────────────────────────────────────────────
  function handlePrintReceipt(paymentId: string) {
    setPrintingReceiptId(paymentId);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintingReceiptId(null), 500);
    }, 100);
  }

  // ─── Clinic info helpers ──────────────────────────────────────────────
  const clinicName = clinicSettings?.clinicName || "Ayur Centre Pte. Ltd.";
  const clinicAddress = clinicSettings?.address || "84 Bedok North Street 4 #01-17, Singapore 460084";
  const clinicPhone = clinicSettings?.phone || "6445 0072";
  const clinicEmail = clinicSettings?.email || "info@ayurvedawellness.in";
  const clinicGst = clinicSettings?.gstRegistrationNo || "";
  const clinicTerms = clinicSettings?.termsAndConditions || "";
  const clinicInitials = clinicName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // ─── Loading skeleton ─────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-48 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 md:p-8">
        <Link href="/billing" className="text-[15px] font-semibold hover:underline mb-4 inline-flex items-center gap-1" style={{ color: "var(--blue-500)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Billing
        </Link>
        <div className="mt-4 px-4 py-3 flex items-center justify-between" style={{ background: "#ffebee", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
          <p className="text-[15px] font-medium">Failed to load invoice: {error}</p>
          <button onClick={fetchInvoice} className="text-[14px] font-semibold underline">Retry</button>
        </div>
      </div>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading || !invoice) {
    return (
      <div className="p-6 md:p-8">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(invoice.status);
  const canCancel = invoice.status === "draft" || invoice.status === "pending";
  const canIssueCreditNote = invoice.status === "paid" || invoice.status === "partially_paid";
  const gstSummary = computeGstSummary(invoice.items);
  const receiptPayment = printingReceiptId ? invoice.payments.find((p) => p.id === printingReceiptId) : null;

  return (
    <>
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-sm mx-4 p-6" style={{ ...cardStyle, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Cancel Invoice?</h3>
            <p className="text-[15px] mb-5" style={{ color: "var(--grey-600)" }}>
              This will mark invoice <strong>{invoice.invoiceNumber}</strong> as cancelled. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
              >
                Keep Invoice
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={cancelling}
                className="px-4 py-2 text-[15px] font-semibold text-white"
                style={{ background: "var(--red)", borderRadius: "var(--radius-sm)", opacity: cancelling ? 0.6 : 1 }}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Receipt Print Area (shown only when printing a receipt) ═══ */}
      {receiptPayment && (
        <div id="receipt-print-area" className="hidden print:block" style={{ fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 500, margin: "0 auto" }}>
            {/* Receipt header */}
            <div className="text-center mb-6" style={{ borderBottom: "2px solid #333", paddingBottom: 12 }}>
              {clinicSettings?.logoUrl ? (
                <img src={clinicSettings.logoUrl} alt="Logo" style={{ height: 48, margin: "0 auto 8px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div style={{ width: 48, height: 48, margin: "0 auto 8px", background: "#2d6a4f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>
                  {clinicInitials}
                </div>
              )}
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>{clinicName}</h1>
              <p style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{clinicAddress}</p>
              <p style={{ fontSize: 11, color: "#666" }}>Phone: {clinicPhone} | Email: {clinicEmail}</p>
              {clinicGst && <p style={{ fontSize: 11, color: "#666" }}>GST Reg: {clinicGst}</p>}
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 2, color: "#111" }}>Payment Receipt</h2>

            <table style={{ width: "100%", fontSize: 13, marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 0", color: "#666" }}>Receipt No:</td>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#111" }}>RCP-{receiptPayment.id.slice(-8).toUpperCase()}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", color: "#666" }}>Date:</td>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#111" }}>{formatDate(receiptPayment.date)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", color: "#666" }}>Received From:</td>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#111" }}>{invoice.patientName}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 0", color: "#666" }}>Against Invoice:</td>
                  <td style={{ padding: "4px 0", fontWeight: 600, color: "#111" }}>{invoice.invoiceNumber}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 16, marginBottom: 16, background: "#f9f9f9" }}>
              <table style={{ width: "100%", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#666" }}>Amount:</td>
                    <td style={{ padding: "4px 0", fontWeight: 700, fontSize: 16, color: "#111", textAlign: "right" }}>{formatCurrency(receiptPayment.amount)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", color: "#666" }}>Method:</td>
                    <td style={{ padding: "4px 0", fontWeight: 600, color: "#111", textAlign: "right" }}>{receiptPayment.method}</td>
                  </tr>
                  {receiptPayment.reference && (
                    <tr>
                      <td style={{ padding: "4px 0", color: "#666" }}>Reference:</td>
                      <td style={{ padding: "4px 0", fontWeight: 600, color: "#111", textAlign: "right" }}>{receiptPayment.reference}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: 12, color: "#444", marginBottom: 24, fontStyle: "italic" }}>
              Amount in words: <strong>{numberToWords(receiptPayment.amount)}</strong>
            </p>

            <div style={{ marginTop: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <p style={{ fontSize: 12, color: "#666" }}>Received with thanks.</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>For {clinicName}</p>
                <div style={{ borderTop: "1px solid #999", width: 180, marginBottom: 4 }} />
                <p style={{ fontSize: 11, color: "#666" }}>Authorized Signature</p>
                <p style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Date: _______________</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 yoda-fade-in">
        {/* ── Back link + Actions ───────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
          <Link href="/billing" className="text-[15px] font-semibold hover:underline inline-flex items-center gap-1" style={{ color: "var(--blue-500)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Billing
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => { setPrintingReceiptId(null); setTimeout(() => window.print(), 50); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold"
              style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print Invoice
            </button>
            {canCancel && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold text-white"
                style={{ background: "var(--red)", borderRadius: "var(--radius-sm)" }}
              >
                Cancel Invoice
              </button>
            )}
          </div>
        </div>

        {/* ═══ PRINT AREA ═══ */}
        <div id="invoice-print-area" style={{ display: printingReceiptId ? "none" : undefined }}>

          {/* ── Print-only clinic header ──────────────────────────────── */}
          <div className="hidden print:block mb-8" style={{ borderBottom: "2px solid var(--grey-900)", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 8 }}>
              {clinicSettings?.logoUrl ? (
                <img src={clinicSettings.logoUrl} alt="Logo" style={{ height: 56 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div style={{ width: 56, height: 56, background: "#2d6a4f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 22, flexShrink: 0 }}>
                  {clinicInitials}
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--grey-900)" }}>{clinicName}</h1>
                <p style={{ fontSize: 12, marginTop: 2, color: "var(--grey-600)" }}>{clinicAddress}</p>
                <p style={{ fontSize: 12, color: "var(--grey-600)" }}>
                  Phone: {clinicPhone} &bull; Email: {clinicEmail}
                </p>
                {clinicGst && (
                  <p style={{ fontSize: 12, color: "var(--grey-600)", fontWeight: 600 }}>GST Reg No: {clinicGst}</p>
                )}
              </div>
            </div>

            {/* PAID / CANCELLED watermark */}
            {(invoice.status === "paid" || invoice.status === "cancelled") && (
              <div
                className="watermark"
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-35deg)",
                  fontSize: 100,
                  fontWeight: 900,
                  color: invoice.status === "paid" ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  textTransform: "uppercase",
                  letterSpacing: 20,
                  pointerEvents: "none",
                  zIndex: 0,
                  display: "none",
                }}
              >
                {invoice.status === "paid" ? "PAID" : "CANCELLED"}
              </div>
            )}
          </div>

          {/* ── Invoice Header ────────────────────────────────────────── */}
          <div className="p-5 mb-4" style={cardStyle}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-[24px] md:text-[28px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
                    {invoice.invoiceNumber}
                  </h1>
                  <span
                    className={chipBase}
                    style={{ borderRadius: "var(--radius-sm)", background: statusStyle.bg, color: statusStyle.color, fontSize: 11 }}
                  >
                    {formatStatusLabel(invoice.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]" style={{ color: "var(--grey-600)" }}>
                  <span>Date: <strong style={{ color: "var(--grey-900)" }}>{formatDate(invoice.date)}</strong></span>
                  {invoice.dueDate && (
                    <span>Due: <strong style={{ color: "var(--grey-900)" }}>{formatDate(invoice.dueDate)}</strong></span>
                  )}
                </div>
              </div>
              <div className="text-[15px]" style={{ color: "var(--grey-600)" }}>
                <p className="font-semibold mb-1" style={{ color: "var(--grey-900)" }}>{invoice.patientName}</p>
                {invoice.patientPhone && <p>Phone: {invoice.patientPhone}</p>}
                {invoice.patientId && <p>Patient ID: {invoice.patientId}</p>}
                {invoice.appointmentId && (
                  <p className="mt-1">
                    <span className="print:hidden">
                      <Link href={`/appointments/${invoice.appointmentId}`} className="font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
                        View Appointment
                      </Link>
                    </span>
                    <span className="hidden print:inline">Appointment: {invoice.appointmentId}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Items Table ───────────────────────────────────────────── */}
          <div className="mb-4 overflow-hidden" style={cardStyle}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
              <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 40 }}>#</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Description</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Type</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider hidden print:table-cell" style={{ color: "var(--grey-600)" }}>HSN/SAC</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Qty</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Unit Price</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Discount</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST %</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST Amt</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => {
                    const typeStyle = getItemTypeStyle(item.type);
                    return (
                      <tr key={item.id} style={{ borderBottom: idx < invoice.items.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-500)" }}>{idx + 1}</td>
                        <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{item.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={chipBase}
                            style={{ borderRadius: "var(--radius-sm)", background: typeStyle.bg, color: typeStyle.color }}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px] hidden print:table-cell" style={{ color: "var(--grey-600)" }}>{item.hsnSacCode || "\u2014"}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-900)" }}>{item.quantity}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-900)" }}>{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: item.discount > 0 ? "var(--red)" : "var(--grey-500)" }}>
                          {item.discount > 0 ? formatCurrency(item.discount) : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>{item.gstPercent}%</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>{formatCurrency(item.gstAmount)}</td>
                        <td className="px-4 py-3 text-[15px] text-right font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(item.amount)}</td>
                      </tr>
                    );
                  })}
                  {invoice.items.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>No items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── GST Summary (print only) ──────────────────────────────── */}
          {gstSummary.length > 0 && (
            <div className="mb-4 overflow-hidden hidden print:block" style={cardStyle}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>GST Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST Rate</th>
                      <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Taxable Amount</th>
                      <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>GST Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstSummary.map((row, idx) => (
                      <tr key={row.rate} style={{ borderBottom: idx < gstSummary.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{row.rate}% GST</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-900)" }}>{formatCurrency(row.taxable)}</td>
                        <td className="px-4 py-3 text-[15px] text-right font-semibold" style={{ color: "var(--grey-900)" }}>{formatCurrency(row.gst)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "2px solid var(--grey-300)" }}>
                      <td className="px-4 py-3 text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>Total</td>
                      <td className="px-4 py-3 text-[15px] text-right font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(gstSummary.reduce((s, r) => s + r.taxable, 0))}</td>
                      <td className="px-4 py-3 text-[15px] text-right font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(gstSummary.reduce((s, r) => s + r.gst, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Totals Section ────────────────────────────────────────── */}
          <div className="mb-4 p-5" style={cardStyle}>
            <div className="flex justify-end">
              <table style={{ minWidth: 320 }}>
                <tbody>
                  <tr>
                    <td className="py-1.5 pr-6 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>Subtotal</td>
                    <td className="py-1.5 text-[15px] text-right font-medium" style={{ color: "var(--grey-900)" }}>{formatCurrency(invoice.subtotal)}</td>
                  </tr>
                  {(invoice.discountPercent > 0 || invoice.discountAmount > 0) && (
                    <tr>
                      <td className="py-1.5 pr-6 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>
                        Discount{invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ""}
                      </td>
                      <td className="py-1.5 text-[15px] text-right font-medium" style={{ color: "var(--red)" }}>
                        -{formatCurrency(invoice.discountAmount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-1.5 pr-6 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>Taxable Amount</td>
                    <td className="py-1.5 text-[15px] text-right font-medium" style={{ color: "var(--grey-900)" }}>{formatCurrency(invoice.taxableAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-6 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>GST</td>
                    <td className="py-1.5 text-[15px] text-right font-medium" style={{ color: "var(--grey-900)" }}>{formatCurrency(invoice.gstAmount)}</td>
                  </tr>
                  <tr style={{ borderTop: "2px solid var(--grey-300)" }}>
                    <td className="py-2.5 pr-6 text-[17px] text-right font-bold" style={{ color: "var(--grey-900)" }}>Grand Total</td>
                    <td className="py-2.5 text-[17px] text-right font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-6 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>Amount Paid</td>
                    <td className="py-1.5 text-[15px] text-right font-medium" style={{ color: "var(--green)" }}>{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                  {invoice.balanceAmount > 0 && (
                    <tr style={{ borderTop: "1px solid var(--grey-200)" }}>
                      <td className="py-2 pr-6 text-[16px] text-right font-bold" style={{ color: "var(--red)" }}>Balance Due</td>
                      <td className="py-2 text-[17px] text-right font-bold" style={{ color: "var(--red)" }}>{formatCurrency(invoice.balanceAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Print-only: Terms & Conditions ────────────────────────── */}
          {clinicTerms && (
            <div className="hidden print:block mb-4 p-5" style={cardStyle}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--grey-900)", marginBottom: 8 }}>Terms &amp; Conditions</h3>
              <p style={{ fontSize: 11, color: "var(--grey-600)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{clinicTerms}</p>
            </div>
          )}

          {/* ── Print-only footer / signature ─────────────────────────── */}
          <div className="hidden print:block mt-12">
            <div className="flex justify-between items-end" style={{ borderTop: "1px solid var(--grey-300)", paddingTop: 24 }}>
              <div>
                <p className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>Thank you for your visit.</p>
                <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>Wishing you good health and wellness.</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: 11, color: "var(--grey-600)", marginBottom: 24 }}>For {clinicName}</p>
                <div style={{ borderTop: "1px solid var(--grey-400)", width: 200, marginBottom: 4 }} />
                <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>Authorized Signature</p>
                <p style={{ fontSize: 10, color: "var(--grey-500)", marginTop: 2 }}>Date: _______________</p>
              </div>
            </div>
          </div>

        </div>
        {/* ═══ END PRINT AREA ═══ */}

        {/* ── Payment History ─────────────────────────────────────────── */}
        <div className="mb-4 overflow-hidden print:hidden" style={cardStyle}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Payment History</h2>
          </div>
          {invoice.payments.length === 0 ? (
            <div className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>No payments recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Amount</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Method</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reference</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Notes</th>
                    <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((pay, idx) => {
                    const mStyle = getMethodStyle(pay.method);
                    return (
                      <tr key={pay.id} style={{ borderBottom: idx < invoice.payments.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-900)" }}>{formatDate(pay.date)}</td>
                        <td className="px-4 py-3 text-[15px] text-right font-semibold" style={{ color: "var(--green)" }}>{formatCurrency(pay.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: mStyle.bg, color: mStyle.color }}>
                            {pay.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{pay.reference || "\u2014"}</td>
                        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{pay.notes || "\u2014"}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handlePrintReceipt(pay.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[13px] font-semibold"
                            style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
                            title="Print Receipt"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Record Payment Form ─────────────────────────────────────── */}
        {invoice.balanceAmount > 0 && invoice.status !== "cancelled" && (
          <div className="mb-4 print:hidden" style={cardStyle}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
              <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Record Payment</h2>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Amount */}
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Amount ({"S$"})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.balanceAmount}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    required
                    placeholder="0.00"
                  />
                </div>
                {/* Method */}
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  >
                    <option>Cash</option>
                    <option>Card</option>
                    <option>UPI</option>
                    <option>Insurance</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
                {/* Reference */}
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Reference</label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="Txn ID, Cheque # etc."
                  />
                </div>
                {/* Notes */}
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold transition-colors duration-150"
                  style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)", opacity: submittingPayment ? 0.6 : 1 }}
                >
                  {submittingPayment ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Recording...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Invoice Notes ───────────────────────────────────────────── */}
        {invoice.notes && (
          <div className="mb-4 p-5 print:hidden" style={cardStyle}>
            <h2 className="text-[17px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Notes</h2>
            <p className="text-[15px]" style={{ color: "var(--grey-600)", whiteSpace: "pre-wrap" }}>{invoice.notes}</p>
          </div>
        )}

        {/* ═══ Insurance Claims Section ═══════════════════════════════════ */}
        <div className="mb-4 overflow-hidden print:hidden" style={cardStyle}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Insurance Claims</h2>
            <button
              onClick={openClaimForm}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold text-white"
              style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Submit Insurance Claim
            </button>
          </div>

          {/* Claim form */}
          {showClaimForm && (
            <form onSubmit={handleSubmitClaim} className="p-5" style={{ borderBottom: "1px solid var(--grey-300)", background: "#fffdf7" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Insurance Provider</label>
                  <select
                    value={claimProviderId}
                    onChange={(e) => setClaimProviderId(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    required
                  >
                    <option value="">Select provider...</option>
                    {insuranceProviders.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Claim Amount (S$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Pre-Auth Number</label>
                  <input
                    type="text"
                    value={claimPreAuth}
                    onChange={(e) => setClaimPreAuth(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Notes</label>
                  <input
                    type="text"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowClaimForm(false)}
                  className="px-4 py-2 text-[15px] font-semibold"
                  style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 text-[15px] font-semibold text-white"
                  style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)", opacity: submittingClaim ? 0.6 : 1 }}
                >
                  {submittingClaim ? "Submitting..." : "Submit Claim"}
                </button>
              </div>
            </form>
          )}

          {/* Claims list */}
          {loadingClaims ? (
            <div className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>Loading claims...</div>
          ) : claims.length === 0 ? (
            <div className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>No insurance claims for this invoice</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Claim #</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Provider</th>
                    <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Claimed</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Approved</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Settled</th>
                    <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, idx) => {
                    const cStyle = getStatusStyle(claim.status);
                    return (
                      <tr key={claim.id} style={{ borderBottom: idx < claims.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{claim.claimNumber}</td>
                        <td className="px-4 py-3 text-[15px]" style={{ color: "var(--grey-900)" }}>{claim.providerName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: cStyle.bg, color: cStyle.color }}>
                            {formatStatusLabel(claim.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-900)" }}>{formatCurrency(claim.claimAmount)}</td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>
                          {claim.approvedAmount != null ? formatCurrency(claim.approvedAmount) : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>
                          {claim.settledAmount != null ? formatCurrency(claim.settledAmount) : "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {claim.status === "submitted" && (
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, "under_review")}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                              >
                                Under Review
                              </button>
                            )}
                            {(claim.status === "submitted" || claim.status === "under_review") && (
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, "approved")}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "var(--green)", borderRadius: "var(--radius-sm)" }}
                              >
                                Approve
                              </button>
                            )}
                            {claim.status === "approved" && (
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, "settled")}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "#7b1fa2", borderRadius: "var(--radius-sm)" }}
                              >
                                Settle
                              </button>
                            )}
                            {(claim.status === "submitted" || claim.status === "under_review") && (
                              <button
                                onClick={() => handleClaimStatusChange(claim.id, "rejected")}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "var(--red)", borderRadius: "var(--radius-sm)" }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══ Credit Notes Section ═══════════════════════════════════════ */}
        <div className="mb-4 overflow-hidden print:hidden" style={cardStyle}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Credit Notes</h2>
            {canIssueCreditNote && (
              <button
                onClick={openCreditNoteForm}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold text-white"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Issue Credit Note
              </button>
            )}
          </div>

          {/* Credit note form */}
          {showCreditNoteForm && (
            <form onSubmit={handleIssueCreditNote} className="p-5" style={{ borderBottom: "1px solid var(--grey-300)", background: "#fffdf7" }}>
              <div className="mb-4">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Reason</label>
                <textarea
                  value={cnReason}
                  onChange={(e) => setCnReason(e.target.value)}
                  className="w-full px-3 py-2"
                  style={{ ...inputStyle, minHeight: 60, resize: "vertical" as const }}
                  required
                  placeholder="Reason for credit note..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-600)" }}>Select Items to Credit</label>
                <div style={{ border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                  <table className="w-full">
                    <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                      <tr>
                        <th className="text-left px-3 py-2 text-[13px] font-bold uppercase" style={{ color: "var(--grey-600)", width: 40 }}></th>
                        <th className="text-left px-3 py-2 text-[13px] font-bold uppercase" style={{ color: "var(--grey-600)" }}>Item</th>
                        <th className="text-right px-3 py-2 text-[13px] font-bold uppercase" style={{ color: "var(--grey-600)" }}>Original</th>
                        <th className="text-right px-3 py-2 text-[13px] font-bold uppercase" style={{ color: "var(--grey-600)", width: 140 }}>Credit Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: idx < invoice.items.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!cnSelectedItems[item.id]}
                              onChange={(e) => setCnSelectedItems({ ...cnSelectedItems, [item.id]: e.target.checked })}
                              style={{ accentColor: "var(--blue-500)" }}
                            />
                          </td>
                          <td className="px-3 py-2 text-[15px]" style={{ color: "var(--grey-900)" }}>{item.description}</td>
                          <td className="px-3 py-2 text-[15px] text-right" style={{ color: "var(--grey-600)" }}>{formatCurrency(item.amount)}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={item.amount}
                              value={cnItemAmounts[item.id] || ""}
                              onChange={(e) => setCnItemAmounts({ ...cnItemAmounts, [item.id]: e.target.value })}
                              className="w-full px-2 py-1 text-right text-[14px]"
                              style={inputStyle}
                              disabled={!cnSelectedItems[item.id]}
                              placeholder="0.00"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                    Total Credit: {formatCurrency(
                      Object.entries(cnSelectedItems)
                        .filter(([, v]) => v)
                        .reduce((s, [itemId]) => s + parseFloat(cnItemAmounts[itemId] || "0"), 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreditNoteForm(false)}
                  className="px-4 py-2 text-[15px] font-semibold"
                  style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreditNote}
                  className="px-4 py-2 text-[15px] font-semibold text-white"
                  style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)", opacity: submittingCreditNote ? 0.6 : 1 }}
                >
                  {submittingCreditNote ? "Creating..." : "Create Credit Note"}
                </button>
              </div>
            </form>
          )}

          {/* Credit notes list */}
          {loadingCreditNotes ? (
            <div className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>Loading credit notes...</div>
          ) : creditNotes.length === 0 ? (
            <div className="px-5 py-8 text-center text-[15px]" style={{ color: "var(--grey-500)" }}>No credit notes for this invoice</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Credit Note #</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reason</th>
                    <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Amount</th>
                    <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                    <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                    <th className="text-center px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((cn, idx) => {
                    const cnStyle = getStatusStyle(cn.status);
                    return (
                      <tr key={cn.id} style={{ borderBottom: idx < creditNotes.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                        <td className="px-4 py-3 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{cn.creditNoteNumber}</td>
                        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cn.reason}</td>
                        <td className="px-4 py-3 text-[15px] text-right font-semibold" style={{ color: "var(--red)" }}>{formatCurrency(cn.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: cnStyle.bg, color: cnStyle.color }}>
                            {formatStatusLabel(cn.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[14px]" style={{ color: "var(--grey-600)" }}>{formatDate(cn.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            {cn.status === "draft" && (
                              <button
                                onClick={() => handleCreditNoteAction(cn.id, "issue")}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                              >
                                Issue
                              </button>
                            )}
                            {cn.status === "issued" && (
                              <button
                                onClick={() => { setRefundModal({ creditNoteId: cn.id }); setRefundMethod("Cash"); setRefundReference(""); }}
                                className="px-2 py-1 text-[12px] font-semibold text-white"
                                style={{ background: "#7b1fa2", borderRadius: "var(--radius-sm)" }}
                              >
                                Apply Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Refund Modal ─────────────────────────────────────────────── */}
        {refundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-sm mx-4 p-6" style={{ ...cardStyle, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <h3 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Apply Refund</h3>
              <div className="mb-4">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Refund Method</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  <option>Cash</option>
                  <option>Card</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div className="mb-5">
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-600)" }}>Reference</label>
                <input
                  type="text"
                  value={refundReference}
                  onChange={(e) => setRefundReference(e.target.value)}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="Refund reference / txn ID"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setRefundModal(null)}
                  className="px-4 py-2 text-[15px] font-semibold"
                  style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-700)", background: "var(--white)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreditNoteAction(refundModal.creditNoteId, "apply_refund", { refundMethod, refundReference })}
                  className="px-4 py-2 text-[15px] font-semibold text-white"
                  style={{ background: "#7b1fa2", borderRadius: "var(--radius-sm)" }}
                >
                  Apply Refund
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
