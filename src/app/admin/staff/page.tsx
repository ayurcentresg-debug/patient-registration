"use client";

import { useEffect, useState, useCallback } from "react";
import AdminTabs from "@/components/AdminTabs";

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
  { value: "doctor", label: "Doctor", prefix: "D", color: "#2563eb", bg: "#dbeafe" },
  { value: "therapist", label: "Therapist", prefix: "T", color: "#059669", bg: "#d1fae5" },
  { value: "pharmacist", label: "Pharmacist", prefix: "P", color: "#7c3aed", bg: "#ede9fe" },
  { value: "receptionist", label: "Receptionist", prefix: "R", color: "#d97706", bg: "#fef3c7" },
  { value: "admin", label: "Admin", prefix: "A", color: "#dc2626", bg: "#fee2e2" },
  { value: "staff", label: "Staff", prefix: "S", color: "#6b7280", bg: "#f3f4f6" },
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

// ─── Helpers ────────────────────────────────────────────────────────────────
function getRoleMeta(role: string) {
  return ALL_ROLES.find((r) => r.value === role) || ALL_ROLES[5];
}

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--grey-300)",
  borderRadius: "var(--radius-sm)",
  fontSize: 13,
  background: "white",
  outline: "none",
};

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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <AdminTabs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-[20px] font-bold" style={{ color: "var(--grey-900)" }}>Staff Management</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>Manage doctors, therapists, and clinic staff</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 text-[13px] font-semibold text-white rounded-lg"
          style={{ background: "var(--blue-500)" }}
        >
          + Add Staff
        </button>
      </div>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setRoleFilter("all")}
          className="px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all"
          style={{
            background: roleFilter === "all" ? "var(--grey-900)" : "var(--grey-100)",
            color: roleFilter === "all" ? "white" : "var(--grey-600)",
          }}
        >
          All ({roleCounts.all || 0})
        </button>
        {ALL_ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleFilter(r.value)}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-full transition-all"
            style={{
              background: roleFilter === r.value ? r.color : r.bg,
              color: roleFilter === r.value ? "white" : r.color,
            }}
          >
            {r.label} ({roleCounts[r.value] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 text-[13px]"
          style={inputStyle}
        />
      </div>

      {/* Staff list */}
      {loading ? (
        <p className="text-[13px] py-8 text-center" style={{ color: "var(--grey-500)" }}>Loading...</p>
      ) : staff.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--grey-500)" }}>
          <p className="text-[14px] font-medium">No staff members found</p>
          <p className="text-[12px] mt-1">Add your first staff member to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {staff.map((s) => {
            const meta = getRoleMeta(s.role);
            return (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl"
                style={{ background: "white", border: "1.5px solid var(--grey-200)", opacity: s.status === "inactive" ? 0.6 : 1 }}
              >
                {/* Avatar + Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                    style={{ background: meta.color }}
                  >
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{s.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                      {s.staffIdNumber && (
                        <span className="text-[10px] font-mono" style={{ color: "var(--grey-400)" }}>{s.staffIdNumber}</span>
                      )}
                      {s.status === "inactive" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#fee2e2", color: "#dc2626" }}>Inactive</span>
                      )}
                      {s.invitePending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#fef3c7", color: "#d97706" }}>Invite Pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{s.email}</span>
                      {s.phone && <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{s.phone}</span>}
                      {s.specialization && <span className="text-[11px]" style={{ color: "var(--grey-500)" }}>{s.specialization}</span>}
                      {s.department && <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--grey-100)", color: "var(--grey-600)" }}>{s.department}</span>}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg"
                    style={{ background: "var(--grey-100)", color: "var(--grey-700)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(s)}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg"
                    style={{
                      background: s.status === "active" ? "#fee2e2" : "#d1fae5",
                      color: s.status === "active" ? "#dc2626" : "#059669",
                    }}
                  >
                    {s.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 mt-8 mb-8 overflow-y-auto"
            style={{ maxHeight: "calc(100vh - 64px)" }}
          >
            <div className="p-5 border-b" style={{ borderColor: "var(--grey-200)" }}>
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                {editingId ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg text-[12px] font-medium" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  {formError}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, specialization: "", department: "" })}
                  className="w-full px-3 py-2 text-[13px]"
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
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder="email@clinic.com" />
                </div>
              </div>

              {/* Phone + Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder="+65 XXXX XXXX" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Gender</label>
                  <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                    <option value="">-- Select --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Clinical fields */}
              {isClinical && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Specialization *</label>
                      <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                        <option value="">-- Select --</option>
                        {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Department *</label>
                      <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                        <option value="">-- Select --</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>{form.role === "therapist" ? "Therapy" : "Consultation"} Fee (SGD)</label>
                      <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle} placeholder="0" min="0" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Slot Duration</label>
                      <select value={form.slotDuration} onChange={(e) => setForm({ ...form, slotDuration: e.target.value })} className="w-full px-3 py-2 text-[13px]" style={inputStyle}>
                        {SLOT_DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Schedule builder */}
                  <div>
                    <label className="block text-[12px] font-semibold mb-2" style={{ color: "var(--grey-700)" }}>Weekly Schedule</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {DAYS.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => toggleDay(d.key)}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all"
                          style={{
                            background: form.schedule[d.key] ? "var(--blue-500)" : "var(--grey-100)",
                            color: form.schedule[d.key] ? "white" : "var(--grey-600)",
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    {DAYS.filter((d) => form.schedule[d.key]).map((d) => (
                      <div key={d.key} className="mb-2 p-2 rounded-lg" style={{ background: "var(--grey-50)" }}>
                        <div className="text-[11px] font-bold mb-1" style={{ color: "var(--grey-700)" }}>{d.label}</div>
                        {(form.schedule[d.key] || []).map((block, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1">
                            <input type="time" value={block.start} onChange={(e) => updateBlock(d.key, idx, "start", e.target.value)} className="px-2 py-1 text-[12px]" style={inputStyle} />
                            <span className="text-[11px]" style={{ color: "var(--grey-400)" }}>to</span>
                            <input type="time" value={block.end} onChange={(e) => updateBlock(d.key, idx, "end", e.target.value)} className="px-2 py-1 text-[12px]" style={inputStyle} />
                            {(form.schedule[d.key] || []).length > 1 && (
                              <button type="button" onClick={() => removeBlock(d.key, idx)} className="text-[11px] text-red-500 font-semibold">Remove</button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => addBlock(d.key)} className="text-[11px] font-semibold mt-1" style={{ color: "var(--blue-500)" }}>+ Add block</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Send invite toggle */}
              {!editingId && (
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--grey-50)" }}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sendInvite}
                      onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--grey-800)" }}>Send email invite</p>
                    <p className="text-[10px]" style={{ color: "var(--grey-500)" }}>Staff member will receive an email to set their password</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex justify-end gap-2" style={{ borderColor: "var(--grey-200)" }}>
              <button onClick={closeForm} className="px-4 py-2 text-[13px] font-semibold rounded-lg" style={{ background: "var(--grey-100)", color: "var(--grey-700)" }}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-[13px] font-semibold text-white rounded-lg"
                style={{ background: saving ? "var(--grey-400)" : "var(--blue-500)" }}
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-[13px] font-semibold text-white shadow-lg z-50"
          style={{ background: toast.type === "ok" ? "#059669" : "#dc2626", animation: "yoda-slide-in-right 0.2s ease" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
