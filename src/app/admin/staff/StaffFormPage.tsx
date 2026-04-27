"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  gender: string | null;
  ethnicity: string | null;
  dateOfBirth: string | null;
  residencyStatus: string | null;
  prStartDate: string | null;
  dateOfJoining: string | null;
  lastWorkingDate: string | null;
  resignationDate: string | null;
  resignationReason: string | null;
  nricFin: string | null;
  jobTitle: string | null;
  mainDuties: string | null;
  employmentType: string;
  isWorkman: boolean;
  weeklyContractedHours: number;
  workingDaysPerWeek: number;
  specialization: string | null;
  department: string | null;
  consultationFee: number | null;
  schedule: string;
  slotDuration: number;
}

interface ScheduleBlock { start: string; end: string }
type WeeklySchedule = Record<string, ScheduleBlock[]>;

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  gender: string;
  ethnicity: string;
  dateOfBirth: string;
  residencyStatus: string;
  prStartDate: string;
  dateOfJoining: string;
  lastWorkingDate: string;
  resignationDate: string;
  resignationReason: string;
  nricFin: string;
  jobTitle: string;
  mainDuties: string;
  employmentType: string;
  isWorkman: boolean;
  weeklyContractedHours: string;
  workingDaysPerWeek: string;
  specialization: string;
  department: string;
  consultationFee: string;
  slotDuration: string;
  branchId: string;  // primary branch (multi-branch clinics); empty = floats across all
  schedule: WeeklySchedule;
  sendInvite: boolean;
}

interface BranchOption { id: string; name: string; code: string; isMainBranch?: boolean }

// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "doctor", label: "Doctor" },
  { value: "therapist", label: "Therapist" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "receptionist", label: "Receptionist" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
];

const CLINICAL_ROLES = ["doctor", "therapist"];

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
  "Admin", "Operations", "Front Desk", "Pharmacy", "Accounts", "General",
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
  name: "", email: "", phone: "", role: "doctor", gender: "", ethnicity: "",
  dateOfBirth: "", residencyStatus: "", prStartDate: "",
  dateOfJoining: "", lastWorkingDate: "", resignationDate: "", resignationReason: "",
  nricFin: "", jobTitle: "", mainDuties: "",
  employmentType: "full_time", isWorkman: false,
  weeklyContractedHours: "44", workingDaysPerWeek: "5.5",
  specialization: "", department: "", consultationFee: "", slotDuration: "30",
  branchId: "",
  schedule: {}, sendInvite: false,
};

// ─── Design Tokens (match patients/new + existing staff modal) ──────────────
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

const sectionTitleStyle: React.CSSProperties = {
  color: "var(--grey-900)",
  fontSize: "17px",
  fontWeight: 700,
};

// ─── Component ──────────────────────────────────────────────────────────────
interface Props {
  mode: "create" | "edit";
  staffId?: string;
}

export default function StaffFormPage({ mode, staffId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [errorField, setErrorField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // Load branches once for the branch picker
  useEffect(() => {
    fetch("/api/branches?active=true")
      .then(r => (r.ok ? r.json() : []))
      .then((data: BranchOption[]) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, []);

  // Fetch existing staff when editing
  useEffect(() => {
    if (mode !== "edit" || !staffId) return;
    (async () => {
      try {
        const res = await fetch(`/api/staff/${staffId}`);
        if (!res.ok) throw new Error("Failed to load staff");
        const s: Staff = await res.json();
        let schedule: WeeklySchedule = {};
        try { schedule = JSON.parse(s.schedule || "{}"); } catch { /* ignore */ }
        setForm({
          name: s.name,
          email: s.email,
          phone: s.phone || "",
          role: s.role,
          gender: s.gender || "",
          ethnicity: s.ethnicity || "",
          dateOfBirth: s.dateOfBirth ? s.dateOfBirth.split("T")[0] : "",
          residencyStatus: s.residencyStatus || "",
          prStartDate: s.prStartDate ? s.prStartDate.split("T")[0] : "",
          dateOfJoining: s.dateOfJoining ? s.dateOfJoining.split("T")[0] : "",
          lastWorkingDate: s.lastWorkingDate ? s.lastWorkingDate.split("T")[0] : "",
          resignationDate: s.resignationDate ? s.resignationDate.split("T")[0] : "",
          resignationReason: s.resignationReason || "",
          nricFin: s.nricFin || "",
          jobTitle: s.jobTitle || "",
          mainDuties: s.mainDuties || "",
          employmentType: s.employmentType || "full_time",
          isWorkman: s.isWorkman || false,
          weeklyContractedHours: String(s.weeklyContractedHours || 44),
          workingDaysPerWeek: String(s.workingDaysPerWeek || 5.5),
          specialization: s.specialization || "",
          department: s.department || "",
          consultationFee: s.consultationFee !== null ? String(s.consultationFee) : "",
          slotDuration: String(s.slotDuration || 30),
          branchId: (s as Staff & { branchId?: string | null }).branchId || "",
          schedule,
          sendInvite: false,
        });
      } catch {
        setFormError("Failed to load staff details");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, staffId]);

  const isClinical = CLINICAL_ROLES.includes(form.role);
  const isEditing = mode === "edit";
  const specializations = form.role === "therapist" ? THERAPIST_SPECIALIZATIONS : DOCTOR_SPECIALIZATIONS;

  // Scroll + focus the invalid field (same as modal version)
  const focusErrorField = (field: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => (el as HTMLInputElement | HTMLSelectElement).focus?.(), 300);
      }
    });
  };

  const validate = (): { field: string; message: string } | null => {
    if (!form.name.trim()) return { field: "name", message: "Name is required" };
    if (!form.email.trim()) return { field: "email", message: "Email is required" };
    if (isClinical && !form.specialization) return { field: "specialization", message: "Specialization is required for clinical roles" };
    if (isClinical && !form.department) return { field: "department", message: "Department is required for clinical roles" };
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setFormError(err.message);
      setErrorField(err.field);
      focusErrorField(err.field);
      return;
    }
    setSaving(true);
    setFormError("");
    setErrorField(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      gender: form.gender || null,
      ethnicity: form.ethnicity || null,
      dateOfBirth: form.dateOfBirth || null,
      residencyStatus: form.residencyStatus || null,
      prStartDate: form.prStartDate || null,
      dateOfJoining: form.dateOfJoining || null,
      lastWorkingDate: form.lastWorkingDate || null,
      resignationDate: form.resignationDate || null,
      resignationReason: form.resignationReason || null,
      nricFin: form.nricFin.trim() || null,
      jobTitle: form.jobTitle.trim() || null,
      mainDuties: form.mainDuties.trim() || null,
      employmentType: form.employmentType || "full_time",
      isWorkman: form.isWorkman,
      weeklyContractedHours: parseFloat(form.weeklyContractedHours) || 44,
      workingDaysPerWeek: parseFloat(form.workingDaysPerWeek) || 5.5,
      specialization: isClinical ? form.specialization : null,
      department: form.department || null,
      consultationFee: isClinical && form.consultationFee ? Number(form.consultationFee) : null,
      slotDuration: isClinical ? Number(form.slotDuration) : 30,
      branchId: form.branchId || null,
      schedule: isClinical ? JSON.stringify(form.schedule) : "{}",
      sendInvite: form.sendInvite,
    };

    try {
      const url = isEditing ? `/api/staff/${staffId}` : "/api/staff";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      router.push("/admin/staff");
      router.refresh();
    } catch {
      setFormError("Network error");
      setSaving(false);
    }
  };

  // ─── Schedule helpers ─────────────────────────────────────────────────
  const toggleDay = (day: string) => {
    const s = { ...form.schedule };
    if (s[day]) { delete s[day]; } else { s[day] = [{ start: "09:00", end: "13:00" }]; }
    setForm({ ...form, schedule: s });
  };
  const updateBlock = (day: string, idx: number, field: "start" | "end", value: string) => {
    const s = { ...form.schedule };
    const blocks = [...(s[day] || [])];
    blocks[idx] = { ...blocks[idx], [field]: value };
    s[day] = blocks;
    setForm({ ...form, schedule: s });
  };
  const addBlock = (day: string) => {
    const s = { ...form.schedule };
    s[day] = [...(s[day] || []), { start: "14:00", end: "17:00" }];
    setForm({ ...form, schedule: s });
  };
  const removeBlock = (day: string, idx: number) => {
    const s = { ...form.schedule };
    const blocks = (s[day] || []).filter((_, i) => i !== idx);
    if (blocks.length === 0) delete s[day]; else s[day] = blocks;
    setForm({ ...form, schedule: s });
  };

  const errorStyle = (field: string): React.CSSProperties =>
    errorField === field ? { ...inputStyle, borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626" } : inputStyle;

  const clearFieldError = (field: string) => {
    if (errorField === field) { setErrorField(null); setFormError(""); }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="h-8 w-64 mb-4 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius-sm)" }} />
        <div className="h-96 max-w-4xl animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/staff"
              className="inline-flex items-center gap-1 text-[14px] font-semibold"
              style={{ color: "var(--blue-500)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Staff
            </Link>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            {isEditing ? "Edit Staff Member" : "Add New Staff Member"}
          </h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
            {isEditing ? "Update staff details below" : "Fill in the details to add a new staff member"}
          </p>
        </div>
      </div>

      {/* Global error banner (only when not a field-level error) */}
      {formError && !errorField && (
        <div className="mb-4 px-4 py-3 text-[15px] font-medium max-w-4xl" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca" }}>
          {formError}
        </div>
      )}

      <div className="max-w-4xl space-y-5">
        {/* ─── Role & Identity ───────────────────────────────────────────── */}
        <div className="p-5" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Role &amp; Identity</h2>
          <div className="space-y-4">
            {/* Role */}
            <div>
              <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value, specialization: "", department: "" })}
                className="w-full px-3 py-2 text-[15px]"
                style={inputStyle}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Name *</label>
                <input
                  type="text"
                  data-field="name"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); clearFieldError("name"); }}
                  className="w-full px-3 py-2 text-[15px]"
                  style={errorStyle("name")}
                  placeholder="Full name"
                />
                {errorField === "name" && <p className="text-[12px] mt-1" style={{ color: "#dc2626" }}>{formError}</p>}
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email *</label>
                <input
                  type="email"
                  data-field="email"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); clearFieldError("email"); }}
                  className="w-full px-3 py-2 text-[15px]"
                  style={errorStyle("email")}
                  placeholder="email@clinic.com"
                />
                {errorField === "email" && <p className="text-[12px] mt-1" style={{ color: "#dc2626" }}>{formError}</p>}
              </div>
            </div>

            {/* Phone + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} placeholder="+65 XXXX XXXX" />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Ethnicity <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for SHG fund)</span></label>
              <select value={form.ethnicity} onChange={(e) => setForm({ ...form, ethnicity: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                <option value="">-- Select --</option>
                <option value="chinese">Chinese (CDAC)</option>
                <option value="malay">Malay (MBMF)</option>
                <option value="indian">Indian (SINDA)</option>
                <option value="eurasian">Eurasian (ECF)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Employment Details ──────────────────────────────────────── */}
        <div className="p-5" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Employment Details</h2>
          <div className="space-y-4">
            {/* NRIC/FIN + Employment Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>NRIC/FIN <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for KET)</span></label>
                <input value={form.nricFin} onChange={(e) => setForm({ ...form, nricFin: e.target.value })} placeholder="e.g. S9576543F" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Employment Type</label>
                <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                </select>
              </div>
            </div>

            {/* MOM Work Hours */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Weekly Hours <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(contracted)</span></label>
                <input type="number" value={form.weeklyContractedHours} onChange={(e) => setForm({ ...form, weeklyContractedHours: e.target.value })} step="0.5" placeholder="44" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                {parseFloat(form.weeklyContractedHours) < 35 && <p className="text-[11px] mt-1" style={{ color: "#7c3aed" }}>Part-time (&lt;35 hrs/wk)</p>}
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Working Days/Week</label>
                <input type="number" value={form.workingDaysPerWeek} onChange={(e) => setForm({ ...form, workingDaysPerWeek: e.target.value })} step="0.5" placeholder="5.5" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="isWorkman" checked={form.isWorkman} onChange={(e) => setForm({ ...form, isWorkman: e.target.checked })} />
                <label htmlFor="isWorkman" className="text-[13px] font-semibold" style={{ color: "var(--grey-700)" }}>Workman <span className="font-normal text-[11px]" style={{ color: "var(--grey-400)" }}>(manual labour)</span></label>
              </div>
            </div>

            {/* Job Title + Main Duties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Job Title <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for KET)</span></label>
                <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. Administrative Assistant" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Main Duties <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for KET)</span></label>
                <input value={form.mainDuties} onChange={(e) => setForm({ ...form, mainDuties: e.target.value })} placeholder="e.g. Administrative duties, filing" className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
            </div>

            {/* Department + Date of Joining */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Department{isClinical ? " *" : ""}</label>
                <select
                  data-field="department"
                  value={form.department}
                  onChange={(e) => { setForm({ ...form, department: e.target.value }); clearFieldError("department"); }}
                  className="w-full px-3 py-2 text-[15px]"
                  style={errorStyle("department")}
                >
                  <option value="">-- Select --</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {errorField === "department" && <p className="text-[12px] mt-1" style={{ color: "#dc2626" }}>{formError}</p>}
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Date of Joining</label>
                <input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
            </div>

            {/* Branch (multi-branch clinics only — control hidden if 0 or 1 branch) */}
            {branches.length > 1 && (
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>
                  Primary Branch
                  <span className="font-normal text-[12px] ml-1" style={{ color: "var(--grey-400)" }}>(empty = floats across all branches)</span>
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                >
                  <option value="">-- Floating (all branches) --</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.isMainBranch ? " (Main)" : ""}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ─── Personal & Residency ────────────────────────────────────── */}
        <div className="p-5" style={cardStyle}>
          <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Personal &amp; Residency</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Date of Birth</label>
                <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Residency Status <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for CPF)</span></label>
                <select value={form.residencyStatus} onChange={(e) => setForm({ ...form, residencyStatus: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                  <option value="">-- Select --</option>
                  <option value="singaporean">Singaporean</option>
                  <option value="pr">Permanent Resident (PR)</option>
                  <option value="foreigner">Foreigner</option>
                </select>
              </div>
            </div>

            {form.residencyStatus === "pr" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>PR Effective Date <span className="font-normal text-[12px]" style={{ color: "var(--grey-400)" }}>(for graduated CPF rates)</span></label>
                  <input type="date" value={form.prStartDate} onChange={(e) => setForm({ ...form, prStartDate: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Clinical Details (doctor/therapist only) ────────────────── */}
        {isClinical && (
          <div className="p-5" style={cardStyle}>
            <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Clinical Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Specialization *</label>
                <select
                  data-field="specialization"
                  value={form.specialization}
                  onChange={(e) => { setForm({ ...form, specialization: e.target.value }); clearFieldError("specialization"); }}
                  className="w-full px-3 py-2 text-[15px]"
                  style={errorStyle("specialization")}
                >
                  <option value="">-- Select --</option>
                  {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errorField === "specialization" && <p className="text-[12px] mt-1" style={{ color: "#dc2626" }}>{formError}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>{form.role === "therapist" ? "Therapy" : "Consultation"} Fee (SGD)</label>
                  <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} placeholder="0" min="0" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Slot Duration</label>
                  <select value={form.slotDuration} onChange={(e) => setForm({ ...form, slotDuration: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                    {SLOT_DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>

              {/* Schedule builder */}
              <div>
                <label className="block text-[14px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Weekly Schedule</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {DAYS.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDay(d.key)}
                      className="px-3 py-1.5 text-[13px] font-bold transition-all"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: form.schedule[d.key] ? "var(--blue-500)" : "var(--grey-100)",
                        color: form.schedule[d.key] ? "white" : "var(--grey-600)",
                        border: form.schedule[d.key] ? "1px solid var(--blue-500)" : "1px solid var(--grey-300)",
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {DAYS.filter((d) => form.schedule[d.key]).map((d) => (
                  <div key={d.key} className="mb-2 p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                    <div className="text-[13px] font-bold mb-1.5" style={{ color: "var(--grey-700)" }}>{d.label}</div>
                    {(form.schedule[d.key] || []).map((block, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1.5">
                        <input type="time" value={block.start} onChange={(e) => updateBlock(d.key, idx, "start", e.target.value)} className="px-2 py-1 text-[14px]" style={inputStyle} />
                        <span className="text-[13px]" style={{ color: "var(--grey-500)" }}>to</span>
                        <input type="time" value={block.end} onChange={(e) => updateBlock(d.key, idx, "end", e.target.value)} className="px-2 py-1 text-[14px]" style={inputStyle} />
                        {(form.schedule[d.key] || []).length > 1 && (
                          <button type="button" onClick={() => removeBlock(d.key, idx)} className="text-[13px] font-semibold" style={{ color: "var(--red)" }}>Remove</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addBlock(d.key)} className="text-[13px] font-semibold mt-0.5" style={{ color: "var(--blue-500)" }}>+ Add time block</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Separation Details (edit mode only) ─────────────────────── */}
        {isEditing && (
          <div className="p-5" style={cardStyle}>
            <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Separation Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Resignation Date</label>
                  <input type="date" value={form.resignationDate} onChange={(e) => setForm({ ...form, resignationDate: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Last Working Date</label>
                  <input type="date" value={form.lastWorkingDate} onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Reason for Leaving</label>
                <input type="text" value={form.resignationReason} onChange={(e) => setForm({ ...form, resignationReason: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} placeholder="e.g., Personal reasons, Career change..." />
              </div>
            </div>
          </div>
        )}

        {/* ─── Invite (create mode only) ───────────────────────────────── */}
        {!isEditing && (
          <div className="p-5" style={cardStyle}>
            <h2 className="mb-4 pb-3" style={{ ...sectionTitleStyle, borderBottom: "1px solid var(--grey-200)" }}>Account Access</h2>
            <div className="flex items-center gap-3 p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.sendInvite}
                  onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--blue-500)]"></div>
              </label>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>Send email invite</p>
                <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>Staff member will receive an email to set their password</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Footer actions ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2 pb-6">
          <Link
            href="/admin/staff"
            className="inline-flex items-center justify-center px-4 py-2 text-[15px] font-semibold"
            style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
          >
            {saving ? "Saving..." : isEditing ? "Update Staff" : "Add Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}
