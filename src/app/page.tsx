import Link from "next/link";

const FEATURES = [
  {
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    title: "Patient Records",
    desc: "Complete medical history, Prakriti assessment, vitals, treatment tracking, and family linkage — all digitized.",
  },
  {
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    title: "Smart Scheduling",
    desc: "Doctor-wise time slots, walk-ins, treatment packages, and automated WhatsApp reminders that cut no-shows by 40%.",
  },
  {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    title: "Digital Prescriptions",
    desc: "Ayurvedic medicine database with dosage templates. Share via WhatsApp, print, or send to pharmacy in one click.",
  },
  {
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    title: "Inventory Management",
    desc: "Track herbs, medicines, and supplies in real time. Expiry alerts, purchase orders, and multi-branch stock transfers.",
  },
  {
    icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
    title: "GST-Compliant Billing",
    desc: "Auto-generated invoices with tax, payment tracking, treatment packages, credit notes, and financial reports.",
  },
  {
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    title: "WhatsApp & Email",
    desc: "Pre-built templates for appointment reminders, follow-ups, birthday wishes, and bulk campaigns.",
  },
  {
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    title: "Staff & Payroll",
    desc: "Manage doctors, therapists, receptionists. Leave tracking, commissions, and country-specific payroll (CPF/EPF/SOCSO).",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Reports & Analytics",
    desc: "Revenue trends, appointment analytics, staff performance, inventory reports — all exportable to CSV.",
  },
  {
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    title: "Multi-Branch",
    desc: "Run multiple clinic locations from one dashboard. Transfer stock, share patients, and view consolidated reports.",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Register your clinic",
    desc: "Sign up in 2 minutes. Add your clinic name, country, and basic details. No credit card needed.",
  },
  {
    num: "2",
    title: "Set up your practice",
    desc: "Add doctors, set consultation schedules, import patient data, and configure your billing preferences.",
  },
  {
    num: "3",
    title: "Start managing",
    desc: "Book appointments, write prescriptions, generate invoices, and communicate with patients — all from one place.",
  },
];

const TESTIMONIALS = [
  {
    quote: "We went from 2 hours of daily admin to 15 minutes. AYUR GATE handles everything — scheduling, billing, inventory. My staff loves it.",
    name: "Dr. Priya Nair",
    role: "Ayurveda Physician",
    location: "Singapore",
  },
  {
    quote: "The WhatsApp reminders alone reduced our no-shows by 35%. The Prakriti assessment forms and prescription templates save so much time.",
    name: "Dr. Rajesh Kumar",
    role: "Clinic Owner, 3 Branches",
    location: "Chennai, India",
  },
  {
    quote: "Finally a system built for Ayurveda — not a generic clinic software with features we don't need. The inventory tracking for herbs is perfect.",
    name: "Dr. Siti Aminah",
    role: "Wellness Centre Director",
    location: "Kuala Lumpur, Malaysia",
  },
];

const FAQS = [
  {
    q: "Is AYUR GATE specifically built for Ayurveda clinics?",
    a: "Yes. Unlike generic clinic software, AYUR GATE is built from the ground up for Ayurveda, Siddha, Unani, and wellness practices. It includes Prakriti assessment, Ayurvedic medicine categories, Panchakarma treatment plans, and herbal inventory management.",
  },
  {
    q: "How long does it take to set up?",
    a: "Most clinics are fully operational within 30 minutes. Register, add your doctors and their schedules, and you're ready to book your first appointment. You can import existing patient data via CSV.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Absolutely. Our Professional and Enterprise plans support multi-branch management with inter-branch stock transfers, shared patient records, and consolidated reporting.",
  },
  {
    q: "Is my patient data secure?",
    a: "Yes. We use industry-standard encryption, role-based access control, two-factor authentication, and comprehensive audit logs. Your data is backed up daily.",
  },
  {
    q: "Do you support GST billing for Singapore, India, and Malaysia?",
    a: "Yes. AYUR GATE generates GST-compliant invoices for all three countries, with the correct tax rates and formats for each jurisdiction.",
  },
  {
    q: "What happens after the free trial?",
    a: "After your 7-day trial, choose a plan that fits your clinic. Your data is preserved. If you decide not to continue, you can export all your data before your account is deactivated.",
  },
];

const MORE_FEATURES = [
  "Treatment Packages",
  "Doctor Portal",
  "Role-Based Access",
  "Stock Transfers",
  "Audit Logs",
  "CSV Import/Export",
  "2FA Security",
  "PWA / Mobile Ready",
  "Commission Tracking",
  "Leave Management",
  "Duplicate Detection",
  "Email Templates",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#fefbf6" }}>
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4" style={{ background: "rgba(254,251,246,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#14532d" }}>
            <span className="text-[13px] font-extrabold text-white">AG</span>
          </div>
          <span className="text-[18px] font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <a href="#features" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>Features</a>
          <a href="#how-it-works" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>How It Works</a>
          <Link href="/pricing" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>Pricing</Link>
          <a href="#faq" className="text-[14px] font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>FAQ</a>
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
      <section className="px-6 lg:px-16 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold mb-6" style={{ background: "#d1f2e0", color: "#14532d" }}>
            #1 Clinic Management Software for Ayurveda &amp; Wellness
          </div>
          <h1 className="text-[36px] sm:text-[48px] lg:text-[56px] font-bold leading-tight mb-6" style={{ color: "#111827" }}>
            Run your clinic,<br />
            <span style={{ color: "#14532d" }}>not spreadsheets</span>
          </h1>
          <p className="text-[17px] sm:text-[19px] max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "#6b7280" }}>
            Patients, appointments, prescriptions, inventory, billing, payroll, and communications — all in one platform designed for Ayurveda practitioners.
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
              href="/pricing"
              className="px-8 py-3.5 text-[16px] font-semibold rounded-xl transition-all hover:bg-gray-50"
              style={{ color: "#374151", border: "1.5px solid #e5e7eb" }}
            >
              View Pricing
            </Link>
          </div>
          <p className="text-[13px] mt-4" style={{ color: "#9ca3af" }}>No credit card required &bull; Full access to all features &bull; Cancel anytime</p>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="px-6 lg:px-16 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { num: "500+", label: "Clinics Onboarded" },
              { num: "50,000+", label: "Patients Managed" },
              { num: "3", label: "Countries Served" },
              { num: "99.9%", label: "Uptime" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-xl" style={{ background: "white", border: "1px solid #f3f4f6" }}>
                <div className="text-[24px] sm:text-[28px] font-bold" style={{ color: "#14532d" }}>{s.num}</div>
                <div className="text-[12px] sm:text-[13px] font-medium" style={{ color: "#6b7280" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="px-6 lg:px-16 py-16" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-6xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4 mx-auto block text-center" style={{ background: "#d1f2e0", color: "#14532d" }}>
            FEATURES
          </div>
          <h2 className="text-[28px] sm:text-[36px] font-bold text-center mb-3" style={{ color: "#111827" }}>
            Everything your Ayurveda clinic needs
          </h2>
          <p className="text-[16px] text-center mb-12 max-w-2xl mx-auto" style={{ color: "#6b7280" }}>
            Purpose-built for Ayurveda, Siddha, Unani, Naturopathy, and wellness practices. No generic templates — every feature solves a real clinic problem.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-xl transition-all hover:shadow-md" style={{ border: "1.5px solid #f3f4f6", background: "#fefefe" }}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4" style={{ background: "#d1f2e0" }}>
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

      {/* ─── More Features Chips ─── */}
      <section className="px-6 lg:px-16 py-12" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto">
          <h3 className="text-[20px] font-bold text-center mb-6" style={{ color: "#111827" }}>And much more...</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {MORE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: "#fefbf6", border: "1px solid #e5e7eb" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[13px] font-medium" style={{ color: "#374151" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="px-6 lg:px-16 py-16" style={{ background: "#fefbf6", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4" style={{ background: "#d1f2e0", color: "#14532d" }}>
              HOW IT WORKS
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-bold mb-3" style={{ color: "#111827" }}>
              Up and running in 30 minutes
            </h2>
            <p className="text-[16px]" style={{ color: "#6b7280" }}>
              No complicated setup. No IT team needed. Just sign up and start managing your clinic.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-[20px] font-bold text-white" style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)" }}>
                  {s.num}
                </div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: "#111827" }}>{s.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "#6b7280" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Problem → Solution ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[28px] sm:text-[36px] font-bold mb-3" style={{ color: "#111827" }}>
              Sound familiar?
            </h2>
            <p className="text-[16px]" style={{ color: "#6b7280" }}>
              Every clinic faces these challenges. AYUR GATE solves them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                problem: "Patients don't show up for appointments",
                solution: "Automated WhatsApp reminders reduce no-shows by up to 40%",
              },
              {
                problem: "Hours wasted on billing and paperwork every day",
                solution: "Auto-generated invoices and digital records save 10+ hours per week",
              },
              {
                problem: "Running out of herbs and medicines unexpectedly",
                solution: "Real-time stock alerts notify you before you run low",
              },
              {
                problem: "Patient records scattered across files and registers",
                solution: "Instant digital access to any patient's full history",
              },
              {
                problem: "No follow-up with patients after treatment",
                solution: "Automated follow-up messages keep patients engaged",
              },
              {
                problem: "Managing staff schedules, payroll, and leave is chaotic",
                solution: "Built-in staff management with country-specific payroll",
              },
            ].map((item) => (
              <div key={item.problem} className="flex gap-4 p-5 rounded-xl" style={{ border: "1px solid #f3f4f6", background: "#fefefe" }}>
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#fef2f2" }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-[14px] font-medium mb-1.5" style={{ color: "#6b7280" }}>{item.problem}</p>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="#16a34a" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-[14px] font-semibold" style={{ color: "#14532d" }}>{item.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "#fefbf6", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4" style={{ background: "#d1f2e0", color: "#14532d" }}>
              TESTIMONIALS
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-bold mb-3" style={{ color: "#111827" }}>
              Trusted by practitioners across Asia
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-xl" style={{ background: "white", border: "1px solid #e5e7eb" }}>
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="w-4 h-4" fill="#f59e0b" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[14px] leading-relaxed mb-5" style={{ color: "#374151" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-[14px] font-bold" style={{ color: "#111827" }}>{t.name}</p>
                  <p className="text-[12px]" style={{ color: "#6b7280" }}>{t.role}</p>
                  <p className="text-[12px]" style={{ color: "#9ca3af" }}>{t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Countries ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-[28px] sm:text-[36px] font-bold mb-3" style={{ color: "#111827" }}>
            Built for clinics in Asia
          </h2>
          <p className="text-[16px] mb-10" style={{ color: "#6b7280" }}>
            Country-specific features for Singapore, India, and Malaysia.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                flag: "🇸🇬",
                country: "Singapore",
                features: ["GST (9%) invoicing", "CPF payroll calculations", "MOM-compliant leave", "SGD billing"],
              },
              {
                flag: "🇮🇳",
                country: "India",
                features: ["GST (5/12/18%) invoicing", "EPF & ESI calculations", "TDS deductions", "INR billing"],
              },
              {
                flag: "🇲🇾",
                country: "Malaysia",
                features: ["SST invoicing", "EPF & SOCSO payroll", "PCB tax tables", "MYR billing"],
              },
            ].map((c) => (
              <div key={c.country} className="p-6 rounded-xl text-left" style={{ border: "1.5px solid #f3f4f6", background: "#fefefe" }}>
                <div className="text-[32px] mb-3">{c.flag}</div>
                <h3 className="text-[17px] font-bold mb-3" style={{ color: "#111827" }}>{c.country}</h3>
                <ul className="space-y-2">
                  {c.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: "#374151" }}>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="#2d6a4f" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Teaser ─── */}
      <section className="px-6 lg:px-16 py-16" style={{ background: "#fefbf6", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4" style={{ background: "#d1f2e0", color: "#14532d" }}>
            PRICING
          </div>
          <h2 className="text-[28px] sm:text-[36px] font-bold mb-3" style={{ color: "#111827" }}>
            Plans that grow with your practice
          </h2>
          <p className="text-[16px] mb-8" style={{ color: "#6b7280" }}>
            Start free, upgrade as you grow. All plans include every feature.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {[
              { name: "Starter", price: "₹3,999", period: "/month", desc: "Up to 10 staff, 500 patients" },
              { name: "Professional", price: "₹7,999", period: "/month", desc: "Unlimited patients, multi-branch", popular: true },
              { name: "Enterprise", price: "Custom", period: "", desc: "Unlimited everything, SLA, white-label" },
            ].map((p) => (
              <div key={p.name} className="p-6 rounded-xl relative" style={{ background: "white", border: p.popular ? "2px solid #2d6a4f" : "1px solid #e5e7eb" }}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: "#2d6a4f" }}>
                    Most Popular
                  </div>
                )}
                <h3 className="text-[16px] font-bold mb-1" style={{ color: "#111827" }}>{p.name}</h3>
                <div className="mb-2">
                  <span className="text-[28px] font-bold" style={{ color: "#14532d" }}>{p.price}</span>
                  {p.period && <span className="text-[14px]" style={{ color: "#6b7280" }}>{p.period}</span>}
                </div>
                <p className="text-[13px]" style={{ color: "#6b7280" }}>{p.desc}</p>
              </div>
            ))}
          </div>

          <Link
            href="/pricing"
            className="inline-block px-6 py-3 text-[14px] font-semibold rounded-xl transition-all hover:opacity-90"
            style={{ color: "#14532d", border: "1.5px solid #14532d" }}
          >
            Compare All Plans
          </Link>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="px-6 lg:px-16 py-16" style={{ background: "white", borderTop: "1px solid #f3f4f6" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold mb-4" style={{ background: "#d1f2e0", color: "#14532d" }}>
              FAQ
            </div>
            <h2 className="text-[28px] sm:text-[36px] font-bold" style={{ color: "#111827" }}>
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "#fefefe" }}>
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                  <span className="text-[15px] font-semibold pr-4" style={{ color: "#111827" }}>{faq.q}</span>
                  <svg className="w-5 h-5 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="#6b7280" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-[14px] leading-relaxed" style={{ color: "#6b7280" }}>{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="px-6 lg:px-16 py-16">
        <div className="max-w-3xl mx-auto text-center p-10 sm:p-14 rounded-2xl" style={{ background: "linear-gradient(135deg, #14532d 0%, #2d6a4f 50%, #40916c 100%)" }}>
          <h2 className="text-[28px] sm:text-[36px] font-bold text-white mb-3">Ready to modernise your clinic?</h2>
          <p className="text-[16px] text-white/80 mb-8 max-w-lg mx-auto">
            Join hundreds of Ayurveda clinics in Singapore, India, and Malaysia already using AYUR GATE to save time and grow their practice.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-block px-8 py-3.5 text-[16px] font-bold rounded-xl transition-all hover:opacity-90"
              style={{ background: "white", color: "#14532d" }}
            >
              Start 7-Day Free Trial
            </Link>
            <a
              href="mailto:ayurcentresg@gmail.com?subject=AYUR GATE Demo Request"
              className="inline-block px-8 py-3.5 text-[16px] font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ color: "white", border: "1.5px solid rgba(255,255,255,0.4)" }}
            >
              Request a Demo
            </a>
          </div>
          <p className="text-[13px] text-white/50 mt-4">7-day free trial &bull; No credit card required &bull; Cancel anytime</p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 lg:px-16 py-10" style={{ borderTop: "1px solid #e5e7eb" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "#14532d" }}>
                  <span className="text-[11px] font-extrabold text-white">AG</span>
                </div>
                <span className="text-[16px] font-bold tracking-wider" style={{ color: "#14532d" }}>AYUR GATE</span>
              </div>
              <p className="text-[13px] leading-relaxed max-w-xs" style={{ color: "#6b7280" }}>
                Complete clinic management software built specifically for Ayurveda, Siddha, and wellness practices.
              </p>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-[13px] font-bold mb-3" style={{ color: "#111827" }}>Product</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-[13px] hover:underline" style={{ color: "#6b7280" }}>Features</a>
                <Link href="/pricing" className="block text-[13px] hover:underline" style={{ color: "#6b7280" }}>Pricing</Link>
                <Link href="/register" className="block text-[13px] hover:underline" style={{ color: "#6b7280" }}>Free Trial</Link>
                <Link href="/login" className="block text-[13px] hover:underline" style={{ color: "#6b7280" }}>Sign In</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[13px] font-bold mb-3" style={{ color: "#111827" }}>Contact</h4>
              <div className="space-y-2">
                <p className="text-[13px]" style={{ color: "#6b7280" }}>ayurcentresg@gmail.com</p>
                <p className="text-[13px]" style={{ color: "#6b7280" }}>Singapore &bull; India &bull; Malaysia</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid #f3f4f6" }}>
            <p className="text-[12px]" style={{ color: "#9ca3af" }}>
              &copy; 2026 AYUR GATE. All rights reserved.
            </p>
            <p className="text-[12px]" style={{ color: "#9ca3af" }}>
              Built for Ayurveda clinics worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
