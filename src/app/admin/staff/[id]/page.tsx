"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  staffIdNumber: string | null;
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
  status: string;
  invitePending: boolean;
  appointmentCount: number;
  lastLogin: string | null;
  createdAt: string;
}

interface ScheduleBlock { start: string; end: string }
type WeeklySchedule = Record<string, ScheduleBlock[]>;

interface EditForm {
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
  schedule: WeeklySchedule;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { value: "doctor", label: "Doctor", prefix: "D", color: "#2d6a4f", bg: "#f0faf4" },
  { value: "therapist", label: "Therapist", prefix: "T", color: "#059669", bg: "#ecfdf5" },
  { value: "pharmacist", label: "Pharmacist", prefix: "P", color: "#7c3aed", bg: "#faf5ff" },
  { value: "receptionist", label: "Receptionist", prefix: "R", color: "#37845e", bg: "#f0faf4" },
  { value: "admin", label: "Admin", prefix: "A", color: "#dc2626", bg: "#fef2f2" },
  { value: "staff", label: "Staff", prefix: "S", color: "#78716c", bg: "#fafaf9" },
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

const GENDERS = ["Male", "Female", "Other"];
const ETHNICITIES = ["Chinese", "Malay", "Indian", "Eurasian", "Others"];
const RESIDENCY_STATUSES = ["Citizen", "PR", "EP", "S Pass", "Work Permit", "DP", "Student Pass", "Others"];
const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "locum", label: "Locum" },
];

// ─── Design Tokens ──────────────────────────────────────────────────────────
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function getRoleMeta(role: string) {
  return ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[5];
}

function fmtDate(d: string | null): string {
  if (!d) return "--";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: string | null): string {
  if (!d) return "Never";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtEmploymentType(t: string): string {
  const found = EMPLOYMENT_TYPES.find((e) => e.value === t);
  return found ? found.label : t;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function staffToForm(s: Staff): EditForm {
  let schedule: WeeklySchedule = {};
  try { schedule = JSON.parse(s.schedule || "{}"); } catch { /* ignore */ }
  return {
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
    schedule,
  };
}

function parseSchedule(scheduleStr: string): WeeklySchedule {
  try { return JSON.parse(scheduleStr || "{}"); } catch { return {}; }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Resend invite
  const [resending, setResending] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Fetch staff ──────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Staff member not found" : "Failed to load staff member");
        return;
      }
      const data = await res.json();
      setStaff(data);
      setError("");
    } catch {
      setError("Failed to load staff member");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ─── Edit handlers ────────────────────────────────────────────────────
  const startEdit = () => {
    if (!staff) return;
    setForm(staffToForm(staff));
    setFormError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(null);
    setFormError("");
  };

  const saveEdit = async () => {
    if (!form || !staff) return;
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
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
        nricFin: form.nricFin || null,
        jobTitle: form.jobTitle || null,
        mainDuties: form.mainDuties || null,
        employmentType: form.employmentType,
        isWorkman: form.isWorkman,
        weeklyContractedHours: form.weeklyContractedHours,
        workingDaysPerWeek: form.workingDaysPerWeek,
        department: form.department || null,
      };
      if (CLINICAL_ROLES.includes(form.role)) {
        body.specialization = form.specialization || null;
        body.consultationFee = form.consultationFee ? Number(form.consultationFee) : null;
        body.slotDuration = Number(form.slotDuration) || 30;
        body.schedule = JSON.stringify(form.schedule);
      }
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setFormError(err.error || "Save failed");
        return;
      }
      showToast("Staff member updated successfully");
      setEditing(false);
      setForm(null);
      fetchStaff();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Password handler ─────────────────────────────────────────────────
  const handleSetPassword = async () => {
    setPasswordError("");
    if (newPassword.length < 12) {
      setPasswordError("Password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        setPasswordError(err.error || "Failed to set password.");
        return;
      }
      showToast("Password updated successfully");
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error.");
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Resend invite handler ────────────────────────────────────────────
  const handleResendInvite = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invite_pending" }),
      });
      if (res.ok) {
        showToast("Invite resent successfully");
        fetchStaff();
      } else {
        showToast("Failed to resend invite", "err");
      }
    } catch {
      showToast("Network error", "err");
    } finally {
      setResending(false);
    }
  };

  // ─── Schedule helper for edit ─────────────────────────────────────────
  const updateScheduleBlock = (day: string, idx: number, field: "start" | "end", value: string) => {
    if (!form) return;
    const schedule = { ...form.schedule };
    const blocks = [...(schedule[day] || [])];
    blocks[idx] = { ...blocks[idx], [field]: value };
    schedule[day] = blocks;
    setForm({ ...form, schedule });
  };

  const addScheduleBlock = (day: string) => {
    if (!form) return;
    const schedule = { ...form.schedule };
    const blocks = [...(schedule[day] || [])];
    blocks.push({ start: "09:00", end: "17:00" });
    schedule[day] = blocks;
    setForm({ ...form, schedule });
  };

  const removeScheduleBlock = (day: string, idx: number) => {
    if (!form) return;
    const schedule = { ...form.schedule };
    const blocks = [...(schedule[day] || [])];
    blocks.splice(idx, 1);
    if (blocks.length === 0) {
      delete schedule[day];
    } else {
      schedule[day] = blocks;
    }
    setForm({ ...form, schedule });
  };

  // ─── Loading / Error states ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--grey-300)", borderTopColor: "var(--blue-500)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--grey-600)", fontSize: 15 }}>Loading staff profile...</p>
        </div>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>&#x26A0;</p>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 8 }}>{error || "Staff member not found"}</h2>
          <p style={{ color: "var(--grey-600)", fontSize: 15, marginBottom: 20 }}>The requested staff profile could not be loaded.</p>
          <button
            onClick={() => router.push("/admin/staff")}
            style={{ padding: "8px 20px", background: "var(--blue-500)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Staff List
          </button>
        </div>
      </div>
    );
  }

  const roleMeta = getRoleMeta(staff.role);
  const isClinical = CLINICAL_ROLES.includes(staff.role);
  const schedule = parseSchedule(staff.schedule);
  const specList = staff.role === "doctor" ? DOCTOR_SPECIALIZATIONS : THERAPIST_SPECIALIZATIONS;

  // ─── Render helpers ───────────────────────────────────────────────────
  const renderField = (label: string, value: string | null | undefined, editKey?: keyof EditForm, options?: { type?: string; selectOptions?: { value: string; label: string }[] | string[]; textarea?: boolean }) => {
    const displayValue = value || "--";
    if (!editing || !form || !editKey) {
      return (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
          <p style={{ fontSize: 15, color: "var(--grey-900)", margin: 0 }}>{displayValue}</p>
        </div>
      );
    }

    const val = form[editKey] as string;

    if (options?.selectOptions) {
      const opts = options.selectOptions;
      return (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
          <select
            value={val}
            onChange={(e) => setForm({ ...form, [editKey]: e.target.value })}
            style={{ ...inputStyle, width: "100%", padding: "6px 8px" }}
          >
            <option value="">-- Select --</option>
            {opts.map((o) => {
              const optVal = typeof o === "string" ? o : o.value;
              const optLabel = typeof o === "string" ? o : o.label;
              return <option key={optVal} value={optVal}>{optLabel}</option>;
            })}
          </select>
        </div>
      );
    }

    if (options?.textarea) {
      return (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
          <textarea
            value={val}
            onChange={(e) => setForm({ ...form, [editKey]: e.target.value })}
            rows={3}
            style={{ ...inputStyle, width: "100%", padding: "6px 8px", resize: "vertical" }}
          />
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>{label}</label>
        <input
          type={options?.type || "text"}
          value={val}
          onChange={(e) => setForm({ ...form, [editKey]: e.target.value })}
          style={{ ...inputStyle, width: "100%", padding: "6px 8px" }}
        />
      </div>
    );
  };

  // Status badge
  const statusColor = staff.isActive
    ? { color: "var(--green)", bg: "var(--green-light)" }
    : { color: "var(--red)", bg: "var(--red-light)" };
  const statusLabel = staff.status === "invite_pending" ? "Invite Pending"
    : staff.status === "invite_expired" ? "Invite Expired"
    : staff.isActive ? "Active" : "Inactive";

  const showResendInvite = staff.status === "invite_pending" || staff.status === "invite_expired";

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[200] px-4 py-3 rounded shadow-lg yoda-slide-in"
          style={{
            background: toast.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: toast.type === "ok" ? "#2e7d32" : "var(--red)",
            border: `1px solid ${toast.type === "ok" ? "#a5d6a7" : "#ef9a9a"}`,
          }}
        >
          <p className="text-[15px] font-semibold">{toast.msg}</p>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
          <div style={{ ...cardStyle, padding: 28, width: 420, maxWidth: "90vw" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 16 }}>Set Password for {staff.name}</h3>
            {passwordError && (
              <div style={{ background: "var(--red-light)", color: "var(--red)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 14, marginBottom: 12 }}>
                {passwordError}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-700)", display: "block", marginBottom: 4 }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 12 characters"
                  style={{ ...inputStyle, width: "100%", padding: "8px 40px 8px 10px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--grey-500)", fontSize: 13 }}
                >
                  {showNewPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-700)", display: "block", marginBottom: 4 }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={{ ...inputStyle, width: "100%", padding: "8px 40px 8px 10px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--grey-500)", fontSize: 13 }}
                >
                  {showConfirmPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowPasswordModal(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                style={{ padding: "8px 16px", background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetPassword}
                disabled={passwordSaving}
                style={{ padding: "8px 16px", background: "var(--blue-500)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: passwordSaving ? 0.6 : 1 }}
              >
                {passwordSaving ? "Saving..." : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => router.push("/admin/staff")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--blue-500)", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0 }}
      >
        &#8592; Back to Staff List
      </button>

      {/* ═══ Header Card ═══ */}
      <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: roleMeta.bg, color: roleMeta.color,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, flexShrink: 0,
            border: `2px solid ${roleMeta.color}22`,
          }}>
            {getInitials(staff.name)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              {editing && form ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ ...inputStyle, fontSize: 24, fontWeight: 700, padding: "2px 8px", color: "var(--grey-900)" }}
                />
              ) : (
                <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>{staff.name}</h1>
              )}
              <span style={{
                display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                background: roleMeta.bg, color: roleMeta.color,
              }}>
                {roleMeta.label}
              </span>
              <span style={{
                display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 13, fontWeight: 600,
                background: statusColor.bg, color: statusColor.color,
              }}>
                {statusLabel}
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 15, color: "var(--grey-600)", marginBottom: 4 }}>
              {editing && form ? (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    &#9993;
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      style={{ ...inputStyle, padding: "2px 6px", fontSize: 14 }}
                    />
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    &#9742;
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      style={{ ...inputStyle, padding: "2px 6px", fontSize: 14 }}
                      placeholder="Phone"
                    />
                  </span>
                </>
              ) : (
                <>
                  <span>&#9993; {staff.email}</span>
                  {staff.phone && <span>&#9742; {staff.phone}</span>}
                </>
              )}
            </div>

            {staff.staffIdNumber && (
              <p style={{ fontSize: 13, color: "var(--grey-500)", margin: "4px 0 0" }}>Staff ID: {staff.staffIdNumber}</p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  style={{ padding: "8px 16px", background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{ padding: "8px 16px", background: "var(--blue-500)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEdit}
                  style={{ padding: "8px 16px", background: "var(--blue-500)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Edit
                </button>
                <button
                  onClick={() => { setShowPasswordModal(true); setPasswordError(""); setNewPassword(""); setConfirmPassword(""); }}
                  style={{ padding: "8px 16px", background: "var(--grey-100)", color: "var(--grey-700)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Set Password
                </button>
                {showResendInvite && (
                  <button
                    onClick={handleResendInvite}
                    disabled={resending}
                    style={{ padding: "8px 16px", background: "var(--orange-light)", color: "var(--orange)", border: "1px solid var(--orange)", borderRadius: "var(--radius-sm)", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: resending ? 0.6 : 1 }}
                  >
                    {resending ? "Resending..." : "Resend Invite"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {formError && (
          <div style={{ marginTop: 12, background: "var(--red-light)", color: "var(--red)", padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 14 }}>
            {formError}
          </div>
        )}
      </div>

      {/* ═══ Overview Cards ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        {[
          { label: "Appointments", value: String(staff.appointmentCount ?? 0), sub: "Total", accent: "var(--blue-500)" },
          { label: "Joined", value: fmtDate(staff.dateOfJoining || staff.createdAt), sub: staff.dateOfJoining ? "" : "Account created", accent: "var(--green)" },
          { label: "Employment", value: fmtEmploymentType(staff.employmentType), sub: staff.weeklyContractedHours ? `${staff.weeklyContractedHours}h / week` : "", accent: "#7c3aed" },
          { label: "Last Login", value: fmtDateTime(staff.lastLogin), sub: "", accent: "var(--orange)" },
        ].map((c) => (
          <div key={c.label} style={{ ...cardStyle, padding: "18px 20px" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>{c.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: c.accent, margin: "0 0 2px" }}>{c.value}</p>
            {c.sub && <p style={{ fontSize: 13, color: "var(--grey-500)", margin: 0 }}>{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* ═══ Details Section ═══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 20 }}>
        {/* Personal Info */}
        <div style={{ ...cardStyle, padding: "22px 24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 18, marginTop: 0 }}>Personal Information</h2>
          {renderField("Gender", staff.gender, "gender", { selectOptions: GENDERS })}
          {renderField("Date of Birth", fmtDate(staff.dateOfBirth), "dateOfBirth", { type: "date" })}
          {renderField("Ethnicity", staff.ethnicity, "ethnicity", { selectOptions: ETHNICITIES })}
          {renderField("Residency Status", staff.residencyStatus, "residencyStatus", { selectOptions: RESIDENCY_STATUSES })}
          {staff.residencyStatus === "PR" && renderField("PR Start Date", fmtDate(staff.prStartDate), "prStartDate", { type: "date" })}
          {renderField("NRIC / FIN", staff.nricFin, "nricFin")}
        </div>

        {/* Employment Info */}
        <div style={{ ...cardStyle, padding: "22px 24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 18, marginTop: 0 }}>Employment Information</h2>
          {renderField("Job Title", staff.jobTitle, "jobTitle")}
          {renderField("Main Duties", staff.mainDuties, "mainDuties", { textarea: true })}
          {renderField("Department", staff.department, "department", { selectOptions: DEPARTMENTS })}
          {renderField("Employment Type", fmtEmploymentType(staff.employmentType), "employmentType", { selectOptions: EMPLOYMENT_TYPES })}
          {renderField("Date of Joining", fmtDate(staff.dateOfJoining), "dateOfJoining", { type: "date" })}

          {/* Workman toggle in edit mode */}
          {editing && form ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 4 }}>Workman (MOM)</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "var(--grey-900)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isWorkman}
                  onChange={(e) => setForm({ ...form, isWorkman: e.target.checked })}
                />
                Yes, this employee is a Workman
              </label>
            </div>
          ) : (
            renderField("Workman (MOM)", staff.isWorkman ? "Yes" : "No")
          )}

          {renderField("Contracted Hours / Week", staff.weeklyContractedHours ? `${staff.weeklyContractedHours}h` : "--", "weeklyContractedHours", { type: "number" })}
          {renderField("Working Days / Week", staff.workingDaysPerWeek ? String(staff.workingDaysPerWeek) : "--", "workingDaysPerWeek", { type: "number" })}
        </div>
      </div>

      {/* ═══ Clinical Section ═══ */}
      {isClinical && (
        <div style={{ ...cardStyle, padding: "22px 24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 18, marginTop: 0 }}>Clinical Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 20 }}>
            <div>
              {renderField("Specialization", staff.specialization, "specialization", { selectOptions: specList })}
              {renderField("Consultation Fee", staff.consultationFee !== null ? `$${staff.consultationFee}` : "--", "consultationFee", { type: "number" })}
              {renderField("Slot Duration", staff.slotDuration ? `${staff.slotDuration} min` : "--", "slotDuration", { selectOptions: SLOT_DURATIONS.map((d) => ({ value: String(d), label: `${d} min` })) })}
            </div>

            {/* Weekly Schedule */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--grey-500)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 10 }}>Weekly Schedule</label>
              {editing && form ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DAYS.map(({ key, label }) => {
                    const blocks = form.schedule[key] || [];
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-700)", minWidth: 36, paddingTop: 6 }}>{label}</span>
                        <div style={{ flex: 1 }}>
                          {blocks.map((b, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                              <input type="time" value={b.start} onChange={(e) => updateScheduleBlock(key, i, "start", e.target.value)} style={{ ...inputStyle, padding: "3px 6px", fontSize: 13 }} />
                              <span style={{ color: "var(--grey-500)", fontSize: 13 }}>-</span>
                              <input type="time" value={b.end} onChange={(e) => updateScheduleBlock(key, i, "end", e.target.value)} style={{ ...inputStyle, padding: "3px 6px", fontSize: 13 }} />
                              <button onClick={() => removeScheduleBlock(key, i)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 16, padding: "0 4px" }} title="Remove">&#10005;</button>
                            </div>
                          ))}
                          <button
                            onClick={() => addScheduleBlock(key)}
                            style={{ background: "none", border: "none", color: "var(--blue-500)", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }}
                          >
                            + Add block
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {DAYS.map(({ key, label }) => {
                    const blocks = schedule[key];
                    if (!blocks || blocks.length === 0) return null;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-700)", minWidth: 36 }}>{label}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {blocks.map((b, i) => (
                            <span
                              key={i}
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: "var(--radius-sm)",
                                background: "var(--blue-50)",
                                color: "var(--blue-600)",
                                fontSize: 13,
                                fontWeight: 500,
                                border: "1px solid var(--blue-200)",
                              }}
                            >
                              {b.start}-{b.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(schedule).length === 0 && (
                    <p style={{ color: "var(--grey-500)", fontSize: 14, margin: 0 }}>No schedule configured</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Role edit (only in edit mode) ═══ */}
      {editing && form && (
        <div style={{ ...cardStyle, padding: "22px 24px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 18, marginTop: 0 }}>Role Settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            {renderField("Role", roleMeta.label, "role", { selectOptions: ALL_ROLES.map((r) => ({ value: r.value, label: r.label })) })}
          </div>
        </div>
      )}

      {/* ═══ Tabs / Sub-pages Navigation ═══ */}
      <div style={{ ...cardStyle, padding: "16px 24px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", marginBottom: 14, marginTop: 0 }}>More</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "Documents", href: `/admin/staff/${id}/documents`, icon: "\uD83D\uDCC4" },
            { label: "Leave", href: `/admin/staff/${id}/leave`, icon: "\uD83C\uDFD6\uFE0F" },
            { label: "Performance", href: `/admin/staff/${id}/performance`, icon: "\uD83D\uDCC8" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.href)}
              style={{
                padding: "10px 20px",
                background: "var(--grey-100)",
                color: "var(--grey-700)",
                border: "1px solid var(--grey-300)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--blue-50)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--blue-600)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--blue-200)"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--grey-100)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--grey-700)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--grey-300)"; }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
