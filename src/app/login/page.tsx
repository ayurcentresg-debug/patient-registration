"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        // Password correct, now need 2FA code
        setView("totp");
        setTotpCode("");
        return;
      }

      if (data.requires2FA && data.error) {
        // Wrong 2FA code
        setError(data.error);
        setTotpCode("");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/");
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #fefbf6 0%, #fef3c7 50%, #fde68a 100%)" }}
    >
      <div
        className="w-full rounded-2xl shadow-xl overflow-hidden"
        style={{ maxWidth: 420, background: "#fff" }}
      >
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #92400e, #b45309)" }}
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Ayur Centre</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
            {view === "login" && "Sign in to your account"}
            {view === "totp" && "Two-factor authentication"}
            {view === "forgot" && "Reset your password"}
            {view === "reset" && "Enter the code sent to your email"}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-[13px] font-medium" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 rounded-lg text-[13px] font-medium" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              {success}
            </div>
          )}

          {/* ── Login Form ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold mb-1.5" style={{ color: "#374151" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@clinic.com"
                  required
                  className="w-full px-4 py-3 text-[14px] rounded-lg outline-none transition-all"
                  style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold mb-1.5" style={{ color: "#374151" }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 pr-12 text-[14px] rounded-lg outline-none transition-all"
                    style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "#9ca3af" }}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-amber-700" />
                  <span className="text-[12px] font-medium" style={{ color: "#6b7280" }}>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setView("forgot"); setError(""); setSuccess(""); }}
                  className="text-[12px] font-bold hover:underline"
                  style={{ color: "#b45309" }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-bold text-white rounded-lg transition-all"
                style={{ background: loading ? "#d97706" : "#b45309", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {/* ── 2FA TOTP Form ── */}
          {view === "totp" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: "#fef3c7" }}>
                  <svg className="w-6 h-6" fill="none" stroke="#b45309" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <p className="text-[13px]" style={{ color: "#6b7280" }}>
                  Open your authenticator app and enter the 6-digit code
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-4 text-[24px] font-bold text-center tracking-[10px] rounded-lg outline-none transition-all"
                  style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full py-3 text-[14px] font-bold text-white rounded-lg transition-all"
                style={{ background: loading ? "#d97706" : "#b45309", opacity: (loading || totpCode.length !== 6) ? 0.6 : 1 }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setTotpCode(""); }}
                className="w-full text-center text-[13px] font-semibold hover:underline"
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
                <label className="block text-[12px] font-bold mb-1.5" style={{ color: "#374151" }}>Email address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  className="w-full px-4 py-3 text-[14px] rounded-lg outline-none transition-all"
                  style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-bold text-white rounded-lg transition-all"
                style={{ background: loading ? "#d97706" : "#b45309", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[13px] font-semibold hover:underline"
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
                <label className="block text-[12px] font-bold mb-1.5" style={{ color: "#374151" }}>6-digit Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  className="w-full px-4 py-3 text-[18px] font-bold text-center tracking-[8px] rounded-lg outline-none transition-all"
                  style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold mb-1.5" style={{ color: "#374151" }}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 text-[14px] rounded-lg outline-none transition-all"
                  style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#b45309"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(180,83,9,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-[14px] font-bold text-white rounded-lg transition-all"
                style={{ background: loading ? "#d97706" : "#b45309", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => { setView("login"); setError(""); setSuccess(""); }}
                className="w-full text-center text-[13px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-[11px]" style={{ color: "#9ca3af" }}>
            Clinic Management System v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
