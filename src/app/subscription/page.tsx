"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useFlash } from "@/components/FlashCardProvider";

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

interface SubscriptionData {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  maxUsers: number;
  maxPatients: number;
  clinicName: string;
}

const PLAN_DETAILS: Record<string, { name: string; price: string; color: string; features: string[] }> = {
  trial: {
    name: "Trial",
    price: "Free / 7 days",
    color: "#6b7280",
    features: ["Up to 5 staff", "Up to 100 patients", "Full feature access", "Email support"],
  },
  starter: {
    name: "Starter",
    price: "SGD 49/mo",
    color: "#2d6a4f",
    features: ["Up to 10 staff", "Up to 500 patients", "All features", "WhatsApp templates", "Inventory", "Email + chat support"],
  },
  professional: {
    name: "Professional",
    price: "SGD 99/mo",
    color: "#14532d",
    features: ["Up to 25 staff", "Unlimited patients", "Multi-branch", "Advanced reports", "Insurance claims", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom",
    color: "#1e3a5f",
    features: ["Unlimited staff", "Unlimited patients", "Unlimited branches", "Custom integrations", "Dedicated manager", "SLA guarantee"],
  },
};

export default function SubscriptionPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  const { showFlash } = useFlash();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    setLoading(true);
    fetch("/api/clinic/subscription")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setSub(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mounted]);

  if (!mounted) return null;

  const planInfo = sub ? PLAN_DETAILS[sub.plan] || PLAN_DETAILS.trial : PLAN_DETAILS.trial;
  const isTrialActive = sub?.plan === "trial" && !sub.isTrialExpired;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--grey-900)", margin: 0 }}>Subscription & Billing</h1>
          <p style={{ fontSize: 14, color: "var(--grey-600)", marginTop: 4 }}>Manage your plan, view usage, and billing information</p>
        </div>

        {loading ? (
          <div style={{ ...cardStyle, padding: 40, textAlign: "center" }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--grey-300)", borderTopColor: "#14532d", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--grey-500)" }}>Loading subscription...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* Current Plan Card */}
            <div style={{ ...cardStyle, padding: 0, marginBottom: 20, overflow: "hidden" }}>
              <div style={{
                padding: "20px 28px",
                background: `linear-gradient(135deg, ${planInfo.color}, ${planInfo.color}dd)`,
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Current Plan</span>
                  <h2 style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 0" }}>{planInfo.name}</h2>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 24, fontWeight: 800 }}>{planInfo.price}</span>
                  <div style={{
                    marginTop: 4, fontSize: 12, fontWeight: 700,
                    padding: "3px 12px", borderRadius: 99,
                    background: sub?.status === "active" ? "rgba(255,255,255,0.2)" : "rgba(255,0,0,0.3)",
                  }}>
                    {sub?.status === "active" ? "Active" : sub?.status?.toUpperCase() || "Unknown"}
                  </div>
                </div>
              </div>

              <div style={{ padding: "20px 28px" }}>
                {/* Trial info */}
                {isTrialActive && sub?.trialDaysRemaining !== null && (
                  <div style={{
                    padding: "14px 18px", borderRadius: 10, marginBottom: 20,
                    background: sub.trialDaysRemaining <= 2 ? "#fef2f2" : "#fffbeb",
                    border: `1px solid ${sub.trialDaysRemaining <= 2 ? "#fecaca" : "#fde68a"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: sub.trialDaysRemaining <= 2 ? "#991b1b" : "#92400e" }}>
                          {sub.trialDaysRemaining} day{sub.trialDaysRemaining !== 1 ? "s" : ""} remaining
                        </span>
                        <p style={{ fontSize: 13, color: "var(--grey-600)", marginTop: 2 }}>
                          Trial ends {sub.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "soon"}
                        </p>
                      </div>
                      <Link href="/pricing" style={{
                        padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                        background: "#14532d", color: "#fff", textDecoration: "none",
                      }}>
                        Upgrade Now
                      </Link>
                    </div>
                  </div>
                )}

                {sub?.isTrialExpired && (
                  <div style={{
                    padding: "14px 18px", borderRadius: 10, marginBottom: 20,
                    background: "#fef2f2", border: "1px solid #fecaca",
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#991b1b" }}>Trial Expired</span>
                    <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                      Your trial has ended. Please upgrade to continue using the platform.
                    </p>
                    <Link href="/pricing" style={{
                      display: "inline-block", marginTop: 10,
                      padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: "#14532d", color: "#fff", textDecoration: "none",
                    }}>
                      View Plans
                    </Link>
                  </div>
                )}

                {/* Usage Stats */}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-900)", marginBottom: 12 }}>Usage</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ padding: "14px 16px", background: "var(--grey-50)", borderRadius: 8, border: "1px solid var(--grey-200)" }}>
                    <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>Staff Limit</span>
                    <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--grey-900)" }}>
                      {sub?.maxUsers || 5}
                    </p>
                    <span style={{ fontSize: 12, color: "var(--grey-500)" }}>max staff members</span>
                  </div>
                  <div style={{ padding: "14px 16px", background: "var(--grey-50)", borderRadius: 8, border: "1px solid var(--grey-200)" }}>
                    <span style={{ fontSize: 12, color: "var(--grey-500)", fontWeight: 600 }}>Patient Limit</span>
                    <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 800, color: "var(--grey-900)" }}>
                      {sub?.maxPatients === 999999 ? "Unlimited" : sub?.maxPatients || 100}
                    </p>
                    <span style={{ fontSize: 12, color: "var(--grey-500)" }}>max patients</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Features */}
            <div style={{ ...cardStyle, padding: "24px 28px", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", marginBottom: 16 }}>Plan Features</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {planInfo.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                    <svg style={{ width: 16, height: 16, flexShrink: 0 }} fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontSize: 14, color: "var(--grey-700)" }}>{f}</span>
                  </div>
                ))}
              </div>
              {sub?.plan !== "enterprise" && (
                <div style={{ marginTop: 20 }}>
                  <Link href="/pricing" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                    background: "#14532d", color: "#fff", textDecoration: "none",
                  }}>
                    {sub?.plan === "trial" ? "Upgrade Plan" : "Compare Plans"}
                    <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* Billing Contact */}
            <div style={{ ...cardStyle, padding: "24px 28px" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", marginBottom: 8 }}>Billing Support</h3>
              <p style={{ fontSize: 14, color: "var(--grey-600)", lineHeight: 1.6 }}>
                For billing inquiries, plan changes, or enterprise pricing, contact us at{" "}
                <a href="mailto:ayurcentresg@gmail.com" style={{ color: "#14532d", fontWeight: 600, textDecoration: "none" }}>
                  ayurcentresg@gmail.com
                </a>
              </p>
            </div>
          </>
        )}
      </div>
  );
}
