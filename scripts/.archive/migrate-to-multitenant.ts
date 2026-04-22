/**
 * Migration Script: Single-Tenant → Multi-Tenant
 *
 * This script:
 * 1. Creates a "Clinic" record for Ayur Centre Singapore (Tenant #1)
 * 2. Creates a ClinicSubscription (enterprise plan, no expiry)
 * 3. Backfills clinicId on ALL existing records across all tables
 * 4. Updates ClinicSettings to use clinicId instead of singleton "default" id
 *
 * Run: npx tsx scripts/migrate-to-multitenant.ts
 *
 * IMPORTANT: Back up dev.db before running!
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
  const prisma = new PrismaClient({ adapter });

  console.log("🏥 Starting multi-tenant migration...");
  console.log(`   Database: ${DB_PATH}`);

  // Step 1: Create Clinic record for Ayur Centre
  console.log("\n1️⃣  Creating Clinic: Ayur Centre Pte. Ltd.");

  let clinic = await prisma.clinic.findFirst({ where: { slug: "ayur-centre" } });

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: "Ayur Centre Pte. Ltd.",
        slug: "ayur-centre",
        email: "ayurcentresg@gmail.com",
        phone: "6445 0072",
        address: "84 Bedok North Street 4 #01-17",
        city: "Singapore",
        state: "Singapore",
        country: "Singapore",
        zipCode: "460084",
        website: "www.ayurcentre.sg",
        currency: "SGD",
        timezone: "Asia/Singapore",
      },
    });
    console.log(`   ✅ Created clinic: ${clinic.id}`);
  } else {
    console.log(`   ⏭️  Clinic already exists: ${clinic.id}`);
  }

  // Step 2: Create Subscription (enterprise, no trial)
  console.log("\n2️⃣  Creating Subscription (enterprise)");

  const existingSub = await prisma.clinicSubscription.findUnique({
    where: { clinicId: clinic.id },
  });

  if (!existingSub) {
    await prisma.clinicSubscription.create({
      data: {
        clinicId: clinic.id,
        plan: "enterprise",
        status: "active",
        maxUsers: 999,
        maxPatients: 99999,
      },
    });
    console.log("   ✅ Created enterprise subscription");
  } else {
    console.log("   ⏭️  Subscription already exists");
  }

  const clinicId = clinic.id;

  // Step 3: Backfill clinicId on all tables
  console.log("\n3️⃣  Backfilling clinicId across all tables...");

  // List of all models that need clinicId backfill
  // Using raw SQL for efficiency since Prisma updateMany can't update where clinicId IS NULL easily
  const tables = [
    "Patient",
    "FamilyMember",
    "Appointment",
    "Communication",
    "ClinicalNote",
    "Document",
    "Vital",
    "Treatment",
    "TreatmentPackage",
    "InventoryItem",
    "InventoryVariant",
    "StockTransaction",
    "Supplier",
    "Invoice",
    "InvoiceItem",
    "Payment",
    "InsuranceProvider",
    "InsuranceClaim",
    "CreditNote",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "MessageTemplate",
    "Reminder",
    "Prescription",
    "PrescriptionItem",
    "TreatmentPlan",
    "TreatmentPlanItem",
    "TreatmentMilestone",
    "User",
    "Branch",
    "BranchStock",
    "StockTransfer",
    "StockTransferItem",
    "TransferTemplate",
    "TransferTemplateItem",
    "PatientPackage",
    "PackageSession",
    "PackageShare",
    "PackageRefund",
    "Notification",
    "AuditLog",
  ];

  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "clinicId" = '${clinicId}' WHERE "clinicId" IS NULL`
      );
      console.log(`   ✅ ${table}: ${result} rows updated`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`   ⚠️  ${table}: ${msg}`);
    }
  }

  // Step 4: Update ClinicSettings
  console.log("\n4️⃣  Updating ClinicSettings...");

  try {
    // Find existing settings (may have id="default" from old schema)
    const settings = await prisma.clinicSettings.findFirst({
      where: { clinicId: null },
    });

    if (settings) {
      await prisma.clinicSettings.update({
        where: { id: settings.id },
        data: { clinicId },
      });
      console.log("   ✅ Updated existing ClinicSettings with clinicId");
    } else {
      const withClinic = await prisma.clinicSettings.findFirst({
        where: { clinicId },
      });
      if (withClinic) {
        console.log("   ⏭️  ClinicSettings already has clinicId");
      } else {
        console.log("   ℹ️  No existing ClinicSettings found — will be created on first access");
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`   ⚠️  ClinicSettings: ${msg}`);
  }

  // Summary
  console.log("\n✨ Migration complete!");
  console.log(`   Clinic ID: ${clinicId}`);
  console.log(`   Slug: ayur-centre`);
  console.log("   Plan: enterprise (unlimited)");
  console.log("\n   Next steps:");
  console.log("   1. Re-login to get new JWT with clinicId");
  console.log("   2. Verify data in admin panel");
  console.log("   3. Deploy to Railway");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
