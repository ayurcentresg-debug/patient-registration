# AyurGate — Complete Feature Catalog

**Last updated:** 2026-04-27
**Status:** Living document — append to this whenever a new feature ships.
**Audience:** Internal team (sales, demos, investor pitches), AyurGate owners.

> **How to use this doc**
> - Browsing the product capabilities → start at the [Top 10 Selling Points](#-top-10-selling-points)
> - Demo to a clinic owner → use the [Module-by-module catalog](#-module-by-module-catalog)
> - Investor / pitch deck → use [Differentiators](#-key-differentiators)
> - Filling a feature gap → check [What's NOT yet built](#-whats-not-yet-built)

---

## 🏆 Top 10 Selling Points

These are the marketable headlines — copy/paste into pitch decks, LinkedIn, sales emails.

1. **Multi-branch out of the box** — one patient record across all your locations; book at any branch; transfer inventory between branches; per-branch revenue & doctor utilization reports.
2. **Made for Ayurveda** — built-in support for Panchakarma packages, treatment series (10/15/20-session), therapy room scheduling, and traditional medicine inventory (Thailam, Choornam, Leham, Ghritam categories).
3. **Smart inventory** — fast-moving + slow-moving analytics, expiry-aware purchase suggestions, low-stock alerts, branch-to-branch stock transfers, and one-click write-off of expired items.
4. **Family-aware patient management** — bidirectional family links (Ravi → Arjun as son auto-links Arjun → Ravi as father). Family balances visible from any member's profile.
5. **Front-desk efficiency** — drag-and-drop calendar, hover-to-preview tooltips, right-click context menu (8 quick actions), 1-click check-in, instant WhatsApp reminders.
6. **Singapore-ready payroll** — CPF auto-calc with age-tier rates, SDL, FWL, ethnicity-based SHG funds, PR graduated rates, KET (Key Employment Terms) generator, employee onboarding workflow.
7. **Insurance integration** — claim submission, status tracking, settlement reconciliation, and approval rate dashboards.
8. **Granular role-based permissions** — 21 modules × 7 roles × 5 access levels; per-clinic role overrides + per-user overrides; permission audit trail.
9. **WhatsApp Business + Email + SMS reminders** — auto-scheduled appointment reminders, custom templates, bulk messaging campaigns, conversation history per patient.
10. **Patient self-service** — secure patient portal for viewing appointments, downloading prescriptions/invoices, scheduling new visits.

---

## 🎯 Key Differentiators

Why AyurGate vs Practo / Cliniko / generic clinic software:

| Feature | AyurGate | Generic clinic software |
|---|---|---|
| Multi-session **package** sales (Panchakarma 7-day, etc.) | ✅ Native model + auto session deduction | ❌ Workarounds only |
| **Ayurveda-specific** medicine categories (Thailam, Choornam, Leham, Ghritam) | ✅ Built in | ❌ Generic "medicine" |
| Per-branch **package redemption** | ✅ Buy at A, use at B | ❌ Branch-locked |
| **Therapy room** + therapist scheduling (separate from doctor) | ✅ | ⚠️ Partial |
| **Bidirectional family links** (auto-reciprocal) | ✅ | ❌ Manual entry both sides |
| Singapore **CPF / KET / SDL** payroll | ✅ | ❌ Generic payroll only |
| Drag-and-drop calendar with **conflict detection** | ✅ | ⚠️ |
| **3-tier permission overrides** (code → clinic → user) | ✅ | ⚠️ Role-based only |

---

## 📦 Module-by-Module Catalog

### 🏥 1. Patient Management

**Registration & Profile**
- Quick patient registration (10 required fields, rest optional)
- Auto-generated patient ID (PT-0001 format, sequential per clinic)
- Photo upload, blood group, allergies, emergency contact
- Singapore-specific: NRIC/FIN, ethnicity, residency status
- Personal history, medical history, surgical history
- Document attachments (X-rays, lab reports, prescriptions, ID)

**Search & Discovery**
- Live search across name, phone, NRIC, patient ID
- Multi-filter: gender, status (active / inactive / archived)
- Sortable table (name, registration date, status, gender)
- Patient list pagination (50 per page, server-side)
- CSV export

**Family Management**
- Bidirectional family links (10 relation types: spouse, parent, child, sibling, grandparent, grandchild, uncle/aunt, nephew/niece, cousin, other)
- Auto-creates reverse link when forward link is added
- Gender-aware labels (Husband/Wife, Son/Daughter, Father/Mother, Uncle/Aunt)
- Family balances (outstanding invoices across all members)
- Free-text family members (for relatives not registered as patients)

**Patient Sharing & Access Control**
- Share patient access between staff members
- Audit trail of who viewed each patient profile

**Patient Portal (self-service)**
- Patient login → view their own appointments
- Download own prescriptions and invoices
- Book new appointments
- View visit history across branches

---

### 📅 2. Appointments & Calendar

**Booking flow**
- Existing-patient booking (search by name/phone)
- Walk-in booking (capture name + phone, register later)
- Recurring bookings (weekly / bi-weekly / monthly, up to 52 occurrences)
- Treatment + package selector inside booking modal
- Auto session-price + discount calculation
- Doctor / therapist filter by gender preference
- Walk-in package restriction (first-time walk-ins must do a single session before buying packages)

**Calendar views**
- **Day / Week / 5-Day / Month** views
- **Fit-to-screen** dynamic row height (no scroll for last 2 hours)
- **Red current-time indicator** that updates every 60s
- **Side-by-side overlap layout** when 2+ appointments share a time slot
- **Drag-and-drop reschedule** with snap-to-15-min grid + automatic conflict detection
- **Copy / paste / duplicate** appointment to a new time slot
- **24-Hour mode** toggle (vs default 8 AM–8 PM)
- **Color-by-status** with strikethrough for cancelled
- **Hover info panel** — patient name, phone, treatment, doctor, status, price
- **Right-click context menu** — 8 actions: Open Details / Duplicate / Mark Confirmed / In-Progress / Completed / Copy Phone / Send WhatsApp / Mark No-Show / Cancel
- **Quick actions on each card** (hover) — ✓ Check-in, 📱 WhatsApp reminder
- **Keyboard shortcut**: Esc cancels paste mode / closes menus
- **More menu** popover with: Show Cancelled toggle, 24 Hours toggle, Print Schedule, Resync, Add Doctor link
- Minicalendar in left sidebar for date navigation
- Right "Today's Schedule" sidebar with hideable scroll

**Per-day stats panel**
- Today's Appointments / In Progress / Confirmed / This Week stat cards above the toolbar
- Per-status counter grid (Scheduled / Waiting / Engaged / Done / No-Show / Cancelled)
- No-Show follow-up section with View / WhatsApp / Reschedule per row
- Today's quick-action sidebar — Check-in / Start / Done / Move per appointment

**Status workflow**
- 6 statuses: scheduled → confirmed → in-progress → completed (or cancelled / no-show)
- Manual status change via right-click menu, dropdown, or quick-action button
- Auto-status update when invoice is paid (completed → paid)

**Search & filtering**
- Cross-clinic appointment search by patient name, doctor, reason, walk-in name
- Date range filter (custom, today, this week, this month, this quarter, this year)
- Branch filter (multi-branch clinics)

**Waitlist**
- Patient on waitlist with preferred date / time / doctor / treatment
- Priority levels (normal / high / urgent)
- Auto-notify when slot opens
- Convert waitlist entry → appointment in 1 click
- Auto-expire after configurable days
- Modal-based UX (480px) accessible from Appointments page or `?waitlist=open` URL

**Multi-branch (Phase 1)**
- Each appointment tagged with branch
- Calendar auto-filters when branch is switched in BranchSelector
- Doctor list filters by branch (+ floating staff with no primary branch)
- New bookings auto-tagged with selected branch
- Per-branch reporting (already wired via Invoice.branchId)

---

### 👨‍⚕️ 3. Doctors / Therapists / Staff

**Roles supported**
- Doctor (Ayurvedic Physician, Senior Ayurvedic Physician)
- Therapist (Senior, Ayurvedic, Massage)
- Pharmacist
- Receptionist
- Admin
- Staff (generic)

**Staff record fields**
- Name, email, phone, photo, gender, DOB
- Staff ID (D10001 / T10001 / P10001 / R10001 / A10001 / S10001 prefix per role)
- Singapore: NRIC/FIN, residency status, ethnicity, PR start date
- Job title, main duties (for KET)
- Employment type (full-time / part-time), workman flag, weekly hours, working days/week
- Specialization, department, consultation fee
- Schedule (weekly hours JSON: per-day shift slots)
- Slot duration (default 30 min)
- Date of joining, last working date, resignation date + reason
- Branch assignment (primary branch — for multi-branch clinics)

**Onboarding new staff**
- Email invite with secure token (auto-expires)
- Staff sets own password on first login
- 2FA (TOTP/Google Authenticator) support

**Staff leave management**
- Annual / sick / maternity / paternity leave tracking
- Multi-day leave with approval workflow
- Leave history per staff member

**Staff documents**
- Upload work permits, ID copies, contracts
- Expiry tracking (auto-flag expiring docs)

**Doctor portal (separate UI)**
- Doctor logs in → sees only their schedule
- Today's appointments dashboard
- Quick check-in / start session / mark complete
- Patient list (only patients seen by this doctor)
- Prescriptions module
- Clinical notes per appointment

**Commission tracking**
- Per-treatment / per-package commission rules
- Auto-calc commission on invoice payment
- Monthly commission payout reports

---

### 💊 4. Inventory & Pharmacy

**Item catalog**
- Categories: oil / herb / medicine / consumable / equipment
- Sub-categories (Ayurveda-specific): Thailam, Choornam, Leham, Ghritam
- Variants per item (e.g. 100ml / 200ml of same oil)
- Unit (bottle, packet, nos, etc.) with unit price
- HSN code for GST compliance
- Batch number + expiry date tracking
- Auto-generated item codes

**Stock tracking**
- Current stock + reorder level per item
- Low-stock alerts dashboard
- Expiry alerts (3-month, 1-month, expired)
- Stock transactions (in / out / adjustment / write-off / transfer)
- Stock audit (full inventory count workflow)
- Branch-level stock (multi-branch: each branch has own stock counts)

**Smart features**
- **Fast-moving / slow-moving analysis** (top sellers, dead stock)
- **Expiry-aware purchase suggestions** (don't reorder items with months of stock left)
- **Auto write-off of expired stock** (1-click)
- **Branch comparison** (which branch sells more of what)
- **Indent/requisition** workflow (store requests stock from central)
- **Bulk import** from CSV (initial stock load)

**Suppliers**
- Supplier directory (name, contact, GST number, address, payment terms)
- Per-supplier purchase history
- Outstanding payable tracking

**Purchase orders**
- Create PO with multi-item line items + auto totals
- Track PO status (draft / sent / partial / received / closed)
- Auto-update stock on PO receipt
- Print PO as PDF

**Stock transfers (multi-branch)**
- Transfer stock from Branch A → Branch B
- Transfer templates (e.g. "Weekly restock from Main")
- Auto-update both source and destination stock
- Transfer history report

**Reports**
- Current stock value per branch
- Top-selling items (revenue + units)
- Slow-movers report
- Expiry timeline (next 30 / 60 / 90 days)
- Per-category breakdown
- CSV export of any view

---

### 🌿 5. Treatments & Packages

**Treatment catalog**
- Treatment master list (Abhyangam, Shirodhara, Panchakarma, etc.)
- Categories (panchakarma / massage / detox / specialty / consultation / therapy / medicine / procedure / lab)
- Duration + base price per treatment
- Active / inactive flag

**Treatment packages**
- Multi-session packages (e.g. "10-Session Abhyangam Package")
- Auto-calculated total + per-session price + discount %
- Active / inactive flag

**Patient packages (purchases)**
- Patient buys a package → creates `PatientPackage` instance
- Auto-numbered (PKG-YYYYMM-XXXX)
- Sessions remaining counter
- Expiry date (configurable)
- Used sessions tracked individually

**Package sharing**
- Share a package across family members (e.g. mom buys 10 sessions, son uses some)
- Per-share allocation tracking
- Audit log of who used what

**Package usage**
- Auto-deduct session when appointment marked completed
- Manual session marking
- Per-session date + appointment link

**Package refunds**
- Partial refund of unused sessions
- Refund amount auto-calc based on price-per-session

**Cross-branch package usage** (NEW)
- Buy package at Branch A, use sessions at Branch B
- Per-branch session usage report (which branch uses Patient X's package most)

**Treatment plans**
- Doctor creates a multi-stage treatment plan for a patient
- Plan items (e.g. "Week 1: Abhyangam x 3, Week 2: Shirodhara x 5")
- Milestones with progress tracking
- Status: planned / in-progress / completed

---

### 💰 6. Billing & Invoicing

**Invoice creation**
- From appointment (1-click "Generate Invoice" when status=completed)
- Manual invoice (any combination of treatments, medicines, packages)
- Multi-line items with quantity + unit price
- Auto-numbered (INV-YYYYMM-XXXX)
- Auto-calc subtotal + discount + GST + total

**GST / tax**
- Configurable per clinic (rate, registration number)
- CGST + SGST (interstate) + IGST split
- GST summary per invoice
- GSTR-ready exports

**Discounts**
- % or flat amount per invoice
- Per-line-item discount
- Reason field for audit

**Payment recording**
- Multiple payments per invoice (split payment)
- Methods: Cash / Card / UPI / Bank Transfer / Insurance / Mixed
- Auto-update invoice status (pending → partially_paid → paid)
- Payment history per invoice

**Credit notes**
- Issue credit note against an invoice (full or partial)
- Auto-decrement collected revenue
- Print as PDF

**Insurance claims**
- Submit claim against invoice with provider + policy number
- Claim status tracking (submitted / approved / rejected / settled)
- Settlement amount + date
- Approval rate dashboard
- Per-provider analytics

**Outstanding receivables**
- Aging buckets: Current / 30 days / 60 days / 90+ days
- Per-patient outstanding balance
- Family-level outstanding (sum across linked members)
- Auto-reminder for overdue invoices

**Invoice printing**
- Branded PDF (clinic logo, address, GST number)
- Bilingual (English + local)
- Email / WhatsApp invoice in 1 click

**Multi-branch billing**
- Each invoice tagged with branch
- Per-branch revenue report
- Branch-level receivables tracking

---

### 📋 7. Prescriptions & Clinical Notes

**Prescriptions**
- Doctor creates prescription tied to appointment
- Multi-medicine line items: medicine name + dosage + frequency + duration + instructions
- Quick-add from inventory (auto-fills medicine details)
- Print Rx as PDF (with doctor signature, registration number)
- Email / WhatsApp Rx to patient
- Prescription history per patient

**Clinical notes**
- Free-text notes per appointment
- Templates (SOAP, problem-oriented, etc.)
- Per-doctor / per-treatment templates
- Audit trail (who wrote, when modified)

**Vitals**
- Capture per visit: BP, pulse, temp, weight, height, BMI auto-calc
- Trend charts over time
- Visible on patient profile

---

### 📞 8. Communications

**WhatsApp Business**
- Meta WhatsApp Cloud API integration
- Auto-reminder before appointment (24h, 1h)
- Manual send from any patient profile
- Pre-built templates (appointment confirm, reminder, no-show follow-up, invoice, custom)
- Conversation history per patient
- Bulk send to filtered patient list

**Email**
- Resend / Nodemailer integration
- Per-clinic SMTP config (use clinic's email)
- Templates: appointment confirm, reminder, invoice, prescription, marketing
- Bulk email campaigns

**SMS** (Twilio)
- OTP for patient registration
- Appointment reminders (where WhatsApp not preferred)

**Reminders engine**
- Auto-schedule reminder before appointment based on clinic preference
- Multi-channel (WhatsApp + email + SMS)
- Per-patient channel preference
- Cron-based daily reminder dispatch

**Templates**
- Per-clinic template library
- Variables: {{patientName}}, {{date}}, {{time}}, {{doctor}}, {{clinicName}}
- Multi-language support (English + Tamil/Hindi/Malayalam)

---

### 📊 9. Reports & Analytics

**Overview dashboard**
- Total revenue (with trend %)
- Total billed / outstanding
- New patients (with growth %)
- Total appointments / completion rate / no-show rate
- Collection efficiency
- 8 stat cards in 2 rows + sparkline trend

**Revenue reports**
- By date range (week / month / quarter / year / custom)
- By payment method
- By treatment category
- GST summary (CGST / SGST / IGST breakdown)
- Average invoice value
- Outstanding receivables aging

**Doctor / staff performance**
- Per-doctor: total appointments, completion rate, no-show rate, revenue, unique patients
- Per-day average, per-appointment average
- CSV export

**Patient analytics**
- New vs returning
- Per-month growth
- Top patients by spend
- Family clusters

**Treatment analytics**
- Top treatments by revenue + units
- Per-category breakdown
- Treatment package conversion rate

**Inventory reports**
- Low stock items
- Expiring soon (30/60/90 days)
- Top selling items
- Category breakdown
- Stock value per branch

**Insurance reports**
- Claims pipeline (submitted → approved → settled)
- Approval rate per provider
- Settlement turn-around time
- Outstanding claims

**Outstanding (aging)**
- Per-patient overdue invoices
- Bucket: Current / 30 days / 60 days / 90+ days
- Drill-down per invoice

**Appointments analytics**
- Total / Completed / Cancelled / No-show counts
- Walk-in vs scheduled ratio
- By type (consultation / therapy / procedure)
- By status pie chart
- Daily trend (line chart)
- **Peak hours heatmap** (day-of-week × hour-of-day)

**Multi-branch comparison** (partial)
- Per-branch revenue split (already wired)
- Per-branch appointment counts (after Phase 1 backfill)

**Print + export**
- Print-quality PDF
- CSV export per section
- Custom date range

---

### 🏢 10. Multi-Branch Operations

**Branch setup**
- Create unlimited branches per clinic
- Per-branch: name, code, address, phone, email
- Operating hours per branch (JSON)
- Mark "Main Branch" for fallback display
- Active / inactive toggle

**Branch selector (UI)**
- Always-visible chip in desktop sidebar (collapsed icon → expanded full chip on hover)
- Same selector in mobile slide-out drawer
- Selection persists per-tab via localStorage
- Switching reloads visible data instantly

**Cross-branch capabilities**
- ✅ One patient record across all branches
- ✅ Family links work across branches
- ✅ Patient package: buy at A, use at B
- ✅ Per-branch appointment calendar
- ✅ Per-branch doctor assignment (+ floating staff option)
- ✅ Per-branch inventory stock
- ✅ Branch-to-branch stock transfers (with templates)
- ✅ Per-branch revenue (Invoice.branchId)
- ✅ Per-branch consultation log
- ✅ Per-branch notification routing

**Reports per branch**
- Branch revenue split (in main reports)
- Branch comparison view (inventory)
- Per-branch staff utilization

---

### 🔐 11. Authentication & Security

**Login methods**
- Email + password (bcrypt hashed)
- Google OAuth (clinic-level SSO)
- Magic-link invite (for new staff)

**Two-factor auth (2FA)**
- TOTP via Google Authenticator / Authy
- Per-user enable/disable
- QR code setup
- Recovery codes

**Password management**
- Forgot password (email reset link)
- Force password change on first login
- Strong password requirements

**Session security**
- JWT-based session
- Auto-expire after inactivity
- HttpOnly cookies, SameSite, Secure flags

**Rate limiting**
- 500 req/min per IP for general API
- 20 req/min per IP for auth routes
- Brute-force protection on login

**CSRF protection**
- Origin checks on state-changing routes
- Token validation

---

### 🛡️ 12. Role-Based Access Control (RBAC)

**3-tier permission stack**
1. Code defaults — 21 modules × 7 roles × 5 access levels (full / write / view / own / none)
2. Clinic-level role overrides (JSON on Clinic model — admin can customize roles per clinic)
3. Per-user overrides (JSON on User model — fine-tune individual users)

**Modules with permission control (21)**
- Dashboard, Patients, Appointments, Doctors, Therapists, Treatments, Packages, Inventory, Suppliers, Purchase Orders, Stock Transfers, Billing, Insurance, Reports, Communications, Prescriptions, Clinical Notes, Vitals, Admin, Staff, Payroll

**Permission templates**
- 6 built-in templates (Owner, Manager, Doctor, Therapist, Receptionist, Read-only)
- Custom templates per clinic
- Apply template to a role or individual user in 1 click

**Permission audit**
- Full history of every permission change (who, when, before/after diff)
- Filter by user, by date, by clinic
- Visible at /admin/permissions/history

**Middleware enforcement**
- All API routes check permissions on every request
- 15-second cache per user for performance
- Returns 403 with clear "Access denied: missing X access for Y module" message

---

### 💼 13. Subscription & Billing (SaaS layer)

**Plans**
- Trial (7 days free)
- Starter (₹3,999/mo, 10 staff, 500 patients)
- Professional (₹7,999/mo, 25 staff, unlimited patients)
- Custom enterprise

**Billing**
- Stripe integration (cards + UPI for India)
- Auto-invoice generation
- Failed-payment retry
- Subscription cancellation flow

**Trial management**
- Countdown banner (visible in last 5 days)
- Trial-expired blocking modal
- 1-click upgrade buttons

**Usage limits**
- Per-plan max staff, max patients
- Soft limits with upgrade prompt

---

### 👥 14. Onboarding Wizard

**Step-by-step setup**
- Clinic registration (name, type, country, currency, timezone)
- Add first admin user
- Add first doctor / therapist
- Configure operating hours
- Add starter inventory
- Set up branding (logo, color)

**Setup Guide dashboard** (`/onboarding/dashboard`)
- Checklist of essential setup items
- Progress tracking per item
- Accessible from sidebar after first login
- Skip / mark-as-done per item

---

### 📝 15. Audit Logs

**What's tracked**
- Every patient view / edit / delete
- Every appointment status change
- Every invoice modification
- Every payment recorded
- Every permission change (with diff)
- Every staff record change
- Every clinic setting change

**Per-log fields**
- User who performed action
- Action type (CREATE / UPDATE / DELETE / VIEW)
- Entity type + entity ID
- Before / after JSON diff
- IP address + user agent
- Timestamp

**Super-admin audit log**
- Cross-clinic actions by AyurGate team
- Visible at /super-admin/audit-log

---

### 🛍️ 16. Public Booking Page (per clinic)

**Patient-facing URL** (`/book/{clinic-slug}`)
- Public, unauthenticated
- Patient picks treatment → date → time → doctor
- Captures name + phone (creates walk-in or matches existing patient)
- Auto-confirmation via email + WhatsApp
- Mobile-responsive

**Embeddable**
- Per-clinic shareable URL
- Can be embedded in clinic's existing website via iframe

---

### 🧾 17. Singapore Payroll (SG-only)

**CPF auto-calc**
- Age tier rates (4 tiers: <55, 55-60, 60-65, >65)
- Wage type rates (OW vs AW)
- Citizen / PR (1st/2nd/3rd year graduated rates) / FW
- Auto split: Employee / Employer share + total
- Account allocation (OA / SA / MA)

**Other levies / contributions**
- SDL (Skills Development Levy)
- FWL (Foreign Worker Levy) — by sector + skill level
- SHG funds (Chinese Dev Assistance / Mendaki / SINDA / Eurasian) by ethnicity

**Workman Act (Part IV)**
- Auto-flag workmen ($4,500 cap vs $2,600 non-workman)
- Overtime calculation (1.5× / 2× / 3× rates)

**Key Employment Terms (KET)**
- Auto-generate KET letter (compliant with MOM Act)
- Captures: job title, duties, basic salary, allowances, work hours, leave entitlement, termination notice
- Print-ready PDF

**Payroll run**
- Monthly / weekly / fortnightly
- Per-employee payslip
- Aggregate report
- Bank file export (GIRO / FAST)
- IR8A annual income tax preparation

---

### 🎓 18. CME (Continuing Medical Education) — *separate roadmap*

**Note:** AyurCME is being built as a separate product (`~/Desktop/ayurcme-plan.md`) — these models exist in the AyurGate schema as legacy and will be removed.

---

### 🧠 19. Super Admin (Platform Owner)

**Multi-clinic management**
- View all clinics on the platform
- Drill into any clinic's settings
- Suspend / reactivate clinic
- Per-clinic subscription override
- Per-clinic feature flag toggle

**Demo clinic seeding** (for sales demos)
- 1-click create "Demo Clinic Singapore" with full data
- Add 7 demo patients (Menon family + individuals)
- Reset demo passwords back to default
- Backfill family reciprocal links across all clinics
- Show demo credentials panel (copy email / password)

**Health monitoring**
- Service uptime
- Daily report (revenue, signups, churn, errors)
- Backup status

**Marketing**
- Email campaign tooling
- Send to filtered clinic list
- Preview + send

**Notifications**
- Push platform-wide alerts to all clinics
- Filter by plan / region

**Audit**
- Cross-clinic action log
- Filterable by AyurGate staff member

---

### 🛠️ 20. Other Capabilities

- **Feedback collection** — patients leave feedback per visit, dashboard for clinic
- **Practo migration import** — ingest patients + appointments from Practo CSV export
- **Patient package import** — bulk import existing packages
- **Treatment seed templates** — clinic-onboarding starter kit
- **Notifications hub** — bell icon shows new appointments, low stock, expiring docs
- **Help / docs** — in-app help center with searchable articles

---

## ✅ Recently shipped (this week — 27 commits)

- Sprint 1 (8 calendar features): fit-to-screen, red now-line, cancelled toggle, hover panel, top stat cards, check-in button, WhatsApp 1-click, right-click menu
- Sprint 1b (3 features): More menu, drag-and-drop reschedule, copy/paste duplicate
- Sprint 1c (3 features): wider clickable gap on overlap, sidebar toggle, quick-action buttons in Today's Schedule
- Side-by-side overlap layout for simultaneous appointments
- Date dedup on Day view
- More menu position fix (popover escape from overflow)
- Mobile header: clinic logo on left, user avatar on right
- Desktop sidebar: branch selector visible (collapsed icon + expanded chip)
- Bidirectional family reciprocal links (with backfill endpoint)
- Demo seed: additive patient endpoint, password reset endpoint, credentials panel
- API rate limit raised 100 → 500/min
- **Multi-branch Phase 1+2+3** — appointment.branchId, doctor.branchId, calendar refilters by branch, bookings auto-tagged

---

## 🚧 What's NOT yet built (gap list)

Use this when prospects ask "do you have X?" — be honest, then add to roadmap.

**Multi-branch**
- Admin UI to assign doctors to branches (workaround: edit User record directly)
- Backfill endpoint for legacy appointments without branchId
- Branch picker in QuickBookModal (currently auto-uses selected branch)
- Inter-branch appointment transfer workflow

**Mobile**
- Touch-friendly drag-and-drop on calendar (HTML5 drag is desktop-only)
- Offline-first PWA mode
- Native iOS / Android apps

**Reporting**
- Branch-comparison dashboard (Sankey, side-by-side)
- Custom report builder (drag-drop fields)
- Scheduled email of reports (weekly/monthly)
- Patient retention cohort analysis

**Integrations**
- ABDM (Ayushman Bharat Digital Mission) for India
- HSA (Health Sciences Authority) for Singapore
- Google Calendar 2-way sync
- Zoom / Google Meet integration for online consults
- Razorpay (alternative to Stripe for India)
- Tally / Zoho Books accounting export

**Treatment**
- Photo before/after for treatment progress
- Video demonstration library for therapists
- Symptom checker (Ayurveda dosha-based)

**Other**
- iCal feed (so doctors subscribe to own appointments in Google Cal)
- Native online consult (video chat + chat)
- AI-powered next-slot suggestion for new bookings
- Patient kiosk (self-check-in tablet at reception)
- White-label / custom domain per clinic

---

## 📁 How to maintain this doc

**At the end of every session:**
1. Add new features under the appropriate module section
2. Move newly shipped items from "What's NOT yet built" to the relevant section
3. Update "Recently shipped" with the week's commits
4. Bump "Last updated" date at the top

**Before a sales demo:**
1. Review "Top 10 Selling Points"
2. Review the 1-2 modules most relevant to the prospect
3. Practice 2-3 specific scenarios from the catalog

**Before a pitch deck:**
1. Use "Key Differentiators" table
2. Pick 5-7 features from "Top 10" that match investor thesis
3. Cite the live capability count (currently ~200+ features across 20 modules)

---

*This catalog is the single source of truth for "what does AyurGate do". When in doubt, this file wins.*
