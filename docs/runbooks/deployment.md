# Runbook — Deployment

**Audience:** Developers and the owner shipping AyurGate to production.
**Platform:** Railway (auto-deploy from `main`), GitHub repo `ayurcentresg-debug/ayurgate`.

## Normal deploy (the 95% case)

1. Branch from `main`, commit changes locally.
2. Before pushing, run the local checks:
   ```bash
   npx tsc --noEmit     # 0 errors required
   npm run lint         # 0 errors (warnings OK)
   npm run build        # must succeed
   ```
3. If the change touches a UI or API surface, start the dev server and smoke-test:
   ```bash
   npm run dev          # http://localhost:3000
   ```
4. Push to `main`:
   ```bash
   git push origin main
   ```
5. Railway detects the push, builds (`npm run build`), runs the start script (see below), and cuts over traffic. Watch the deploy log in Railway dashboard; a failing build will not replace the running deploy, so production stays up.
6. After "Deployment live" in Railway, verify in an incognito window:
   - `https://ayurgate.com` renders.
   - `https://ayurgate.com/login` → can log in.
   - Spot-check a feature you touched.

## Start script sequence

Railway runs `npm run start`, which is a pipeline:

```
npx prisma db push                          # apply any schema changes
npx tsx scripts/migrate-to-multitenant.ts   # idempotent data migration
npx tsx scripts/cleanup-demo-data.ts        # purge demo records
npx tsx scripts/seed-admin.ts               # ensure super-admin user exists
npx tsx scripts/seed-inventory.ts           # ensure base inventory exists
next start                                  # start the web server
```

All seed/migrate scripts are idempotent — safe to re-run every deploy.

## Environment variables

Production set is managed in the Railway dashboard → Service → Variables. Categories:

| Category | Required vars |
|---|---|
| Core | `JWT_SECRET`, `DATABASE_URL`, `DB_PATH=/data/clinic.db`, `NODE_ENV=production`, `NEXT_PUBLIC_APP_URL=https://ayurgate.com` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Super admin | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` |
| Email (transactional) | `RESEND_API_KEY`, `EMAIL_FROM`, or the full `SMTP_*` set if not using Resend |
| Email (marketing) | `MARKETING_SMTP_HOST`, `MARKETING_SMTP_PORT`, `MARKETING_SMTP_USER`, `MARKETING_SMTP_PASS`, `MARKETING_EMAIL_FROM` |
| WhatsApp | `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_PHONE_NUMBER`, `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN` |
| SMS (optional) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_NUMBER`, `TWILIO_WHATSAPP_NUMBER` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (one per plan + billing interval) |
| Ops | `CRON_SECRET`, `DAILY_REPORT_EMAIL`, `ADMIN_NOTIFICATION_EMAIL` |

**Never** remove `JWT_SECRET` — the app now throws at startup if it's missing (SEC-001 hardening). A stopped container will not auto-restart without it.

## Railway volume

- SQLite lives at `/data/clinic.db` on the Railway volume.
- The volume persists across deploys. Ephemeral filesystem changes do not.
- If you ever see fresh-install state after a deploy, the volume has detached — check the service's Volumes tab.

## Rollback

### Fast rollback (Railway dashboard)

1. Railway → Deployments tab → pick the last-known-good deployment.
2. Click the `⋯` menu → **Redeploy**.
3. Railway restarts that build. Takes ~2 minutes.

This keeps your current git history untouched — useful when you're unsure which commit broke things.

### Git-level rollback

```bash
git revert <bad-sha>            # create an inverse commit
git push origin main            # triggers normal Railway deploy
```

Use `revert`, not `reset`, on `main` — rewriting published history is disruptive and Railway picks up reverts cleanly.

## Database migrations

### Safe (forward-compatible) changes

Add a nullable column, add a new table, add a non-unique index. Safe to ship as a normal commit; `prisma db push` in the start script applies automatically.

### Destructive changes

Dropping a column, renaming a column, adding a NOT NULL without default, changing a column type. **Do not** let `prisma db push` run these in production without a migration plan:

1. Back up first:
   ```bash
   railway run cp /data/clinic.db /data/clinic.db.$(date +%Y%m%d_%H%M%S).bak
   ```
2. Write a data-migration script in `scripts/` that runs before `prisma db push` in the start sequence, OR make the change in two deploys (add new shape, backfill, remove old shape).
3. Test against a copy of the prod DB locally before merging.

## Health checks and monitoring

- Railway built-in health check hits `/` and expects 200.
- Logs: Railway → Service → Logs tab. Search for `Error` and `unhandled` after each deploy.
- Stripe webhook events: Stripe dashboard → Developers → Webhooks → look for 2xx responses.
- WhatsApp webhook events: Meta → App Dashboard → WhatsApp → Webhook → Recent Events.

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails `Error: JWT_SECRET environment variable is required` | Env var missing or deleted | Restore in Railway Variables, redeploy |
| "Not found" for users that existed before deploy | Railway volume detached | Check Service → Volumes; redeploy with volume attached |
| `redirect_uri_mismatch` on Google login | Production domain not in Google Cloud Console | See `runbooks/google-oauth-production.md` |
| Stripe webhook 400 in logs | `STRIPE_WEBHOOK_SECRET` rotated but Railway not updated | Copy new signing secret from Stripe → Webhooks → your endpoint → Reveal; update Railway |
| `EADDRINUSE :3000` locally | Stale dev server from previous session | `lsof -i :3000` → `kill <pid>` |

## Manual database backup

```bash
railway run cp /data/clinic.db ./backup-$(date +%Y%m%d).db
```

Download the resulting file. This is a **manual** cadence until we automate. See also `runbooks/incident-response.md` for backup responsibilities during an incident.

## Who can deploy

Today: the owner. Push access to `main` is equivalent to deploy access — no PR gating. When the team grows, switch `main` to require PR review and set up a separate `release` branch for Railway's auto-deploy trigger.
