import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";
import fs from "fs";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

async function main() {
  console.log("📋 Seeding full application data...");

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  const dataPath = path.join(process.cwd(), "scripts", "full-data.json");
  if (!fs.existsSync(dataPath)) {
    console.log("⏭️  No full-data.json found, skipping");
    await prisma.$disconnect();
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // Check if already seeded (more than 3 patients means data was imported)
  const patientCount = await prisma.patient.count();
  if (patientCount > 5) {
    console.log(`⏭️  Already has ${patientCount} patients, skipping full data seed`);
    await prisma.$disconnect();
    return;
  }

  // Seed in dependency order
  const seedOrder: [string, unknown][] = [
    ["Patient", data.Patient],
    ["FamilyMember", data.FamilyMember],
    ["Treatment", data.Treatment],
    ["TreatmentPackage", data.TreatmentPackage],
    ["Appointment", data.Appointment],
    ["ClinicalNote", data.ClinicalNote],
    ["Vital", data.Vital],
    ["Prescription", data.Prescription],
    ["PrescriptionItem", data.PrescriptionItem],
    ["Communication", data.Communication],
    ["Reminder", data.Reminder],
    ["Invoice", data.Invoice],
    ["InvoiceItem", data.InvoiceItem],
    ["Payment", data.Payment],
    ["TreatmentPlan", data.TreatmentPlan],
    ["TreatmentPlanItem", data.TreatmentPlanItem],
    ["TreatmentMilestone", data.TreatmentMilestone],
    ["PatientPackage", data.PatientPackage],
    ["PackageSession", data.PackageSession],
    ["StockTransaction", data.StockTransaction],
  ];

  for (const [table, rows] of seedOrder) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

    let created = 0;
    for (const row of rows) {
      try {
        // Convert date strings back to Date objects
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (value === null || value === "None") {
            cleaned[key] = null;
          } else if (
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}/.test(value) &&
            (key.toLowerCase().includes("date") ||
              key.toLowerCase().includes("at") ||
              key === "createdAt" ||
              key === "updatedAt" ||
              key === "sentAt" ||
              key === "scheduledAt" ||
              key === "lastLogin")
          ) {
            cleaned[key] = new Date(value);
          } else {
            cleaned[key] = value;
          }
        }

        // Use raw create to preserve IDs
        // @ts-expect-error - dynamic table access
        await prisma[table.charAt(0).toLowerCase() + table.slice(1)].create({
          data: cleaned,
        });
        created++;
      } catch {
        // Skip duplicates silently
      }
    }

    if (created > 0) {
      console.log(`  ✅ ${table}: ${created}/${rows.length} seeded`);
    }
  }

  console.log("📋 Full data seed complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Full data seed error:", e);
  // Don't exit with error — this is optional seeding
});
