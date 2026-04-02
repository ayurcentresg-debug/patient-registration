"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SectionNote } from "@/components/HelpTip";
import Toast from "@/components/Toast";
import { cardStyle, btnPrimary, inputStyle, chipBase } from "@/lib/styles";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  doctorName: string;
  type: string;
  consultationFee: number;
  therapyFee: number | null;
  treatmentName: string | null;
  packageName: string | null;
  status: string;
}

interface TreatmentOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  duration: number;
}

interface MedicineVariant {
  id: string;
  packing: string;
  unitPrice: number;
  costPrice: number;
  currentStock: number;
  gstPercent: number;
}

interface MedicineResult {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  unit: string;
  packing: string | null;
  gstPercent: number | null;
  variants?: MedicineVariant[];
  _count?: { variants: number };
}

interface BranchOption {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
}

interface InvoiceItem {
  id: string;
  type: "consultation" | "therapy" | "medicine" | "procedure" | "other";
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  gstPercent: number;
  inventoryItemId?: string;
  variantId?: string;
  maxStock?: number;
}

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Insurance", "Bank Transfer"];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  consultation: { bg: "var(--blue-50)", color: "var(--blue-500)" },
  therapy: { bg: "#e8f5e9", color: "var(--green)" },
  medicine: { bg: "#fff3e0", color: "#f57c00" },
  procedure: { bg: "#f3e5f5", color: "#7b1fa2" },
  other: { bg: "var(--grey-200)", color: "var(--grey-600)" },
};

// ─── Utility ────────────────────────────────────────────────────────────────
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function calcItemAmount(item: InvoiceItem): number {
  const base = item.qty * item.unitPrice - item.discount;
  const gst = base * (item.gstPercent / 100);
  return base + gst;
}

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAppointment = searchParams.get("from") === "appointment";

  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Patient selection
  const [patientMode, setPatientMode] = useState<"existing" | "walkin">("existing");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

  // Appointment generation
  const [showAppointmentPicker, setShowAppointmentPicker] = useState(fromAppointment);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Medicine search
  const [showMedicineSearch, setShowMedicineSearch] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineResults, setMedicineResults] = useState<MedicineResult[]>([]);
  const [searchingMedicine, setSearchingMedicine] = useState(false);
  const [variantPickerMed, setVariantPickerMed] = useState<MedicineResult | null>(null);

  // Treatment search
  const [showTreatmentSearch, setShowTreatmentSearch] = useState(false);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [treatmentResults, setTreatmentResults] = useState<TreatmentOption[]>([]);
  const [searchingTreatment, setSearchingTreatment] = useState(false);

  // Branch selection
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Summary
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // ─── Fetch active branches ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then((r) => r.json())
      .then((data: BranchOption[]) => {
        const list = Array.isArray(data) ? data : [];
        setBranches(list);
        // Default to main branch
        const main = list.find((b: BranchOption) => b.isMainBranch);
        if (main) setSelectedBranchId(main.id);
        else if (list.length > 0) setSelectedBranchId(list[0].id);
      })
      .catch(() => setBranches([]));
  }, []);

  // ─── Auto-fill patient from URL params ────────────────────────────────────
  useEffect(() => {
    const pid = searchParams.get("patientId");
    if (!pid) return;
    fetch(`/api/patients/${pid}`)
      .then((r) => { if (r.ok) return r.json(); throw new Error(); })
      .then((p) => {
        if (p && p.id) {
          setSelectedPatient({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone || "",
            email: p.email || null,
            patientIdNumber: p.patientIdNumber || "",
          });
        }
      })
      .catch(() => { /* ignore */ });
  }, [searchParams]);

  // ─── Patient Search ───────────────────────────────────────────────────────
  const searchPatients = useCallback((q: string) => {
    if (!q || q.length < 2) { setPatientResults([]); return; }
    setSearchingPatients(true);
    fetch(`/api/patients?search=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => setPatientResults(Array.isArray(data) ? data : data.patients || []))
      .catch(() => setPatientResults([]))
      .finally(() => setSearchingPatients(false));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, searchPatients]);

  // ─── Load Appointments ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPatient || !showAppointmentPicker) return;
    setLoadingAppointments(true);
    fetch(`/api/appointments?patientId=${selectedPatient.id}&status=completed`)
      .then((r) => r.json())
      .then((data) => {
        const raw = Array.isArray(data) ? data : data.appointments || [];
        setAppointments(raw.map((apt: Record<string, unknown>) => ({
          id: apt.id as string,
          date: apt.date as string,
          time: apt.time as string,
          doctorName: (apt.doctorRef as Record<string, unknown>)?.name as string || apt.doctor as string || "Unknown",
          type: apt.type as string || "consultation",
          consultationFee: ((apt.doctorRef as Record<string, unknown>)?.consultationFee as number) ?? 0,
          therapyFee: (apt.sessionPrice as number) ?? null,
          treatmentName: (apt.treatmentName as string) ?? null,
          packageName: (apt.packageName as string) ?? null,
          status: apt.status as string || "completed",
        })));
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoadingAppointments(false));
  }, [selectedPatient, showAppointmentPicker]);

  // ─── Treatment Search ────────────────────────────────────────────────────
  const searchTreatments = useCallback((q: string) => {
    setSearchingTreatment(true);
    const url = q && q.length >= 2 ? `/api/treatments?active=true&search=${encodeURIComponent(q)}` : `/api/treatments?active=true`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.treatments || [];
        setTreatmentResults(list.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          name: t.name as string,
          category: t.category as string || "therapy",
          basePrice: t.basePrice as number || 0,
          duration: t.duration as number || 50,
        })));
      })
      .catch(() => setTreatmentResults([]))
      .finally(() => setSearchingTreatment(false));
  }, []);

  useEffect(() => {
    if (!showTreatmentSearch) return;
    const timeout = setTimeout(() => searchTreatments(treatmentSearch), 300);
    return () => clearTimeout(timeout);
  }, [treatmentSearch, searchTreatments, showTreatmentSearch]);

  // Load all treatments on first open
  useEffect(() => {
    if (showTreatmentSearch && treatmentResults.length === 0) searchTreatments("");
  }, [showTreatmentSearch, treatmentResults.length, searchTreatments]);

  function addTreatment(t: TreatmentOption) {
    addItem("therapy", `${t.name}`, t.basePrice ?? 0, 0);
    setShowTreatmentSearch(false);
    setTreatmentSearch("");
    setTreatmentResults([]);
  }

  // ─── Medicine Search ──────────────────────────────────────────────────────
  const searchMedicines = useCallback((q: string) => {
    if (!q || q.length < 2) { setMedicineResults([]); return; }
    setSearchingMedicine(true);
    fetch(`/api/inventory?search=${encodeURIComponent(q)}&category=medicine&includeVariants=true`)
      .then((r) => r.json())
      .then((data) => setMedicineResults(Array.isArray(data) ? data : []))
      .catch(() => setMedicineResults([]))
      .finally(() => setSearchingMedicine(false));
  }, []);

  useEffect(() => {
    if (!showMedicineSearch) return;
    const timeout = setTimeout(() => searchMedicines(medicineSearch), 300);
    return () => clearTimeout(timeout);
  }, [medicineSearch, searchMedicines, showMedicineSearch]);

  // ─── Select Appointment ───────────────────────────────────────────────────
  function handleSelectAppointment(apt: Appointment) {
    setSelectedAppointment(apt);
    const newItems: InvoiceItem[] = [];
    if (apt.consultationFee > 0) {
      newItems.push({
        id: generateItemId(),
        type: "consultation",
        description: `Consultation with ${apt.doctorName}`,
        qty: 1,
        unitPrice: apt.consultationFee,
        discount: 0,
        gstPercent: 0,
      });
    }
    if (apt.therapyFee && apt.therapyFee > 0) {
      const desc = apt.treatmentName
        ? `${apt.treatmentName}${apt.packageName ? ` (${apt.packageName})` : ""}`
        : `${apt.type} therapy session`;
      newItems.push({
        id: generateItemId(),
        type: "therapy",
        description: desc,
        qty: 1,
        unitPrice: apt.therapyFee,
        discount: 0,
        gstPercent: 0,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }

  // ─── Add Item Helpers ─────────────────────────────────────────────────────
  function addItem(type: InvoiceItem["type"], description = "", unitPrice = 0, gstPercent = 0, inventoryItemId?: string, maxStock?: number) {
    setItems((prev) => [...prev, {
      id: generateItemId(),
      type,
      description,
      qty: 1,
      unitPrice,
      discount: 0,
      gstPercent,
      inventoryItemId,
      maxStock,
    }]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      // Stock validation for medicines
      if (field === "qty" && updated.maxStock !== undefined && (value as number) > updated.maxStock) {
        return { ...updated, qty: updated.maxStock };
      }
      return updated;
    }));
  }

  function handleMedicineClick(med: MedicineResult) {
    // If medicine has variants, show variant picker
    if (med.variants && med.variants.length > 0) {
      setVariantPickerMed(med);
      return;
    }
    // No variants — add directly
    if (med.currentStock <= 0) {
      setToast({ message: `${med.name} is out of stock`, type: "error" });
      return;
    }
    const packLabel = med.packing ? ` · ${med.packing}` : "";
    addItem("medicine", `${med.name}${packLabel}`, med.unitPrice, med.gstPercent || 0, med.id, med.currentStock);
    setShowMedicineSearch(false);
    setMedicineSearch("");
    setMedicineResults([]);
  }

  function addMedicineVariant(med: MedicineResult, variant: MedicineVariant) {
    if (variant.currentStock <= 0) {
      setToast({ message: `${med.name} (${variant.packing}) is out of stock`, type: "error" });
      return;
    }
    setItems((prev) => [...prev, {
      id: generateItemId(),
      type: "medicine" as const,
      description: `${med.name} · ${variant.packing}`,
      qty: 1,
      unitPrice: variant.unitPrice,
      discount: 0,
      gstPercent: variant.gstPercent || med.gstPercent || 0,
      inventoryItemId: med.id,
      variantId: variant.id,
      maxStock: variant.currentStock,
    }]);
    setVariantPickerMed(null);
    setShowMedicineSearch(false);
    setMedicineSearch("");
    setMedicineResults([]);
  }

  function addMedicineBase(med: MedicineResult) {
    if (med.currentStock <= 0) {
      setToast({ message: `${med.name} (${med.packing}) is out of stock`, type: "error" });
      return;
    }
    const packLabel = med.packing ? ` · ${med.packing}` : "";
    addItem("medicine", `${med.name}${packLabel}`, med.unitPrice, med.gstPercent || 0, med.id, med.currentStock);
    setVariantPickerMed(null);
    setShowMedicineSearch(false);
    setMedicineSearch("");
    setMedicineResults([]);
  }

  // ─── Calculations ─────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice - item.discount), 0);
  const discountAmount = discountMode === "percent"
    ? subtotal * (discountPercent / 100)
    : Math.min(discountFixed, subtotal);
  const effectiveDiscountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
  const afterDiscount = subtotal - discountAmount;
  const gstTotal = items.reduce((sum, item) => {
    const base = item.qty * item.unitPrice - item.discount;
    return sum + base * (item.gstPercent / 100);
  }, 0);
  const adjustedGst = gstTotal * (1 - effectiveDiscountPercent / 100);
  const grandTotal = afterDiscount + adjustedGst;

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) {
      setToast({ message: "Add at least one item to the invoice", type: "error" });
      return;
    }
    if (patientMode === "existing" && !selectedPatient) {
      setToast({ message: "Please select a patient", type: "error" });
      return;
    }
    if (patientMode === "walkin" && !walkInName.trim()) {
      setToast({ message: "Please enter patient name", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        patientId: patientMode === "existing" ? selectedPatient?.id : null,
        patientName: patientMode === "existing" ? `${selectedPatient?.firstName} ${selectedPatient?.lastName}` : walkInName,
        patientPhone: patientMode === "existing" ? selectedPatient?.phone : walkInPhone,
        appointmentId: selectedAppointment?.id || null,
        branchId: selectedBranchId || null,
        items: items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          discount: item.discount,
          gstPercent: item.gstPercent,
          inventoryItemId: item.inventoryItemId || null,
          variantId: item.variantId || null,
        })),
        discountPercent: effectiveDiscountPercent,
        paidAmount: amountPaid,
        paymentMethod,
        notes,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const invoice = await res.json();
      setToast({ message: "Invoice created successfully!", type: "success" });
      setTimeout(() => router.push(`/billing/${invoice.id}`), 1200);
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to create invoice", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-64 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/billing" className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ background: "var(--grey-100)", color: "var(--grey-600)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>New Invoice</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Create a billing invoice</p>
        </div>
      </div>

      <SectionNote type="tip" text="Select a patient (or walk-in), add consultation/medicine/treatment line items, set payment method, and click Create Invoice. The invoice number is generated automatically." />

      {/* ── Branch Selector ────────────────────────────────────── */}
      {branches.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3" style={{ ...cardStyle, background: "var(--grey-50, #f8f9fa)" }}>
          <label className="text-[14px] font-semibold whitespace-nowrap" style={{ color: "var(--grey-700)" }}>
            Billing Branch:
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 text-[14px]"
            style={{ ...inputStyle, minWidth: 180 }}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code}){b.isMainBranch ? " - Main" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column (2/3) ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Patient Selection ────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <p className="mb-4" style={sectionTitle}>Patient</p>

            {/* Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setPatientMode("existing"); setSelectedPatient(null); }}
                className="px-4 py-2 text-[14px] font-semibold transition-all"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: patientMode === "existing" ? "var(--blue-500)" : "var(--grey-100)",
                  color: patientMode === "existing" ? "var(--white)" : "var(--grey-600)",
                }}
              >
                Existing Patient
              </button>
              <button
                onClick={() => { setPatientMode("walkin"); setSelectedPatient(null); }}
                className="px-4 py-2 text-[14px] font-semibold transition-all"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: patientMode === "walkin" ? "var(--blue-500)" : "var(--grey-100)",
                  color: patientMode === "walkin" ? "var(--white)" : "var(--grey-600)",
                }}
              >
                Walk-in
              </button>
            </div>

            {patientMode === "existing" ? (
              <>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3" style={{ background: "var(--blue-50)", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>{selectedPatient.patientIdNumber} &middot; {selectedPatient.phone}</p>
                    </div>
                    <button onClick={() => { setSelectedPatient(null); setPatientSearch(""); }} className="text-[13px] font-semibold" style={{ color: "var(--red)" }}>Change</button>
                  </div>
                ) : (
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search patients by name or ID..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-[15px]"
                      style={inputStyle}
                    />
                    {searchingPatients && <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>Searching...</p>}
                    {patientResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto" style={{ ...cardStyle, boxShadow: "var(--shadow-md)" }}>
                        {patientResults.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientSearch(""); }}
                            className="w-full text-left px-4 py-2.5 text-[15px] transition-colors hover:bg-gray-50"
                            style={{ borderBottom: "1px solid var(--grey-200)" }}
                          >
                            <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{p.firstName} {p.lastName}</span>
                            <span className="ml-2 text-[13px]" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber} &middot; {p.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>Name *</label>
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Patient name"
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>Phone</label>
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* Generate from Appointment toggle */}
            {patientMode === "existing" && selectedPatient && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAppointmentPicker(!showAppointmentPicker)}
                  className="text-[14px] font-semibold inline-flex items-center gap-1.5"
                  style={{ color: "var(--blue-500)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {showAppointmentPicker ? "Hide Appointments" : "Generate from Appointment"}
                </button>

                {showAppointmentPicker && (
                  <div className="mt-3 space-y-2">
                    {loadingAppointments ? (
                      <div className="h-12 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ) : appointments.length === 0 ? (
                      <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No completed appointments found for this patient.</p>
                    ) : (
                      appointments.map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => handleSelectAppointment(apt)}
                          className="w-full text-left p-3 transition-all"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: selectedAppointment?.id === apt.id ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                            background: selectedAppointment?.id === apt.id ? "var(--blue-50)" : "var(--white)",
                          }}
                        >
                          <div className="flex justify-between">
                            <span className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{apt.doctorName}</span>
                            <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>{apt.date} at {apt.time}</span>
                          </div>
                          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
                            {apt.type} &middot; Fee: {"S$"}{(apt.consultationFee ?? 0).toLocaleString("en-SG")}
                            {apt.therapyFee ? ` + Treatment: S$${(apt.therapyFee ?? 0).toLocaleString("en-SG")}` : ""}
                            {apt.treatmentName ? ` (${apt.treatmentName})` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Invoice Items ────────────────────────────────────────── */}
          <div className="p-5" style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <p style={sectionTitle}>Invoice Items</p>
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="inline-flex items-center gap-1.5 text-white px-3 py-1.5 text-[14px] font-semibold"
                  style={btnPrimary}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showAddMenu && (
                  <div className="absolute right-0 mt-1 w-48 z-20 py-1" style={{ ...cardStyle, boxShadow: "var(--shadow-md)" }}>
                    {[
                      { label: "Add Consultation", type: "consultation" as const },
                      { label: "Add Therapy", type: "therapy" as const },
                      { label: "Add Medicine", type: "medicine" as const },
                      { label: "Add Procedure", type: "procedure" as const },
                      { label: "Add Other", type: "other" as const },
                    ].map(({ label, type }) => (
                      <button
                        key={type}
                        onClick={() => {
                          setShowAddMenu(false);
                          if (type === "medicine") {
                            setShowMedicineSearch(true);
                          } else if (type === "therapy") {
                            setShowTreatmentSearch(true);
                          } else {
                            addItem(type, type === "consultation" ? "Doctor Consultation" : "");
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-[15px] transition-colors hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: TYPE_COLORS[type].bg, color: TYPE_COLORS[type].color }}>
                          {type}
                        </span>
                        <span style={{ color: "var(--grey-700)" }}>{label.replace(`Add `, "")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Medicine search modal */}
            {showMedicineSearch && (
              <div className="mb-4 p-4" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>Search Medicine</p>
                  <button onClick={() => { setShowMedicineSearch(false); setMedicineSearch(""); setMedicineResults([]); }} className="text-[13px] font-semibold" style={{ color: "var(--red)" }}>Close</button>
                </div>
                <input
                  type="text"
                  placeholder="Search medicines by name or SKU..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className="w-full px-3 py-2 text-[15px] mb-2"
                  style={inputStyle}
                  autoFocus
                />
                {searchingMedicine && <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Searching...</p>}
                {medicineResults.length > 0 && !variantPickerMed && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {medicineResults.map((med) => {
                      const hasVariants = med.variants && med.variants.length > 0;
                      return (
                        <button
                          key={med.id}
                          onClick={() => handleMedicineClick(med)}
                          className="w-full text-left p-2 text-[14px] transition-colors hover:bg-white flex items-center justify-between"
                          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}
                          disabled={!hasVariants && med.currentStock <= 0}
                        >
                          <div>
                            <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{med.name}</span>
                            {med.packing && <span className="ml-1.5 text-[12px]" style={{ color: "var(--grey-500)" }}>{med.packing}</span>}
                            <span className="ml-1.5 text-[12px]" style={{ color: "var(--grey-400)" }}>{med.sku}</span>
                            {hasVariants && (
                              <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
                                +{med.variants!.length} sizes
                              </span>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="font-semibold" style={{ color: "var(--grey-800)" }}>S${(med.unitPrice ?? 0).toFixed(2)}</span>
                            <span className="ml-2 text-[12px]" style={{ color: med.currentStock <= 0 ? "var(--red)" : "var(--green)" }}>
                              {med.currentStock <= 0 ? "Out of stock" : `${med.currentStock} ${med.unit}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Variant picker */}
                {variantPickerMed && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                        Select size — {variantPickerMed.name}
                      </p>
                      <button onClick={() => setVariantPickerMed(null)} className="text-[12px] font-semibold" style={{ color: "var(--grey-500)" }}>Back</button>
                    </div>
                    {/* Base item as first option */}
                    <button
                      onClick={() => addMedicineBase(variantPickerMed)}
                      className="w-full text-left p-2.5 text-[14px] transition-colors hover:bg-white flex items-center justify-between"
                      style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", background: "var(--white)" }}
                      disabled={variantPickerMed.currentStock <= 0}
                    >
                      <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{variantPickerMed.packing || "Standard"}</span>
                      <div className="text-right">
                        <span className="font-semibold" style={{ color: "var(--grey-800)" }}>S${(variantPickerMed.unitPrice ?? 0).toFixed(2)}</span>
                        <span className="ml-2 text-[12px]" style={{ color: variantPickerMed.currentStock <= 0 ? "var(--red)" : "var(--green)" }}>
                          {variantPickerMed.currentStock <= 0 ? "Out of stock" : `${variantPickerMed.currentStock} ${variantPickerMed.unit}`}
                        </span>
                      </div>
                    </button>
                    {/* Variant options */}
                    {variantPickerMed.variants!.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => addMedicineVariant(variantPickerMed, v)}
                        className="w-full text-left p-2.5 text-[14px] transition-colors hover:bg-white flex items-center justify-between"
                        style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", background: "var(--white)" }}
                        disabled={v.currentStock <= 0}
                      >
                        <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{v.packing}</span>
                        <div className="text-right">
                          <span className="font-semibold" style={{ color: "var(--grey-800)" }}>S${v.unitPrice.toFixed(2)}</span>
                          <span className="ml-2 text-[12px]" style={{ color: v.currentStock <= 0 ? "var(--red)" : "var(--green)" }}>
                            {v.currentStock <= 0 ? "Out of stock" : `${v.currentStock} in stock`}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Treatment search modal */}
            {showTreatmentSearch && (
              <div className="mb-4 p-4" style={{ background: "#e8f5e9", borderRadius: "var(--radius-sm)", border: "1px solid var(--green)" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>Select Treatment</p>
                  <button onClick={() => { setShowTreatmentSearch(false); setTreatmentSearch(""); setTreatmentResults([]); }} className="text-[13px] font-semibold" style={{ color: "var(--red)" }}>Close</button>
                </div>
                <input
                  type="text"
                  placeholder="Search treatments by name..."
                  value={treatmentSearch}
                  onChange={(e) => setTreatmentSearch(e.target.value)}
                  className="w-full px-3 py-2 text-[15px] mb-2"
                  style={inputStyle}
                  autoFocus
                />
                {searchingTreatment && <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>Loading treatments...</p>}
                {treatmentResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {treatmentResults.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => addTreatment(t)}
                        className="w-full text-left p-2.5 text-[14px] transition-colors hover:bg-white flex items-center justify-between"
                        style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)", background: "var(--white)" }}
                      >
                        <div>
                          <span className="font-semibold" style={{ color: "var(--grey-900)" }}>{t.name}</span>
                          <span className="ml-2 text-[12px] uppercase font-bold px-1.5 py-0.5" style={{ background: "#e8f5e9", color: "var(--green)", borderRadius: "var(--radius-sm)" }}>{t.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold" style={{ color: "var(--grey-800)" }}>S${(t.basePrice ?? 0).toFixed(2)}</span>
                          <span className="ml-2 text-[12px]" style={{ color: "var(--grey-500)" }}>{t.duration} min</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {!searchingTreatment && treatmentResults.length === 0 && treatmentSearch.length >= 2 && (
                  <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>No treatments found</p>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                  <svg className="w-6 h-6" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <p className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>No items added yet</p>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>Click &quot;Add Item&quot; to start building the invoice</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--grey-300)" }}>
                        <th className="text-left px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Type</th>
                        <th className="text-left px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Description</th>
                        <th className="text-center px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 60 }}>Qty</th>
                        <th className="text-right px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 90 }}>Unit Price</th>
                        <th className="text-center px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 60 }}>GST %</th>
                        <th className="text-right px-2 py-2 text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)", width: 100 }}>Amount</th>
                        <th className="px-2 py-2" style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const typeStyle = TYPE_COLORS[item.type];
                        const amount = calcItemAmount(item);
                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                            <td className="px-2 py-2">
                              <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: typeStyle.bg, color: typeStyle.color }}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                className="w-full px-2 py-1 text-[14px]"
                                style={{ ...inputStyle, minWidth: 120 }}
                                placeholder="Description"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full px-2 py-1 text-[14px] text-center"
                                style={{ ...inputStyle, width: 60 }}
                                min={1}
                                max={item.maxStock || 9999}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-[14px] text-right"
                                style={{ ...inputStyle, width: 90 }}
                                min={0}
                                step={0.01}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.gstPercent}
                                onChange={(e) => updateItem(item.id, "gstPercent", Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-2 py-1 text-[14px] text-center"
                                style={{ ...inputStyle, width: 60 }}
                                min={0}
                                step={0.5}
                              />
                            </td>
                            <td className="px-2 py-2 text-right text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                              {formatCurrency(amount)}
                            </td>
                            <td className="px-2 py-2">
                              <button onClick={() => removeItem(item.id)} className="w-6 h-6 flex items-center justify-center rounded" style={{ color: "var(--red)" }} aria-label="Remove item">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {items.map((item) => {
                    const typeStyle = TYPE_COLORS[item.type];
                    const amount = calcItemAmount(item);
                    return (
                      <div key={item.id} className="p-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                        <div className="flex items-start justify-between mb-2">
                          <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: typeStyle.bg, color: typeStyle.color }}>{item.type}</span>
                          <button onClick={() => removeItem(item.id)} style={{ color: "var(--red)" }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <input type="text" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="w-full px-2 py-1 text-[14px] mb-2" style={inputStyle} placeholder="Description" />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[9px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Qty</label>
                            <input type="number" value={item.qty} onChange={(e) => updateItem(item.id, "qty", Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1 text-[14px]" style={inputStyle} min={1} />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>Price</label>
                            <input type="number" value={item.unitPrice} onChange={(e) => updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))} className="w-full px-2 py-1 text-[14px]" style={inputStyle} min={0} />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold uppercase" style={{ color: "var(--grey-500)" }}>GST%</label>
                            <input type="number" value={item.gstPercent} onChange={(e) => updateItem(item.id, "gstPercent", Math.max(0, parseFloat(e.target.value) || 0))} className="w-full px-2 py-1 text-[14px]" style={inputStyle} min={0} />
                          </div>
                        </div>
                        <p className="text-right text-[15px] font-semibold mt-2" style={{ color: "var(--grey-900)" }}>{formatCurrency(amount)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right Column (1/3) — Summary ────────────────────────── */}
        <div className="space-y-6">
          {/* Totals */}
          <div className="p-5" style={{ ...cardStyle, position: "sticky" as const, top: 24 }}>
            <p className="mb-4" style={sectionTitle}>Summary</p>

            <div className="space-y-2 text-[15px]">
              <div className="flex justify-between" style={{ color: "var(--grey-700)" }}>
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: "var(--grey-700)" }}>Discount</span>
                  <div className="inline-flex" style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => { setDiscountMode("percent"); setDiscountFixed(0); }}
                      className="px-2 py-0.5 text-[13px] font-semibold"
                      style={{ background: discountMode === "percent" ? "var(--blue-500)" : "var(--white)", color: discountMode === "percent" ? "#fff" : "var(--grey-600)" }}
                    >%</button>
                    <button
                      type="button"
                      onClick={() => { setDiscountMode("amount"); setDiscountPercent(0); }}
                      className="px-2 py-0.5 text-[13px] font-semibold"
                      style={{ background: discountMode === "amount" ? "var(--blue-500)" : "var(--white)", color: discountMode === "amount" ? "#fff" : "var(--grey-600)", borderLeft: "1px solid var(--grey-400)" }}
                    >S$</button>
                  </div>
                  {discountMode === "percent" ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="px-2 py-0.5 text-[14px] text-center"
                        style={{ ...inputStyle, width: 50 }}
                        min={0} max={100} step={0.5}
                      />
                      <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>%</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={discountFixed}
                      onChange={(e) => setDiscountFixed(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="px-2 py-0.5 text-[14px] text-center"
                      style={{ ...inputStyle, width: 80 }}
                      min={0} step={1}
                      placeholder="0.00"
                    />
                  )}
                </div>
                <span className="font-semibold" style={{ color: "var(--red)" }}>-{formatCurrency(discountAmount)}</span>
              </div>

              <div className="flex justify-between" style={{ color: "var(--grey-700)" }}>
                <span>GST Total</span>
                <span className="font-semibold">{formatCurrency(adjustedGst)}</span>
              </div>

              <div className="pt-2 mt-2 flex justify-between" style={{ borderTop: "2px solid var(--grey-300)" }}>
                <span className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Grand Total</span>
                <span className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <p className="text-[14px] font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--grey-600)" }}>Payment</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>Amount Paid (S$)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    min={0}
                    step={0.01}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {grandTotal > 0 && amountPaid > 0 && amountPaid < grandTotal && (
                <p className="text-[13px] font-semibold mt-2" style={{ color: "#f57c00" }}>
                  Balance Due: {formatCurrency(grandTotal - amountPaid)}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-[13px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--grey-600)" }}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-[15px] resize-none"
                style={inputStyle}
                placeholder="Additional notes..."
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-4 px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity duration-150 disabled:opacity-50"
              style={btnPrimary}
            >
              {submitting ? "Creating Invoice..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </div>

      {/* Click-outside to close add menu */}
      {showAddMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
      )}
    </div>
  );
}
