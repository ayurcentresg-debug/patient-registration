"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Constants ──────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
  "General Physician", "Cardiologist", "Dermatologist", "Orthopedic", "Pediatrician",
  "ENT", "Ophthalmologist", "Gynecologist", "Neurologist", "Psychiatrist", "Dentist", "Other",
];

const DEPARTMENTS = [
  "General Medicine", "Cardiology", "Dermatology", "Orthopedics", "Pediatrics",
  "ENT", "Ophthalmology", "Gynecology", "Neurology", "Psychiatry", "Dental", "Other",
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Types ──────────────────────────────────────────────────────────────────
interface TimeBlock {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  blocks: TimeBlock[];
}

type WeeklySchedule = Record<string, DaySchedule>;

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  phone: string | null;
  email: string | null;
  consultationFee: number | null;
  slotDuration: number | null;
  status: string;
  weeklySchedule: WeeklySchedule | null;
  createdAt: string;
  appointments: Array<{
    id: string;
    date: string;
    time: string;
    patientName: string;
    reason: string | null;
    status: string;
  }>;
}

// ─── YODA Styles ────────────────────────────────────────────────────────────
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "15px" };
const inputErrorStyle = { ...inputStyle, border: "1px solid var(--red)", background: "#fff5f5" };
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)" as const, boxShadow: "var(--shadow-card)" as const };
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };
const labelStyle = { color: "var(--grey-600)", fontSize: "15px", fontWeight: 400 as const };
const chipBase = "inline-flex px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide";

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{error}</p>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 text-[15px] font-semibold yoda-slide-in" role="alert"
      style={{ background: type === "success" ? "var(--green)" : "var(--red)", color: "#fff", borderRadius: "var(--radius-sm)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 260 }}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {type === "success" ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">&times;</button>
    </div>
  );
}

/* Practo-style profile row: right-aligned label with colon */
function ProfileRow({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  return (
    <tr>
      <td className="py-[8px] pr-4 text-[15px] font-normal text-right whitespace-nowrap align-top" style={{ color: "var(--grey-600)", width: 180 }}>{label} :</td>
      <td className="py-[8px] pl-2 text-[15px] font-medium align-top" style={{ color: value ? "var(--grey-900)" : "var(--grey-400)" }}>
        {href && value ? <a href={href} className="hover:underline" style={{ color: "var(--blue-500)" }}>{value}</a> : (value || "\u2014")}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editSlotDuration, setEditSlotDuration] = useState("30");
  const [editStatus, setEditStatus] = useState("active");
  const [editSchedule, setEditSchedule] = useState<WeeklySchedule>({});

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch doctor ─────────────────────────────────────────────────────
  const fetchDoctor = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/doctors/${doctorId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then((data: Doctor) => {
        setDoctor(data);
        populateEditForm(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [doctorId]);

  useEffect(() => { fetchDoctor(); }, [fetchDoctor]);

  function populateEditForm(d: Doctor) {
    setEditName(d.name);
    setEditSpecialization(d.specialization);
    setEditDepartment(d.department);
    setEditPhone(d.phone || "");
    setEditEmail(d.email || "");
    setEditFee(d.consultationFee != null ? String(d.consultationFee) : "");
    setEditSlotDuration(d.slotDuration != null ? String(d.slotDuration) : "30");
    setEditStatus(d.status);
    setEditSchedule(d.weeklySchedule || getDefaultSchedule());
  }

  function getDefaultSchedule(): WeeklySchedule {
    const s: WeeklySchedule = {};
    DAYS.forEach((day) => {
      const isWeekday = day !== "Saturday";
      s[day] = { enabled: isWeekday, blocks: isWeekday ? [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }] : [{ start: "09:00", end: "13:00" }] };
    });
    return s;
  }

  // ─── Validation ───────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!editName.trim()) errors.name = "Doctor name is required";
    if (!editSpecialization) errors.specialization = "Specialization is required";
    if (!editDepartment) errors.department = "Department is required";
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) errors.email = "Invalid email format";
    if (editFee && (isNaN(Number(editFee)) || Number(editFee) < 0)) errors.consultationFee = "Invalid fee";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Schedule handlers ────────────────────────────────────────────────
  function toggleDay(day: string) {
    setEditSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        blocks: !prev[day].enabled && prev[day].blocks.length === 0 ? [{ start: "09:00", end: "17:00" }] : prev[day].blocks,
      },
    }));
  }

  function updateBlock(day: string, index: number, field: "start" | "end", value: string) {
    setEditSchedule((prev) => {
      const blocks = [...prev[day].blocks];
      blocks[index] = { ...blocks[index], [field]: value };
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  }

  function addBlock(day: string) {
    setEditSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], blocks: [...prev[day].blocks, { start: "09:00", end: "17:00" }] },
    }));
  }

  function removeBlock(day: string, index: number) {
    setEditSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], blocks: prev[day].blocks.filter((_, i) => i !== index) },
    }));
  }

  // ─── Update doctor ───────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) {
      setToast({ message: "Please fix the errors below", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: editName.trim(),
        specialization: editSpecialization,
        department: editDepartment,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        consultationFee: editFee ? Number(editFee) : null,
        slotDuration: Number(editSlotDuration),
        status: editStatus,
        weeklySchedule: editSchedule,
      };

      const res = await fetch(`/api/doctors/${doctorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      const updated = await res.json();
      setDoctor(updated);
      setEditing(false);
      setToast({ message: "Doctor updated successfully", type: "success" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update doctor";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete doctor ───────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }
      setToast({ message: "Doctor deleted successfully", type: "success" });
      setTimeout(() => router.push("/doctors"), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete doctor";
      setToast({ message, type: "error" });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
          <div className="h-64 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
          <div className="h-48 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius)" }} />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-6 md:p-8 yoda-fade-in">
        <div className="text-center py-16">
          <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>
            {error || "Doctor not found"}
          </p>
          <Link href="/doctors" className="text-[14px] font-semibold mt-2 inline-block hover:underline" style={{ color: "var(--blue-500)" }}>
            Back to Doctors
          </Link>
        </div>
      </div>
    );
  }

  const schedule = doctor.weeklySchedule || {};

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="mx-4 p-6 w-full max-w-sm yoda-slide-in" style={{ ...cardStyle, boxShadow: "var(--shadow-lg)" }}>
            <h3 className="text-[16px] font-bold mb-2" style={{ color: "var(--grey-900)" }}>Delete Doctor</h3>
            <p className="text-[15px] mb-5" style={{ color: "var(--grey-600)" }}>
              Are you sure you want to delete <strong>{doctor.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-[15px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--red)", borderRadius: "var(--radius-sm)" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/doctors"
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          aria-label="Back to doctors"
        >
          <svg className="w-4 h-4" style={{ color: "var(--grey-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>{doctor.name}</h1>
          <p className="text-[15px]" style={{ color: "var(--grey-600)" }}>{doctor.specialization} &middot; {doctor.department}</p>
        </div>
        <div className="flex items-center gap-2">
          {!editing ? (
            <>
              <button
                onClick={() => { setEditing(true); populateEditForm(doctor); }}
                className="px-4 py-2 text-[15px] font-semibold text-white"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ color: "var(--red)", border: "1px solid var(--red)", borderRadius: "var(--radius-sm)" }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); setFieldErrors({}); }}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Doctor Info ──────────────────────────────────────────── */}
      <div className="p-6 mb-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={sectionTitle}>Doctor Information</h2>
          <span
            className={chipBase}
            style={{
              borderRadius: "var(--radius-sm)",
              background: (editing ? editStatus : doctor.status) === "active" ? "var(--green-light)" : "var(--grey-200)",
              color: (editing ? editStatus : doctor.status) === "active" ? "var(--green)" : "var(--grey-600)",
            }}
          >
            {editing ? editStatus : doctor.status}
          </span>
        </div>

        {!editing ? (
          /* ── View Mode ─── */
          <table className="w-full">
            <tbody>
              <ProfileRow label="Doctor Name" value={doctor.name} />
              <ProfileRow label="Specialization" value={doctor.specialization} />
              <ProfileRow label="Department" value={doctor.department} />
              <ProfileRow label="Phone" value={doctor.phone} href={doctor.phone ? `tel:${doctor.phone}` : undefined} />
              <ProfileRow label="Email" value={doctor.email} href={doctor.email ? `mailto:${doctor.email}` : undefined} />
              <ProfileRow label="Consultation Fee" value={doctor.consultationFee != null ? `$${doctor.consultationFee}` : null} />
              <ProfileRow label="Slot Duration" value={doctor.slotDuration != null ? `${doctor.slotDuration} minutes` : null} />
            </tbody>
          </table>
        ) : (
          /* ── Edit Mode ─── */
          <table className="w-full">
            <tbody>
              {/* Name */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Doctor Name <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <input type="text" value={editName} onChange={(e) => { setEditName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5" style={fieldErrors.name ? inputErrorStyle : inputStyle} />
                  <FieldError error={fieldErrors.name} />
                </td>
              </tr>
              {/* Specialization */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Specialization <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <select value={editSpecialization} onChange={(e) => { setEditSpecialization(e.target.value); setFieldErrors((p) => ({ ...p, specialization: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5" style={fieldErrors.specialization ? inputErrorStyle : inputStyle}>
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <FieldError error={fieldErrors.specialization} />
                </td>
              </tr>
              {/* Department */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Department <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <select value={editDepartment} onChange={(e) => { setEditDepartment(e.target.value); setFieldErrors((p) => ({ ...p, department: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5" style={fieldErrors.department ? inputErrorStyle : inputStyle}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <FieldError error={fieldErrors.department} />
                </td>
              </tr>
              {/* Phone */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Phone :</td>
                <td className="py-[8px] pl-2">
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full max-w-sm px-2.5 py-1.5" style={inputStyle} />
                </td>
              </tr>
              {/* Email */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Email :</td>
                <td className="py-[8px] pl-2">
                  <input type="email" value={editEmail} onChange={(e) => { setEditEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5" style={fieldErrors.email ? inputErrorStyle : inputStyle} />
                  <FieldError error={fieldErrors.email} />
                </td>
              </tr>
              {/* Fee */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Consultation Fee :</td>
                <td className="py-[8px] pl-2">
                  <div className="flex items-center gap-1 max-w-[200px]">
                    <span className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>$</span>
                    <input type="number" value={editFee} onChange={(e) => { setEditFee(e.target.value); setFieldErrors((p) => ({ ...p, consultationFee: "" })); }}
                      className="w-full px-2.5 py-1.5" style={fieldErrors.consultationFee ? inputErrorStyle : inputStyle} min="0" step="0.01" />
                  </div>
                  <FieldError error={fieldErrors.consultationFee} />
                </td>
              </tr>
              {/* Slot Duration */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Slot Duration :</td>
                <td className="py-[8px] pl-2">
                  <select value={editSlotDuration} onChange={(e) => setEditSlotDuration(e.target.value)}
                    className="max-w-[200px] px-2.5 py-1.5" style={inputStyle}>
                    {SLOT_DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </td>
              </tr>
              {/* Status */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Status :</td>
                <td className="py-[8px] pl-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="editStatus" value="active" checked={editStatus === "active"} onChange={() => setEditStatus("active")} />
                      <span className="text-[15px] font-medium" style={{ color: "var(--green)" }}>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="editStatus" value="inactive" checked={editStatus === "inactive"} onChange={() => setEditStatus("inactive")} />
                      <span className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>Inactive</span>
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Weekly Schedule ──────────────────────────────────────── */}
      <div className="p-6 mb-5" style={cardStyle}>
        <h2 className="mb-4" style={sectionTitle}>Weekly Schedule</h2>

        {!editing ? (
          /* ── View Mode: Visual schedule ─── */
          <div className="space-y-2">
            {DAYS.map((day) => {
              const dayData = schedule[day];
              const isEnabled = dayData?.enabled;
              return (
                <div
                  key={day}
                  className="flex items-start gap-4 py-2 px-3"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    background: isEnabled ? "var(--white)" : "var(--grey-50)",
                    border: "1px solid var(--grey-200)",
                  }}
                >
                  <span
                    className="text-[15px] font-semibold w-24 flex-shrink-0 pt-0.5"
                    style={{ color: isEnabled ? "var(--grey-900)" : "var(--grey-400)" }}
                  >
                    {day}
                  </span>
                  {isEnabled && dayData.blocks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dayData.blocks.map((block, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 text-[14px] font-medium"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                        >
                          {formatTime(block.start)} \u2013 {formatTime(block.end)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[14px] pt-0.5" style={{ color: "var(--grey-400)" }}>Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Edit Mode: Interactive schedule ─── */
          <div className="space-y-3">
            {DAYS.map((day) => {
              const daySchedule = editSchedule[day];
              if (!daySchedule) return null;
              return (
                <div
                  key={day}
                  className="p-3"
                  style={{
                    border: "1px solid var(--grey-300)",
                    borderRadius: "var(--radius-sm)",
                    background: daySchedule.enabled ? "var(--white)" : "var(--grey-50)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
                      style={{ background: daySchedule.enabled ? "var(--blue-500)" : "var(--grey-400)" }}
                      role="switch"
                      aria-checked={daySchedule.enabled}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200"
                        style={{ transform: daySchedule.enabled ? "translateX(16px)" : "translateX(0)" }}
                      />
                    </button>
                    <span className="text-[15px] font-semibold w-24" style={{ color: daySchedule.enabled ? "var(--grey-900)" : "var(--grey-500)" }}>
                      {day}
                    </span>
                    {daySchedule.enabled && (
                      <button
                        type="button"
                        onClick={() => addBlock(day)}
                        className="text-[13px] font-semibold px-2 py-0.5"
                        style={{ color: "var(--blue-500)", border: "1px solid var(--blue-500)", borderRadius: "var(--radius-sm)" }}
                      >
                        + Add Block
                      </button>
                    )}
                  </div>
                  {daySchedule.enabled && (
                    <div className="ml-12 space-y-2">
                      {daySchedule.blocks.map((block, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="time" value={block.start} onChange={(e) => updateBlock(day, idx, "start", e.target.value)}
                            className="px-2 py-1 text-[14px]" style={inputStyle} />
                          <span className="text-[14px]" style={{ color: "var(--grey-500)" }}>to</span>
                          <input type="time" value={block.end} onChange={(e) => updateBlock(day, idx, "end", e.target.value)}
                            className="px-2 py-1 text-[14px]" style={inputStyle} />
                          {daySchedule.blocks.length > 1 && (
                            <button type="button" onClick={() => removeBlock(day, idx)}
                              className="w-6 h-6 flex items-center justify-center" style={{ color: "var(--red)" }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upcoming Appointments ────────────────────────────────── */}
      <div className="p-6" style={cardStyle}>
        <h2 className="mb-4" style={sectionTitle}>Upcoming Appointments</h2>

        {doctor.appointments && doctor.appointments.length > 0 ? (
          <div className="overflow-hidden" style={{ border: "1px solid var(--grey-200)", borderRadius: "var(--radius-sm)" }}>
            <table className="w-full">
              <thead style={{ background: "var(--grey-50)", borderBottom: "1px solid var(--grey-200)" }}>
                <tr>
                  <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Date</th>
                  <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Time</th>
                  <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Patient</th>
                  <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Reason</th>
                  <th className="text-left px-4 py-2 text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-600)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {doctor.appointments.map((appt, i) => (
                  <tr key={appt.id} style={{ borderBottom: i < doctor.appointments.length - 1 ? "1px solid var(--grey-200)" : "none" }}>
                    <td className="px-4 py-2.5 text-[15px]" style={{ color: "var(--grey-900)" }}>{formatDate(appt.date)}</td>
                    <td className="px-4 py-2.5 text-[15px]" style={{ color: "var(--grey-800)" }}>{appt.time}</td>
                    <td className="px-4 py-2.5 text-[15px] font-medium" style={{ color: "var(--grey-900)" }}>{appt.patientName}</td>
                    <td className="px-4 py-2.5 text-[15px]" style={{ color: "var(--grey-600)" }}>{appt.reason || "\u2014"}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={chipBase}
                        style={{
                          borderRadius: "var(--radius-sm)",
                          background: appt.status === "confirmed" ? "var(--green-light)" : appt.status === "cancelled" ? "var(--red-light)" : "var(--orange-light)",
                          color: appt.status === "confirmed" ? "var(--green)" : appt.status === "cancelled" ? "var(--red)" : "var(--orange)",
                        }}
                      >
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-pill)" }}>
              <svg className="w-6 h-6" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>No upcoming appointments</p>
          </div>
        )}
      </div>
    </div>
  );
}
