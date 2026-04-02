# AYUR GATE -- Architecture

## System Overview

```
[Browser/PWA]
     |
     v
[Next.js App Router]
  |-- src/app/          -> Pages (React Server/Client Components)
  |-- src/app/api/      -> API Routes (REST endpoints)
  |-- src/components/   -> Shared UI components
  |-- src/lib/          -> Utilities (auth, db, email, formatters, styles)
  +-- src/middleware.ts  -> Request interceptor (auth, routing, onboarding)
     |
     v
[Prisma ORM + better-sqlite3 adapter]
     |
     v
[SQLite Database]  (dev.db locally, /data/clinic.db on Railway)
```

## Multi-Tenant Architecture

AYUR GATE uses a **single-database, shared-schema** multi-tenancy model:

- Every data model includes a `clinicId` field
- A Prisma client extension (`src/lib/tenant-db.ts`) automatically filters all queries by `clinicId`
- The `clinicId` is extracted from the JWT token in every API request
- Data isolation is enforced at the ORM level, not the database level

```
JWT Token -> { clinicId: "abc123" }
     |
     v
getTenantPrisma("abc123")
     |
     v
Prisma $extends -> auto-adds WHERE clinicId = "abc123" to all queries
```

## File Structure

```
patient-registration/
|-- prisma/
|   +-- schema.prisma          # Database schema (44 models)
|-- public/
|   |-- sw.js                  # Service worker
|   |-- manifest.json          # PWA manifest
|   |-- robots.txt             # SEO
|   +-- sitemap.xml            # SEO
|-- scripts/
|   |-- seed-admin.ts          # Seed default admin user
|   |-- seed-inventory.ts      # Seed inventory items
|   |-- migrate-to-multitenant.ts  # Migration helper
|   +-- mark-existing-onboarded.ts # Onboarding migration
|-- src/
|   |-- app/
|   |   |-- layout.tsx         # Root layout with metadata
|   |   |-- page.tsx           # Landing page (public)
|   |   |-- login/             # Login page
|   |   |-- register/          # Trial registration page
|   |   |-- onboarding/        # Post-registration wizard
|   |   |-- pricing/           # Pricing page (public)
|   |   |-- dashboard/         # Main dashboard
|   |   |-- patients/          # Patient management
|   |   |-- appointments/      # Appointment scheduling
|   |   |-- billing/           # Billing & invoicing
|   |   |-- prescriptions/     # Prescription management
|   |   |-- inventory/         # Inventory management
|   |   |-- treatments/        # Treatment & packages
|   |   |-- communications/    # WhatsApp & email templates
|   |   |-- reports/           # Analytics & reports
|   |   |-- admin/             # Admin panel (settings, staff, branches)
|   |   |-- doctor/            # Doctor portal
|   |   |-- super-admin/       # Platform admin panel
|   |   |-- invite/            # Staff invite acceptance
|   |   +-- api/               # All API routes (38 route groups)
|   |-- components/            # 19 shared components
|   |-- lib/                   # 15 utility modules
|   +-- generated/prisma/      # Auto-generated Prisma client
|-- docs/                      # This documentation
|-- package.json
|-- tsconfig.json
|-- next.config.ts
+-- tailwind.config.ts
```

## Request Flow

```
1. Browser Request
     |
2. Next.js Middleware (src/middleware.ts)
   |-- Public path? -> Allow through
   |-- Super admin? -> Check super_admin_token cookie
   |-- No auth_token? -> Redirect to /login
   |-- Onboarding incomplete? -> Redirect to /onboarding
   |-- Doctor accessing admin route? -> Redirect to /doctor
   +-- Valid token -> Allow through
     |
3. Page Component (src/app/[page]/page.tsx)
   +-- Fetches data from API routes
     |
4. API Route (src/app/api/[route]/route.ts)
   |-- Extract auth_token from cookie
   |-- Verify JWT -> get { userId, clinicId, role }
   |-- Get tenant-scoped Prisma client
   +-- Query database with clinicId isolation
     |
5. Prisma ORM -> SQLite Database
```

## Authentication Architecture

```
Registration/Login
     |
     v
Create JWT: { userId, email, role, name, clinicId, onboardingComplete }
     |
     v
Set httpOnly cookie: auth_token (24h expiry, sameSite: lax)
     |
     v
Every request: middleware verifies JWT -> routes based on role
```

## Key Design Decisions

1. **SQLite over PostgreSQL** -- Simpler deployment, zero-config, sufficient for target scale (1-50 staff clinics). Persisted on Railway volume.

2. **JWT in httpOnly cookie** -- More secure than localStorage tokens. sameSite: lax prevents basic CSRF.

3. **Single DB multi-tenancy** -- Simpler than DB-per-tenant for the current scale. Prisma extension handles isolation.

4. **App Router over Pages Router** -- Leverages React Server Components, layouts, and streaming.

5. **CSS variables for theming** -- `--blue-*` variables (legacy naming) contain green values (#2d6a4f). Enables dark mode toggle without class changes.

6. **Shared design system** -- `src/lib/styles.ts` and `src/lib/formatters.ts` enforce consistency and reduce duplication.
