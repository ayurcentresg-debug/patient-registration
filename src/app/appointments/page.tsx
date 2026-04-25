"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { downloadCSV } from "@/lib/csv-export";
import { useFlash } from "@/components/FlashCardProvider";
import WaitlistModal from "@/components/WaitlistModal";
import { inputStyle } from "@/lib/styles";

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
  treatmentId: string | null;
  treatmentName: string | null;
  packageName: string | null;
  sessionPrice: number | null;
  patient: { firstName: string; lastName: string; patientIdNumber?: string } | null;
  doctorRef: { id: string; name: string; specialization: string; department: string } | null;
}

interface TreatmentPkg {
  id: string;
  name: string;
  sessionCount: number;
  discountPercent: number;
  totalPrice: number;
  pricePerSession: number;
  isActive: boolean;
}

interface TreatmentOption {
  id: string;
  name: string;
  category: string;
  duration: number;
  basePrice: number;
  packages: TreatmentPkg[];
}

interface Doctor {
  id: string;
  name: string;
  role: string; // "doctor" | "therapist"
  gender: string | null;
  department: string;
  specialization: string;
}

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  patientIdNumber: string;
  gender?: string;
}

type ViewMode = "Day" | "Week" | "5 Days" | "Month";

/* ─── Colors for appointment blocks ─── */
const BLOCK_COLORS = [
  { bg: "#1a9c6e", text: "#fff" },
  { bg: "#0097a7", text: "#fff" },
  { bg: "#e91e8c", text: "#fff" },
  { bg: "#f9a825", text: "#333" },
  { bg: "#7b1fa2", text: "#fff" },
  { bg: "var(--blue-700)", text: "#fff" },
  { bg: "#e65100", text: "#fff" },
  { bg: "#2e7d32", text: "#fff" },
  { bg: "#c62828", text: "#fff" },
  { bg: "#4527a0", text: "#fff" },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#d00d00",
  confirmed: "#2d6a4f",
  "in-progress": "#f97c00",
  completed: "#028901",
  cancelled: "#909090",
  "no-show": "#b125c0",
};

/* ─── Helpers ─── */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${(m || 0).toString().padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

function formatDateShort(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekStart(d: Date): Date {
  const w = new Date(d);
  w.setDate(w.getDate() - w.getDay());
  return w;
}

function getPatientName(apt: Appointment): string {
  if (apt.isWalkin && apt.walkinName) return apt.walkinName + " (Walk-in)";
  if (apt.patient) return `${apt.patient.firstName} ${apt.patient.lastName}`;
  return "Unknown";
}

/**
 * Lay out appointments side-by-side when they overlap in time.
 * Each returned entry has `lane` (0-indexed column) and `totalLanes` (how
 * many lanes its overlap chain occupies). Cards then position at:
 *   left  = (lane / totalLanes) * 100%
 *   width = (1 / totalLanes) * 100%
 * Greedy lane assignment matches Google Calendar / Practo behavior.
 */
function layoutAppointments(appts: Appointment[]): Array<Appointment & { lane: number; totalLanes: number }> {
  if (appts.length === 0) return [];
  const indexed = appts.map(a => {
    const start = timeToMinutes(a.time);
    return { apt: a, start, end: start + (a.duration || 30) };
  });
  // Stable sort: by start, then longer-first so longer events take inner lanes
  indexed.sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
  // Lane assignment: greedy — first lane whose last-end ≤ this start
  const laneEnds: number[] = [];
  const withLane = indexed.map(({ apt, start, end }) => {
    let lane = laneEnds.findIndex(e => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else { laneEnds[lane] = end; }
    return { apt, start, end, lane };
  });
  // For each apt, totalLanes = 1 + max lane index across its overlap chain
  return withLane.map(({ apt, start, end, lane }) => {
    const overlapping = withLane.filter(o => o.start < end && o.end > start);
    const totalLanes = Math.max(...overlapping.map(o => o.lane)) + 1;
    return { ...apt, lane, totalLanes };
  });
}

/* ─── Mini Calendar ─── */
function MiniCalendar({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors" style={{ color: "var(--grey-500)" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>{months[month]} {year}</span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors" style={{ color: "var(--grey-500)" }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[2px] text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-[12px] font-semibold py-1" style={{ color: "var(--grey-500)" }}>{d}</div>
        ))}
        {/* Adjust cells so Monday is first day */}
        {(() => {
          const adjusted: (number | null)[] = [];
          const mondayFirst = firstDay === 0 ? 6 : firstDay - 1;
          for (let i = 0; i < mondayFirst; i++) adjusted.push(null);
          for (let d = 1; d <= daysInMonth; d++) adjusted.push(d);
          return adjusted;
        })().map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const date = new Date(year, month, day);
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <button
              key={day}
              onClick={() => onSelect(date)}
              className="text-[14px] w-[28px] h-[28px] mx-auto flex items-center justify-center font-medium rounded-full transition-all"
              style={{
                color: isSelected ? "#fff" : isToday ? "var(--blue-500)" : "var(--grey-800)",
                background: isSelected ? "var(--blue-500)" : isToday ? "var(--blue-50)" : "transparent",
                fontWeight: isToday || isSelected ? 700 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = "#d1f2e0";
                  e.currentTarget.style.transform = "scale(1.15)";
                  e.currentTarget.style.color = "#14532d";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = isToday ? "var(--blue-50)" : "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.color = isToday ? "var(--blue-500)" : "var(--grey-800)";
                }
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Quick Book Modal                                                          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function QuickBookModal({
  date,
  time,
  doctors,
  onClose,
  onBooked,
}: {
  date: Date;
  time: string;
  doctors: Doctor[];
  onClose: () => void;
  onBooked: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "walkin">("existing");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Walk-in fields
  const [walkinName, setWalkinName] = useState("");
  const [walkinPhone, setWalkinPhone] = useState("");
  const [walkinGender, setWalkinGender] = useState<"male" | "female" | "">("");

  // Booking type: consultation (doctor) or therapy (therapist)
  const [bookingFor, setBookingFor] = useState<"consultation" | "therapy">("consultation");

  // Determine patient gender from selected patient or walk-in
  const patientGender = mode === "existing" && selectedPatient
    ? (selectedPatient as { gender?: string }).gender || ""
    : walkinGender;

  // Filter doctors/therapists based on booking type + gender match for therapy
  const filteredPractitioners = doctors.filter(d => {
    if (bookingFor === "consultation") return d.role === "doctor" || !d.role;
    // Therapy: must be therapist
    if (d.role !== "therapist") return false;
    return true;
  });

  // Gender-matched therapists (preferred) vs others
  const genderMatchedPractitioners = filteredPractitioners.filter(d => {
    if (bookingFor !== "therapy" || !patientGender || !d.gender) return true;
    return d.gender === patientGender;
  });
  const genderMismatchedPractitioners = filteredPractitioners.filter(d => {
    if (bookingFor !== "therapy" || !patientGender || !d.gender) return false;
    return d.gender !== patientGender;
  });

  // Common fields
  const [doctorId, setDoctorId] = useState("");
  const [reason, setReason] = useState("");
  const [aptType, setAptType] = useState("consultation");
  const [duration, setDuration] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Recurring appointment fields
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [recurCount, setRecurCount] = useState(4);
  const [sendReminder, setSendReminder] = useState(true);

  // Treatment & package selection
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [selectedPricingTier, setSelectedPricingTier] = useState("single"); // "single" or package ID
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [walkinHasHistory, setWalkinHasHistory] = useState(false);

  // Reset practitioner when booking type changes
  const selectedDoctor = doctors.find(d => d.id === doctorId);

  // Patient search with debounce
  useEffect(() => {
    if (mode !== "existing" || search.length < 2) { setPatients([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.slice(0, 8));
        }
      } catch { /* ignore */ }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, mode]);

  // Load treatments when therapy is selected
  useEffect(() => {
    if (bookingFor !== "therapy") { setTreatments([]); setSelectedTreatmentId(""); setSelectedPricingTier("single"); return; }
    setLoadingTreatments(true);
    fetch("/api/treatments?active=true")
      .then(r => r.json())
      .then(data => setTreatments(Array.isArray(data) ? data : []))
      .catch(() => setTreatments([]))
      .finally(() => setLoadingTreatments(false));
  }, [bookingFor]);

  // Check walk-in history when phone changes (for package restriction)
  useEffect(() => {
    if (mode !== "walkin" || !walkinPhone || walkinPhone.length < 5) { setWalkinHasHistory(false); return; }
    const timer = setTimeout(() => {
      fetch(`/api/appointments?walkinPhone=${encodeURIComponent(walkinPhone)}&status=completed`)
        .then(r => r.json())
        .then(data => setWalkinHasHistory(Array.isArray(data) && data.length > 0))
        .catch(() => setWalkinHasHistory(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [walkinPhone, mode]);

  // Auto-set duration from treatment
  const selectedTreatment = treatments.find(t => t.id === selectedTreatmentId);
  useEffect(() => {
    if (selectedTreatment) setDuration(selectedTreatment.duration);
  }, [selectedTreatment]);

  // Determine pricing
  const selectedPackage = selectedTreatment?.packages.find(p => p.id === selectedPricingTier);
  const displayPrice = selectedPackage ? selectedPackage.pricePerSession : (selectedTreatment?.basePrice ?? null);
  const displayPackageTotal = selectedPackage ? selectedPackage.totalPrice : null;
  const isWalkinFirstTime = mode === "walkin" && !walkinHasHistory;

  async function handleBook() {
    setError("");

    if (!doctorId) { setError("Please select a doctor"); return; }
    if (mode === "existing" && !selectedPatient) { setError("Please search and select a patient"); return; }
    if (mode === "walkin" && !walkinName.trim()) { setError("Please enter patient name"); return; }
    if (mode === "walkin" && !walkinPhone.trim()) { setError("Please enter phone number"); return; }

    setSaving(true);
    try {
      const endMin = timeToMinutes(time) + duration;
      const body: Record<string, unknown> = {
        date: toDateStr(date),
        time,
        endTime: minutesToTime(endMin),
        duration,
        doctor: selectedDoctor?.name || "",
        doctorId,
        department: selectedDoctor?.department || null,
        type: aptType,
        reason: reason || null,
        status: "scheduled",
        // Treatment & package data
        treatmentId: selectedTreatmentId || null,
        packageId: selectedPricingTier !== "single" ? selectedPricingTier : null,
        treatmentName: selectedTreatment?.name || null,
        packageName: selectedPackage?.name || null,
        sessionPrice: displayPrice ?? null,
        packageTotal: displayPackageTotal ?? null,
      };

      if (mode === "walkin") {
        body.isWalkin = true;
        body.walkinName = walkinName.trim();
        body.walkinPhone = walkinPhone.trim();
      } else {
        body.patientId = selectedPatient!.id;
      }

      // Build list of dates for recurring or single appointment
      const dates: string[] = [toDateStr(date)];
      if (isRecurring && recurCount > 1) {
        for (let i = 1; i < recurCount; i++) {
          const nextDate = new Date(date);
          if (recurFrequency === "weekly") nextDate.setDate(nextDate.getDate() + i * 7);
          else if (recurFrequency === "biweekly") nextDate.setDate(nextDate.getDate() + i * 14);
          else nextDate.setMonth(nextDate.getMonth() + i);
          dates.push(toDateStr(nextDate));
        }
      }

      // Create all appointments
      let failCount = 0;
      for (const aptDate of dates) {
        const aptBody = { ...body, date: aptDate, notes: isRecurring ? `${body.notes || ""}${dates.length > 1 ? ` [Recurring ${dates.indexOf(aptDate) + 1}/${dates.length}]` : ""}`.trim() : body.notes || null };
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aptBody),
        });
        if (!res.ok) failCount++;
      }

      if (failCount > 0 && failCount === dates.length) {
        setError("Failed to book appointment");
        setSaving(false);
        return;
      }

      onBooked();
    } catch {
      setError("Failed to book appointment");
    }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-[150]" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div
        className="fixed z-[151] yoda-slide-in"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(480px, calc(100vw - 32px))",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--white)",
          border: "1px solid var(--grey-300)",
          borderRadius: "var(--radius)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--grey-200)" }}>
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Quick Book Appointment</h2>
            <p className="text-[14px] mt-0.5" style={{ color: "var(--grey-500)" }}>
              {formatDateLabel(date)} at {formatTime12(time)}
            </p>
          </div>
          <button onClick={onClose} className="text-[20px] w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" style={{ color: "var(--grey-500)" }}>&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Booking type toggle: Consultation vs Therapy */}
          <div>
            <label className="text-[13px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: "var(--grey-500)" }}>Booking For</label>
            <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--grey-300)" }}>
              <button
                onClick={() => { setBookingFor("consultation"); setDoctorId(""); setAptType("consultation"); }}
                className="flex-1 py-2.5 text-[15px] font-semibold transition-colors"
                style={{
                  background: bookingFor === "consultation" ? "#1a6d3a" : "var(--white)",
                  color: bookingFor === "consultation" ? "#fff" : "var(--grey-700)",
                }}
              >
                🩺 Consultation
              </button>
              <button
                onClick={() => { setBookingFor("therapy"); setDoctorId(""); setAptType("therapy"); setDuration(60); }}
                className="flex-1 py-2.5 text-[15px] font-semibold transition-colors"
                style={{
                  background: bookingFor === "therapy" ? "#7c3aed" : "var(--white)",
                  color: bookingFor === "therapy" ? "#fff" : "var(--grey-700)",
                  borderLeft: "1px solid var(--grey-300)",
                }}
              >
                🌿 Therapy / Treatment
              </button>
            </div>
          </div>

          {/* Patient type toggle */}
          <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--grey-300)" }}>
            <button
              onClick={() => { setMode("existing"); setSelectedPatient(null); }}
              className="flex-1 py-2 text-[15px] font-semibold transition-colors"
              style={{
                background: mode === "existing" ? "var(--blue-500)" : "var(--white)",
                color: mode === "existing" ? "#fff" : "var(--grey-700)",
              }}
            >
              Existing Patient
            </button>
            <button
              onClick={() => { setMode("walkin"); setSearch(""); setPatients([]); }}
              className="flex-1 py-2 text-[15px] font-semibold transition-colors"
              style={{
                background: mode === "walkin" ? "var(--blue-500)" : "var(--white)",
                color: mode === "walkin" ? "#fff" : "var(--grey-700)",
                borderLeft: "1px solid var(--grey-300)",
              }}
            >
              Walk-in / Phone Booking
            </button>
          </div>

          {/* Patient selection */}
          {mode === "existing" ? (
            <div>
              <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Search Patient</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 rounded" style={{ background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
                  <div>
                    <span className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </span>
                    <span className="ml-2 text-[13px]" style={{ color: "var(--grey-500)" }}>{selectedPatient.patientIdNumber}</span>
                    <div className="text-[13px]" style={{ color: "var(--grey-500)" }}>{selectedPatient.phone}</div>
                  </div>
                  <button
                    onClick={() => { setSelectedPatient(null); setSearch(""); }}
                    className="text-[14px] font-semibold px-2 py-1 rounded"
                    style={{ color: "var(--red)" }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type name or phone to search..."
                    aria-label="Search patients by name or phone"
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                    autoFocus
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--grey-300)", borderTopColor: "var(--blue-500)" }} />
                    </div>
                  )}
                  {patients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-10 max-h-[200px] overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)" }}>
                      {patients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setPatients([]); setSearch(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors"
                          style={{ borderBottom: "1px solid var(--grey-100)" }}
                        >
                          <div className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>
                            {p.firstName} {p.lastName}
                            <span className="ml-2 text-[13px] font-normal" style={{ color: "var(--grey-500)" }}>{p.patientIdNumber}</span>
                          </div>
                          <div className="text-[13px]" style={{ color: "var(--grey-500)" }}>{p.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {search.length >= 2 && !searchLoading && patients.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-3 rounded shadow-lg text-center" style={{ background: "var(--white)", border: "1px solid var(--grey-300)" }}>
                      <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No patients found</p>
                      <button
                        onClick={() => setMode("walkin")}
                        className="text-[14px] font-semibold mt-1"
                        style={{ color: "var(--blue-500)" }}
                      >
                        Book as walk-in instead
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Patient Name *</label>
                <input
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Phone Number *</label>
                <input
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 text-[15px]"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Gender</label>
                <div className="flex gap-4">
                  {["male", "female"].map((g) => (
                    <label key={g} className="flex items-center gap-1.5 text-[15px] cursor-pointer" style={{ color: "var(--grey-800)" }}>
                      <input
                        type="radio"
                        name="walkinGender"
                        value={g}
                        checked={walkinGender === g}
                        onChange={() => { setWalkinGender(g as "male" | "female"); setDoctorId(""); }}
                      />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </label>
                  ))}
                </div>
                {bookingFor === "therapy" && !walkinGender && (
                  <p className="text-[12px] mt-1" style={{ color: "var(--orange, #37845e)" }}>Select gender to see matching therapists</p>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "#f0faf4", border: "1px solid #6bc792" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#37845e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-[13px]" style={{ color: "#14532d" }}>
                  Walk-in patient — register them when they arrive at the clinic
                </p>
              </div>
            </div>
          )}

          {/* Doctor / Therapist */}
          <div>
            <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>
              {bookingFor === "consultation" ? "Ayurveda Doctor *" : "Therapist *"}
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            >
              <option value="">{bookingFor === "consultation" ? "Select Doctor" : "Select Therapist"}</option>
              {bookingFor === "therapy" && patientGender && genderMatchedPractitioners.length > 0 && genderMismatchedPractitioners.length > 0 && (
                <optgroup label={`✓ Gender-Matched (${patientGender === "male" ? "Male" : "Female"})`}>
                  {genderMatchedPractitioners.map(d => (
                    <option key={d.id} value={d.id}>
                      ✓ {d.name} ({d.gender === "male" ? "M" : "F"}) — {d.specialization}
                    </option>
                  ))}
                </optgroup>
              )}
              {bookingFor === "therapy" && patientGender && genderMatchedPractitioners.length > 0 && genderMismatchedPractitioners.length > 0 ? (
                <optgroup label="Other Therapists">
                  {genderMismatchedPractitioners.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.gender === "male" ? "M" : "F"}) — {d.specialization}
                    </option>
                  ))}
                </optgroup>
              ) : (
                filteredPractitioners.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.gender ? ` (${d.gender === "male" ? "M" : "F"})` : ""} — {d.specialization}
                  </option>
                ))
              )}
            </select>
            {bookingFor === "therapy" && patientGender && genderMatchedPractitioners.length > 0 && (
              <p className="text-[12px] mt-1 flex items-center gap-1" style={{ color: "#2e7d32" }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" /></svg>
                Gender-matched therapists shown first for {patientGender} patient
              </p>
            )}
            {filteredPractitioners.length === 0 && (
              <p className="text-[13px] mt-1" style={{ color: "var(--red)" }}>
                {doctors.length === 0
                  ? `No ${bookingFor === "consultation" ? "clinical staff" : "therapists"} found. Either none exist yet, or all have been deactivated. Check /admin/staff.`
                  : bookingFor === "consultation"
                    ? `Clinical staff exist but no doctors are active. Go to /admin/permissions to reactivate a doctor.`
                    : `Clinical staff exist but no therapists are active. Go to /admin/permissions to reactivate a therapist.`}
              </p>
            )}
            {/* Gender matching warning for therapy bookings */}
            {bookingFor === "therapy" && selectedDoctor && selectedDoctor.gender && (() => {
              // Check patient gender
              const patientGender = mode === "existing" && selectedPatient
                ? (selectedPatient as { gender?: string }).gender
                : null; // Walk-in gender unknown
              if (patientGender && selectedDoctor.gender !== patientGender) {
                return (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded" style={{ background: "#d1f2e0", border: "1px solid #6bc792" }}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#37845e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    <p className="text-[13px] font-medium" style={{ color: "#14532d" }}>
                      <strong>Gender mismatch:</strong> {selectedDoctor.gender === "male" ? "Male" : "Female"} therapist selected for {patientGender === "male" ? "male" : "female"} patient. In Ayurveda, same-gender therapist is recommended.
                    </p>
                  </div>
                );
              }
              if (!patientGender && selectedDoctor.gender) {
                return (
                  <p className="text-[13px] mt-1 flex items-center gap-1" style={{ color: "var(--grey-500)" }}>
                    <span>ℹ️</span> {selectedDoctor.gender === "male" ? "Male" : "Female"} therapist — ensure patient gender matches for therapy
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {/* Type + Duration row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Type</label>
              <select value={aptType} onChange={(e) => setAptType(e.target.value)} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                {bookingFor === "consultation" ? (
                  <>
                    <option value="consultation">Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="emergency">Emergency</option>
                  </>
                ) : (
                  <>
                    <option value="therapy">Therapy / Treatment</option>
                    <option value="panchakarma">Panchakarma</option>
                    <option value="abhyanga">Abhyanga</option>
                    <option value="shirodhara">Shirodhara</option>
                    <option value="pizhichil">Pizhichil</option>
                    <option value="njavarakizhi">Njavarakizhi</option>
                    <option value="nasyam">Nasyam</option>
                    <option value="vasthi">Vasthi</option>
                    <option value="udvarthanam">Udvarthanam</option>
                  </>
                )}
              </select>
            </div>
            <div className="w-[100px]">
              <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Duration</label>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2 text-[15px]" style={inputStyle}>
                {bookingFor === "consultation"
                  ? [15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)
                  : [30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} min</option>)
                }
              </select>
            </div>
          </div>

          {/* Treatment Selection (therapy only) */}
          {bookingFor === "therapy" && (
            <div>
              <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Treatment</label>
              {loadingTreatments ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--grey-300)", borderTopColor: "var(--blue-500)" }} />
                  <span className="text-[14px]" style={{ color: "var(--grey-500)" }}>Loading treatments...</span>
                </div>
              ) : treatments.length === 0 ? (
                <p className="text-[13px] py-1" style={{ color: "var(--grey-500)" }}>No treatments configured. <a href="/admin/treatments" className="underline" style={{ color: "var(--blue-500)" }}>Add treatments</a></p>
              ) : (
                <>
                  <select
                    value={selectedTreatmentId}
                    onChange={(e) => { setSelectedTreatmentId(e.target.value); setSelectedPricingTier("single"); }}
                    className="w-full px-3 py-2 text-[15px]"
                    style={inputStyle}
                  >
                    <option value="">Select Treatment (optional)</option>
                    {treatments.map(t => (
                      <option key={t.id} value={t.id}>{t.name} — S${t.basePrice.toFixed(2)}</option>
                    ))}
                  </select>

                  {/* Package / pricing tier selection */}
                  {selectedTreatment && (
                    <div className="mt-2 space-y-1.5">
                      <label className="text-[13px] font-bold uppercase tracking-wider block" style={{ color: "var(--grey-500)" }}>Pricing</label>
                      {/* Single session */}
                      <label className="flex items-center gap-2 p-2 rounded cursor-pointer transition-all" style={{ background: selectedPricingTier === "single" ? "var(--blue-50)" : "var(--grey-50)", border: selectedPricingTier === "single" ? "1.5px solid var(--blue-500)" : "1px solid var(--grey-200)" }}>
                        <input type="radio" name="pricingTier" checked={selectedPricingTier === "single"} onChange={() => setSelectedPricingTier("single")} className="w-3.5 h-3.5" />
                        <div className="flex-1 flex justify-between">
                          <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>Single Session</span>
                          <span className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>S${selectedTreatment.basePrice.toFixed(2)}</span>
                        </div>
                      </label>
                      {/* Package tiers */}
                      {selectedTreatment.packages.map(pkg => {
                        const disabled = isWalkinFirstTime;
                        return (
                          <label key={pkg.id} className={`flex items-center gap-2 p-2 rounded transition-all ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`} style={{ background: selectedPricingTier === pkg.id ? "#f0fdf4" : "var(--grey-50)", border: selectedPricingTier === pkg.id ? "1.5px solid var(--green)" : "1px solid var(--grey-200)" }}>
                            <input type="radio" name="pricingTier" checked={selectedPricingTier === pkg.id} onChange={() => !disabled && setSelectedPricingTier(pkg.id)} disabled={disabled} className="w-3.5 h-3.5" />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                                  {pkg.name}
                                  <span className="ml-1.5 text-[12px] font-bold px-1 py-0.5 rounded" style={{ background: "#c8e6c9", color: "#2e7d32" }}>{pkg.discountPercent}% OFF</span>
                                </span>
                                <span className="text-[14px] font-bold" style={{ color: "var(--grey-900)" }}>S${pkg.totalPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-[12px] mt-0.5" style={{ color: "var(--grey-500)" }}>
                                <span>{pkg.sessionCount} sessions</span>
                                <span>S${pkg.pricePerSession.toFixed(2)}/session</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      {isWalkinFirstTime && selectedTreatment.packages.length > 0 && (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: "#f0faf4", border: "1px solid #6bc792" }}>
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#37845e" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <p className="text-[12px]" style={{ color: "#14532d" }}>Packages unavailable for first-time walk-ins. Available after first completed session.</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recurring appointment toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Recurring Appointment</span>
            </label>
            {isRecurring && (
              <div className="mt-2 p-3 rounded-md space-y-2" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[12px] font-bold uppercase tracking-wide block mb-1" style={{ color: "var(--grey-500)" }}>Frequency</label>
                    <select value={recurFrequency} onChange={(e) => setRecurFrequency(e.target.value as "weekly" | "biweekly" | "monthly")} className="w-full px-2 py-1.5 text-[14px]" style={inputStyle}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="w-[80px]">
                    <label className="text-[12px] font-bold uppercase tracking-wide block mb-1" style={{ color: "var(--grey-500)" }}>Sessions</label>
                    <input
                      type="number"
                      min={2}
                      max={52}
                      value={recurCount}
                      onChange={(e) => setRecurCount(Math.max(2, Math.min(52, parseInt(e.target.value) || 2)))}
                      className="w-full px-2 py-1.5 text-[14px]"
                      style={inputStyle}
                    />
                  </div>
                </div>
                <p className="text-[12px]" style={{ color: "var(--grey-500)" }}>
                  Will create {recurCount} appointments, {recurFrequency === "weekly" ? "every week" : recurFrequency === "biweekly" ? "every 2 weeks" : "every month"} starting {formatDateLabel(date)}.
                </p>
              </div>
            )}
          </div>

          {/* Reminder toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendReminder}
              onChange={(e) => setSendReminder(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-[14px] font-semibold" style={{ color: "var(--grey-700)" }}>Send 24hr reminder (WhatsApp)</span>
          </label>

          {/* Reason */}
          <div>
            <label className="text-[14px] font-semibold mb-1 block" style={{ color: "var(--grey-700)" }}>Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for visit"
              className="w-full px-3 py-2 text-[15px]"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[14px] font-semibold px-3 py-2 rounded" style={{ color: "var(--red)", background: "#fef2f2" }}>{error}</p>
          )}

          {/* Price summary */}
          {displayPrice != null && selectedTreatment && (
            <div className="p-3 rounded" style={{ background: "var(--grey-50)", border: "1px solid var(--grey-200)" }}>
              <div className="flex justify-between text-[14px]">
                <span style={{ color: "var(--grey-600)" }}>{selectedTreatment.name}</span>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>S${displayPrice.toFixed(2)}{selectedPackage ? "/session" : ""}</span>
              </div>
              {selectedPackage && (
                <div className="flex justify-between text-[13px] mt-1" style={{ color: "var(--green)" }}>
                  <span>{selectedPackage.name} total</span>
                  <span className="font-bold">S${displayPackageTotal?.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[15px] font-semibold rounded"
              style={{ border: "1px solid var(--grey-300)", color: "var(--grey-700)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={saving}
              className="px-5 py-2 text-[15px] font-bold text-white rounded flex items-center gap-2"
              style={{ background: saving ? "var(--grey-400)" : "var(--blue-500)" }}
            >
              {saving && <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />}
              {saving ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Hover Info Panel (Sprint 1) ─── */
function HoverPanel({ apt, x, y }: { apt: Appointment; x: number; y: number }) {
  const name = getPatientName(apt);
  const phone = apt.isWalkin ? apt.walkinPhone : null;
  const statusColor = STATUS_COLORS[apt.status] || "#9baa9f";
  // Auto-flip if near right/bottom edge
  const panelWidth = 290;
  const panelHeight = 220;
  const left = x + panelWidth > window.innerWidth - 16 ? x - panelWidth - 12 : x + 14;
  const top = y + panelHeight > window.innerHeight - 16 ? y - panelHeight - 6 : y + 6;

  return (
    <div
      className="fixed z-[9999] yoda-fade-in pointer-events-none"
      style={{
        top, left, width: panelWidth,
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
        padding: 12,
        fontSize: 12,
      }}
      role="tooltip"
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: "var(--grey-200)" }}>
        <span className="font-bold text-[13px] truncate" style={{ color: "var(--grey-900)" }}>👤 {name}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase" style={{ background: `${statusColor}18`, color: statusColor }}>{apt.status}</span>
      </div>
      {phone && (
        <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--grey-700)" }}>
          <span>📞</span><span className="font-medium">{phone}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--grey-700)" }}>
        <span>🕒</span>
        <span>{formatTime12(apt.time)}{apt.endTime ? ` – ${formatTime12(apt.endTime)}` : ""} · {apt.duration || 30} min</span>
      </div>
      <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--grey-700)" }}>
        <span>🩺</span><span>{apt.doctorRef?.name || apt.doctor}</span>
      </div>
      {apt.treatmentName && (
        <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--grey-700)" }}>
          <span>💊</span>
          <span className="truncate">{apt.treatmentName}{apt.packageName ? ` · ${apt.packageName}` : ""}</span>
        </div>
      )}
      {apt.reason && (
        <div className="flex items-start gap-1.5 mb-1" style={{ color: "var(--grey-700)" }}>
          <span>📝</span><span className="italic line-clamp-2">{apt.reason}</span>
        </div>
      )}
      {apt.sessionPrice != null && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ color: "var(--grey-600)", borderColor: "var(--grey-200)" }}>
          <span>💳</span><span>S${(apt.sessionPrice ?? 0).toFixed(2)}/session</span>
        </div>
      )}
      {apt.isWalkin && (
        <div className="text-[10px] font-bold mt-1.5 px-1.5 py-0.5 rounded inline-block" style={{ background: "#fff7ed", color: "#ea580c" }}>WALK-IN</div>
      )}
      <div className="text-[10px] mt-2 pt-1.5 border-t text-center" style={{ color: "var(--grey-400)", borderColor: "var(--grey-200)" }}>
        Right-click for actions · Click to open
      </div>
    </div>
  );
}

/* ─── Right-click Context Menu (Sprint 1) ─── */
interface ContextMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}
function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const menuWidth = 210;
  const menuHeight = items.length * 36 + 8;
  const left = x + menuWidth > window.innerWidth - 16 ? window.innerWidth - menuWidth - 16 : x;
  const top = y + menuHeight > window.innerHeight - 16 ? window.innerHeight - menuHeight - 16 : y;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] yoda-fade-in"
      style={{
        top, left, width: menuWidth,
        background: "var(--white)",
        border: "1px solid var(--grey-300)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-lg)",
        padding: 4,
      }}
      role="menu"
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.divider && <div className="my-1 h-px" style={{ background: "var(--grey-200)" }} />}
          <button
            onClick={() => { item.onClick(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-[13px] transition-colors hover:bg-gray-100"
            style={{ color: item.danger ? "var(--red)" : "var(--grey-800)" }}
            role="menuitem"
          >
            <span className="w-4 text-center">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AppointmentsPage() {
  const { showFlash } = useFlash();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("Day");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState<{ apt: Appointment; x: number; y: number } | null>(null);
  const [bookModal, setBookModal] = useState<{ date: Date; time: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  // Deep-link: /appointments?waitlist=open opens the modal automatically
  useEffect(() => {
    if (searchParams?.get("waitlist") === "open") {
      setWaitlistOpen(true);
    }
  }, [searchParams]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Appointment[]>([]);

  // ─── Sprint 1: new state ─────────────────────────────────────────────
  const [hoverApt, setHoverApt] = useState<{ apt: Appointment; x: number; y: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ apt: Appointment; x: number; y: number } | null>(null);
  const [now, setNow] = useState(new Date());
  const [showCancelled, setShowCancelled] = useState(true);
  const [dynHourHeight, setDynHourHeight] = useState(72);
  const gridRef = useRef<HTMLDivElement>(null);

  // ─── Sprint 1b: More menu / 24h / drag-drop / clipboard ─────────────
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [is24Hour, setIs24Hour] = useState(false);
  const [dragApt, setDragApt] = useState<Appointment | null>(null);
  const [dragOver, setDragOver] = useState<{ dateKey: string; minutes: number } | null>(null);
  const [clipboard, setClipboard] = useState<Appointment | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu on outside click + Esc
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreMenuOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [moreMenuOpen]);

  // Esc clears clipboard (paste mode)
  useEffect(() => {
    if (!clipboard) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setClipboard(null); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [clipboard]);

  useEffect(() => { setMounted(true); }, []);

  // Current-time tick — updates the red now-line every 60s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fit-to-screen: measure available grid height, divide by 12 hours
  useEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      // Reserve 48px for day header, leave a tiny buffer for scrollbar absence
      const available = window.innerHeight - rect.top - 48 - 8;
      const perHour = Math.max(48, Math.min(96, Math.floor(available / 12)));
      setDynHourHeight(perHour);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mounted, viewMode]);

  // Search appointments with debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/appointments?search=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch doctors — defensive array guard
  useEffect(() => {
    fetch("/api/doctors?status=active")
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.doctors)
          ? data.doctors
          : [];
        setDoctors(list);
      })
      .catch(() => setDoctors([]));
  }, []);

  // Compute date range for fetch
  const dateRange = useMemo(() => {
    const d = new Date(selectedDate);
    if (viewMode === "Day") {
      return { from: toDateStr(d), to: toDateStr(d) };
    } else if (viewMode === "Week") {
      const start = getWeekStart(d);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: toDateStr(start), to: toDateStr(end) };
    } else if (viewMode === "5 Days") {
      const end = new Date(d);
      end.setDate(end.getDate() + 4);
      return { from: toDateStr(d), to: toDateStr(end) };
    } else {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { from: toDateStr(start), to: toDateStr(end) };
    }
  }, [selectedDate, viewMode]);

  // Fetch appointments — defensive array guard
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: dateRange.from, to: dateRange.to });
      if (selectedDoctor !== "all") params.set("doctorId", selectedDoctor);
      const res = await fetch(`/api/appointments?${params}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.appointments)
          ? data.appointments
          : [];
        setAppointments(list);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    }
    setLoading(false);
  }, [dateRange, selectedDoctor]);

  useEffect(() => { if (mounted) fetchAppointments(); }, [mounted, fetchAppointments]);

  // Doctor appointment counts for sidebar
  const doctorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      const dId = a.doctorId || a.doctor;
      counts[dId] = (counts[dId] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Status counts for right sidebar
  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, confirmed: 0, "in-progress": 0, completed: 0, cancelled: 0, "no-show": 0 };
    appointments.forEach(a => {
      if (a.status in counts) counts[a.status as keyof typeof counts]++;
    });
    return counts;
  }, [appointments]);

  // ─── Sprint 1: top-of-page stat counts (Today / In-progress / Confirmed / Week) ─
  const topStats = useMemo(() => {
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    let todayCount = 0, inProgress = 0, confirmed = 0, weekCount = 0;
    appointments.forEach(a => {
      const d = new Date(a.date);
      if (a.status === "cancelled") return;
      if (isSameDay(d, today)) todayCount++;
      if (a.status === "in-progress") inProgress++;
      if (a.status === "confirmed") confirmed++;
      if (d >= weekStart && d <= weekEnd) weekCount++;
    });
    return { todayCount, inProgress, confirmed, weekCount };
  }, [appointments]);

  // Filter appointments for display
  const filteredAppointments = useMemo(() => {
    if (selectedDoctor === "all") return appointments;
    return appointments.filter(a => a.doctorId === selectedDoctor || a.doctor === selectedDoctor);
  }, [appointments, selectedDoctor]);

  // Today's schedule (sorted by time)
  const todaysSchedule = useMemo(() => {
    const today = new Date();
    return [...appointments]
      .filter(a => {
        const d = new Date(a.date);
        return isSameDay(d, today) && a.status !== "cancelled";
      })
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [appointments]);

  // Navigation
  function navigate(dir: number) {
    const d = new Date(selectedDate);
    if (viewMode === "Day") d.setDate(d.getDate() + dir);
    else if (viewMode === "Week") d.setDate(d.getDate() + dir * 7);
    else if (viewMode === "5 Days") d.setDate(d.getDate() + dir * 5);
    else d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  }

  // Status update
  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showFlash({ type: "success", title: "Success", message: `Status updated to ${status}` });
        fetchAppointments();
      }
    } catch {
      showFlash({ type: "error", title: "Error", message: "Failed to update status" });
    }
  }

  // Get color for appointment block
  function getBlockColor(apt: Appointment) {
    const doctorIdx = doctors.findIndex(d => d.id === apt.doctorId);
    const idx = doctorIdx >= 0 ? doctorIdx : Math.abs(apt.doctor.charCodeAt(0)) % BLOCK_COLORS.length;
    return BLOCK_COLORS[idx % BLOCK_COLORS.length];
  }

  // Click on empty calendar slot to book — or paste from clipboard if in paste mode
  function handleSlotClick(date: Date, hour: number, isHalf: boolean) {
    const minutes = hour * 60 + (isHalf ? 30 : 0);
    const time = minutesToTime(minutes);
    if (clipboard) {
      duplicateAppointment(clipboard, date, time);
      return;
    }
    setBookModal({ date, time });
  }

  // ─── Sprint 1b: drag-and-drop reschedule + duplicate helpers ──────────

  function dateKey(d: Date) { return d.toISOString().slice(0, 10); }

  function hasConflict(doctorId: string | null, date: Date, startMin: number, durationMin: number, excludeId?: string): Appointment | null {
    if (!doctorId) return null;
    const dKey = dateKey(date);
    for (const a of appointments) {
      if (a.id === excludeId) continue;
      if (a.status === "cancelled") continue;
      if (dateKey(new Date(a.date)) !== dKey) continue;
      if ((a.doctorId || a.doctor) !== doctorId) continue;
      const aStart = timeToMinutes(a.time);
      const aEnd = aStart + (a.duration || 30);
      const newEnd = startMin + durationMin;
      // Overlap?
      if (startMin < aEnd && newEnd > aStart) return a;
    }
    return null;
  }

  async function rescheduleAppointment(apt: Appointment, newDate: Date, newTime: string) {
    const newStartMin = timeToMinutes(newTime);
    const duration = apt.duration || 30;
    const conflict = hasConflict(apt.doctorId || apt.doctor, newDate, newStartMin, duration, apt.id);
    if (conflict) {
      const cName = getPatientName(conflict);
      showFlash({ type: "error", title: "Conflict", message: `Slot taken by ${cName} at ${formatTime12(conflict.time)}` });
      return;
    }
    // Optimistic update
    const newDateStr = dateKey(newDate);
    const newEndTime = minutesToTime(newStartMin + duration);
    const prev = appointments;
    setAppointments(curr => curr.map(a => a.id === apt.id ? { ...a, date: newDateStr, time: newTime, endTime: newEndTime } : a));
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDateStr, time: newTime, duration }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showFlash({ type: "success", title: "Rescheduled", message: `${getPatientName(apt)} → ${formatTime12(newTime)}` });
    } catch {
      // Rollback
      setAppointments(prev);
      showFlash({ type: "error", title: "Failed", message: "Could not reschedule. Reverted." });
    }
  }

  async function duplicateAppointment(source: Appointment, newDate: Date, newTime: string) {
    const newStartMin = timeToMinutes(newTime);
    const duration = source.duration || 30;
    const conflict = hasConflict(source.doctorId || source.doctor, newDate, newStartMin, duration);
    if (conflict) {
      const cName = getPatientName(conflict);
      showFlash({ type: "error", title: "Conflict", message: `Slot taken by ${cName} at ${formatTime12(conflict.time)}` });
      return;
    }
    try {
      const res = await fetch(`/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: source.patientId,
          doctorId: source.doctorId,
          date: dateKey(newDate),
          time: newTime,
          duration,
          type: source.type,
          reason: source.reason,
          notes: source.notes,
          treatmentId: source.treatmentId,
          isWalkin: source.isWalkin,
          walkinName: source.walkinName,
          walkinPhone: source.walkinPhone,
          status: "scheduled",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showFlash({ type: "success", title: "Duplicated", message: `${getPatientName(source)} booked at ${formatTime12(newTime)}` });
      setClipboard(null);
      fetchAppointments();
    } catch {
      showFlash({ type: "error", title: "Failed", message: "Could not duplicate appointment" });
    }
  }

  // Hours for the timeline — HOUR_HEIGHT is now dynamic (fits to viewport)
  const HOUR_HEIGHT = dynHourHeight;
  // Sprint 1b: 24h toggle
  const START_HOUR = is24Hour ? 0 : 8;
  const END_HOUR = is24Hour ? 23 : 20;
  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  // Get columns (dates) for the view
  const viewDates = useMemo(() => {
    const dates: Date[] = [];
    if (viewMode === "Day") {
      dates.push(new Date(selectedDate));
    } else if (viewMode === "Week") {
      const start = getWeekStart(new Date(selectedDate));
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    } else if (viewMode === "5 Days") {
      for (let i = 0; i < 5; i++) {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + i);
        dates.push(d);
      }
    }
    return dates;
  }, [selectedDate, viewMode]);

  // Group appointments by date column
  function getAppointmentsForDate(date: Date) {
    return filteredAppointments.filter(a => {
      const ad = new Date(a.date);
      if (!isSameDay(ad, date)) return false;
      if (!showCancelled && a.status === "cancelled") return false;
      return true;
    });
  }

  if (!mounted) {
    return (
      <div className="p-8">
        <div className="h-8 w-40 rounded animate-pulse" style={{ background: "var(--grey-200)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col yoda-fade-in" style={{ background: "var(--background)", minHeight: "100vh" }}>
      {/* Quick Book Modal */}
      {bookModal && (
        <QuickBookModal
          date={bookModal.date}
          time={bookModal.time}
          doctors={doctors}
          onClose={() => setBookModal(null)}
          onBooked={() => {
            setBookModal(null);
            showFlash({ type: "success", title: "Success", message: "Appointment booked successfully!" });
            fetchAppointments();
          }}
        />
      )}

      {/* Waitlist Modal — accessible via button + ?waitlist=open query param */}
      {waitlistOpen && (
        <WaitlistModal
          onClose={() => {
            setWaitlistOpen(false);
            // Clear query param if present so the modal doesn't reopen on soft nav
            if (searchParams?.get("waitlist") === "open") {
              router.replace("/appointments");
            }
          }}
        />
      )}

      {/* Sprint 1b: Paste-mode banner */}
      {clipboard && (
        <div className="px-3 py-2 flex items-center justify-between text-[13px] font-semibold yoda-fade-in" style={{ background: "#fef9c3", color: "#854d0e", borderBottom: "1px solid #fde68a" }}>
          <span>📄 Paste mode — click any empty time slot to duplicate <strong>{getPatientName(clipboard)}</strong>&apos;s appointment</span>
          <button
            onClick={() => setClipboard(null)}
            className="px-2 py-0.5 rounded text-[12px] font-bold hover:bg-yellow-200 transition-colors"
            style={{ color: "#854d0e" }}
          >
            ✕ Cancel (Esc)
          </button>
        </div>
      )}

      {/* ─── Sprint 1: Top Stat Cards Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 pt-3 pb-2">
        {[
          { label: "Today's Appointments", value: topStats.todayCount, color: "#2d6a4f", bg: "#f0faf4", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
          { label: "In Progress",          value: topStats.inProgress, color: "#f97c00", bg: "#fff7ed", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
          { label: "Confirmed",            value: topStats.confirmed,  color: "#059669", bg: "#ecfdf5", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
          { label: "This Week",            value: topStats.weekCount,  color: "#7c3aed", bg: "#f5f3ff", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 px-3 py-2 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", boxShadow: "var(--shadow-sm)" }}>
            <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
              <svg className="w-4 h-4" fill="none" stroke={s.color} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: "var(--grey-500)" }}>{s.label}</p>
              <p className="text-[20px] font-bold leading-tight" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Toolbar Row 1: Date + Today + View Toggles + Nav + Export ─── */}
      <div className="flex items-center gap-0 border-b border-t overflow-x-auto" style={{ background: "#f8f8f8", borderColor: "var(--grey-300)", height: 52, marginTop: 8 }}>
        {/* Date display with calendar icon */}
        <div className="h-full flex items-center gap-2 px-4" style={{ borderRight: "1px solid var(--grey-300)" }}>
          <svg className="w-4 h-4" fill="none" stroke="var(--grey-600)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
            {viewMode === "Day" && formatDateLabel(selectedDate)}
            {viewMode === "Week" && `${formatDateShort(viewDates[0])} – ${formatDateShort(viewDates[6])}, ${viewDates[0].getFullYear()}`}
            {viewMode === "5 Days" && `${formatDateShort(viewDates[0])} – ${formatDateShort(viewDates[4])}, ${viewDates[0].getFullYear()}`}
            {viewMode === "Month" && `${["January","February","March","April","May","June","July","August","September","October","November","December"][selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
          </span>
        </div>

        {/* Today button */}
        <button
          onClick={() => setSelectedDate(new Date())}
          className="h-full px-5 text-[15px] font-bold transition-colors hover:bg-gray-200"
          style={{ color: "var(--grey-800)", borderRight: "1px solid var(--grey-300)" }}
        >
          Today
        </button>

        {/* View mode toggles */}
        <div className="flex h-full">
          {(["Month", "Week", "5 Days", "Day"] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="h-full px-2 sm:px-4 text-[13px] sm:text-[15px] font-semibold transition-colors whitespace-nowrap"
              style={{
                background: viewMode === mode ? "var(--white)" : "transparent",
                color: viewMode === mode ? "#2d6a4f" : "var(--grey-600)",
                borderRight: "1px solid var(--grey-300)",
                borderBottom: viewMode === mode ? "2px solid #2d6a4f" : "2px solid transparent",
                fontWeight: viewMode === mode ? 700 : 600,
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Nav arrows */}
        <button onClick={() => navigate(-1)} className="h-full px-3 flex items-center justify-center transition-colors hover:bg-gray-200" style={{ borderRight: "1px solid var(--grey-300)" }}>
          <svg className="w-4 h-4" fill="none" stroke="var(--grey-600)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => navigate(1)} className="h-full px-3 flex items-center justify-center transition-colors hover:bg-gray-200" style={{ borderRight: "1px solid var(--grey-300)" }}>
          <svg className="w-4 h-4" fill="none" stroke="var(--grey-600)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sprint 1b: More menu (replaces inline Show Cancelled checkbox) */}
        <div className="relative h-full" ref={moreMenuRef} style={{ borderRight: "1px solid var(--grey-300)" }}>
          <button
            onClick={() => setMoreMenuOpen(o => !o)}
            className="h-full flex items-center gap-1.5 px-3 text-[13px] font-semibold transition-colors hover:bg-gray-200 whitespace-nowrap"
            style={{ color: "var(--grey-700)" }}
            aria-haspopup="menu"
            aria-expanded={moreMenuOpen}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            More
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {moreMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-[230px] yoda-fade-in" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)", padding: 4, zIndex: 50 }} role="menu">
              <label className="flex items-center gap-2 px-3 py-2 rounded text-[13px] cursor-pointer hover:bg-gray-100" style={{ color: "var(--grey-800)" }}>
                <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="w-3.5 h-3.5" />
                <span>Show Cancelled</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded text-[13px] cursor-pointer hover:bg-gray-100" style={{ color: "var(--grey-800)" }}>
                <input type="checkbox" checked={is24Hour} onChange={(e) => setIs24Hour(e.target.checked)} className="w-3.5 h-3.5" />
                <span>24 Hours</span>
              </label>
              <div className="my-1 h-px" style={{ background: "var(--grey-200)" }} />
              <button
                type="button"
                onClick={() => { window.print(); setMoreMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-[13px] hover:bg-gray-100"
                style={{ color: "var(--grey-800)" }}
                role="menuitem"
              >
                <span className="w-4 text-center">🖨</span><span>Print Schedule</span>
              </button>
              <button
                type="button"
                onClick={() => { fetchAppointments(); setMoreMenuOpen(false); showFlash({ type: "info", title: "Refreshed", message: "Appointments resynced" }); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-[13px] hover:bg-gray-100"
                style={{ color: "var(--grey-800)" }}
                role="menuitem"
              >
                <span className="w-4 text-center">🔄</span><span>Resync</span>
              </button>
              <Link
                href="/doctors/new"
                onClick={() => setMoreMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-left text-[13px] hover:bg-gray-100"
                style={{ color: "var(--grey-800)" }}
                role="menuitem"
              >
                <span className="w-4 text-center">➕</span><span>Add Doctor</span>
              </Link>
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button
          onClick={() => {
            const rows = filteredAppointments.map(a => ({
              date: a.date,
              time: a.time,
              patient: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.walkinName || "Walk-in",
              doctor: a.doctorRef?.name || a.doctor,
              department: a.doctorRef?.department || a.department || "",
              type: a.type,
              status: a.status,
              reason: a.reason || "",
              treatment: a.treatmentName || "",
            }));
            downloadCSV(rows, [
              { key: "date", label: "Date" },
              { key: "time", label: "Time" },
              { key: "patient", label: "Patient" },
              { key: "doctor", label: "Doctor" },
              { key: "department", label: "Department" },
              { key: "type", label: "Type" },
              { key: "status", label: "Status" },
              { key: "reason", label: "Reason" },
              { key: "treatment", label: "Treatment" },
            ], `appointments-${selectedDate.toISOString().slice(0, 10)}`);
          }}
          className="h-full px-4 flex items-center gap-1.5 text-[14px] font-semibold transition-colors hover:bg-gray-200"
          style={{ color: "var(--grey-600)", borderLeft: "1px solid var(--grey-300)" }}
          aria-label="Export appointments to CSV"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          Export
        </button>

        {/* Schedule title on right */}
        <div className="h-full flex items-center px-5" style={{ borderLeft: "1px solid var(--grey-300)" }}>
          <span className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>
            {selectedDate.toLocaleDateString("en-SG", { month: "short", day: "numeric" })}&apos;s Schedule
          </span>
        </div>
      </div>

      {/* ─── Toolbar Row 2: Search + Doctor filter + Walk-in button ─── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b" style={{ background: "var(--white)", borderColor: "var(--grey-300)" }}>
        {/* Search */}
        <div className="relative flex-1 min-w-0" style={{ maxWidth: 400 }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--grey-400)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, doctor, reason..."
            className="w-full pl-10 pr-4 py-2 text-[15px]"
            style={{
              border: "1.5px solid var(--grey-300)",
              borderRadius: 6,
              color: "var(--grey-900)",
              background: "var(--white)",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2d6a4f"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--grey-300)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {searchQuery && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-[100] max-h-[280px] overflow-y-auto" style={{ background: "var(--white)", border: "1px solid var(--grey-300)" }}>
              {searchResults.map(apt => (
                <button
                  key={apt.id}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  style={{ borderBottom: "1px solid var(--grey-200)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d1f2e0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => {
                    setSelectedDate(new Date(apt.date));
                    setViewMode("Day");
                    setSearchQuery("");
                    setPopup({ apt, x: window.innerWidth / 2, y: 200 });
                  }}
                >
                  <div className="text-[15px] font-semibold" style={{ color: "var(--grey-900)" }}>{getPatientName(apt)}</div>
                  <div className="text-[13px] flex items-center gap-2 mt-0.5" style={{ color: "var(--grey-500)" }}>
                    <span>{new Date(apt.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</span>
                    <span>{formatTime12(apt.time)}</span>
                    <span className="font-semibold" style={{ color: STATUS_COLORS[apt.status] || "var(--grey-500)" }}>{apt.status}</span>
                    {apt.doctorRef && <span>Dr. {apt.doctorRef.name}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 p-3 rounded shadow-lg text-center" style={{ background: "var(--white)", border: "1px solid var(--grey-300)" }}>
              <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No appointments found</p>
            </div>
          )}
        </div>

        {/* Doctor dropdown */}
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          className="hidden md:block px-3 py-2 text-[15px] font-medium"
          style={{ border: "1.5px solid var(--grey-300)", borderRadius: 6, color: "var(--grey-900)", background: "var(--white)" }}
        >
          <option value="all">All Staff</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.role === "therapist" ? "T" : "D"})</option>)}
        </select>

        {/* + add walk in appointment button */}
        <button
          onClick={() => setBookModal({ date: new Date(), time: minutesToTime(Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15) })}
          className="flex items-center gap-2 px-4 py-2 text-[13px] sm:text-[15px] font-semibold transition-colors hover:opacity-90 whitespace-nowrap"
          style={{ background: "#2d6a4f", color: "#fff", borderRadius: 6 }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span className="hidden sm:inline">+ add walk in appointment</span>
          <span className="sm:hidden">+ Walk-in</span>
        </button>

        {/* 📋 Waitlist button — opens WaitlistModal */}
        <button
          onClick={() => setWaitlistOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] sm:text-[15px] font-semibold transition-colors whitespace-nowrap"
          style={{ background: "#fff", color: "#2d6a4f", border: "1.5px solid #2d6a4f", borderRadius: 6 }}
          title="View patients waiting for available slots"
        >
          <span>📋</span>
          <span className="hidden sm:inline">Waitlist</span>
        </button>
      </div>

      {/* ─── Main Layout: 3 columns ─── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Left Sidebar ─── */}
        <div className="hidden lg:flex flex-col w-[250px] border-r overflow-y-auto flex-shrink-0" style={{ background: "var(--white)", borderColor: "var(--grey-200)" }}>
          <div className="p-4">
            <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>

          <div className="border-t px-3 py-2" style={{ borderColor: "var(--grey-200)" }}>
            <button
              onClick={() => setSelectedDoctor("all")}
              className="flex items-center justify-between w-full py-2 px-2 text-[14px] font-bold rounded-sm transition-colors"
              style={{
                color: selectedDoctor === "all" ? "var(--blue-500)" : "var(--grey-800)",
                background: selectedDoctor === "all" ? "var(--blue-50)" : "transparent",
              }}
            >
              <span>All Staff</span>
              <span className="text-[13px] font-bold" style={{ color: "var(--grey-500)" }}>({appointments.length})</span>
            </button>

            {doctors.map(doc => {
              const count = doctorCounts[doc.id] || 0;
              const isActive = selectedDoctor === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoctor(doc.id)}
                  className="flex items-center justify-between w-full py-2 px-2 text-[14px] font-semibold rounded-sm transition-colors"
                  style={{
                    color: isActive ? "var(--blue-500)" : "var(--grey-700)",
                    background: isActive ? "var(--blue-50)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BLOCK_COLORS[doctors.indexOf(doc) % BLOCK_COLORS.length].bg }} />
                    <span className="truncate">{doc.name}</span>
                    <span className="text-[9px] font-bold uppercase px-1 py-0.5 rounded flex-shrink-0" style={{
                      background: doc.role === "therapist" ? "#f3e8ff" : "#ecfdf5",
                      color: doc.role === "therapist" ? "#7c3aed" : "#166534",
                    }}>
                      {doc.role === "therapist" ? "T" : "D"}{doc.gender ? (doc.gender === "male" ? "♂" : "♀") : ""}
                    </span>
                  </div>
                  <span className="text-[13px] ml-1" style={{ color: "var(--grey-500)" }}>({count})</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ─── Center: Calendar Grid ─── */}
        <div ref={gridRef} className="flex-1 min-w-0 overflow-auto relative" style={{ background: "var(--white)" }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(255,255,255,0.7)" }}>
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--grey-300)", borderTopColor: "var(--blue-500)" }} />
            </div>
          )}

          {viewMode === "Month" ? (
            <MonthView
              selectedDate={selectedDate}
              appointments={filteredAppointments}
              onDateClick={(d) => { setSelectedDate(d); setViewMode("Day"); }}
            />
          ) : (
            <div className="flex min-h-full">
              {/* Time labels */}
              <div className="flex-shrink-0 w-[84px]" style={{ borderRight: "2px solid var(--grey-300)", background: "#fafafa" }}>
                <div className="h-[48px] border-b" style={{ borderColor: "var(--grey-300)" }} />
                {hours.map(h => {
                  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  const ampm = h < 12 ? "am" : "pm";
                  return (
                    <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
                      <span className="absolute -top-[9px] right-3 text-[13px] font-bold" style={{ color: "var(--grey-700)" }}>
                        {hour12}:00 {ampm}
                      </span>
                      <span className="absolute right-3 text-[12px] font-medium" style={{ color: "var(--grey-400)", top: HOUR_HEIGHT / 2 - 7 }}>
                        {hour12}:30
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {viewDates.map((date, colIdx) => {
                const dayAppts = getAppointmentsForDate(date);
                const isToday = isSameDay(date, new Date());
                return (
                  <div key={colIdx} className="flex-1 min-w-[120px] relative" style={{ borderRight: colIdx < viewDates.length - 1 ? "1px solid var(--grey-300)" : "none" }}>
                    {/* Day header — hidden in Day view (date already shown in toolbar Row 1).
                         Empty 48px spacer kept so appointment-block top calc (+48) still aligns. */}
                    <div
                      className="h-[48px] flex items-center justify-center sticky top-0 z-10 border-b"
                      style={{
                        background: isToday ? "#d1f2e0" : "#f8f8f8",
                        borderColor: "var(--grey-300)",
                      }}
                    >
                      {viewMode !== "Day" && (
                        <span className="text-[15px] font-bold" style={{ color: isToday ? "#2d6a4f" : "var(--grey-700)" }}>
                          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()]} {date.getDate()}{date.getDate() === 1 || date.getDate() === 21 || date.getDate() === 31 ? "st" : date.getDate() === 2 || date.getDate() === 22 ? "nd" : date.getDate() === 3 || date.getDate() === 23 ? "rd" : "th"} {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][date.getMonth()]}
                        </span>
                      )}
                    </div>

                    {/* Clickable hour grid + Sprint 1b drop targets */}
                    {hours.map(h => {
                      // Highlight if this slot is the drop target during a drag
                      const dKey = dateKey(date);
                      const topMinutes = h * 60;
                      const botMinutes = h * 60 + 30;
                      const topActive = !!dragOver && dragOver.dateKey === dKey && dragOver.minutes === topMinutes;
                      const botActive = !!dragOver && dragOver.dateKey === dKey && dragOver.minutes === botMinutes;
                      // Cursor cue when in paste mode
                      const slotCursor = clipboard ? "copy" : "pointer";
                      return (
                        <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: "1px solid var(--grey-300)" }}>
                          {/* Top half-hour */}
                          <div
                            className="transition-colors"
                            style={{
                              height: HOUR_HEIGHT / 2,
                              borderBottom: "1px dashed var(--grey-200)",
                              background: topActive ? "rgba(45,106,79,0.18)" : "transparent",
                              outline: topActive ? "2px dashed #2d6a4f" : "none",
                              cursor: slotCursor,
                            }}
                            onMouseEnter={(e) => { if (!dragApt && !topActive) e.currentTarget.style.background = "rgba(45,106,79,0.04)"; }}
                            onMouseLeave={(e) => { if (!topActive) e.currentTarget.style.background = "transparent"; }}
                            onClick={() => handleSlotClick(date, h, false)}
                            onDragOver={(e) => { if (dragApt) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver({ dateKey: dKey, minutes: topMinutes }); } }}
                            onDragLeave={() => { if (topActive) setDragOver(null); }}
                            onDrop={(e) => {
                              if (!dragApt) return;
                              e.preventDefault();
                              const apt = dragApt;
                              setDragApt(null);
                              setDragOver(null);
                              rescheduleAppointment(apt, date, minutesToTime(topMinutes));
                            }}
                            title={clipboard ? `Paste here at ${formatTime12(minutesToTime(topMinutes))}` : `Book at ${formatTime12(minutesToTime(topMinutes))}`}
                          />
                          {/* Bottom half-hour */}
                          <div
                            className="transition-colors"
                            style={{
                              height: HOUR_HEIGHT / 2,
                              background: botActive ? "rgba(45,106,79,0.18)" : "transparent",
                              outline: botActive ? "2px dashed #2d6a4f" : "none",
                              cursor: slotCursor,
                            }}
                            onMouseEnter={(e) => { if (!dragApt && !botActive) e.currentTarget.style.background = "rgba(45,106,79,0.04)"; }}
                            onMouseLeave={(e) => { if (!botActive) e.currentTarget.style.background = "transparent"; }}
                            onClick={() => handleSlotClick(date, h, true)}
                            onDragOver={(e) => { if (dragApt) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver({ dateKey: dKey, minutes: botMinutes }); } }}
                            onDragLeave={() => { if (botActive) setDragOver(null); }}
                            onDrop={(e) => {
                              if (!dragApt) return;
                              e.preventDefault();
                              const apt = dragApt;
                              setDragApt(null);
                              setDragOver(null);
                              rescheduleAppointment(apt, date, minutesToTime(botMinutes));
                            }}
                            title={clipboard ? `Paste here at ${formatTime12(minutesToTime(botMinutes))}` : `Book at ${formatTime12(minutesToTime(botMinutes))}`}
                          />
                        </div>
                      );
                    })}

                    {/* Appointment blocks — laid out side-by-side when overlapping */}
                    {layoutAppointments(dayAppts).map(apt => {
                      const startMin = timeToMinutes(apt.time);
                      const duration = apt.duration || 30;
                      const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT + 48;
                      const height = Math.max((duration / 60) * HOUR_HEIGHT - 2, 22);
                      const color = getBlockColor(apt);
                      const name = getPatientName(apt);
                      const isCancelled = apt.status === "cancelled";
                      // Short appointments hide action icons for space
                      const showActions = height >= 42;
                      const phone = apt.isWalkin ? apt.walkinPhone : null;

                      // Sprint 1b drag/clipboard visual cues
                      const isBeingDragged = dragApt?.id === apt.id;
                      const isClipboardSource = clipboard?.id === apt.id;

                      // Side-by-side overlap layout
                      const laneWidth = 100 / apt.totalLanes;
                      const leftPct = apt.lane * laneWidth;

                      return (
                        <div
                          key={apt.id}
                          className="absolute overflow-hidden text-left transition-all hover:shadow-md cursor-grab active:cursor-grabbing group"
                          draggable={!isCancelled}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${laneWidth}% - 4px)`,
                            background: apt.isWalkin ? `repeating-linear-gradient(135deg, ${color.bg}, ${color.bg} 4px, ${color.bg}dd 4px, ${color.bg}dd 8px)` : color.bg,
                            color: color.text,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11,
                            lineHeight: "15px",
                            zIndex: 5,
                            borderLeft: `3px solid ${color.bg === "#f9a825" ? "#e88f00" : "rgba(0,0,0,0.15)"}`,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            // Sprint 1: cancelled = strikethrough + dim
                            opacity: isCancelled ? 0.55 : (isBeingDragged ? 0.4 : 1),
                            textDecoration: isCancelled ? "line-through" : "none",
                            // Sprint 1b: dashed outline = "this is on clipboard"
                            outline: isClipboardSource ? "2px dashed #fbbf24" : "none",
                            outlineOffset: isClipboardSource ? 2 : 0,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHoverApt(null);
                            setPopup({ apt, x: e.clientX, y: e.clientY });
                          }}
                          onMouseEnter={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setHoverApt({ apt, x: r.right, y: r.top });
                          }}
                          onMouseLeave={() => setHoverApt(null)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHoverApt(null);
                            setCtxMenu({ apt, x: e.clientX, y: e.clientY });
                          }}
                          // Sprint 1b: drag-and-drop reschedule
                          onDragStart={(e) => {
                            if (isCancelled) { e.preventDefault(); return; }
                            setHoverApt(null);
                            setDragApt(apt);
                            e.dataTransfer.effectAllowed = "move";
                            try { e.dataTransfer.setData("text/plain", apt.id); } catch { /* ignore */ }
                          }}
                          onDragEnd={() => { setDragApt(null); setDragOver(null); }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${name} at ${formatTime12(apt.time)}, status ${apt.status}, drag to reschedule`}
                        >
                          <div className="font-bold truncate flex items-center justify-between gap-1">
                            <span className="truncate">{formatTime12(apt.time)}{apt.endTime ? ` - ${formatTime12(apt.endTime)}` : ""}{apt.department ? ` (${apt.department})` : ""}</span>
                            {/* Sprint 1: quick actions on hover — check-in + WhatsApp */}
                            {showActions && !isCancelled && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                {apt.status !== "confirmed" && apt.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setHoverApt(null); updateStatus(apt.id, "confirmed"); }}
                                    title="Check in (mark confirmed)"
                                    aria-label="Check in patient"
                                    className="w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold hover:bg-white/30"
                                    style={{ color: color.text }}
                                  >✓</button>
                                )}
                                {phone && (
                                  <a
                                    href={`https://wa.me/${phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(`Hi ${name.split(" ")[0]}, reminder of your appointment on ${apt.date} at ${formatTime12(apt.time)}.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Send WhatsApp reminder"
                                    aria-label="Send WhatsApp reminder"
                                    className="w-4 h-4 flex items-center justify-center rounded text-[10px] hover:bg-white/30"
                                    style={{ color: color.text }}
                                  >📱</a>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="truncate font-medium">{name}</div>
                        </div>
                      );
                    })}

                    {/* Sprint 1: Red current-time indicator (only on today's column) */}
                    {(() => {
                      const nowMin = now.getHours() * 60 + now.getMinutes();
                      const startMin = START_HOUR * 60;
                      const endMin = END_HOUR * 60 + 60;
                      if (!isSameDay(date, now) || nowMin < startMin || nowMin > endMin) return null;
                      const nowTop = ((nowMin - startMin) / 60) * HOUR_HEIGHT + 48;
                      return (
                        <div
                          className="absolute left-0 right-0 pointer-events-none"
                          style={{ top: nowTop, zIndex: 4 }}
                          aria-hidden="true"
                        >
                          <div
                            className="absolute"
                            style={{ left: -4, top: -4, width: 9, height: 9, borderRadius: "50%", background: "#dc2626", boxShadow: "0 0 0 2px rgba(220,38,38,0.2)" }}
                          />
                          <div style={{ height: 2, background: "#dc2626" }} />
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right Sidebar: Today's Schedule ─── */}
        <div className="hidden xl:flex flex-col w-[300px] border-l overflow-y-auto flex-shrink-0" style={{ background: "var(--white)", borderColor: "var(--grey-200)" }}>
          <div className="p-4 border-b" style={{ borderColor: "var(--grey-200)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Today&apos;s Schedule</h2>
              <span className="text-[13px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--blue-50)", color: "var(--blue-500)" }}>{todaysSchedule.length}</span>
            </div>

            {/* Status summary cards - 3x2 grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Scheduled", count: statusCounts.scheduled, color: STATUS_COLORS.scheduled },
                { label: "Waiting", count: statusCounts.confirmed, color: STATUS_COLORS.confirmed },
                { label: "Engaged", count: statusCounts["in-progress"], color: STATUS_COLORS["in-progress"] },
                { label: "Done", count: statusCounts.completed, color: STATUS_COLORS.completed },
                { label: "No-Show", count: statusCounts["no-show"], color: STATUS_COLORS["no-show"] },
                { label: "Cancelled", count: statusCounts.cancelled, color: STATUS_COLORS.cancelled },
              ].map(s => (
                <div key={s.label} className="text-center py-2 rounded-md" style={{ background: s.count > 0 ? `${s.color}08` : "transparent" }}>
                  <div className="text-[18px] font-black" style={{ color: s.color }}>{s.count}</div>
                  <div className="text-[8px] font-bold uppercase tracking-wide" style={{ color: "var(--grey-500)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* No-Show Follow-up Section */}
          {statusCounts["no-show"] > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--grey-200)", background: "#fdf2f8" }}>
              <p className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color: "#b125c0" }}>
                No-Show Follow-up Required
              </p>
              {todaysSchedule.filter(a => a.status === "no-show").map(apt => (
                <div key={apt.id} className="flex items-center justify-between py-1.5 text-[13px]">
                  <div>
                    <span className="font-bold" style={{ color: "var(--grey-900)" }}>{getPatientName(apt)}</span>
                    <span className="ml-1" style={{ color: "var(--grey-500)" }}>{formatTime12(apt.time)}</span>
                  </div>
                  <div className="flex gap-1">
                    {apt.patientId ? (
                      <Link href={`/patients/${apt.patientId}`} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "var(--blue-50)", color: "var(--blue-500)" }}>
                        View
                      </Link>
                    ) : apt.walkinPhone ? (
                      <a href={`https://wa.me/${apt.walkinPhone}`} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "#e8f5e9", color: "#25d366" }}>
                        WhatsApp
                      </a>
                    ) : null}
                    <button
                      onClick={() => {
                        updateStatus(apt.id, "scheduled");
                        showFlash({ type: "success", title: "Success", message: "Rescheduled — update the time in details" });
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{ background: "#fff3e0", color: "#e65100" }}
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schedule list */}
          <div className="flex-1 overflow-y-auto">
            {todaysSchedule.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[14px]" style={{ color: "var(--grey-500)" }}>No appointments today</p>
              </div>
            ) : (
              todaysSchedule.map(apt => (
                <div
                  key={apt.id}
                  className="px-3 py-2 border-b transition-colors hover:bg-gray-50 cursor-pointer group"
                  style={{ borderColor: "var(--grey-100)" }}
                  onClick={(e) => { e.stopPropagation(); setPopup({ apt, x: e.clientX, y: e.clientY }); }}
                >
                  {/* Compact row: time + name + status */}
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black flex-shrink-0 w-[56px]" style={{ color: "var(--blue-500)" }}>
                      {formatTime12(apt.time)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: "var(--grey-900)" }}>
                        {getPatientName(apt)}
                      </p>
                    </div>
                    <select
                      value={apt.status}
                      onChange={(e) => { e.stopPropagation(); updateStatus(apt.id, e.target.value); }}
                      className="text-[8px] font-bold uppercase px-1 py-0.5 rounded cursor-pointer flex-shrink-0"
                      style={{ color: STATUS_COLORS[apt.status] || "var(--grey-600)", background: `${STATUS_COLORS[apt.status] || "var(--grey-200)"}12`, border: "none", maxWidth: 80 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  {/* Compact sub-info */}
                  <div className="flex items-center gap-1 mt-0.5 ml-[56px]">
                    <span className="text-[9px]" style={{ color: "var(--grey-400)" }}>{apt.doctorRef?.name || apt.doctor}</span>
                    {apt.isWalkin && (
                      <span className="px-1 rounded text-[7px] font-bold" style={{ background: "#d1f2e0", color: "#14532d" }}>WALK-IN</span>
                    )}
                    {apt.isWalkin && !apt.patientId && (
                      <Link
                        href={`/patients/new?walkinName=${encodeURIComponent(apt.walkinName || "")}&walkinPhone=${encodeURIComponent(apt.walkinPhone || "")}&appointmentId=${apt.id}`}
                        className="text-[8px] font-bold px-1 rounded"
                        style={{ background: "#fff3e0", color: "#e65100" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Register
                      </Link>
                    )}
                    {apt.status === "completed" && (
                      <Link
                        href={`/billing/new?appointmentId=${apt.id}`}
                        className="text-[8px] font-bold px-1 rounded"
                        style={{ background: "#e8f5e9", color: "#2e7d32" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Invoice
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sprint 1: Hover info panel (doesn't render while context menu open) */}
      {hoverApt && !ctxMenu && !popup && (
        <HoverPanel apt={hoverApt.apt} x={hoverApt.x} y={hoverApt.y} />
      )}

      {/* Sprint 1: Right-click context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            { label: "Open Details", icon: "👁", onClick: () => setPopup({ apt: ctxMenu.apt, x: ctxMenu.x, y: ctxMenu.y }) },
            { label: "Duplicate Here…", icon: "📄", onClick: () => {
              setClipboard(ctxMenu.apt);
              showFlash({ type: "info", title: "Paste mode", message: "Click any empty slot to duplicate. Esc to cancel." });
            }},
            { label: "Mark Confirmed", icon: "✓", divider: true, onClick: () => updateStatus(ctxMenu.apt.id, "confirmed") },
            { label: "Mark In-Progress", icon: "▶", onClick: () => updateStatus(ctxMenu.apt.id, "in-progress") },
            { label: "Mark Completed", icon: "☑", onClick: () => updateStatus(ctxMenu.apt.id, "completed") },
            { label: "Copy Phone", icon: "📋", divider: true, onClick: () => {
              const p = ctxMenu.apt.isWalkin ? ctxMenu.apt.walkinPhone : null;
              if (p) {
                navigator.clipboard?.writeText(p);
                showFlash({ type: "success", title: "Copied", message: `${p} copied to clipboard` });
              } else {
                showFlash({ type: "info", title: "No phone", message: "This appointment has no phone number" });
              }
            }},
            { label: "Send WhatsApp", icon: "📱", onClick: () => {
              const p = ctxMenu.apt.isWalkin ? ctxMenu.apt.walkinPhone : null;
              const n = getPatientName(ctxMenu.apt);
              if (p) {
                const msg = `Hi ${n.split(" ")[0]}, reminder of your appointment on ${ctxMenu.apt.date} at ${formatTime12(ctxMenu.apt.time)}.`;
                window.open(`https://wa.me/${p.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
              } else {
                showFlash({ type: "info", title: "No phone", message: "Cannot send reminder — no phone number" });
              }
            }},
            { label: "Mark No-Show", icon: "✖", divider: true, onClick: () => updateStatus(ctxMenu.apt.id, "no-show") },
            { label: "Cancel Appointment", icon: "🗑", danger: true, onClick: () => updateStatus(ctxMenu.apt.id, "cancelled") },
          ]}
        />
      )}

      {/* ─── Appointment Detail Popup ─── */}
      {popup && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setPopup(null)} />
          <div
            className="fixed z-[101] p-4 yoda-slide-in"
            style={{
              top: Math.min(popup.y, window.innerHeight - 300),
              left: Math.min(popup.x, window.innerWidth - 320),
              width: 300,
              background: "var(--white)",
              border: "1px solid var(--grey-300)",
              borderRadius: "var(--radius)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold" style={{ color: "var(--grey-900)" }}>Appointment Details</h3>
              <button onClick={() => setPopup(null)} className="text-[16px]" style={{ color: "var(--grey-500)" }}>&times;</button>
            </div>

            <div className="space-y-2 text-[14px]">
              <div>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>Patient: </span>
                {popup.apt.isWalkin ? (
                  <span>
                    <span className="font-semibold" style={{ color: "var(--grey-700)" }}>{popup.apt.walkinName}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "#d1f2e0", color: "#14532d" }}>WALK-IN</span>
                  </span>
                ) : popup.apt.patientId ? (
                  <Link href={`/patients/${popup.apt.patientId}`} className="font-semibold hover:underline" style={{ color: "var(--blue-500)" }}>
                    {popup.apt.patient?.firstName} {popup.apt.patient?.lastName}
                  </Link>
                ) : (
                  <span style={{ color: "var(--grey-500)" }}>Unknown</span>
                )}
              </div>
              {popup.apt.isWalkin && popup.apt.walkinPhone && (
                <div>
                  <span className="font-bold" style={{ color: "var(--grey-900)" }}>Phone: </span>
                  <span style={{ color: "var(--grey-700)" }}>{popup.apt.walkinPhone}</span>
                </div>
              )}
              <div>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>Time: </span>
                <span style={{ color: "var(--grey-700)" }}>{formatTime12(popup.apt.time)}{popup.apt.endTime ? ` - ${formatTime12(popup.apt.endTime)}` : ""} ({popup.apt.duration} min)</span>
              </div>
              <div>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>Doctor: </span>
                <span style={{ color: "var(--grey-700)" }}>{popup.apt.doctorRef?.name || popup.apt.doctor}</span>
              </div>
              {popup.apt.department && (
                <div>
                  <span className="font-bold" style={{ color: "var(--grey-900)" }}>Dept: </span>
                  <span style={{ color: "var(--grey-700)" }}>{popup.apt.department}</span>
                </div>
              )}
              <div>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>Type: </span>
                <span style={{ color: "var(--grey-700)" }}>{popup.apt.type}</span>
              </div>
              {popup.apt.reason && (
                <div>
                  <span className="font-bold" style={{ color: "var(--grey-900)" }}>Reason: </span>
                  <span style={{ color: "var(--grey-700)" }}>{popup.apt.reason}</span>
                </div>
              )}
              {popup.apt.treatmentName && (
                <div>
                  <span className="font-bold" style={{ color: "var(--grey-900)" }}>Treatment: </span>
                  <span style={{ color: "var(--grey-700)" }}>{popup.apt.treatmentName}</span>
                  {popup.apt.packageName && <span className="ml-1 text-[12px] px-1.5 py-0.5 rounded font-bold" style={{ background: "#c8e6c9", color: "#2e7d32" }}>{popup.apt.packageName}</span>}
                </div>
              )}
              {popup.apt.sessionPrice != null && (
                <div>
                  <span className="font-bold" style={{ color: "var(--grey-900)" }}>Price: </span>
                  <span style={{ color: "var(--grey-700)" }}>S${(popup.apt.sessionPrice ?? 0).toFixed(2)}/session</span>
                </div>
              )}

              {/* Generate Invoice for completed appointments */}
              {popup.apt.status === "completed" && (
                <Link
                  href={`/billing/new?appointmentId=${popup.apt.id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 mt-2 text-[14px] font-bold rounded transition-colors"
                  style={{ background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                  Generate Invoice
                </Link>
              )}

              {/* Register walk-in link */}
              {popup.apt.isWalkin && !popup.apt.patientId && (
                <Link
                  href={`/patients/new?walkinName=${encodeURIComponent(popup.apt.walkinName || "")}&walkinPhone=${encodeURIComponent(popup.apt.walkinPhone || "")}&appointmentId=${popup.apt.id}`}
                  className="flex items-center justify-center gap-1 w-full py-2 mt-2 text-[14px] font-bold rounded"
                  style={{ background: "#d1f2e0", color: "#14532d", border: "1px solid #6bc792" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Register This Patient
                </Link>
              )}

              {/* Status change */}
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--grey-200)" }}>
                <span className="font-bold" style={{ color: "var(--grey-900)" }}>Status:</span>
                <select
                  value={popup.apt.status}
                  onChange={(e) => { updateStatus(popup.apt.id, e.target.value); setPopup(null); }}
                  className="flex-1 px-2 py-1 text-[14px] font-semibold"
                  style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)" }}
                >
                  {["scheduled", "confirmed", "in-progress", "completed", "cancelled", "no-show"].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Mobile bottom bar ─── */}
      <div className="lg:hidden flex items-center gap-2 p-3 border-t" style={{ background: "var(--white)", borderColor: "var(--grey-300)" }}>
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          className="flex-1 px-2 py-2 text-[14px]"
          style={{ border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)" }}
        >
          <option value="all">All Staff</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.role === "therapist" ? "Therapist" : "Doctor"})</option>)}
        </select>
        <button
          onClick={() => setBookModal({ date: selectedDate, time: "09:00" })}
          className="px-4 py-2 text-[14px] font-bold text-white"
          style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
        >
          + Book
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* Month View Component                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
function MonthView({
  selectedDate,
  appointments,
  onDateClick,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  onDateClick: (d: Date) => void;
}) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay: Record<number, Appointment[]> = {};
  appointments.forEach(a => {
    const d = new Date(a.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(a);
    }
  });

  return (
    <div className="p-2">
      <div className="grid grid-cols-7 border-l border-t" style={{ borderColor: "var(--grey-300)" }}>
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => (
          <div key={d} className="p-2 text-[13px] font-bold text-center border-r border-b" style={{ borderColor: "var(--grey-300)", color: "var(--grey-500)", background: "var(--grey-50)" }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          const isToday = day ? isSameDay(new Date(year, month, day), today) : false;
          const dayAppts = day ? (byDay[day] || []) : [];
          return (
            <div
              key={i}
              className="min-h-[80px] p-1 border-r border-b cursor-pointer transition-colors"
              style={{ borderColor: "var(--grey-300)", background: isToday ? "var(--blue-50)" : "transparent" }}
              onMouseEnter={(e) => { if (!isToday && day) e.currentTarget.style.background = "#d1f2e0"; }}
              onMouseLeave={(e) => { if (!isToday && day) e.currentTarget.style.background = "transparent"; }}
              onClick={() => day && onDateClick(new Date(year, month, day))}
            >
              {day && (
                <>
                  <div className="text-[14px] font-bold mb-0.5" style={{ color: isToday ? "var(--blue-500)" : "var(--grey-700)" }}>{day}</div>
                  {dayAppts.slice(0, 3).map(a => (
                    <div key={a.id} className="text-[12px] truncate px-1 py-0.5 mb-0.5 rounded" style={{ background: a.isWalkin ? "#d1f2e0" : "var(--blue-50)", color: a.isWalkin ? "#14532d" : "var(--blue-500)" }}>
                      {a.time} {getPatientName(a)}
                    </div>
                  ))}
                  {dayAppts.length > 3 && (
                    <div className="text-[9px] font-bold px-1" style={{ color: "var(--blue-500)" }}>+{dayAppts.length - 3} more</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
