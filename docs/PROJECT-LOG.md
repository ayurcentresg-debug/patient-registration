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

### Session 3 — 4 Apr 2026 (continued)

#### 19. MOM-Compliant Payslips (Singapore)
- **Requested by:** User — "Check Requirements and items to be included"
- **What:** Audited payslips against MOM Employment Act requirements (12 mandatory items)
- **Implementation:**
  - Added salary period start/end dates (e.g., "1 Apr 2026 – 30 Apr 2026")
  - Added Allowances row (always shown, even if S$0)
  - Added Additional Pay row (Bonus/PH/Rest)
  - Added Overtime row (always shown)
  - All 12 MOM-required fields now present across all 4 payslip templates
- **Files:**
  - `src/app/api/public/sample-payslip/route.ts`
  - `src/app/api/admin/payroll/[id]/payslip/route.ts`
  - `src/app/api/admin/payroll/[id]/email-payslip/route.ts`
  - `src/app/api/admin/payroll/bulk-email/route.ts`
- **Status:** ✅ Complete

#### 20. CPF 2026 Contribution Rates
- **Requested by:** User — linked CPF.gov.sg announcements page
- **What:** Updated CPF rates to 2026 values
- **Implementation:**
  - OW ceiling raised from S$6,800 to S$8,000
  - Updated 5 age tiers: ≤55, 55–60, 60–65, 65–70, >70
  - New rates: 55–60 (17%/15%), 60–65 (11.5%/11.5%), 65–70 (9%/7.5%), >70 (7.5%/5%)
  - Updated Salary Setup UI auto-fill in 2 places (country change + age change handlers)
  - Made CPF rate inputs read-only with helper text
- **Files:**
  - `src/lib/payroll-rules.ts` (OW_CEILING, CPF_RATES)
  - `src/app/admin/payroll/page.tsx` (Salary Setup UI)
- **Status:** ✅ Complete

#### 21. SHG Fund by Ethnicity
- **Requested by:** User — linked CPF SHG contribution page
- **What:** Replaced flat S$2 SHG with ethnicity-based fund calculation (CDAC/SINDA/MBMF/ECF)
- **Implementation:**
  - 4 funds: CDAC (Chinese), MBMF (Malay/Muslim), SINDA (Indian), ECF (Eurasian)
  - Each fund has salary-tiered contribution amounts from CPF.gov.sg
  - Added `calculateSHG()` function to payroll engine
  - Added `ethnicity` field to User model (Prisma schema)
  - Ethnicity dropdown in Staff management (with fund name labels)
  - CSV import/export supports ethnicity column
  - Payroll generation passes ethnicity to statutory calculation
- **Files:**
  - `src/lib/payroll-rules.ts` (SHG_RATES, calculateSHG)
  - `prisma/schema.prisma` (ethnicity field on User)
  - `src/app/admin/staff/page.tsx` (ethnicity dropdown)
  - `src/app/api/staff/route.ts`, `src/app/api/staff/[id]/route.ts`
  - `src/app/api/staff/import/route.ts`, `src/app/api/staff/import/template/route.ts`
  - `src/app/api/admin/payroll/generate/route.ts`
- **Status:** ✅ Complete

#### 22. Light Professional Payslip Design
- **Requested by:** User — applied to all templates
- **What:** Replaced dark gradient design with light, professional theme
- **Implementation:**
  - White header, soft green (#f0fdf4) earnings, soft orange (#fff7ed) deductions
  - 720px width, #f9fafb gray backgrounds, clean borders
  - Consistent design across sample, real, individual email, and bulk email payslips
  - Removed Designation field from all templates
  - Removed period text from below PAYSLIP header
- **Files:**
  - All 4 payslip route files (sample, real, email, bulk-email)
- **Status:** ✅ Complete

#### 23. Receptionist & Staff Admin Access
- **Requested by:** User — "we need to workout in the roles: admin, receptionist, staff"
- **What:** Expanded admin panel access to receptionist and staff roles
- **Implementation:**
  - Changed `ADMIN_ROLES` from `["admin"]` to `["admin", "receptionist", "staff"]`
  - Affects all 24+ API routes using `requireRole(ADMIN_ROLES)`
- **Files:**
  - `src/lib/get-clinic-id.ts`
- **Status:** ✅ Complete

#### 24. Sample Payslip Button
- **Requested by:** User — "at least the sample one"
- **What:** Added Sample Payslip button to payroll admin page
- **Implementation:**
  - Button in action bar opens `/api/public/sample-payslip` in new tab
  - Also shown in empty state when no payroll records exist
- **Files:**
  - `src/app/admin/payroll/page.tsx`
- **Status:** ✅ Complete

#### 25. Booking Page Layout Fix
- **Requested by:** User — booking page not loading
- **What:** Fixed `/book/[slug]` being wrapped in auth-protected layout
- **Implementation:**
  - Added `isBookingPage` check to LayoutShell public paths
  - Booking page now renders without sidebar/auth like login/register
- **Files:**
  - `src/components/LayoutShell.tsx`
- **Status:** ✅ Complete

### Session 4 — 5 Apr 2026

#### 26. Staff HR Fields (DOB, Residency, Joining/Resignation)
- **Requested by:** User — need DOB, residency status, PR start date, date of joining, resignation details
- **What:** Added 7 new HR fields to User model and staff management UI
- **Implementation:**
  - Schema: `dateOfBirth`, `residencyStatus`, `prStartDate`, `dateOfJoining`, `lastWorkingDate`, `resignationDate`, `resignationReason`
  - Staff form: DOB + residency row, conditional PR date, department for all roles, separation details
  - CSV import/export updated with new columns
- **Files:**
  - `prisma/schema.prisma`, `src/app/admin/staff/page.tsx`, `src/app/api/staff/route.ts`, `src/app/api/staff/[id]/route.ts`, `src/app/api/staff/import/route.ts`, `src/app/api/staff/template/route.ts`
- **Status:** ✅ Complete

#### 27. Residency-Based CPF for Singapore Payroll
- **Requested by:** User — Singaporean full CPF, PR graduated rates, Foreigner zero CPF
- **What:** Three-path CPF calculation based on residency status
- **Implementation:**
  - Singaporean: full CPF rates (employee 20%, employer 17% for ≤55)
  - PR: graduated rates — 1st yr (5%/4%), 2nd yr (15%/9%), 3rd yr+ (same as Singaporean)
  - Foreigner: zero CPF, zero SHG, only SDL
  - Auto-calculates PR year from prStartDate
- **Files:**
  - `src/lib/payroll-rules.ts`, `src/app/api/admin/payroll/generate/route.ts`
- **Status:** ✅ Complete

#### 28. Expanded Departments for All Roles
- **Requested by:** User — department should be available for all staff, not just clinical
- **What:** Added Admin, Operations, Front Desk, Pharmacy, Accounts, General departments
- **Files:**
  - `src/app/admin/staff/page.tsx`
- **Status:** ✅ Complete

#### 29. Post-Onboarding Setup Checklist
- **Requested by:** User — guide new tenants after registration
- **What:** Auto-detected 7-step checklist on dashboard with progress bar
- **Implementation:**
  - Steps: Add Staff, Setup Salary, Add Treatments, Online Booking, Run Payroll, Register Patient, Book Appointment
  - Auto-detects completion via parallel DB count queries
  - Dismissable, auto-hides when all complete
- **Files:**
  - `src/app/api/dashboard/setup-checklist/route.ts` (new), `src/app/dashboard/page.tsx`
- **Status:** ✅ Complete

#### 30. MOM Payslip — Mode of Payment, OT Hours, OT Payment Period
- **Requested by:** User — compared against official MOM template PDF
- **What:** Added 3 missing MOM-required items to all payslip templates
- **Implementation:**
  - Schema: `overtimeHours Float`, `paymentMode String` on Payroll model
  - Admin UI: OT Hours input, Payment Mode dropdown (Bank/Cash/Cheque)
  - All 4 payslip templates updated with Mode of Payment, OT Hours in earnings row, OT Payment Period
- **Files:**
  - `prisma/schema.prisma`, `src/app/admin/payroll/page.tsx`, `src/app/api/admin/payroll/[id]/route.ts`
  - `src/app/api/admin/payroll/[id]/payslip/route.ts`, `src/app/api/admin/payroll/[id]/email-payslip/route.ts`
  - `src/app/api/admin/payroll/bulk-email/route.ts`, `src/app/api/public/sample-payslip/route.ts`
- **Status:** ✅ Complete

#### 31. MOM Key Employment Terms (KET) Module
- **Requested by:** User — separate module for MOM-mandated KET document
- **What:** Full KET generation system matching official MOM template (Annex B)
- **Implementation:**
  - New `KeyEmploymentTerms` model with all 5 MOM sections (A-E)
  - User model: added `nricFin`, `jobTitle`, `mainDuties`, `employmentType` fields
  - KET admin page (`/admin/ket`) with list view + full-page 5-section form
  - Auto-prefill from staff profile + salary config via `/api/admin/ket/prefill`
  - HTML template matching MOM KET layout with print/PDF support
  - Supports both full-time and part-time employment (pro-rated leave in hours)
  - Draft → Issued → Superseded status workflow
  - KET tab added to AdminTabs navigation
- **Files:**
  - `prisma/schema.prisma` (KET model + User fields)
  - `src/app/admin/ket/page.tsx` (new)
  - `src/app/api/admin/ket/route.ts` (new — GET/POST)
  - `src/app/api/admin/ket/[id]/route.ts` (new — GET/PUT/DELETE)
  - `src/app/api/admin/ket/[id]/html/route.ts` (new — MOM template HTML)
  - `src/app/api/admin/ket/prefill/route.ts` (new — auto-fill from staff data)
  - `src/components/AdminTabs.tsx`, `src/app/admin/staff/page.tsx`, staff APIs
- **Status:** ✅ Complete

#### 32. KET Golden Yellow Theme
- **Requested by:** User — red (#c0392b) is "very bright", prefers golden yellow
- **What:** Changed KET section headers, buttons, and HTML template from red to dark goldenrod (#a16207)
- **Files:**
  - `src/app/admin/ket/page.tsx`, `src/app/api/admin/ket/[id]/html/route.ts`
- **Status:** ✅ Complete

---

### Session 5 — 6 Apr 2026

#### 33. MOM Salary Calculation Engine
- **Requested by:** User — implement MOM Employment Act salary computation rules
- **What:** Complete MOM-compliant salary calculation library with hourly/daily/OT rate formulas
- **Implementation:**
  - `momHourlyBasicRate`: (12 × monthly) / (52 × 44)
  - `momDailyBasicRate`: (12 × monthly) / (52 × working days per week)
  - `momDailyGrossRate`: same formula with gross salary (for PH/leave pay)
  - `momOvertimeRate`: 1.5× hourly basic (capped at $2,600 for non-workmen)
  - `calculateOTPay`: auto-calculates OT pay from hours with Part IV coverage check
  - `momIncompleteMonthSalary`: calendar-day pro-ration for mid-month join/leave
  - `getMOMSalaryBreakdown`: full breakdown for payslip display
  - Part IV coverage check: $2,600 non-workman / $4,500 workman thresholds
  - Constants: MAX_OT_HOURS (72/month), MAX_DAILY_HOURS (12), NORMAL_WEEKLY (44)
- **Files:**
  - `src/lib/payroll-rules.ts` (250+ lines added)
- **Status:** ✅ Complete

#### 34. MOM Part-Time Employment Pro-Ration
- **Requested by:** User — implement part-time leave/PH entitlement rules
- **What:** Pro-ration functions for part-time employees per MOM Employment of Part-Time Employees Regulations
- **Implementation:**
  - `partTimeProRationFactor`: PT weekly hours / FT weekly hours (default 44)
  - `partTimeAnnualLeave`: pro-rated with MOM half-day rounding
  - `partTimeSickLeave`: outpatient + hospitalisation pro-rated
  - `partTimePublicHolidays`: 11 PH × pro-ration factor, rounded to 0.5
  - `ftAnnualLeaveEntitlement`: 7 days 1st year, +1/year up to 14
  - `ftSickLeaveEntitlement`: graduated by months of service (5→8→11→14 outpatient)
  - MOM rounding: <0.25 → ignore, ≥0.25 → round up to 0.5
- **Files:**
  - `src/lib/payroll-rules.ts`
- **Status:** ✅ Complete

#### 35. Staff Work Hours & Workman Classification
- **Requested by:** User — need fields for MOM salary calculation
- **What:** Added 3 new fields to User model for MOM compliance
- **Implementation:**
  - `isWorkman` (Boolean): MOM workman flag — higher Part IV threshold ($4,500 vs $2,600)
  - `weeklyContractedHours` (Float, default 44): for part-time detection (<35 hrs)
  - `workingDaysPerWeek` (Float, default 5.5): for daily rate calculation
  - Staff form: weekly hours input, working days input, workman checkbox
  - Auto-detects part-time when <35 hrs/week
  - All staff APIs (GET/POST/PUT) updated
- **Files:**
  - `prisma/schema.prisma`, `src/app/admin/staff/page.tsx`
  - `src/app/api/staff/route.ts`, `src/app/api/staff/[id]/route.ts`
- **Status:** ✅ Complete

#### 36. Auto OT Calculation in Payroll
- **Requested by:** User — auto-calculate OT pay from OT hours
- **What:** Payroll generation and editing auto-calculates OT pay using MOM formula
- **Implementation:**
  - Payroll generate: when OT hours exist, auto-calculates OT pay using `calculateOTPay()`
  - Payroll edit PUT: when OT hours change (SG), recalculates OT amount server-side
  - OT warning if >72 hours/month (red indicator in payroll table)
  - Part IV coverage check: warns if salary exceeds threshold
  - MOM salary breakdown stored in `statutoryBreakdown` JSON for payslip reference
  - Payslip displays: Hourly Basic Rate, OT Rate (1.5x), Daily Basic/Gross Rates
- **Files:**
  - `src/app/api/admin/payroll/generate/route.ts`
  - `src/app/api/admin/payroll/[id]/route.ts`
  - `src/app/api/admin/payroll/[id]/payslip/route.ts`
  - `src/app/admin/payroll/page.tsx`
- **Status:** ✅ Complete

#### 37. Global Search — Patients + Staff
- **Requested by:** User — top bar search not working, make it global
- **What:** Search bar now queries both patients and staff APIs in parallel
- **Implementation:**
  - Parallel fetch to `/api/patients` and `/api/staff` with debounce
  - Results tagged with `_type: "patient"` or `"staff"` for routing
  - Type badges (green = Patient, blue = Staff) with role and ID numbers
  - Updated all 3 dropdowns (desktop, mobile, sidebar expanded)
  - Placeholder: "Search patients, staff..."
  - Click navigates to correct page (`/patients/[id]` or `/admin/staff`)
- **Files:** `src/components/Sidebar.tsx`
- **Status:** ✅ Complete

#### 38. Enhanced Notification Bell
- **Requested by:** User — notifications bell not useful
- **What:** Added today's upcoming appointments as a notification category
- **Implementation:**
  - Fetches `/api/appointments/today` alongside existing alert sources
  - Filters to show only future (not yet passed) appointments
  - Shows patient name, time, doctor, status
  - "+X more appointments" overflow indicator
  - Included in total notification badge count
- **Files:** `src/components/Sidebar.tsx`
- **Status:** ✅ Complete

#### 39. My Account / Profile Page
- **Requested by:** User — need account management for tenants
- **What:** Full account management page at `/account`
- **Implementation:**
  - Profile tab: avatar with initials, name/email/phone editing, role badge
  - Account info: active status, last login, member since, 2FA status
  - Security tab: change password (current → new → confirm)
  - 2FA status card with link to `/security`
  - Session info card
  - Sidebar bottom: "My Account" link
- **Files:** `src/app/account/page.tsx`, `src/components/Sidebar.tsx`, `src/app/api/users/[id]/route.ts`
- **Status:** ✅ Complete

#### 40. Subscription & Billing Page
- **Requested by:** User — need subscription visibility for tenants
- **What:** Subscription status and plan management at `/subscription`
- **Implementation:**
  - Current plan card with gradient header, plan name, price, status badge
  - Trial countdown with days remaining and upgrade CTA
  - Usage stats: staff limit, patient limit
  - Plan features checklist
  - Compare Plans / Upgrade link to `/pricing`
  - Billing support contact
  - Sidebar bottom: "Subscription" link
- **Files:** `src/app/subscription/page.tsx`, `src/components/Sidebar.tsx`
- **Status:** ✅ Complete

#### 41. Help & Support Page
- **Requested by:** User — need help/FAQ section for tenants
- **What:** Help center with FAQ and contact info at `/help`
- **Implementation:**
  - 3 contact cards: Email, WhatsApp, Documentation
  - FAQ accordion with 8 common questions
  - Quick links grid to key admin pages
  - Sidebar bottom: "Help" link
- **Files:** `src/app/help/page.tsx`, `src/components/Sidebar.tsx`
- **Status:** ✅ Complete

#### 42. Super Admin Login Fix
- **Requested by:** User — "Invalid credentials" on super admin login
- **What:** Railway had wrong SUPER_ADMIN_EMAIL/PASSWORD env vars overriding defaults
- **Implementation:**
  - Hardcoded credentials: `ayurgate@gmail.com` / `Veda@2026`
  - Removed dependency on env vars for super admin auth
  - Fixed middleware to allow `super_admin_token` holders to access all API routes
  - `/super-admin/clinics` now loads properly (was blocked by middleware)
- **Files:** `src/lib/super-admin-auth.ts`, `src/middleware.ts`
- **Status:** ✅ Complete

#### 43. Payroll Feature Sheet PDF
- **Requested by:** User — create shareable feature list for tenants
- **What:** Professional PDF document listing all Payroll, Payslip & KET features
- **Implementation:**
  - 5-page Navy + Gold themed PDF with tables
  - Page 1: Payroll features + MOM OT compliance
  - Page 2: CPF age-band rates + multi-country statutory deductions
  - Page 3: Payslip module sections
  - Page 4: KET 5-section MOM template + features
  - Page 5: Part-time support + feature matrix + contact
  - Generated via ReportLab Python script
- **Files:** `scripts/generate-features-pdf.py`, `docs/AYURGATE-Payroll-Features.pdf`
- **Status:** ✅ Complete

### Session 5 (Continued) — 6 Apr 2026

#### 44. Super Admin: System Settings
- **Requested by:** User — trial duration, plan pricing, feature flags
- **What:** Full platform settings management page at `/super-admin/settings`
- **Implementation:**
  - 5 independent sections each with own Save button:
    1. Trial Configuration — duration days, max users, max patients
    2. Plan Limits — starter/professional/enterprise max users & patients
    3. Plan Pricing — monthly/annual prices (stored in cents to avoid float issues)
    4. Feature Flags — 10 toggles (online booking, payroll, inventory, packages, reports, multi-branch, WhatsApp, SMS, API access, maintenance mode)
    5. Platform Branding — platform name, support email, support phone
  - PlatformSettings singleton model in Prisma (fixed ID `platform_settings`)
  - Section-based PUT API with per-section validation
  - All updates audit-logged
  - Settings nav item added to sidebar (gear icon)
  - Registration endpoint now uses `getTrialDuration()` and `getPlanLimits()` instead of hardcoded values
  - Plan change endpoint uses dynamic limits from settings
- **Files:**
  - `prisma/schema.prisma` (PlatformSettings model)
  - `src/lib/platform-settings.ts`
  - `src/app/api/super-admin/settings/route.ts`
  - `src/app/super-admin/settings/page.tsx`
  - `src/app/api/clinic/register/route.ts` (wired to dynamic settings)
  - `src/app/api/super-admin/clinics/[id]/route.ts` (wired to dynamic settings)
  - `src/components/SuperAdminSidebar.tsx` (added Settings nav)
- **Status:** ✅ Complete

#### 45. Super Admin: Bulk Operations & CSV Export
- **Requested by:** User — bulk actions on multiple clinics
- **What:** Multi-select clinics for bulk trial extensions, plan changes, and data export
- **Implementation:**
  - Plan filter chips: All, Trial, Expired, Starter, Professional, Enterprise, No Plan (with counts)
  - Column headers row for better table readability
  - Bulk Mode toggle with checkboxes, Select All / Deselect All
  - Bulk actions: Extend Trial (7/14/30/60/90d), Change Plan, Activate, Deactivate
  - Per-clinic results panel showing success/failure after bulk operation
  - CSV Export downloads all clinic data (name, email, plan, usage stats, dates)
  - All bulk actions audit-logged with operation counts
  - Uses dynamic plan limits from platform settings
- **Files:**
  - `src/app/api/super-admin/bulk/route.ts`
  - `src/app/super-admin/clinics/page.tsx` (full rewrite with bulk UI)
- **Status:** ✅ Complete

#### 46. Platform Settings Enforcement on Tenant Side
- **Requested by:** Identified as critical gap — settings existed but weren't enforced
- **What:** Wire all platform settings to actually enforce on tenant-facing code
- **Implementation:**
  - **Plan limits enforcement:**
    - `checkUserLimit()` blocks user/staff creation when maxUsers reached (403)
    - `checkPatientLimit()` blocks patient creation when maxPatients reached (403)
  - **Trial expiration API enforcement:**
    - `checkTenantAccess()` blocks all write operations for expired trials
  - **Maintenance mode:**
    - Middleware blocks ALL tenant pages (shows HTML maintenance page) and APIs (503)
    - Super admin routes remain accessible during maintenance
  - **Feature flag enforcement:**
    - Middleware blocks disabled module routes: inventory, payroll, reports, packages, branches, online booking
    - 60-second in-memory cache for middleware flag checks (avoids DB on every request)
  - **WhatsApp flag:**
    - `enableWhatsApp` checked before sending WhatsApp messages in patient registration
  - **Dynamic pricing page:**
    - Pricing page fetches real prices from `/api/public/platform`
    - Trial duration, plan limits, and prices all dynamic
  - **Dynamic branding:**
    - `platformName` and `supportEmail` used on pricing page and patient welcome emails
  - **Public platform API:**
    - New `/api/public/platform` endpoint serves pricing, limits, branding, feature flags (no auth)
- **Files:**
  - `src/lib/plan-enforcement.ts` (new — reusable guards)
  - `src/app/api/public/platform/route.ts` (new — public platform info)
  - `src/middleware.ts` (maintenance mode + feature flag checks)
  - `src/app/api/users/route.ts` (user limit enforcement)
  - `src/app/api/patients/route.ts` (patient limit + WhatsApp flag + branding)
  - `src/app/api/staff/route.ts` (user limit enforcement)
  - `src/app/pricing/page.tsx` (dynamic pricing, branding, trial days)
- **Status:** ✅ Complete

### Session 6 — 6 Apr 2026

#### 47. Doctor Portal: Full Consultation Workspace
- **Requested by:** User — "1 by 1" feature build, Doctor Portal Enhancement
- **What:** Complete consultation workspace for doctors with vitals, notes, prescriptions, and patient history
- **Implementation:**
  - New consultation page at `/doctor/consult/[id]` (~700 lines)
  - **Patient header**: Avatar, demographics, allergies (red alert), medical notes (orange alert)
  - **4 clinical tabs**:
    1. **Vitals** — record form (BP, pulse, temp, weight, height, SpO2, resp rate) with auto BMI + history table
    2. **Clinical Notes** — 7 note types (general, diagnosis, treatment plan, progress, follow-up, referral, discharge) + history
    3. **Prescription** — multi-medicine form (dosage, frequency, timing, duration, quantity, instructions) with auto RX number
    4. **History** — past appointments with status badges
  - **Right sidebar**: patient quick info, latest vitals grid, "Complete Consultation" button
  - Doctor dashboard updated: patient names link to consultation, green "Consult" button on appointments
- **API:** `GET/PUT /api/doctor/consult/[id]`
  - GET: Returns appointment + full patient context (vitals last 10, notes last 20, past appointments last 15, prescriptions last 10)
  - PUT actions: save_vitals (auto BMI), save_note, save_prescription (auto RX-YYYYMM-XXXX), complete, update_status
- **Files:**
  - `src/app/doctor/consult/[id]/page.tsx` (NEW)
  - `src/app/api/doctor/consult/[id]/route.ts` (NEW)
  - `src/app/doctor/page.tsx` (updated with consult links)
- **Status:** ✅ Complete

#### 48. Appointment Reminder Engine (Cron-Based)
- **Requested by:** User — automated reminders
- **What:** Unified cron endpoint that auto-schedules and sends reminders for all clinics
- **Implementation:**
  - `POST /api/cron/reminders` — runs across ALL active clinics (not tenant-scoped)
  - **Phase 1: Auto-Schedule** — finds appointments in next 48h, creates:
    - 24h reminders for appointments >2h away
    - 1h reminders for appointments within 2h but >15min away
  - **Phase 2: Send** — processes max 100 pending reminders per clinic per run
  - Channels: WhatsApp (preferred) > SMS > Email, respects feature flags
  - Deduplication by `appointmentId` + `notes` field ("24h" vs "1h")
  - Branded email templates with clinic name, green header
  - Creates Communication records for sent reminders
  - Auth: `CRON_SECRET` header (optional in dev)
  - Added `/api/cron` to middleware PUBLIC_PATHS
- **Files:**
  - `src/app/api/cron/reminders/route.ts` (NEW)
  - `src/app/api/reminders/auto-schedule/route.ts` (enhanced with 1h reminders)
  - `src/middleware.ts` (added /api/cron to public paths)
- **Status:** ✅ Complete

#### 49. Invoice Auto-Generation on Consultation Completion
- **Requested by:** Identified gap — billing system existed but wasn't wired to doctor workflow
- **What:** Auto-generate invoice when doctor completes consultation, plus email invoice endpoint
- **Implementation:**
  - **Complete action enhanced**: When doctor marks appointment complete and sessionPrice > 0, auto-creates INV-YYYYMM-XXXX invoice with line items
  - **Invoice email endpoint**: `POST /api/invoices/[id]/email` sends branded HTML invoice/receipt to patient email
    - Full line items table, totals breakdown, payment history
    - Clinic branding from ClinicSettings model
    - Logs to Communication model
  - **Consult page updated**: After completion, shows invoice panel with:
    - Invoice number and "View Invoice" link to billing detail page
    - "Email Invoice" button (if patient has email)
    - "Back to Dashboard" button
- **Files:**
  - `src/app/api/doctor/consult/[id]/route.ts` (enhanced complete action)
  - `src/app/api/invoices/[id]/email/route.ts` (NEW)
  - `src/app/doctor/consult/[id]/page.tsx` (invoice panel after completion)
- **Status:** ✅ Complete

#### 50. Patient Portal with OTP Login
- **Requested by:** User — "yes can continue"
- **What:** Full patient-facing portal with phone OTP authentication
- **Implementation:**
  - **Login** at `/portal/login`: Phone + 6-digit OTP (emailed, 5-min expiry)
  - **Dashboard** at `/portal`: 4-tab mobile-friendly interface:
    1. **Home** — stats grid, allergy alerts, upcoming appointments, recent prescriptions, outstanding balance
    2. **Appointments** — upcoming + past visits with doctor, treatment, status, price
    3. **Prescriptions** — full medicine list (dosage, frequency, timing, duration) per prescription
    4. **Invoices** — invoice history with line items, paid/balance summary, totals
  - Separate `patient_token` JWT cookie (7-day expiry)
  - Middleware enforcement for /portal routes
  - Schema: added `otpCode`, `otpExpiresAt`, `lastPortalLogin`, phone+clinicId index to Patient model
- **Files:**
  - `prisma/schema.prisma` (Patient model + portal auth fields)
  - `src/lib/patient-auth.ts` (NEW — patient JWT helper)
  - `src/app/api/portal/auth/route.ts` (NEW — request_otp, verify_otp, logout)
  - `src/app/api/portal/me/route.ts` (NEW — profile + stats)
  - `src/app/api/portal/appointments/route.ts` (NEW — upcoming + past)
  - `src/app/api/portal/prescriptions/route.ts` (NEW — with items)
  - `src/app/api/portal/invoices/route.ts` (NEW — with payment summary)
  - `src/app/portal/login/page.tsx` (NEW)
  - `src/app/portal/page.tsx` (NEW — ~350 lines, 4-tab dashboard)
  - `src/middleware.ts` (added portal route handling)
- **Status:** ✅ Complete

#### 51. Online Payment at Booking (Stripe Checkout)
- **Requested by:** User — continued feature building
- **What:** Patients can pay consultation fee online when booking via Stripe Checkout
- **Implementation:**
  - After booking confirmation, "Pay Online" button appears if consultation fee > 0
  - Creates Stripe Checkout session with appointment metadata
  - On successful payment, webhook auto-creates invoice (INV-YYYYMM-XXXX) + payment record (REC-YYYYMM-XXXX)
  - Success/cancelled states shown on return to booking page
  - Graceful fallback if Stripe not configured ("pay at clinic")
  - Booking page checks URL params for payment return status
- **Files:**
  - `src/app/api/public/payment/route.ts` (NEW — Stripe Checkout session)
  - `src/app/api/stripe/webhook/route.ts` (enhanced — appointment_payment handling)
  - `src/app/book/[slug]/page.tsx` (Pay Online button + payment status)
- **Status:** ✅ Complete

#### 52. Patient Feedback & Reviews with NPS Tracking
- **Requested by:** User — continued feature building
- **What:** Complete feedback system with admin dashboard, public review links, and patient portal integration
- **Implementation:**
  - **Admin dashboard** at `/feedback`: Average rating, total reviews, NPS score, star distribution chart
  - Filters by category, rating, status + clinic response form
  - Flag/hide controls for moderation
  - **Public review page** at `/review?token=xxx`: Star rating with hover labels, quick tags, optional comment
  - Token-based access (crypto.randomBytes, 7-day expiry) — no login needed
  - Auto-generated on consultation completion with email notification
  - **Portal integration**: Patient portal Reviews tab shows pending + past reviews
  - Feedback model: rating 1-5, category, tags (JSON), response, NPS calculation (promoters - detractors)
- **API:**
  - `GET/PUT /api/feedback` — admin list with stats + respond/toggle status
  - `GET/POST /api/public/feedback` — token-based public submission
  - `GET/POST /api/portal/feedback` — patient portal feedback
- **Files:**
  - `prisma/schema.prisma` (Feedback model)
  - `src/app/api/feedback/route.ts` (NEW)
  - `src/app/api/public/feedback/route.ts` (NEW)
  - `src/app/feedback/page.tsx` (NEW — admin dashboard)
  - `src/app/review/page.tsx` (NEW — public review page)
  - `src/components/Sidebar.tsx` (added Feedback nav)
- **Commit:** `549b09b`
- **Status:** ✅ Complete

#### 53. Waitlist & Queue Management
- **Requested by:** User — continued feature building
- **What:** Patient waitlist with priority levels, notifications, and status tracking
- **Implementation:**
  - **Waitlist page** at `/waitlist`: Stats cards (waiting/notified/booked), filter tabs, add form
  - Priority levels: Normal, High, Urgent with color-coded badges
  - Status flow: waiting → notified → booked (or cancelled/expired)
  - Add form: patient details, preferred doctor/date/time, treatment, priority
  - Action buttons per entry: Notify (sends email), Booked, Remove
  - Duplicate detection by phone + doctor + date
  - 30-day auto-expiry on new entries
  - Email notification when slot becomes available (branded HTML template)
- **API:** `GET/POST/PUT/DELETE /api/waitlist`
  - GET: list with filters (status, doctorId, date) + stats counts
  - POST: add with duplicate check and auto-expiry
  - PUT: notify (email), book, cancel, update priority/notes
  - DELETE: remove entry
- **Files:**
  - `prisma/schema.prisma` (Waitlist model)
  - `src/app/api/waitlist/route.ts` (NEW)
  - `src/app/waitlist/page.tsx` (NEW)
  - `src/components/Sidebar.tsx` (added Waitlist nav)
- **Commit:** `f33573a`
- **Status:** ✅ Complete

### Session 7 — 6 Apr 2026

#### 54. Onboarding Wizard Redesign (Zanda-Inspired)
- **Requested by:** User — shared Zanda competitor screenshots as UX reference
- **What:** Complete redesign of `/onboarding` setup wizard with professional multi-step UX
- **Implementation:**
  - **6 major sections**: Welcome, Clinic Information, Working Hours, Practitioners, Services, Medicines
  - **Vertical sidebar** with connected dots and lines (Zanda pattern)
  - **Sub-step dot indicators** within sections (e.g., Clinic Info has 2 sub-steps: Address → Contact)
  - **Welcome screen** with branded hero, clinic type selection (6 types)
  - **Material-style floating label inputs** with emoji icons
  - **Contextual tip callouts** on every screen (green helper boxes)
  - **SKIP FOR NOW** on optional sections (Practitioners, Services, Medicines)
  - **Bottom navigation**: ← BACK / SKIP FOR NOW / NEXT →
  - **Setup summary card** on final screen before "Launch My Clinic"
  - **Mini month calendar** in sidebar for date navigation
  - Each staff/treatment/medicine entry saves individually with ✓ Saved state
  - Footer: "Only clinic information is required. You can always update the rest later."
- **Files:**
  - `src/app/onboarding/page.tsx` (complete rewrite — 850+ lines)
- **Commit:** `cfc58a6`
- **Status:** ✅ Deployed

#### 55. Appointment Calendar View
- **Requested by:** User — shared Halaxy calendar screenshots as reference
- **What:** Professional day/week calendar view for appointments
- **Implementation:**
  - New page at `/appointments/calendar` with time-grid calendar
  - **Left sidebar**: Mini month calendar, doctor filter dropdown, status filter, summary stats (total/upcoming/completed/cancelled)
  - **Day view**: Full-height time grid (7AM-9PM, 72px/hour) with positioned appointment blocks
  - **Week view**: 7-day grid with column headers showing appointment counts per day
  - **Appointment blocks**: Color-coded by status (scheduled=blue, confirmed=green, in-progress=yellow, completed=gray, cancelled=red, no-show=purple)
  - **Overlap detection**: Side-by-side stacking when appointments overlap
  - **Current time indicator**: Red line with dot on today's column
  - **Detail popup**: Click any appointment for patient info, time, doctor, treatment, links to full view
  - **Navigation**: Today button, prev/next arrows, Day/Week toggle, link back to list view
  - Calendar nav item added to sidebar
- **Files:**
  - `src/app/appointments/calendar/page.tsx` (NEW — 740 lines)
  - `src/components/Sidebar.tsx` (Calendar nav item)
- **Commit:** `14d64d2`
- **Status:** ✅ Deployed

#### 56. Data Import Center (CSV)
- **Requested by:** User — from feature CSV: "Import patients, services, staff, inventory from CSV/Excel"
- **What:** Unified data import hub for patients, treatments, medicines, and staff
- **Implementation:**
  - New page at `/admin/import` with 4 import type cards
  - **Patient Import** (`/api/patients/import`): Auto-generates P00001 IDs, duplicate detection by phone, 19 fields supported
  - **Treatment Import** (`/api/treatments/import`): Duplicate detection by name, 7 valid categories, auto-30min duration default
  - **Inventory Import** (existing `/api/inventory/import`): Added template endpoint, auto-SKU generation
  - **Staff Import**: Redirects to existing `/admin/staff` page with built-in CSV import
  - **CSV drag-and-drop** upload with client-side parsing and preview table (first 5 rows)
  - **Download template** for each import type with sample data
  - **Results dashboard**: Imported/Skipped/Errors breakdown with detailed stats
  - Import nav item added to sidebar
- **Files:**
  - `src/app/admin/import/page.tsx` (NEW)
  - `src/app/api/patients/import/route.ts` (NEW)
  - `src/app/api/treatments/import/route.ts` (NEW)
  - `src/components/Sidebar.tsx` (Import nav item)
- **Commit:** `7e6c0a1`
- **Status:** ✅ Deployed

### Session 8 — 6 Apr 2026

#### 57. Role-Based Dashboard Views
- **Requested by:** User — "Role-Based Dashboards"
- **What:** Personalized dashboard experience based on logged-in user's role
- **Implementation:**
  - Integrated `useAuth()` hook to detect current user's role
  - **Admin role**: Full dashboard — revenue stats, charts, staff summary, recent patients, communications, activity feed, upcoming appointments
  - **Doctor/Therapist roles**: Quick Actions grid (Book Appointment, Register Patient, My Portal, Calendar), appointments, activity feed — no revenue/staff sections
  - **Pharmacist role**: Inventory-focused view, no appointment sections
  - **Receptionist/Staff roles**: Quick Actions for booking & registration, relevant operational sections
  - Personalized greeting with role badge (e.g., "Good morning, Dr. Smith" with "Doctor" badge)
  - Role-specific subtitles (e.g., "Your clinic at a glance" for admin, "Your schedule & patients" for doctors)
  - Revenue stats only visible to admin
  - Staff summary only visible to admin
  - Inventory section visible to admin + pharmacist
  - Charts visible to admin only
  - Quick Actions grid for non-admin roles with contextual shortcuts
- **Files:**
  - `src/app/dashboard/page.tsx` (modified — added ~130 lines of role logic)
- **Commit:** `34e8ed0`
- **Status:** ✅ Deployed

#### 58. Test Accounts for All Roles (Pharmacist & Receptionist)
- **Requested by:** User — "how to test all the works u had done"
- **What:** Added pharmacist and receptionist seed accounts so all 5 roles can be tested
- **Implementation:**
  - Added Pharmacist: Priya Nair (pharmacist@clinic.com, P10001, role: pharmacist)
  - Added Receptionist: Meera Sundaram (reception@clinic.com, R10001, role: receptionist)
  - Uses `SEED_STAFF_PASSWORD` env var, falls back to admin password
  - Existing accounts are never overwritten (password-safe upsert)
- **Files:**
  - `scripts/seed-admin.ts` (modified — added pharmacist + receptionist blocks)
- **Commit:** `ce5473f`
- **Status:** ✅ Deployed

#### 59. Features API & Auto-Updating Google Sheet
- **Requested by:** User — "create google sheet to my email and automatically update when we develop new features"
- **What:** Built end-to-end auto-syncing feature tracker: API endpoint → Google Apps Script → 4-sheet Google Spreadsheet
- **Implementation:**
  - Created `/api/admin/features` endpoint that parses PROJECT-LOG.md and 05-features.md
  - Supports `?view=dev|modules|all` query parameter
  - Returns dev session features (57+), module capabilities, and combined view
  - Built Google Apps Script that fetches from API and populates 4 formatted sheets:
    - **Dev Log**: All development session features with green headers, alternating rows
    - **All Capabilities**: Every sub-feature from 05-features.md grouped by module
    - **Marketing Summary**: Big numbers dashboard (total modules/capabilities/updates), module & session breakdowns
    - **Share-Ready List**: One-page formatted feature list ready for client sharing
  - Configured hourly time trigger for auto-refresh
  - Added `/api/admin/features` to PUBLIC_PATHS in middleware
- **Files:**
  - `src/app/api/admin/features/route.ts` (NEW)
  - `src/middleware.ts` (modified — added public path)
  - Google Apps Script: `Code.gs` (external)
- **Google Sheet:** [AyurGate — Feature Tracker](https://docs.google.com/spreadsheets/d/1gFsIb_ofmtavcA1Ycu8W1a0DuH9lbZBb9kW7_MFZF0I)
- **Commits:** `81b0da9`, `542c572`
- **Status:** ✅ Deployed (auto-refreshes hourly)

### Session 9 — 7 Apr 2026

#### 60. Mobile Responsiveness — Full App
- **What:** Comprehensive mobile responsiveness overhaul across 15 files
- **Commit:** `021454c`
- **Status:** ✅ Deployed

#### 61. Register & Onboarding Redesign
- **What:** Smart country-aware fields (India states/pincode, Malaysia states, UAE emirates), pre-populate onboarding from registration, clinic type cards, practitioner count, new country-data.ts module
- **Commits:** `c10efeb`
- **Status:** ✅ Deployed

#### 62. Strong Password Policy
- **What:** 12+ chars, uppercase, lowercase, number, symbol required. Show/hide toggle + live checklist on all password fields. Updated 13 files (6 APIs + 7 pages)
- **Commit:** `51a6d96`
- **Status:** ✅ Deployed

#### 63. Sign Up Flow with Role Selection
- **What:** 2-path sign up: "Set Up My Clinic" (owner) / "Join My Team" (invite). Renamed Register → Sign Up across app.
- **Commit:** `27c4ecb`
- **Status:** ✅ Deployed

#### 64. Terms of Use & Privacy Policy Pages
- **What:** `/terms` (14 sections) and `/privacy` (13 sections) — healthcare SaaS legal content with PDPA compliance, Singapore governing law
- **Commit:** `27c4ecb`
- **Status:** ✅ Deployed

#### 65. Super Admin — New Registration Fields
- **What:** Clinic Type, Team Size, Referral Source, Terms Accepted shown in clinic detail, clinics list, dashboard, and registration notification emails
- **Commit:** `978a712`
- **Status:** ✅ Deployed

### Session 10 — 7 Apr 2026

#### 66. Google Workspace Email Deliverability Setup
- **What:** Full email authentication configured for ayurgate.com domain:
  - SPF — Already configured (Google + Resend authorized senders)
  - DKIM (Google) — Generated 2048-bit key in Google Admin, added `google._domainkey` TXT record on GoDaddy, activated authentication
  - DKIM (Resend) — Already configured (`resend._domainkey`)
  - DMARC — Already configured (`p=quarantine`)
- **Status:** ✅ Live (DNS propagated)

#### 67. Google Workspace — info@ayurgate.com Account
- **What:** Created `info@ayurgate.com` as a full Google Workspace user account (not alias) — can independently log in, send, and receive emails. Intended as the primary transactional email sender for the app (appointment confirmations, invoices, invites).
- **Status:** ✅ Active (ready for first sign-in)

#### 68. Feature Tracker Fix — Duplicate Entry Removed
- **What:** Fixed duplicate Feature 60 block in PROJECT-LOG.md (appended after Architecture Summary section) that caused the `/api/admin/features` parser to return only 60 features instead of 65. Google Sheets tracker now correctly shows all features.
- **Commit:** `abf4961`
- **Status:** ✅ Deployed

#### 69. Staff Detail/Profile Page
- **What:** Full staff profile page at `/admin/staff/[id]` with inline editing, overview stat cards (appointments, joined date, employment type, last login), personal & employment info, clinical section (schedule display, specialization, fees) for doctors/therapists, tab navigation to documents/leave/performance sub-pages, password modal, and toast notifications.
- **Commit:** `3bf6f4d`
- **Status:** ✅ Deployed

#### 70. Resend Invite System
- **What:** New POST `/api/staff/[id]/resend-invite` endpoint generates fresh 7-day invite token and re-sends email. "Resend Invite" button added to staff list for members who haven't signed in yet or have pending invites.
- **Commit:** `3bf6f4d`
- **Status:** ✅ Deployed

#### 71. SMTP Config — info@ayurgate.com
- **What:** Switched transactional email sender from `ayurgate@gmail.com` (Gmail) to `info@ayurgate.com` (Google Workspace) with App Password authentication. Updated Railway env vars: SMTP_USER, SMTP_PASS, EMAIL_FROM. Added error fallback in marketing email to use Resend when Gmail SMTP times out.
- **Commit:** `e6cdf20`
- **Status:** ✅ Deployed

#### 72. Daily Report Cron
- **What:** Automated daily clinic report via scheduled task. Triggers `GET /api/daily-report` every day at 11 PM SGT. Sends email with appointment stats, revenue, new patients, inventory alerts, and upcoming appointments across all clinics. Switched from `sendMarketingEmail()` to `sendEmail()` to route through Resend API with verified `ayurgate.com` domain (Gmail SMTP had IPv6 issues on Railway).
- **Commit:** `c09d59a`
- **Status:** ✅ Active & Verified (email delivered via Resend)

#### 73. WhatsApp Business API — Two-Way Messaging
- **What:** Full WhatsApp Business API integration with two-way messaging:
  - WhatsAppMessage model (direction, delivery status, media support, Twilio SID tracking)
  - Inbound webhook (`POST /api/whatsapp/webhook`) for receiving patient messages and delivery status callbacks
  - Chat API (`GET/POST /api/whatsapp/chat`) for conversation history and sending
  - Conversations API (`GET /api/whatsapp/conversations`) for grouped patient conversations with unread counts
  - Two-panel WhatsApp-style chat UI at `/communications/whatsapp` with message bubbles, delivery indicators, date dividers, auto-scroll, 10s polling, and mobile responsive design
- **Commit:** `cfb8147`
- **Status:** ✅ Deployed

### Session 11 — 8 Apr 2026

#### 74. Meta WhatsApp Cloud API Migration (Twilio → Meta Direct)
- **What:** Replaced Twilio WhatsApp integration with direct Meta WhatsApp Cloud API:
  - Created Meta Developer App "AYUR GATE" (App ID: 26764399736511116, Business type)
  - New `/lib/whatsapp.ts`: Full Meta Cloud API client — `sendTextMessage`, `sendTemplateMessage`, `sendImageMessage`, `sendDocumentMessage`, `markAsRead`, `verifyWebhookSignature`, `isWhatsAppConfigured`
  - Backward-compatible `sendWhatsApp()` wrapper preserves 6 existing route integrations
  - Rewrote `/api/whatsapp/webhook`: GET for Meta hub.challenge verification, POST for inbound messages + delivery statuses
  - Rewrote `/api/whatsapp/chat`: Meta API sending (text + template messages), mock fallback
  - `.env` updated: `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET`, `WA_PHONE_NUMBER`
- **Commit:** `57af924`
- **Status:** ✅ Deployed

#### 75. Super Admin WhatsApp Monitoring Dashboard
- **What:** WhatsApp monitoring in Super Admin panel:
  - New `/super-admin/whatsapp` page: 5 stat cards, 7-day bar chart, quick stats, clinic usage table (sortable, filterable), recent messages feed
  - New `/api/super-admin/whatsapp` API: overview stats, per-clinic breakdown, daily trend, recent messages
  - Dashboard enhanced: WhatsApp summary card + staff role breakdown row
  - Sidebar: WhatsApp nav link added
- **Commit:** `57af924`
- **Status:** ✅ Deployed

#### 76. Meta WhatsApp Cloud API — Production Setup
- **What:** Full production configuration of Meta WhatsApp Cloud API:
  - Generated temporary access token from Meta API Setup
  - Retrieved App Secret from App Settings > Basic
  - Configured webhook: callback URL `https://www.ayurgate.com/api/whatsapp/webhook`, verify token `ayurgate-wa-verify-2026` — verified successfully
  - Subscribed to `messages` webhook field
  - Added 5 WA_ env vars to Railway (31 total service variables)
  - End-to-end test: sent `hello_world` template message to `+6593273921` — delivered successfully
  - Test phone number: +1 555 159 9591, Phone Number ID: 1088907630967104
- **Status:** ✅ Live & Verified

---

### Session 12 — 8 April 2026

#### 77. Permanent WhatsApp Access Token (System User)
- **What:** Replaced temporary 24-hour Meta API token with a permanent never-expiring token via System User:
  - Created System User "AyurGate WhatsApp Bot" in Meta Business Suite (Admin role)
  - Assigned assets: AyurGate app (Full control) + WhatsApp Business Account (Full control)
  - Generated permanent token with permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
  - Token expiry: **Never** (permanent)
  - Verified token works via Graph API curl test (HTTP 200)
  - Updated `.env` locally with new `WA_ACCESS_TOKEN`
  - Updated Railway environment variable `WA_ACCESS_TOKEN` and redeployed
  - WhatsApp messaging now uses permanent credentials — no more 24h token expiry issues
- **Status:** ✅ Live & Deployed

---

### Session 13 — 8 April 2026

#### 78. MOA/AOA Analysis — 3Phala Ayurcentre Pvt Ltd
- **What:** Read and analyzed the full MOA (Memorandum of Association) of 3Phala Ayurcentre Pvt Ltd to determine if it can be used to operate AyurGate SaaS platform
- **Key Findings from MOA Objects Clause:**
  - **Main Object (III-A):** Ayurvedic Consultation, Treatments, Sale of Medicines (Retail & E-commerce), Clinics, Hospitals, Yoga, Education, Manufacturing, Research
  - **Supportive Ancillary Objects (III-B):**
    - Item 6: Training, seminars, conferences, exhibitions (supports CME/Webinar module)
    - Item 7: Patents, copy rights, sophisticated technology, designs, licenses
    - Item 9: Technical collaborations, import equipment, materials, data, programs
    - Item 20: Franchises, rights to use our technologies, receive royalties/fees
    - Item 21: Licence agreements, technical information, know-how
    - Item 22: Research laboratories, scientific and technical research
  - **NIC Code:** 74999 ("Other Business Activities") — broad catch-all
  - **CIN:** U74999TN2018PTC125961
- **Verdict:** Partial fit — MOA covers "technology," "programs," "E-commerce," "franchises/tech rights" but does NOT explicitly mention "software," "SaaS," "IT services," or "cloud computing"
- **Status:** ✅ Analysis Complete

#### 79. Bridge Strategy Decision — Operate AyurGate under 3Phala
- **What:** Decided on bridge strategy to operate AyurGate immediately under 3Phala Ayurcentre Pvt Ltd while registering new company in parallel
- **Strategy:**
  - **Immediate:** Use 3Phala's E-commerce + technology clauses to operate AyurGate SaaS
  - **Parallel:** Register "AyurGate Technologies Private Limited" in India with broad tech MOA via SPICe+
  - **Later:** Transfer SaaS IP from 3Phala to AyurGate Technologies once registered
- **Benefits:** Zero delay — can proceed with Meta Business Verification, WhatsApp API using 3Phala's existing Certificate of Incorporation, PAN, GST
- **Status:** ✅ Decision Made

#### 80. Google Sheet — Bridge Strategy & Action Items Update
- **What:** Added bridge strategy action items to Google Sheet "Action Items / Reminders" tab
- **Items Added:**
  - #13: MOA Analysis Complete (Done)
  - #14: Use 3Phala for AyurGate Bridge (Decision Made)
  - #15: Meta Business Verification with 3Phala docs (Next Session)
  - #16: Register AyurGate Technologies Pvt Ltd in India (Future)
  - #17: Transfer AyurGate IP to new company (After Registration)
  - #18: Social Media Brand Reservation — FB, YouTube, LinkedIn, Instagram, X (Pending)
- **Status:** ✅ Complete

### Session 14 — 8 April 2026

#### 81. CME / Webinar Module — Phase 1 MVP (Complete Build)
- **Requested by:** User — "cme/webinars"
- **What:** Built the full CME (Continuing Medical Education) / Webinar / Events module — the first ecosystem module beyond clinic management
- **Database Schema (6 new models):**
  - `CmeEvent` — events with schedule, location, video platform, CME credits, pricing, capacity, media, status
  - `CmeSpeaker` — speaker profiles (can link to platform User)
  - `CmeEventSpeaker` — many-to-many with role (speaker/moderator/panelist/chief_guest)
  - `CmeSession` — multi-session support for conferences
  - `CmeRegistration` — attendee registration with payment, attendance, WhatsApp opt-in
  - `CmeCertificate` — certificate generation with verification code, delivery tracking
  - Added `enableCme` feature flag to `PlatformSettings`
- **API Routes (10 files):**
  - `/api/cme/events` — GET (list) + POST (create, auto-slug)
  - `/api/cme/events/[id]` — GET/PUT/DELETE with ownership checks
  - `/api/cme/events/[id]/register` — POST public registration, generates CME-YYYYMM-XXXX
  - `/api/cme/events/[id]/registrations` — GET admin list with search
  - `/api/cme/events/[id]/check-in` — POST toggle check-in
  - `/api/cme/events/[id]/publish` — POST toggle draft/published
  - `/api/cme/events/[id]/speakers` — POST add / DELETE remove speaker
  - `/api/cme/speakers` — GET list + POST create
  - `/api/cme/speakers/[id]` — GET/PUT/DELETE
  - `/api/public/cme/events` — GET public listing with spotsLeft/isFull computed
- **Public Pages (4 files):**
  - `/cme` — Event listing with hero, search, category filters, featured/upcoming/past sections
  - `/cme/[slug]` — Event detail with banner, schedule, speakers, sessions, sidebar registration CTA
  - `/cme/[slug]/register` — Registration form with success state
  - `/cme/layout.tsx` — Public CME header/footer with AyurGate branding
- **Admin Pages (6 files):**
  - `/cme/admin/layout.tsx` — Sub-navigation (Dashboard | Events | Speakers)
  - `/cme/admin/page.tsx` — Dashboard with stats, filterable event table
  - `/cme/admin/events/new/page.tsx` — Create event form (8 sections)
  - `/cme/admin/events/[id]/page.tsx` — Edit event + manage speakers & sessions
  - `/cme/admin/events/[id]/registrations/page.tsx` — Registrations table with check-in toggle
  - `/cme/admin/speakers/page.tsx` — Speaker directory with add/edit/delete
- **Status:** ✅ Complete

#### 82. CME Admin Pages — Tailwind CSS & Responsive Design Rewrite
- **Requested by:** User — "i develop for desktop, tab, mobile compatibility with proper spacing"
- **What:** Rewrote all 6 CME admin pages from inline `style={}` objects to Tailwind CSS with full responsive design
- **Problem:** Background agent generated admin pages with ~400 inline style attributes and zero responsive breakpoints
- **Fix:** 6 parallel agents rewrote every page:
  - Removed all inline style constants (card, labelStyle, inputStyle, etc.)
  - Replaced with Tailwind classes (className)
  - Added responsive breakpoints: 1-col mobile → 2-col sm → 3-col lg grids
  - Tables become card-based on mobile (`md:hidden` cards, `hidden md:block` table)
  - Modals full-width on mobile, max-w-lg on desktop
  - Headers stack vertically on mobile, row on sm+
- **Verification:** Build compiles with zero errors, zero inline `style={}` remaining in `/cme/admin/`
- **Files changed:** All 6 files in `src/app/cme/admin/`
- **Status:** ✅ Complete

---

### Session 15 — 9 April 2026 — CME Module, Production Deployment & Super Admin Fixes

#### 83. CME & Events Module — Public Pages & Admin Panel
- **What:** Built full CME public experience and admin panel with AyurGate green theme:
  - **Public pages:** `/cme` listing page, `/cme/[slug]` detail page with hero banner, schedule, speakers, pricing sidebar
  - **Admin panel:** `/cme/admin` with full CRUD for events, speakers, registrations, check-in
  - Inline registration form in sidebar below pricing card
  - Breadcrumbs, SVG icons, 8 seed events
- **Status:** ✅ Complete

#### 84. CME Inline Registration
- **What:** Registration form appears in sidebar below pricing card on event detail page
  - Compact single-column layout
  - Amber/gold hover on register button
  - Public API at `/api/public/cme/register` (no auth required)
- **Status:** ✅ Complete

#### 85. Super Admin CME Integration
- **What:** Integrated CME module into super admin console:
  - `enableCme` feature flag toggle in Settings
  - CME & Events link in super admin sidebar linking to `/cme/admin`
- **Status:** ✅ Complete

#### 86. Admin Password Reset Script
- **What:** Created `scripts/reset-password.ts` CLI tool for resetting admin passwords
  - Works with local `dev.db` and Railway (via `DB_PATH` env var)
- **Status:** ✅ Complete

#### 87. Seed Admin Password Update
- **What:** `seed-admin.ts` now updates admin password when `SEED_ADMIN_PASSWORD` env var is explicitly set
  - Enables password reset via Railway env vars without CLI access
- **Status:** ✅ Complete

#### 88. Super Admin Env Var Auth
- **What:** Super admin login now reads from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` env vars instead of hardcoded values
- **Status:** ✅ Complete

#### Bug Fixes
- **Turbopack stale code:** Root cause was Service Worker caching old JS bundles — fixed by clearing via `navigator.serviceWorker.getRegistrations()`
- **Registration API returning HTML:** Created public endpoint bypassing auth middleware
- **Railway build failure:** `/review` page `useSearchParams()` wrapped in Suspense boundary (Next.js 16.2.1 requires this for static generation)
- **Sidebar scrollbar:** Added `hide-scrollbar` CSS class to nav element

#### Production Deployment
- All features deployed to **www.ayurgate.com** via Railway
- CME public pages live at `/cme`
- Super admin accessible with env var credentials
- Admin password reset working via `SEED_ADMIN_PASSWORD` env var

#### Tech Notes
- Next.js 16.2.1 requires `useSearchParams()` inside Suspense boundary for static generation
- Service Workers can cache JS bundles aggressively — clear via `navigator.serviceWorker.getRegistrations()`
- Railway builds each commit individually; intermediate failed builds are superseded by later successful ones

---

### Session 16 — 14 April 2026 — Strategic Planning, QA Audit, VAPT Analysis & Sprint 11 Security Fixes

#### 1. QA Audit Report (Generated)
- **Requested by:** User
- **What:** Senior-QA-engineer analysis of the existing test suite
- **Finding:** ZERO test infrastructure across 202 API endpoints, 63 DB models, 105 pages
- **Deliverable:** `AyurGate-QA-Audit-Report.docx` on Desktop (25KB)
- **Contents:** Executive summary, current state, coverage gaps, 4-phase remediation roadmap (12 weeks), framework recommendations (Vitest, Playwright, Testing Library, MSW), timeline, success metrics

#### 2. VAPT Reports — India & Singapore (Generated)
- **Requested by:** User ("actually my clients and i am planning mainly for india india company indian clients" + "and in singapore")
- **What:** Vulnerability Assessment & Penetration Testing reports tailored to each jurisdiction
- **Deliverables:**
  - `AyurGate-VAPT-Report.docx` (India-focused, 30KB) — DPDP Act 2023, CERT-In 6-hr breach notification, ABDM/AYUSH Grid, INR 1-8 lakh vendor estimates, 10-day execution plan
  - `AyurGate-VAPT-Report-Singapore.docx` (23KB) — PDPA 2012 Sec 24/26D, NRIC handling test cases, CPF/MOM data protection, SGD 5K-40K vendor estimates, India vs Singapore comparison

#### 3. Competitor & Website Feature Analysis
- **Analyzed 7 platforms:** Splose, Zanda Health, Curable, SafeTalk, SimplePractice, EasyClinic, WellnessLiving
- **Finding:** AyurGate sits in a "blue ocean" — no modern cloud-native Ayurveda-first SaaS exists for India + Singapore dual-market
- **Top 15 features recommended for adoption:** AI clinical notes, embeddable booking widget, ePrescribe, video consultation, AI churn predictor, client portal, multi-tier pricing, secure messaging, batch invoicing, Razorpay/UPI + Stripe, white-label mobile app, loyalty program, ISO 27001 path, in-app AI assistant, staff training academy

#### 4. Master Project Plan — 12-Sheet XLSX Workbook (Generated)
- **Requested by:** User ("set up a formal Agile board or sprint structure for AyurGate's remaining")
- **Deliverable:** `AyurGate-Master-Project-Plan.xlsx` on Desktop (33KB)
- **Sheets:**
  1. Vision & Mission — 5 core values, 5 strategic goals with KPIs
  2. Sprint History — 10 completed sprints (Apr 2-14), 160 story points, 91+ features
  3. Product Backlog — 60+ items across 10 epics, P0-P3 prioritized
  4. Sprint Plan — 10 future sprints (Sprint 11-20+) through Q3 2026
  5. Database Strategy — 6-phase SQLite→PostgreSQL migration plan
  6. Testing Roadmap — 4 test phases + 9-stage CI/CD pipeline
  7. Security Roadmap — 14 security categories with action items
  8. Backup & DR — RPO 1hr / RTO 4hr, 6 disaster scenarios
  9. Compliance Matrix — 22 regulatory items (DPDP, PDPA, HCSA, IT Act, ABDM)
  10. Release Plan — 7 releases (v1.0 → v2.0)
  11. Risk Register — 15 risks scored by probability × impact
  12. Team & Roles — 10 roles (1 active, 9 to hire), 3-phase hiring timeline

#### 5. Sprint 11 — Critical Security Fixes ⭐ (Deployed)
- **JWT secret fallback eliminated** in 4 files. App now throws `JWT_SECRET environment variable is required` at startup instead of falling back to empty string.
  - `src/middleware.ts`
  - `src/lib/patient-auth.ts`
  - `src/app/api/portal/auth/route.ts`
  - `src/app/api/super-admin/notifications/route.ts`
- **Cross-clinic data leak in dashboard/reports fixed:**
  - `src/app/api/dashboard/route.ts` — added auth guard (returns 401 without clinic-scoped token), removed global `prisma` fallback, hardcoded `clinicId = ?` in all 5 raw SQL queries
  - `src/app/api/reports/route.ts` — same fix applied, hardcoded `clinicId = ?` in all 2 raw SQL queries
- **Verification (local):**
  - TypeScript: `npx tsc --noEmit` → 0 errors
  - ESLint: 0 errors (4 pre-existing warnings unrelated to changes)
  - Smoke tests: Dashboard/reports return 307 → /login for unauth + forged-token requests (defense in depth)
  - Landing page, /login, /api/public/platform all 200 OK
- **Already-fixed discoveries (roadmap was stale):**
  - `setup-doctor-passwords/route.ts` and `doctor/dashboard/route.ts` already use `verifyToken()` from shared auth module
  - `global-error.tsx` already sanitized (no `error.message` exposed to client)
  - `ErrorBoundary.tsx` already gates stack traces to `NODE_ENV !== "production"`
- **Deployed:** Commit `ec521bd` pushed to `origin/main`, Railway auto-deploy triggered
- **Prereq verified:** User confirmed `JWT_SECRET` is set in Railway env vars before push

#### Remaining Sprint 11 Items (Still Open)
- SEC-002: API-level role checks on all 202 endpoints (8 points)
- SEC-006: CSRF protection (double-submit cookie pattern)
- SEC-007: Rate limiting (Redis-backed, 100/min auth, 1000/min API)
- SEC-008: Content Security Policy + security headers

---

### Session 17 — 15 April 2026 — Sprint 11 Security Hardening (Closeout)

Four security items landed in a single session, each verified locally before push. Sprint 11 security track is now closed.

#### 1. SEC-002 — Role guards on sensitive endpoints (commit `604e3db`)
Added `requireRole()` guards to PUT/PATCH/DELETE handlers on 8 high-impact routes. Defense-in-depth on top of middleware JWT verification; each handler returns `403 Forbidden` if the caller's role is not in the allowed list.

| Endpoint | Method(s) | Guard |
|---|---|---|
| `/api/users/[id]` | PUT, DELETE | `ADMIN_ROLES` |
| `/api/invoices/[id]` | PUT, DELETE | `ADMIN_ROLES` |
| `/api/credit-notes/[id]` | PUT, DELETE | `ADMIN_ROLES` |
| `/api/treatments/[id]` | PUT, DELETE | `ADMIN_ROLES` |
| `/api/patient-packages/[id]/refund` | POST | `ADMIN_ROLES` |
| `/api/transfers/[id]` | PUT | `STAFF_ROLES` |
| `/api/inventory/[id]` | PUT | `STAFF_ROLES` |
| `/api/prescriptions/[id]` | PUT, DELETE | admin + doctor + pharmacist |

Verified: `tsc --noEmit` clean; eslint 0 errors (3 pre-existing warnings unrelated).

#### 2. SEC-006 — CSRF defense (commit `8aac494`)
Origin/Referer check in `src/middleware.ts`. Rejects any mutating request (POST/PUT/PATCH/DELETE to `/api/*`) whose `Origin` — or `Referer` fallback — does not match the request host. Absent both → reject.

Webhook exemptions: `/api/stripe/webhook`, `/api/whatsapp/webhook`, `/api/cron`, `/api/daily-report`.

Smoke-tested via curl:
- POST no Origin → 403 ✅
- POST foreign Origin (`evil.example.com`) → 403 ✅
- POST same Origin → passes, reaches handler ✅
- GET requests → unaffected ✅
- Webhook POST → exempt, reaches handler ✅

OWASP lists Origin validation as sufficient standalone CSRF defense. Zero frontend changes required.

#### 3. SEC-007 — Rate limiting (commit `2611e67`)
Global per-IP rate limit in middleware using the existing in-memory sliding-window limiter (`src/lib/rate-limit.ts`). Returns 429 with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Window` headers.

| Bucket | Limit |
|---|---|
| `/api/auth/login`, `forgot-password`, `reset-password`, `/api/super-admin/login`, `/api/portal/auth`, `/api/invite/*` | 10 req / 60s |
| All other `/api/*` | 100 req / 60s |

Smoke-tested: 10 login attempts → 401, requests 11–12 → 429 with `Retry-After: 47`. Client IP resolved from `X-Forwarded-For` (Railway) → `X-Real-IP` → `"unknown"`.

Scaling note: in-memory limiter works for a single Railway replica. Swap to `@upstash/ratelimit` (Redis) if scaling horizontally.

#### 4. SEC-008 — Security headers hardened (commit `c4b63e6`)
Tightened the header bundle in `next.config.ts`:

- **Dropped X-XSS-Protection** — deprecated, Chromium removed it, legacy implementations had known bypasses.
- **HSTS**: `max-age=31536000` (1y) → `max-age=63072000; includeSubDomains; preload` (2y). Domain is now eligible for the Chrome HSTS preload list.
- **Permissions-Policy**: explicitly deny `payment`, `usb`, `magnetometer`, `accelerometer`, `gyroscope`, `interest-cohort` (FLoC). Camera retained as `self` for medical photo capture.
- **CSP additions**: `frame-ancestors 'none'` (clickjacking defense that survives X-Frame-Options deprecation), `form-action 'self'`, `upgrade-insecure-requests`.

Verified via `curl -I /login`: all 6 headers present, X-XSS-Protection absent, page renders 200 with no hydration or CSP violation errors.

**Still open** (separate tickets): nonce-based CSP to drop `'unsafe-inline'` / `'unsafe-eval'` from `script-src` (requires Next 16 hydration script migration).

#### 5. OAuth production incident & fix
Google Sign-In was returning `Error 401: invalid_client` on prod (`https://ayurgate.com/login`). Root cause: the `GOOGLE_CLIENT_ID` Railway env var had the client secret concatenated with a space — so `ID` carried the full token and `SECRET` was empty. The secret leaked through the Google error-page URL during debugging and had to be rotated twice.

Remediation:
- Rotated the OAuth client secret in Google Cloud Console (final value `****7gf7`).
- Split the Railway variables into clean separate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` entries. Verified via TextEdit-paste sanity check that no whitespace slipped in.
- Shipped an OAuth production runbook at `docs/runbooks/google-oauth-production.md` (commit `1bacc04`) covering rotation, redirect-URI pitfalls, and this exact incident pattern.

**Follow-ups flagged for user**: delete the stale unused secret in Google Console; consider moving to short-lived tokens via workload identity federation.

#### 6. Automated database backups
First non-manual backup system for the production SQLite on the Railway volume. Every piece of the pipeline is one HTTP request deep — `GET /api/cron/backup?secret=<CRON_SECRET>` — so any external scheduler can drive it.

Pipeline per run:
1. `VACUUM INTO` a timestamped `.db` snapshot.
2. Gzip it (level 9) and delete the raw copy. Compression saves ~89% on current dev data (1.5 MB → 167 KB).
3. Row-count integrity check across `clinics`, `users`, `patients`, `appointments`, `invoices`.
4. Threat detection: flags >20% drops vs. yesterday and any table that went non-zero → zero.
5. Optional offsite upload to S3/R2 if all four `BACKUP_S3_*` env vars are set; silently local-only otherwise.
6. Rotation: 30 days local (was 7), 90 days offsite.
7. HTML status email to `ayurcentresg@gmail.com` with size, duration, snapshot counts, and alerts.

Hardening:
- **Removed the hardcoded CRON_SECRET fallback** (`"ayurgate-daily-2026"`) — the route now throws at module load if `CRON_SECRET` is unset, matching the SEC-001 pattern.
- Offsite failure does NOT fail the backup — local copy is still written and the email flags the problem.
- Restore script (`scripts/restore-backup.ts`) refuses to overwrite without `--yes`, snapshots current DB to `<db>.pre-restore-<ts>` first, and verifies the SQLite header before touching the target.
- Runbook at `docs/runbooks/database-backup.md` documents cadence, R2/S3 setup, recovery scenarios, limitations.

**User action items**:
- Set `CRON_SECRET` in Railway and wire a daily cron trigger (Railway cron / cron-job.org / GH Actions).
- Optional: create a Cloudflare R2 bucket + API token and add `BACKUP_S3_*` vars to activate offsite.

#### Sprint 11 closeout

| ID | Fix | Commit |
|---|---|---|
| SEC-001 | Remove JWT secret fallback (4 files) | `ec521bd` |
| SEC-001b | Cross-clinic data leak in dashboard/reports | `ec521bd` |
| SEC-002 | Role guards on 8 sensitive endpoints | `604e3db` |
| SEC-006 | CSRF: Origin/Referer check | `8aac494` |
| SEC-007 | Rate limiting: 10/min auth, 100/min API | `2611e67` |
| SEC-008 | Security headers (HSTS preload, Permissions-Policy, CSP) | `c4b63e6` |

All six commits on `main`, Railway auto-deployed.

#### Remaining security backlog (not Sprint 11)
- Nonce-based CSP (drop `'unsafe-inline'` / `'unsafe-eval'`)
- Redis-backed rate limiter for multi-replica scaling
- Full 202-endpoint role-check audit (Sprint 11 covered the 8 highest-risk)

---

## Pending / Upcoming

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 1 | Batch Invite | Low | Invite multiple staff members at once |
| 2 | Per-Clinic WhatsApp Setup | Medium | Each clinic gets own WhatsApp number + credentials, with AyurGate global credentials as fallback |
| 3 | Meta App Live Mode | High | Switch from Development to Live mode — requires Privacy Policy URL + business verification |
| 4 | ~~Permanent WhatsApp Token~~ | ~~Medium~~ | ✅ **Done** (Session 12) — System User permanent token configured |
| 5 | Multi-Tenant WhatsApp Architecture | Medium | Design per-clinic WhatsApp: shared platform number vs clinic-owned numbers, routing, credential storage |
| 6 | Unified Staff Management | Medium | Merge Doctor model into User model, email invites, role-based staff (plan exists) |
| 7 | Real WhatsApp Business Number | High | Register actual business phone number (replace Meta test number +1 555 159 9591) |
| 8 | WhatsApp Message Templates | Medium | Create & submit custom message templates for appointment reminders, billing, etc. |
| 9 | Meta Business Verification | High | Complete business verification for Live mode access |
| 10 | Register AyurGate Technologies Pvt Ltd | Medium | New company in India via SPICe+ with broad tech MOA |
| 11 | Social Media Brand Reservation | High | Reserve AyurGate on Facebook, YouTube, LinkedIn, Instagram, X |
| 12 | AyurGate Ecosystem Master Plan | Low | 20-module Super App vision (CME, Jobs, Pharma, Events, Teleconsult, Marketplace, etc.) |

---

## Architecture Summary

```
www.ayurgate.com (Railway)
├── / .......................... Landing page (marketing)
├── /pricing ................... Pricing plans
├── /register .................. Sign Up (role selection → clinic setup)
├── /terms ..................... Terms of Use (NEW)
├── /privacy ................... Privacy Policy (NEW)
├── /login ..................... Tenant login
├── /book/[slug] ............... Public patient booking (NEW)
├── /dashboard ................. Admin dashboard
├── /appointments .............. Appointment management
│   └── /calendar .............. Day/week calendar view (NEW)
├── /patients .................. Patient records
├── /prescriptions ............. Digital prescriptions
├── /inventory ................. Stock management
├── /billing ................... Invoices & payments
├── /communications ............ WhatsApp/Email/SMS
│   └── /whatsapp .............. Two-way WhatsApp chat UI (NEW)
├── /admin/staff ............... Staff management
├── /admin/import .............. CSV data import center (NEW)
├── /admin/commission .......... Commission tracking
├── /admin/payroll ............. Country-specific payroll
├── /feedback .................. Patient feedback & reviews
├── /waitlist .................. Waitlist & queue management
├── /reports ................... Analytics & exports
├── /account ................... My Account / Profile
├── /subscription .............. Subscription & Billing
├── /help ...................... Help & Support / FAQ
├── /portal .................... Patient portal (OTP login)
│   └── /login ................. Patient phone + OTP login
├── /doctor .................... Doctor portal
│   └── /consult/[id] .......... Full consultation workspace
├── /cme ....................... CME & Events (public) (NEW)
│   ├── /[slug] ................ Event detail page
│   └── /[slug]/register ....... Public registration form
├── /cme/admin ................. CME Admin panel (NEW)
│   ├── /events/new ............ Create event
│   ├── /events/[id] ........... Edit event + speakers + sessions
│   ├── /events/[id]/registrations Check-in & attendance
│   └── /speakers .............. Speaker directory
├── /super-admin ............... Platform admin console
│   ├── /clinics ............... Manage clinics (bulk ops, CSV export)
│   ├── /clinics/[id] .......... Clinic detail & plan management
│   ├── /marketing ............. B2B email campaigns
│   ├── /daily-report .......... Activity report config
│   ├── /notifications ......... Push notifications to clinics
│   ├── /health ................ Clinic health monitoring (scores)
│   ├── /audit-log ............. Super admin action audit trail
│   ├── /whatsapp .............. WhatsApp monitoring dashboard (NEW)
│   └── /settings .............. Trial, pricing, features, branding
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
| Messaging | Meta WhatsApp Cloud API (direct) |
| Hosting | Railway (with persistent volume for DB) |
| Source | GitHub (ayurcentresg-debug/ayurgate) |

---

*Last updated: 15 April 2026 (Session 17)*
