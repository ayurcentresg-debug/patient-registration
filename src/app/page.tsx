import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* ─── Nav ─── */}
      <nav className="flex items-center justify-between px-6 lg:px-16 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
            <span className="text-[13px] font-extrabold text-white">AG</span>
          </div>
          <span className="text-[18px] font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-[14px] font-semibold rounded-lg transition-all hover:bg-gray-100"
            style={{ color: "#14532d" }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-[14px] font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: "#14532d" }}
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="px-6 lg:px-16 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold mb-6" style={{ background: "#d1f2e0", color: "#14532d" }}>
            Built for Ayurveda &amp; Wellness Clinics
          </div>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold leading-tight mb-6" style={{ color: "#111827" }}>
            Run your clinic,<br />
            <span style={{ color: "#14532d" }}>not spreadsheets</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "#6b7280" }}>
            Patients, appointments, prescriptions, inventory, billing, and communications — all in one platform designed for Ayurveda practitioners.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 text-[16px] font-bold text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)", boxShadow: "0 4px 14px rgba(20,83,45,0.25)" }}
            >
              Start 7-Day Free Trial
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 text-[16px] font-semibold rounded-xl transition-all hover:bg-gray-50"
              style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
            >
              Sign In
            </Link>
          </div>
          <p className="text-[13px] mt-4" style={{ color: "#9ca3af" }}>No credit card required. Full access to all features.</p>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[28px] sm:text-[32px] font-bold text-center mb-3" style={{ color: "#111827" }}>
            Everything your clinic needs
          </h2>
          <p className="text-[16px] text-center mb-12" style={{ color: "#6b7280" }}>
            Purpose-built for Ayurveda, Siddha, Unani, Naturopathy, and wellness practices.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Patient Records", desc: "Complete medical history, vitals, Prakriti assessment, and treatment tracking." },
              { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Appointment Scheduling", desc: "Doctor slots, walk-ins, calendar views, automated reminders, and treatment packages." },
              { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", title: "Digital Prescriptions", desc: "Ayurvedic medicine database, dosage templates, and pharmacy-ready prescriptions." },
              { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "Inventory Management", desc: "Stock tracking, expiry alerts, purchase orders, suppliers, and barcode scanning." },
              { icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z", title: "GST-Compliant Billing", desc: "Invoices with tax, payment tracking, treatment package billing, and financial reports." },
              { icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", title: "WhatsApp & SMS", desc: "Appointment reminders, follow-up messages, bulk communications, and templates." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-xl" style={{ border: "1.5px solid #f3f4f6", background: "#fefefe" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "#d1f2e0" }}>
                  <svg className="w-5 h-5" fill="none" stroke="#14532d" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: "#111827" }}>{f.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "#6b7280" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── More Features ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "#fefbf6" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[28px] font-bold text-center mb-12" style={{ color: "#111827" }}>And much more...</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              "Multi-Branch Support",
              "Staff Management",
              "Treatment Packages",
              "Role-Based Access",
              "Doctor Portal",
              "Stock Transfers",
              "Audit Logs",
              "Reports & Analytics",
              "Duplicate Detection",
              "CSV Export",
              "2FA Security",
              "PWA / Mobile Ready",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "white", border: "1px solid #f3f4f6" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[13px] font-medium" style={{ color: "#374151" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 lg:px-16 py-16">
        <div className="max-w-3xl mx-auto text-center p-10 rounded-2xl" style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}>
          <h2 className="text-[28px] sm:text-[32px] font-bold text-white mb-3">Ready to modernise your clinic?</h2>
          <p className="text-[16px] text-white/80 mb-8">
            Join clinics in Singapore, India, and Malaysia already using AYUR GATE.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-3.5 text-[16px] font-bold rounded-xl transition-all hover:opacity-90"
            style={{ background: "white", color: "#14532d" }}
          >
            Start Free Trial
          </Link>
          <p className="text-[13px] text-white/50 mt-4">7-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 lg:px-16 py-8" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "#14532d" }}>
              <span className="text-[10px] font-extrabold text-white">AG</span>
            </div>
            <span className="text-[14px] font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
          </div>
          <p className="text-[13px]" style={{ color: "#9ca3af" }}>
            &copy; 2025 AYUR GATE. Built for Ayurveda clinics worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
}
