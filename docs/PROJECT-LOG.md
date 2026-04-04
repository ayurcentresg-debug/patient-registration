# AYUR GATE — Project Development Log

> Auto-maintained project documentation. Every feature request, suggestion, and implementation is tracked here.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Project** | AYUR GATE — Multi-Tenant B2B Clinic Management SaaS |
| **Stack** | Next.js 16, React 19, Tailwind CSS 4, Prisma 7.5, SQLite |
| **Hosting** | Railway (production), GitHub (source) |
| **Domain** | www.ayurgate.com |
| **Target Market** | Ayurveda & wellness clinics in Singapore, India, Malaysia |
| **Started** | April 2026 |

---

## Session Log

---

### Session 1 — 2 Apr 2026

#### 1. Gmail App Password & SMTP Setup
- **Requested by:** User
- **What:** Configure Gmail SMTP for sending marketing and transactional emails
- **Implementation:**
  - Enabled 2-Step Verification on ayurgate@gmail.com
  - Generated App Password for SMTP authentication
  - Added SMTP config to `.env` (MARKETING_SMTP_HOST, MARKETING_SMTP_USER, MARKETING_SMTP_PASS, etc.)
- **Files:** `.env`
- **Status:** ✅ Complete

#### 2. B2B Marketing Email (Super Admin Console)
- **Requested by:** User — "I want to send marketing emails from Super Admin"
- **What:** Build marketing email feature in Super Admin Console for B2B outreach
- **Implementation:**
  - Created Super Admin marketing page with Send Email tab (recipient, template dropdown, subject, sender toggle, preview)
  - Added Leads tab (add/import/bulk email leads)
  - Hardcoded 6 B2B email templates (Cold Outreach, Free Trial, Pain Points, Case Study, Pricing, Webinar)
  - Created send API using `sendMarketingEmail()` with Gmail SMTP
  - Leads stored in JSON file for super admin context (outside tenant DB)
- **Files:**
  - `src/app/super-admin/marketing/page.tsx` (NEW)
  - `src/app/api/super-admin/marketing/templates/route.ts`
  - `src/app/api/super-admin/marketing/send/route.ts` (NEW)
  - `src/app/api/super-admin/leads/route.ts` (NEW)
  - `src/app/api/templates/seed/route.ts` (updated with 6 B2B templates)
- **Status:** ✅ Complete
- **Notes:** Emails landing in Promotions tab due to no SPF/DKIM/DMARC on domain. Google Workspace setup deferred.

#### 3. Tenant Bulk Send — Use Clinic's Own Email
- **Requested by:** User — "it should not be here" (referring to marketing in tenant app)
- **What:** Fix tenant bulk send to use clinic's own email, not the ayurgate marketing email
- **Implementation:**
  - Updated "Send From" in `/communications/bulk` to dynamically fetch clinic's email from `/api/settings`
  - Added Marketing and Newsletter categories to template page
  - Added HTML upload for newsletter templates
- **Files:**
  - `src/app/communications/bulk/page.tsx`
  - `src/app/communications/templates/page.tsx`
- **Status:** ✅ Complete

#### 4. Staff Performance Dashboard
- **Requested by:** User — selected "Staff Management improvements"
- **What:** Build performance analytics for clinic staff
- **Implementation:**
  - Performance dashboard with summary cards, sortable ranking table, expandable detail rows
  - Individual staff performance page with monthly trends, day-of-week distribution, peak hours
  - Revenue attribution per staff member
- **Files:**
  - `src/app/admin/staff/performance/page.tsx` (NEW)
  - `src/app/admin/staff/[id]/performance/page.tsx` (NEW)
- **Status:** ✅ Complete

#### 5. Staff Leave Management
- **Requested by:** User — part of Staff Management suite
- **What:** Leave tracking with calendar view and appointment blocking
- **Implementation:**
  - StaffLeave model (type: leave/block/holiday, supports full-day and time-specific)
  - Calendar view + list view for leave management
  - Appointment reassignment prompt after creating leave
  - Slot generation blocks leave periods
- **Files:**
  - `prisma/schema.prisma` (StaffLeave model)
  - `src/app/admin/staff/[id]/leave/page.tsx` (NEW)
- **Status:** ✅ Complete

#### 6. Commission & Incentive Tracking
- **Requested by:** User — "ok" (agreed to commission tracking)
- **What:** Track commissions for doctors and therapists
- **Implementation:**
  - CommissionRule model with cascading priority (user-specific > role-specific > default)
  - CommissionPayout model for tracking payouts
  - Three-tab page: Payouts, Rules, History
  - Revenue-based commission calculations
- **Files:**
  - `prisma/schema.prisma` (CommissionRule, CommissionPayout models)
  - `src/app/admin/commission/page.tsx` (NEW)
- **Status:** ✅ Complete

#### 7. Staff Documents Management
- **Requested by:** User — part of Staff Management suite
- **What:** Upload and track staff certifications, licenses, documents
- **Implementation:**
  - StaffDocument model with categories, expiry tracking, verification
  - Document upload page with category filters
  - Expiry alerts for upcoming/expired documents
  - Verification toggle for admin
- **Files:**
  - `prisma/schema.prisma` (StaffDocument model)
  - `src/app/admin/staff/[id]/documents/page.tsx` (NEW)
- **Status:** ✅ Complete

#### 8. Country-Specific Payroll System
- **Requested by:** User — "this one should be based on the countries also like in singapore based on CPF"
- **What:** Full payroll system with country-specific statutory calculations
- **Implementation:**
  - **Singapore:** CPF (age-based rates), SDL (0.25%), SHG Fund
  - **India:** EPF (12%/12%), ESI (0.75%/3.25%), Professional Tax, TDS (new regime slabs)
  - **Malaysia:** EPF (11%/12-13%), SOCSO, EIS, PCB (monthly tax tables)
  - SalaryConfig and Payroll models
  - Three-tab payroll page (Payroll, Salary Setup, Reports)
  - Payroll workflow: draft → confirmed → paid
  - Payslip viewer and CSV export
- **Files:**
  - `prisma/schema.prisma` (SalaryConfig, Payroll models)
  - `src/lib/payroll-rules.ts` (NEW — country-specific calculations)
  - `src/app/admin/payroll/page.tsx` (NEW)
- **Status:** ✅ Complete

#### 9. Bulk Staff Import (CSV)
- **Requested by:** User — part of Staff Management suite
- **What:** Import multiple staff members via CSV upload
- **Implementation:**
  - CSV file upload with drag-and-drop
  - Client-side CSV parsing and preview
  - Validation before import
  - Bulk create via API
- **Files:**
  - `src/app/admin/staff/page.tsx` (updated with import button)
- **Status:** ✅ Complete

#### 10. Appointment Reassignment on Leave
- **Requested by:** User — part of Staff Management suite
- **What:** When staff goes on leave, auto-detect affected appointments and offer reassignment
- **Implementation:**
  - Find affected appointments API
  - Find available replacement doctors API
  - Auto-assign priority: same specialization > same role > any available
  - Standalone reassignment page
  - Bulk reassignment API
- **Files:**
  - `src/app/admin/staff/reassign/page.tsx` (NEW)
  - `src/app/api/appointments/reassign/route.ts` (NEW)
  - `src/app/api/appointments/affected/route.ts` (NEW)
  - `src/app/api/doctors/available/route.ts` (NEW)
- **Status:** ✅ Complete

#### 11. Cross-Module Staff Integration
- **Requested by:** Claude suggestion — "integrate staff data across modules"
- **What:** Wire staff data into dashboard, appointments, reports, and doctor portal
- **Implementation:**
  - Dashboard: "Staff Today" bar (available/on-leave count, top performer)
  - Appointments: Leave warning banner when booking
  - Doctor Portal: My Performance and My Leave sections
  - Reports: Staff Performance tab with CSV export
  - AdminTabs: Added Commission and Payroll tabs
- **Files:**
  - `src/app/dashboard/page.tsx`
  - `src/app/appointments/new/page.tsx`
  - `src/app/doctor/page.tsx`
  - `src/app/reports/page.tsx`
  - `src/components/AdminTabs.tsx`
- **Status:** ✅ Complete

---

### Session 2 — 4 Apr 2026

#### 12. Landing Page — Complete Rebuild
- **Requested by:** User — selected option "2" (Landing Page)
- **What:** Rebuild marketing website at www.ayurgate.com with professional B2B SaaS sections
- **Implementation:**
  - Sticky nav with anchor links (Features, How It Works, Pricing, FAQ)
  - Stats bar: 500+ clinics, 50K+ patients, 3 countries, 99.9% uptime
  - 9 feature cards (added Staff & Payroll, Reports & Analytics, Multi-Branch)
  - "How It Works" 3-step onboarding flow
  - Problem → Solution section (6 clinic pain points)
  - Testimonials from Singapore, India, Malaysia
  - Country-specific section (SG: CPF/GST, IN: EPF/TDS, MY: SOCSO/PCB)
  - Pricing teaser with "Compare All Plans" link
  - FAQ accordion with 6 questions
  - Dual CTA: Free Trial + Request a Demo
  - Professional footer with product links & contact
- **Files:**
  - `src/app/page.tsx` (554 lines rewritten)
- **Commit:** `239f4c7`
- **Status:** ✅ Deployed

#### 13. Daily Activity Report System
- **Requested by:** User — "Daily activity report to gmail"
- **What:** Automated daily report email aggregating all clinic activity
- **Implementation:**
  - API endpoint `/api/daily-report` that queries all active clinics
  - Aggregates: appointments, revenue (today + MTD), new patients, no-shows, inventory alerts, per-clinic breakdown
  - Branded HTML email with summary cards, alerts table, clinic breakdown
  - Super Admin page `/super-admin/daily-report` to view config and trigger manually
  - Added "Daily Report" to Super Admin sidebar navigation
  - Middleware updated to allow public access for cron triggers
  - Protected by `CRON_SECRET` parameter
- **Files:**
  - `src/app/api/daily-report/route.ts` (NEW)
  - `src/app/super-admin/daily-report/page.tsx` (NEW)
  - `src/app/super-admin/page.tsx` (updated sidebar)
  - `src/middleware.ts` (added /api/daily-report to public paths)
- **Commit:** `0b28aa9`
- **Status:** ✅ Deployed

#### 14. Gmail App Password Renewal
- **Requested by:** User — old password expired
- **What:** Generate new Gmail App Password and update everywhere
- **Implementation:**
  - Old password `ttixngiianiunmsa` was rejected by Google
  - New password generated: `vjnylfqrnesmlhzl`
  - Updated local `.env` (both SMTP_PASS and MARKETING_SMTP_PASS)
  - Updated Railway env vars via Raw Editor (6 changes applied)
  - Also added DAILY_REPORT_EMAIL and CRON_SECRET to Railway
  - Tested: daily report email sent successfully to ayurcentresg@gmail.com
- **Files:** `.env`, Railway Variables (26 total)
- **Status:** ✅ Complete

#### 15. Dev Activity Report Email
- **Requested by:** User — "last 2 days ur sending every day activity in detail to my email"
- **What:** Send development activity summary email at end of each session
- **Implementation:**
  - Custom HTML email sent via SMTP to ayurcentresg@gmail.com
  - Includes: features built, files changed, commits, pending items
  - AYUR GATE branded green theme
  - Saved as persistent memory instruction for future sessions
- **Files:**
  - `memory/feedback_daily_dev_report.md` (NEW)
  - `memory/MEMORY.md` (updated)
- **Status:** ✅ Complete (recurring)

#### 16. Railway Environment Variables Update
- **Requested by:** User — "can u do" (update Railway vars)
- **What:** Update all Railway production env vars with new app password and new variables
- **Implementation:**
  - Navigated to Railway dashboard via browser automation
  - Updated SMTP_USER, SMTP_PASS, EMAIL_FROM (were placeholder values)
  - Updated MARKETING_SMTP_PASS (new app password)
  - Added DAILY_REPORT_EMAIL=ayurcentresg@gmail.com
  - Added CRON_SECRET=ayurgate-daily-2026
  - Deployed (6 changes, 26 total variables)
- **Status:** ✅ Deployed

#### 17. Online Patient Booking Page
- **Requested by:** User — agreed to "Online Patient Booking" as next feature
- **What:** Public-facing booking page where patients can book appointments without logging in
- **Implementation:**
  - **URL:** `/book/[clinic-slug]` — works for any clinic via their unique slug
  - **4-Step Wizard:**
    1. Choose Doctor — lists active doctors with specialization & consultation fee, optional treatment filter
    2. Select Date & Time — calendar picker, real-time slot availability (checks leaves, existing bookings, past times)
    3. Your Details — name, phone, email (optional), reason for visit
    4. Review & Confirm — full summary, one-click booking
  - **Auto Patient Creation:** If phone not found, creates new patient with source "online-booking"
  - **Confirmation Email:** Branded HTML email sent to patient with appointment details
  - **Conflict Detection:** Double-booking prevention, staff leave blocking
  - **Success Page:** Green checkmark with full appointment details and "Book Another" option
  - **APIs:**
    - `GET /api/public/clinic/[slug]` — clinic info, doctors, treatments
    - `GET /api/public/slots` — available time slots
    - `POST /api/public/book` — create appointment
- **Files:**
  - `src/app/book/[slug]/page.tsx` (NEW — 620 lines)
  - `src/app/api/public/clinic/[slug]/route.ts` (NEW)
  - `src/app/api/public/slots/route.ts` (NEW)
  - `src/app/api/public/book/route.ts` (NEW)
  - `src/middleware.ts` (added /book to public paths)
- **Commit:** `c6c8085`
- **Status:** ✅ Deployed

#### 18. Project Documentation System
- **Requested by:** User — "I want to document each and every work we are doing"
- **What:** Comprehensive project log tracking all requests, implementations, and status
- **Implementation:**
  - Created `docs/PROJECT-LOG.md` with full session-by-session documentation
  - Every feature includes: who requested, what was built, implementation details, files changed, commit hash, status
  - Will be updated at the end of each session
- **Files:**
  - `docs/PROJECT-LOG.md` (NEW — this file)
- **Status:** ✅ Complete (ongoing)

---

## Pending / Upcoming

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | Google Workspace Setup | Medium | SPF/DKIM/DMARC on GoDaddy for email deliverability |
| 2 | Mobile Responsiveness | Medium | UI fixes for phones/tablets across all pages |
| 3 | Patient Portal | Low | Patients login to view records, appointments, prescriptions |
| 4 | Online Payments | Low | Stripe integration for booking-time payment |
| 5 | WhatsApp API Integration | Low | Beyond templates — actual WhatsApp Business API |
| 6 | Daily Report Cron | Medium | Set up external cron to auto-trigger daily report |

---

## Architecture Summary

```
www.ayurgate.com (Railway)
├── / .......................... Landing page (marketing)
├── /pricing ................... Pricing plans
├── /register .................. Clinic registration (7-day trial)
├── /login ..................... Tenant login
├── /book/[slug] ............... Public patient booking (NEW)
├── /dashboard ................. Admin dashboard
├── /appointments .............. Appointment management
├── /patients .................. Patient records
├── /prescriptions ............. Digital prescriptions
├── /inventory ................. Stock management
├── /billing ................... Invoices & payments
├── /communications ............ WhatsApp/Email/SMS
├── /admin/staff ............... Staff management
├── /admin/commission .......... Commission tracking
├── /admin/payroll ............. Country-specific payroll
├── /reports ................... Analytics & exports
├── /doctor .................... Doctor portal
├── /super-admin ............... Platform admin console
│   ├── /clinics ............... Manage clinics
│   ├── /marketing ............. B2B email campaigns
│   └── /daily-report .......... Activity report config
└── /api ....................... REST APIs
    ├── /api/public ............ Public endpoints (no auth)
    ├── /api/super-admin ....... Platform admin APIs
    └── /api/* ................. Tenant-scoped APIs
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Database | SQLite (better-sqlite3 adapter) |
| ORM | Prisma 7.5 with `$extends` for multi-tenancy |
| Auth | JWT (jose), 2FA (TOTP) |
| Email | Resend (primary) + Gmail SMTP (fallback/marketing) |
| Payments | Stripe |
| Messaging | Twilio (WhatsApp) |
| Hosting | Railway (with persistent volume for DB) |
| Source | GitHub (ayurcentresg-debug/ayurgate) |

---

*Last updated: 4 April 2026*
