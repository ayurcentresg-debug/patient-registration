"use client";

import { useState, useEffect } from "react";
import { validatePassword, PASSWORD_RULES } from "@/lib/country-data";

export default function SecurityPage() {
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(async () => {
        // Check 2FA status from a dedicated endpoint
        const res = await fetch("/api/auth/totp-status");
        if (res.ok) {
          const data = await res.json();
          setTotpEnabled(data.enabled);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    setError("");
    setSuccess("");
    setSetupMode(true);

    try {
      const res = await fetch("/api/auth/totp-setup", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to set up 2FA");
        setSetupMode(false);
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
    } catch {
      setError("Network error");
      setSetupMode(false);
    }
  }

  async function verifyAndEnable() {
    setError("");
    setVerifying(true);

    try {
      const res = await fetch("/api/auth/totp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode, action: "enable" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }

      setTotpEnabled(true);
      setSetupMode(false);
      setSuccess("Two-factor authentication enabled successfully!");
      setQrCode("");
      setSecret("");
      setVerifyCode("");
    } catch {
      setError("Network error");
    } finally {
      setVerifying(false);
    }
  }

  async function disable2FA() {
    setError("");

    try {
      const res = await fetch("/api/auth/totp-disable", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to disable 2FA");
        return;
      }

      setTotpEnabled(false);
      setSuccess("Two-factor authentication disabled.");
    } catch {
      setError("Network error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto yoda-fade-in">
      <h1 className="text-[24px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Security Settings</h1>
      <p className="text-[16px] mb-6" style={{ color: "var(--grey-500)" }}>Manage your account security and two-factor authentication</p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[15px] font-medium" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[15px] font-medium" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
          {success}
        </div>
      )}

      {/* 2FA Status Card */}
      <div className="rounded-xl p-6" style={{ background: "var(--white)", border: "1.5px solid var(--grey-300)" }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: totpEnabled ? "#f0fdf4" : "#d1f2e0" }}>
              <svg className="w-5 h-5" fill="none" stroke={totpEnabled ? "#16a34a" : "#2d6a4f"} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Two-Factor Authentication (2FA)</h2>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>
                Use Google Authenticator or any TOTP app
              </p>
            </div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[13px] font-bold uppercase"
            style={{
              background: totpEnabled ? "#f0fdf4" : "#fef2f2",
              color: totpEnabled ? "#16a34a" : "#dc2626",
              border: totpEnabled ? "1px solid #bbf7d0" : "1px solid #fecaca",
            }}
          >
            {totpEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {!setupMode && !totpEnabled && (
          <button
            onClick={startSetup}
            className="px-5 py-2.5 text-[15px] font-bold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: "#2d6a4f" }}
          >
            Enable 2FA
          </button>
        )}

        {!setupMode && totpEnabled && (
          <button
            onClick={disable2FA}
            className="px-5 py-2.5 text-[15px] font-bold rounded-lg transition-all hover:opacity-90"
            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            Disable 2FA
          </button>
        )}

        {/* Setup Flow */}
        {setupMode && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--grey-200)" }}>
            <div className="space-y-5">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: "#2d6a4f" }}>1</span>
                  <span className="text-[15px] font-bold" style={{ color: "var(--grey-800)" }}>Scan QR code with your authenticator app</span>
                </div>
                {qrCode ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="p-3 rounded-xl" style={{ background: "#fff", border: "2px solid var(--grey-200)" }}>
                      <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] mb-1" style={{ color: "var(--grey-500)" }}>Or enter this key manually:</p>
                      <code className="px-3 py-1.5 rounded text-[14px] font-mono font-bold" style={{ background: "#f3f4f6", color: "var(--grey-800)" }}>
                        {secret}
                      </code>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
                  </div>
                )}
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: "#2d6a4f" }}>2</span>
                  <span className="text-[15px] font-bold" style={{ color: "var(--grey-800)" }}>Enter the 6-digit code from your app</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="px-4 py-3 text-[18px] font-bold text-center tracking-[6px] rounded-lg outline-none w-[200px]"
                    style={{ border: "1.5px solid #d1d5db", background: "#fafafa" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#2d6a4f"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
                  />
                  <button
                    onClick={verifyAndEnable}
                    disabled={verifying || verifyCode.length !== 6}
                    className="px-5 py-3 text-[15px] font-bold text-white rounded-lg transition-all"
                    style={{ background: "#2d6a4f", opacity: (verifying || verifyCode.length !== 6) ? 0.6 : 1 }}
                  >
                    {verifying ? "Verifying..." : "Verify & Enable"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setSetupMode(false); setQrCode(""); setSecret(""); setVerifyCode(""); setError(""); }}
                className="text-[15px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Cancel setup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 px-4 py-3 rounded-lg text-[14px]" style={{ background: "#d1f2e0", color: "#14532d" }}>
        <strong>Recommended apps:</strong> Google Authenticator, Microsoft Authenticator, Authy, or 1Password
      </div>

      {/* Password Change Card */}
      <div className="rounded-xl p-6 mt-6" style={{ background: "var(--white)", border: "1.5px solid var(--grey-300)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#d1f2e0" }}>
            <svg className="w-5 h-5" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--grey-900)" }}>Change Password</h2>
            <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>Update your account password</p>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setSuccess("");

            if (newPassword !== confirmPassword) {
              setError("New passwords do not match");
              return;
            }

            const pwResult = validatePassword(newPassword);
            if (!pwResult.valid) {
              setError("Password requirements not met: " + pwResult.errors.join(", "));
              return;
            }

            setPwLoading(true);
            try {
              const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
              });
              const data = await res.json();

              if (!res.ok) {
                setError(data.error || "Failed to change password");
                return;
              }

              setSuccess("Password changed successfully!");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            } catch {
              setError("Network error. Please try again.");
            } finally {
              setPwLoading(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                style={{ border: "1.5px solid #e5e7eb", background: "#fafafa", paddingRight: 40 }}
                onFocus={(e) => { e.target.style.borderColor = "#2d6a4f"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                tabIndex={-1}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 12 characters"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "#fafafa", paddingRight: 40 }}
                  onFocus={(e) => { e.target.style.borderColor = "#2d6a4f"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              </div>
              {newPassword && (
                <div style={{ marginTop: 8 }}>
                  {PASSWORD_RULES.map((rule, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: rule.test(newPassword) ? "#059669" : "#9ca3af", marginBottom: 2 }}>
                      {rule.test(newPassword) ? (
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
            <div>
              <label className="block text-[13px] font-medium mb-1" style={{ color: "#374151" }}>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={12}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2.5 rounded-lg text-[14px] outline-none transition-all"
                  style={{ border: "1.5px solid #e5e7eb", background: "#fafafa", paddingRight: 40 }}
                  onFocus={(e) => { e.target.style.borderColor = "#2d6a4f"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af" }}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="px-5 py-2.5 text-[15px] font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "#2d6a4f" }}
          >
            {pwLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
