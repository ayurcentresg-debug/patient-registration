# Runbook — Google OAuth Production Setup

**Audience:** AyurGate owner / admin with Google Cloud Console access.
**When to use:** First-time production cutover, or when adding a new production domain (e.g. regional subdomain).
**Time:** 15 minutes if domain is already DNS-verified, otherwise 1–2 hours (domain verification propagation).

## What's already done (code-side)

- `src/app/api/auth/google/route.ts` derives the OAuth redirect URI from `x-forwarded-host` + `x-forwarded-proto` headers that Railway's proxy sets. No code change is needed to support a new domain — the Console config is the only gate.
- Scopes used: `openid`, `email`, `profile`. All non-sensitive, so **no Google OAuth verification review is required**.

## Prerequisites

- Google Cloud Console access on the project that owns the existing `GOOGLE_CLIENT_ID`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` already set in Railway environment variables (verify in Railway dashboard → service → Variables).
- Production domain DNS is pointing at Railway (CNAME to the Railway-provided domain, SSL auto-provisioned).

## Steps

### 1. Add production redirect URI to the OAuth client

1. Open <https://console.cloud.google.com/apis/credentials>.
2. Click the OAuth 2.0 Client ID used by AyurGate (the same one that works for localhost).
3. Under **Authorized redirect URIs**, add:
   - `https://ayurgate.com/api/auth/google/callback`
   - `https://www.ayurgate.com/api/auth/google/callback`
   - *(optional)* `https://<service>.up.railway.app/api/auth/google/callback` — useful if you want direct-to-Railway logins bypassing the apex domain.
4. Keep the existing `http://localhost:3000/api/auth/google/callback` for dev.
5. Under **Authorized JavaScript origins**, add:
   - `https://ayurgate.com`
   - `https://www.ayurgate.com`
6. **Save**. Changes propagate within ~5 minutes.

### 2. Publish the OAuth consent screen

Only required if you want users beyond the test-user allowlist to log in.

1. Open <https://console.cloud.google.com/apis/credentials/consent>.
2. Fill in (if not already set):
   - **App name:** AyurGate
   - **User support email:** `support@ayurgate.com`
   - **App logo:** 120×120 PNG, transparent background
   - **Application home page:** `https://ayurgate.com`
   - **Application privacy policy link:** `https://ayurgate.com/privacy`
   - **Application terms of service link:** `https://ayurgate.com/terms`
   - **Authorized domains:** `ayurgate.com`
   - **Developer contact information:** owner's email
3. **Publishing status** → click **PUBLISH APP** → confirm.
4. Since the app only uses `openid email profile` (non-sensitive scopes), Google skips the verification review. The app moves directly to "In production".

### 3. Verify Railway env vars

In the Railway dashboard, confirm these are set on the web service:

```
GOOGLE_CLIENT_ID=<same value as Google Cloud Console>
GOOGLE_CLIENT_SECRET=<same value as Google Cloud Console>
NEXT_PUBLIC_APP_URL=https://ayurgate.com
```

If `NEXT_PUBLIC_APP_URL` is missing, some email templates fall back to `https://www.ayurgate.com` — non-fatal but sloppy. Set it explicitly.

### 4. Smoke test from a browser

1. Open an **incognito window** to avoid cached auth state.
2. Navigate to `https://ayurgate.com/login`.
3. Click the Google sign-in button.
4. Confirm:
   - Consent screen shows AyurGate branding (not `unverified.appspot.com`).
   - Redirect returns to `https://ayurgate.com/dashboard` (or `/onboarding` for a fresh user).
   - No `redirect_uri_mismatch` error.

If you see **Error 400: redirect_uri_mismatch**, step 1 wasn't saved or took longer than 5 min to propagate. Copy the exact URI from the error message and paste it into the Authorized redirect URIs list verbatim.

## Rollback

OAuth Console changes are non-destructive — old URIs and the original client still work. To revert, remove the production URIs; users on the production domain will stop being able to sign in with Google until re-added.

## Adding a new production domain later

Repeat step 1 only (add redirect URI + JavaScript origin). Step 2 only needs re-running if you change the Authorized domains list.
