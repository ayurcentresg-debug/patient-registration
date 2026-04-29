"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import { useRouter, useSearchParams } from "next/navigation";
import AdminTabs from "@/components/AdminTabs";
import TreatmentTabs from "@/components/TreatmentTabs";
import { cardStyle, inputStyle } from "@/lib/styles";
import { formatCurrency } from "@/lib/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────
interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  patientIdNumber: string;
}

interface LineItem {
  key: number;
  treatmentName: string;
  category: string;
  totalSessions: number;
  sessionPrice: number;
}

interface MilestoneItem {
  key: number;
  title: string;
  description: string;
  targetDate: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

let keyCounter = 0;
function nextKey() {
  return ++keyCounter;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW TREATMENT PLAN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function NewTreatmentPlanPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillPatientId = searchParams?.get("patientId") || "";
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showFlash } = useFlash();

  // ─── Form state ───────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [patientDisplay, setPatientDisplay] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [goals, setGoals] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));

  // ─── Patient search ───────────────────────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientOption[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Line items ───────────────────────────────────────────────────────────
  const [items, setItems] = useState<LineItem[]>([
    { key: nextKey(), treatmentName: "", category: "", totalSessions: 1, sessionPrice: 0 },
  ]);

  // ─── Milestones ───────────────────────────────────────────────────────────
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // Auto-prefill from ?patientId= URL param (deep-link from patient page)
  useEffect(() => {
    if (!prefillPatientId || patientId) return;
    fetch(`/api/patients/${prefillPatientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p?.id) return;
        setPatientId(p.id);
        setPatientDisplay(`${p.firstName} ${p.lastName} (${p.patientIdNumber})`);
      })
      .catch(() => { /* ignore — user can search manually */ });
  }, [prefillPatientId, patientId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Patient search with debounce
  const fetchPatients = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }
    setPatientLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => {
        const arr = data.patients || data;
        setPatientResults(Array.isArray(arr) ? arr : []);
      })
      .catch(() => setPatientResults([]))
      .finally(() => setPatientLoading(false));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchPatients(patientSearch), 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, fetchPatients]);

  // ─── Line item helpers ────────────────────────────────────────────────────
  function updateItem(key: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, [field]: value } : it));
  }

  function addItem() {
    setItems(prev => [...prev, { key: nextKey(), treatmentName: "", category: "", totalSessions: 1, sessionPrice: 0 }]);
  }

  function removeItem(key: number) {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.key !== key) : prev);
  }

  // ─── Milestone helpers ────────────────────────────────────────────────────
  function updateMilestone(key: number, field: keyof MilestoneItem, value: string) {
    setMilestones(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m));
  }

  function addMilestone() {
    setMilestones(prev => [...prev, { key: nextKey(), title: "", description: "", targetDate: "" }]);
  }

  function removeMilestone(key: number) {
    setMilestones(prev => prev.filter(m => m.key !== key));
  }

  // ─── Calculated totals ────────────────────────────────────────────────────
  function itemCost(it: LineItem): number {
    return Math.round(it.totalSessions * it.sessionPrice * 100) / 100;
  }

  const grandTotal = items.reduce((sum, it) => sum + itemCost(it), 0);

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(status: "active" | "draft") {
    if (!name.trim()) { showFlash({ type: "error", title: "Error", message: "Plan name is required" }); return; }
    if (!patientId) { showFlash({ type: "error", title: "Error", message: "Please select a patient" }); return; }
    if (!doctorName.trim()) { showFlash({ type: "error", title: "Error", message: "Doctor name is required" }); return; }

    const validItems = items.filter(it => it.treatmentName.trim());
    if (validItems.length === 0) { showFlash({ type: "error", title: "Error", message: "Add at least one treatment item" }); return; }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        patientId,
        doctorName: doctorName.trim(),
        diagnosis: diagnosis.trim() || undefined,
        goals: goals.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        status,
        items: validItems.map(it => ({
          treatmentName: it.treatmentName.trim(),
          category: it.category.trim() || undefined,
          frequency: "as_needed",
          totalSessions: Number(it.totalSessions),
          sessionPrice: Number(it.sessionPrice),
        })),
        milestones: milestones.filter(m => m.title.trim()).map(m => ({
          title: m.title.trim(),
          description: m.description.trim() || undefined,
          targetDate: m.targetDate ? new Date(m.targetDate).toISOString() : undefined,
        })),
      };

      const res = await fetch("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create plan");
      }

      showFlash({ type: "success", title: "Success", message: status === "draft" ? "Draft saved successfully" : "Treatment plan created" });
      setTimeout(() => router.push("/admin/treatments/plans"), 600);
    } catch (err) {
      showFlash({ type: "error", title: "Error", message: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>New Treatment Plan</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            Create a new treatment program for a patient
          </p>
        </div>
        <button onClick={() => router.push("/admin/treatments/plans")} className="inline-flex items-center gap-2 px-4 py-2 text-[15px] font-semibold rounded" style={{ ...inputStyle, color: "var(--grey-700)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Plans
        </button>
      </div>

      <AdminTabs />
      <TreatmentTabs />

      {/* ─── Plan Details Card ──────────────────────────────────────────────── */}
      <div className="mb-6 p-5" style={cardStyle}>
        <h2 className="text-[17px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Plan Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Name */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Plan Name <span style={{ color: "var(--red)" }}>*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Physiotherapy Recovery Plan" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
          </div>

          {/* Patient (searchable dropdown) */}
          <div ref={dropdownRef} className="relative">
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Patient <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              type="text"
              value={patientId ? patientDisplay : patientSearch}
              onChange={e => {
                setPatientId("");
                setPatientDisplay("");
                setPatientSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => { if (patientSearch.length >= 2) setShowDropdown(true); }}
              placeholder="Search by name or ID..."
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            />
            {patientId && (
              <button onClick={() => { setPatientId(""); setPatientDisplay(""); setPatientSearch(""); }} className="absolute right-2 top-[30px] text-[14px]" style={{ color: "var(--grey-500)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
            {showDropdown && !patientId && (
              <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto" style={{ ...cardStyle, boxShadow: "0 4px 12px rgba(0,0,0,.12)" }}>
                {patientLoading ? (
                  <div className="px-3 py-2 text-[14px]" style={{ color: "var(--grey-500)" }}>Searching...</div>
                ) : patientResults.length === 0 ? (
                  <div className="px-3 py-2 text-[14px]" style={{ color: "var(--grey-500)" }}>{patientSearch.length < 2 ? "Type at least 2 characters" : "No patients found"}</div>
                ) : (
                  patientResults.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-[15px] hover:bg-gray-50 transition-colors"
                      style={{ color: "var(--grey-900)" }}
                      onClick={() => {
                        setPatientId(p.id);
                        setPatientDisplay(`${p.firstName} ${p.lastName} (${p.patientIdNumber})`);
                        setPatientSearch("");
                        setShowDropdown(false);
                      }}
                    >
                      <span className="font-semibold">{p.firstName} {p.lastName}</span>
                      <span className="ml-2 text-[13px]" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Doctor Name */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Doctor Name <span style={{ color: "var(--red)" }}>*</span></label>
            <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. ..." className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
          </div>

          {/* Diagnosis (full width) */}
          <div className="md:col-span-2">
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Diagnosis</label>
            <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Primary diagnosis or condition" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
          </div>

          {/* Goals (full width, textarea) */}
          <div className="md:col-span-2">
            <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Goals</label>
            <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={3} placeholder="Treatment goals and expected outcomes..." className="w-full px-3 py-2 text-[15px] resize-y" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ─── Treatment Items Card ───────────────────────────────────────────── */}
      <div className="mb-6 p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Treatment Items</h2>
          <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold rounded text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        </div>

        {/* Header row */}
        <div className="hidden md:grid md:grid-cols-12 gap-2 mb-2 px-1">
          {["Treatment Name *", "Category", "Sessions", "Price/Session", "Total", ""].map((h, i) => (
            <div key={h || i} className={`text-[13px] font-semibold uppercase tracking-wider ${i === 0 ? "col-span-3" : i === 1 ? "col-span-3" : i === 4 ? "col-span-2" : "col-span-1"}`} style={{ color: "var(--grey-600)" }}>
              {h}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-3 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)" }}>
              {/* Treatment Name */}
              <div className="md:col-span-3">
                <label className="md:hidden text-[13px] font-semibold mb-0.5 block" style={{ color: "var(--grey-600)" }}>Treatment Name</label>
                <input type="text" value={item.treatmentName} onChange={e => updateItem(item.key, "treatmentName", e.target.value)} placeholder="Treatment name" className="w-full px-2 py-1.5 text-[15px]" style={inputStyle} />
              </div>
              {/* Category */}
              <div className="md:col-span-3">
                <label className="md:hidden text-[13px] font-semibold mb-0.5 block" style={{ color: "var(--grey-600)" }}>Category</label>
                <input type="text" value={item.category} onChange={e => updateItem(item.key, "category", e.target.value)} placeholder="e.g. Physical Therapy" className="w-full px-2 py-1.5 text-[15px]" style={inputStyle} />
              </div>
              {/* Sessions */}
              <div className="md:col-span-1">
                <label className="md:hidden text-[13px] font-semibold mb-0.5 block" style={{ color: "var(--grey-600)" }}>Sessions</label>
                <input type="number" min={1} value={item.totalSessions} onChange={e => updateItem(item.key, "totalSessions", Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-2 py-1.5 text-[15px] text-center" style={inputStyle} />
              </div>
              {/* Price per Session */}
              <div className="md:col-span-2">
                <label className="md:hidden text-[13px] font-semibold mb-0.5 block" style={{ color: "var(--grey-600)" }}>Price/Session</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: "var(--grey-500)" }}>S$</span>
                  <input type="number" min={0} step={0.01} value={item.sessionPrice || ""} onChange={e => updateItem(item.key, "sessionPrice", parseFloat(e.target.value) || 0)} className="w-full pl-8 pr-2 py-1.5 text-[15px]" style={inputStyle} />
                </div>
              </div>
              {/* Total */}
              <div className="md:col-span-2 flex items-center">
                <label className="md:hidden text-[13px] font-semibold mb-0.5 block mr-2" style={{ color: "var(--grey-600)" }}>Total:</label>
                <span className="text-[15px] font-bold py-1.5" style={{ color: "var(--grey-900)" }}>{formatCurrency(itemCost(item))}</span>
              </div>
              {/* Remove */}
              <div className="md:col-span-1 flex items-center justify-end">
                <button onClick={() => removeItem(item.key)} disabled={items.length <= 1} className="p-1.5 rounded transition-colors" style={{ color: items.length <= 1 ? "var(--grey-300)" : "var(--red)", cursor: items.length <= 1 ? "not-allowed" : "pointer" }} title="Remove item">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Grand Total */}
        <div className="flex justify-end mt-4 pt-4" style={{ borderTop: "2px solid var(--grey-200)" }}>
          <div className="text-right">
            <span className="text-[14px] font-semibold uppercase tracking-wider mr-4" style={{ color: "var(--grey-600)" }}>Grand Total</span>
            <span className="text-[20px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ─── Milestones Card ────────────────────────────────────────────────── */}
      <div className="mb-6 p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Milestones</h2>
          <button onClick={addMilestone} className="inline-flex items-center gap-1 px-3 py-1.5 text-[14px] font-semibold rounded text-white" style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)" }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Milestone
          </button>
        </div>

        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No milestones yet. Add milestones to track progress.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div key={m.key} className="p-3 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Milestone {idx + 1}</span>
                  <button onClick={() => removeMilestone(m.key)} className="p-1 rounded" style={{ color: "var(--red)" }} title="Remove milestone">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>Title *</label>
                    <input type="text" value={m.title} onChange={e => updateMilestone(m.key, "title", e.target.value)} placeholder="Milestone title" className="w-full px-2 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>Description</label>
                    <input type="text" value={m.description} onChange={e => updateMilestone(m.key, "description", e.target.value)} placeholder="Short description" className="w-full px-2 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold mb-0.5" style={{ color: "var(--grey-600)" }}>Target Date</label>
                    <input type="date" value={m.targetDate} onChange={e => updateMilestone(m.key, "targetDate", e.target.value)} className="w-full px-2 py-1.5 text-[15px]" style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Action Buttons ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 mb-8">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={submitting}
          className="px-5 py-2.5 text-[15px] font-semibold rounded transition-opacity"
          style={{ ...inputStyle, color: "var(--grey-700)", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Saving..." : "Save as Draft"}
        </button>
        <button
          onClick={() => handleSubmit("active")}
          disabled={submitting}
          className="px-5 py-2.5 text-[15px] font-semibold rounded text-white transition-opacity"
          style={{ background: "#2d6a4f", borderRadius: "var(--radius-sm)", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Creating..." : "Create Plan"}
        </button>
      </div>
    </div>
  );
}

export default function NewTreatmentPlanPage() {
  return (
    <Suspense fallback={null}>
      <NewTreatmentPlanPageInner />
    </Suspense>
  );
}
