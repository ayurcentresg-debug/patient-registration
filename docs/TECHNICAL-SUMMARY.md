# AyurGate — Technical Summary

**Multi-tenant B2B clinic management SaaS for Ayurveda & wellness practices.**
Host: Railway · Domain: www.ayurgate.com · Production: 11 clinics currently live.

_Last updated: 2026-04-22_

---

## 1. Project Structure

**Stack:** Next.js 16.2.1 App Router, React 19.2.4, TypeScript 5, Tailwind CSS 4, Prisma 7.5 (SQLite), Node runtime.

```
patient-registration/
├── prisma/
│   ├── schema.prisma           # 64 models
│   ├── migrations/             # 11 migrations
│   └── seed-demo.ts
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing (/)
│   │   ├── api/                # 164 route handlers
│   │   ├── (feature pages)/    # See §5
│   ├── components/             # 25 shared components
│   ├── lib/                    # 25 helpers
│   ├── middleware.ts           # Tenant + auth + RBAC gating
│   └── generated/prisma/       # Prisma client (committed)
├── docs/PROJECT-LOG.md
└── package.json
```

**Key files**

| File | Purpose |
|------|---------|
| `src/middleware.ts` | CSRF, rate limiting, auth redirect, RBAC, feature flags, country gating |
| `src/lib/permissions.ts` | 3-tier RBAC stack (code defaults → clinic overrides → user overrides) + built-in templates |
| `src/lib/tenant-db.ts` | Per-clinic Prisma client for tenant isolation |
| `src/lib/auth.ts` | JWT create/verify via `jose`, bcrypt password hashing |
| `src/lib/country-data.ts` | Country list + `isPayrollCountry()` gate for CPF/EPF/SOCSO |
| `src/components/LayoutShell.tsx` | Route-aware layout switcher + provider composition |
| `src/components/Sidebar.tsx` | Desktop left nav + mobile top header |
| `src/components/AuthProvider.tsx` | Exposes `user`, `rolePermissions`, `userPermissions`, `clinicCountry` to client |

---

## 2. Database Models (Prisma, SQLite)

**64 models total.** Full text in `prisma/schema.prisma`. Key domains:

### Core tenancy
| Model | Purpose |
|-------|---------|
| `Clinic` | Tenant. 42 lines. Fields include `slug` (unique), `country`, `currency`, `timezone`, `logoUrl`, `rolePermissions` (JSON), `onboardingComplete`, `emailVerified`. Has `subscription`, `onboarding`, `permissionTemplates` relations. |
| `ClinicSubscription` | Stripe plan state per clinic |
| `OnboardingProgress` | Setup-checklist state |
| `PlatformSettings` | Global (super-admin) config |
| `PermissionTemplate` | Custom permission presets per clinic. `scope: "role"|"user"`, `perms` JSON |

### Users & staff
| Model | Notes |
|-------|-------|
| `User` | 83 lines. Role-based. Fields: `role`, `isActive`, `status`, `clinicId`, `staffIdNumber`, HR/MOM fields (`employmentType`, `weeklyContractedHours`, `isWorkman`, `residencyStatus`, `prStartDate`…), TOTP (`totpSecret`, `totpEnabled`), `permissionOverrides` (JSON), `inviteToken` (globally unique) |
| `StaffLeave` | Leave requests with status lifecycle |
| `StaffDocument` | Doc uploads (licenses, certs), `expiryDate` |
| `SalaryConfig` | Per-user salary rules (SG/MY) |
| `Payroll` | Generated payslips |
| `KeyEmploymentTerms` | MOM KET records |
| `CommissionRule` / `CommissionPayout` | Doctor/therapist commissions |

### Patients & clinical
| Model | Purpose |
|-------|---------|
| `Patient` | 67 lines. `patientIdNumber` unique per clinic, demographics, NRIC/FIN, conditions JSON, insurance |
| `FamilyMember` | Dependent patients |
| `Appointment` | date/time/doctorId, `status` lifecycle, walk-in fields |
| `Waitlist` | Status: waiting/notified/booked/expired/cancelled |
| `ClinicalNote` / `Vital` / `Document` | EMR |
| `Prescription` + `PrescriptionItem` | Rx + line items, convertible to invoice |
| `Treatment` + `TreatmentPackage` | Ayurveda treatments + session packages |
| `TreatmentPlan` + `TreatmentPlanItem` + `TreatmentMilestone` | Patient plans |
| `PatientPackage` + `PackageSession` + `PackageShare` + `PackageRefund` | Sold packages & sessions |

### Billing
`Invoice` + `InvoiceItem` + `Payment` + `InsuranceProvider` + `InsuranceClaim` + `CreditNote`

### Inventory (multi-branch)
`InventoryItem` + `InventoryVariant` + `StockTransaction` + `Supplier` + `PurchaseOrder` + `PurchaseOrderItem` + `Branch` + `BranchStock` + `StockTransfer` + `StockTransferItem` + `TransferTemplate` + `TransferTemplateItem`

### Communications
`Communication` + `MessageTemplate` + `Reminder` + `WhatsAppMessage` + `Feedback` + `Notification`

### CME (6 models, not yet user-facing — Phase 1 pending)
`CmeEvent` · `CmeSpeaker` · `CmeEventSpeaker` · `CmeSession` · `CmeRegistration` · `CmeCertificate`

### Audit
`AuditLog` · `SuperAdminAuditLog`

### Migrations (11 applied)
Initial: `20260325034829_init`
Then: practo_fields → clinical_notes/documents → doctor_model → walkin_fields → doctor_role → doctor_gender → inventory_management → billing_system → treatments_and_packages → family_members
**Note:** Production uses `prisma db push` (not `migrate deploy`) — see `package.json start` script.

---

## 3. API Endpoints

**164 route handlers** grouped by feature. Each handler exports one or more HTTP methods.

### Auth (`/api/auth/*`)
| Path | Purpose |
|------|---------|
| `POST /login` · `POST /logout` · `GET /me` | Session lifecycle. `/me` returns user + rolePermissions + userPermissions + clinicCountry |
| `POST /forgot-password` · `POST /reset-password` · `POST /change-password` | Password flows |
| `POST /totp-setup` · `POST /totp-verify` · `POST /totp-disable` · `GET /totp-status` | 2FA |
| `GET /google` · `GET /google/callback` · `POST /google/complete` · `GET /google/pending` | Google OAuth |

### Internal (middleware-only)
| Path | Purpose |
|------|---------|
| `GET /api/internal/rbac-perms` | Middleware fetches current user's overrides + country (15s cache) |

### Tenant core
| Domain | Notable endpoints |
|--------|-------------------|
| Patients | `GET/POST /api/patients`, `[id]`, `[id]/family`, `[id]/timeline`, `[id]/photo`, `check-duplicate`, `duplicates`, `merge`, `import` |
| Appointments | `GET/POST /api/appointments`, `[id]`, `affected`, `reassign`, `today` |
| Prescriptions | `GET/POST /api/prescriptions`, `[id]`, `[id]/convert-invoice` |
| Doctors | `/api/doctors`, `[id]`, `[id]/slots`, `available` |
| Staff | `/api/staff`, `[id]`, `[id]/documents`, `[id]/leave`, `[id]/performance`, `[id]/check-availability`, `[id]/resend-invite`, `diagnose`, `fix-schedules`, `import`, `import/template` |
| Clinical | `/api/clinical-notes`, `/api/vitals`, `/api/documents`, `/api/medicines` |
| Branches | `/api/branches`, `[id]`, `stock` |
| Inventory | `/api/inventory`, `[id]/movement`, `[id]/transactions`, `alerts`, `branch-comparison`, `bulk`, `expiry-check`, `import`, `indent`, `lookup`, `stats`, `stock-audit`, `write-off-expired` |
| Purchase Orders | `/api/purchase-orders`, `[id]`, `[id]/receive`, `[id]/status`, `suggestions` |
| Stock transfers | `/api/transfers`, `[id]`, `[id]/cancel`, `[id]/receive`, `[id]/submit`, `/templates`, `/templates/[id]` |
| Suppliers | `/api/suppliers`, `[id]` |
| Billing | `/api/invoices`, `[id]`, `[id]/email`, `[id]/payments`, `generate`, `/billing/stats`, `credit-notes`, `insurance/providers`, `insurance/claims` |
| Treatments | `/api/treatments`, `[id]`, `[id]/packages`, `import`, `seed` |
| Treatment plans | `/api/treatment-plans`, `[id]`, `[id]/items`, `[id]/milestones`, `[id]/progress`, `stats` |
| Packages | `/api/patient-packages`, `[id]`, `[id]/refund`, `[id]/sessions`, `[id]/share`, `active` |
| Communications | `/api/communications`, `bulk`, `/reminders`, `[id]`, `auto-schedule`, `bulk`, `send` |
| WhatsApp | `/api/whatsapp/chat`, `conversations`, `webhook` |
| Templates | `/api/templates`, `[id]`, `preview`, `seed` |
| Reports | `/api/reports`, `insurance`, `inventory`, `transfers` |
| Feedback | `/api/feedback` |
| Waitlist | `/api/waitlist` (modal on /appointments uses this) |

### Admin (clinic-level, gated to ADMIN_ROLES)
| Path | Purpose |
|------|---------|
| `/api/admin/permissions` | GET/PUT clinic role overrides (with audit + diff) |
| `/api/admin/permission-templates` | Custom templates CRUD |
| `/api/admin/payroll` (+ `[id]`, `[id]/payslip`, `[id]/email-payslip`, `bulk-email`, `generate`, `salary-config`, `salary-config/[id]`) | SG/MY payroll |
| `/api/admin/commission` (+ `calculate`, `payouts`, `rules`) | Commission engine |
| `/api/admin/ket` (+ `[id]`, `[id]/html`, `prefill`) | MOM Key Employment Terms |
| `/api/admin/features` | Platform feature flags (super-admin) |

### Super admin (`/api/super-admin/*`)
`audit-log` · `backup` · `bulk` · `clinics/[id]` · `health` · `leads` · `login` · `marketing/send` · `marketing/templates` · `notifications` · `seed-demo` · `settings` · `stats` · `whatsapp`

### Patient portal (`/api/portal/*`)
`auth` · `me` · `appointments` · `invoices` · `prescriptions` · `feedback`

### Public / external
| Path | Purpose |
|------|---------|
| `/api/public/platform` | Platform features + maintenance status |
| `/api/public/clinic/[slug]` · `/api/public/book` · `/api/public/slots` | Online booking widget (`/book/[slug]`) |
| `/api/public/feedback` | Patient feedback from invite link |
| `/api/public/payment` | Payment redirect |
| `/api/public/sample-payslip` | Demo payslip preview |
| `/api/stripe/webhook` · `/api/stripe/checkout` · `/api/stripe/portal` | Subscription billing |
| `/api/whatsapp/webhook` | Meta Cloud API inbound |
| `/api/cron/backup` · `/api/cron/reminders` | Scheduled tasks |
| `/api/daily-report` | Dev summary email |

### Dashboard / utilities
`/api/dashboard`, `dashboard/setup-checklist`, `dashboard/staff-summary`, `notifications`, `audit-logs`, `settings`, `verify-email`, `onboarding`, `onboarding/progress`, `invite/[token]`, `setup-doctor-passwords`, `clinic/register`, `clinic/billing`, `clinic/list`, `clinic/subscription`, `users`, `users/[id]`

**Note:** API routes follow `src/app/api/<path>/route.ts` convention. Exported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. No serializer layer — handlers shape JSON directly.

---

## 4. Authentication & Auth Flow

### Method
**JWT in httpOnly cookie**, signed with HS256 via `jose`.

- Cookie: `auth_token` (tenant users), `super_admin_token` (platform staff), `patient_token` (patient portal)
- Secret: `JWT_SECRET` env var (middleware throws at boot if missing)
- Helpers: `src/lib/auth.ts` → `createToken`, `verifyToken`, `hashPassword` (bcrypt, cost 12), `comparePassword`, `generateOTP`

### JWT payload shape
`{ userId, clinicId, role, name, email, onboardingComplete }`

### User model auth fields
`password` (bcrypt hashed), `isActive`, `status`, `totpSecret`, `totpEnabled`, `inviteToken`, `inviteExpiresAt`, `lastLogin`

### Middleware (`src/middleware.ts`)
Runs on every request. In order:
1. **CSRF defense** — rejects mutating API requests with foreign/absent `Origin`/`Referer`
2. **Rate limiting** — `/api/auth/*` at 10/min/IP, other `/api/*` at 100/min/IP
3. **Super admin routes** — separate JWT (`super_admin_token`)
4. **Public paths** — allowed list (`/login`, `/register`, `/invite`, `/book`, `/api/public/*`, webhooks, etc.)
5. **Patient portal** — separate JWT (`patient_token`)
6. **Maintenance mode + feature flag gating** — platform-wide feature flags via `getFeatureFlags()` (60s cache)
7. **Country gating** — blocks `/admin/payroll`, `/admin/ket`, `/admin/commission` (UI + API) for non-SG/MY clinics
8. **RBAC module check** — `resolveModule(pathname)` → `getUserEffectiveAccess(role, module, clinicOv, userOv)` → 403/redirect if denied. Per-user cache keyed by `userId`, 15s TTL, fetched via `/api/internal/rbac-perms`
9. **Role-based default landing** — doctors/therapists → `/doctor`, everyone else → `/dashboard`

### RBAC — `src/lib/permissions.ts`
- **21 modules:** dashboard, patients, appointments, prescriptions, doctor_portal, inventory, billing, packages, reports, communications, whatsapp, admin_settings, staff_management, payroll, commission, branches, import, feedback, waitlist, security, cme
- **7 roles:** owner, admin, receptionist, doctor, therapist, pharmacist, staff
- **5 access levels:** `full` > `write` > `view` > `own` > `none`
- **3-tier stack:** `User.permissionOverrides` > `Clinic.rolePermissions` > `ROLE_PERMISSIONS` (code default)
- **Helpers:** `parseOverrides`, `parseUserOverrides`, `getEffectiveAccess`, `getUserEffectiveAccess`, `getAccessLevel`, `hasAccess`, `canAccess`, `canWrite`, `canDelete`, `resolveModule`, `getVisibleNavItems`
- **6 built-in templates:** Senior Receptionist, Junior Doctor, Locum Doctor, Billing Specialist, Inventory Manager, Lockdown (role-scoped)
- **Audit:** every save to `Clinic.rolePermissions` or `User.permissionOverrides` logs a `clinic_permissions` / `user_permissions` AuditLog row with before/after diffs

---

## 5. Frontend Pages & Components

### Tenant pages (~60)
| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/login`, `/register`, `/invite/[token]`, `/onboarding`, `/onboarding/dashboard`, `/pricing`, `/terms`, `/privacy` | Public / signup |
| `/dashboard` | Home for admins/staff |
| `/doctor` · `/doctor/consult/[id]` | Doctor portal (own view) |
| `/patients` · `/patients/new` · `/patients/[id]` | Patient registry & profile |
| `/appointments` · `/appointments/new` | Booking (Waitlist modal inside) |
| `/packages` · `/packages/new` · `/packages/[id]` | Patient packages |
| `/prescriptions` | Rx list |
| `/inventory` · `/inventory/new` · `/inventory/[id]` · `/inventory/alerts` · `/inventory/branch-stock` · `/inventory/import` · `/inventory/reports` · `/inventory/stock-audit` · `/inventory/suppliers` · `/inventory/purchase-orders` (+ new, [id]) · `/inventory/transfers` (+ new, [id]) | Inventory module |
| `/billing` · `/billing/new` · `/billing/[id]` · `/billing/insurance` · `/billing/insurance/providers` | Billing |
| `/communications` · `/communications/bulk` · `/communications/reminders` · `/communications/templates` · `/communications/whatsapp` | Messaging |
| `/treatments` · `/treatments/plans` (+ new, [id]) · `/treatments/progress` | Treatment plans |
| `/doctors` · `/doctors/new` · `/doctors/[id]`, `/therapists` · `/therapists/new` · `/therapists/[id]` | Clinical staff (admin view) |
| `/reports`, `/feedback` | |
| `/admin/*` | Settings, staff, branches, permissions, payroll, commission, ket, merge, audit-log, treatments, clinics, users, import |
| `/admin/staff/[id]` (+ edit, hr, payroll, leave, documents, performance, reassign) | HR details |
| `/admin/permissions` | **Role matrix + user list + View-as modal + history** |
| `/account`, `/security`, `/subscription`, `/help`, `/google-setup` | User utilities |
| `/book/[slug]` | **Public online booking** |
| `/portal` · `/portal/login` | Patient portal |
| `/review` | Patient feedback submission |

### Super admin (`/super-admin/*`)
`/login`, `/` (dashboard), `/clinics` (+ [id]), `/audit-log`, `/backup`, `/daily-report`, `/health`, `/marketing`, `/notifications`, `/settings`, `/whatsapp`

### Key components (25)
| Component | Purpose |
|-----------|---------|
| `LayoutShell.tsx` | Route-aware provider composition (Theme, Auth, FlashCard, Confirm, ErrorBoundary) |
| `Sidebar.tsx` | Desktop left nav + mobile top header (white as of commit 8d73039) |
| `AuthProvider.tsx` | `useAuth()` exposing user + rolePermissions + userPermissions + clinicCountry |
| `FlashCard.tsx` + `FlashCardProvider.tsx` | 4-variant Ayurvedic-themed notifications with SVG illustrations |
| `ConfirmDialog.tsx` | Matching-style dialog + Promise-based `useConfirm()` hook |
| `WaitlistModal.tsx` | 480px modal opened from `/appointments` |
| `BranchSelector.tsx` | Header dropdown (hidden when < 2 branches) |
| `AdminTabs.tsx` | Nav under `/admin/*` (hides Payroll/KET/Commission for non-SG/MY) |
| `BillingTabs.tsx`, `InventoryTabs.tsx`, `CommunicationTabs.tsx`, `TreatmentTabs.tsx` | Feature sub-nav |
| `DashboardCharts.tsx` (Recharts), `StatsCard.tsx`, `Skeleton.tsx` | Dashboards & loading |
| `HelpTip.tsx` | Hover tooltips + inline `SectionNote` (PageGuide exported but no longer used — ref 3e1d5d2) |
| `BarcodeScanner.tsx` | Inventory stock-in |
| `TrialBanner.tsx`, `StatusBanner.tsx`, `EmailVerifyBanner.tsx` | Top banners |
| `ThemeProvider.tsx` | Dark/light toggle |
| `ErrorBoundary.tsx` | Page-level error UI |
| `SuperAdminSidebar.tsx` | Platform nav |
| `Toast.tsx` | Legacy; superseded by FlashCard (kept for backward compat) |

### Forms — notable field names
- **Patient** (`/patients/new`): firstName, lastName, gender, dateOfBirth, phone, email, nricFin, address, city, postalCode, conditions, medicalHistory, insuranceProvider, insurancePolicyNumber
- **Staff** (`/admin/staff/new`): name, email, role, staffIdNumber, gender, residencyStatus, employmentType, weeklyContractedHours, salary, CPF fields (SG), MOM KET fields
- **Invoice** (`/billing/new`): patientId, items[{description, quantity, unitPrice, discount, tax}], paymentMethod, insurance
- **Appointment** (`/appointments/new`): patientId, doctorId, date, time, type, reason, duration, isWalkin, walkinName, walkinPhone
- **Waitlist** (modal): patientName, patientPhone, patientEmail, doctorName, preferredDate, preferredTime, treatmentName, reason, priority, notes

---

## 6. Third-party Integrations

| Package | Purpose | Env vars |
|---------|---------|----------|
| **Stripe** (`stripe ^21`) | Subscription billing, `/api/stripe/checkout`, `/portal`, `/webhook` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_MONTHLY`/`_ANNUAL`, `STRIPE_PRICE_PROFESSIONAL_MONTHLY`/`_ANNUAL` |
| **Resend** (`resend ^6`) | Transactional email | `RESEND_API_KEY`, `EMAIL_FROM` |
| **Nodemailer** (`^8`) + custom SMTP | Marketing email | `MARKETING_SMTP_HOST/PORT/USER/PASS`, `MARKETING_EMAIL_FROM`, `SMTP_*` |
| **Twilio** (`^5`) | SMS + WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_NUMBER`, `TWILIO_WHATSAPP_NUMBER` |
| **Meta WhatsApp Cloud API** | Direct WhatsApp chat | `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_PHONE_NUMBER`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET` |
| **Google OAuth** | Social login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **jose** (`^6`) | JWT sign/verify (edge-compatible) | `JWT_SECRET` |
| **bcrypt** (via `bcryptjs`) | Password hashing | — |
| **otpauth** (`^9`) + **qrcode** (`^1`) | TOTP 2FA | — |
| **Recharts** (`^3`) | Dashboard charts | — |
| **Prisma** (`^7.5`) | ORM (SQLite) | `DATABASE_URL` |

---

## 7. Environment & Config

### Tech stack (confirmed from `package.json`)
```
next:            16.2.1
react:           19.2.4
@prisma/client:  ^7.5.0
prisma:          ^7.5.0
typescript:      ^5
tailwindcss:     ^4
```

### Database
- **Provider:** SQLite (`prisma/schema.prisma` → `provider = "sqlite"`)
- **Connection:** `DATABASE_URL` → `"file:./dev.db"` on dev, file path on Railway volume in prod
- **Migration strategy:** `prisma db push` runs on every deploy (see `npm start`). Formal migrations exist in `prisma/migrations/` for reference but aren't used on prod.

### Hosting
- **Railway.** Push to GitHub `main` → auto-deploy.
- **Start script:** `npx prisma db push && npx tsx scripts/migrate-to-multitenant.ts && next start`
- **Build script:** `prisma generate && next build`

### Env variables (keys only)
```
# Core
DATABASE_URL
JWT_SECRET
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NODE_ENV
DB_PATH                         # optional, for SQLite path override

# Email
RESEND_API_KEY
EMAIL_FROM
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
MARKETING_SMTP_HOST, MARKETING_SMTP_PORT, MARKETING_SMTP_USER, MARKETING_SMTP_PASS
MARKETING_EMAIL_FROM

# Payments (Stripe)
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_MONTHLY / _ANNUAL
STRIPE_PRICE_PROFESSIONAL_MONTHLY / _ANNUAL
STRIPE_PRICE_ENTERPRISE         # in .env.example but not referenced in code yet

# SMS / WhatsApp (Twilio)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_NUMBER
TWILIO_WHATSAPP_NUMBER

# WhatsApp Cloud API (Meta)
WA_ACCESS_TOKEN
WA_PHONE_NUMBER_ID
WA_PHONE_NUMBER
WA_VERIFY_TOKEN
WA_APP_SECRET

# Google OAuth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Platform ops
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
ADMIN_NOTIFICATION_EMAIL
CRON_SECRET
DAILY_REPORT_EMAIL
BACKUP_S*                       # backup storage config (S3-style)
```

---

## 8. What's Working · Partial · Known Issues

### 📍 Current status
- **Production live on Railway** at www.ayurgate.com — since March/April 2026
- **11 clinics using it in production** (e.g. Ayur Centre Pte. Ltd., Tejas Ayurvedic, CLIRAA Wellness Pte. Ltd., Demo Clinic Singapore, and 7 others)
- **Auto-deploy:** push to GitHub `main` → Railway builds & deploys in 3-5 min
- **Local dev:** runs at `localhost:3000`, uses same SQLite schema via `prisma db push`
- **No staging environment** — main branch goes straight from dev → production

### ✅ What's working end-to-end (verified in production)

| Workflow | End-to-end flow |
|----------|-----------------|
| **Signup + first-clinic setup** | Public registration → email verification → onboarding wizard → dashboard |
| **Login + 2FA** | Email/password → optional TOTP code → session cookie → dashboard |
| **Google OAuth login** | Google consent → callback → existing user sign-in OR new-clinic completion flow |
| **Patient registration** | Walk-in or portal → `/patients/new` → patient profile with auto-generated ID (P10001) |
| **Appointment booking** | Front desk clicks Walk-in/Book → patient + doctor + slot → saved → appears in Today list |
| **Public online booking** | Patient visits `/book/[slug]` → picks doctor/slot → contact info → appointment created |
| **EMR** | Doctor opens patient → clinical notes, vitals, documents, prescriptions → all persisted |
| **Billing** | New invoice from patient or appt → line items → record payment (cash/card/UPI) → partial payments supported |
| **Insurance claims** | Link invoice → provider → claim status tracking |
| **Inventory** | Add item → track stock → auto-alerts when below reorder → POs → receive → transfers between branches |
| **Prescriptions → Invoice** | Doctor writes Rx → pharmacist converts to invoice in one click |
| **Communications** | SMS + WhatsApp (Twilio + Meta Cloud) + email via Resend; bulk send; auto-reminders via cron |
| **Packages** | Sell treatment packages → track sessions consumed → share across family → refunds |
| **Payroll** (SG/MY only) | Salary config per user → generate monthly payslip (CPF/EPF/SOCSO auto-calc) → email PDF |
| **Commission** | Rules per doctor → calculate on invoice → monthly payouts |
| **RBAC** | Code defaults → clinic role overrides → per-user overrides → middleware enforces within 15s |
| **Permission templates** | 6 built-in + custom per-clinic (Senior Receptionist, Junior Doctor, etc.) |
| **Super admin** | Platform staff login → manage all clinics, health, backups, leads, marketing |
| **Patient portal** | Patient logs in → sees own appointments, invoices, prescriptions; submits feedback |
| **Subscription billing** | Stripe checkout → webhook → `ClinicSubscription` updated → trial countdown banner |
| **Audit log** | Every create/update/delete + permission change logged with diffs |
| **Daily cron** | Backup (hourly), reminders (scheduled), daily dev email report |

### ⚠️ What's partial or stubbed

| Area | Status | Notes |
|------|--------|-------|
| **CME module** | Schema only, no UI/API | 6 Prisma models (`CmeEvent`, `CmeSpeaker`, `CmeEventSpeaker`, `CmeSession`, `CmeRegistration`, `CmeCertificate`) exist but nothing user-facing built yet. Documented in `docs/CME-PLATFORM-PLAN.md`. Marked Phase 1 priority. |
| **Jobs portal** | Not started | Separate product on own domain, deferred until after CME Phase 1 |
| **PageGuide component** | Orphaned | Component code in `HelpTip.tsx` but removed from all 8 pages (commit `3e1d5d2`). Safe to delete in cleanup sweep. |
| **Toast component** | Legacy | `src/components/Toast.tsx` exists but replaced by FlashCard. No imports remain in `src/app/`. |
| **Prisma migrations** | Drifted | `prisma/migrations/` has 11 historical migrations. Production uses `prisma db push` on start (not `migrate deploy`), so migrations aren't kept current. Schema changes since March still sync correctly via `db push`. |
| **Toolbar cleanup on /appointments** | Pending decision | Row 1 has duplicate navigation arrows, Schedule title duplicates date. User flagged "top toolbar is hiding something". Proposals pending. |
| **Waitlist button location** | Pending | User considering moving it from Row 2 to Row 1 (top toolbar). No commit yet. |
| **Merge Duplicates move** | Pending | User wants to move from admin tabs to a button on `/patients` page. No commit yet. |

### 🐛 Known issues / recent fixes

| Issue | Status | Detail |
|-------|--------|--------|
| **Dr. R. Indusekhar missing from appointment dropdown at CLIRAA Wellness** | ✅ Fixed (verify pending) | Root cause: middleware `/api/doctor` prefix was catching `/api/doctors` (403'd the whole endpoint). Fixed in commit `1f34ad3`. |
| **"No doctors available" error misleading** | ✅ Fixed | Previously said "Add one in Admin panel" even when doctors existed but API was broken. Now distinguishes 0 doctors vs all inactive. Commit `03145d3`. |
| **status vs isActive field drift on User** | ✅ Fixed | Deactivate/Reactivate button now syncs both columns (commit `1bd73bf`). Doctor dropdown filters on `isActive` instead of legacy `status`. |
| **CLIRAA clinic used production Calendar page** | ✅ Removed | Commit `aa5a702` deleted `/appointments/calendar` entirely. If user pastes old URL → 404. |
| **Payroll features shown to India clinics** | ✅ Fixed | Commit `45de8e8` gates Payroll/KET/Commission to SG/MY only (both UI and middleware). |
| **Mobile header dark green reported as "heavy"** | ✅ Changed | Commit `8d73039` swapped mobile top bar to white (desktop sidebar unchanged). |
| **Schema drift between dev and prod** | ⚠️ Ongoing | `prisma db push` on deploy means schema changes apply automatically but aren't tracked as migrations. Low risk today but could bite during future rollbacks. |
| **Orphaned localStorage keys** | ⚠️ Minor | PageGuide dismissal flags and Toast state persist in users' browsers after feature removal. Harmless. |

### 🚫 Not built / explicitly out of scope

- **Desktop native app** — PWA-only
- **Offline mode** — requires online connection
- **Multi-language / i18n** — currently English only
- **SMS OTP for login** — email OTP only (TOTP handles secure 2FA)
- **Insurance auto-adjudication** — manual claim tracking, no payer integration
- **Tally/Zoho integration** for India clinics' payroll — intentional; they use those tools directly

### 📦 Recent commits (last 20)
```
8d73039  ui(mobile-header): change top bar from dark green to white
3e1d5d2  chore(ui): remove PageGuide banners from all 8 pages
c8678ec  feat(waitlist): convert /waitlist standalone page to modal on /appointments
1f34ad3  fix(rbac): middleware prefix-match broken — /api/doctors blocked by /api/doctor rule
03145d3  ui(appointments): clearer 'no practitioners' message distinguishes cause
1bd73bf  fix(doctors): appointment dropdown now uses isActive instead of legacy status
aa5a702  chore(appointments): remove Calendar grid view — keep Appts list only
45de8e8  feat(payroll): gate CPF/EPF/SOCSO tabs + routes to Singapore/Malaysia only
a1cd04b  feat(rbac): permission templates — built-in presets + custom clinic templates
4053d1d  feat(rbac): audit log for role + user permission changes with before/after diffs
010a785  feat(rbac): middleware enforces clinic + user permission overrides
c0f1df3  feat(rbac): per-user permission overrides (Option 3)
f7ea430  feat(rbac): editable role matrix — per-clinic permission overrides
baaaabc  feat(admin): new Permissions & Access page with role matrix, user list, and View-as modal
1ac7945  feat(diagnose): add /api/staff/diagnose for appointment visibility issues
207b00f  fix(critical): stop wiping patient data on every deploy
e1e54a5  docs: complete CME platform plan for separate domain rollout
a8b6254  fix(seed-demo): add default schedules to demo doctors/therapists
ca340dc  fix(schedules): remove null from schedule filter (field is never null)
5e17166  fix(staff): apply default schedule so new doctors/therapists are bookable
```
