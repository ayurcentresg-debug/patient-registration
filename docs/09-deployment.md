# AYUR GATE — Deployment Guide

## Hosting: Railway

AYUR GATE is deployed on Railway with auto-deploy from the `main` branch on GitHub.

### Railway Configuration
- **Service**: Web service (Node.js)
- **Build Command**: `npm run build` (runs `prisma generate && next build`)
- **Start Command**: `npm run start` (runs prisma db push + seed scripts + next start)
- **Region**: US West (or nearest to target users)
- **Auto-deploy**: Enabled on push to `main`

### Start Script Sequence
```bash
npx prisma db push                          # Apply schema changes
npx tsx scripts/migrate-to-multitenant.ts   # Run data migration
npx tsx scripts/cleanup-demo-data.ts        # Clean demo records
npx tsx scripts/seed-admin.ts               # Ensure admin user exists
npx tsx scripts/seed-inventory.ts           # Ensure base inventory
next start                                  # Start the app
```

### Railway Volume (Persistent Storage)
- SQLite database is stored on a Railway volume at `/data/clinic.db`
- The volume persists across deploys (unlike the ephemeral filesystem)
- Set `DB_PATH=/data/clinic.db` in Railway environment variables
- Without the volume, data is lost on every redeploy

### Domain Setup
- **Domain**: ayurgate.com (registered on GoDaddy)
- **DNS**: CNAME record pointing to Railway-provided domain
- **SSL**: Auto-provisioned by Railway (Let's Encrypt)
- **www redirect**: www.ayurgate.com redirects to ayurgate.com

## CI/CD Flow
```
Developer pushes to main
     |
     v
GitHub triggers Railway webhook
     |
     v
Railway builds the app (npm run build)
     |
     v
Railway runs start script (prisma db push + seeds + next start)
     |
     v
Health check passes -> New deployment goes live
     |
     v
Old deployment gracefully shut down
```

## Database Backup
- SQLite file at `/data/clinic.db` on Railway volume
- No automated backup currently
- Recommended: Set up periodic backup via Railway cron or external script
- Manual backup: Download via Railway CLI (`railway run cp /data/clinic.db ./backup.db`)

## Monitoring
- Railway provides built-in logs (stdout/stderr)
- No external monitoring (Sentry, Datadog) configured yet
- Console errors are logged server-side
