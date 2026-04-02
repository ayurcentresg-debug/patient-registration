# AYUR GATE — Roadmap & Pending Items

## Critical (Security)

### 1. Fix Cross-Clinic Data Leak in Dashboard/Reports
- **Issue**: Raw SQL queries (`$queryRawUnsafe`) in dashboard and reports API routes use the global `prisma` instance instead of the tenant-scoped `db`. This means chart data (revenue, appointment trends, top treatments) aggregates across ALL clinics.
- **Fix**: Replace `prisma.$queryRawUnsafe(...)` with `db.$queryRawUnsafe(...)` in `/api/dashboard/route.ts` and `/api/reports/route.ts`.

### 2. Add API-Level Role Checks
- **Issue**: Middleware blocks doctors from admin pages, but API routes have no role verification. A doctor can directly call POST /api/patients, DELETE /api/patients/[id], PUT /api/settings, etc.
- **Fix**: Add role checking in sensitive API routes (patient delete, settings update, staff management, billing modifications).

### 3. Fix JWT Secret Fallback in 2 Routes
- **Issue**: `/api/setup-doctor-passwords/route.ts` and `/api/doctor/dashboard/route.ts` use `process.env.JWT_SECRET || ""` instead of the shared auth module.
- **Fix**: Replace inline JWT verification with `verifyToken()` from `src/lib/auth.ts`.

### 4. Sanitize Error Messages
- **Issue**: `global-error.tsx` displays raw `error.message` which can contain Prisma schema details.
- **Fix**: Show generic error message in production, log details server-side only.

## High Priority (Performance & Data)

### 5. Add Missing Database Indexes
- `InvoiceItem.invoiceId`
- `Payment.invoiceId`
- `ClinicalNote.patientId`
- `Document.patientId`

### 6. Optimize Billing Stats API
- **Issue**: Fetches full invoice rows just to sum amounts.
- **Fix**: Use `prisma.invoice.aggregate({ _sum: { paidAmount: true } })`.

### 7. Fix Reports Route Performance
- **Issue**: Loads unbounded record sets for year-long periods with no `take` limit.
- **Fix**: Add pagination or aggregation queries.

### 8. Fix Patient ID Race Condition
- **Issue**: `count() + 10001` under concurrent requests produces duplicate IDs.
- **Fix**: Use database sequence or retry with random suffix on unique constraint violation.

## Medium Priority (Features)

### 9. Implement Soft-Delete for Patients
- **Issue**: Hard-delete cascades all clinical history (notes, appointments, billing).
- **Fix**: Add `deletedAt` field, filter out soft-deleted records in queries.

### 10. Activate Audit Logging
- **Issue**: AuditLog model exists but nothing writes to it.
- **Fix**: Add `db.auditLog.create()` calls in patient delete, invoice cancel, settings change, staff management.

### 11. Automated Appointment Reminders
- **Issue**: Reminder model exists, no cron job fires them.
- **Fix**: Add a scheduled task (Railway cron or external) to send reminders 24h before appointments.

### 12. Billing Pagination
- **Issue**: Hard-capped at 100 invoices, no "load more" UI.
- **Fix**: Add cursor-based pagination with infinite scroll or page numbers.

### 13. Lazy-Load Dashboard Charts
- **Issue**: Recharts (~350KB) is statically imported on dashboard.
- **Fix**: Use `next/dynamic` with `ssr: false` to lazy-load chart components.

### 14. Server-Side Gender Filter on Patients
- **Issue**: Gender filter applied client-side over current page only.
- **Fix**: Pass gender as query param to API, filter in Prisma `where` clause.

## Low Priority (Polish)

### 15. Per-Page Browser Titles
- Add `export const metadata = { title: "Patients | AYUR GATE" }` to each page for better tab identification.

### 16. Content Security Policy Header
- Add CSP header to next.config.ts to prevent XSS.

### 17. Rate Limiting on All Sensitive Endpoints
- Add rate limiting to forgot-password, invite, and other sensitive endpoints.

### 18. Dynamic Sitemap & Robots
- Replace static `/public/robots.txt` and `/public/sitemap.xml` with `app/sitemap.ts` and `app/robots.ts`.

### 19. Remove Unused Dependencies
- `xlsx` (~450KB) — not imported anywhere
- `date-fns` (~50KB) — replaced by src/lib/formatters.ts
- `@heroicons/react` (~200KB) — minimal usage

### 20. Welcome Checklist Widget
- Dashboard widget for new users showing setup progress:
  - Account created
  - Clinic details added
  - Email verified
  - First doctor added
  - First patient registered
  - First appointment booked

## Infrastructure Improvements

### 21. Email Domain Setup
- Set up SPF/DKIM/DMARC for ayurgate.com on GoDaddy
- Verify domain on Resend for sending from @ayurgate.com
- Set up info@ayurgate.com forwarding

### 22. Database Backup Automation
- Set up periodic SQLite backup from Railway volume
- Store backups in cloud storage (S3, Google Cloud Storage)

### 23. Error Monitoring
- Integrate Sentry or similar for production error tracking
- Set up alerts for critical errors

### 24. Automated Testing
- Add unit tests for critical utilities (auth, formatters, validation)
- Add integration tests for key API routes
- Set up CI pipeline (GitHub Actions) for test + lint on PR
