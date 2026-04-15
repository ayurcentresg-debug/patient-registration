"use client";

/**
 * StatusBanner — surfaces actionable subscription/account issues at the top
 * of every authenticated page.
 *
 * Trial-specific banners are handled by TrialBanner (this file deliberately
 * skips trial plans to avoid duplication). This handles paid-plan issues:
 *   • status === "past_due"     → red, urgent
 *   • status === "suspended"    → red, blocking-style
 *   • status === "cancelled"    → amber, with "reactivate" CTA
 *   • status === "expired"      → red
 *
 * Dismissals are remembered for 24h via sessionStorage (per-tab).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SubscriptionInfo {
  plan: string;
  status: string;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  clinicName: string;
}

type Severity = "critical" | "warning";

interface BannerSpec {
  severity: Severity;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  dismissKey: string;
}

function getSpec(sub: SubscriptionInfo): BannerSpec | null {
  // Skip trials — TrialBanner owns those
  if (sub.plan === "trial") return null;

  switch (sub.status) {
    case "past_due":
      return {
        severity: "critical",
        message: "Your latest payment failed. Update your billing details to avoid losing access.",
        ctaLabel: "Update payment",
        ctaHref: "/subscription",
        dismissKey: "status-past_due",
      };
    case "suspended":
      return {
        severity: "critical",
        message: "Your account is suspended. Contact support to restore access.",
        ctaLabel: "Contact support",
        ctaHref: "mailto:support@ayurgate.com?subject=Suspended%20account",
        dismissKey: "status-suspended",
      };
    case "expired":
      return {
        severity: "critical",
        message: "Your subscription has expired. Renew to regain full access.",
        ctaLabel: "Renew now",
        ctaHref: "/pricing",
        dismissKey: "status-expired",
      };
    case "cancelled":
      return {
        severity: "warning",
        message: "Your subscription is cancelled and will end at the period end.",
        ctaLabel: "Reactivate",
        ctaHref: "/subscription",
        dismissKey: "status-cancelled",
      };
    default:
      return null;
  }
}

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(`banner-dismiss:${key}`);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function markDismissed(key: string): void {
  try {
    sessionStorage.setItem(`banner-dismiss:${key}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function StatusBanner() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/clinic/subscription")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSub(data); })
      .catch(() => {});
  }, []);

  if (!sub || dismissed) return null;
  const spec = getSpec(sub);
  if (!spec) return null;
  if (isDismissed(spec.dismissKey)) return null;

  const isCritical = spec.severity === "critical";
  const colors = isCritical
    ? { bg: "#fef2f2", fg: "#991b1b", border: "#fecaca", btnBg: "#dc2626" }
    : { bg: "#fffbeb", fg: "#92400e", border: "#fde68a", btnBg: "#d97706" };

  const isMailto = spec.ctaHref.startsWith("mailto:");

  return (
    <div
      role={isCritical ? "alert" : "status"}
      className="relative text-center py-2 px-10 text-[13px] font-medium"
      style={{
        background: colors.bg,
        color: colors.fg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <span>{spec.message}</span>
      {isMailto ? (
        <a
          href={spec.ctaHref}
          className="ml-3 inline-block px-3 py-0.5 rounded text-[12px] font-bold text-white transition-opacity hover:opacity-80"
          style={{ background: colors.btnBg }}
        >
          {spec.ctaLabel}
        </a>
      ) : (
        <button
          onClick={() => router.push(spec.ctaHref)}
          className="ml-3 px-3 py-0.5 rounded text-[12px] font-bold text-white transition-opacity hover:opacity-80"
          style={{ background: colors.btnBg }}
        >
          {spec.ctaLabel}
        </button>
      )}
      <button
        onClick={() => { markDismissed(spec.dismissKey); setDismissed(true); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5"
        aria-label="Dismiss banner"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
