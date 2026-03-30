"use client";

import { useState, useEffect, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface OperatingHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  operatingHours: OperatingHours;
  isMainBranch: boolean;
  active: boolean;
  createdAt: string;
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  operatingHours: OperatingHours;
  isMainBranch: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const DEFAULT_HOURS: OperatingHours = {
  monday: { open: "08:00", close: "18:00" },
  tuesday: { open: "08:00", close: "18:00" },
  wednesday: { open: "08:00", close: "18:00" },
  thursday: { open: "08:00", close: "18:00" },
  friday: { open: "08:00", close: "18:00" },
  saturday: { open: "09:00", close: "14:00" },
  sunday: { open: "09:00", close: "14:00", closed: true },
};

const EMPTY_FORM: BranchForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  operatingHours: { ...DEFAULT_HOURS },
  isMainBranch: false,
};

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};
const inputStyle: React.CSSProperties = {
  border: "1px solid var(--grey-400)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-900)",
  background: "var(--white)",
  fontSize: "15px",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function BranchesPage() {
  const [mounted, setMounted] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BranchForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchBranches = useCallback(() => {
    setLoading(true);
    fetch("/api/branches")
      .then(r => r.json())
      .then(data => {
        const arr = data.branches || data;
        setBranches(Array.isArray(arr) ? arr : []);
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, operatingHours: JSON.parse(JSON.stringify(DEFAULT_HOURS)) });
    setShowModal(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      zip: branch.zip,
      phone: branch.phone,
      email: branch.email,
      operatingHours: (typeof branch.operatingHours === "string" ? JSON.parse(branch.operatingHours || "{}") : branch.operatingHours) || JSON.parse(JSON.stringify(DEFAULT_HOURS)),
      isMainBranch: branch.isMainBranch,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim()) {
      setToast({ message: "Branch name and code are required", type: "error" });
      return;
    }
    setSaving(true);
    const url = editingId ? `/api/branches/${editingId}` : "/api/branches";
    const method = editingId ? "PUT" : "POST";
    const payload = { ...form, operatingHours: JSON.stringify(form.operatingHours), zipCode: form.zip };
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to save branch");
        return r.json();
      })
      .then(() => {
        setToast({ message: editingId ? "Branch updated successfully" : "Branch created successfully", type: "success" });
        setShowModal(false);
        fetchBranches();
      })
      .catch(() => setToast({ message: "Failed to save branch. Please try again.", type: "error" }))
      .finally(() => setSaving(false));
  };

  const updateHours = (day: string, field: "open" | "close", value: string) => {
    setForm(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], [field]: value },
      },
    }));
  };

  const toggleDayClosed = (day: string) => {
    setForm(prev => ({
      ...prev,
      operatingHours: {
        ...prev.operatingHours,
        [day]: { ...prev.operatingHours[day], closed: !prev.operatingHours[day]?.closed },
      },
    }));
  };

  const getHoursSummary = (hours: OperatingHours): string => {
    if (!hours) return "Not set";
    const openDays = DAYS_OF_WEEK.filter(d => !hours[d.key]?.closed);
    if (openDays.length === 0) return "Closed";
    const first = hours[openDays[0].key];
    return `${first?.open || "08:00"} - ${first?.close || "18:00"} (${openDays.length} days)`;
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="h-8 w-56 animate-pulse mb-6" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in" style={{ background: toast.type === "success" ? "#e8f5e9" : "#ffebee", color: toast.type === "success" ? "#2e7d32" : "var(--red)", border: `1px solid ${toast.type === "success" ? "#a5d6a7" : "#ef9a9a"}` }}>
          <p className="text-[15px] font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Branches</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {branches.length} branch{branches.length !== 1 ? "es" : ""} &middot; Manage clinic locations
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold rounded"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          + Add Branch
        </button>
      </div>

      <AdminTabs />

      {/* Branch Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />)}</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
            <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No branches found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Add your first branch to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div key={branch.id} className="p-5 transition-shadow hover:shadow-md" style={cardStyle}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>{branch.name}</span>
                    {branch.isMainBranch && (
                      <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{ background: "#fff3e0", color: "#e65100", borderRadius: "var(--radius-sm)" }}>
                        Main Branch
                      </span>
                    )}
                    <span className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide rounded" style={{
                      background: branch.active ? "#ecfdf5" : "#fef2f2",
                      color: branch.active ? "#059669" : "#dc2626",
                      borderRadius: "var(--radius-sm)",
                    }}>
                      {branch.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="text-[13px] font-mono" style={{ color: "var(--grey-500)" }}>{branch.code}</span>
                </div>
                <button
                  onClick={() => openEditModal(branch)}
                  className="px-3 py-1.5 text-[14px] font-semibold rounded transition-colors"
                  style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 text-[14px]" style={{ color: "var(--grey-600)" }}>
                {branch.address && (
                  <div className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>{branch.address}{branch.city ? `, ${branch.city}` : ""}{branch.state ? `, ${branch.state}` : ""} {branch.zip}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span>{branch.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{getHoursSummary(branch.operatingHours)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Branch Modal ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-2xl mx-4 p-6" style={{ ...cardStyle, maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingId ? "Edit Branch" : "Add New Branch"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:opacity-70">
                <svg className="w-5 h-5" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Branch Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="Main Clinic" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Branch Code *</label>
                  <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="MAIN-01" />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Address</label>
                <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="123 Wellness Street" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>City</label>
                  <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>State</label>
                  <input type="text" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="Singapore" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Zip</label>
                  <input type="text" value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="123456" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                  <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="+65 1234 5678" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2" style={inputStyle} placeholder="branch@clinic.com" />
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Operating Hours</label>
                <div className="space-y-2">
                  {DAYS_OF_WEEK.map(day => {
                    const dayHours = form.operatingHours[day.key] || { open: "08:00", close: "18:00", closed: false };
                    return (
                      <div key={day.key} className="flex items-center gap-3">
                        <span className="text-[14px] font-medium w-24" style={{ color: "var(--grey-700)" }}>{day.label}</span>
                        <button
                          onClick={() => toggleDayClosed(day.key)}
                          className="px-2 py-1 text-[12px] font-bold uppercase rounded"
                          style={{
                            background: dayHours.closed ? "#fef2f2" : "#ecfdf5",
                            color: dayHours.closed ? "#dc2626" : "#059669",
                            border: `1px solid ${dayHours.closed ? "#fecaca" : "#a7f3d0"}`,
                            borderRadius: "var(--radius-sm)",
                            minWidth: 60,
                          }}
                        >
                          {dayHours.closed ? "Closed" : "Open"}
                        </button>
                        {!dayHours.closed && (
                          <>
                            <input type="time" value={dayHours.open} onChange={e => updateHours(day.key, "open", e.target.value)} className="px-2 py-1" style={{ ...inputStyle, width: 110 }} />
                            <span className="text-[14px]" style={{ color: "var(--grey-500)" }}>to</span>
                            <input type="time" value={dayHours.close} onChange={e => updateHours(day.key, "close", e.target.value)} className="px-2 py-1" style={{ ...inputStyle, width: 110 }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Branch toggle */}
              <div className="flex items-center gap-3">
                <label className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Main Branch</label>
                <button
                  onClick={() => setForm(p => ({ ...p, isMainBranch: !p.isMainBranch }))}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: form.isMainBranch ? "var(--blue-500)" : "var(--grey-300)" }}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ left: form.isMainBranch ? 22 : 2 }} />
                </button>
                <span className="text-[14px]" style={{ color: "var(--grey-600)" }}>{form.isMainBranch ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-[15px] font-semibold rounded"
                style={{ background: "var(--white)", border: "1px solid var(--grey-300)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 text-[15px] font-semibold text-white rounded disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {saving ? "Saving..." : editingId ? "Update Branch" : "Create Branch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
