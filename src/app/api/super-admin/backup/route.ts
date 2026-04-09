import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/super-admin-auth";
import fs from "fs";
import path from "path";

/**
 * GET /api/super-admin/backup
 * Returns backup history and status for the super admin dashboard
 */
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backupDir = path.join(process.cwd(), "backups");

    if (!fs.existsSync(backupDir)) {
      return NextResponse.json({
        backups: [],
        meta: null,
        message: "No backups yet. Trigger a backup at /api/cron/backup?secret=YOUR_CRON_SECRET",
      });
    }

    // List all backup files
    const backupFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith("backup-") && f.endsWith(".db"))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        // Extract timestamp from filename: backup-2026-04-09T14-30-00.db
        const tsMatch = f.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        const timestamp = tsMatch ? tsMatch[1].replace(/-/g, (m, offset) => offset > 9 ? ":" : m).replace("T", " ") : f;
        return {
          filename: f,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          createdAt: stat.mtime.toISOString(),
          timestamp,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Read meta file
    const metaPath = path.join(backupDir, "backup-meta.json");
    let meta = null;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      backups: backupFiles,
      meta,
      totalBackups: backupFiles.length,
      totalSize: formatBytes(backupFiles.reduce((s, f) => s + f.size, 0)),
      latestBackup: backupFiles[0] || null,
    });
  } catch (error) {
    console.error("Error fetching backup status:", error);
    return NextResponse.json({ error: "Failed to fetch backup status" }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/backup
 * Trigger a manual backup (calls the cron backup endpoint internally)
 */
export async function POST() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.CRON_SECRET || "ayurgate-daily-2026";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/cron/backup?secret=${secret}`);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Manual backup trigger failed:", error);
    return NextResponse.json({ error: "Failed to trigger backup" }, { status: 500 });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
