"use client";

import { useState, useEffect, useCallback } from "react";
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
  { code: "SGD", label: "SGD — Singapore Dollar", symbol: "$" },
  { code: "INR", label: "INR — Indian Rupee", symbol: "Rs" },
  { code: "MYR", label: "MYR — Malaysian Ringgit", symbol: "RM" },
  { code: "LKR", label: "LKR — Sri Lankan Rupee", symbol: "Rs" },
  { code: "AED", label: "AED — UAE Dirham", symbol: "AED" },
  { code: "USD", label: "USD — US Dollar", symbol: "$" },
];

const DURATIONS = [15, 20, 30, 45, 60];

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

  // Email verification state
  const [verifyCode, setVerifyCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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
          // Auto-detect currency from country
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

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendVerificationCode = useCallback(async () => {
    setSendingCode(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Failed to send code");
        return;
      }
      setEmailSent(true);
      setResendTimer(60);
    } catch {
      setVerifyError("Network error");
    } finally {
      setSendingCode(false);
    }
  }, []);

  const verifyEmailCode = async () => {
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Verification failed");
        return;
      }
      setEmailVerified(true);
    } catch {
      setVerifyError("Network error");
    } finally {
      setVerifying(false);
    }
  };

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
    // Optionally save first doctor
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
        // Non-critical — they can add doctors later
      }
    }

    // Mark onboarding complete
    const saved = await saveStep(3);
    if (saved) {
      // Refresh JWT by re-logging in via /api/auth/me refresh
      // Simpler: just redirect and let the page reload handle it
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
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "#e5e7eb", background: "white" }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">&#127807;</span>
            <span className="text-lg font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-[13px] px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: "#6b7280" }}
          >
            Skip for now
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3 flex-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all"
                style={{
                  background: step >= s ? "#2d6a4f" : "#e5e7eb",
                  color: step >= s ? "white" : "#9ca3af",
                }}
              >
                {step > s ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && (
                <div
                  className="flex-1 h-0.5 rounded-full transition-all"
                  style={{ background: step > s ? "#2d6a4f" : "#e5e7eb" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step labels */}
        <div className="flex mb-8">
          {["Clinic Profile", "Working Hours", "First Doctor"].map((label, i) => (
            <div key={label} className="flex-1 text-center">
              <span
                className="text-[12px] font-medium"
                style={{ color: step === i + 1 ? "#2d6a4f" : "#9ca3af" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg text-[13px]" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}

        {/* ─── Step 1: Clinic Profile ─── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#111827" }}>
              Tell us about your clinic
            </h2>
            <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
              This information appears on invoices, prescriptions, and patient communications.
            </p>

            {/* Email verification card */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{
                background: emailVerified ? "#f0fdf4" : "#fffbeb",
                border: `1px solid ${emailVerified ? "#bbf7d0" : "#fde68a"}`,
              }}
            >
              {emailVerified ? (
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="9" fill="#22c55e" />
                    <path d="M5.5 9L8 11.5L12.5 6.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[13px] font-medium" style={{ color: "#166534" }}>
                    Email verified successfully
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="9" r="8" stroke="#f59e0b" strokeWidth="1.5" />
                      <path d="M9 5.5V9.5M9 12V12.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[13px] font-semibold" style={{ color: "#92400e" }}>
                      Verify your email
                    </span>
                  </div>
                  {!emailSent ? (
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-[13px] flex-1" style={{ color: "#92400e" }}>
                          We&apos;ll send a 6-digit code to <strong>{clinicProfile.clinicEmail}</strong>
                        </p>
                        <button
                          onClick={sendVerificationCode}
                          disabled={sendingCode}
                          className="px-4 py-1.5 rounded-lg text-white text-[13px] font-medium disabled:opacity-60"
                          style={{ background: "#f59e0b" }}
                        >
                          {sendingCode ? "Sending..." : "Send Code"}
                        </button>
                      </div>
                      <button
                        onClick={() => setEmailVerified(true)}
                        className="text-[11px] mt-2 underline hover:no-underline"
                        style={{ color: "#9ca3af" }}
                      >
                        Skip verification for now
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[12px] mb-2" style={{ color: "#92400e" }}>
                        Code sent to {clinicProfile.clinicEmail}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 6-digit code"
                          className="w-40 px-3 py-2 rounded-lg text-[14px] text-center tracking-widest font-mono outline-none"
                          style={{ border: "1.5px solid #fde68a", background: "white" }}
                        />
                        <button
                          onClick={verifyEmailCode}
                          disabled={verifying || verifyCode.length !== 6}
                          className="px-4 py-2 rounded-lg text-white text-[13px] font-medium disabled:opacity-60"
                          style={{ background: "#2d6a4f" }}
                        >
                          {verifying ? "Verifying..." : "Verify"}
                        </button>
                        <button
                          onClick={sendVerificationCode}
                          disabled={resendTimer > 0 || sendingCode}
                          className="px-3 py-2 rounded-lg text-[12px] disabled:opacity-40"
                          style={{ color: "#6b7280" }}
                        >
                          {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend"}
                        </button>
                      </div>
                      {verifyError && (
                        <p className="text-[12px] mt-2" style={{ color: "#dc2626" }}>
                          {verifyError}
                        </p>
                      )}
                      <p className="text-[11px] mt-2" style={{ color: "#78716c" }}>
                        Didn&apos;t receive the code? Check your <strong>spam/junk folder</strong>. The email comes from ayurcentresg@gmail.com
                      </p>
                      <button
                        onClick={() => setEmailVerified(true)}
                        className="text-[11px] mt-1 underline hover:no-underline"
                        style={{ color: "#9ca3af" }}
                      >
                        Skip verification for now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                  Clinic Address
                </label>
                <input
                  type="text"
                  value={clinicProfile.address}
                  onChange={(e) => setClinicProfile({ ...clinicProfile, address: e.target.value })}
                  placeholder="Street address"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
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
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>State / Province</label>
                  <input
                    type="text"
                    value={clinicProfile.state}
                    onChange={(e) => setClinicProfile({ ...clinicProfile, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Postal Code</label>
                  <input
                    type="text"
                    value={clinicProfile.zipCode}
                    onChange={(e) => setClinicProfile({ ...clinicProfile, zipCode: e.target.value })}
                    placeholder="Postal code"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
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
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Clinic Phone</label>
                  <input
                    type="tel"
                    value={clinicProfile.clinicPhone}
                    onChange={(e) => setClinicProfile({ ...clinicProfile, clinicPhone: e.target.value })}
                    placeholder="+65 XXXX XXXX"
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
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
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
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
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Working Hours & Preferences ─── */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#111827" }}>
              Working hours & preferences
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
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={preferences.workingHoursStart}
                    onChange={(e) => setPreferences({ ...preferences, workingHoursStart: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={preferences.workingHoursEnd}
                    onChange={(e) => setPreferences({ ...preferences, workingHoursEnd: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
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
                  <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                    Currency
                  </label>
                  <select
                    value={preferences.currency}
                    onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
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
                    className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                    style={{ border: "1.5px solid #e5e7eb", background: "white" }}
                    onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                    onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 3: First Doctor ─── */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#111827" }}>
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
                    <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                      Doctor Name
                    </label>
                    <input
                      type="text"
                      value={doctor.name}
                      onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                      placeholder="Dr. Full Name"
                      className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                      style={{ border: "1.5px solid #e5e7eb", background: "#fefbf6" }}
                      onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={doctor.email}
                      onChange={(e) => setDoctor({ ...doctor, email: e.target.value })}
                      placeholder="doctor@clinic.com"
                      className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                      style={{ border: "1.5px solid #e5e7eb", background: "#fefbf6" }}
                      onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={doctor.specialization}
                      onChange={(e) => setDoctor({ ...doctor, specialization: e.target.value })}
                      placeholder="e.g. Ayurvedic Medicine"
                      className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                      style={{ border: "1.5px solid #e5e7eb", background: "#fefbf6" }}
                      onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>
                      Consultation Fee
                    </label>
                    <input
                      type="number"
                      value={doctor.fee}
                      onChange={(e) => setDoctor({ ...doctor, fee: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                      style={{ border: "1.5px solid #e5e7eb", background: "#fefbf6" }}
                      onFocus={(e) => (e.target.style.borderColor = "#2d6a4f")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick summary */}
            <div
              className="rounded-xl p-4 mb-2"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <h3 className="text-[13px] font-semibold mb-2" style={{ color: "#166534" }}>
                You&apos;re all set! Here&apos;s what&apos;s ready:
              </h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12px]" style={{ color: "#374151" }}>Clinic profile configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12px]" style={{ color: "#374151" }}>Working hours & preferences set</span>
                </div>
                <div className="flex items-center gap-2">
                  {emailVerified ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7L6 10L11 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="#f59e0b" strokeWidth="1.5" />
                    </svg>
                  )}
                  <span className="text-[12px]" style={{ color: "#374151" }}>
                    Email {emailVerified ? "verified" : "verification pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6" style={{ borderTop: "1px solid #e5e7eb" }}>
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
              {saving ? "Finishing..." : "Go to Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
