"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Persistent banner shown on dashboard when clinic email is not verified.
 * Non-blocking — just a reminder, no features are restricted (except invite/upgrade).
 */
export default function EmailVerifyBanner() {
  const [show, setShow] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if clinic email is verified
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.emailVerified === false) {
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setEmailSent(true);
      setResendTimer(60);
    } catch {
      setError("Failed to send");
    } finally {
      setSending(false);
    }
  }, []);

  const verify = async () => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setVerified(true);
      setTimeout(() => setShow(false), 2000);
    } catch {
      setError("Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (!show || dismissed) return null;

  return (
    <div
      className="relative px-4 py-3"
      style={{
        background: verified
          ? "linear-gradient(90deg, #f0fdf4, #dcfce7)"
          : "linear-gradient(90deg, #fffbeb, #fef3c7)",
        borderBottom: `1px solid ${verified ? "#bbf7d0" : "#fde68a"}`,
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
        {verified ? (
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="8" fill="#22c55e" />
              <path d="M5 8L7 10L11 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13px] font-medium" style={{ color: "#166534" }}>
              Email verified successfully!
            </span>
          </div>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <circle cx="8" cy="8" r="7" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M8 5V8.5M8 10.5V11" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-medium flex-shrink-0" style={{ color: "#92400e" }}>
              Verify your email to unlock all features.
            </span>

            {!emailSent ? (
              <button
                onClick={sendCode}
                disabled={sending}
                className="text-[12px] font-semibold px-3 py-1 rounded-md transition-all disabled:opacity-60"
                style={{ background: "#f59e0b", color: "white" }}
              >
                {sending ? "Sending..." : "Send Verification Code"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-28 px-2 py-1 rounded-md text-[13px] text-center tracking-widest font-mono outline-none"
                  style={{ border: "1px solid #fde68a", background: "white" }}
                />
                <button
                  onClick={verify}
                  disabled={verifying || code.length !== 6}
                  className="text-[12px] font-semibold px-3 py-1 rounded-md disabled:opacity-60"
                  style={{ background: "#2d6a4f", color: "white" }}
                >
                  {verifying ? "..." : "Verify"}
                </button>
                {resendTimer > 0 ? (
                  <span className="text-[11px]" style={{ color: "#92400e" }}>
                    Resend in {resendTimer}s
                  </span>
                ) : (
                  <button onClick={sendCode} disabled={sending} className="text-[11px] underline" style={{ color: "#92400e" }}>
                    Resend
                  </button>
                )}
              </div>
            )}

            {error && (
              <span className="text-[12px]" style={{ color: "#dc2626" }}>
                {error}
              </span>
            )}
          </>
        )}

        {/* Dismiss button */}
        {!verified && (
          <button
            onClick={() => setDismissed(true)}
            className="ml-auto text-[18px] leading-none opacity-40 hover:opacity-70 transition-opacity"
            style={{ color: "#92400e" }}
            aria-label="Dismiss"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
