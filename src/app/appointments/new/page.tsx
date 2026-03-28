"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  patientIdNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface Doctor {
  id: string;
  doctorIdNumber: string;
  name: string;
  specialization: string;
  department: string;
  consultationFee: number;
  status: string;
}

interface Slot {
  time: string;
  available: boolean;
}

type Step = 1 | 2 | 3 | 4 | 5;

// ─── YODA Design Tokens ─────────────────────────────────────────────────────
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-card)" };
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "13px" };
const btnPrimary = { background: "var(--blue-500)", borderRadius: "var(--radius-sm)" };

// ─── Utility ────────────────────────────────────────────────────────────────
function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Toast Component ────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 right-6 z-50 px-4 py-3 flex items-center gap-3 text-[13px] font-medium yoda-slide-in"
      style={{
        borderRadius: "var(--radius)",
        background: type === "success" ? "var(--green-light)" : "var(--red-light)",
        color: type === "success" ? "var(--green)" : "var(--red)",
        boxShadow: "var(--shadow-md)",
        border: `1px solid ${type === "success" ? "var(--green)" : "var(--red)"}`,
      }}
    >
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 font-bold opacity-60 hover:opacity-100">&times;</button>
    </div>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────────────
function StepIndicator({ current, labels }: { current: Step; labels: string[] }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {labels.map((label, i) => {
        const step = (i + 1) as Step;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <div className="w-6 h-[2px] flex-shrink-0" style={{ background: isCompleted ? "var(--blue-500)" : "var(--grey-300)" }} />
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  borderRadius: "var(--radius-pill)",
                  background: isActive ? "var(--blue-500)" : isCompleted ? "var(--blue-500)" : "var(--grey-200)",
                  color: isActive || isCompleted ? "var(--white)" : "var(--grey-600)",
                }}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: isActive ? "var(--blue-500)" : isCompleted ? "var(--grey-900)" : "var(--grey-500)" }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function BookAppointmentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Patient
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Step 2: Doctor
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 3: Date & Time
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Step 4: Details
  const [apptType, setApptType] = useState("consultation");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // ─── Step 1: Search patients ──────────────────────────────────────────────
  const searchPatients = useCallback(() => {
    if (!patientSearch || patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    setPatientsLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setPatients(data); })
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [patientSearch]);

  useEffect(() => {
    const timeout = setTimeout(searchPatients, 300);
    return () => clearTimeout(timeout);
  }, [searchPatients]);

  // ─── Step 2: Fetch doctors ────────────────────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      setDoctorsLoading(true);
      fetch("/api/doctors?status=active")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setDoctors(data); })
        .catch(() => setDoctors([]))
        .finally(() => setDoctorsLoading(false));
    }
  }, [step]);

  // ─── Step 3: Fetch slots ─────────────────────────────────────────────────
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setSlotsLoading(true);
      setSlotsMessage("");
      setSelectedSlot("");
      fetch(`/api/doctors/${selectedDoctor.id}/slots?date=${selectedDate}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.slots) {
            setSlots(data.slots);
            if (data.slots.length === 0) {
              setSlotsMessage("No available slots on this day. The doctor may not work on this day.");
            }
          } else {
            setSlots([]);
            setSlotsMessage(data.error || "Unable to fetch slots");
          }
        })
        .catch(() => {
          setSlots([]);
          setSlotsMessage("Failed to load available slots");
        })
        .finally(() => setSlotsLoading(false));
    }
  }, [selectedDoctor, selectedDate]);

  // ─── Get unique departments ───────────────────────────────────────────────
  const departments = [...new Set(doctors.map((d) => d.department))].sort();
  const filteredDoctors = departmentFilter
    ? doctors.filter((d) => d.department === departmentFilter)
    : doctors;

  // ─── Navigation ──────────────────────────────────────────────────────────
  function canProceed(): boolean {
    switch (step) {
      case 1: return selectedPatient !== null;
      case 2: return selectedDoctor !== null;
      case 3: return selectedDate !== "" && selectedSlot !== "";
      case 4: return apptType !== "" && reason.trim() !== "";
      default: return true;
    }
  }

  function goNext() {
    if (canProceed() && step < 5) setStep((step + 1) as Step);
  }

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  // ─── Submit ──────────────────────────────────────────────────────────────
  async function handleBook() {
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          doctorId: selectedDoctor.id,
          date: selectedDate,
          time: selectedSlot,
          doctor: selectedDoctor.name,
          department: selectedDoctor.department,
          type: apptType,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to book appointment");
      }
      setToast({ message: "Appointment booked successfully!", type: "success" });
      setTimeout(() => router.push("/appointments"), 1500);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to book appointment", type: "error" });
      setSubmitting(false);
    }
  }

  const stepLabels = ["Patient", "Doctor", "Date & Time", "Details", "Confirm"];

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/appointments"
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)", color: "var(--grey-600)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Book Appointment</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>Step {step} of 5</p>
        </div>
      </div>

      {/* ── Step Indicator ──────────────────────────────────────── */}
      <StepIndicator current={step} labels={stepLabels} />

      {/* ── Step Content ────────────────────────────────────────── */}
      <div className="max-w-2xl">
        {/* ═══ STEP 1: Select Patient ═══ */}
        {step === 1 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Select Patient</h2>

            {selectedPatient ? (
              <div className="p-4 flex items-center justify-between" style={{ ...cardStyle, borderColor: "var(--blue-500)", background: "var(--blue-50)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: "var(--blue-500)", color: "var(--white)", borderRadius: "var(--radius-pill)" }}
                  >
                    {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                      {selectedPatient.patientIdNumber} &middot; {selectedPatient.phone}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-[12px] font-semibold hover:underline"
                  style={{ color: "var(--red)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--grey-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, phone, or patient ID..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-[13px]"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                {patientsLoading && (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                )}

                {!patientsLoading && patientSearch.length >= 2 && patients.length === 0 && (
                  <p className="text-[13px] text-center py-8" style={{ color: "var(--grey-500)" }}>
                    No patients found for &quot;{patientSearch}&quot;
                  </p>
                )}

                {!patientsLoading && patients.length > 0 && (
                  <div className="space-y-2">
                    {patients.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]); }}
                        className="w-full text-left p-3 flex items-center gap-3 transition-colors"
                        style={{ ...cardStyle, cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--grey-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ background: "var(--blue-50)", color: "var(--blue-500)", borderRadius: "var(--radius-pill)" }}
                        >
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: "var(--grey-900)" }}>
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[11px]" style={{ color: "var(--grey-500)" }}>
                            {p.patientIdNumber} &middot; {p.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!patientsLoading && patientSearch.length < 2 && (
                  <p className="text-[13px] text-center py-8" style={{ color: "var(--grey-500)" }}>
                    Type at least 2 characters to search patients
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 2: Select Doctor ═══ */}
        {step === 2 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Select Doctor</h2>

            {selectedDoctor ? (
              <div className="p-4 flex items-center justify-between" style={{ ...cardStyle, borderColor: "var(--blue-500)", background: "var(--blue-50)" }}>
                <div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{selectedDoctor.name}</p>
                  <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                    {selectedDoctor.specialization} &middot; {selectedDoctor.department}
                  </p>
                  <p className="text-[12px] font-medium mt-0.5" style={{ color: "var(--blue-500)" }}>
                    Fee: &#8377;{selectedDoctor.consultationFee}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedDoctor(null); setSelectedDate(""); setSelectedSlot(""); setSlots([]); }}
                  className="text-[12px] font-semibold hover:underline"
                  style={{ color: "var(--red)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-3 py-2 w-full sm:w-auto min-w-[200px]"
                    style={inputStyle}
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {doctorsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <p className="text-[13px] text-center py-8" style={{ color: "var(--grey-500)" }}>
                    No active doctors found{departmentFilter ? ` in ${departmentFilter}` : ""}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredDoctors.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDoctor(d)}
                        className="w-full text-left p-4 transition-all"
                        style={{ ...cardStyle, cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--blue-500)"; e.currentTarget.style.background = "var(--blue-50)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--grey-300)"; e.currentTarget.style.background = "var(--white)"; }}
                      >
                        <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>{d.name}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--grey-600)" }}>{d.specialization}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] px-2 py-0.5 font-medium" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)", color: "var(--grey-600)" }}>
                            {d.department}
                          </span>
                          <span className="text-[12px] font-semibold" style={{ color: "var(--blue-500)" }}>
                            &#8377;{d.consultationFee}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ STEP 3: Pick Date & Time ═══ */}
        {step === 3 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Pick Date & Time</h2>

            <div className="mb-4">
              <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-600)" }}>
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                min={getTodayString()}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                className="px-3 py-2.5 w-full sm:w-auto"
                style={inputStyle}
              />
              {selectedDate && (
                <p className="text-[12px] mt-1" style={{ color: "var(--grey-600)" }}>
                  {formatDateDisplay(selectedDate)}
                </p>
              )}
            </div>

            {selectedDate && (
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--grey-600)" }}>
                  Available Time Slots
                </label>

                {slotsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="w-20 h-9 animate-pulse" style={{ background: "var(--grey-100)", borderRadius: "var(--radius-sm)" }} />
                    ))}
                  </div>
                ) : slotsMessage ? (
                  <p className="text-[13px] py-4" style={{ color: "var(--grey-500)" }}>{slotsMessage}</p>
                ) : slots.length === 0 ? (
                  <p className="text-[13px] py-4" style={{ color: "var(--grey-500)" }}>No slots configured for this day.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => {
                      const isSelected = selectedSlot === s.time;
                      return (
                        <button
                          key={s.time}
                          disabled={!s.available}
                          onClick={() => setSelectedSlot(s.time)}
                          className="px-3 py-2 text-[13px] font-medium transition-all"
                          style={{
                            borderRadius: "var(--radius-sm)",
                            border: isSelected
                              ? "2px solid var(--blue-500)"
                              : "1px solid var(--grey-300)",
                            background: isSelected
                              ? "var(--blue-50)"
                              : s.available
                              ? "var(--white)"
                              : "var(--grey-100)",
                            color: isSelected
                              ? "var(--blue-500)"
                              : s.available
                              ? "var(--grey-900)"
                              : "var(--grey-400)",
                            cursor: s.available ? "pointer" : "not-allowed",
                            fontWeight: isSelected ? 700 : 500,
                          }}
                        >
                          {formatTime12(s.time)}
                        </button>
                      );
                    })}
                  </div>
                )}

                {slots.length > 0 && (
                  <div className="flex items-center gap-4 mt-3 text-[11px]" style={{ color: "var(--grey-500)" }}>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3" style={{ background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: 2 }} />
                      Available
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3" style={{ background: "var(--grey-100)", borderRadius: 2 }} />
                      Booked
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3" style={{ background: "var(--blue-50)", border: "2px solid var(--blue-500)", borderRadius: 2 }} />
                      Selected
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 4: Appointment Details ═══ */}
        {step === 4 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Appointment Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-600)" }}>
                  Appointment Type <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <select
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value)}
                  className="w-full px-3 py-2.5"
                  style={inputStyle}
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="procedure">Procedure</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-600)" }}>
                  Reason <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for the appointment..."
                  rows={3}
                  className="w-full px-3 py-2.5"
                  style={inputStyle}
                />
                {step === 4 && reason.trim() === "" && (
                  <p className="text-[11px] mt-1" style={{ color: "var(--orange)" }}>Please provide a reason for the appointment</p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--grey-600)" }}>
                  Notes <span className="text-[10px] font-normal normal-case" style={{ color: "var(--grey-500)" }}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the doctor..."
                  rows={2}
                  className="w-full px-3 py-2.5"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 5: Confirm & Book ═══ */}
        {step === 5 && (
          <div className="yoda-fade-in">
            <h2 className="text-[16px] font-bold mb-4" style={{ color: "var(--grey-900)" }}>Confirm Appointment</h2>

            <div className="p-5 space-y-4" style={cardStyle}>
              {/* Patient */}
              <div className="flex items-start gap-3">
                <div className="w-5 flex-shrink-0 pt-0.5">
                  <svg className="w-5 h-5" style={{ color: "var(--blue-500)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Patient</p>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                    {selectedPatient?.patientIdNumber} &middot; {selectedPatient?.phone}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--grey-200)" }} />

              {/* Doctor */}
              <div className="flex items-start gap-3">
                <div className="w-5 flex-shrink-0 pt-0.5">
                  <svg className="w-5 h-5" style={{ color: "var(--green)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Doctor</p>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                    {selectedDoctor?.name}
                  </p>
                  <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
                    {selectedDoctor?.specialization} &middot; {selectedDoctor?.department}
                  </p>
                  <p className="text-[12px] font-medium" style={{ color: "var(--blue-500)" }}>
                    Fee: &#8377;{selectedDoctor?.consultationFee}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--grey-200)" }} />

              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <div className="w-5 flex-shrink-0 pt-0.5">
                  <svg className="w-5 h-5" style={{ color: "var(--orange)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Date & Time</p>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--grey-900)" }}>
                    {selectedDate && formatDateDisplay(selectedDate)}
                  </p>
                  <p className="text-[13px] font-medium" style={{ color: "var(--grey-700)" }}>
                    {selectedSlot && formatTime12(selectedSlot)}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--grey-200)" }} />

              {/* Details */}
              <div className="flex items-start gap-3">
                <div className="w-5 flex-shrink-0 pt-0.5">
                  <svg className="w-5 h-5" style={{ color: "var(--purple)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--grey-500)" }}>Details</p>
                  <p className="text-[13px] capitalize" style={{ color: "var(--grey-900)" }}>
                    <span className="font-semibold">Type:</span> {apptType}
                  </p>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-900)" }}>
                    <span className="font-semibold">Reason:</span> {reason}
                  </p>
                  {notes && (
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--grey-600)" }}>
                      <span className="font-semibold">Notes:</span> {notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Book button */}
            <button
              onClick={handleBook}
              disabled={submitting}
              className="mt-6 w-full py-3 text-white text-[14px] font-semibold transition-all duration-150 flex items-center justify-center gap-2"
              style={{
                ...btnPrimary,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Booking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Book Appointment
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Navigation Buttons ────────────────────────────────── */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: "1px solid var(--grey-200)" }}>
            <button
              onClick={goBack}
              disabled={step === 1}
              className="px-4 py-2 text-[13px] font-semibold transition-colors"
              style={{
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--grey-300)",
                color: step === 1 ? "var(--grey-400)" : "var(--grey-700)",
                background: "var(--white)",
                cursor: step === 1 ? "not-allowed" : "pointer",
              }}
            >
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="px-6 py-2 text-[13px] font-semibold text-white transition-all"
              style={{
                ...btnPrimary,
                opacity: canProceed() ? 1 : 0.5,
                cursor: canProceed() ? "pointer" : "not-allowed",
              }}
            >
              Continue
            </button>
          </div>
        )}

        {step === 5 && (
          <div className="mt-4">
            <button
              onClick={goBack}
              className="text-[13px] font-semibold hover:underline"
              style={{ color: "var(--grey-600)" }}
            >
              &larr; Back to Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
