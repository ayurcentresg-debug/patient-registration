"use client";

import Link from "next/link";
import { useState } from "react";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: "Smart Appointments",
    desc: "Online booking, doctor schedules, slot management, walk-ins, and automated reminders via WhatsApp & SMS.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "Patient Records",
    desc: "Complete patient profiles, family linking, medical history, vitals tracking, clinical notes, and document uploads.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "Billing & Invoicing",
    desc: "GST-ready invoices, insurance claims, credit notes, treatment packages, and multiple payment methods.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: "Inventory & Pharmacy",
    desc: "Track medicines, herbs, oils with variants, batch numbers, expiry alerts, low-stock warnings, and supplier management.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "Multi-Branch",
    desc: "Manage multiple clinic locations, inter-branch stock transfers, branch-wise reports, and centralized control.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Reports & Analytics",
    desc: "Revenue dashboards, appointment analytics, treatment trends, staff performance, and exportable reports.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: "Treatment Plans",
    desc: "Custom treatment plans with milestones, session tracking, package management, and progress monitoring.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: "Communications",
    desc: "WhatsApp messaging, SMS reminders, email notifications, pre-built templates, and broadcast messages.",
  },
];

const stats = [
  { value: "10,000+", label: "Patients Managed" },
  { value: "50+", label: "Clinics Trust Us" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ background: "#faf9f6", color: "#1a1a1a" }}>
      {/* ─── Navbar ─────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(250, 249, 246, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #e8e5df",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: 1,
              }}
            >
              AG
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#14532d", letterSpacing: "0.08em" }}>
              AYUR GATE
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="hidden-mobile">
            <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: "#555", textDecoration: "none" }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: "#555", textDecoration: "none" }}>How It Works</a>
            <Link href="/pricing" style={{ fontSize: 14, fontWeight: 500, color: "#555", textDecoration: "none" }}>Pricing</Link>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#2d6a4f",
                textDecoration: "none",
                padding: "8px 20px",
                border: "1.5px solid #2d6a4f",
                borderRadius: 8,
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "white",
                textDecoration: "none",
                padding: "8px 20px",
                background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                borderRadius: 8,
              }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="show-mobile"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ background: "none", border: "none", padding: 8, cursor: "pointer" }}
          >
            <svg width="24" height="24" fill="none" stroke="#333" strokeWidth={2} viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: "white",
              borderTop: "1px solid #e8e5df",
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            className="show-mobile"
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 15, color: "#333", textDecoration: "none" }}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 15, color: "#333", textDecoration: "none" }}>How It Works</a>
            <Link href="/pricing" style={{ fontSize: 15, color: "#333", textDecoration: "none" }}>Pricing</Link>
            <Link href="/login" style={{ fontSize: 15, color: "#2d6a4f", fontWeight: 600, textDecoration: "none" }}>Sign In</Link>
            <Link
              href="/register"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "white",
                textDecoration: "none",
                padding: "12px 20px",
                background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 140,
          paddingBottom: 80,
          textAlign: "center",
          maxWidth: 900,
          margin: "0 auto",
          padding: "140px 24px 80px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 100,
            padding: "6px 16px",
            marginBottom: 24,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#065f46" }}>Now in Open Beta</span>
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            color: "#111",
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          The Modern Clinic
          <br />
          <span style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f, #059669)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Management Platform
          </span>
        </h1>

        <p style={{ fontSize: "clamp(16px, 2vw, 19px)", color: "#6b7280", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Purpose-built for Ayurveda, wellness, and healthcare practices.
          Manage patients, appointments, billing, inventory, and staff — all in one place.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              background: "linear-gradient(135deg, #14532d, #2d6a4f)",
              color: "white",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(45, 106, 79, 0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            Start Free Trial
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="#features"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 32px",
              background: "white",
              color: "#374151",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              textDecoration: "none",
              border: "1.5px solid #d1d5db",
            }}
          >
            See Features
          </Link>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, color: "#9ca3af" }}>
          7-day free trial &middot; No credit card required &middot; Cancel anytime
        </p>
      </section>

      {/* ─── Stats Bar ──────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(135deg, #14532d, #1e4d3a)", padding: "40px 24px" }}>
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 32,
            textAlign: "center",
          }}
        >
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#a7f3d0" }}>{s.value}</div>
              <div style={{ fontSize: 14, color: "#86efac", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────────────── */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#2d6a4f", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Everything You Need
          </span>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#111", marginTop: 8 }}>
            Built for Ayurveda & Wellness Clinics
          </h2>
          <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 560, margin: "12px auto 0" }}>
            From patient registration to treatment plans, every feature is designed for the way your clinic works.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "white",
                borderRadius: 14,
                padding: "28px 24px",
                border: "1px solid #e8e5df",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
              className="feature-card"
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "#ecfdf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2d6a4f",
                  marginBottom: 16,
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: "#f0fdf4", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#2d6a4f", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Get Started in Minutes
            </span>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#111", marginTop: 8 }}>
              Three Steps to a Better Clinic
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
            {[
              {
                step: "1",
                title: "Register Your Clinic",
                desc: "Sign up with your clinic name and email. Your workspace is ready instantly with a 7-day free trial.",
              },
              {
                step: "2",
                title: "Add Your Team",
                desc: "Invite doctors, therapists, and staff. Set up schedules, consultation fees, and role-based access.",
              },
              {
                step: "3",
                title: "Start Managing",
                desc: "Register patients, book appointments, manage inventory, generate invoices, and track everything.",
              },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                    color: "white",
                    fontSize: 22,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  {s.step}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Specialties ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2d6a4f", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Built For
        </span>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#111", marginTop: 8, marginBottom: 40 }}>
          Every Wellness Practice
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {[
            "Ayurveda Clinics",
            "Panchakarma Centers",
            "Yoga Studios",
            "Naturopathy",
            "Siddha Medicine",
            "Unani Medicine",
            "Homeopathy",
            "Acupuncture",
            "Wellness Spas",
            "Physiotherapy",
            "Chiropractic",
            "TCM Clinics",
          ].map((s) => (
            <span
              key={s}
              style={{
                padding: "10px 20px",
                background: "white",
                border: "1px solid #e8e5df",
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ─── CTA Section ────────────────────────────────────────────── */}
      <section
        style={{
          background: "linear-gradient(135deg, #14532d, #1e4d3a, #2d6a4f)",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "white", marginBottom: 16 }}>
            Ready to Modernize Your Clinic?
          </h2>
          <p style={{ fontSize: 17, color: "#a7f3d0", marginBottom: 32, lineHeight: 1.6 }}>
            Join clinics across the world who trust AYUR GATE to manage their practice. Start your free trial today.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 36px",
                background: "white",
                color: "#14532d",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Start Free Trial
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "14px 36px",
                background: "transparent",
                color: "white",
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 10,
                textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.3)",
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ background: "#111", color: "#9ca3af", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #14532d, #2d6a4f)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                AG
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "white", letterSpacing: "0.08em" }}>AYUR GATE</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              Modern clinic management software for Ayurveda, wellness & healthcare practices.
            </p>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Product</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="#features" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Features</a>
              <Link href="/pricing" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Pricing</Link>
              <a href="#how-it-works" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>How It Works</a>
            </div>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Company</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="mailto:ayurcentresg@gmail.com" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Contact Us</a>
              <Link href="/login" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Sign In</Link>
              <Link href="/register" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>Start Trial</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Support</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="mailto:ayurcentresg@gmail.com" style={{ fontSize: 13, color: "#9ca3af", textDecoration: "none" }}>ayurcentresg@gmail.com</a>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "40px auto 0", paddingTop: 24, borderTop: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            &copy; {new Date().getFullYear()} AYUR GATE. All rights reserved.
          </p>
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Made with care for clinics worldwide
          </p>
        </div>
      </footer>

      {/* ─── Responsive CSS ─────────────────────────────────────────── */}
      <style jsx global>{`
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        .feature-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
