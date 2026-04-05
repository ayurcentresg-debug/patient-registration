"use client";

import { useState } from "react";

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--grey-300)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
};

const faqs = [
  {
    q: "How do I add a new patient?",
    a: "Go to Patients > Register New Patient from the sidebar. Fill in the required details and click Save.",
  },
  {
    q: "How do I book an appointment?",
    a: "Navigate to Appointments from the sidebar. Click 'New Appointment', select the patient, doctor, date and time slot.",
  },
  {
    q: "How do I manage inventory?",
    a: "Go to Inventory from the sidebar. You can add items, track stock levels, set reorder alerts, and manage suppliers.",
  },
  {
    q: "How do I generate a bill?",
    a: "From the Billing page, click 'New Bill', select the patient, add services/products, apply any discounts, and generate the invoice.",
  },
  {
    q: "How do I manage staff?",
    a: "Go to Admin > Staff tab. You can add doctors, therapists, receptionists, set schedules, and manage permissions.",
  },
  {
    q: "How do I change my password?",
    a: "Go to My Account from the sidebar bottom, switch to the Security tab, and click Change Password.",
  },
  {
    q: "How do I set up clinic working hours?",
    a: "Go to Admin > Clinic Settings. Under Preferences, set your working hours start/end and select working days.",
  },
  {
    q: "How do I upgrade my plan?",
    a: "Go to Subscription from the sidebar. Click 'Upgrade Plan' to view available plans and pricing.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useState(() => { setMounted(true); });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--grey-900)", margin: 0 }}>Help & Support</h1>
        <p style={{ fontSize: 14, color: "var(--grey-600)", marginTop: 4 }}>Get help with using the platform</p>
      </div>

      {/* Contact Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#d1f2e0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="#14532d" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-900)", margin: "0 0 4px" }}>Email Support</h3>
          <p style={{ fontSize: 13, color: "var(--grey-600)", margin: "0 0 8px" }}>Get help via email. We typically respond within 24 hours.</p>
          <a href="mailto:ayurcentresg@gmail.com" style={{ fontSize: 14, fontWeight: 600, color: "#14532d", textDecoration: "none" }}>
            ayurcentresg@gmail.com
          </a>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="#1e40af" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-900)", margin: "0 0 4px" }}>WhatsApp</h3>
          <p style={{ fontSize: 13, color: "var(--grey-600)", margin: "0 0 8px" }}>Chat with us on WhatsApp for quick support.</p>
          <a href="https://wa.me/6591234567" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "#1e40af", textDecoration: "none" }}>
            Message us
          </a>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="#92400e" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--grey-900)", margin: "0 0 4px" }}>Documentation</h3>
          <p style={{ fontSize: 13, color: "var(--grey-600)", margin: "0 0 8px" }}>Browse guides and tutorials for all features.</p>
          <a href="https://www.ayurgate.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "#92400e", textDecoration: "none" }}>
            Visit docs
          </a>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--grey-200)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--grey-900)", margin: 0 }}>Frequently Asked Questions</h2>
        </div>
        {faqs.map((faq, idx) => (
          <div key={idx} style={{ borderBottom: idx < faqs.length - 1 ? "1px solid var(--grey-100)" : "none" }}>
            <button
              onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              style={{
                width: "100%",
                padding: "14px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--grey-900)" }}>{faq.q}</span>
              <svg
                style={{
                  width: 18, height: 18, flexShrink: 0,
                  transform: openFaq === idx ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
                fill="none" stroke="var(--grey-500)" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFaq === idx && (
              <div style={{ padding: "0 24px 14px", fontSize: 14, color: "var(--grey-600)", lineHeight: 1.6 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ ...cardStyle, padding: "20px 24px", marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--grey-900)", marginBottom: 12 }}>Quick Links</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Admin Settings", href: "/admin" },
            { label: "Clinic Settings", href: "/admin/settings" },
            { label: "Staff Management", href: "/admin/staff" },
            { label: "Security Settings", href: "/security" },
            { label: "My Account", href: "/account" },
            { label: "Subscription", href: "/subscription" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 6,
                fontSize: 14, color: "#14532d", fontWeight: 600,
                textDecoration: "none", background: "var(--grey-50)",
              }}
            >
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
