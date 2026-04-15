/**
 * Offsite backup storage — S3-compatible (AWS S3 or Cloudflare R2).
 *
 * Works when all four BACKUP_S3_* env vars are set; otherwise the upload is
 * silently skipped and only local rotation happens. This lets the backup job
 * stay functional without any cloud storage configured, and lets the operator
 * upgrade to offsite later without code changes.
 *
 * For Cloudflare R2: set BACKUP_S3_ENDPOINT to your R2 jurisdiction endpoint
 * (e.g. https://<accountid>.r2.cloudflarestorage.com) and BACKUP_S3_REGION to
 * "auto". For AWS S3: omit BACKUP_S3_ENDPOINT and set the real region.
 */
import fs from "fs";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

export type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  prefix: string;
};

export function loadS3Config(): S3Config | null {
  const bucket = process.env.BACKUP_S3_BUCKET;
  const accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY;
  const region = process.env.BACKUP_S3_REGION;

  if (!bucket || !accessKeyId || !secretAccessKey || !region) {
    return null;
  }

  return {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: process.env.BACKUP_S3_ENDPOINT || undefined,
    prefix: process.env.BACKUP_S3_PREFIX || "backups/",
  };
}

function buildClient(cfg: S3Config): S3Client {
  return new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    endpoint: cfg.endpoint,
    forcePathStyle: Boolean(cfg.endpoint), // R2 and most non-AWS S3 need path-style
  });
}

export async function uploadBackup(
  cfg: S3Config,
  localPath: string,
  remoteKey: string
): Promise<{ bytesUploaded: number; key: string }> {
  const client = buildClient(cfg);
  const fileStream = fs.readFileSync(localPath); // small files — read whole into memory is fine
  const fullKey = `${cfg.prefix.replace(/\/+$/, "")}/${remoteKey}`;

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: fullKey,
      Body: fileStream,
      ContentType: "application/gzip",
      // Server-side encryption — AWS only honours; R2 silently ignores.
      ServerSideEncryption: cfg.endpoint ? undefined : "AES256",
    })
  );

  return { bytesUploaded: fileStream.byteLength, key: fullKey };
}

/**
 * Delete S3 objects older than `retentionDays`. Returns the number of
 * objects deleted.
 */
export async function pruneOldBackups(
  cfg: S3Config,
  retentionDays: number
): Promise<{ deleted: number; kept: number }> {
  const client = buildClient(cfg);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  let continuationToken: string | undefined;
  let deleted = 0;
  let kept = 0;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: cfg.prefix.replace(/\/+$/, "") + "/",
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents || []) {
      if (!obj.Key || !obj.LastModified) continue;
      if (obj.LastModified.getTime() < cutoff) {
        await client.send(
          new DeleteObjectCommand({ Bucket: cfg.bucket, Key: obj.Key })
        );
        deleted++;
      } else {
        kept++;
      }
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { deleted, kept };
}

/**
 * Tiny helper so callers can log where the backup went. Never logs credentials.
 */
export function describeTarget(cfg: S3Config): string {
  if (cfg.endpoint) {
    return `${cfg.endpoint}/${cfg.bucket}/${cfg.prefix}`;
  }
  return `s3://${cfg.bucket}/${cfg.prefix}`;
}
