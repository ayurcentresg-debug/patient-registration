"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Milestone {
  key: string;
  label: string;
  description: string;
  done: boolean;
  doneAt: string | null;
  href: string;
  cta: string;
  count?: number;
}

interface ProgressData {
  milestones: Milestone[];
  completedSteps: number;
  totalSteps: number;
  percent: number;
  isActivated: boolean;
  nextAction: Milestone | null;
  clinic: { name: string; createdAt: string };
}

const ICONS: Record<string, string> = {
  profile: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  branch: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
  staff: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  services: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  patient: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  appointment: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  invoice: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
  reminders: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

export default function SetupGuide() {
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/progress")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin w-7 h-7 border-3 rounded-full" style={{ borderColor: "#e5e7eb", borderTopColor: "#2d6a4f" }} />
      </div>
    );
  }

  const { milestones, completedSteps, totalSteps, percent, isActivated, nextAction } = data;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[22px] font-bold" style={{ color: "#111827" }}>Setup Guide</h1>
        <p className="text-[14px] mt-1" style={{ color: "#6b7280" }}>
          {isActivated
            ? "Your clinic is fully activated. All milestones complete."
            : `${completedSteps} of ${totalSteps} steps done — complete the remaining to activate your clinic.`}
        </p>
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "white", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold" style={{ color: "#374151" }}>Activation Progress</span>
          <span className="text-[13px] font-bold" style={{ color: percent === 100 ? "#059669" : "#2d6a4f" }}>
            {percent}%
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${percent}%`,
              background: percent === 100
                ? "linear-gradient(90deg, #059669, #10b981)"
                : "linear-gradient(90deg, #14532d, #2d6a4f)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: "#9ca3af" }}>Signed up</span>
          <span className="text-[11px]" style={{ color: "#9ca3af" }}>Activated</span>
        </div>
      </div>

      {/* ── Next Best Action (CTA banner) ── */}
      {nextAction && (
        <Link
          href={nextAction.href}
          className="flex items-center justify-between rounded-xl p-5 mb-6 transition-all hover:shadow-lg"
          style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest mb-0.5" style={{ color: "#a7f3d0" }}>NEXT STEP</p>
            <h3 className="text-[16px] font-bold text-white">{nextAction.label}</h3>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{nextAction.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <span className="px-4 py-2 rounded-lg text-[13px] font-semibold" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
              {nextAction.cta}
            </span>
          </div>
        </Link>
      )}

      {/* ── Activated banner ── */}
      {isActivated && (
        <div className="rounded-xl p-5 mb-6 flex items-center gap-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <span className="text-3xl">🎉</span>
          <div>
            <h3 className="text-[16px] font-bold" style={{ color: "#065f46" }}>Clinic Activated!</h3>
            <p className="text-[13px]" style={{ color: "#047857" }}>
              All milestones are complete. Your clinic is fully operational.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="ml-auto px-4 py-2 rounded-lg text-[13px] font-semibold text-white flex-shrink-0"
            style={{ background: "#059669" }}
          >
            Go to Dashboard
          </Link>
        </div>
      )}

      {/* ── Milestone Checklist ── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "white" }}>
        {milestones.map((m, i) => {
          const isNext = nextAction?.key === m.key;
          return (
            <div
              key={m.key}
              className="flex items-center gap-4 px-5 py-4 transition-all"
              style={{
                borderBottom: i < milestones.length - 1 ? "1px solid #f3f4f6" : "none",
                background: isNext ? "#fefce8" : "transparent",
              }}
            >
              {/* Step number / check */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: m.done ? "#d1fae5" : isNext ? "#fef3c7" : "#f3f4f6",
                  border: isNext ? "2px solid #f59e0b" : "none",
                }}
              >
                {m.done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3.5 8L6.5 11L12.5 5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke={isNext ? "#d97706" : "#9ca3af"} viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[m.key] || ""} />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[14px] font-semibold"
                  style={{ color: m.done ? "#6b7280" : "#111827" }}
                >
                  {m.label}
                  {m.done && m.count !== undefined && m.count > 0 && (
                    <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#d1fae5", color: "#065f46" }}>
                      {m.count}
                    </span>
                  )}
                </p>
                <p className="text-[12px]" style={{ color: "#9ca3af" }}>
                  {m.done && m.doneAt
                    ? `Completed ${new Date(m.doneAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : m.description}
                </p>
              </div>

              {/* Action */}
              {!m.done && (
                <Link
                  href={m.href}
                  className="text-[12px] font-semibold px-4 py-2 rounded-lg transition-all hover:opacity-90 flex-shrink-0"
                  style={isNext
                    ? { background: "#2d6a4f", color: "white" }
                    : { background: "#f3f4f6", color: "#374151" }
                  }
                >
                  {m.cta}
                </Link>
              )}
              {m.done && (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                  <circle cx="10" cy="10" r="10" fill="#d1fae5" />
                  <path d="M6 10L8.5 12.5L14 7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Help footer ── */}
      <div className="mt-6 text-center">
        <p className="text-[12px]" style={{ color: "#9ca3af" }}>
          Need help setting up?{" "}
          <a href="mailto:ayurcentresg@gmail.com" className="font-medium underline" style={{ color: "#2d6a4f" }}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
