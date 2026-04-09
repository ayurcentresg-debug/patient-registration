"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type View = "login" | "forgot" | "reset" | "totp";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2FA field
  const [totpCode, setTotpCode] = useState("");

  // Forgot / Reset fields
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(view === "totp" ? { totpCode } : {}),
        }),
      });

      const data = await res.json();

      if (data.requires2FA && !data.error) {
        setView("totp");
        setTotpCode("");
        return;
      }

      if (data.requires2FA && data.error) {
        setError(data.error);
        setTotpCode("");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      const role = data.user?.role;
      if (role === "doctor" || role === "therapist") {
        router.push("/doctor");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess("Reset code sent! Check your email.");
      setView("reset");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset failed");
        return;
      }

      setSuccess("Password reset! You can now log in.");
      setTimeout(() => {
        setView("login");
        setSuccess("");
        setEmail(resetEmail);
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const viewTitle = {
    login: "Welcome back",
    totp: "Two-Factor Auth",
    forgot: "Forgot Password",
    reset: "Reset Password",
  }[view];

  const viewSubtitle = {
    login: "Sign in to your AyurGate account",
    totp: "Enter your authenticator code",
    forgot: "We'll send a reset code to your email",
    reset: "Enter the code sent to your email",
  }[view];

  /* shared input style */
  const inputClass = "w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all";
  const inputStyle: React.CSSProperties = { border: "1.5px solid #e5e7eb", background: "white" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#2d6a4f"; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#e5e7eb"; };

  return (
    <div className="min-h-screen flex" style={{ background: "#fefbf6" }}>
      {/* ─── Left panel — branding (matches /register) ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16"
        style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
              <span className="text-2xl">&#127807;</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-wider">AyurGate</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Your Ayurveda Practice, Simplified
          </h1>
          <p className="text-[15px] text-white/80 leading-relaxed mb-8">
            Everything you need to run your clinic efficiently — from patient records and appointments to billing and inventory.
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
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[14px] text-white/90">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.1)" }}>
            <p className="text-[13px] text-white/70">
              <strong className="text-white">Trusted by clinics</strong> in Singapore, India, Malaysia, and more.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right panel — form ─── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-xl">&#127807;</span>
            <span className="text-xl font-bold tracking-wider" style={{ color: "#14532d" }}>AyurGate</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>
            {viewTitle}
          </h2>
          <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
            {viewSubtitle}
          </p>

          {/* Alerts */}
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-[13px] font-medium flex items-center gap-2"
              style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div
              className="mb-4 p-3 rounded-lg text-[13px] font-medium flex items-center gap-2"
              style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          {/* ── Login Form ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-10`}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    style={{ color: "#9ca3af" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#2d6a4f" }} />
                  <span className="text-[13px] font-medium" style={{ color: "#6b7280" }}>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: "#2d6a4f" }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              <p className="text-center text-[13px]" style={{ color: "#6b7280" }}>
                {"Don't have an account? "}
                <Link href="/register" className="font-medium hover:underline" style={{ color: "#2d6a4f" }}>
                  Start free trial
                </Link>
              </p>

              <div className="text-center pt-2" style={{ borderTop: "1px solid #f3f4f6" }}>
                <Link href="/portal/login" className="text-[12px] font-medium hover:underline" style={{ color: "#6b7280" }}>
                  Patient? View your appointments & prescriptions →
                </Link>
              </div>
            </form>
          )}

          {/* ── 2FA TOTP Form ── */}
          {view === "totp" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-2">
                <div
                  className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: "#d1f2e0" }}
                >
                  <svg className="w-7 h-7" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-[14px]" style={{ color: "#6b7280" }}>
                  Open your authenticator app and enter the 6-digit code
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className={`${inputClass} text-center`}
                  style={{ ...inputStyle, fontSize: 24, fontWeight: 700, letterSpacing: 10 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setTotpCode(""); }}
                className="w-full text-center text-[13px] font-medium hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Forgot Password Form ── */}
          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Email address</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[13px] font-medium hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Reset Password Form ── */}
          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>6-digit Code</label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className={`${inputClass} text-center`}
                  style={{ ...inputStyle, fontSize: 18, fontWeight: 700, letterSpacing: 8 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 12 characters"
                    minLength={12}
                    className={`${inputClass} pr-10`}
                    style={inputStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                    style={{ color: "#9ca3af" }}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[13px] font-medium hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-[11px]" style={{ color: "#9ca3af" }}>
            AyurGate v1.0 &middot; Ayurveda SaaS Platform
          </p>
        </div>
      </div>
    </div>
  );
}
