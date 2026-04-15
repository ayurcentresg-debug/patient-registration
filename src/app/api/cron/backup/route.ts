import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  loadS3Config,
  uploadBackup,
  pruneOldBackups,
  describeTarget,
} from "@/lib/backup-storage";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";

const BACKUP_EMAIL = process.env.DAILY_REPORT_EMAIL || "ayurcentresg@gmail.com";
const MAX_LOCAL_BACKUPS = 30; // Keep last 30 days of local backups
const OFFSITE_RETENTION_DAYS = 90; // Keep offsite copies for 90 days

// SEC-001: fail fast if CRON_SECRET is not configured. We removed the old
// hardcoded fallback ("ayurgate-daily-2026") because it let anyone hit the
// endpoint before the env var was set.
if (!process.env.CRON_SECRET) {
  // Throwing at module load makes the route return 500 on every request until
  // the operator sets CRON_SECRET — which is the safe behaviour.
  throw new Error("CRON_SECRET environment variable is required");
}
const EXPECTED_SECRET = process.env.CRON_SECRET;

type BackupResult = {
  success: boolean;
  backupFile: string;
  sizeBytes: number;
  compressedSizeBytes: number;
  integrity: { passed: boolean; details: Record<string, number> };
  alerts: string[];
  cleanedUp: number;
  duration: number;
  offsite: {
    enabled: boolean;
    uploaded: boolean;
    key?: string;
    target?: string;
    pruned?: number;
    error?: string;
  };
};

/**
 * GET /api/cron/backup?secret=CRON_SECRET
 *
 * Automated database backup system:
 * 1. Creates a consistent SQLite snapshot via VACUUM INTO
 * 2. Gzips the snapshot to ~20-30% of original size
 * 3. Uploads to offsite S3/R2 if configured (silently skipped otherwise)
 * 4. Verifies integrity via row counts + threat detection
 * 5. Rotates local backups (keeps last 30 days)
 * 6. Rotates offsite backups (keeps last 90 days)
 * 7. Emails a status report
 *
 * Should be triggered daily by an external cron service (Railway cron,
 * GitHub Actions, cron-job.org, etc.).
 */
export async function GET(req: NextRequest) {
  const cronSecret = req.nextUrl.searchParams.get("secret");
  if (cronSecret !== EXPECTED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const results: BackupResult = {
    success: false,
    backupFile: "",
    sizeBytes: 0,
    compressedSizeBytes: 0,
    integrity: { passed: false, details: {} },
    alerts: [],
    cleanedUp: 0,
    duration: 0,
    offsite: { enabled: false, uploaded: false },
  };

  let rawBackupPath = "";

  try {
    // ─── 1. Locate database file ───────────────────────────────────────
    const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    const dbPath = dbUrl.replace("file:", "").replace("?", "");
    const resolvedDbPath = path.resolve(process.cwd(), dbPath);

    if (!fs.existsSync(resolvedDbPath)) {
      return NextResponse.json({ error: "Database file not found", path: resolvedDbPath }, { status: 500 });
    }

    // ─── 2. Create backup directory ────────────────────────────────────
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // ─── 3. Create SQLite snapshot via VACUUM INTO ─────────────────────
    const rawFilename = `backup-${timestamp}.db`;
    rawBackupPath = path.join(backupDir, rawFilename);
    await prisma.$queryRawUnsafe(`VACUUM INTO '${rawBackupPath}'`);
    results.sizeBytes = fs.existsSync(rawBackupPath) ? fs.statSync(rawBackupPath).size : 0;

    // ─── 4. Gzip the snapshot, then delete the raw copy ────────────────
    const gzFilename = `${rawFilename}.gz`;
    const gzPath = path.join(backupDir, gzFilename);
    await pipeline(
      fs.createReadStream(rawBackupPath),
      zlib.createGzip({ level: 9 }),
      fs.createWriteStream(gzPath)
    );
    fs.unlinkSync(rawBackupPath);
    rawBackupPath = "";

    results.backupFile = gzFilename;
    results.compressedSizeBytes = fs.statSync(gzPath).size;

    // ─── 5. Integrity check — count rows in key tables ─────────────────
    const [clinicCount, userCount, patientCount, appointmentCount, invoiceCount] =
      await Promise.all([
        prisma.clinic.count(),
        prisma.user.count(),
        prisma.patient.count(),
        prisma.appointment.count(),
        prisma.invoice.count(),
      ]);

    results.integrity.details = {
      clinics: clinicCount,
      users: userCount,
      patients: patientCount,
      appointments: appointmentCount,
      invoices: invoiceCount,
    };

    // ─── 6. Compare with previous backup metadata ──────────────────────
    const metaPath = path.join(backupDir, "backup-meta.json");
    let previousMeta: Record<string, number> | null = null;

    if (fs.existsSync(metaPath)) {
      try {
        previousMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      } catch { /* ignore corrupted meta */ }
    }

    // Threat detection: check for suspicious changes
    if (previousMeta) {
      const checks = [
        { table: "clinics", prev: previousMeta.clinics || 0, curr: clinicCount },
        { table: "users", prev: previousMeta.users || 0, curr: userCount },
        { table: "patients", prev: previousMeta.patients || 0, curr: patientCount },
        { table: "appointments", prev: previousMeta.appointments || 0, curr: appointmentCount },
        { table: "invoices", prev: previousMeta.invoices || 0, curr: invoiceCount },
      ];

      for (const check of checks) {
        if (check.prev > 10 && check.curr < check.prev * 0.8) {
          results.alerts.push(
            `⚠️ SUSPICIOUS: ${check.table} dropped from ${check.prev} to ${check.curr} (${Math.round((1 - check.curr / check.prev) * 100)}% decrease)`
          );
        }
        if (check.prev > 0 && check.curr === 0) {
          results.alerts.push(
            `🚨 CRITICAL: ${check.table} table is EMPTY (was ${check.prev} records)`
          );
        }
      }

      const prevSize = previousMeta._backupSize || 0;
      if (prevSize > 0 && results.sizeBytes < prevSize * 0.5) {
        results.alerts.push(
          `⚠️ Backup size dropped significantly: ${formatBytes(prevSize)} → ${formatBytes(results.sizeBytes)}`
        );
      }
    }

    fs.writeFileSync(metaPath, JSON.stringify({
      ...results.integrity.details,
      _backupSize: results.sizeBytes,
      _compressedSize: results.compressedSizeBytes,
      _timestamp: new Date().toISOString(),
    }));

    results.integrity.passed =
      results.compressedSizeBytes > 0 &&
      results.alerts.filter((a) => a.includes("CRITICAL")).length === 0;

    // ─── 7. Upload to offsite S3/R2 (if configured) ────────────────────
    const s3Config = loadS3Config();
    if (s3Config) {
      results.offsite.enabled = true;
      results.offsite.target = describeTarget(s3Config);
      try {
        const uploaded = await uploadBackup(s3Config, gzPath, gzFilename);
        results.offsite.uploaded = true;
        results.offsite.key = uploaded.key;

        // Prune offsite copies older than retention window
        const pruned = await pruneOldBackups(s3Config, OFFSITE_RETENTION_DAYS);
        results.offsite.pruned = pruned.deleted;
      } catch (err) {
        // Don't fail the whole job if offsite upload fails — local backup
        // still succeeded and the email will flag the problem.
        const msg = err instanceof Error ? err.message : String(err);
        results.offsite.error = msg;
        results.alerts.push(`⚠️ Offsite upload failed: ${msg}`);
        console.error("Offsite backup upload failed:", err);
      }
    }

    // ─── 8. Cleanup old local backups ──────────────────────────────────
    const backupFiles = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith("backup-") && (f.endsWith(".db") || f.endsWith(".db.gz")))
      .sort()
      .reverse();

    if (backupFiles.length > MAX_LOCAL_BACKUPS) {
      const toDelete = backupFiles.slice(MAX_LOCAL_BACKUPS);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(backupDir, file));
        results.cleanedUp++;
      }
    }

    results.success = true;
    results.duration = Date.now() - startTime;

    // ─── 9. Send status email ──────────────────────────────────────────
    const hasAlerts = results.alerts.length > 0;
    const subject = hasAlerts
      ? `🚨 AyurGate Backup Alert — ${timestamp.slice(0, 10)}`
      : `✅ AyurGate Backup Complete — ${timestamp.slice(0, 10)}`;

    const alertsHtml = results.alerts.length > 0
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
          <h3 style="color:#991b1b;margin:0 0 8px;">Security Alerts</h3>
          ${results.alerts.map((a) => `<p style="color:#b91c1c;margin:4px 0;font-size:14px;">${a}</p>`).join("")}
         </div>`
      : "";

    const offsiteRow = results.offsite.enabled
      ? `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Offsite Upload</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:${results.offsite.uploaded ? "#059669" : "#dc2626"};border:1px solid #e5e7eb;">
            ${results.offsite.uploaded ? `✓ ${results.offsite.target}` : `✗ ${results.offsite.error || "failed"}`}
          </td>
         </tr>`
      : `<tr>
          <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Offsite Upload</td>
          <td style="padding:10px 14px;font-size:13px;color:#9ca3af;border:1px solid #e5e7eb;">Not configured (set BACKUP_S3_* vars)</td>
         </tr>`;

    const html = `
    <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;">
      <div style="background:linear-gradient(135deg,#14532d,#2d6a4f);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:white;">AyurGate</div>
        <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Database Backup Report</div>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <span style="font-size:24px;">${results.integrity.passed ? "✅" : "⚠️"}</span>
          <span style="font-size:18px;font-weight:700;color:${results.integrity.passed ? "#059669" : "#dc2626"};">
            ${results.integrity.passed ? "Backup Successful" : "Backup Completed with Alerts"}
          </span>
        </div>

        ${alertsHtml}

        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Backup File</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111;border:1px solid #e5e7eb;">${results.backupFile}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Raw → Compressed</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111;border:1px solid #e5e7eb;">${formatBytes(results.sizeBytes)} → ${formatBytes(results.compressedSizeBytes)} (${results.sizeBytes > 0 ? Math.round((1 - results.compressedSizeBytes / results.sizeBytes) * 100) : 0}% saved)</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Duration</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111;border:1px solid #e5e7eb;">${results.duration}ms</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;color:#6b7280;border:1px solid #e5e7eb;">Local Retention</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#111;border:1px solid #e5e7eb;">${MAX_LOCAL_BACKUPS} days (cleaned up ${results.cleanedUp} old)</td>
          </tr>
          ${offsiteRow}
        </table>

        <h3 style="font-size:15px;font-weight:700;color:#111;margin:20px 0 8px;">Data Snapshot</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#f0fdf4;">
            <th style="padding:8px 14px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;text-align:left;">Table</th>
            <th style="padding:8px 14px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;text-align:right;">Records</th>
          </tr>
          ${Object.entries(results.integrity.details).map(([table, count], i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"};">
              <td style="padding:8px 14px;font-size:13px;color:#374151;border:1px solid #e5e7eb;text-transform:capitalize;">${table}</td>
              <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#111;border:1px solid #e5e7eb;text-align:right;">${count.toLocaleString()}</td>
            </tr>
          `).join("")}
        </table>
      </div>
      <div style="background:#f9fafb;padding:16px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">Automated backup by AyurGate • ${new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
    </div>`;

    await sendEmail({
      to: BACKUP_EMAIL,
      subject,
      html,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Backup failed:", error);

    // Clean up half-finished raw backup if present
    if (rawBackupPath && fs.existsSync(rawBackupPath)) {
      try { fs.unlinkSync(rawBackupPath); } catch { /* ignore */ }
    }

    try {
      await sendEmail({
        to: BACKUP_EMAIL,
        subject: `🚨 AyurGate Backup FAILED — ${timestamp.slice(0, 10)}`,
        html: `
        <div style="max-width:500px;margin:0 auto;font-family:system-ui,sans-serif;padding:24px;">
          <h2 style="color:#dc2626;">Database Backup Failed</h2>
          <p style="color:#374151;">The automated backup at ${new Date().toLocaleString("en-SG")} failed with error:</p>
          <pre style="background:#fef2f2;padding:16px;border-radius:8px;color:#991b1b;font-size:13px;overflow:auto;">${error instanceof Error ? error.message : "Unknown error"}</pre>
          <p style="color:#6b7280;font-size:13px;">Please check the Railway logs immediately.</p>
        </div>`,
      });
    } catch { /* don't fail on email error */ }

    return NextResponse.json(
      { error: "Backup failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
