/**
 * Cleanup Script: Remove demo patient data, communications, etc.
 * Keeps: Inventory, Users, Clinic, Branches, Settings
 *
 * Run: npx tsx scripts/cleanup-demo-data.ts
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
  const prisma = new PrismaClient({ adapter });

  console.log("🧹 Cleaning up demo data (keeping inventory, users, branches)...");
  console.log(`   Database: ${DB_PATH}`);

  // Delete in reverse dependency order to avoid FK constraint issues
  const tablesToClean = [
    // Billing / payments (depend on invoices, patients)
    "CreditNote",
    "Payment",
    "InvoiceItem",
    "Invoice",
    "InsuranceClaim",

    // Packages (depend on patients, treatment packages)
    "PackageRefund",
    "PackageShare",
    "PackageSession",
    "PatientPackage",

    // Treatment plans (depend on patients)
    "TreatmentMilestone",
    "TreatmentPlanItem",
    "TreatmentPlan",

    // Prescriptions (depend on patients)
    "PrescriptionItem",
    "Prescription",

    // Clinical (depend on patients, appointments)
    "Document",
    "Vital",
    "ClinicalNote",

    // Appointments (depend on patients)
    "Appointment",

    // Communications & reminders
    "Communication",
    "Reminder",
    "MessageTemplate",

    // Notifications & audit
    "Notification",
    "AuditLog",

    // Patients & families (top-level patient data)
    "FamilyMember",
    "Patient",

    // Branches & stock transfers
    "TransferTemplateItem",
    "TransferTemplate",
    "StockTransferItem",
    "StockTransfer",
    "BranchStock",
    "Branch",
  ];

  for (const table of tablesToClean) {
    try {
      const result = await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      console.log(`   ✅ ${table}: ${result} rows deleted`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Table might not exist or be empty — that's fine
      if (msg.includes("no such table")) {
        console.log(`   ⏭️  ${table}: table not found (skipping)`);
      } else {
        console.log(`   ⚠️  ${table}: ${msg}`);
      }
    }
  }

  console.log("\n✨ Cleanup complete! Kept: Inventory, Users, Clinic, Settings");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
