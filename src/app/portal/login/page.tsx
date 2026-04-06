"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" };
const inputStyle = { width: "100%", padding: "12px 16px", fontSize: 15, borderRadius: 10, border: "1.5px solid #e5e7eb", outline: "none", background: "#fafafa", boxSizing: "border-box" as const };
const btnPrimary = { width: "100%", padding: "14px", fontSize: 15, fontWeight: 700 as const, borderRadius: 10, border: "none", background: "#14532d", color: "#fff", cursor: "pointer" };

export default function PatientLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [otp, setOtp] = useState("");
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch clinics for selection
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([]);
  const [clinicsLoaded, setClinicsLoaded] = useState(false);

  async function loadClinics() {
    if (clinicsLoaded) return;
    try {
      const r = await fetch("/api/public/platform");
      if (r.ok) {
        const data = await r.json();
        // Platform endpoint might not have clinic list — use a simple approach
        // The clinicId will be entered or selected by the patient
      }
    } catch { /* */ }
    setClinicsLoaded(true);
  }

  async function requestOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    setError(""); setLoading(true);

    try {
      const r = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp", phone: phone.trim(), clinicId: clinicId || undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setPatientId(data.patientId);
        setMessage(data.message);
        setStep("otp");
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function verifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) { setError("Please enter the OTP"); return; }
    setError(""); setLoading(true);

    try {
      const r = await fetch("/api/portal/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", patientId, otp: otp.trim() }),
      });
      const data = await r.json();
      if (r.ok) {
        router.push("/portal");
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)", padding: 20 }}>
      <div style={{ ...card, width: "100%", maxWidth: 420, padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "#14532d", padding: "28px 32px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#bbf7d0" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <h1 style={{ color: "#fff", fontSize: 22, margin: 0, fontWeight: 800 }}>Patient Portal</h1>
          </div>
          <p style={{ color: "#bbf7d0", fontSize: 14, margin: 0 }}>View your appointments, prescriptions & invoices</p>
        </div>

        <div style={{ padding: "28px 32px" }}>
          {step === "phone" ? (
            <form onSubmit={requestOTP}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your registered phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ ...inputStyle, marginBottom: 16 }}
                autoFocus
              />

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Clinic Code <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. clinic_abc123"
                value={clinicId}
                onChange={e => setClinicId(e.target.value)}
                style={{ ...inputStyle, marginBottom: 20 }}
              />

              {error && (
                <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>

              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                We&apos;ll send a 6-digit code to your registered email or phone to verify your identity.
              </p>
            </form>
          ) : (
            <form onSubmit={verifyOTP}>
              {message && (
                <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  {message}
                </div>
              )}

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Enter OTP</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ ...inputStyle, fontSize: 24, fontWeight: 700, letterSpacing: 8, textAlign: "center", marginBottom: 20 }}
                autoFocus
                maxLength={6}
              />

              {error && (
                <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || otp.length < 6} style={{ ...btnPrimary, opacity: loading || otp.length < 6 ? 0.6 : 1 }}>
                {loading ? "Verifying..." : "Verify & Login"}
              </button>

              <button type="button" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                style={{ width: "100%", padding: 12, fontSize: 13, fontWeight: 600, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer", marginTop: 10 }}>
                Back to Phone Number
              </button>
            </form>
          )}
        </div>

        <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 32px", textAlign: "center" }}>
          <a href="/login" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>Staff Login →</a>
        </div>
      </div>
    </div>
  );
}
