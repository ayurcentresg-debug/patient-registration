"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { validatePassword, PASSWORD_RULES } from "@/lib/country-data";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{ name: string; email: string; role: string } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then(async (res) => {
        if (res.ok) {
          setInfo(await res.json());
        } else {
          const data = await res.json();
          setError(data.error || "Invalid invite link");
        }
      })
      .catch(() => setError("Failed to validate invite"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwResult = validatePassword(password);
    if (!pwResult.valid) { setError("Password requirements not met: " + pwResult.errors.join(", ")); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to activate account");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--grey-50, #f9fafb)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white font-bold text-xl mb-3" style={{ background: "#14532d" }}>AC</div>
          <h1 className="text-xl font-bold" style={{ color: "var(--grey-900, #111)" }}>AyurGate</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ border: "1.5px solid var(--grey-200, #e5e7eb)" }}>
          {loading && <p className="text-center text-[15px]" style={{ color: "var(--grey-500)" }}>Validating invite...</p>}

          {!loading && error && !info && (
            <div className="text-center">
              <div className="text-4xl mb-3">&#128683;</div>
              <h2 className="text-[16px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Invalid Invite</h2>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>{error}</p>
              <button onClick={() => router.push("/login")} className="mt-4 px-4 py-2 text-[15px] font-semibold rounded-lg" style={{ background: "var(--grey-100)", color: "var(--grey-700)" }}>
                Go to Login
              </button>
            </div>
          )}

          {success && (
            <div className="text-center">
              <div className="text-4xl mb-3">&#9989;</div>
              <h2 className="text-[16px] font-bold mb-1" style={{ color: "#059669" }}>Account Activated!</h2>
              <p className="text-[15px]" style={{ color: "var(--grey-500)" }}>Redirecting to login...</p>
            </div>
          )}

          {info && !success && (
            <>
              <h2 className="text-[16px] font-bold mb-1" style={{ color: "var(--grey-900)" }}>Welcome, {info.name}!</h2>
              <p className="text-[15px] mb-4" style={{ color: "var(--grey-500)" }}>
                Set your password to activate your <strong>{info.role}</strong> account on AyurGate.
              </p>

              {error && (
                <div className="p-3 rounded-lg mb-3 text-[14px] font-medium" style={{ background: "#fee2e2", color: "#dc2626" }}>{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Email</label>
                  <input type="email" value={info.email} disabled className="w-full px-3 py-2 text-[15px] rounded-lg" style={{ background: "var(--grey-50)", border: "1.5px solid var(--grey-200)", color: "var(--grey-500)" }} />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 text-[15px] rounded-lg" style={{ border: "1.5px solid var(--grey-300)", paddingRight: 40 }} placeholder="Min 12 characters" autoFocus />
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
                  {password && (
                    <div style={{ marginTop: 8 }}>
                      {PASSWORD_RULES.map((rule, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: rule.test(password) ? "#059669" : "#9ca3af", marginBottom: 2 }}>
                          {rule.test(password) ? (
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
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-[15px] rounded-lg" style={{ border: "1.5px solid var(--grey-300)", paddingRight: 40 }} placeholder="Re-enter password" />
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
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 text-[15px] font-semibold text-white rounded-lg"
                  style={{ background: submitting ? "#9ca3af" : "#14532d" }}
                >
                  {submitting ? "Activating..." : "Activate Account"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
