import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DB_PATH
      ? `file:${process.env.DB_PATH}`
      : process.env["DATABASE_URL"] || "file:./dev.db",
  },
});
