# Database Backup & Restore Runbook

_Last updated: 15 Apr 2026_

AyurGate runs on SQLite mounted on a Railway persistent volume (`/data/clinic.db`). This document describes how we back it up, where copies live, and how to restore from any of them.

## What runs, when, and where

| Layer | Cadence | Retention | Location |
|---|---|---|---|
| Local snapshot | Daily (triggered by cron) | 30 days | `<project>/backups/backup-*.db.gz` on the Railway volume |
| Offsite copy | Daily (same cron, if configured) | 90 days | `BACKUP_S3_BUCKET/<prefix>/backup-*.db.gz` |
| Status email | Every run | — | Sent to `DAILY_REPORT_EMAIL` (default `ayurcentresg@gmail.com`) |

The backup job is a single HTTP endpoint — `GET /api/cron/backup?secret=<CRON_SECRET>`. Everything else (uploading, pruning, emailing) happens inside that one request.

## Triggering the backup

The endpoint is gated by `CRON_SECRET`. If that env var is missing, the route throws at module load and returns 500 on every request — there is no fallback.

External cron options (pick one):

1. **Railway cron** — add a scheduled service in the Railway project that hits `https://www.ayurgate.com/api/cron/backup?secret=${CRON_SECRET}` daily at 03:00 SGT (19:00 UTC).
2. **cron-job.org** — free, reliable, sends email on failure. Same URL, same cadence.
3. **GitHub Actions** — workflow with `on: schedule: [cron: "0 19 * * *"]` that `curl`s the URL.

## Environment variables

Required in every environment:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Target database path (already set) |
| `CRON_SECRET` | Gates the backup endpoint. No fallback — missing var = 500. |
| `DAILY_REPORT_EMAIL` | Where the status email goes (default: `ayurcentresg@gmail.com`) |

Optional for offsite (all four must be set for offsite to activate):

| Var | Purpose |
|---|---|
| `BACKUP_S3_BUCKET` | Bucket name |
| `BACKUP_S3_ACCESS_KEY_ID` | Access key |
| `BACKUP_S3_SECRET_ACCESS_KEY` | Secret key |
| `BACKUP_S3_REGION` | Region (for AWS) or `auto` (for R2) |
| `BACKUP_S3_ENDPOINT` | _Only for R2/non-AWS._ e.g. `https://<accountid>.r2.cloudflarestorage.com` |
| `BACKUP_S3_PREFIX` | Key prefix. Default `backups/` |

If any of the four required S3 vars is missing, offsite upload is silently skipped and the email notes "Not configured". The job still succeeds with a local-only backup.

## Setting up Cloudflare R2 (recommended — zero egress cost)

1. Cloudflare dashboard → **R2** → Create bucket `ayurgate-backups`.
2. **Manage R2 API Tokens** → Create token → Object Read & Write → scope to that bucket.
3. Copy the endpoint URL, Access Key ID, and Secret Access Key.
4. Railway → add env vars:
   ```
   BACKUP_S3_BUCKET=ayurgate-backups
   BACKUP_S3_ACCESS_KEY_ID=<token id>
   BACKUP_S3_SECRET_ACCESS_KEY=<token secret>
   BACKUP_S3_REGION=auto
   BACKUP_S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
   BACKUP_S3_PREFIX=backups/
   ```
5. Redeploy. Next backup run should report "Offsite Upload: ✓".

## Setting up AWS S3

Same as above, but:
- Skip `BACKUP_S3_ENDPOINT` (leave it unset).
- Use your real AWS region (e.g. `ap-southeast-1`).
- The code automatically enables `AES256` server-side encryption for AWS.

## Manual trigger (for testing or ad-hoc backup)

```bash
curl "https://www.ayurgate.com/api/cron/backup?secret=${CRON_SECRET}"
```

Response is JSON with the full status. A separate status email fires in parallel.

## Restoring from backup

Use the restore script — it refuses to run without `--yes` to prevent accidents, and snapshots the current DB to `<db>.pre-restore-<ts>` before overwriting.

### From a local gzipped backup

```bash
tsx scripts/restore-backup.ts ./backups/backup-2026-04-15T03-00-00.db.gz
# review output, then rerun with --yes
tsx scripts/restore-backup.ts ./backups/backup-2026-04-15T03-00-00.db.gz --yes
```

### From the latest offsite copy

```bash
tsx scripts/restore-backup.ts --offsite --yes
```

### From a specific offsite key

```bash
tsx scripts/restore-backup.ts --offsite --key=backups/backup-2026-04-10T03-00-00.db.gz --yes
```

### Inside Railway (production)

Railway has no interactive shell. Options:

1. Use Railway's one-shot command: `railway run tsx scripts/restore-backup.ts ./backups/<file> --yes` (with CLI + login).
2. Or SSH into a Railway shell via their web UI terminal (requires Pro plan), same command.
3. Or pull the backup to your laptop, replace it locally, and re-seed a fresh Railway volume from there.

## Recovery scenarios

### "Today's data is wrong" (e.g. bad migration)
1. Trigger a fresh backup first: `curl "$URL/api/cron/backup?secret=..."` to freeze the current (bad) state.
2. `tsx scripts/restore-backup.ts <yesterday's backup> --yes` to roll back.
3. Replay any good writes manually if needed.

### "The Railway volume is gone"
1. Spin up a fresh Railway service with a new volume.
2. Pull the most recent offsite copy: `tsx scripts/restore-backup.ts --offsite --yes`.
3. Update DNS if the hostname changed.

### "The offsite bucket is compromised"
- Local copies still exist on the Railway volume (30 days).
- Rotate the S3 credentials immediately.
- Enable versioning / object lock on the bucket to prevent future compromise.

## What to check on the status email

Every backup email lists:

- ✅/⚠️ overall status
- Raw → compressed file size (gzip usually cuts ~70-80%)
- Duration
- Local retention count + files cleaned up
- Offsite upload status (or "Not configured")
- Data snapshot: rowcounts per key table

Red flags to watch for:

- **"SUSPICIOUS: <table> dropped from X to Y"** — >20% row drop vs. yesterday. Investigate before something nukes more.
- **"CRITICAL: <table> table is EMPTY"** — data loss event. Restore immediately.
- **"Offsite upload failed"** — check S3 credentials / quota / network.
- **Backup size suddenly tiny** — possible corruption; don't restore from this one.

## Known limitations

- Single-writer SQLite: `VACUUM INTO` takes a consistent snapshot but blocks writes briefly while it runs. On a 100 MB DB this is <1s.
- No point-in-time recovery — you can only restore to a daily snapshot. For minute-level recovery we'd need to move to Postgres with WAL archiving.
- The restore script overwrites the DB file in place. It does NOT restart the Next.js process; on Railway you'll need to redeploy / restart the service after restoring.

## Change history

- **15 Apr 2026**: Initial automated backup system. Local + offsite, gzip compression, 30/90 day retention, threat detection, email reports. CRON_SECRET now required (no fallback).
