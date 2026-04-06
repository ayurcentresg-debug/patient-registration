"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const CURRENCIES = [
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "LKR", label: "LKR — Sri Lankan Rupee" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "USD", label: "USD — US Dollar" },
];

const DURATIONS = [15, 20, 30, 45, 60];

const STEP_INFO = [
  { num: 1, label: "Clinic Profile", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { num: 2, label: "Working Hours", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { num: 3, label: "First Doctor", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

/* shared input style */
const inputClass = "w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all";
const inputStyle: React.CSSProperties = { border: "1.5px solid #e5e7eb", background: "white" };
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "#2d6a4f"; };
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = "#e5e7eb"; };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Step 1: Clinic Profile
  const [clinicProfile, setClinicProfile] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    clinicEmail: "",
    clinicPhone: "",
    website: "",
    registrationNo: "",
  });

  // Step 2: Working Hours & Preferences
  const [preferences, setPreferences] = useState({
    workingDays: [1, 2, 3, 4, 5, 6],
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    appointmentDuration: 30,
    currency: "SGD",
    taxRate: "",
  });

  // Step 3: First Doctor (optional)
  const [doctor, setDoctor] = useState({
    name: "",
    email: "",
    specialization: "",
    fee: "",
  });

  // Email verified state (kept for backward compat with API)
  const [emailVerified, setEmailVerified] = useState(false);

  // Load existing data
  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.onboardingComplete) {
          router.push("/dashboard");
          return;
        }
        if (data.clinic) {
          setClinicProfile((prev) => ({
            ...prev,
            address: data.clinic.address || "",
            city: data.clinic.city || "",
            state: data.clinic.state || "",
            zipCode: data.clinic.zipCode || "",
            clinicEmail: data.clinic.email || "",
            clinicPhone: data.clinic.phone || "",
            website: data.clinic.website || "",
          }));
          const countryMap: Record<string, string> = {
            Singapore: "SGD",
            India: "INR",
            Malaysia: "MYR",
            "Sri Lanka": "LKR",
            UAE: "AED",
          };
          if (data.clinic.country && countryMap[data.clinic.country]) {
            setPreferences((prev) => ({ ...prev, currency: countryMap[data.clinic.country] }));
          }
        }
        if (data.settings) {
          setPreferences((prev) => ({
            ...prev,
            taxRate: data.settings.gstRegistrationNo || "",
            appointmentDuration: data.settings.appointmentDuration || 30,
            workingHoursStart: data.settings.workingHoursStart || "09:00",
            workingHoursEnd: data.settings.workingHoursEnd || "18:00",
            workingDays: data.settings.workingDays
              ? JSON.parse(data.settings.workingDays)
              : [1, 2, 3, 4, 5, 6],
          }));
        }
        if (data.emailVerified) {
          setEmailVerified(true);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const saveStep = async (stepNum: number) => {
    setSaving(true);
    setError("");
    try {
      const bodyMap: Record<number, object> = {
        1: { step: 1, ...clinicProfile },
        2: { step: 2, ...preferences },
        3: { step: "complete" },
      };
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyMap[stepNum]),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return false;
      }
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveStep(step);
    if (saved) {
      setStep((s) => s + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = async () => {
    if (doctor.name && doctor.email) {
      try {
        await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: doctor.name,
            email: doctor.email,
            role: "doctor",
            specialization: doctor.specialization,
            consultationFee: doctor.fee ? parseFloat(doctor.fee) : undefined,
          }),
        });
      } catch {
        // Non-critical
      }
    }
    const saved = await saveStep(3);
    if (saved) {
      window.location.href = "/dashboard";
    }
  };

  const handleSkip = async () => {
    const saved = await saveStep(3);
    if (saved) {
      window.location.href = "/dashboard";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#fefbf6" }}>
        <div className="animate-spin w-8 h-8 border-3 rounded-full" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>
      {/* ─── Left panel — branding (matches login/register) ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="text-2xl">&#127807;</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wider">AYUR GATE</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Let&apos;s set up your clinic
          </h1>
          <p className="text-[15px] text-white/80 leading-relaxed mb-10">
            Just a few quick steps to configure your workspace. You can always update these settings later from the Admin panel.
          </p>

          {/* Step indicators on left panel */}
          <div className="space-y-5">
            {STEP_INFO.map((s) => (
              <div key={s.num} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: step >= s.num ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)",
                    border: step === s.num ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent",
                  }}
                >
                  {step > s.num ? (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 9L7.5 12.5L14 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  )}
                </div>
                <div>
                  <p
                    className="text-[14px] font-semibold transition-all"
                    style={{ color: step >= s.num ? "white" : "rgba(255,255,255,0.5)" }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[12px]" style={{ color: step > s.num ? "rgba(167,243,208,0.8)" : "rgba(255,255,255,0.35)" }}>
                    {step > s.num ? "Completed" : step === s.num ? "In progress" : "Upcoming"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-[13px] text-white/70">
              <strong className="text-white">Takes under 2 minutes</strong> — skip any step and come back to it later.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right panel — form (matches login/register) ─── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 lg:px-12 py-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-xl">&#127807;</span>
            <span className="text-lg font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>
          <div className="hidden lg:block" />

          {/* Mobile step indicator */}
          <div className="lg:hidden flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{ background: step >= s ? "#2d6a4f" : "#e5e7eb" }}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-[13px] px-4 py-1.5 rounded-lg font-medium transition-all hover:bg-gray-100"
            style={{ color: "#6b7280" }}
          >
            Skip setup
          </button>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-8">
          <div className="w-full max-w-lg">

            {error && (
              <div
                className="mb-5 p-3 rounded-lg text-[13px] font-medium flex items-center gap-2"
                style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* ─── Step 1: Clinic Profile ─── */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
                  Clinic Profile
                </h2>
                <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
                  This appears on invoices, prescriptions, and patient communications.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Clinic Address</label>
                    <input
                      type="text"
                      value={clinicProfile.address}
                      onChange={(e) => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                      placeholder="Street address"
                      className={inputClass}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>City</label>
                      <input
                        type="text"
                        value={clinicProfile.city}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, city: e.target.value })}
                        placeholder="City"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>State / Province</label>
                      <input
                        type="text"
                        value={clinicProfile.state}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, state: e.target.value })}
                        placeholder="State"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Postal Code</label>
                      <input
                        type="text"
                        value={clinicProfile.zipCode}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, zipCode: e.target.value })}
                        placeholder="Postal code"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Clinic Email</label>
                      <input
                        type="email"
                        value={clinicProfile.clinicEmail}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, clinicEmail: e.target.value })}
                        placeholder="clinic@example.com"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Clinic Phone</label>
                      <input
                        type="tel"
                        value={clinicProfile.clinicPhone}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, clinicPhone: e.target.value })}
                        placeholder="+91 XXXX XXXXXX"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Website</label>
                      <input
                        type="url"
                        value={clinicProfile.website}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, website: e.target.value })}
                        placeholder="www.yourclinic.com"
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                        Registration / License No.
                        <span className="text-[11px] font-normal ml-1" style={{ color: "#9ca3af" }}>Optional</span>
                      </label>
                      <input
                        type="text"
                        value={clinicProfile.registrationNo}
                        onChange={(e) => setClinicProfile({ ...clinicProfile, registrationNo: e.target.value })}
                        placeholder="e.g. GST Reg No."
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Working Hours & Preferences ─── */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
                  Working Hours & Preferences
                </h2>
                <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
                  Configure your clinic&apos;s operating schedule and default settings.
                </p>

                <div className="space-y-6">
                  {/* Working Days */}
                  <div>
                    <label className="block text-[13px] font-medium mb-3" style={{ color: "#374151" }}>
                      Working Days
                    </label>
                    <div className="flex gap-2">
                      {DAYS.map((day) => {
                        const active = preferences.workingDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              setPreferences((prev) => ({
                                ...prev,
                                workingDays: active
                                  ? prev.workingDays.filter((d) => d !== day.value)
                                  : [...prev.workingDays, day.value],
                              }));
                            }}
                            className="w-12 h-12 rounded-xl text-[13px] font-semibold transition-all"
                            style={{
                              background: active ? "#2d6a4f" : "white",
                              color: active ? "white" : "#6b7280",
                              border: `1.5px solid ${active ? "#2d6a4f" : "#e5e7eb"}`,
                            }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Opening Time</label>
                      <input
                        type="time"
                        value={preferences.workingHoursStart}
                        onChange={(e) => setPreferences({ ...preferences, workingHoursStart: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Closing Time</label>
                      <input
                        type="time"
                        value={preferences.workingHoursEnd}
                        onChange={(e) => setPreferences({ ...preferences, workingHoursEnd: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Appointment Duration */}
                  <div>
                    <label className="block text-[13px] font-medium mb-3" style={{ color: "#374151" }}>
                      Default Appointment Duration
                    </label>
                    <div className="flex gap-2">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, appointmentDuration: d })}
                          className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                          style={{
                            background: preferences.appointmentDuration === d ? "#2d6a4f" : "white",
                            color: preferences.appointmentDuration === d ? "white" : "#6b7280",
                            border: `1.5px solid ${preferences.appointmentDuration === d ? "#2d6a4f" : "#e5e7eb"}`,
                          }}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Currency & Tax */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Currency</label>
                      <select
                        value={preferences.currency}
                        onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                        GST / Tax Rate
                        <span className="text-[11px] font-normal ml-1" style={{ color: "#9ca3af" }}>Optional</span>
                      </label>
                      <input
                        type="text"
                        value={preferences.taxRate}
                        onChange={(e) => setPreferences({ ...preferences, taxRate: e.target.value })}
                        placeholder="e.g. 9% or GST Reg No."
                        className={inputClass}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 3: First Doctor ─── */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
                  Add your first doctor
                </h2>
                <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
                  You can skip this and add doctors later from the Staff section.
                </p>

                <div
                  className="rounded-xl p-5 mb-6"
                  style={{ background: "white", border: "1.5px solid #e5e7eb" }}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Doctor Name</label>
                        <input
                          type="text"
                          value={doctor.name}
                          onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                          placeholder="Dr. Full Name"
                          className={inputClass}
                          style={{ ...inputStyle, background: "#fefbf6" }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Email</label>
                        <input
                          type="email"
                          value={doctor.email}
                          onChange={(e) => setDoctor({ ...doctor, email: e.target.value })}
                          placeholder="doctor@clinic.com"
                          className={inputClass}
                          style={{ ...inputStyle, background: "#fefbf6" }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Specialization</label>
                        <input
                          type="text"
                          value={doctor.specialization}
                          onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                          placeholder="e.g. Ayurvedic Medicine"
                          className={inputClass}
                          style={{ ...inputStyle, background: "#fefbf6" }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Consultation Fee</label>
                        <input
                          type="number"
                          value={doctor.fee}
                          onChange={(e) => setDoctor({ ...doctor, fee: e.target.value })}
                          placeholder="e.g. 500"
                          className={inputClass}
                          style={{ ...inputStyle, background: "#fefbf6" }}
                          onFocus={onFocus}
                          onBlur={onBlur}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Setup summary */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                >
                  <h3 className="text-[13px] font-semibold mb-2" style={{ color: "#166534" }}>
                    You&apos;re all set! Here&apos;s what&apos;s ready:
                  </h3>
                  <div className="space-y-1.5">
                    {[
                      { done: true, text: "Clinic profile configured" },
                      { done: true, text: "Working hours & preferences set" },
                      { done: true, text: "Ready to launch" },
                    ].map((item) => (
                      <div key={item.text} className="flex items-center gap-2">
                        {item.done ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M3 7L6 10L11 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5.5" stroke="#f59e0b" strokeWidth="1.5" />
                          </svg>
                        )}
                        <span className="text-[12px]" style={{ color: "#374151" }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6" style={{ borderTop: "1px solid #f3f4f6" }}>
              {step > 1 ? (
                <button
                  onClick={() => { setStep((s) => s - 1); window.scrollTo(0, 0); }}
                  className="px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all hover:bg-gray-50"
                  style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
                >
                  {saving ? "Saving..." : "Continue"}
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg text-white text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
                >
                  {saving ? "Finishing..." : "Launch Dashboard"}
                </button>
              )}
            </div>

            <p className="mt-6 text-center text-[11px]" style={{ color: "#9ca3af" }}>
              AYUR GATE v1.0 &middot; Ayurveda SaaS Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
