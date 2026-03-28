import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import path from "path";
import fs from "fs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

function getDbPath() {
  // In production, use persistent volume at /data/ if it exists
  // Set RAILWAY_VOLUME_MOUNT_PATH or DB_PATH env var, or default to /data
  const volumePath = process.env.DB_PATH || process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (volumePath && fs.existsSync(path.dirname(volumePath))) {
    return volumePath;
  }
  if (process.env.NODE_ENV === "production") {
    // Try /data directory (Railway volume mount point)
    const dataDir = "/data";
    if (fs.existsSync(dataDir)) {
      return path.join(dataDir, "clinic.db");
    }
  }
  // Fallback to local dev.db
  return path.join(process.cwd(), "dev.db");
}

export const DB_PATH = getDbPath();

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
