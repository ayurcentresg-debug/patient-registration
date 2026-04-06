"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  COUNTRIES,
  CLINIC_TYPES,
  PRACTITIONER_COUNTS,
  REFERRAL_SOURCES,
  getAddressConfig,
  getPhonePrefix,
  getPasswordStrength,
} from "@/lib/country-data";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    clinicName: "",
    clinicType: "",
    practitionerCount: "",
    ownerName: "",
    email: "",
    phone: "",
    country: "Singapore",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    referralSource: "",
  });

  const addressConfig = useMemo(() => getAddressConfig(form.country), [form.country]);
  const phonePrefix = useMemo(() => getPhonePrefix(form.country), [form.country]);
  const passwordStrength = useMemo(
    () => (form.password ? getPasswordStrength(form.password) : null),
    [form.password]
  );

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (country: string) => {
    setForm((prev) => ({ ...prev, country, state: "", city: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.clinicName.trim()) {
      setError("Clinic name is required");
      return;
    }
    if (!form.ownerName.trim()) {
      setError("Your name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!form.country) {
      setError("Country is required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!form.termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clinic/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: form.clinicName,
          ownerName: form.ownerName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          country: form.country,
          city: form.city,
          state: form.state,
          clinicType: form.clinicType,
          practitionerCount: form.practitionerCount,
          referralSource: form.referralSource,
          termsAccepted: form.termsAccepted,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Auto-logged in via cookie — redirect to onboarding wizard
      router.push("/onboarding");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Shared input style props
  const inputStyle = {
    border: "1.5px solid #e5e7eb",
    background: "white",
  };
  const inputClassName =
    "w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all";
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#2d6a4f");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#e5e7eb");

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>
      {/* Left panel -- branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16"
        style={{
          background:
            "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)",
        }}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <span className="text-2xl">&#127807;</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wider">
              AYUR GATE
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Complete Ayurveda Clinic Management
          </h1>
          <p className="text-[15px] text-white/80 leading-relaxed mb-8">
            Manage patients, appointments, prescriptions, inventory, billing,
            and more — all in one place. Built specifically for Ayurveda and
            wellness clinics.
          </p>
          <div className="space-y-4">
            {[
              "Patient records & medical history",
              "Appointment scheduling with doctor slots",
              "Digital prescriptions & pharmacy workflow",
              "Inventory management with Ayurvedic categories",
              "GST-compliant billing & invoicing",
              "WhatsApp communication templates",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2.5 6L5 8.5L9.5 4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="text-[14px] text-white/90">{feature}</span>
              </div>
            ))}
          </div>
          <div
            className="mt-10 p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <p className="text-[13px] text-white/70">
              <strong className="text-white">7-day free trial</strong> — No
              credit card required. Full access to all features.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel -- registration form */}
      <div className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">&#127807;</span>
            <span
              className="text-xl font-bold tracking-wider"
              style={{ color: "#14532d" }}
            >
              AYUR GATE
            </span>
          </div>

          <h2
            className="text-2xl font-bold mb-1"
            style={{ color: "#111827" }}
          >
            Start your free trial
          </h2>
          <p className="text-[14px] mb-5" style={{ color: "#6b7280" }}>
            Set up your clinic in under 2 minutes
          </p>

          {/* Top tip box */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-[13px] text-amber-800 leading-snug">
              Complete this form to start your 7-day free trial. No credit card required.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-[13px] font-medium"
              style={{
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Section 1: Your Clinic ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#2d6a4f" }} />
                <h3 className="text-[18px] font-bold text-gray-800">Your Clinic</h3>
              </div>

              <div className="space-y-4">
                {/* Clinic Name */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.clinicName}
                    onChange={(e) => updateForm("clinicName", e.target.value)}
                    placeholder="e.g. Ayur Wellness Centre"
                    className={inputClassName}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                {/* Clinic Type */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Clinic Type
                  </label>
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[12px] text-amber-800 leading-snug">
                      Select the type that best describes your practice. This helps us customize your experience.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {CLINIC_TYPES.map((ct) => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => updateForm("clinicType", ct.value)}
                        className="flex flex-col items-start p-3 rounded-lg text-left transition-all"
                        style={{
                          border:
                            form.clinicType === ct.value
                              ? "2px solid #2d6a4f"
                              : "1.5px solid #e5e7eb",
                          background:
                            form.clinicType === ct.value ? "#f0fdf4" : "white",
                        }}
                      >
                        <span className="text-xl mb-1">{ct.icon}</span>
                        <span className="text-[13px] font-semibold text-gray-800 leading-tight">
                          {ct.label}
                        </span>
                        <span className="text-[11px] text-gray-500 leading-tight mt-0.5">
                          {ct.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Practitioner Count */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Number of Practitioners
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRACTITIONER_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => updateForm("practitionerCount", count)}
                        className="px-4 py-2 rounded-full text-[13px] font-medium transition-all"
                        style={{
                          border:
                            form.practitionerCount === count
                              ? "2px solid #2d6a4f"
                              : "1.5px solid #e5e7eb",
                          background:
                            form.practitionerCount === count
                              ? "#f0fdf4"
                              : "white",
                          color:
                            form.practitionerCount === count
                              ? "#14532d"
                              : "#374151",
                        }}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* ── Section 2: Your Details ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#2d6a4f" }} />
                <h3 className="text-[18px] font-bold text-gray-800">Your Details</h3>
              </div>

              <div className="space-y-4">
                {/* Owner Name */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.ownerName}
                    onChange={(e) => updateForm("ownerName", e.target.value)}
                    placeholder="Full name"
                    className={inputClassName}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="you@clinic.com"
                      className={inputClassName}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      placeholder={
                        phonePrefix
                          ? `${phonePrefix} XXXX XXXX`
                          : "Phone number"
                      }
                      className={inputClassName}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                </div>

                {/* Country + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                      Country *
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className={inputClassName}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => updateForm("city", e.target.value)}
                      placeholder="City"
                      className={inputClassName}
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                </div>

                {/* Conditional State / Province / Emirate */}
                {addressConfig.showState && (
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                      {addressConfig.stateLabel}
                    </label>
                    {addressConfig.stateOptions ? (
                      <select
                        value={form.state}
                        onChange={(e) => updateForm("state", e.target.value)}
                        className={inputClassName}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        <option value="">
                          Select {addressConfig.stateLabel}
                        </option>
                        {addressConfig.stateOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => updateForm("state", e.target.value)}
                        placeholder={addressConfig.stateLabel}
                        className={inputClassName}
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* ── Section 3: Create Password ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#2d6a4f" }} />
                <h3 className="text-[18px] font-bold text-gray-800">Create Password</h3>
              </div>

              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-[12px] text-amber-800 leading-snug">
                  Choose a strong password with uppercase, numbers, and special characters.
                </p>
              </div>

              <div className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Min 6 characters"
                    className={inputClassName}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  {/* Password strength bar */}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="h-1.5 flex-1 rounded-full transition-all"
                            style={{
                              background:
                                i <= passwordStrength.score
                                  ? passwordStrength.color
                                  : "#e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-[11px] font-medium mt-1"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) =>
                      updateForm("confirmPassword", e.target.value)
                    }
                    placeholder="Re-enter password"
                    className={inputClassName}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  {form.confirmPassword &&
                    form.password !== form.confirmPassword && (
                      <p className="text-[11px] text-red-500 mt-1">
                        Passwords do not match
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-gray-200" />

            {/* ── Section 4: Almost There ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 rounded-full" style={{ background: "#2d6a4f" }} />
                <h3 className="text-[18px] font-bold text-gray-800">Almost There</h3>
              </div>

              <div className="space-y-4">
                {/* Terms checkbox */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    checked={form.termsAccepted}
                    onChange={(e) =>
                      updateForm("termsAccepted", e.target.checked)
                    }
                    className="mt-1 w-4 h-4 rounded accent-green-800 cursor-pointer"
                  />
                  <label
                    htmlFor="termsAccepted"
                    className="text-[13px] text-gray-600 leading-snug cursor-pointer"
                  >
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      className="font-medium underline"
                      style={{ color: "#2d6a4f" }}
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      className="font-medium underline"
                      style={{ color: "#2d6a4f" }}
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {/* Referral Source */}
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1">
                    How did you hear about us?{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={form.referralSource}
                    onChange={(e) =>
                      updateForm("referralSource", e.target.value)
                    }
                    className={inputClassName}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    <option value="">Select one...</option>
                    {REFERRAL_SOURCES.map((rs) => (
                      <option key={rs.value} value={rs.value}>
                        {rs.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #14532d, #2d6a4f)",
              }}
            >
              {loading ? "Creating your clinic..." : "Start Free Trial"}
            </button>

            <p
              className="text-center text-[13px]"
              style={{ color: "#6b7280" }}
            >
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium hover:underline"
                style={{ color: "#2d6a4f" }}
              >
                Sign in
              </Link>
            </p>
          </form>

          <p
            className="mt-6 text-center text-[11px] pb-6"
            style={{ color: "#9ca3af" }}
          >
            7-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
