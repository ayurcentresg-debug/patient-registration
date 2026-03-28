"use client";

import { useState, useEffect, useCallback } from "react";
import TreatmentTabs from "@/components/TreatmentTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TreatmentPackage {
  id: string;
  name: string;
  sessionCount: number;
  discountPercent: number;
  totalPrice: number;
  pricePerSession: number;
  isActive: boolean;
}

interface Treatment {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration: number;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
  packages: TreatmentPackage[];
}

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "massage", label: "Massage Therapy" },
  { value: "panchakarma", label: "Panchakarma" },
  { value: "specialty", label: "Specialty Treatment" },
  { value: "consultation", label: "Consultation" },
  { value: "detox", label: "Detox" },
  { value: "therapy", label: "General Therapy" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  massage: { bg: "#e8f5e9", color: "#2e7d32" },
  panchakarma: { bg: "#e3f2fd", color: "#1565c0" },
  specialty: { bg: "#f3e5f5", color: "#7b1fa2" },
  consultation: { bg: "#fff3e0", color: "#f57c00" },
  detox: { bg: "#fce4ec", color: "#c62828" },
  therapy: { bg: "#e0f2f1", color: "#00695c" },
};

const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)" };
const chipBase = "inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

function formatCurrency(amount: number): string {
  return `S$${(amount ?? 0).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Treatment Form Modal ───────────────────────────────────────────────────
function TreatmentModal({ treatment, onSave, onClose }: {
  treatment: Treatment | null;
  onSave: (data: Partial<Treatment>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(treatment?.name || "");
  const [description, setDescription] = useState(treatment?.description || "");
  const [category, setCategory] = useState(treatment?.category || "massage");
  const [duration, setDuration] = useState(treatment?.duration || 50);
  const [basePrice, setBasePrice] = useState(treatment?.basePrice || 0);
  const [isActive, setIsActive] = useState(treatment?.isActive !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Treatment name is required"); return; }
    if (basePrice <= 0) { setError("Price must be greater than 0"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({ name, description, category, duration, basePrice, isActive });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[150]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div className="fixed z-[151] yoda-slide-in" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 520, maxHeight: "90vh", overflow: "auto", background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
            {treatment ? "Edit Treatment" : "Add Treatment"}
          </h2>
          <button onClick={onClose} className="text-[20px] w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" style={{ color: "var(--grey-500)" }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Treatment Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder="e.g. Abhyangam & Shirodhara" autoFocus />
          </div>
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 text-[13px]" style={{ ...inputStyle, minHeight: 70, resize: "vertical" as const }} placeholder="Benefits, conditions treated, etc." />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="w-[100px]">
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Duration</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                {[30, 45, 50, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Base Price (S$) *</label>
              <input type="number" value={basePrice} onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 text-[13px]" style={inputStyle} min={0} step={5} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
                <span className="text-[12px] font-semibold" style={{ color: "var(--grey-700)" }}>Active</span>
              </label>
            </div>
          </div>
          {error && <p className="text-[12px] font-semibold px-3 py-2 rounded" style={{ color: "var(--red)", background: "#fef2f2" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold rounded" style={{ border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-[13px] font-bold text-white rounded" style={{ background: saving ? "var(--grey-400)" : "var(--blue-500)" }}>
              {saving ? "Saving..." : treatment ? "Update" : "Create Treatment"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Package Form Modal ─────────────────────────────────────────────────────
function PackageModal({ treatment, pkg, onSave, onClose }: {
  treatment: Treatment;
  pkg: TreatmentPackage | null;
  onSave: (data: { name: string; sessionCount: number; discountPercent: number; packageId?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(pkg?.name || "");
  const [sessionCount, setSessionCount] = useState(pkg?.sessionCount || 5);
  const [discountPercent, setDiscountPercent] = useState(pkg?.discountPercent || 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalPrice = Math.round(treatment.basePrice * sessionCount * (1 - discountPercent / 100) * 100) / 100;
  const pricePerSession = Math.round((totalPrice / sessionCount) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sessionCount < 2) { setError("Minimum 2 sessions required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim() || `${sessionCount}-Session Package`,
        sessionCount,
        discountPercent,
        ...(pkg ? { packageId: pkg.id } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[160]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div className="fixed z-[161] yoda-slide-in" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 440, background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{pkg ? "Edit Package" : "Add Package"}</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>for {treatment.name} (base: {formatCurrency(treatment.basePrice)}/session)</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Package Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder={`${sessionCount}-Session Package`} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Sessions *</label>
              <input type="number" value={sessionCount} onChange={(e) => setSessionCount(Math.max(2, parseInt(e.target.value) || 2))} className="w-full px-3 py-2 text-[13px]" style={inputStyle} min={2} />
            </div>
            <div className="flex-1">
              <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Discount %</label>
              <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="w-full px-3 py-2 text-[13px]" style={inputStyle} min={0} max={100} step={1} />
            </div>
          </div>
          {/* Price preview */}
          <div className="p-3 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
            <div className="flex justify-between text-[12px] mb-1" style={{ color: "var(--grey-600)" }}>
              <span>Original ({sessionCount} x {formatCurrency(treatment.basePrice)})</span>
              <span style={{ textDecoration: "line-through" }}>{formatCurrency(treatment.basePrice * sessionCount)}</span>
            </div>
            <div className="flex justify-between text-[12px] mb-1" style={{ color: "var(--green)" }}>
              <span>Discount ({discountPercent}% off)</span>
              <span>-{formatCurrency(treatment.basePrice * sessionCount - totalPrice)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-bold pt-1 mt-1" style={{ borderTop: "1px solid var(--grey-300)", color: "var(--grey-900)" }}>
              <span>Package Total</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-[11px] mt-1" style={{ color: "var(--grey-500)" }}>
              <span>Per session</span>
              <span>{formatCurrency(pricePerSession)}</span>
            </div>
          </div>
          {error && <p className="text-[12px] font-semibold px-3 py-2 rounded" style={{ color: "var(--red)", background: "#fef2f2" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold rounded" style={{ border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-[13px] font-bold text-white rounded" style={{ background: saving ? "var(--grey-400)" : "var(--blue-500)" }}>
              {saving ? "Saving..." : pkg ? "Update" : "Create Package"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function TreatmentsPage() {
  const [mounted, setMounted] = useState(false);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [editTreatment, setEditTreatment] = useState<Treatment | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageForTreatment, setPackageForTreatment] = useState<Treatment | null>(null);
  const [editPackage, setEditPackage] = useState<TreatmentPackage | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchTreatments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    fetch(`/api/treatments?${params}`)
      .then(r => r.json())
      .then(data => setTreatments(Array.isArray(data) ? data : []))
      .catch(() => setTreatments([]))
      .finally(() => setLoading(false));
  }, [search, categoryFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchTreatments, 300);
    return () => clearTimeout(timeout);
  }, [fetchTreatments]);

  // Seed treatments
  async function handleSeed() {
    try {
      const res = await fetch("/api/treatments/seed", { method: "POST" });
      const data = await res.json();
      if (data.seeded) {
        setToast({ message: `Seeded ${data.treatments.length} treatments with packages`, type: "success" });
        fetchTreatments();
      } else {
        setToast({ message: data.message, type: "error" });
      }
    } catch {
      setToast({ message: "Failed to seed treatments", type: "error" });
    }
  }

  // Save treatment (create or update)
  async function handleSaveTreatment(data: Partial<Treatment>) {
    const url = editTreatment ? `/api/treatments/${editTreatment.id}` : "/api/treatments";
    const method = editTreatment ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save");
    }
    setShowTreatmentModal(false);
    setEditTreatment(null);
    setToast({ message: editTreatment ? "Treatment updated" : "Treatment created", type: "success" });
    fetchTreatments();
  }

  // Delete treatment
  async function handleDeleteTreatment(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/treatments/${id}`, { method: "DELETE" });
    const data = await res.json();
    setToast({ message: data.deactivated ? "Treatment deactivated (has appointments)" : "Treatment deleted", type: "success" });
    fetchTreatments();
  }

  // Save package
  async function handleSavePackage(data: { name: string; sessionCount: number; discountPercent: number; packageId?: string }) {
    if (!packageForTreatment) return;
    const method = data.packageId ? "PUT" : "POST";
    const res = await fetch(`/api/treatments/${packageForTreatment.id}/packages`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save package");
    }
    setShowPackageModal(false);
    setEditPackage(null);
    setPackageForTreatment(null);
    setToast({ message: data.packageId ? "Package updated" : "Package created", type: "success" });
    fetchTreatments();
  }

  // Delete package
  async function handleDeletePackage(treatmentId: string, packageId: string) {
    if (!confirm("Delete this package?")) return;
    const res = await fetch(`/api/treatments/${treatmentId}/packages?packageId=${packageId}`, { method: "DELETE" });
    const data = await res.json();
    setToast({ message: data.deactivated ? "Package deactivated" : "Package deleted", type: "success" });
    fetchTreatments();
  }

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in" style={{ background: toast.type === "success" ? "#e8f5e9" : "#ffebee", color: toast.type === "success" ? "#2e7d32" : "var(--red)", border: `1px solid ${toast.type === "success" ? "#a5d6a7" : "#ef9a9a"}` }}>
          <p className="text-[13px] font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Treatments & Packages</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {treatments.length} treatment{treatments.length !== 1 ? "s" : ""} &middot; Manage Ayurveda therapy pricing
          </p>
        </div>
        <div className="flex gap-2">
          {treatments.length === 0 && !loading && (
            <button onClick={handleSeed} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded transition-colors" style={{ border: "1px solid var(--green)", color: "var(--green)", background: "var(--white)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Seed AyurCentre Treatments
            </button>
          )}
          <button onClick={() => { setEditTreatment(null); setShowTreatmentModal(true); }} className="inline-flex items-center gap-2 text-white px-5 py-2 text-[13px] font-semibold rounded" style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Treatment
          </button>
        </div>
      </div>

      <TreatmentTabs />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search treatments..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-[13px]" style={inputStyle} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 text-[13px]" style={{ ...inputStyle, minWidth: 160 }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Treatment List */}
      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : treatments.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>No treatments found</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--grey-500)" }}>Add treatments manually or seed with AyurCentre data</p>
        </div>
      ) : (
        <div className="space-y-3">
          {treatments.map(t => {
            const catStyle = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.therapy;
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} style={{ ...cardStyle, opacity: t.isActive ? 1 : 0.6 }}>
                {/* Treatment row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>{t.name}</span>
                      <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: catStyle.bg, color: catStyle.color }}>
                        {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                      </span>
                      {!t.isActive && <span className={chipBase} style={{ borderRadius: "var(--radius-sm)", background: "var(--grey-200)", color: "var(--grey-600)" }}>Inactive</span>}
                    </div>
                    {t.description && <p className="text-[12px] truncate" style={{ color: "var(--grey-500)" }}>{t.description}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(t.basePrice)}</p>
                    <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{t.duration} min &middot; {t.packages.length} pkg{t.packages.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditTreatment(t); setShowTreatmentModal(true); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Edit">
                      <svg className="w-4 h-4" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTreatment(t.id, t.name); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Delete">
                      <svg className="w-4 h-4" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                {/* Expanded: packages */}
                {isExpanded && (
                  <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
                    <div className="flex items-center justify-between pt-3 mb-2">
                      <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Packages</p>
                      <button onClick={() => { setPackageForTreatment(t); setEditPackage(null); setShowPackageModal(true); }} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "var(--blue-500)" }}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Package
                      </button>
                    </div>
                    {/* Single session row */}
                    <div className="flex items-center justify-between py-2 px-3 mb-1 rounded" style={{ background: "var(--grey-50)" }}>
                      <div>
                        <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>Single Session</span>
                        <span className="text-[11px] ml-2" style={{ color: "var(--grey-500)" }}>1 session</span>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(t.basePrice)}</span>
                    </div>
                    {/* Package rows */}
                    {t.packages.map(pkg => (
                      <div key={pkg.id} className="flex items-center justify-between py-2 px-3 mb-1 rounded" style={{ background: pkg.isActive ? "#f0fdf4" : "var(--grey-50)", opacity: pkg.isActive ? 1 : 0.5 }}>
                        <div>
                          <span className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{pkg.name}</span>
                          <span className="text-[11px] ml-2" style={{ color: "var(--grey-500)" }}>{pkg.sessionCount} sessions</span>
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#c8e6c9", color: "#2e7d32" }}>{pkg.discountPercent}% OFF</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[13px] font-bold" style={{ color: "var(--grey-900)" }}>{formatCurrency(pkg.totalPrice)}</span>
                            <span className="text-[10px] block" style={{ color: "var(--grey-500)" }}>{formatCurrency(pkg.pricePerSession)}/session</span>
                          </div>
                          <button onClick={() => { setPackageForTreatment(t); setEditPackage(pkg); setShowPackageModal(true); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100">
                            <svg className="w-3.5 h-3.5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDeletePackage(t.id, pkg.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100">
                            <svg className="w-3.5 h-3.5" style={{ color: "var(--red)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {t.packages.length === 0 && (
                      <p className="text-[12px] py-2 text-center" style={{ color: "var(--grey-500)" }}>No packages yet — add one to offer volume discounts</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Treatment Modal */}
      {showTreatmentModal && (
        <TreatmentModal treatment={editTreatment} onSave={handleSaveTreatment} onClose={() => { setShowTreatmentModal(false); setEditTreatment(null); }} />
      )}

      {/* Package Modal */}
      {showPackageModal && packageForTreatment && (
        <PackageModal treatment={packageForTreatment} pkg={editPackage} onSave={handleSavePackage} onClose={() => { setShowPackageModal(false); setEditPackage(null); setPackageForTreatment(null); }} />
      )}
    </div>
  );
}
