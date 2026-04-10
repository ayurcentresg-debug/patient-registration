"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  COUNTRIES,
  getPasswordStrength,
  validatePassword,
  PASSWORD_RULES,
} from "@/lib/country-data";

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"owner" | "join" | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    clinicName: "",
    email: "",
    country: "Singapore",
    password: "",
    confirmPassword: "",
  });

  const passwordStrength = useMemo(
    () => (form.password ? getPasswordStrength(form.password) : null),
    [form.password]
  );

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.clinicName.trim()) {
      setError("Clinic name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    const pwResult = validatePassword(form.password);
    if (!pwResult.valid) {
      setError("Password requirements not met: " + pwResult.errors.join(", "));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clinic/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: form.clinicName,
          ownerName: form.clinicName, // use clinic name as owner name for now
          email: form.email,
          password: form.password,
          country: form.country,
          termsAccepted: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Go straight to dashboard — setup checklist will guide them
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = () => {
    const input = inviteInput.trim();
    if (!input) return;
    let token = input;
    const match = input.match(/\/invite\/([a-zA-Z0-9_-]+)/);
    if (match) {
      token = match[1];
    }
    router.push(`/invite/${token}`);
  };

  // Shared input styles
  const inputStyle = { border: "1.5px solid #e5e7eb", background: "white" };
  const inputClassName = "w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all";
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#2d6a4f");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = "#e5e7eb");

  // Dynamic heading for the left panel
  const leftPanelHeading = selectedRole === "owner"
    ? "Set Up Your Clinic"
    : selectedRole === "join"
    ? "Join Your Clinic's Team"
    : "Sign Up";

  const renderRightPanel = () => {
    // ── View 1: Role Selection ──
    if (selectedRole === null) {
      return (
        <div className="w-full max-w-lg">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">&#127807;</span>
            <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>
              AyurGate
            </span>
          </div>

          <h2 className="text-[28px] sm:text-3xl font-bold mb-2" style={{ color: "#111827" }}>
            Get Started with AyurGate
          </h2>
          <p className="text-[15px] mb-10" style={{ color: "#6b7280" }}>
            Choose how you&apos;d like to join
          </p>

          <div className="space-y-5 px-2">
            {/* Card 1: Set Up My Clinic */}
            <button
              type="button"
              onClick={() => setSelectedRole("owner")}
              className="w-full text-left rounded-xl p-6 transition-all hover:shadow-md group"
              style={{ border: "1.5px solid #e5e7eb", background: "white" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2d6a4f";
                e.currentTarget.style.background = "#f0fdf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "white";
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#f0fdf4" }}
                >
                  <svg width="24" height="24" fill="none" stroke="#2d6a4f" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold text-gray-800 mb-1">Set Up My Clinic</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    I&apos;m a clinic owner or administrator setting up my practice
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>

            {/* Card 2: Join My Team */}
            <button
              type="button"
              onClick={() => setSelectedRole("join")}
              className="w-full text-left rounded-xl p-6 transition-all hover:shadow-md group"
              style={{ border: "1.5px solid #e5e7eb", background: "white" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2d6a4f";
                e.currentTarget.style.background = "#f0fdf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.background = "white";
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#f0fdf4" }}
                >
                  <svg width="24" height="24" fill="none" stroke="#2d6a4f" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2.25 2.25 0 013 16.878c0-2.692 1.94-4.936 4.5-5.362a4.5 4.5 0 019 0c2.56.426 4.5 2.67 4.5 5.362M15 19.128H5.228M10.5 7.5a3 3 0 11-6 0 3 3 0 016 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold text-gray-800 mb-1">Join My Team</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">
                    I&apos;ve been invited by my clinic to join as a practitioner or staff
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </div>

          <p className="text-center text-[15px] mt-10" style={{ color: "#6b7280" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2d6a4f" }}>
              Sign in
            </Link>
          </p>
        </div>
      );
    }

    // ── View 3: Join My Team ──
    if (selectedRole === "join") {
      return (
        <div className="w-full max-w-lg">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">&#127807;</span>
            <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>
              AyurGate
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-1.5 text-[13px] font-medium mb-6 hover:underline"
            style={{ color: "#2d6a4f" }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <div className="flex flex-col items-center text-center px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "#f0fdf4" }}
            >
              <svg width="32" height="32" fill="none" stroke="#2d6a4f" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: "#111827" }}>
              Join Your Clinic&apos;s Team
            </h2>
            <p className="text-[14px] leading-relaxed mb-6" style={{ color: "#6b7280" }}>
              Your clinic administrator will send you an invitation email with a unique link to join.
            </p>

            <div
              className="w-full rounded-lg p-4 mb-6 text-left"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
            >
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-[13px] text-blue-800 leading-snug">
                  Check your email for an invitation link from your clinic administrator. If you haven&apos;t received one, ask your clinic admin to send you an invite from <strong>Admin &rarr; Staff</strong>.
                </p>
              </div>
            </div>

            <div className="w-full flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[12px] font-semibold text-gray-400 uppercase">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <p className="text-[14px] font-medium text-gray-700 mb-3">
              Have an invite link? Paste it below:
            </p>
            <div className="w-full flex gap-2">
              <input
                type="text"
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="https://... or invite token"
                className={inputClassName}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInviteSubmit();
                }}
              />
              <button
                type="button"
                onClick={handleInviteSubmit}
                className="px-5 py-2.5 rounded-lg text-white font-semibold text-[14px] transition-all hover:opacity-90 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                Continue
              </button>
            </div>

            <div
              className="w-full rounded-lg p-4 mt-6 text-left"
              style={{ background: "#fefce8", border: "1px solid #fde68a" }}
            >
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-[13px] text-amber-800 leading-snug">
                  <strong>Tip:</strong> Don&apos;t have an invite? Ask your clinic administrator to add you from the <strong>Admin &rarr; Staff</strong> page.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[15px] mt-10" style={{ color: "#6b7280" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2d6a4f" }}>
              Sign in
            </Link>
          </p>
        </div>
      );
    }

    // ── View 2: Simple Registration Form (selectedRole === "owner") ──
    return (
      <div className="w-full max-w-lg">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <span className="text-xl">&#127807;</span>
          <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>
            AyurGate
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedRole(null)}
          className="flex items-center gap-1.5 text-[13px] font-medium mb-4 hover:underline"
          style={{ color: "#2d6a4f" }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
          Create Your Clinic
        </h2>
        <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
          Takes less than 30 seconds. You can add details later.
        </p>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-[13px] font-medium"
            style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Email */}
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

          {/* Country */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Country *
            </label>
            <select
              value={form.country}
              onChange={(e) => updateForm("country", e.target.value)}
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

          {/* Password */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1">
              Password *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                placeholder="Min 12 characters"
                className={inputClassName}
                style={{ ...inputStyle, paddingRight: 40 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            </div>
            {/* Password strength bar */}
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-all"
                      style={{
                        background: i <= passwordStrength.score ? passwordStrength.color : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
                <p className="text-[11px] font-medium mt-1" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
            {form.password && (
              <div style={{ marginTop: 8 }}>
                {PASSWORD_RULES.map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: rule.test(form.password) ? "#059669" : "#9ca3af", marginBottom: 2 }}>
                    {rule.test(form.password) ? (
                      <svg width="14" height="14" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="14" height="14" fill="none" stroke="#d1d5db" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
                    )}
                    <span>{rule.label}</span>
                  </div>
                ))}
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
              onChange={(e) => updateForm("confirmPassword", e.target.value)}
              placeholder="Re-enter password"
              className={inputClassName}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Terms */}
          <p className="text-[12px] text-gray-500 leading-snug">
            By creating an account, you agree to our{" "}
            <Link href="/terms" target="_blank" className="underline" style={{ color: "#2d6a4f" }}>
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link href="/privacy" target="_blank" className="underline" style={{ color: "#2d6a4f" }}>
              Privacy Policy
            </Link>
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
          >
            {loading ? "Creating your clinic..." : "Start Free Trial"}
          </button>

          <p className="text-center text-[13px]" style={{ color: "#6b7280" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "#2d6a4f" }}>
              Sign in
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-[11px] pb-6" style={{ color: "#9ca3af" }}>
          7-day free trial. No credit card required.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>
      {/* Left panel -- branding */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16"
        style={{
          background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)",
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
              AyurGate
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            {leftPanelHeading === "Sign Up"
              ? "Complete Ayurveda Clinic Management"
              : leftPanelHeading}
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
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-[14px] text-white/90">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-[13px] text-white/70">
              <strong className="text-white">7-day free trial</strong> — No credit card required. Full access to all features.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
        {renderRightPanel()}
      </div>
    </div>
  );
}
