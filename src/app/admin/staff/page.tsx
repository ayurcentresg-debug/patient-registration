"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";
import { PageGuide } from "@/components/HelpTip";

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

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  gender: string;
  specialization: string;
  department: string;
  consultationFee: string;
  slotDuration: string;
  schedule: WeeklySchedule;
  sendInvite: boolean;
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
  name: "", email: "", phone: "", role: "doctor", gender: "",
  specialization: "", department: "", consultationFee: "", slotDuration: "30",
  schedule: {}, sendInvite: false,
};

// ─── Design Tokens (YODA) ───────────────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [passwordModal, setPasswordModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStaff = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/staff?${params}`);
      if (res.ok) setStaff(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // ─── Form handlers ─────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (s: Staff) => {
    let schedule: WeeklySchedule = {};
    try { schedule = JSON.parse(s.schedule || "{}"); } catch { /* ignore */ }
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone || "",
      role: s.role,
      gender: s.gender || "",
      specialization: s.specialization || "",
      department: s.department || "",
      consultationFee: s.consultationFee !== null ? String(s.consultationFee) : "",
      slotDuration: String(s.slotDuration || 30),
      schedule,
      sendInvite: false,
    });
    setEditingId(s.id);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormError(""); };

  const isClinical = CLINICAL_ROLES.includes(form.role);

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.trim()) return "Email is required";
    if (isClinical && !form.specialization) return "Specialization is required for clinical roles";
    if (isClinical && !form.department) return "Department is required for clinical roles";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      gender: form.gender || null,
      specialization: isClinical ? form.specialization : null,
      department: isClinical ? form.department : null,
      consultationFee: isClinical && form.consultationFee ? Number(form.consultationFee) : null,
      slotDuration: isClinical ? Number(form.slotDuration) : 30,
      schedule: isClinical ? JSON.stringify(form.schedule) : "{}",
      sendInvite: form.sendInvite,
    };

    try {
      const url = editingId ? `/api/staff/${editingId}` : "/api/staff";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      showToast(editingId ? "Staff member updated" : "Staff member created");
      closeForm();
      fetchStaff();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: Staff) => {
    const newStatus = s.status === "active" ? "inactive" : "active";
    await fetch(`/api/staff/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, isActive: newStatus === "active" }),
    });
    showToast(`${s.name} ${newStatus === "active" ? "activated" : "deactivated"}`);
    fetchStaff();
  };

  // ─── Password handler ────────────────────────────────────────────────
  const openPasswordModal = (s: Staff) => {
    setPasswordModal({ id: s.id, name: s.name });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleSetPassword = async () => {
    if (!passwordModal) return;
    if (newPassword.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return; }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const res = await fetch(`/api/staff/${passwordModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.error || "Failed to set password");
      } else {
        showToast(`Password set for ${passwordModal.name}`);
        setPasswordModal(null);
      }
    } catch {
      setPasswordError("Network error");
    } finally {
      setPasswordSaving(false);
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

  // ─── Role counts ──────────────────────────────────────────────────────
  const roleCounts: Record<string, number> = { all: staff.length };
  staff.forEach((s) => { roleCounts[s.role] = (roleCounts[s.role] || 0) + 1; });

  const specializations = form.role === "therapist" ? THERAPIST_SPECIALIZATIONS : DOCTOR_SPECIALIZATIONS;

  // ─── Render ───────────────────────────────────────────────────────────
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Staff Management</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>Manage doctors, therapists, and clinic staff</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Staff
        </button>
      </div>

      <AdminTabs />

      <PageGuide
        storageKey="admin-staff"
        title="Staff Management Guide"
        subtitle="Add and manage all clinic staff — doctors, therapists, pharmacists, and receptionists."
        steps={[
          { icon: "➕", title: "Add Staff", description: "Click 'Add Staff' to register a new team member. Select their role (Doctor, Therapist, Pharmacist, Receptionist, Admin)." },
          { icon: "🆔", title: "Staff IDs", description: "Each staff member gets a unique ID: D10001 (Doctor), T10001 (Therapist), P10001 (Pharmacist), R10001 (Receptionist), A10001 (Admin)." },
          { icon: "📅", title: "Doctor Schedules", description: "For doctors and therapists, set their weekly schedule and slot duration. This controls available appointment slots." },
          { icon: "📧", title: "Email Invites", description: "Toggle 'Send email invite' when adding staff. They'll receive a link to set their own password and log in." },
          { icon: "🔒", title: "Roles & Permissions", description: "Admin = full access, Doctor/Therapist = clinical access, Receptionist = patient & booking access, Pharmacist = inventory access." },
          { icon: "⚙️", title: "Edit or Deactivate", description: "Click any staff member to edit their details. Set status to Inactive to disable their login without deleting the record." },
        ]}
      />

      {/* Filters card */}
      <div className="p-4 mb-5" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setRoleFilter("all")}
            className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
            style={{
              borderRadius: "var(--radius-pill)",
              border: roleFilter === "all" ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
              background: roleFilter === "all" ? "var(--blue-50)" : "var(--white)",
              color: roleFilter === "all" ? "var(--blue-500)" : "var(--grey-600)",
            }}
          >
            All ({roleCounts.all || 0})
          </button>
          {ALL_ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRoleFilter(r.value)}
              className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
              style={{
                borderRadius: "var(--radius-pill)",
                border: roleFilter === r.value ? `1.5px solid ${r.color}` : "1px solid var(--grey-300)",
                background: roleFilter === r.value ? r.bg : "var(--white)",
                color: roleFilter === r.value ? r.color : "var(--grey-600)",
              }}
            >
              {r.label} ({roleCounts[r.value] || 0})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 text-[15px]"
          style={inputStyle}
        />
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius)" }} />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center" style={cardStyle}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No staff members found</p>
          <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Add your first staff member to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto hide-scrollbar" style={cardStyle}>
          <table className="w-full" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ background: "var(--grey-100)", borderBottom: "1px solid var(--grey-300)" }}>
                <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Staff Member</th>
                <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Role</th>
                <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--grey-600)" }}>Department</th>
                <th className="text-left px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                <th className="text-right px-4 py-3 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, idx) => {
                const meta = getRoleMeta(s.role);
                return (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: idx < staff.length - 1 ? "1px solid var(--grey-200)" : "none",
                      opacity: s.status === "inactive" ? 0.55 : 1,
                    }}
                  >
                    {/* Staff member info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                          style={{ background: meta.color }}
                        >
                          {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold truncate" style={{ color: "var(--grey-900)" }}>{s.name}</p>
                          <p className="text-[13px] truncate" style={{ color: "var(--grey-500)" }}>
                            {s.email}
                            {s.phone && <span className="ml-2">{s.phone}</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                        style={{ background: meta.bg, color: meta.color, borderRadius: "var(--radius-pill)" }}
                      >
                        {meta.label}
                      </span>
                      {s.staffIdNumber && (
                        <span className="block text-[12px] font-mono mt-0.5" style={{ color: "var(--grey-500)" }}>{s.staffIdNumber}</span>
                      )}
                      {s.specialization && (
                        <span className="block text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>{s.specialization}</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {s.department ? (
                        <span className="text-[14px]" style={{ color: "var(--grey-700)" }}>{s.department}</span>
                      ) : (
                        <span className="text-[13px]" style={{ color: "var(--grey-400)" }}>--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                        style={{
                          borderRadius: "var(--radius-pill)",
                          background: s.status === "active" ? "var(--green-light)" : "var(--red-light)",
                          color: s.status === "active" ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {s.status}
                      </span>
                      {s.invitePending && (
                        <span
                          className="inline-flex ml-1 px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide"
                          style={{ borderRadius: "var(--radius-pill)", background: "var(--orange-light)", color: "var(--orange)" }}
                        >
                          Invite Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="px-2.5 py-1 text-[13px] font-semibold transition-colors"
                          style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openPasswordModal(s)}
                          className="px-2.5 py-1 text-[13px] font-semibold transition-colors"
                          style={{ background: "var(--blue-50)", color: "var(--blue-600)", borderRadius: "var(--radius-sm)", border: "1px solid var(--blue-200)" }}
                          title="Set login password"
                        >
                          Password
                        </button>
                        <button
                          onClick={() => toggleStatus(s)}
                          className="px-2.5 py-1 text-[13px] font-semibold transition-colors"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid transparent",
                            background: s.status === "active" ? "var(--red-light)" : "var(--green-light)",
                            color: s.status === "active" ? "var(--red)" : "var(--green)",
                          }}
                        >
                          {s.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Set Password Modal ─────────────────────────────────────────── */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setPasswordModal(null)}>
          <div
            className="bg-white w-full max-w-sm mx-4 yoda-slide-in"
            style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-300)" }}>
              <h3 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Set Password</h3>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                Set login password for <strong>{passwordModal.name}</strong>
              </p>
            </div>

            <div className="px-5 py-5 space-y-3">
              {passwordError && (
                <div className="p-2.5 text-[14px] font-semibold" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca" }}>
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  placeholder="Min 6 characters"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  placeholder="Re-enter password"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSetPassword(); }}
                />
              </div>
            </div>

            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-300)" }}>
              <button
                onClick={() => setPasswordModal(null)}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetPassword}
                disabled={passwordSaving}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--blue-600)", borderRadius: "var(--radius-sm)" }}
              >
                {passwordSaving ? "Saving..." : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={closeForm}>
          <div
            className="bg-white w-full max-w-lg mx-4 mt-12 mb-8 overflow-y-auto yoda-slide-in"
            style={{ maxHeight: "calc(100vh - 80px)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--grey-300)" }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingId ? "Edit Staff Member" : "Add New Staff Member"}
              </h3>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                {editingId ? "Update staff details below" : "Fill in the details to add a new staff member"}
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {formError && (
                <div className="p-3 text-[14px] font-semibold" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca" }}>
                  {formError}
                </div>
              )}

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
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle} placeholder="email@clinic.com" />
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

              {/* Clinical fields */}
              {isClinical && (
                <>
                  <div className="pt-2 pb-1">
                    <p className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Clinical Details</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Specialization *</label>
                      <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                        <option value="">-- Select --</option>
                        {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Department *</label>
                      <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                        <option value="">-- Select --</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
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
                </>
              )}

              {/* Send invite toggle */}
              {!editingId && (
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
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-300)" }}>
              <button
                onClick={closeForm}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
