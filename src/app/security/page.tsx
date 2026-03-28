"use client";

import { useState, useEffect } from "react";

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
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Security Settings</h1>
      <p className="text-[14px] mb-6" style={{ color: "var(--grey-500)" }}>Manage your account security and two-factor authentication</p>

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
              <h2 className="text-[15px] font-bold" style={{ color: "var(--grey-900)" }}>Two-Factor Authentication (2FA)</h2>
              <p className="text-[13px]" style={{ color: "var(--grey-500)" }}>
                Use Google Authenticator or any TOTP app
              </p>
            </div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-bold uppercase"
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
            className="px-5 py-2.5 text-[13px] font-bold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: "#2d6a4f" }}
          >
            Enable 2FA
          </button>
        )}

        {!setupMode && totpEnabled && (
          <button
            onClick={disable2FA}
            className="px-5 py-2.5 text-[13px] font-bold rounded-lg transition-all hover:opacity-90"
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
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "#2d6a4f" }}>1</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>Scan QR code with your authenticator app</span>
                </div>
                {qrCode ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="p-3 rounded-xl" style={{ background: "#fff", border: "2px solid var(--grey-200)" }}>
                      <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] mb-1" style={{ color: "var(--grey-500)" }}>Or enter this key manually:</p>
                      <code className="px-3 py-1.5 rounded text-[12px] font-mono font-bold" style={{ background: "#f3f4f6", color: "var(--grey-800)" }}>
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
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: "#2d6a4f" }}>2</span>
                  <span className="text-[13px] font-bold" style={{ color: "var(--grey-800)" }}>Enter the 6-digit code from your app</span>
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
                    className="px-5 py-3 text-[13px] font-bold text-white rounded-lg transition-all"
                    style={{ background: "#2d6a4f", opacity: (verifying || verifyCode.length !== 6) ? 0.6 : 1 }}
                  >
                    {verifying ? "Verifying..." : "Verify & Enable"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setSetupMode(false); setQrCode(""); setSecret(""); setVerifyCode(""); setError(""); }}
                className="text-[13px] font-semibold hover:underline"
                style={{ color: "#6b7280" }}
              >
                Cancel setup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 px-4 py-3 rounded-lg text-[12px]" style={{ background: "#d1f2e0", color: "#14532d" }}>
        <strong>Recommended apps:</strong> Google Authenticator, Microsoft Authenticator, Authy, or 1Password
      </div>
    </div>
  );
}
