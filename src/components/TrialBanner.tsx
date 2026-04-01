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

  // Enterprise/paid plans — no banner
  if (sub.plan !== "trial") return null;

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
            Upgrade to a paid plan to continue using AYUR GATE.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/pricing")}
              className="w-full py-3 rounded-lg text-white font-semibold text-[15px] transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
            >
              View Plans & Upgrade
            </button>
            <a
              href="mailto:ayurcentresg@gmail.com?subject=AYUR GATE Subscription Help"
              className="block w-full py-2.5 rounded-lg font-medium text-[14px] transition-colors hover:bg-gray-50"
              style={{ color: "#6b7280", border: "1px solid #e5e7eb" }}
            >
              Contact Support
            </a>
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
