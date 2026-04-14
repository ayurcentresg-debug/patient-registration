# Developer Onboarding

**Audience:** A new engineer (or contractor) joining AyurGate.
**Goal:** Running the app locally on day 1, shipping a small change by end of week 1.

This guide is intentionally opinionated about **order**. The 14 reference docs in `docs/01-*…14-*` are the depth material — this file tells you which to read when.

---

## Day 1 — Get the app running

### 1. Clone and install

```bash
git clone git@github.com:ayurcentresg-debug/ayurgate.git
cd ayurgate/patient-registration
nvm use 20                  # Node.js 20+
npm install
```

If `nvm` isn't set up, any Node ≥ 20 will work. This is a Next.js 16 app with Turbopack — older Node versions will fail obscurely.

### 2. Configure `.env.local`

Copy `.env.example` to `.env.local` and fill in the minimum for local dev:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="any-long-random-string-at-least-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Only needed if you're touching the feature:
GOOGLE_CLIENT_ID=""         # ask for dev client ID
GOOGLE_CLIENT_SECRET=""
RESEND_API_KEY=""           # or use SMTP_* vars — see 10-env-variables.md
STRIPE_SECRET_KEY=""        # Stripe test mode sk_test_...
STRIPE_WEBHOOK_SECRET=""
```

`JWT_SECRET` is mandatory — the app throws at startup without it (SEC-001). Everything else can be left blank and the affected feature will just error when you hit it.

### 3. Seed the database

```bash
npx prisma db push          # creates dev.db and applies schema
npx tsx scripts/seed-admin.ts          # creates super-admin user
npx tsx scripts/seed-inventory.ts      # creates base inventory
```

The schema is in `prisma/schema.prisma` — 63 models covering clinics, patients, staff, appointments, invoices, prescriptions, inventory, and the CME module.

### 4. Start the dev server

```bash
npm run dev                 # http://localhost:3000
```

Log in with the super-admin credentials printed by `seed-admin.ts`. If you don't see them, check `src/lib/super-admin-auth.ts` for the defaults (`info@ayurgate.com` / env-configurable password).

### 5. Read the lay of the land

In this order — each builds on the previous:

1. `docs/01-project-overview.md` — what AyurGate is and isn't
2. `docs/03-architecture.md` — multi-tenancy model, tenant isolation pattern
3. `docs/04-database-schema.md` — the 63-model ERD
4. `docs/07-auth-security.md` — JWT flow, roles, middleware

Skip the others for now. Come back to `06-api-reference.md` when you're building an endpoint, `08-user-flows.md` when you're building UI, `09-deployment.md` when you're ready to ship.

---

## Day 2–3 — The mental model

### Multi-tenancy: the single most important concept

Every tenant-scoped model has a `clinicId` column. Every query that reads tenant data **must** filter by `clinicId`, and every mutation must set it. The pattern:

```ts
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

const clinicId = await getClinicId();
if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const db = getTenantPrisma(clinicId);
// `db` is a Prisma client that auto-scopes reads and injects clinicId on writes
```

**Do not** import `prisma` from `@/lib/db` and use it directly for tenant data — that bypasses the scoping extension. The only legitimate uses of the raw `prisma` client are:

- Writing super-admin-only queries that genuinely cross clinics (clearly marked)
- Writing seed scripts and migrations
- Writing raw SQL (`$queryRawUnsafe`), in which case **you** are responsible for adding `AND clinicId = ?` to every query

Cross-clinic leak is the class of bug that got SEC-001b reopened — treat this as the load-bearing rule.

### Authorization: two layers

1. **Middleware** (`src/middleware.ts`) verifies the JWT, extracts the `clinicId` + `role`, enforces CSRF and rate limiting, and redirects unauth'd page requests to `/login`. Every request passes through it.
2. **Route handlers** check role via `requireRole(ALLOWED_ROLES)` for any mutating or sensitive endpoint. Middleware auth alone is not sufficient — see `src/app/api/users/[id]/route.ts` for the canonical pattern.

Role constants live in `src/lib/get-clinic-id.ts`:
- `ADMIN_ROLES = ["admin", "receptionist", "staff"]`
- `STAFF_ROLES = ["admin", "receptionist", "pharmacist", "staff"]`

### Next.js 16 quirks

This is **not** the Next.js you may know. Key differences:

- `middleware.ts` is deprecated — will move to `proxy.ts` in a future refactor. We're keeping `middleware.ts` for now; new logic still goes there.
- Dynamic route `params` are **Promises**: `{ params }: { params: Promise<{ id: string }> }` — always `await params` inside the handler.
- Turbopack is the default bundler; dev server startup is ~200ms.

Before writing any Next-specific code, check `node_modules/next/dist/docs/` — the AGENTS.md file at the repo root says so for a reason.

---

## Day 4–5 — Ship something small

Pick a low-risk starter task from the "good first issue" list (if we ever formalize one) or ask the owner. Representative starters:

- Add a new field to the patient form (UI + API + schema migration)
- Add a new invoice filter (UI + query)
- Fix a lint warning

Working loop:

```bash
git checkout -b your-feature-name
# edit code, save, dev server hot-reloads
npx tsc --noEmit               # must be 0 errors
npm run lint                   # must be 0 errors
npm run build                  # must succeed
git commit -m "describe what and why, not how"
git push origin your-feature-name
# open PR → ask owner to review
```

**Before pushing** any API change, exercise it with `curl` against your local dev server to confirm role guards and tenant scoping. Don't rely on the UI — the UI is a cooperating client; an attacker won't be.

---

## Week 1 — Conventions to internalize

### Code style

- TypeScript everywhere, strict mode
- No `any` without a comment explaining why
- Prisma `include` rather than manual joins
- Error responses: `NextResponse.json({ error: "..." }, { status })` — standard across the codebase
- No comments restating what the code does; only comments explaining the *why* for non-obvious decisions

### Commits

- Short subject line (≤72 chars), imperative mood ("add", not "added")
- Body explains motivation, not diff
- Reference the Sprint item or issue if one exists
- Every commit includes `Co-Authored-By` if Claude Code helped

### Testing (aspirational)

Test infrastructure is the #1 outstanding debt (see Session 16 in `PROJECT-LOG.md` and the QA audit). Until it lands, manual smoke testing is the standard — you are expected to exercise your change with realistic data before requesting review.

### Security mindset

- Never log secrets or tokens
- Never construct SQL by string concatenation — use Prisma or parameterized `$queryRawUnsafe`
- Never trust `req.body` fields — validate types and lengths explicitly
- Check `docs/07-auth-security.md` and `runbooks/incident-response.md` before touching auth, billing, or patient records

---

## Where to find what

| I want to… | Read |
|---|---|
| Understand the domain | `docs/01-project-overview.md`, `docs/05-features.md` |
| Add a new model | `docs/04-database-schema.md` + existing Prisma migrations in git history |
| Add an API endpoint | `docs/06-api-reference.md` + grep for a similar endpoint pattern |
| Add a page / component | `docs/08-user-flows.md`, `docs/11-design-system.md` |
| Deploy | `docs/runbooks/deployment.md` |
| Respond to an incident | `docs/runbooks/incident-response.md` |
| Set up Google OAuth | `docs/runbooks/google-oauth-production.md` |
| Understand recent changes | `docs/PROJECT-LOG.md` (chronological session notes) |
| See what's next | `AyurGate-Master-Project-Plan.xlsx` on the owner's Desktop (12-sheet plan) |

---

## People

| Role | Who |
|---|---|
| Founder / product owner / lead dev | _(owner)_ |
| You (new hire) | — |

Team of one today. You'll pair directly with the owner on everything until the hiring plan in the Master Project Plan fills out.

## Your first questions should be

Ask before guessing, in roughly this order:

1. "Which feature should I start on?"
2. "Is there a dev Google Cloud project I can use for OAuth testing?"
3. "How do we handle PRs — are you merging them directly, or do you want me to self-merge after approval?"
4. "What's the expected response time for an oncall page?"

If any of these answers are blank in this doc by your day 7, that's a finding — open a PR that updates this guide.
