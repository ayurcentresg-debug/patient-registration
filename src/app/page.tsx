import Link from "next/link";

const FEATURES = [
  {
    title: "Patient Records",
    desc: "Complete medical history, Prakriti assessment, vitals, treatment tracking, and family linkage \u2014 all digitized.",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Smart Scheduling",
    desc: "Doctor-wise time slots, walk-ins, treatment packages, and automated WhatsApp reminders that cut no-shows by 40%.",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z",
  },
  {
    title: "Digital Prescriptions",
    desc: "Ayurvedic medicine database with dosage templates. Share via WhatsApp, print, or send to pharmacy in one click.",
    iconBg: "#fefce8",
    iconColor: "#ca8a04",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  {
    title: "Inventory Management",
    desc: "Track herbs, medicines, and supplies in real time. Expiry alerts, purchase orders, and multi-branch stock transfers.",
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
    icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
  },
  {
    title: "GST-Compliant Billing",
    desc: "Auto-generated invoices with tax, payment tracking, treatment packages, credit notes, and financial reports.",
    iconBg: "#faf5ff",
    iconColor: "#9333ea",
    icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
  },
  {
    title: "WhatsApp & Email",
    desc: "Pre-built templates for appointment reminders, follow-ups, birthday wishes, and bulk campaigns.",
    iconBg: "#ecfdf5",
    iconColor: "#059669",
    icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  },
  {
    title: "Staff & Payroll",
    desc: "Manage doctors, therapists, receptionists. Leave tracking, commissions, and country-specific payroll (CPF/EPF/SOCSO).",
    iconBg: "#fdf2f8",
    iconColor: "#db2777",
    icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    title: "Reports & Analytics",
    desc: "Revenue trends, appointment analytics, staff performance, inventory reports \u2014 all exportable to CSV.",
    iconBg: "#eef2ff",
    iconColor: "#4f46e5",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  {
    title: "Multi-Branch",
    desc: "Run multiple clinic locations from one dashboard. Transfer stock, share patients, and view consolidated reports.",
    iconBg: "#fff7ed",
    iconColor: "#ea580c",
    icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Sign up your clinic",
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
    a: "Most clinics are fully operational within 30 minutes. Sign up, add your doctors and their schedules, and you're ready to book your first appointment. You can import existing patient data via CSV.",
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
  "Patient Portal",
  "Online Booking & Payments",
  "Treatment Packages",
  "Doctor Portal",
  "Patient Reviews & Feedback",
  "Role-Based Access",
  "Stock Transfers",
  "Audit Logs",
  "CSV Import/Export",
  "2FA Security",
  "Commission Tracking",
  "Leave Management",
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-3 sm:px-4 py-2 text-[13px] sm:text-[14px] font-semibold rounded-lg transition-all hover:bg-gray-100"
            style={{ color: "#14532d" }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-3 sm:px-4 py-2 text-[13px] sm:text-[14px] font-semibold text-white rounded-lg transition-all hover:opacity-90 whitespace-nowrap"
            style={{ background: "#14532d" }}
          >
            <span className="hidden sm:inline">Start Free Trial</span>
            <span className="sm:hidden">Free Trial</span>
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
              <div
                key={f.title}
                className="group p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-default"
                style={{ border: "1px solid #f0f0f0", background: "white" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.iconBg }}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={f.iconColor}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: "#111827" }}>{f.title}</h3>
                <p className="text-[14.5px] leading-relaxed" style={{ color: "#6b7280" }}>{f.desc}</p>
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
      <footer className="px-6 lg:px-16 py-12" style={{ background: "#14532d" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <span className="text-[12px] font-extrabold text-white">AG</span>
                </div>
                <span className="text-[17px] font-bold tracking-wider text-white">AYUR GATE</span>
              </div>
              <p className="text-[13px] leading-relaxed max-w-xs mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                Complete clinic management software built specifically for Ayurveda, Siddha, and wellness practices.
              </p>
              {/* Social Media Icons */}
              <div className="flex items-center gap-3">
                <a href="https://www.facebook.com/ayurgate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="Facebook">
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.instagram.com/ayurgate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="Instagram">
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="https://www.linkedin.com/company/ayurgate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://x.com/ayurgate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="X (Twitter)">
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.youtube.com/@ayurgate" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80" style={{ background: "rgba(255,255,255,0.1)" }} aria-label="YouTube">
                  <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-[13px] font-bold mb-4 text-white">Product</h4>
              <div className="space-y-2.5">
                <a href="#features" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Features</a>
                <Link href="/pricing" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Pricing</Link>
                <Link href="/register" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Free Trial</Link>
                <Link href="/login" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Sign In</Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-[13px] font-bold mb-4 text-white">Contact</h4>
              <div className="space-y-2.5">
                <a href="mailto:ayurcentresg@gmail.com" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>ayurcentresg@gmail.com</a>
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>Singapore &bull; India &bull; Malaysia</p>
                <Link href="/terms" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Terms of Service</Link>
                <Link href="/privacy" className="block text-[13px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.6)" }}>Privacy Policy</Link>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              &copy; 2026 AYUR GATE. All rights reserved.
            </p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Empowering Ayurveda clinics worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
