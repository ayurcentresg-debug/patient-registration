"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface Appointment {
  id: string;
  patientId: string | null;
  doctorId: string | null;
  date: string;
  time: string;
  endTime: string | null;
  duration: number;
  doctor: string;
  department: string | null;
  type: string;
  reason: string | null;
  notes: string | null;
  status: string;
  isWalkin: boolean;
  walkinName: string | null;
  walkinPhone: string | null;
  treatmentName: string | null;
  sessionPrice: number | null;
  patient: { firstName: string; lastName: string; patientIdNumber?: string } | null;
  doctorRef: { id: string; name: string; specialization: string; department: string } | null;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  role: string;
}

/* ─── Helpers ─── */
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  scheduled: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  confirmed: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  "in-progress": { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  completed: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
  cancelled: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
  "no-show": { bg: "#fdf4ff", text: "#86198f", border: "#f0abfc" },
};

const TYPE_LABELS: Record<string, string> = {
  consultation: "Consult",
  "follow-up": "Follow-up",
  procedure: "Procedure",
  emergency: "Emergency",
};

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  result.setDate(result.getDate() + diff);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* Calendar hours: 7 AM to 9 PM */
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 21;
const HOUR_HEIGHT = 72; // px per hour
const TOTAL_HOURS = CALENDAR_END_HOUR - CALENDAR_START_HOUR;

/* ─── Appointment Block Component ─── */
function AppointmentBlock({
  appt, top, height, left, width, onClick,
}: {
  appt: Appointment; top: number; height: number; left: string; width: string; onClick: () => void;
}) {
  const colors = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
  const patientName = appt.isWalkin
    ? appt.walkinName || "Walk-in"
    : appt.patient
    ? `${appt.patient.firstName} ${appt.patient.lastName}`
    : "Unknown";
  const isShort = height < 40;

  return (
    <button
      onClick={onClick}
      className="absolute rounded-lg px-2 py-1 text-left overflow-hidden transition-all hover:shadow-lg hover:z-20 cursor-pointer group"
      style={{
        top: `${top}px`,
        height: `${Math.max(height, 24)}px`,
        left,
        width,
        background: colors.bg,
        borderLeft: `3px solid ${colors.text}`,
        border: `1px solid ${colors.border}`,
        borderLeftWidth: "3px",
        borderLeftColor: colors.text,
        zIndex: 10,
      }}
    >
      {isShort ? (
        <p className="text-[11px] font-medium truncate" style={{ color: colors.text }}>
          {formatTime12(appt.time)} · {patientName}
        </p>
      ) : (
        <>
          <p className="text-[11px] font-semibold truncate" style={{ color: colors.text }}>{patientName}</p>
          <p className="text-[10px] truncate" style={{ color: colors.text, opacity: 0.75 }}>
            {formatTime12(appt.time)}{appt.endTime ? ` - ${formatTime12(appt.endTime)}` : ""} · {appt.doctor}
          </p>
          {!isShort && height > 55 && (
            <p className="text-[10px] truncate mt-0.5" style={{ color: colors.text, opacity: 0.6 }}>
              {TYPE_LABELS[appt.type] || appt.type}
              {appt.treatmentName ? ` · ${appt.treatmentName}` : ""}
            </p>
          )}
        </>
      )}
    </button>
  );
}

/* ─── Appointment Detail Popup ─── */
function DetailPopup({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const colors = STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled;
  const patientName = appt.isWalkin
    ? appt.walkinName || "Walk-in"
    : appt.patient
    ? `${appt.patient.firstName} ${appt.patient.lastName}`
    : "Unknown";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: colors.text }} />
            <span className="text-[13px] font-bold capitalize" style={{ color: colors.text }}>{appt.status}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-[16px] font-bold" style={{ color: "#111827" }}>{patientName}</p>
            {appt.patient?.patientIdNumber && (
              <p className="text-[12px]" style={{ color: "#9ca3af" }}>{appt.patient.patientIdNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <p className="font-medium" style={{ color: "#9ca3af" }}>Date</p>
              <p style={{ color: "#374151" }}>{new Date(appt.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
            </div>
            <div>
              <p className="font-medium" style={{ color: "#9ca3af" }}>Time</p>
              <p style={{ color: "#374151" }}>{formatTime12(appt.time)}{appt.endTime ? ` - ${formatTime12(appt.endTime)}` : ""}</p>
            </div>
            <div>
              <p className="font-medium" style={{ color: "#9ca3af" }}>Doctor</p>
              <p style={{ color: "#374151" }}>{appt.doctorRef?.name || appt.doctor}</p>
            </div>
            <div>
              <p className="font-medium" style={{ color: "#9ca3af" }}>Type</p>
              <p className="capitalize" style={{ color: "#374151" }}>{TYPE_LABELS[appt.type] || appt.type}</p>
            </div>
            {appt.treatmentName && (
              <div className="col-span-2">
                <p className="font-medium" style={{ color: "#9ca3af" }}>Treatment</p>
                <p style={{ color: "#374151" }}>{appt.treatmentName}</p>
              </div>
            )}
            {appt.reason && (
              <div className="col-span-2">
                <p className="font-medium" style={{ color: "#9ca3af" }}>Reason</p>
                <p style={{ color: "#374151" }}>{appt.reason}</p>
              </div>
            )}
            {appt.sessionPrice && (
              <div>
                <p className="font-medium" style={{ color: "#9ca3af" }}>Fee</p>
                <p className="font-semibold" style={{ color: "#059669" }}>${appt.sessionPrice.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex gap-2" style={{ borderTop: "1px solid #f3f4f6" }}>
          <Link
            href={`/appointments/${appt.id}`}
            className="flex-1 text-center py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: "#2d6a4f" }}
          >
            View Details
          </Link>
          {appt.status === "scheduled" && (
            <Link
              href={`/appointments/${appt.id}`}
              className="flex-1 text-center py-2 rounded-lg text-[13px] font-semibold"
              style={{ background: "#f3f4f6", color: "#374151" }}
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mini Month Calendar ─── */
function MiniCalendar({
  currentDate, selectedDate, onSelect,
}: {
  currentDate: Date; selectedDate: Date; onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0

  const days: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="p-1 rounded hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="#6b7280" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[13px] font-semibold" style={{ color: "#374151" }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="p-1 rounded hover:bg-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="#6b7280" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium py-1" style={{ color: "#9ca3af" }}>{d}</div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isToday = isSameDay(d, currentDate);
          const isSelected = isSameDay(d, selectedDate);
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className="w-8 h-8 rounded-full text-[12px] font-medium flex items-center justify-center mx-auto transition-all hover:bg-gray-100"
              style={{
                background: isSelected ? "#2d6a4f" : isToday ? "#f0fdf4" : "transparent",
                color: isSelected ? "white" : isToday ? "#2d6a4f" : "#374151",
                fontWeight: isToday || isSelected ? 700 : 400,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Calendar Page ─── */
export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<"day" | "week">("week");
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [filterDoctor, setFilterDoctor] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Compute date range for fetching
  const dateRange = useMemo(() => {
    if (view === "day") {
      return { from: formatDate(selectedDate), to: formatDate(selectedDate) };
    }
    const weekStart = startOfWeek(selectedDate);
    return { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 6)) };
  }, [view, selectedDate]);

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to, limit: "500" });
      const res = await fetch(`/api/appointments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || data);
      }
    } catch {}
    setLoading(false);
  }, [dateRange]);

  // Fetch doctors
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : data.doctors || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (filterDoctor !== "all" && a.doctorId !== filterDoctor) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [appointments, filterDoctor, filterStatus]);

  // Navigation
  const goToday = () => setSelectedDate(today);
  const goPrev = () => setSelectedDate((d) => addDays(d, view === "day" ? -1 : -7));
  const goNext = () => setSelectedDate((d) => addDays(d, view === "day" ? 1 : 7));

  // Week days for week view
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Group appointments by date string
  const apptsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((a) => {
      const dateStr = a.date.split("T")[0];
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(a);
    });
    return map;
  }, [filteredAppointments]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const confirmed = filteredAppointments.filter((a) => a.status === "confirmed" || a.status === "scheduled").length;
    const completed = filteredAppointments.filter((a) => a.status === "completed").length;
    const cancelled = filteredAppointments.filter((a) => a.status === "cancelled" || a.status === "no-show").length;
    return { total, confirmed, completed, cancelled };
  }, [filteredAppointments]);

  // Header date label
  const headerLabel = useMemo(() => {
    if (view === "day") {
      return selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    const ws = startOfWeek(selectedDate);
    const we = addDays(ws, 6);
    if (ws.getMonth() === we.getMonth()) {
      return `${ws.getDate()} - ${we.getDate()} ${MONTH_NAMES[ws.getMonth()]} ${ws.getFullYear()}`;
    }
    return `${ws.getDate()} ${MONTH_NAMES[ws.getMonth()].slice(0, 3)} - ${we.getDate()} ${MONTH_NAMES[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
  }, [view, selectedDate]);

  /* ─── Render Time Grid ─── */
  const renderTimeGrid = (dayDate: Date, columnWidth: string, columnLeft: string) => {
    const dateStr = formatDate(dayDate);
    const dayAppts = apptsByDate[dateStr] || [];
    const isToday = isSameDay(dayDate, today);

    // Calculate positions for appointments
    const positioned = dayAppts.map((appt) => {
      const startMin = parseTimeToMinutes(appt.time);
      const endMin = appt.endTime ? parseTimeToMinutes(appt.endTime) : startMin + (appt.duration || 30);
      const top = ((startMin - CALENDAR_START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
      return { appt, top, height };
    });

    // Simple overlap detection — stack overlapping appointments side by side
    const sorted = [...positioned].sort((a, b) => a.top - b.top);
    const columns: { appt: Appointment; top: number; height: number; col: number; totalCols: number }[] = [];
    const active: typeof columns = [];

    sorted.forEach((item) => {
      // Remove items that have ended
      const stillActive = active.filter((a) => a.top + a.height > item.top + 1);
      active.length = 0;
      active.push(...stillActive);

      const col = active.length;
      const entry = { ...item, col, totalCols: 1 };
      active.push(entry);
      columns.push(entry);

      // Update totalCols for all active items
      active.forEach((a) => { a.totalCols = Math.max(a.totalCols, active.length); });
    });

    return (
      <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
        {/* Current time indicator */}
        {isToday && (() => {
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          if (nowMin >= CALENDAR_START_HOUR * 60 && nowMin <= CALENDAR_END_HOUR * 60) {
            const top = ((nowMin - CALENDAR_START_HOUR * 60) / 60) * HOUR_HEIGHT;
            return (
              <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: `${top}px` }}>
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                  <div className="flex-1 h-0.5" style={{ background: "#ef4444" }} />
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Appointment blocks */}
        {columns.map((item, i) => {
          const colWidth = 100 / item.totalCols;
          const colLeft = item.col * colWidth;
          return (
            <AppointmentBlock
              key={item.appt.id}
              appt={item.appt}
              top={item.top}
              height={item.height}
              left={`${colLeft}%`}
              width={`${colWidth - 1}%`}
              onClick={() => setSelectedAppt(item.appt)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-60px)]">
      {/* ═══ Left Sidebar ═══ */}
      <div className="hidden xl:flex xl:w-[260px] flex-col border-r p-4 space-y-5 overflow-y-auto" style={{ borderColor: "#f3f4f6", background: "white" }}>
        {/* Mini Calendar */}
        <MiniCalendar currentDate={today} selectedDate={selectedDate} onSelect={setSelectedDate} />

        {/* Doctor Filter */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Doctor</label>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ border: "1.5px solid #e5e7eb" }}
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Status</label>
          <div className="space-y-1">
            {["all", "scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: filterStatus === s ? "#f0fdf4" : "transparent",
                  color: filterStatus === s ? "#2d6a4f" : "#6b7280",
                }}
              >
                <span className="flex items-center gap-2">
                  {s !== "all" && <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s]?.text || "#9ca3af" }} />}
                  <span className="capitalize">{s === "all" ? "All Statuses" : s.replace("-", " ")}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl p-4" style={{ background: "#f9fafb" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Summary</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span style={{ color: "#6b7280" }}>Total</span><span className="font-bold" style={{ color: "#111827" }}>{stats.total}</span></div>
            <div className="flex justify-between"><span style={{ color: "#6b7280" }}>Upcoming</span><span className="font-bold" style={{ color: "#1d4ed8" }}>{stats.confirmed}</span></div>
            <div className="flex justify-between"><span style={{ color: "#6b7280" }}>Completed</span><span className="font-bold" style={{ color: "#15803d" }}>{stats.completed}</span></div>
            <div className="flex justify-between"><span style={{ color: "#6b7280" }}>Cancelled</span><span className="font-bold" style={{ color: "#b91c1c" }}>{stats.cancelled}</span></div>
          </div>
        </div>
      </div>

      {/* ═══ Main Calendar Area ═══ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "white" }}>
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <div className="flex items-center gap-3">
            {/* Nav arrows */}
            <div className="flex items-center gap-1">
              <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="#374151" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="#374151" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:bg-gray-100" style={{ border: "1px solid #e5e7eb", color: "#374151" }}>
              Today
            </button>

            <h2 className="text-[16px] font-bold hidden sm:block" style={{ color: "#111827" }}>{headerLabel}</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
              {(["day", "week"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-4 py-1.5 text-[12px] font-semibold capitalize transition-all"
                  style={{
                    background: view === v ? "#2d6a4f" : "white",
                    color: view === v ? "white" : "#6b7280",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Switch to list */}
            <Link
              href="/appointments"
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:bg-gray-100"
              style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List
              </span>
            </Link>

            {/* New appointment */}
            <Link
              href="/appointments/new"
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "#2d6a4f" }}
            >
              + New
            </Link>
          </div>
        </div>

        {/* ── Loading State ── */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
          </div>
        )}

        {/* ── Calendar Grid ── */}
        {!loading && (
          <div className="flex-1 overflow-auto">
            {/* ═══ DAY VIEW ═══ */}
            {view === "day" && (
              <div className="flex">
                {/* Time gutter */}
                <div className="w-16 flex-shrink-0" style={{ borderRight: "1px solid #f3f4f6" }}>
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div key={i} className="flex items-start justify-end pr-2" style={{ height: `${HOUR_HEIGHT}px` }}>
                      <span className="text-[10px] font-medium -mt-1.5" style={{ color: "#9ca3af" }}>
                        {formatTime12(`${CALENDAR_START_HOUR + i}:00`)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day column */}
                <div className="flex-1 relative">
                  {/* Hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0"
                      style={{ top: `${i * HOUR_HEIGHT}px`, borderTop: "1px solid #f3f4f6" }}
                    />
                  ))}
                  {/* Half-hour lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={`h${i}`}
                      className="absolute left-0 right-0"
                      style={{ top: `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`, borderTop: "1px dashed #f9fafb" }}
                    />
                  ))}

                  <div className="relative px-2">
                    {renderTimeGrid(selectedDate, "100%", "0%")}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ WEEK VIEW ═══ */}
            {view === "week" && (
              <div>
                {/* Day headers */}
                <div className="flex sticky top-0 z-20" style={{ background: "white", borderBottom: "1px solid #e5e7eb" }}>
                  <div className="w-16 flex-shrink-0" style={{ borderRight: "1px solid #f3f4f6" }} />
                  {weekDays.map((d, i) => {
                    const isToday2 = isSameDay(d, today);
                    const dayApptCount = (apptsByDate[formatDate(d)] || []).length;
                    return (
                      <div
                        key={i}
                        className="flex-1 text-center py-2 cursor-pointer hover:bg-gray-50 transition-all"
                        style={{ borderRight: i < 6 ? "1px solid #f3f4f6" : "none" }}
                        onClick={() => { setSelectedDate(d); setView("day"); }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isToday2 ? "#2d6a4f" : "#9ca3af" }}>
                          {DAY_NAMES[i]}
                        </p>
                        <div
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full mx-auto text-[15px] font-bold"
                          style={{
                            background: isToday2 ? "#2d6a4f" : "transparent",
                            color: isToday2 ? "white" : "#374151",
                          }}
                        >
                          {d.getDate()}
                        </div>
                        {dayApptCount > 0 && (
                          <p className="text-[10px] font-medium" style={{ color: "#9ca3af" }}>{dayApptCount} appt{dayApptCount !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time grid */}
                <div className="flex">
                  {/* Time gutter */}
                  <div className="w-16 flex-shrink-0" style={{ borderRight: "1px solid #f3f4f6" }}>
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div key={i} className="flex items-start justify-end pr-2" style={{ height: `${HOUR_HEIGHT}px` }}>
                        <span className="text-[10px] font-medium -mt-1.5" style={{ color: "#9ca3af" }}>
                          {formatTime12(`${CALENDAR_START_HOUR + i}:00`)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((d, i) => (
                    <div key={i} className="flex-1 relative" style={{ borderRight: i < 6 ? "1px solid #f3f4f6" : "none" }}>
                      {/* Hour lines */}
                      {Array.from({ length: TOTAL_HOURS }, (_, j) => (
                        <div
                          key={j}
                          className="absolute left-0 right-0"
                          style={{ top: `${j * HOUR_HEIGHT}px`, borderTop: "1px solid #f3f4f6" }}
                        />
                      ))}

                      {/* Today background highlight */}
                      {isSameDay(d, today) && (
                        <div className="absolute inset-0" style={{ background: "rgba(45,106,79,0.03)" }} />
                      )}

                      <div className="relative px-0.5">
                        {renderTimeGrid(d, "100%", "0%")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Detail Popup ═══ */}
      {selectedAppt && <DetailPopup appt={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </div>
  );
}
