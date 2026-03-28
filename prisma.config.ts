import "dotenv/config";
import { defineConfig } from "prisma/config";
import fs from "fs";
import path from "path";

function getDatabaseUrl(): string {
  const volumePath = process.env.DB_PATH || process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (volumePath && fs.existsSync(path.dirname(volumePath))) {
    return `file:${volumePath}`;
  }
  if (process.env.NODE_ENV === "production") {
    const dataDir = "/data";
    if (fs.existsSync(dataDir)) {
      return `file:${path.join(dataDir, "clinic.db")}`;
    }
  }
  return process.env["DATABASE_URL"] || "file:./dev.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
