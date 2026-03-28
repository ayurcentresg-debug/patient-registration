/**
 * Post-migration script: Import Doctor data into User model and remap appointments.
 * Also seeds admin user and clinic settings.
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

async function main() {
  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  // 1. Seed admin user
  const adminEmail = "admin@clinic.com";
  const adminPassword = "admin123";
  const hashed = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashed, role: "admin", isActive: true },
    create: {
      name: "Admin",
      email: adminEmail,
      password: hashed,
      role: "admin",
      isActive: true,
      staffIdNumber: "A10001",
      status: "active",
    },
  });
  console.log(`✅ Admin user: ${admin.email} (${admin.id})`);

  // 2. Seed clinic settings
  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      clinicName: "Ayur Centre Pte. Ltd.",
      address: "84 Bedok North Street 4 #01-17",
      city: "Singapore",
      state: "Singapore",
      zipCode: "460084",
      phone: "6445 0072",
      email: "ayurcentresg@gmail.com",
      website: "www.ayurcentre.sg",
    },
  });
  console.log("✅ Clinic settings seeded");

  // 3. Import doctors from export file
  const exportPath = path.join(process.cwd(), "migration-export.json");
  if (!fs.existsSync(exportPath)) {
    console.log("⚠️  No migration-export.json found, skipping doctor import");
    await prisma.$disconnect();
    return;
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, "utf-8"));
  const doctors = exportData.doctors || [];
  const appointments = exportData.appointments || [];

  // Map old doctor ID -> new user ID
  const idMap: Record<string, string> = {};

  for (const doc of doctors) {
    // Try to find existing user by email, or create new
    const email = doc.email || `${doc.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@staff.local`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: doc.name,
        role: doc.role, // "doctor" | "therapist"
        gender: doc.gender,
        specialization: doc.specialization,
        department: doc.department,
        phone: doc.phone,
        consultationFee: doc.consultationFee,
        schedule: doc.schedule,
        slotDuration: doc.slotDuration,
        status: doc.status,
        staffIdNumber: doc.doctorIdNumber,
      },
      create: {
        name: doc.name,
        email,
        role: doc.role,
        gender: doc.gender,
        specialization: doc.specialization,
        department: doc.department,
        phone: doc.phone,
        consultationFee: doc.consultationFee,
        schedule: doc.schedule,
        slotDuration: doc.slotDuration,
        status: doc.status,
        staffIdNumber: doc.doctorIdNumber,
        isActive: true,
        status: "active",
      },
    });

    idMap[doc.id] = user.id;
    console.log(`✅ Imported ${doc.role}: ${doc.name} (${doc.doctorIdNumber}) → ${user.id}`);
  }

  // 4. We need to re-import the full backup data for appointments/patients/etc
  // Since the DB was reset, we'll restore from the backup using SQLite directly
  console.log("\n📋 Doctor ID mapping:");
  for (const [oldId, newId] of Object.entries(idMap)) {
    console.log(`   ${oldId} → ${newId}`);
  }

  console.log("\n✅ Staff import complete!");
  console.log(`   Imported ${doctors.length} staff members`);
  console.log(`   ${appointments.length} appointments need remapping (use backup restore)`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
