"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Trial",
    key: "trial",
    price: "Free",
    period: "7 days",
    description: "Try everything before you commit",
    features: [
      "Up to 5 staff members",
      "Up to 100 patients",
      "Full feature access",
      "Email support",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: false,
    color: "#6b7280",
    hasCheckout: false,
  },
  {
    name: "Starter",
    key: "starter",
    price: "₹3,999",
    monthlyNum: 3999,
    period: "/month",
    description: "Perfect for small clinics",
    features: [
      "Up to 10 staff members",
      "Up to 500 patients",
      "All features included",
      "WhatsApp templates",
      "Inventory management",
      "Email + chat support",
    ],
    cta: "Get Started",
    href: "/register?plan=starter",
    popular: false,
    color: "#2d6a4f",
    hasCheckout: true,
  },
  {
    name: "Professional",
    key: "professional",
    price: "₹7,999",
    monthlyNum: 7999,
    period: "/month",
    description: "For growing multi-doctor clinics",
    features: [
      "Up to 25 staff members",
      "Unlimited patients",
      "Multi-branch support",
      "Advanced reports & analytics",
      "Insurance claims management",
      "Treatment packages & plans",
      "Priority support",
    ],
    cta: "Start Professional",
    href: "/register?plan=professional",
    popular: true,
    color: "#14532d",
    hasCheckout: true,
  },
  {
    name: "Enterprise",
    key: "enterprise",
    price: "Custom",
    period: "",
    description: "For clinic chains & franchises",
    features: [
      "Unlimited staff",
      "Unlimited patients",
      "Unlimited branches",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise option",
      "White-label branding",
    ],
    cta: "Contact Sales",
    href: "mailto:ayurcentresg@gmail.com?subject=AYUR GATE Enterprise Inquiry",
    popular: false,
    color: "#1e3a5f",
    hasCheckout: false,
  },
];

const features = [
  { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Patient Management", desc: "Complete records, medical history, vitals tracking, and family linkage" },
  { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Smart Scheduling", desc: "Doctor-wise slots, walk-ins, treatment packages, and automated reminders" },
  { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", title: "Digital Prescriptions", desc: "Ayurvedic medicine categories, WhatsApp share, print, and pharmacy workflow" },
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "Inventory & Pharmacy", desc: "Stock tracking, expiry alerts, purchase orders, multi-branch transfers" },
  { icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", title: "GST-Compliant Billing", desc: "Invoices, payments, credit notes, insurance claims, and financial reports" },
  { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "WhatsApp & Communications", desc: "Pre-built templates, appointment reminders, and bulk messaging" },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, annual }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        // Not logged in — redirect to register with plan
        router.push(`/register?plan=${planKey}`);
      } else {
        setError(data.error || "Failed to start checkout");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 yoda-slide-in" style={{ background: "var(--red-light, #fef2f2)", border: "1px solid var(--red, #dc2626)", color: "var(--red, #dc2626)" }}>
          <span className="text-[14px] font-medium">{error}</span>
          <button onClick={() => setError(null)} className="text-[18px] font-bold leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
      {/* Header */}
      <header className="border-b" style={{ borderColor: "#e5e7eb", background: "white" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
              <span className="text-white text-sm font-black">AG</span>
            </div>
            <span className="text-lg font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[14px] font-medium px-4 py-2 rounded-lg transition-colors hover:bg-gray-50" style={{ color: "#374151" }}>
              Sign In
            </Link>
            <Link href="/register" className="text-[14px] font-medium px-5 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90" style={{ background: "#14532d" }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-12 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: "#111827" }}>
          Simple pricing for every clinic
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: "#6b7280" }}>
          Start with a 7-day free trial. No credit card required. Upgrade anytime as your clinic grows.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className="text-[14px] font-medium" style={{ color: annual ? "#9ca3af" : "#111827" }}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: annual ? "#2d6a4f" : "#d1d5db" }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ left: annual ? 26 : 2 }}
            />
          </button>
          <span className="text-[14px] font-medium" style={{ color: annual ? "#111827" : "#9ca3af" }}>
            Annual <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#d1fae5", color: "#065f46" }}>Save 20%</span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const displayPrice = plan.monthlyNum && annual
              ? `₹${Math.round(plan.monthlyNum * 0.8).toLocaleString("en-IN")}`
              : plan.price;

            return (
              <div
                key={plan.name}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: "white",
                  border: plan.popular ? "2px solid #2d6a4f" : "1px solid #e5e7eb",
                  boxShadow: plan.popular ? "0 8px 30px rgba(45,106,79,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[12px] font-bold text-white" style={{ background: "#2d6a4f" }}>
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-bold mb-1" style={{ color: plan.color }}>{plan.name}</h3>
                <p className="text-[13px] mb-4" style={{ color: "#6b7280" }}>{plan.description}</p>

                <div className="mb-5">
                  <span className="text-3xl font-bold" style={{ color: "#111827" }}>{displayPrice}</span>
                  {plan.period && <span className="text-[14px]" style={{ color: "#6b7280" }}>{plan.period}</span>}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "#374151" }}>
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke={plan.color} strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.hasCheckout ? (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={loading === plan.key}
                    className="block w-full text-center py-2.5 rounded-lg font-semibold text-[14px] transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: plan.popular ? "#14532d" : "transparent",
                      color: plan.popular ? "white" : plan.color,
                      border: plan.popular ? "none" : `1.5px solid ${plan.color}`,
                    }}
                  >
                    {loading === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Redirecting...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                ) : (
                  <Link
                    href={plan.href}
                    className="block text-center py-2.5 rounded-lg font-semibold text-[14px] transition-opacity hover:opacity-90"
                    style={{
                      background: plan.popular ? "#14532d" : "transparent",
                      color: plan.popular ? "white" : plan.color,
                      border: plan.popular ? "none" : `1.5px solid ${plan.color}`,
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Secure Payment Badge */}
      <section className="text-center pb-12 px-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <svg className="w-4 h-4" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-[13px] font-medium" style={{ color: "#16a34a" }}>Secure payments powered by Stripe</span>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6" style={{ background: "white", borderTop: "1px solid #e5e7eb" }}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3" style={{ color: "#111827" }}>
            Everything your Ayurveda clinic needs
          </h2>
          <p className="text-center text-[15px] mb-12 max-w-xl mx-auto" style={{ color: "#6b7280" }}>
            Built specifically for Ayurveda, Panchakarma, and wellness clinics. All features included in every plan.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#d1fae5" }}>
                  <svg className="w-5 h-5" fill="none" stroke="#14532d" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] mb-1" style={{ color: "#111827" }}>{f.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#6b7280" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center" style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Ready to modernize your clinic?
        </h2>
        <p className="text-[15px] text-white/80 mb-8 max-w-lg mx-auto">
          Join Ayurveda clinics across Asia already using AYUR GATE to manage their practice efficiently.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-3.5 rounded-xl text-[15px] font-bold transition-transform hover:scale-105"
          style={{ background: "white", color: "#14532d" }}
        >
          Start Your Free 7-Day Trial
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#14532d" }}>
            <span className="text-white text-[10px] font-black">AG</span>
          </div>
          <span className="text-[14px] font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
        </div>
        <p className="text-[12px]" style={{ color: "#9ca3af" }}>
          Complete Ayurveda Clinic Management Software
        </p>
        <p className="text-[11px] mt-2" style={{ color: "#d1d5db" }}>
          Contact: ayurcentresg@gmail.com
        </p>
      </footer>
    </div>
  );
}
