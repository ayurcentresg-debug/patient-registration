"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Toast from "@/components/Toast";

// ─── Constants ──────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
  "Panchakarma Therapy", "Abhyanga", "Shirodhara", "Pizhichil", "Njavarakizhi",
  "Elakizhi", "Podikizhi", "Nasyam", "Vasthi", "Udvarthanam", "Takradhara", "General Therapy",
];

const DEPARTMENTS = [
  "Panchakarma", "General Ayurveda", "Kayachikitsa", "Yoga & Naturopathy", "Marma Therapy",
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeBlock {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  blocks: TimeBlock[];
}

type WeeklySchedule = Record<string, DaySchedule>;

// ─── YODA Styles ────────────────────────────────────────────────────────────
const inputStyle = { border: "1px solid var(--grey-400)", borderRadius: "var(--radius-sm)", color: "var(--grey-900)", background: "var(--white)", fontSize: "15px" };
const inputErrorStyle = { ...inputStyle, border: "1px solid var(--red)", background: "#fff5f5" };
const labelStyle = { color: "var(--grey-600)", fontSize: "15px", fontWeight: 400 as const };
const cardStyle = { background: "var(--white)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius)" as const, boxShadow: "var(--shadow-card)" as const };
const sectionTitle = { color: "var(--grey-900)", fontSize: "17px", fontWeight: 700 as const };

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--red)" }}>{error}</p>;
}

// ─── Default weekly schedule ────────────────────────────────────────────────
function getDefaultSchedule(): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  DAYS.forEach((day) => {
    const isWeekday = day !== "Saturday";
    schedule[day] = {
      enabled: isWeekday,
      blocks: isWeekday
        ? [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }]
        : [{ start: "09:00", end: "13:00" }],
    };
  });
  return schedule;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function NewTherapistPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [therapyFee, setTherapyFee] = useState("");
  const [slotDuration, setSlotDuration] = useState("30");
  const [status, setStatus] = useState("active");
  const [schedule, setSchedule] = useState<WeeklySchedule>(getDefaultSchedule);

  // Hydration guard
  useEffect(() => { setMounted(true); }, []);

  // ─── Validation ───────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Therapist name is required";
    if (!gender) errors.gender = "Gender is required for therapist-patient matching";
    if (!specialization) errors.specialization = "Specialization is required";
    if (!department) errors.department = "Department is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Invalid email format";
    if (therapyFee && (isNaN(Number(therapyFee)) || Number(therapyFee) < 0)) errors.therapyFee = "Invalid fee";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Schedule handlers ────────────────────────────────────────────────
  function toggleDay(day: string) {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
        blocks: !prev[day].enabled && prev[day].blocks.length === 0
          ? [{ start: "09:00", end: "17:00" }]
          : prev[day].blocks,
      },
    }));
  }

  function updateBlock(day: string, index: number, field: "start" | "end", value: string) {
    setSchedule((prev) => {
      const blocks = [...prev[day].blocks];
      blocks[index] = { ...blocks[index], [field]: value };
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  }

  function addBlock(day: string) {
    setSchedule((prev) => {
      const blocks = [...prev[day].blocks, { start: "09:00", end: "17:00" }];
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  }

  function removeBlock(day: string, index: number) {
    setSchedule((prev) => {
      const blocks = prev[day].blocks.filter((_, i) => i !== index);
      return { ...prev, [day]: { ...prev[day], blocks } };
    });
  }

  // ─── Submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      setToast({ message: "Please fix the errors below", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        gender,
        specialization,
        department,
        phone: phone.trim() || null,
        email: email.trim() || null,
        consultationFee: therapyFee ? Number(therapyFee) : null,
        slotDuration: Number(slotDuration),
        status,
        role: "therapist",
        weeklySchedule: schedule,
      };

      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error (${res.status})`);
      }

      setToast({ message: "Therapist added successfully", type: "success" });
      setTimeout(() => router.push("/therapists"), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save therapist";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="p-6 md:p-8 yoda-fade-in">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/therapists"
          className="w-8 h-8 flex items-center justify-center transition-colors"
          style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--grey-300)" }}
          aria-label="Back to therapists"
        >
          <svg className="w-4 h-4" style={{ color: "var(--grey-600)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "var(--grey-900)" }}>Add Ayurveda Therapist</h1>
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        {/* Hidden role field */}
        <input type="hidden" name="role" value="therapist" />

        {/* ── Basic Information ─────────────────────────────────── */}
        <div className="p-6 mb-5" style={cardStyle}>
          <h2 className="mb-5" style={sectionTitle}>Basic Information</h2>
          <table className="w-full">
            <tbody>
              {/* Therapist Name */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Therapist Name <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5"
                    style={fieldErrors.name ? inputErrorStyle : inputStyle}
                    placeholder="Full Name"
                  />
                  <FieldError error={fieldErrors.name} />
                </td>
              </tr>

              {/* Gender */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Gender <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => { setGender("male"); setFieldErrors((p) => ({ ...p, gender: "" })); }} />
                      <span className="text-[15px]" style={{ color: "var(--grey-900)" }}>Male</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="gender" value="female" checked={gender === "female"} onChange={() => { setGender("female"); setFieldErrors((p) => ({ ...p, gender: "" })); }} />
                      <span className="text-[15px]" style={{ color: "var(--grey-900)" }}>Female</span>
                    </label>
                  </div>
                  <FieldError error={fieldErrors.gender} />
                  <p className="text-[13px] mt-1" style={{ color: "var(--grey-500)" }}>
                    Used for therapist-patient gender matching (male therapist → male patient)
                  </p>
                </td>
              </tr>

              {/* Specialization */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>
                  Specialization <span style={{ color: "var(--red)" }}>*</span> :
                </td>
                <td className="py-[8px] pl-2">
                  <select
                    value={specialization}
                    onChange={(e) => { setSpecialization(e.target.value); setFieldErrors((p) => ({ ...p, specialization: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5"
                    style={fieldErrors.specialization ? inputErrorStyle : inputStyle}
                  >
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
                  <select
                    value={department}
                    onChange={(e) => { setDepartment(e.target.value); setFieldErrors((p) => ({ ...p, department: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5"
                    style={fieldErrors.department ? inputErrorStyle : inputStyle}
                  >
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
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full max-w-sm px-2.5 py-1.5"
                    style={inputStyle}
                    placeholder="+65 XXXX XXXX"
                  />
                </td>
              </tr>

              {/* Email */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Email :</td>
                <td className="py-[8px] pl-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                    className="w-full max-w-sm px-2.5 py-1.5"
                    style={fieldErrors.email ? inputErrorStyle : inputStyle}
                    placeholder="therapist@clinic.com"
                  />
                  <FieldError error={fieldErrors.email} />
                </td>
              </tr>

              {/* Therapy Fee */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Therapy Fee :</td>
                <td className="py-[8px] pl-2">
                  <div className="flex items-center gap-1 max-w-[200px]">
                    <span className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>$</span>
                    <input
                      type="number"
                      value={therapyFee}
                      onChange={(e) => { setTherapyFee(e.target.value); setFieldErrors((p) => ({ ...p, therapyFee: "" })); }}
                      className="w-full px-2.5 py-1.5"
                      style={fieldErrors.therapyFee ? inputErrorStyle : inputStyle}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <FieldError error={fieldErrors.therapyFee} />
                </td>
              </tr>

              {/* Slot Duration */}
              <tr>
                <td className="py-[8px] pr-4 text-right whitespace-nowrap align-top" style={{ ...labelStyle, width: 180 }}>Slot Duration :</td>
                <td className="py-[8px] pl-2">
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="max-w-[200px] px-2.5 py-1.5"
                    style={inputStyle}
                  >
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
                      <input type="radio" name="status" value="active" checked={status === "active"} onChange={() => setStatus("active")} />
                      <span className="text-[15px] font-medium" style={{ color: "var(--green)" }}>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="status" value="inactive" checked={status === "inactive"} onChange={() => setStatus("inactive")} />
                      <span className="text-[15px] font-medium" style={{ color: "var(--grey-600)" }}>Inactive</span>
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Weekly Schedule ───────────────────────────────────── */}
        <div className="p-6 mb-5" style={cardStyle}>
          <h2 className="mb-4" style={sectionTitle}>Weekly Schedule</h2>
          <p className="text-[14px] mb-4" style={{ color: "var(--grey-500)" }}>
            Toggle days on/off and set time blocks for each day. You can add multiple time blocks per day.
          </p>

          <div className="space-y-3">
            {DAYS.map((day) => {
              const daySchedule = schedule[day];
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
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => toggleDay(day)}
                      className="relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
                      style={{ background: daySchedule.enabled ? "var(--blue-500)" : "var(--grey-400)" }}
                      role="switch"
                      aria-checked={daySchedule.enabled}
                      aria-label={`Toggle ${day}`}
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
                        className="text-[13px] font-semibold px-2 py-0.5 transition-colors"
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
                          <input
                            type="time"
                            value={block.start}
                            onChange={(e) => updateBlock(day, idx, "start", e.target.value)}
                            className="px-2 py-1 text-[14px]"
                            style={inputStyle}
                          />
                          <span className="text-[14px]" style={{ color: "var(--grey-500)" }}>to</span>
                          <input
                            type="time"
                            value={block.end}
                            onChange={(e) => updateBlock(day, idx, "end", e.target.value)}
                            className="px-2 py-1 text-[14px]"
                            style={inputStyle}
                          />
                          {daySchedule.blocks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBlock(day, idx)}
                              className="w-6 h-6 flex items-center justify-center transition-colors"
                              style={{ color: "var(--red)", borderRadius: "var(--radius-sm)" }}
                              aria-label={`Remove time block ${idx + 1}`}
                            >
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
        </div>

        {/* ── Form Actions ─────────────────────────────────────── */}
        <div className="flex items-center gap-3 justify-end">
          <Link
            href="/therapists"
            className="px-5 py-2 text-[15px] font-semibold transition-colors"
            style={{ color: "var(--grey-600)", border: "1px solid var(--grey-300)", borderRadius: "var(--radius-sm)" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
            style={{ background: "var(--blue-500)", borderRadius: "var(--radius-sm)" }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Therapist"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
