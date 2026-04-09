"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SubscriptionInfo {
  plan: string;
  status: string;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  clinicName: string;
}

export default function TrialBanner() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/clinic/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSub(data);
      })
      .catch(() => {});
  }, []);

  if (!sub || dismissed) return null;

  // Paid plans — no banner
  if (sub.plan !== "trial") return null;

  async function handleUpgrade(plan: string) {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, annual: false }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        router.push("/pricing");
      }
    } catch {
      router.push("/pricing");
    } finally {
      setUpgrading(null);
    }
  }

  // Trial expired — show blocking overlay
  if (sub.isTrialExpired) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#fef2f2" }}>
            <svg className="w-8 h-8" fill="none" stroke="#dc2626" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#111827" }}>
            Trial Period Expired
          </h2>
          <p className="text-[14px] mb-6" style={{ color: "#6b7280" }}>
            Your 7-day free trial for <strong>{sub.clinicName}</strong> has ended.
            Choose a plan to continue using AyurGate.
          </p>

          {/* Quick upgrade buttons */}
          <div className="space-y-2.5 mb-4">
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={upgrading === "starter"}
              className="w-full py-3 rounded-lg font-semibold text-[14px] transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: "#ecfdf5", color: "#14532d", border: "1.5px solid #2d6a4f" }}
            >
              {upgrading === "starter" ? "Redirecting to Stripe..." : "Starter — ₹3,999/mo (10 staff, 500 patients)"}
            </button>
            <button
              onClick={() => handleUpgrade("professional")}
              disabled={upgrading === "professional"}
              className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
            >
              {upgrading === "professional" ? "Redirecting to Stripe..." : "Professional — ₹7,999/mo (25 staff, unlimited)"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/pricing")}
              className="flex-1 py-2.5 rounded-lg font-medium text-[13px] transition-colors hover:bg-gray-50"
              style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
            >
              Compare All Plans
            </button>
            <a
              href="mailto:ayurcentresg@gmail.com?subject=AyurGate Subscription Help"
              className="flex-1 py-2.5 rounded-lg font-medium text-[13px] text-center transition-colors hover:bg-gray-50"
              style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
            >
              Contact Support
            </a>
          </div>

          {/* Stripe badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="#9ca3af" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-[11px]" style={{ color: "#9ca3af" }}>Secure payments by Stripe</span>
          </div>
        </div>
      </div>
    );
  }

  // Trial active — show countdown banner
  if (sub.trialDaysRemaining !== null && sub.trialDaysRemaining <= 5) {
    const urgent = sub.trialDaysRemaining <= 2;
    return (
      <div
        className="relative text-center py-2 px-4 text-[13px] font-medium"
        style={{
          background: urgent ? "#fef2f2" : "#fffbeb",
          color: urgent ? "#991b1b" : "#92400e",
          borderBottom: `1px solid ${urgent ? "#fecaca" : "#fde68a"}`,
        }}
      >
        <span>
          {sub.trialDaysRemaining === 0
            ? "Your trial expires today!"
            : `${sub.trialDaysRemaining} day${sub.trialDaysRemaining === 1 ? "" : "s"} left in your free trial.`}
        </span>
        <button
          onClick={() => router.push("/pricing")}
          className="ml-3 px-3 py-0.5 rounded text-[12px] font-bold transition-opacity hover:opacity-80"
          style={{
            background: urgent ? "#dc2626" : "#d97706",
            color: "white",
          }}
        >
          Upgrade Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
}
