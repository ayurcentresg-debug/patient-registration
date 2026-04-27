"use client";

/**
 * /help — Customer-facing feature guide.
 *
 * Comprehensive walk-through of every module + key features in plain
 * customer-friendly language. Sticky table of contents on the left,
 * searchable, organized by module. Source-of-truth: docs/FEATURES.md.
 */

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

interface Feature { title: string; description: string; howTo?: string; }
interface Module { id: string; icon: string; title: string; tagline: string; features: Feature[]; }

const MODULES: Module[] = [
  {
    id: "patients", icon: "🏥", title: "Patients",
    tagline: "Register, search, and manage everyone who walks through your door.",
    features: [
      { title: "Quick patient registration", description: "Add a new patient in under a minute. Only 10 fields required — name, phone, gender, DOB. Everything else is optional and editable later.", howTo: "Sidebar → Patients → 'Register New Patient'" },
      { title: "Auto-generated patient IDs", description: "PT-0001, PT-0002 — sequential numbering per clinic. No manual ID-keeping." },
      { title: "Search & filters", description: "Live search by name, phone, NRIC, patient ID. Filter by gender / status. Sortable columns." },
      { title: "Photo, blood group, allergies", description: "Capture profile picture, emergency contact, medical history, surgical history." },
      { title: "Document attachments", description: "Upload X-rays, lab reports, prescriptions, ID copies — keep everything in one place per patient." },
      { title: "Family linking (auto-bidirectional)", description: "Add Ravi as Arjun's parent — Arjun automatically sees Ravi as his parent. Works for spouse, child, sibling, grandparent, uncle/aunt, cousin." },
      { title: "Family balance widget", description: "See outstanding invoices across all linked family members from any one member's profile." },
      { title: "Patient sharing", description: "Share a patient with another staff member when handing off care. Audit trail of who viewed what." },
      { title: "Cross-branch single record", description: "One patient record across all your clinic branches. Never duplicate a registration." },
      { title: "Branches Visited badges", description: "Patient profile shows top 4 branches they've visited with visit count and a ⭐ on the most recent." },
      { title: "Patient transfer history page", description: "/patients/[id]/branches — chronological timeline of every visit, grouped by branch." },
      { title: "CSV export", description: "Export filtered patient list to CSV for analysis or marketing." },
    ],
  },
  {
    id: "appointments", icon: "📅", title: "Appointments & Calendar",
    tagline: "Schedule, reschedule, check-in — all from one slick calendar.",
    features: [
      { title: "Day / Week / 5-Day / Month views", description: "Switch view modes from the toolbar. Day view fits to screen with no scrolling for last 2 hours." },
      { title: "Drag-and-drop reschedule", description: "Pick up any appointment card and drop it on a new time slot. Snap-to-15-min, automatic conflict detection blocks double-bookings.", howTo: "Click and hold an appointment → drag to new slot" },
      { title: "Side-by-side overlap layout", description: "When 2-3 appointments share a time slot, they sit side-by-side instead of stacking. The 12px gap between them is clickable for adding a 3rd." },
      { title: "Red current-time indicator", description: "Live thin red line shows the current time on today's column. Updates every minute." },
      { title: "Hover info panel", description: "Hover any appointment for instant patient name, phone, treatment, status, price, and branch — no need to click." },
      { title: "Right-click context menu", description: "8 actions: Open Details / Duplicate / Mark Confirmed / In-Progress / Completed / Copy Phone / Send WhatsApp / Mark No-Show / Cancel / Transfer to Branch." },
      { title: "Quick check-in button (✓)", description: "Hover any card → click ✓ → patient is checked in. Replaces the old 4-click flow.", howTo: "Hover an appointment → click ✓" },
      { title: "WhatsApp reminder button (📱)", description: "1-click WhatsApp send with pre-filled appointment time, doctor, and branch." },
      { title: "Copy / paste / duplicate appointment", description: "Right-click → 'Duplicate Here…' → click any empty slot to clone the appointment to a new time." },
      { title: "Recurring appointments", description: "Book weekly / bi-weekly / monthly, up to 52 occurrences in one click." },
      { title: "Walk-in booking", description: "Capture name + phone only. Register the patient properly later." },
      { title: "Walk-in package restriction", description: "First-time walk-ins must complete a single session before they can buy a package — automatic business rule." },
      { title: "More menu", description: "Show Cancelled toggle / 24-Hour mode / Print Schedule / Resync / Add Doctor — all in one popover." },
      { title: "Top stat cards", description: "Today's Appointments / In Progress / Confirmed / This Week — at-a-glance KPIs." },
      { title: "Today's Schedule sidebar", description: "Right panel: chronological list with quick-action buttons (Check-in / Start / Done / Move) per row, plus status counters grid." },
      { title: "No-Show follow-up section", description: "Auto-shown when no-shows exist. Each row has View / WhatsApp / Reschedule actions." },
      { title: "Per-branch calendar filter", description: "BranchSelector → calendar refilters to that branch's appointments only." },
      { title: "Inter-branch transfer", description: "Right-click appointment → Transfer to Branch → pick destination → instant move." },
      { title: "Waitlist", description: "Add patients to waitlist with priority levels. Auto-notify when slot opens." },
    ],
  },
  {
    id: "doctors", icon: "👨‍⚕️", title: "Doctors / Therapists / Staff",
    tagline: "Manage your clinical team and front-desk staff.",
    features: [
      { title: "6 staff roles", description: "Doctor / Therapist / Pharmacist / Receptionist / Admin / Staff — each with role-specific permissions." },
      { title: "Staff IDs by role", description: "Auto-prefixed (D10001 doctor, T10001 therapist, P10001 pharmacist, etc.)." },
      { title: "Singapore HR fields", description: "NRIC/FIN, residency status, ethnicity, PR start date — all for CPF/KET compliance." },
      { title: "Per-doctor consultation fee", description: "Set price per session per doctor — auto-fills on booking." },
      { title: "Weekly schedule", description: "Per-day shift slots (e.g. Mon 09:00-13:00 + 14:00-18:00). Drives appointment booking availability." },
      { title: "Per-branch schedule overrides", description: "Doctor 'Mon-Wed at Main, Thu-Fri at Branch B' — set custom hours per branch.", howTo: "/admin/staff → edit doctor → 'Per-Branch Schedule Override'" },
      { title: "Email invite flow", description: "Send invite token → staff sets own password on first login." },
      { title: "Two-factor authentication (2FA)", description: "TOTP via Google Authenticator / Authy with QR code setup." },
      { title: "Staff leave tracking", description: "Annual / sick / maternity / paternity with approval workflow." },
      { title: "Staff documents", description: "Upload work permits, ID copies, contracts. Auto-flag expiring docs." },
      { title: "Branch assignment", description: "Assign primary branch (or leave blank = floats across all branches)." },
      { title: "Branch-restricted users", description: "Lock a receptionist to Branch B — they can ONLY see Branch B data, even if they switch branch." },
      { title: "Doctor Portal (separate UI)", description: "Doctors log in → see only their own schedule, prescriptions, clinical notes — no admin sidebar clutter." },
      { title: "Commission tracking", description: "Per-treatment / per-package commission rules. Auto-calc on invoice payment. Monthly payout reports." },
    ],
  },
  {
    id: "inventory", icon: "💊", title: "Inventory & Pharmacy",
    tagline: "Stock, expiry, suppliers, transfers — all in one place.",
    features: [
      { title: "Ayurveda-specific categories", description: "Thailam, Choornam, Leham, Ghritam — built-in sub-categories for traditional Ayurveda medicine." },
      { title: "Item variants", description: "100ml / 200ml of the same oil with separate stock counts and prices." },
      { title: "Batch + expiry tracking", description: "Multiple batches per item, each with its own expiry date." },
      { title: "Low-stock alerts dashboard", description: "Real-time list of items below reorder level. Plan purchases before you run out." },
      { title: "Expiry alerts", description: "3-month / 1-month / expired tiers — never let inventory go to waste." },
      { title: "Fast-moving / slow-moving analysis", description: "See your top sellers and dead stock. Reorder smart." },
      { title: "Expiry-aware purchase suggestions", description: "System won't suggest reordering items you already have months of stock for." },
      { title: "Auto write-off of expired stock", description: "1-click bulk write-off with full audit trail." },
      { title: "Per-branch stock", description: "Each branch has its own counts. No more wondering which location has the oil." },
      { title: "Branch-to-branch stock transfers", description: "Move stock from Main to Branch B. Templates for recurring transfers (e.g. 'Weekly restock')." },
      { title: "Indent / requisition workflow", description: "Branch B requests stock from Main → Main approves → transfer auto-recorded." },
      { title: "Suppliers directory", description: "Track suppliers with contact, GST, payment terms. Per-supplier purchase history." },
      { title: "Purchase orders", description: "Create multi-item POs. Track status (draft → sent → received → closed). Auto-update stock on receipt. Print as PDF." },
      { title: "Stock audit", description: "Full physical inventory count workflow with variance reporting." },
      { title: "Bulk CSV import", description: "Initial stock load or supplier catalog upload." },
      { title: "Reports", description: "Stock value per branch, top sellers, slow movers, expiry timeline (30/60/90 days), per-category breakdown." },
    ],
  },
  {
    id: "treatments", icon: "🌿", title: "Treatments & Packages",
    tagline: "Multi-session Ayurveda packages, not just single visits.",
    features: [
      { title: "Treatment master list", description: "Abhyangam, Shirodhara, Panchakarma, etc. with categories (panchakarma / massage / detox / specialty / consultation / therapy)." },
      { title: "Multi-session packages", description: "10-Session Abhyangam Package, 7-day Panchakarma — auto-calc total + per-session price + discount." },
      { title: "Patient package purchases", description: "Auto-numbered (PKG-YYYYMM-XXXX), sessions remaining counter, expiry date." },
      { title: "Auto session deduction", description: "Mark appointment completed → session deducts from patient's package." },
      { title: "Per-session date + appointment link", description: "Full audit of when each session was used and at which appointment." },
      { title: "Package sharing across family", description: "Mom buys 10 sessions, son uses some — per-share allocation tracked." },
      { title: "Package refunds", description: "Refund unused sessions at the per-session rate." },
      { title: "Cross-branch package usage", description: "Buy at Branch A, redeem sessions at Branch B — same PatientPackage record." },
      { title: "Per-branch session report", description: "See which branch consumed Patient X's package most." },
      { title: "Treatment plans", description: "Doctor creates multi-stage plan: Week 1: Abhyangam x3, Week 2: Shirodhara x5. Milestones with progress." },
    ],
  },
  {
    id: "billing", icon: "💰", title: "Billing & Invoicing",
    tagline: "Invoice, take payment, GST — fast and clean.",
    features: [
      { title: "1-click invoice from appointment", description: "When status=completed, generate invoice in one click with treatment + price pre-filled." },
      { title: "Manual invoices", description: "Combine treatments, medicines, packages on one invoice." },
      { title: "Auto-numbered (INV-YYYYMM-XXXX)", description: "Sequential numbering per clinic." },
      { title: "Per-clinic GST configuration", description: "Rate + registration number stored per clinic. CGST + SGST + IGST split for interstate vs intrastate." },
      { title: "Discount support", description: "% or flat amount per invoice or per line item with reason field." },
      { title: "6 payment methods", description: "Cash / Card / UPI / Bank Transfer / Insurance / Mixed. Multi-payment per invoice (split payment)." },
      { title: "Auto-update invoice status", description: "Pending → partially_paid → paid as payments come in." },
      { title: "Credit notes", description: "Issue against invoice (full or partial). Auto-decrement collected revenue." },
      { title: "Outstanding receivables aging", description: "Buckets: Current / 30 days / 60 days / 90+ days." },
      { title: "Family-level outstanding", description: "Sum across all linked family members." },
      { title: "Receipts show branch name + address", description: "Invoice header reads 'Clinic Name — Branch Name' so the patient sees which branch issued it." },
      { title: "Email / WhatsApp invoice", description: "1-click send to patient." },
      { title: "Branded PDF", description: "Clinic logo, address, GST number on every invoice." },
      { title: "Insurance claims", description: "Submit claim with provider + policy. Track Submitted → Approved → Settled. Per-provider analytics." },
    ],
  },
  {
    id: "communications", icon: "📞", title: "Communications",
    tagline: "WhatsApp, Email, SMS — talk to patients on their channel.",
    features: [
      { title: "WhatsApp Business API", description: "Meta WhatsApp Cloud API integration — proper business messaging, not personal." },
      { title: "Auto reminders", description: "24h + 1h before appointment via WhatsApp/email/SMS in the patient's preferred channel." },
      { title: "Reminders mention branch", description: "'Reminder of your appointment at Branch B' — reduces patient confusion in multi-branch clinics." },
      { title: "Pre-built templates", description: "Confirmation / reminder / no-show follow-up / invoice / custom." },
      { title: "Conversation history per patient", description: "Full WhatsApp thread visible from patient profile." },
      { title: "Bulk send", description: "Filter patient list → bulk WhatsApp / email / SMS for marketing or announcements." },
      { title: "Multi-language templates", description: "English + Tamil / Hindi / Malayalam — variables auto-fill." },
      { title: "Cron-based reminder dispatch", description: "Daily background job auto-fires next-24h appointment reminders." },
    ],
  },
  {
    id: "reports", icon: "📊", title: "Reports & Analytics",
    tagline: "Know your clinic — revenue, doctors, no-shows, branches, all of it.",
    features: [
      { title: "Overview dashboard", description: "8 KPI cards + sparkline trend: Total Revenue / Billed / Outstanding / New Patients / Total Appointments / Completion Rate / No-Show Rate / Collection Efficiency." },
      { title: "Revenue reports", description: "By date range, payment method, treatment category. GST summary (CGST / SGST / IGST breakdown)." },
      { title: "Per-doctor performance", description: "Total appointments, completion rate, no-show rate, revenue, unique patients per doctor." },
      { title: "Top patients by spend", description: "Identify VIP patients for loyalty programs." },
      { title: "Top treatments by revenue", description: "Find your cash cows. Track package conversion rate." },
      { title: "Insurance pipeline", description: "Submitted → Approved → Settled tracking. Approval rate per provider." },
      { title: "Outstanding aging", description: "Per-patient overdue invoices grouped by Current / 30d / 60d / 90+d." },
      { title: "Peak hours heatmap", description: "Day-of-week × hour-of-day grid showing when your clinic is busiest." },
      { title: "Branch comparison report", description: "Side-by-side per-branch: completion %, no-show %, revenue, outstanding, top doctor.", howTo: "/reports → Branches tab" },
      { title: "Per-branch CSV export", description: "Filenames include branch slug so you can keep multiple downloads sorted." },
      { title: "Print-quality PDF", description: "Brand-able, ready for stakeholder packets." },
    ],
  },
  {
    id: "multi-branch", icon: "🏢", title: "Multi-Branch Operations",
    tagline: "Run multiple clinic locations like one — without the chaos.",
    features: [
      { title: "Unlimited branches per clinic", description: "Per-branch name, address, code, phone, email, operating hours, holidays." },
      { title: "Branch selector everywhere", description: "Always-visible chip in desktop sidebar (collapsed icon → expanded full chip on hover) and mobile slide-out drawer. Selection persists per browser." },
      { title: "One patient record across branches", description: "No duplicate registrations when patient visits another branch." },
      { title: "Per-branch appointment calendar", description: "BranchSelector filters /appointments to that branch's bookings." },
      { title: "Per-branch doctor list", description: "Doctors at that branch + floating staff (no primary branch)." },
      { title: "Per-branch dashboard", description: "Switch branch → KPIs, revenue, appointments rescope instantly." },
      { title: "Per-branch operating hours", description: "Per-day open/close times per branch (some open Sundays, some not)." },
      { title: "Per-branch holidays", description: "Branch B closed for Diwali, Main Branch open. Recurring annual or one-off." },
      { title: "Per-branch doctor schedules", description: "Doctor 'Mon-Wed at Main, Thu-Fri at Branch B' — different weekly hours per branch." },
      { title: "Branch-restricted users", description: "Receptionist at Branch B can ONLY see Branch B data — even if they switch the BranchSelector." },
      { title: "Inter-branch appointment transfer", description: "Patient calls Main, gets rescheduled to Branch B. Right-click → Transfer to Branch." },
      { title: "Cross-branch package usage", description: "Buy 10-session package at Main, use 5 there + 5 at Branch B → all from same package." },
      { title: "Per-branch revenue & receivables", description: "Invoice tagged with branch. Accurate per-location P&L." },
      { title: "Branch-to-branch stock transfers", description: "Move inventory between branches with recurring templates." },
      { title: "Receipts show branch name + address", description: "Invoices clearly identify which branch issued them." },
      { title: "WhatsApp reminders mention branch", description: "Reduces patient confusion." },
    ],
  },
  {
    id: "rbac", icon: "🛡️", title: "Permissions & Access Control",
    tagline: "Granular control over what each staff role can see and do.",
    features: [
      { title: "3-tier permission stack", description: "Code defaults → clinic-level role overrides → per-user overrides. Maximum flexibility." },
      { title: "21 modules controlled", description: "Dashboard, Patients, Appointments, Doctors, Inventory, Billing, Insurance, Reports, etc." },
      { title: "5 access levels", description: "Full / Write / View / Own / None per module per role." },
      { title: "7 default roles", description: "Owner / Admin / Manager / Doctor / Therapist / Receptionist / Pharmacist." },
      { title: "6 built-in templates", description: "1-click apply to a role or user. Plus save your own custom templates." },
      { title: "Permission audit trail", description: "Who changed what, when, with before/after diff. /admin/permissions/history." },
      { title: "15-second cache", description: "Permission checks happen on every API request without slowing the UI." },
      { title: "Branch-restricted roles", description: "Lock a user to ONLY their primary branch's data." },
    ],
  },
  {
    id: "patient-portal", icon: "👤", title: "Patient Self-Service Portal",
    tagline: "Patients log in to see their own data — reduces front-desk load.",
    features: [
      { title: "Secure patient login", description: "Patients log in with email + password to view their own records." },
      { title: "View own appointments", description: "Past + upcoming visits with doctor + status." },
      { title: "Download prescriptions", description: "PDF download of any past prescription." },
      { title: "Download invoices", description: "PDF download of paid + pending invoices." },
      { title: "Self-book new appointments", description: "Pick doctor + time slot, no clinic intervention needed." },
      { title: "Cross-branch visit history", description: "Single timeline showing all branches visited." },
      { title: "Public booking page per clinic", description: "/book/{clinic-slug} — patients book without an account. Embeddable in clinic's website." },
    ],
  },
  {
    id: "payroll", icon: "🧾", title: "Singapore Payroll (SG only)",
    tagline: "MOM-compliant CPF, SDL, FWL, KET out of the box.",
    features: [
      { title: "CPF auto-calculation", description: "4 age tiers × OW vs AW × Citizen / PR / FW. Account split (OA / SA / MA)." },
      { title: "PR graduated rates", description: "1st / 2nd / 3rd year reduced rates auto-applied." },
      { title: "SDL (Skills Development Levy)", description: "Auto-calc per employee." },
      { title: "FWL (Foreign Worker Levy)", description: "By sector + skill level." },
      { title: "SHG funds by ethnicity", description: "Chinese (CDAC) / Malay (Mendaki) / Indian (SINDA) / Eurasian." },
      { title: "Workman Act detection", description: "$4,500 cap vs $2,600 non-workman flag." },
      { title: "Overtime calculation", description: "1.5× / 2× / 3× rates per MOM." },
      { title: "KET letter generator", description: "MOM-compliant Key Employment Terms PDF — ready to send." },
      { title: "Monthly payroll run", description: "Per-employee payslip + aggregate report." },
      { title: "Bank file export (GIRO/FAST)", description: "For salary disbursement." },
      { title: "IR8A annual prep", description: "Year-end income tax compliance." },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string>(MODULES[0].id);

  const filteredModules = useMemo(() => {
    if (!search.trim()) return MODULES;
    const q = search.toLowerCase();
    return MODULES.map(m => ({
      ...m,
      features: m.features.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q)
      ),
    })).filter(m => m.features.length > 0);
  }, [search]);

  useEffect(() => {
    function handleScroll() {
      const sections = MODULES.map(m => document.getElementById(`mod-${m.id}`)).filter(Boolean);
      const scrollPos = window.scrollY + 120;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i] as HTMLElement;
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(MODULES[i].id);
          break;
        }
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const totalFeatures = MODULES.reduce((sum, m) => sum + m.features.length, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Compact hero — minimal vertical space */}
      <div className="px-4 md:px-6 py-4 md:py-5" style={{ background: "linear-gradient(135deg, #14532d, #2d6a4f)", color: "#fff" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] md:text-[24px] font-bold tracking-tight leading-tight">📚 AyurGate User Guide</h1>
            <p className="text-[12px] md:text-[13px] mt-0.5 opacity-85">
              {totalFeatures}+ features · {MODULES.length} modules · search or browse
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features…"
            className="w-full md:w-[320px] px-3 py-2 text-[14px] rounded-md flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.95)", color: "#1a1c1b", border: "none" }}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 md:px-5 py-4 flex gap-5">
        {/* Sticky TOC — slimmer */}
        <aside className="hidden lg:block w-[180px] flex-shrink-0">
          <div className="sticky top-3 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 px-2" style={{ color: "var(--grey-500)" }}>Modules</p>
            {MODULES.map(m => {
              const visible = filteredModules.find(fm => fm.id === m.id);
              return (
                <a
                  key={m.id}
                  href={`#mod-${m.id}`}
                  onClick={(e) => { e.preventDefault(); document.getElementById(`mod-${m.id}`)?.scrollIntoView({ behavior: "smooth" }); setActiveId(m.id); }}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[12px] font-semibold transition-colors hover:bg-gray-100"
                  style={{
                    background: activeId === m.id ? "#dcfce7" : "transparent",
                    color: activeId === m.id ? "#166534" : (visible ? "var(--grey-700)" : "var(--grey-400)"),
                    opacity: visible ? 1 : 0.4,
                  }}
                >
                  <span className="text-[13px]">{m.icon}</span>
                  <span className="truncate">{m.title}</span>
                </a>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {filteredModules.length === 0 && (
            <div className="p-6 rounded-md text-center" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
              <p className="text-[14px] mb-1.5" style={{ color: "var(--grey-700)" }}>No features match &quot;{search}&quot;</p>
              <button onClick={() => setSearch("")} className="text-[13px] font-semibold" style={{ color: "var(--blue-500)" }}>Clear search</button>
            </div>
          )}

          {filteredModules.map(m => (
            <section key={m.id} id={`mod-${m.id}`} className="mb-4 p-4 md:p-5 rounded-md" style={{ background: "var(--white)", border: "1px solid var(--grey-200)", boxShadow: "var(--shadow-sm)", scrollMarginTop: 12 }}>
              <div className="flex items-start justify-between gap-3 mb-3 pb-3" style={{ borderBottom: "1px solid var(--grey-200)" }}>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] md:text-[19px] font-bold flex items-center gap-2 leading-tight" style={{ color: "var(--grey-900)" }}>
                    <span>{m.icon}</span> {m.title}
                  </h2>
                  <p className="text-[12px] md:text-[13px] mt-0.5" style={{ color: "var(--grey-500)" }}>{m.tagline}</p>
                </div>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "#f0faf4", color: "#166534" }}>
                  {m.features.length}
                </span>
              </div>

              {/* 2-column feature grid on desktop — denser layout = less scrolling */}
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
                {m.features.map((f, i) => (
                  <li key={i} className="pl-2.5" style={{ borderLeft: "2px solid #d1f2e0" }}>
                    <div className="font-bold text-[12.5px] mb-0.5 leading-tight" style={{ color: "var(--grey-900)" }}>
                      {f.title}
                    </div>
                    <p className="text-[12px] leading-snug" style={{ color: "var(--grey-700)" }}>
                      {f.description}
                    </p>
                    {f.howTo && (
                      <p className="text-[11px] mt-0.5 italic" style={{ color: "var(--grey-500)" }}>
                        💡 {f.howTo}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="mt-4 p-3 rounded-md text-center" style={{ background: "var(--white)", border: "1px solid var(--grey-200)" }}>
            <p className="text-[12px]" style={{ color: "var(--grey-600)" }}>
              Need help? Email <a href="mailto:info@ayurgate.com" className="font-bold" style={{ color: "var(--blue-500)" }}>info@ayurgate.com</a> · {totalFeatures}+ features · {MODULES.length} modules · <Link href="/dashboard" style={{ color: "var(--blue-500)" }}>Back to Dashboard</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
