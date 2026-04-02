"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
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
          <h1 className="text-xl font-bold" style={{ color: "var(--grey-900, #111)" }}>AYUR GATE</h1>
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
                Set your password to activate your <strong>{info.role}</strong> account on AYUR GATE.
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
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 text-[15px] rounded-lg" style={{ border: "1.5px solid var(--grey-300)" }} placeholder="Min 6 characters" autoFocus />
                </div>
                <div>
                  <label className="block text-[14px] font-semibold mb-1" style={{ color: "var(--grey-700)" }}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 text-[15px] rounded-lg" style={{ border: "1.5px solid var(--grey-300)" }} placeholder="Re-enter password" />
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
