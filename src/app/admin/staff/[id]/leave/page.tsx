"use client";

import { useEffect, useState, useCallback } from "react";
import { useFlash } from "@/components/FlashCardProvider";
import { useParams, useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Leave {
  id: string;
  userId: string;
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  status: string;
  notes: string | null;
  recurring: boolean;
  createdAt: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  staffIdNumber: string | null;
  specialization?: string | null;
}

interface AffectedAppointment {
  id: string;
  date: string;
  time: string;
  status: string;
  patientName: string;
  treatmentName: string | null;
  type: string;
}

interface AvailableDoctor {
  id: string;
  name: string;
  role: string;
  specialization: string | null;
  available: boolean;
}

interface LeaveForm {
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  notes: string;
  status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const LEAVE_TYPES = [
  { value: "leave", label: "Leave", color: "#dc2626", bg: "#fef2f2" },
  { value: "block", label: "Time Block", color: "#d97706", bg: "#fffbeb" },
  { value: "holiday", label: "Clinic Holiday", color: "#7c3aed", bg: "#faf5ff" },
];

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved", color: "#2d6a4f", bg: "#f0faf4" },
  { value: "pending", label: "Pending", color: "#d97706", bg: "#fffbeb" },
  { value: "rejected", label: "Rejected", color: "#dc2626", bg: "#fef2f2" },
];

const TITLE_SUGGESTIONS: Record<string, string[]> = {
  leave: ["Annual Leave", "Sick Leave", "Emergency Leave", "Maternity Leave", "Personal Leave"],
  block: ["Lunch Break", "Training", "Meeting", "Personal Block", "Surgery"],
  holiday: ["Public Holiday", "Clinic Holiday", "Deepavali", "Christmas", "Chinese New Year"],
};

const EMPTY_FORM: LeaveForm = {
  type: "leave",
  title: "",
  startDate: "",
  endDate: "",
  allDay: true,
  startTime: "09:00",
  endTime: "17:00",
  notes: "",
  status: "approved",
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTypeMeta(type: string) {
  return LEAVE_TYPES.find((t) => t.value === type) || LEAVE_TYPES[0];
}

function getStatusMeta(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function StaffLeavePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "pending" | "all">("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const { showFlash } = useFlash();
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"list" | "calendar">("list");
  const [affectedAppts, setAffectedAppts] = useState<AffectedAppointment[]>([]);
  const [showAffectedAlert, setShowAffectedAlert] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignAssignments, setReassignAssignments] = useState<Record<string, string>>({});
  const [reassignDoctors, setReassignDoctors] = useState<Record<string, AvailableDoctor[]>>({});
  const [reassignResult, setReassignResult] = useState<{ reassigned: number; failed: number; errors: Array<{ appointmentId: string; error: string }> } | null>(null);
  const [autoAssigningLeave, setAutoAssigningLeave] = useState(false);


  // ─── Fetch staff info ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStaffMember(data); })
      .catch(() => {});
  }, [id]);

  // ─── Fetch leaves ─────────────────────────────────────────────────────
  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff/${id}/leave`);
      if (res.ok) setLeaves(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // ─── Filtering ────────────────────────────────────────────────────────
  const now = new Date();
  const filtered = leaves.filter((l) => {
    const end = new Date(l.endDate);
    const start = new Date(l.startDate);
    switch (filter) {
      case "upcoming": return end >= now;
      case "past": return end < now;
      case "pending": return l.status === "pending";
      default: return true;
    }
  });

  // ─── Form handlers ───────────────────────────────────────────────────
  const openAdd = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...EMPTY_FORM, startDate: today, endDate: today });
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (l: Leave) => {
    setForm({
      type: l.type,
      title: l.title,
      startDate: l.startDate.split("T")[0],
      endDate: l.endDate.split("T")[0],
      allDay: l.allDay,
      startTime: l.startTime || "09:00",
      endTime: l.endTime || "17:00",
      notes: l.notes || "",
      status: l.status,
    });
    setEditingId(l.id);
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormError(""); };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (!form.startDate) { setFormError("Start date is required"); return; }
    if (!form.endDate) { setFormError("End date is required"); return; }
    if (!form.allDay && (!form.startTime || !form.endTime)) { setFormError("Start time and end time are required for time blocks"); return; }
    if (!form.allDay && form.startTime >= form.endTime) { setFormError("End time must be after start time"); return; }

    setSaving(true);
    setFormError("");

    const payload = {
      type: form.type,
      title: form.title.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      allDay: form.allDay,
      startTime: form.allDay ? null : form.startTime,
      endTime: form.allDay ? null : form.endTime,
      notes: form.notes.trim() || null,
      status: form.status,
    };

    try {
      const url = editingId
        ? `/api/staff/${id}/leave/${editingId}`
        : `/api/staff/${id}/leave`;
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

      showFlash({ type: "success", title: "Success", message: editingId ? "Leave updated" : "Leave created" });
      closeForm();
      fetchLeaves();

      // After creating a NEW leave, check for affected appointments
      if (!editingId && staffMember && ["doctor", "therapist"].includes(staffMember.role)) {
        try {
          const affRes = await fetch(
            `/api/appointments/affected?doctorId=${id}&from=${payload.startDate}&to=${payload.endDate}`
          );
          if (affRes.ok) {
            const affData: AffectedAppointment[] = await affRes.json();
            if (affData.length > 0) {
              setAffectedAppts(affData);
              setShowAffectedAlert(true);
              setReassignAssignments({});
              setReassignDoctors({});
              setReassignResult(null);
            }
          }
        } catch { /* ignore - non-critical */ }
      }
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (leaveId: string) => {
    if (!confirm("Delete this leave entry?")) return;
    try {
      const res = await fetch(`/api/staff/${id}/leave/${leaveId}`, { method: "DELETE" });
      if (res.ok) {
        showFlash({ type: "success", title: "Success", message: "Leave deleted" });
        fetchLeaves();
      } else {
        showFlash({ type: "error", title: "Error", message: "Failed to delete" });
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Network error" });
    }
  };

  // ─── Calendar helpers ─────────────────────────────────────────────────
  const calDays = () => {
    const first = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const startDow = first.getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= lastDay; d++) cells.push(d);
    return cells;
  };

  const getLeavesForDate = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    return leaves.filter((l) => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      // Set time to start/end of day for proper comparison
      s.setHours(0, 0, 0, 0);
      e.setHours(23, 59, 59, 999);
      return date >= s && date <= e && l.status !== "rejected";
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/staff")}
            className="text-[13px] font-semibold mb-2 inline-flex items-center gap-1"
            style={{ color: "var(--blue-500)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Staff List
          </button>
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>
            Leave & Availability
          </h1>
          {staffMember && (
            <p className="text-[15px] mt-0.5" style={{ color: "var(--grey-600)" }}>
              {staffMember.name}
              {staffMember.staffIdNumber && <span className="ml-2 font-mono text-[13px]" style={{ color: "var(--grey-500)" }}>{staffMember.staffIdNumber}</span>}
              {" "} — {staffMember.role}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-white px-5 py-2 text-[15px] font-semibold"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Leave
        </button>
      </div>

      {/* View toggle + Filters */}
      <div className="p-4 mb-5" style={cardStyle}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* View toggle */}
          <div className="flex mr-4" style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", overflow: "hidden" }}>
            <button
              onClick={() => setView("list")}
              className="px-3 py-1 text-[13px] font-semibold"
              style={{
                background: view === "list" ? "var(--blue-500)" : "var(--white)",
                color: view === "list" ? "white" : "var(--grey-600)",
              }}
            >
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className="px-3 py-1 text-[13px] font-semibold"
              style={{
                background: view === "calendar" ? "var(--blue-500)" : "var(--white)",
                color: view === "calendar" ? "white" : "var(--grey-600)",
                borderLeft: "1px solid var(--grey-300)",
              }}
            >
              Calendar
            </button>
          </div>

          {/* Filters */}
          {(["upcoming", "past", "pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-[13px] font-semibold transition-all duration-150"
              style={{
                borderRadius: "var(--radius-pill)",
                border: filter === f ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-300)",
                background: filter === f ? "var(--blue-50)" : "var(--white)",
                color: filter === f ? "var(--blue-500)" : "var(--grey-600)",
                textTransform: "capitalize",
              }}
            >
              {f} ({leaves.filter((l) => {
                const end = new Date(l.endDate);
                switch (f) {
                  case "upcoming": return end >= now;
                  case "past": return end < now;
                  case "pending": return l.status === "pending";
                  default: return true;
                }
              }).length})
            </button>
          ))}
        </div>
      </div>

      {/* ─── Calendar View ──────────────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="mb-5 p-5" style={cardStyle}>
          {/* Calendar navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-3 py-1.5 text-[14px] font-semibold" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
              {MONTHS[calMonth]} {calYear}
            </h3>
            <button onClick={nextMonth} className="px-3 py-1.5 text-[14px] font-semibold" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[12px] font-bold uppercase tracking-wider py-1" style={{ color: "var(--grey-500)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calDays().map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="h-20" />;
              const dayLeaves = getLeavesForDate(day);
              const isToday = isSameDay(new Date(calYear, calMonth, day), new Date());
              return (
                <div
                  key={day}
                  className="h-20 p-1 overflow-hidden"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: isToday ? "2px solid var(--blue-500)" : "1px solid var(--grey-200)",
                    background: dayLeaves.length > 0 ? (dayLeaves.some((l) => l.type === "holiday") ? "#faf5ff" : dayLeaves.some((l) => l.type === "leave") ? "#fef2f2" : "#fffbeb") : "var(--white)",
                  }}
                >
                  <div className="text-[12px] font-semibold" style={{ color: isToday ? "var(--blue-500)" : "var(--grey-700)" }}>
                    {day}
                  </div>
                  {dayLeaves.slice(0, 2).map((l) => {
                    const meta = getTypeMeta(l.type);
                    return (
                      <div
                        key={l.id}
                        className="text-[10px] font-semibold truncate px-1 mt-0.5"
                        style={{
                          color: meta.color,
                          background: meta.bg,
                          borderRadius: "2px",
                        }}
                      >
                        {l.title}
                      </div>
                    );
                  })}
                  {dayLeaves.length > 2 && (
                    <div className="text-[10px] mt-0.5 px-1" style={{ color: "var(--grey-500)" }}>+{dayLeaves.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── List View ──────────────────────────────────────────────────── */}
      {view === "list" && (
        loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-200)", borderRadius: "var(--radius)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center" style={cardStyle}>
            <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--grey-400)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-[16px] font-semibold" style={{ color: "var(--grey-700)" }}>No leave entries found</p>
            <p className="text-[14px] mt-1" style={{ color: "var(--grey-500)" }}>Click "Add Leave" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => {
              const typeMeta = getTypeMeta(l.type);
              const statusMeta = getStatusMeta(l.status);
              const isPast = new Date(l.endDate) < now;
              return (
                <div
                  key={l.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  style={{ ...cardStyle, opacity: isPast ? 0.6 : 1 }}
                >
                  {/* Left: type color bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                        style={{ background: typeMeta.bg, color: typeMeta.color, borderRadius: "var(--radius-pill)" }}
                      >
                        {typeMeta.label}
                      </span>
                      <span
                        className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                        style={{ background: statusMeta.bg, color: statusMeta.color, borderRadius: "var(--radius-pill)" }}
                      >
                        {statusMeta.label}
                      </span>
                      {l.userId === "clinic" && (
                        <span
                          className="inline-flex px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                          style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: "var(--radius-pill)" }}
                        >
                          All Staff
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{l.title}</p>
                    <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>
                      {formatDate(l.startDate)}
                      {l.startDate.split("T")[0] !== l.endDate.split("T")[0] && ` - ${formatDate(l.endDate)}`}
                      {!l.allDay && l.startTime && l.endTime && (
                        <span className="ml-2 font-mono" style={{ color: "var(--grey-500)" }}>{l.startTime} - {l.endTime}</span>
                      )}
                      {l.allDay && <span className="ml-2" style={{ color: "var(--grey-500)" }}>(Full day)</span>}
                    </p>
                    {l.notes && <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>{l.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(l)}
                      className="px-2.5 py-1 text-[13px] font-semibold"
                      style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="px-2.5 py-1 text-[13px] font-semibold"
                      style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid transparent" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ─── Affected Appointments Alert ─────────────────────────────────── */}
      {showAffectedAlert && affectedAppts.length > 0 && (
        <div
          className="p-4 mb-5"
          style={{
            ...cardStyle,
            background: "#fffbeb",
            borderColor: "#fde68a",
          }}
        >
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <p className="text-[15px] font-semibold" style={{ color: "#92400e" }}>
                This staff member has {affectedAppts.length} appointment{affectedAppts.length !== 1 ? "s" : ""} during this leave period
              </p>
              <p className="text-[13px] mt-1" style={{ color: "#a16207" }}>
                These appointments may need to be reassigned to another doctor/therapist.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowReassignModal(true);
                    setShowAffectedAlert(false);
                  }}
                  className="px-4 py-1.5 text-[13px] font-semibold text-white"
                  style={{ background: "#d97706", borderRadius: "var(--radius-sm)" }}
                >
                  Reassign Appointments
                </button>
                <button
                  onClick={() => setShowAffectedAlert(false)}
                  className="px-4 py-1.5 text-[13px] font-semibold"
                  style={{ background: "var(--white)", color: "var(--grey-600)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reassignment Modal ───────────────────────────────────────────── */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setShowReassignModal(false)}>
          <div
            className="bg-white w-full max-w-3xl mx-4 mt-8 mb-8 overflow-y-auto yoda-slide-in"
            style={{ maxHeight: "calc(100vh - 64px)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--grey-300)" }}>
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
                  Reassign Appointments
                </h3>
                <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                  {affectedAppts.length} appointment{affectedAppts.length !== 1 ? "s" : ""} to reassign
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setAutoAssigningLeave(true);
                    const newAssignments: Record<string, string> = {};
                    for (const appt of affectedAppts) {
                      try {
                        const specParam = staffMember?.specialization
                          ? `&specialization=${encodeURIComponent(staffMember.specialization)}`
                          : "";
                        const res = await fetch(
                          `/api/doctors/available?date=${appt.date}&time=${appt.time}&excludeDoctorId=${id}${specParam}`
                        );
                        if (res.ok) {
                          const data: AvailableDoctor[] = await res.json();
                          setReassignDoctors((prev) => ({ ...prev, [appt.id]: data }));
                          const best = data.find((d) => d.available);
                          if (best) newAssignments[appt.id] = best.id;
                        }
                      } catch { /* skip */ }
                    }
                    setReassignAssignments((prev) => ({ ...prev, ...newAssignments }));
                    setAutoAssigningLeave(false);
                    const assigned = Object.keys(newAssignments).length;
                    const unassigned = affectedAppts.length - assigned;
                    if (unassigned > 0) {
                      showFlash({ type: "error", title: "Error", message: `Auto-assigned ${assigned}. ${unassigned} need manual handling.` });
                    } else {
                      showFlash({ type: "success", title: "Success", message: `Auto-assigned all ${assigned} appointments` });
                    }
                  }}
                  disabled={autoAssigningLeave}
                  className="px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
                  style={{ background: "#ecfdf5", color: "#059669", borderRadius: "var(--radius-sm)", border: "1px solid #a7f3d0" }}
                >
                  {autoAssigningLeave ? "Assigning..." : "Auto-assign"}
                </button>
              </div>
            </div>

            {/* Result banner */}
            {reassignResult && (
              <div
                className="mx-5 mt-4 p-3"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: reassignResult.failed > 0 ? "#fef2f2" : "#e8f5e9",
                  border: `1px solid ${reassignResult.failed > 0 ? "#fecaca" : "#a5d6a7"}`,
                }}
              >
                <p className="text-[14px] font-semibold" style={{ color: reassignResult.failed > 0 ? "#dc2626" : "#2e7d32" }}>
                  {reassignResult.reassigned} reassigned, {reassignResult.failed} failed
                </p>
                {reassignResult.errors.map((e, i) => (
                  <p key={i} className="text-[12px] mt-1" style={{ color: "#dc2626" }}>{e.error}</p>
                ))}
              </div>
            )}

            {/* Appointment list */}
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {affectedAppts.map((appt) => (
                <div
                  key={appt.id}
                  className="p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  style={{
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--grey-200)",
                    background: reassignAssignments[appt.id] ? "#f0faf4" : "var(--white)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                      {appt.patientName}
                    </p>
                    <p className="text-[13px]" style={{ color: "var(--grey-600)" }}>
                      {new Date(appt.date + "T00:00:00").toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })}
                      {" "}at {appt.time}
                      <span
                        className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{ borderRadius: "var(--radius-pill)", background: "#eff6ff", color: "#2563eb" }}
                      >
                        {appt.status}
                      </span>
                    </p>
                    {appt.treatmentName && (
                      <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>{appt.treatmentName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {reassignDoctors[appt.id] ? (
                      <select
                        value={reassignAssignments[appt.id] || ""}
                        onChange={(e) =>
                          setReassignAssignments((prev) => ({ ...prev, [appt.id]: e.target.value }))
                        }
                        className="px-2 py-1.5 text-[13px] min-w-[150px]"
                        style={inputStyle}
                      >
                        <option value="">Select doctor...</option>
                        {reassignDoctors[appt.id].map((d) => (
                          <option key={d.id} value={d.id} disabled={!d.available}>
                            {d.name} {d.specialization ? `(${d.specialization})` : ""} {!d.available ? "- Busy" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const specParam = staffMember?.specialization
                              ? `&specialization=${encodeURIComponent(staffMember.specialization)}`
                              : "";
                            const res = await fetch(
                              `/api/doctors/available?date=${appt.date}&time=${appt.time}&excludeDoctorId=${id}${specParam}`
                            );
                            if (res.ok) {
                              const data: AvailableDoctor[] = await res.json();
                              setReassignDoctors((prev) => ({ ...prev, [appt.id]: data }));
                            }
                          } catch { /* ignore */ }
                        }}
                        className="px-2.5 py-1 text-[12px] font-semibold"
                        style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
                      >
                        Find doctors
                      </button>
                    )}
                    {reassignAssignments[appt.id] && (
                      <svg className="w-4 h-4" style={{ color: "#059669" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex justify-end gap-2" style={{ borderTop: "1px solid var(--grey-300)" }}>
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-[15px] font-semibold"
                style={{ background: "var(--grey-100)", color: "var(--grey-700)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
              >
                Close
              </button>
              <button
                onClick={async () => {
                  const toReassign = Object.entries(reassignAssignments).filter(([, v]) => v);
                  if (toReassign.length === 0) {
                    showFlash({ type: "error", title: "Error", message: "No appointments assigned to a doctor" });
                    return;
                  }
                  setReassignLoading(true);
                  // Group by doctor
                  const byDoc: Record<string, string[]> = {};
                  for (const [apptId, docId] of toReassign) {
                    if (!byDoc[docId]) byDoc[docId] = [];
                    byDoc[docId].push(apptId);
                  }
                  let totalR = 0, totalF = 0;
                  const allErr: Array<{ appointmentId: string; error: string }> = [];
                  for (const [docId, apptIds] of Object.entries(byDoc)) {
                    try {
                      const res = await fetch("/api/appointments/reassign", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ appointmentIds: apptIds, newDoctorId: docId, reason: "Leave reassignment" }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        totalR += d.reassigned;
                        totalF += d.failed;
                        allErr.push(...d.errors);
                      } else { totalF += apptIds.length; }
                    } catch { totalF += apptIds.length; }
                  }
                  setReassignResult({ reassigned: totalR, failed: totalF, errors: allErr });
                  setReassignLoading(false);
                  if (totalR > 0) {
                    showFlash({ type: "success", title: "Success", message: `Reassigned ${totalR} appointments` });
                    // Remove reassigned from list
                    const reassignedIds = new Set(toReassign.map(([id]) => id));
                    setAffectedAppts((prev) => prev.filter((a) => !reassignedIds.has(a.id)));
                  }
                }}
                disabled={reassignLoading || Object.values(reassignAssignments).filter(Boolean).length === 0}
                className="px-5 py-2 text-[15px] font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
              >
                {reassignLoading ? "Reassigning..." : `Reassign All (${Object.values(reassignAssignments).filter(Boolean).length})`}
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
                {editingId ? "Edit Leave / Block" : "Add Leave / Block"}
              </h3>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                {editingId ? "Update leave details below" : "Create a new leave, time block, or holiday"}
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {formError && (
                <div className="p-3 text-[14px] font-semibold" style={{ background: "var(--red-light)", color: "var(--red)", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca" }}>
                  {formError}
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Type</label>
                <div className="flex gap-2">
                  {LEAVE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.value, title: "" })}
                      className="px-3 py-1.5 text-[13px] font-bold transition-all"
                      style={{
                        borderRadius: "var(--radius-sm)",
                        background: form.type === t.value ? t.bg : "var(--grey-100)",
                        color: form.type === t.value ? t.color : "var(--grey-600)",
                        border: form.type === t.value ? `1.5px solid ${t.color}` : "1px solid var(--grey-300)",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  placeholder="e.g. Annual Leave"
                />
                {TITLE_SUGGESTIONS[form.type] && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {TITLE_SUGGESTIONS[form.type].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, title: s })}
                        className="px-2 py-0.5 text-[12px] font-semibold"
                        style={{
                          background: form.title === s ? "var(--blue-50)" : "var(--grey-100)",
                          color: form.title === s ? "var(--blue-500)" : "var(--grey-600)",
                          borderRadius: "var(--radius-pill)",
                          border: form.title === s ? "1px solid var(--blue-300)" : "1px solid var(--grey-300)",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, startDate: val, endDate: form.endDate < val ? val : form.endDate });
                    }}
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    min={form.startDate}
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* All day toggle */}
              <div className="flex items-center gap-3 p-3" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-200)" }}>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--blue-500)]"></div>
                </label>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--grey-800)" }}>Full Day</p>
                  <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>Toggle off to set specific time range</p>
                </div>
              </div>

              {/* Time range (if not all day) */}
              {!form.allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Start Time</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="w-full px-3 py-2 text-[15px]"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>End Time</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                      className="w-full px-3 py-2 text-[15px]"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-[15px]"
                  style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
                  placeholder="Any additional details..."
                />
              </div>
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
                {saving ? "Saving..." : editingId ? "Update" : "Add Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
