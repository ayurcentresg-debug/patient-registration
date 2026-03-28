"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Doctor {
  id: string;
  name: string;
  role: string;
  specialization: string;
  department: string;
  phone: string | null;
  email: string | null;
  consultationFee: number | null;
  slotDuration: number | null;
  schedule: string;
  status: string;
  createdAt: string;
}

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  todaysAppointments: number;
}

interface ScheduleBlock {
  start: string;
  end: string;
}

type WeeklySchedule = Record<string, ScheduleBlock[]>;

interface StaffForm {
  name: string;
  role: string;
  specialization: string;
  department: string;
  phone: string;
  email: string;
  consultationFee: string;
  slotDuration: string;
  schedule: WeeklySchedule;
}

interface ClinicSettings {
  clinicName: string;
  operatingStart: string;
  operatingEnd: string;
  defaultConsultationDuration: string;
  defaultTherapyDuration: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const DOCTOR_SPECIALIZATIONS = [
  "Kayachikitsa", "Panchakarma", "Balachikitsa", "Graha Chikitsa",
  "Shalakya Tantra", "Shalya Tantra", "Agada Tantra", "Rasayana",
  "Vajikarana", "General Ayurveda",
];

const THERAPIST_SPECIALIZATIONS = [
  "Panchakarma Therapy", "Abhyanga", "Shirodhara", "Pizhichil",
  "Njavarakizhi", "Elakizhi", "Podikizhi", "Nasyam", "Vasthi",
  "Udvarthanam", "Takradhara", "General Therapy",
];

const DEPARTMENTS = [
  "Panchakarma", "General Ayurveda", "Kayachikitsa",
  "Yoga & Naturopathy", "Marma Therapy",
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
];

const EMPTY_FORM: StaffForm = {
  name: "",
  role: "doctor",
  specialization: "",
  department: "",
  phone: "",
  email: "",
  consultationFee: "",
  slotDuration: "30",
  schedule: {},
};

const DEFAULT_SETTINGS: ClinicSettings = {
  clinicName: "Ayur Centre Pte. Ltd.",
  operatingStart: "08:00",
  operatingEnd: "18:00",
  defaultConsultationDuration: "30",
  defaultTherapyDuration: "60",
};

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
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
  fontSize: "13px",
};
const btnPrimary: React.CSSProperties = {
  background: "var(--blue-500)",
  borderRadius: "var(--radius-sm)",
  color: "var(--white)",
};
const btnOutline: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius-sm)",
  color: "var(--grey-700)",
};
const chipBase = "inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 text-[13px] font-medium shadow-lg yoda-slide-in-right"
      style={{
        background: type === "success" ? "var(--green)" : "var(--red)",
        color: "var(--white)",
        borderRadius: "var(--radius)",
        minWidth: 280,
      }}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === "success" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        )}
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  // ─── Hydration safety ─────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ─── State ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"staff" | "settings" | "users">("staff");
  const [staffSubTab, setStaffSubTab] = useState<"doctor" | "therapist">("doctor");
  const [staff, setStaff] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Settings state
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────────
  const fetchStaff = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/doctors")
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then(setStaff)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = useCallback(() => {
    fetch("/api/dashboard")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchStats();
  }, [fetchStaff, fetchStats]);

  // Load settings from localStorage
  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem("clinicSettings");
      if (saved) setSettings(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [mounted]);

  // ─── Derived data ─────────────────────────────────────────────────────
  const doctors = staff.filter((s) => s.role === "doctor");
  const therapists = staff.filter((s) => s.role === "therapist");
  const activeDoctors = doctors.filter((d) => d.status === "active");
  const activeTherapists = therapists.filter((t) => t.status === "active");
  const currentList = staffSubTab === "doctor" ? doctors : therapists;

  // ─── Form handlers ───────────────────────────────────────────────────
  function openAddForm() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, role: staffSubTab });
    setFormErrors({});
    setShowForm(true);
  }

  function openEditForm(doc: Doctor) {
    setEditingId(doc.id);
    let schedule: WeeklySchedule = {};
    try { schedule = JSON.parse(doc.schedule || "{}"); } catch { /* ignore */ }
    setForm({
      name: doc.name,
      role: doc.role,
      specialization: doc.specialization,
      department: doc.department,
      phone: doc.phone || "",
      email: doc.email || "",
      consultationFee: doc.consultationFee?.toString() || "",
      slotDuration: doc.slotDuration?.toString() || "30",
      schedule,
    });
    setFormErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.specialization) errs.specialization = "Specialization is required";
    if (!form.department) errs.department = "Department is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      role: form.role,
      specialization: form.specialization,
      department: form.department,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      consultationFee: form.consultationFee ? Number(form.consultationFee) : 0,
      slotDuration: Number(form.slotDuration),
      schedule: JSON.stringify(form.schedule),
    };

    try {
      const url = editingId ? `/api/doctors/${editingId}` : "/api/doctors";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      setToast({ message: editingId ? "Staff member updated successfully" : "Staff member added successfully", type: "success" });
      closeForm();
      fetchStaff();
      fetchStats();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(doc: Doctor) {
    const newStatus = doc.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/doctors/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setToast({ message: `${doc.name} is now ${newStatus}`, type: "success" });
      fetchStaff();
      fetchStats();
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  }

  // ─── Schedule helpers ─────────────────────────────────────────────────
  function toggleDay(day: string) {
    setForm((prev) => {
      const schedule = { ...prev.schedule };
      if (schedule[day]) {
        delete schedule[day];
      } else {
        schedule[day] = [{ start: "09:00", end: "17:00" }];
      }
      return { ...prev, schedule };
    });
  }

  function updateBlock(day: string, idx: number, field: "start" | "end", value: string) {
    setForm((prev) => {
      const schedule = { ...prev.schedule };
      const blocks = [...(schedule[day] || [])];
      blocks[idx] = { ...blocks[idx], [field]: value };
      schedule[day] = blocks;
      return { ...prev, schedule };
    });
  }

  function addBlock(day: string) {
    setForm((prev) => {
      const schedule = { ...prev.schedule };
      const blocks = [...(schedule[day] || [])];
      blocks.push({ start: "14:00", end: "17:00" });
      schedule[day] = blocks;
      return { ...prev, schedule };
    });
  }

  function removeBlock(day: string, idx: number) {
    setForm((prev) => {
      const schedule = { ...prev.schedule };
      const blocks = [...(schedule[day] || [])];
      blocks.splice(idx, 1);
      if (blocks.length === 0) {
        delete schedule[day];
      } else {
        schedule[day] = blocks;
      }
      return { ...prev, schedule };
    });
  }

  // ─── Settings handlers ────────────────────────────────────────────────
  function saveSettings() {
    try {
      localStorage.setItem("clinicSettings", JSON.stringify(settings));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
      setToast({ message: "Settings saved successfully", type: "success" });
    } catch {
      setToast({ message: "Failed to save settings", type: "error" });
    }
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="p-6 md:p-8">
        <div className="space-y-6">
          <div className="h-7 rounded w-48 animate-pulse" style={{ background: "var(--grey-200)" }} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-md animate-pulse" style={{ background: "var(--grey-200)" }} />
            ))}
          </div>
          <div className="h-10 rounded w-full animate-pulse" style={{ background: "var(--grey-200)" }} />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
          Admin Panel
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
          Manage staff, settings, and system configuration
        </p>
      </div>

      <AdminTabs />

      {/* ── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Active Doctors</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{activeDoctors.length}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--blue-100)", borderRadius: "var(--radius-sm)", color: "var(--blue-500)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Active Therapists</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{activeTherapists.length}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#c8e6c9", borderRadius: "var(--radius-sm)", color: "var(--green)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Today&apos;s Appts</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats?.todaysAppointments ?? 0}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "#ffe0b2", borderRadius: "var(--radius-sm)", color: "var(--orange)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="p-4 transition-shadow duration-150 hover:shadow-md" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: "var(--grey-600)" }}>Total Patients</p>
              <p className="text-[28px] font-bold mt-1 tracking-tight" style={{ color: "var(--grey-900)" }}>{stats?.totalPatients ?? 0}</p>
            </div>
            <div className="w-11 h-11 flex items-center justify-center" style={{ background: "var(--purple-light)", borderRadius: "var(--radius-sm)", color: "var(--purple)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 p-1" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }}>
        {(["staff", "settings", "users"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 px-4 py-2 text-[13px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-sm)",
              background: activeTab === tab ? "var(--white)" : "transparent",
              color: activeTab === tab ? "var(--grey-900)" : "var(--grey-600)",
              boxShadow: activeTab === tab ? "var(--shadow-sm)" : "none",
            }}
          >
            {tab === "staff" ? "Doctors & Therapists" : tab === "settings" ? "System Settings" : "User Management"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* STAFF TAB                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "staff" && (
        <div>
          {/* Sub-tabs */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1 p-1" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }}>
              <button
                onClick={() => { setStaffSubTab("doctor"); closeForm(); }}
                className="px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: staffSubTab === "doctor" ? "var(--white)" : "transparent",
                  color: staffSubTab === "doctor" ? "var(--grey-900)" : "var(--grey-600)",
                  boxShadow: staffSubTab === "doctor" ? "var(--shadow-sm)" : "none",
                }}
              >
                Ayurveda Doctors ({doctors.length})
              </button>
              <button
                onClick={() => { setStaffSubTab("therapist"); closeForm(); }}
                className="px-4 py-1.5 text-[13px] font-semibold transition-all duration-150"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: staffSubTab === "therapist" ? "var(--white)" : "transparent",
                  color: staffSubTab === "therapist" ? "var(--grey-900)" : "var(--grey-600)",
                  boxShadow: staffSubTab === "therapist" ? "var(--shadow-sm)" : "none",
                }}
              >
                Therapists ({therapists.length})
              </button>
            </div>

            {!showForm && (
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-semibold transition-colors duration-150"
                style={btnPrimary}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add {staffSubTab === "doctor" ? "Doctor" : "Therapist"}
              </button>
            )}
          </div>

          {/* ── Inline Form ───────────────────────────────────────────── */}
          {showForm && (
            <div className="mb-6 p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>
                  {editingId ? "Edit" : "Add"} {form.role === "doctor" ? "Ayurveda Doctor" : "Therapist"}
                </h3>
                <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center" style={{ color: "var(--grey-500)", borderRadius: "var(--radius-sm)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                    Name <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={{ ...inputStyle, borderColor: formErrors.name ? "var(--red)" : "var(--grey-400)" }}
                    placeholder="Dr. Arun Kumar"
                  />
                  {formErrors.name && <p className="text-[11px] mt-0.5" style={{ color: "var(--red)" }}>{formErrors.name}</p>}
                </div>

                {/* Role (read-only indicator) */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, role: e.target.value, specialization: "" }));
                    }}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  >
                    <option value="doctor">Ayurveda Doctor</option>
                    <option value="therapist">Therapist</option>
                  </select>
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                    Specialization <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <select
                    value={form.specialization}
                    onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={{ ...inputStyle, borderColor: formErrors.specialization ? "var(--red)" : "var(--grey-400)" }}
                  >
                    <option value="">Select specialization...</option>
                    {(form.role === "doctor" ? DOCTOR_SPECIALIZATIONS : THERAPIST_SPECIALIZATIONS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {formErrors.specialization && <p className="text-[11px] mt-0.5" style={{ color: "var(--red)" }}>{formErrors.specialization}</p>}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                    Department <span style={{ color: "var(--red)" }}>*</span>
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={{ ...inputStyle, borderColor: formErrors.department ? "var(--red)" : "var(--grey-400)" }}
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.department && <p className="text-[11px] mt-0.5" style={{ color: "var(--red)" }}>{formErrors.department}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="doctor@clinic.com"
                  />
                </div>

                {/* Consultation Fee */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                    {form.role === "doctor" ? "Consultation" : "Therapy"} Fee
                  </label>
                  <input
                    type="number"
                    value={form.consultationFee}
                    onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                    placeholder="500"
                    min="0"
                  />
                </div>

                {/* Slot Duration */}
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Slot Duration</label>
                  <select
                    value={form.slotDuration}
                    onChange={(e) => setForm((p) => ({ ...p, slotDuration: e.target.value }))}
                    className="w-full px-3 py-2"
                    style={inputStyle}
                  >
                    {SLOT_DURATIONS.map((d) => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Weekly Schedule ─────────────────────────────────────── */}
              <div className="mt-5">
                <label className="block text-[12px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>
                  Weekly Schedule
                </label>
                <div className="space-y-2">
                  {DAYS.map(({ key, label }) => {
                    const isActive = !!form.schedule[key];
                    const blocks = form.schedule[key] || [];
                    return (
                      <div key={key} className="flex flex-col gap-2 p-3" style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)" }}>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleDay(key)}
                            className="w-9 h-5 flex-shrink-0 relative transition-colors duration-150"
                            style={{
                              borderRadius: 10,
                              background: isActive ? "var(--blue-500)" : "var(--grey-400)",
                            }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 bg-white block transition-all duration-150"
                              style={{
                                borderRadius: "50%",
                                left: isActive ? 18 : 2,
                              }}
                            />
                          </button>
                          <span className="text-[13px] font-semibold w-10" style={{ color: isActive ? "var(--grey-900)" : "var(--grey-500)" }}>
                            {label}
                          </span>
                          {isActive && blocks.map((block, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={block.start}
                                onChange={(e) => updateBlock(key, idx, "start", e.target.value)}
                                className="px-2 py-1 text-[12px]"
                                style={inputStyle}
                              />
                              <span className="text-[12px]" style={{ color: "var(--grey-500)" }}>to</span>
                              <input
                                type="time"
                                value={block.end}
                                onChange={(e) => updateBlock(key, idx, "end", e.target.value)}
                                className="px-2 py-1 text-[12px]"
                                style={inputStyle}
                              />
                              {blocks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBlock(key, idx)}
                                  className="w-5 h-5 flex items-center justify-center"
                                  style={{ color: "var(--red)" }}
                                  title="Remove time block"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => addBlock(key)}
                              className="text-[11px] font-semibold px-2 py-1 hover:underline"
                              style={{ color: "var(--blue-500)" }}
                            >
                              + Add block
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Form Actions ───────────────────────────────────────── */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-[13px] font-semibold transition-opacity duration-150"
                  style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
                >
                  {saving && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                  )}
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
                <button
                  onClick={closeForm}
                  className="px-5 py-2 text-[13px] font-semibold transition-colors duration-150"
                  style={btnOutline}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Error State ─────────────────────────────────────────── */}
          {error && (
            <div className="mb-4 px-4 py-3 flex items-center justify-between" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)" }}>
              <p className="text-[13px] font-medium">Failed to load staff: {error}</p>
              <button onClick={fetchStaff} className="text-[12px] font-semibold underline">Retry</button>
            </div>
          )}

          {/* ── Loading State ───────────────────────────────────────── */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
              ))}
            </div>
          ) : currentList.length === 0 ? (
            /* ── Empty State ─────────────────────────────────────── */
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
                <svg className="w-7 h-7" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>
                No {staffSubTab === "doctor" ? "doctors" : "therapists"} found
              </p>
              <button onClick={openAddForm} className="text-[12px] font-semibold mt-2 hover:underline" style={{ color: "var(--blue-500)" }}>
                Add your first {staffSubTab === "doctor" ? "doctor" : "therapist"}
              </button>
            </div>
          ) : (
            <>
              {/* ── Desktop Table ──────────────────────────────────── */}
              <div className="hidden md:block overflow-hidden" style={cardStyle}>
                <table className="w-full" role="table">
                  <thead style={{ borderBottom: "1px solid var(--grey-300)", background: "var(--grey-50)" }}>
                    <tr>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Name</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Specialization</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Department</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Phone</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Fee</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((d, i) => (
                      <tr
                        key={d.id}
                        className="transition-colors duration-100"
                        style={{ borderBottom: i < currentList.length - 1 ? "1px solid var(--grey-200)" : "none" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{
                                background: d.role === "doctor" ? "var(--blue-50)" : "var(--green-light)",
                                color: d.role === "doctor" ? "var(--blue-500)" : "var(--green)",
                                borderRadius: "var(--radius-pill)",
                              }}
                            >
                              {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>{d.name}</p>
                              {d.email && <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>{d.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-800)" }}>{d.specialization}</td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] px-2 py-0.5" style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}>
                            {d.department}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px]" style={{ color: "var(--grey-800)" }}>{d.phone || "\u2014"}</td>
                        <td className="px-4 py-3 text-[13px] font-medium" style={{ color: "var(--grey-800)" }}>
                          {d.consultationFee != null ? `\u20B9${d.consultationFee}` : "\u2014"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={chipBase}
                            style={{
                              borderRadius: "var(--radius-sm)",
                              background: d.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                              color: d.status === "active" ? "var(--green)" : "var(--grey-600)",
                            }}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditForm(d)}
                              className="text-[12px] font-semibold hover:underline"
                              style={{ color: "var(--blue-500)" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleStatus(d)}
                              className="text-[12px] font-semibold hover:underline"
                              style={{ color: d.status === "active" ? "var(--orange)" : "var(--green)" }}
                            >
                              {d.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ────────────────────────────────────── */}
              <div className="md:hidden space-y-2">
                {currentList.map((d) => (
                  <div
                    key={d.id}
                    className="p-4"
                    style={{ ...cardStyle, boxShadow: "var(--shadow-sm)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 flex items-center justify-center text-[11px] font-bold"
                          style={{
                            background: d.role === "doctor" ? "var(--blue-50)" : "var(--green-light)",
                            color: d.role === "doctor" ? "var(--blue-500)" : "var(--green)",
                            borderRadius: "var(--radius-pill)",
                          }}
                        >
                          {d.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{d.name}</p>
                          <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>{d.specialization}</p>
                        </div>
                      </div>
                      <span
                        className={chipBase}
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: d.status === "active" ? "var(--green-light)" : "var(--grey-200)",
                          color: d.status === "active" ? "var(--green)" : "var(--grey-600)",
                        }}
                      >
                        {d.status}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-2 ml-12">
                      <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{d.department}</span>
                      <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{d.phone || "No phone"}</span>
                      <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                        {d.consultationFee != null ? `\u20B9${d.consultationFee}` : "No fee"}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-3 ml-12">
                      <button
                        onClick={() => openEditForm(d)}
                        className="text-[12px] font-semibold hover:underline"
                        style={{ color: "var(--blue-500)" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleStatus(d)}
                        className="text-[12px] font-semibold hover:underline"
                        style={{ color: d.status === "active" ? "var(--orange)" : "var(--green)" }}
                      >
                        {d.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS TAB                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="max-w-2xl">
          <div className="p-6" style={cardStyle}>
            <h3 className="text-[15px] font-bold mb-5" style={{ color: "var(--grey-900)" }}>Clinic Configuration</h3>

            <div className="space-y-5">
              {/* Clinic Name */}
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Clinic Name</label>
                <input
                  type="text"
                  value={settings.clinicName}
                  onChange={(e) => setSettings((s) => ({ ...s, clinicName: e.target.value }))}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                  placeholder="Enter clinic name"
                />
              </div>

              {/* Operating Hours */}
              <div>
                <label className="block text-[12px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Operating Hours</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] mb-0.5" style={{ color: "var(--grey-500)" }}>Start Time</label>
                    <input
                      type="time"
                      value={settings.operatingStart}
                      onChange={(e) => setSettings((s) => ({ ...s, operatingStart: e.target.value }))}
                      className="w-full px-3 py-2"
                      style={inputStyle}
                    />
                  </div>
                  <span className="text-[13px] mt-4" style={{ color: "var(--grey-500)" }}>to</span>
                  <div className="flex-1">
                    <label className="block text-[11px] mb-0.5" style={{ color: "var(--grey-500)" }}>End Time</label>
                    <input
                      type="time"
                      value={settings.operatingEnd}
                      onChange={(e) => setSettings((s) => ({ ...s, operatingEnd: e.target.value }))}
                      className="w-full px-3 py-2"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Default Consultation Duration */}
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Default Consultation Duration</label>
                <select
                  value={settings.defaultConsultationDuration}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultConsultationDuration: e.target.value }))}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>

              {/* Default Therapy Duration */}
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Default Therapy Duration</label>
                <select
                  value={settings.defaultTherapyDuration}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultTherapyDuration: e.target.value }))}
                  className="w-full px-3 py-2"
                  style={inputStyle}
                >
                  {[30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>{d} minutes</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveSettings}
                className="inline-flex items-center gap-2 px-5 py-2 text-[13px] font-semibold transition-colors duration-150"
                style={btnPrimary}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Settings
              </button>
              {settingsSaved && (
                <span className="text-[12px] font-medium" style={{ color: "var(--green)" }}>Saved!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* USER MANAGEMENT TAB                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="max-w-xl mx-auto text-center py-12">
          <div className="p-8" style={cardStyle}>
            <div
              className="w-16 h-16 mx-auto mb-5 flex items-center justify-center"
              style={{ background: "var(--blue-50)", borderRadius: "var(--radius-pill)" }}
            >
              <svg className="w-8 h-8" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>
              User Management
            </h3>
            <p className="text-[13px] mb-1" style={{ color: "var(--grey-600)" }}>
              Role-based access control with login credentials, permissions, and audit logging.
            </p>
            <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
              This feature is currently being developed and will be available in a future update.
            </p>
            <div className="mt-5">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-wide"
                style={{
                  background: "var(--orange-light)",
                  color: "var(--orange)",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Coming Soon
              </span>
            </div>

            {/* Preview of planned features */}
            <div className="mt-8 text-left space-y-3">
              {[
                { title: "Admin & Staff Roles", desc: "Separate access levels for admins, doctors, therapists, and front desk" },
                { title: "Login Credentials", desc: "Secure authentication with email/password or OTP login" },
                { title: "Audit Logging", desc: "Track all actions performed across the system for compliance" },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-3"
                  style={{ background: "var(--grey-50)", borderRadius: "var(--radius-sm)" }}
                >
                  <div
                    className="w-6 h-6 flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }}
                  >
                    <svg className="w-3.5 h-3.5" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--grey-800)" }}>{feature.title}</p>
                    <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
