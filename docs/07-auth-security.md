# AYUR GATE — Authentication & Security

## Authentication Flow

### Registration Flow
```
1. User fills registration form (/register)
2. POST /api/clinic/register
   - Validates input, checks duplicate email
   - Creates: Clinic + ClinicSubscription (7-day trial) + Admin User + ClinicSettings
   - Generates JWT with onboardingComplete: false
   - Sets httpOnly cookie (auth_token)
3. Redirect to /onboarding (3-step wizard)
4. On wizard completion:
   - POST /api/onboarding { step: "complete" }
   - Re-issues JWT with onboardingComplete: true
   - Redirect to /dashboard
```

### Login Flow
```
1. User enters email + password (/login)
2. POST /api/auth/login
   - Finds user by email
   - Verifies password (bcryptjs)
   - If 2FA enabled: returns { requires2FA: true }, user enters TOTP code
   - Checks clinic onboarding status
   - Creates JWT: { userId, email, role, name, clinicId, onboardingComplete }
   - Sets httpOnly cookie (24h expiry)
3. Middleware routes based on role:
   - admin/receptionist/staff -> /dashboard
   - doctor/therapist -> /doctor
   - onboardingComplete=false -> /onboarding
```

### Staff Invite Flow
```
1. Admin creates staff via POST /api/staff with sendInvite: true
2. System generates inviteToken (unique, 7-day expiry)
3. Email sent with link: /invite/[token]
4. Staff opens link -> validates token -> sets password
5. Staff can now login with email + password
```

## JWT Structure

```json
{
  "userId": "cuid_xxx",
  "email": "user@clinic.com",
  "role": "admin",
  "name": "John Doe",
  "clinicId": "cuid_yyy",
  "onboardingComplete": true,
  "iat": 1712000000,
  "exp": 1712086400
}
```

- **Algorithm**: HS256
- **Library**: jose
- **Expiry**: 24 hours
- **Storage**: httpOnly cookie (not accessible via JavaScript)
- **Cookie settings**: secure (production), sameSite: lax, path: /

## Password Security

- **Hashing**: bcryptjs with 12 salt rounds
- **Minimum length**: 6 characters (enforced on frontend and API)
- **Storage**: Only hash stored in database, never plaintext

## Two-Factor Authentication (2FA)

- **Type**: TOTP (Time-based One-Time Password)
- **Library**: otpauth
- **Compatible with**: Google Authenticator, Authy, 1Password
- **Setup flow**: Generate secret -> Show QR code -> User scans -> Verify first code -> Enable
- **Login flow**: Password correct -> Prompt for 6-digit TOTP code -> Validate with 1-step window

## Middleware Security (src/middleware.ts)

### Route Protection
| Path Pattern | Protection |
|---|---|
| `/`, `/login`, `/register`, `/pricing`, `/invite` | Public (no auth) |
| `/super-admin/*` | Requires super_admin_token cookie |
| `/onboarding`, `/api/onboarding`, `/api/verify-email` | Auth required, allowed during onboarding |
| `/admin`, `/reports`, `/inventory`, `/communications`, `/billing` | Auth required, admin/receptionist/staff only |
| `/doctor` | Auth required, doctor/therapist/admin only |
| All other paths | Auth required (any role) |

### Onboarding Gate
- New admin users (onboardingComplete === false) are redirected to /onboarding
- Only whitelisted paths (/api/onboarding, /api/verify-email, /api/auth/me, /api/settings) are accessible
- Existing clinics (created before 2026-04-02) are auto-marked as onboarded on first login

## Email Verification

- **Type**: 6-digit OTP code
- **Delivery**: Resend (primary) or SMTP (fallback)
- **Expiry**: 10 minutes
- **Cooldown**: 60 seconds between sends
- **Blocking**: Non-blocking -- users can access all features without verification
- **Restrictions for unverified**: Staff invites and paid plan upgrades (planned)

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 10 requests | 15 minutes |
| `/api/clinic/register` | 5 requests | 1 hour |
| Other endpoints | No rate limit | -- |

**Implementation**: In-memory rate limiter (src/lib/rate-limit.ts), keyed by IP address.

## Security Headers (next.config.ts)

| Header | Value | Purpose |
|--------|-------|---------|
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Restrict browser APIs |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer data |

## Multi-Tenant Data Isolation

- Every query is scoped by `clinicId` via Prisma client extension
- `clinicId` extracted from JWT, never from request body
- Prisma `$extends` middleware auto-applies `WHERE clinicId = ?` to all CRUD operations

## Security Items Implemented
1. JWT-based authentication with httpOnly cookies
2. Password hashing with bcryptjs (12 rounds)
3. TOTP 2FA support
4. Rate limiting on login and registration
5. Security headers (HSTS, X-Frame-Options, etc.)
6. sameSite cookie policy
7. Multi-tenant data isolation via Prisma extension
8. Input validation on patient registration (NRIC checksum, phone normalization)
9. Email verification OTP system
10. Staff invite tokens with expiry

## Security Items Pending (from audit)
1. **API-level role checks** -- Middleware blocks pages but not API routes. A doctor can call admin APIs directly.
2. **Content Security Policy header** -- Not yet configured
3. **CSRF protection** -- sameSite: lax helps but no token-based CSRF
4. **Cross-clinic data leak** -- Raw SQL queries in dashboard/reports use global `prisma` instead of tenant `db`
5. **Input validation gaps** -- Appointment date/time not validated for format
6. **Soft-delete for patients** -- Currently hard-deletes; violates medical record retention
7. **Audit log writes** -- AuditLog model exists but no handlers write to it
8. **Rate limiting on all sensitive endpoints** -- Only login and register are rate-limited
9. **JWT secret fallback** -- 2 routes use `process.env.JWT_SECRET || ""` instead of the shared auth module
10. **Error message leakage** -- global-error.tsx exposes raw Prisma error messages
