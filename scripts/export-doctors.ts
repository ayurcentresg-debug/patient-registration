/**
 * Pre-migration script: Export Doctor data to JSON before schema change.
 * Run this BEFORE updating the Prisma schema.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";
import fs from "fs";

async function main() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  // Export all doctors
  const doctors = await prisma.doctor.findMany();
  console.log(`Found ${doctors.length} doctors/therapists to export`);

  // Export all appointments with doctorId mapping
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: { not: null } },
    select: { id: true, doctorId: true },
  });
  console.log(`Found ${appointments.length} appointments with doctor references`);

  const exportData = { doctors, appointments };
  const exportPath = path.join(process.cwd(), "migration-export.json");
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`Exported to ${exportPath}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
