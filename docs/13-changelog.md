# AYUR GATE — Changelog

Complete history of all changes, from initial setup to current state.

## Phase 1: Foundation

### Initial Setup
- Created Next.js app with TypeScript and Tailwind CSS
- Full clinic management system: patients, appointments, billing, clinical notes
- Authentication with JWT and 2FA (TOTP)
- SQLite database with Prisma ORM

### Branding
- Rebranded from "PatientReg" to "Ayur Centre Pte. Ltd."
- Later rebranded to "AYUR GATE" as the SaaS platform name

## Phase 2: Staff & Clinical Features

### Staff Management Unification
- Merged separate Doctor model into User model
- All roles in one model: admin, doctor, therapist, pharmacist, receptionist, staff
- Auto-generated staff IDs (D10001, T10001, etc.)
- Email invite system with 7-day token expiry

### Doctor Portal
- Dedicated /doctor route with own dashboard
- Prescriptions with PDF export
- Role-based access control in middleware

### Prescriptions Enhancement
- Standalone Prescriptions page with search and filters
- Medicine categories (Ayurvedic: Kashayam, Choornam, etc.)
- WhatsApp prescription sharing
- Invoice conversion from prescriptions

## Phase 3: Inventory & Multi-Branch

### Inventory System
- Complete inventory management with Ayurvedic categories
- Variant support (different sizes/weights per item)
- Stock audit with barcode/QR scanning
- Purchase order workflow (create -> receive -> stock update)
- Smart PO suggestions based on reorder levels
- CSV import for bulk inventory upload
- Expiry management with auto-alerts
- Stock movement history graphs

### Multi-Branch Support
- Branch model with main/sub-branch hierarchy
- Per-branch stock tracking (BranchStock)
- Stock transfers between branches with approval workflow
- Transfer templates for recurring transfers
- Branch comparison view
- Branch-level filtering on billing and reports
- Transfer reports

## Phase 4: Patient Experience

### Patient Registration Redesign
- Compact form layout with label-input styling
- Singapore NRIC checksum validation
- Phone number normalization
- Cross-field duplicate detection
- Name validation rules

### Patient Merge
- Detect duplicate patients by name + phone
- Merge records with data consolidation

## Phase 5: UX & Design

### Dashboard Charts
- Weekly revenue chart (Recharts line chart)
- Appointment status breakdown (pie chart)
- Monthly revenue trend (bar chart)
- Top treatments and revenue by payment method

### Login & Auth Pages
- Split-layout design with branding panel
- Matching design across login, register, and invite pages

### Dark Mode
- Full dark mode support via CSS variables
- Theme toggle with localStorage persistence

### Loading States
- Skeleton loading components for all major pages
- Shimmer animations during data fetching

### Mobile Responsiveness
- Bottom navigation bar on mobile
- Responsive grid layouts across all pages
- Touch-friendly button sizes

## Phase 6: SaaS Conversion

### Multi-Tenancy
- Single-database multi-tenant architecture
- Prisma client extension for automatic clinicId filtering
- Every model scoped by clinicId

### Landing Page
- Public landing page at ayurgate.com for unauthenticated visitors
- Feature showcase, pricing preview, CTA to register

### Trial & Subscription
- 7-day free trial on registration
- Trial banner with countdown across all pages
- Trial expiry redirect to pricing page

### Stripe Integration
- Checkout sessions for plan upgrades
- Webhook handler for payment confirmation
- Price IDs for Starter and Professional (monthly + annual)
- Currency: INR pricing

### Super Admin Panel
- /super-admin route for platform management
- View all registered clinics
- Monitor subscriptions and trial status
- Separate JWT authentication (super_admin_token)

### New Clinic Registration Alerts
- Email notification to admin on every new clinic signup
- Branded HTML email with clinic details and trial info

## Phase 7: Email & Communication

### Email System
- Resend as primary email provider
- Nodemailer/SMTP as fallback
- Branded HTML email templates
- IPv4 forced for Railway compatibility

### Communication Templates
- Pre-built WhatsApp message templates
- Email templates with variable substitution
- Template CRUD management

## Phase 8: Security & Performance

### Security Hardening
- Removed fallback JWT secrets
- Added security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy)
- Added database indexes on frequently queried fields
- Rate limiting on login (10/15min) and registration (5/hour)
- Removed default credentials from production
- Removed console.log statements from production code

### Performance
- Fixed N+1 query on suppliers endpoint (added Prisma include)
- Fixed N+1 query on patient family balances (Promise.allSettled)
- Added image onError handlers to prevent broken images
- Patient list pagination (50 per page)
- CSV export for patients, invoices, and appointments

### Accessibility
- ARIA main landmark roles on content areas
- Error boundary with branded fallback UI
- Replaced alert() calls with inline error toasts

### SEO
- Open Graph metadata and dynamic OG image
- SVG favicon (AG branded)
- robots.txt and sitemap.xml
- Updated copyright year

## Phase 9: Code Quality

### Deduplication Sprint (removed ~936 lines)
- Extracted shared Toast component (replaced 22 inline duplicates)
- Extracted shared style tokens to src/lib/styles.ts (replaced in 45 files)
- Extracted shared formatters to src/lib/formatters.ts (replaced 43 inline definitions in 30 files)

### Color Migration
- Replaced hardcoded blue hex colors with CSS variables across 29 files
- Cleaned up stale CSS variable fallback values
- Added fade-in animations to key pages

### Branding Consistency
- Dynamic clinic name from settings API (removed hardcoded "Ayur Centre")
- PDF footers changed from "Yoda Clinic Management System" to "AYUR GATE"
- Updated all platform references from "Ayur Centre" to "AYUR GATE"

## Phase 10: Onboarding & Verification

### Onboarding Wizard
- 3-step wizard at /onboarding for new trial signups
- Step 1: Clinic profile (address, contact, email verification)
- Step 2: Working hours (days, hours, appointment duration, currency, tax)
- Step 3: First doctor (optional, skippable)
- Middleware enforces onboarding for new admins
- JWT reissued on completion
- Skip button available on every step

### Email Verification
- 6-digit OTP system via Resend/SMTP
- Non-blocking (dashboard accessible without verification)
- Persistent banner on dashboard until verified
- 10-minute code expiry, 60-second resend cooldown
- Verification card in onboarding Step 1

### Safety Net
- Auto-marks pre-existing clinics (before April 2, 2026) as onboarded on login
- Prevents existing production users from being redirected to wizard
