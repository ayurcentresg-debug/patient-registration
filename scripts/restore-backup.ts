#!/usr/bin/env tsx
/**
 * Restore a SQLite database from a local or offsite backup.
 *
 * Usage:
 *   # From a local gzipped backup
 *   tsx scripts/restore-backup.ts ./backups/backup-2026-04-15T03-00-00.db.gz
 *
 *   # From a local uncompressed backup (legacy)
 *   tsx scripts/restore-backup.ts ./backups/backup-2026-04-15T03-00-00.db
 *
 *   # Pull latest from S3/R2 and restore
 *   tsx scripts/restore-backup.ts --offsite
 *
 *   # Pull a specific key from S3/R2
 *   tsx scripts/restore-backup.ts --offsite --key=backups/backup-2026-04-15.db.gz
 *
 * Safety:
 * - Refuses to run unless --yes is passed (prevents accidental overwrite).
 * - Backs up the current DB to <db>.pre-restore before overwriting.
 * - Verifies the restored file is a valid SQLite database.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import { execSync } from "child_process";
import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { loadS3Config } from "../src/lib/backup-storage";

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes("--yes");
  const offsite = args.includes("--offsite");
  const keyArg = args.find((a) => a.startsWith("--key="))?.slice(6);
  const localPath = args.find((a) => !a.startsWith("--"));

  if (!offsite && !localPath) {
    console.error("Usage: tsx scripts/restore-backup.ts <backup-file> [--yes]");
    console.error("   or: tsx scripts/restore-backup.ts --offsite [--key=<s3-key>] [--yes]");
    process.exit(1);
  }

  // Resolve target DB path from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const dbPath = path.resolve(process.cwd(), dbUrl.replace("file:", "").replace("?", ""));
  console.log(`Target database: ${dbPath}`);

  // ─── 1. Fetch the backup file ──────────────────────────────────────
  const tmpDir = path.join(process.cwd(), ".restore-tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  let sourceFile: string;
  if (offsite) {
    const cfg = loadS3Config();
    if (!cfg) {
      console.error("✗ BACKUP_S3_* env vars not set — cannot pull from offsite.");
      process.exit(1);
    }
    const client = new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      endpoint: cfg.endpoint,
      forcePathStyle: Boolean(cfg.endpoint),
    });

    let key = keyArg;
    if (!key) {
      // Find the newest object under the prefix
      const list = await client.send(new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: cfg.prefix.replace(/\/+$/, "") + "/",
      }));
      const latest = (list.Contents || [])
        .filter((o) => o.Key && o.LastModified)
        .sort((a, b) => b.LastModified!.getTime() - a.LastModified!.getTime())[0];
      if (!latest?.Key) {
        console.error("✗ No backups found in S3 bucket.");
        process.exit(1);
      }
      key = latest.Key;
      console.log(`Latest offsite backup: ${key} (${latest.LastModified?.toISOString()})`);
    }

    console.log(`Downloading ${key} from ${cfg.bucket}...`);
    const obj = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
    sourceFile = path.join(tmpDir, path.basename(key));
    await pipeline(obj.Body as Readable, fs.createWriteStream(sourceFile));
    console.log(`✓ Downloaded ${sourceFile} (${fs.statSync(sourceFile).size} bytes)`);
  } else {
    sourceFile = path.resolve(localPath!);
    if (!fs.existsSync(sourceFile)) {
      console.error(`✗ Backup file not found: ${sourceFile}`);
      process.exit(1);
    }
  }

  // ─── 2. Decompress if gzipped ──────────────────────────────────────
  let restoredFile = sourceFile;
  if (sourceFile.endsWith(".gz")) {
    restoredFile = path.join(tmpDir, path.basename(sourceFile).replace(/\.gz$/, ""));
    console.log(`Decompressing to ${restoredFile}...`);
    await pipeline(
      fs.createReadStream(sourceFile),
      zlib.createGunzip(),
      fs.createWriteStream(restoredFile)
    );
    console.log(`✓ Decompressed (${fs.statSync(restoredFile).size} bytes)`);
  }

  // ─── 3. Verify it's a valid SQLite file ────────────────────────────
  const header = fs.readFileSync(restoredFile, { encoding: null }).subarray(0, 16).toString("utf-8");
  if (!header.startsWith("SQLite format 3")) {
    console.error("✗ File does not look like a SQLite database (bad header).");
    process.exit(1);
  }
  console.log("✓ Valid SQLite header detected.");

  // ─── 4. Confirm with user ──────────────────────────────────────────
  if (!yes) {
    console.log("");
    console.log("⚠️  About to OVERWRITE the current database with the restored backup.");
    console.log(`   Target: ${dbPath}`);
    console.log(`   Source: ${restoredFile}`);
    console.log("");
    console.log("Re-run with --yes to confirm:");
    console.log(`   tsx scripts/restore-backup.ts ${args.filter((a) => a !== "--yes").join(" ")} --yes`);
    process.exit(0);
  }

  // ─── 5. Snapshot current DB for safety ─────────────────────────────
  if (fs.existsSync(dbPath)) {
    const preRestorePath = `${dbPath}.pre-restore-${Date.now()}`;
    fs.copyFileSync(dbPath, preRestorePath);
    console.log(`✓ Current DB snapshotted to ${preRestorePath}`);
  }

  // ─── 6. Replace the DB file ────────────────────────────────────────
  fs.copyFileSync(restoredFile, dbPath);
  console.log(`✓ Restored ${dbPath} from backup.`);

  // ─── 7. Quick integrity check via sqlite3 CLI if available ─────────
  try {
    const output = execSync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`, { encoding: "utf-8" });
    console.log(`Integrity check: ${output.trim()}`);
  } catch {
    console.log("(sqlite3 CLI not installed — skipping integrity check. Test via `npm run dev`.)");
  }

  // Clean up temp files
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch { /* ignore */ }

  console.log("");
  console.log("✓ Restore complete. Start the app with `npm run dev` to verify.");
}

main().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
