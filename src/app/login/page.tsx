"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type View = "login" | "forgot" | "reset" | "totp";

/* ─── Input field component ─── */
function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
  minLength,
  maxLength,
  autoFocus,
  className = "",
  style = {},
  children,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[14px] font-semibold mb-2" style={{ color: "#374151" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={`w-full px-4 py-3 text-[15px] rounded-xl outline-none transition-all duration-200 ${className}`}
          style={{
            border: "1.5px solid #e5e7eb",
            background: "#fafafa",
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#2d6a4f";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(45,106,79,0.08)";
            e.currentTarget.style.background = "#fff";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "#fafafa";
          }}
        />
        {children}
      </div>
    </div>
  );
}

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
    login: "Welcome Back",
    totp: "Two-Factor Auth",
    forgot: "Forgot Password",
    reset: "Reset Password",
  }[view];

  const viewSubtitle = {
    login: "Sign in to manage your clinic",
    totp: "Enter your authenticator code",
    forgot: "We'll send a reset code to your email",
    reset: "Enter the code sent to your email",
  }[view];

  return (
    <div className="min-h-screen flex login-page" style={{ background: "#fefefe" }}>
      {/* ─── Left Side: Form ─── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-10">
        <div className="w-full" style={{ maxWidth: 420 }}>
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-11 h-11 flex items-center justify-center rounded-xl"
              style={{ background: "#2d6a4f", color: "#fff" }}
            >
              <span className="text-[16px] font-extrabold tracking-tight">AC</span>
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight" style={{ color: "#111827" }}>
                Ayur Centre
              </h2>
              <p className="text-[12px]" style={{ color: "#9ca3af" }}>Clinic Management</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight" style={{ color: "#111827" }}>
              {viewTitle}
            </h1>
            <p className="text-[15px] mt-1.5" style={{ color: "#6b7280" }}>
              {viewSubtitle}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center gap-2"
              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-[14px] font-medium flex items-center gap-2"
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
            <form onSubmit={handleLogin} className="space-y-5">
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clinic.com"
              />

              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-12"
              >
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "#9ca3af" }}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </InputField>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#2d6a4f" }} />
                  <span className="text-[14px] font-medium" style={{ color: "#6b7280" }}>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
                  className="text-[14px] font-semibold hover:underline"
                  style={{ color: "#2d6a4f" }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all duration-200 login-btn"
                style={{
                  background: loading ? "#37845e" : "#2d6a4f",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(45,106,79,0.25)",
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* ── 2FA TOTP Form ── */}
          {view === "totp" && (
            <form onSubmit={handleLogin} className="space-y-5">
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

              <InputField
                label=""
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="text-center"
                style={{ fontSize: 24, fontWeight: 700, letterSpacing: 10 }}
              />

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all duration-200 login-btn"
                style={{
                  background: loading ? "#37845e" : "#2d6a4f",
                  opacity: (loading || totpCode.length !== 6) ? 0.6 : 1,
                  boxShadow: "0 2px 8px rgba(45,106,79,0.25)",
                }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setTotpCode(""); }}
                className="w-full text-center text-[14px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Forgot Password Form ── */}
          {view === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <InputField
                label="Email address"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your registered email"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all duration-200 login-btn"
                style={{
                  background: loading ? "#37845e" : "#2d6a4f",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(45,106,79,0.25)",
                }}
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[14px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Reset Password Form ── */}
          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <InputField
                label="6-digit Code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="text-center"
                style={{ fontSize: 18, fontWeight: 700, letterSpacing: 8 }}
              />

              <InputField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all duration-200 login-btn"
                style={{
                  background: loading ? "#37845e" : "#2d6a4f",
                  opacity: loading ? 0.7 : 1,
                  boxShadow: "0 2px 8px rgba(45,106,79,0.25)",
                }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[14px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-10 pt-6" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-[13px] text-center" style={{ color: "#b0b0b0" }}>
              YODA Design v1.0 &middot; Clinic Management System
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Side: Photo ─── */}
      <div
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden"
        style={{ background: "#000" }}
      >
        {/* Photo background */}
        <img
          src="/login-bg.jpg"
          alt="Ayurvedic leaves"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.85 }}
        />

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.45) 100%)" }}
        />

        {/* Brand text overlay at bottom */}
        <div className="absolute bottom-10 left-0 right-0 text-center" style={{ zIndex: 2 }}>
          <h2 className="text-[22px] font-bold text-white mb-1 drop-shadow-lg">Ayur Centre</h2>
          <p className="text-[14px] font-medium text-white drop-shadow-md" style={{ opacity: 0.85 }}>
            Ayurveda &middot; Wellness &middot; Care
          </p>
        </div>
      </div>

      {/* ─── CSS ─── */}
      <style>{`
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(45,106,79,0.35) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Mobile: clean white background */
        @media (max-width: 1023px) {
          .login-page {
            background: #ffffff !important;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
