import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import crypto from "crypto";

// Use same DB path as runtime — DB_PATH env var or dev.db in project root
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

/** Generate a secure random password if none provided via env */
function generateSecurePassword(): string {
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
}

async function main() {
  console.log(`📂 Database path: ${dbPath}`);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  // Use env vars for passwords, or generate secure random ones
  const rawAdminPass = process.env.SEED_ADMIN_PASSWORD || generateSecurePassword();
  const rawDoctorPass = process.env.SEED_DOCTOR_PASSWORD || generateSecurePassword();

  const adminPassword = await bcrypt.hash(rawAdminPass, 12);
  const doctorPassword = await bcrypt.hash(rawDoctorPass, 12);

  // ─── Admin ────────────────────────────────────────────────────────────
  const existingAdmin = await prisma.user.findFirst({ where: { email: "admin@clinic.com" } });
  if (existingAdmin) {
    // Never overwrite existing admin password — only ensure active
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { isActive: true } });
    console.log(`⏭️  Admin already exists: ${existingAdmin.email} (password unchanged)`);
  } else {
    const admin = await prisma.user.create({ data: {
      name: "Admin",
      email: "admin@clinic.com",
      password: adminPassword,
      role: "admin",
      isActive: true,
      staffIdNumber: "A10001",
      status: "active",
    }});
    console.log(`✅ Admin created: ${admin.email}`);
  }

  // ─── Doctors ──────────────────────────────────────────────────────────
  const doctors = [
    {
      name: "Dr. Rajesh Kumar",
      email: "rajesh@clinic.com",
      phone: "+6591234567",
      specialization: "Kayachikitsa",
      department: "Panchakarma",
      staffIdNumber: "D10001",
      consultationFee: 50,
      slotDuration: 30,
      schedule: JSON.stringify({
        monday: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        tuesday: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        wednesday: [{ start: "09:00", end: "13:00" }],
        thursday: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        friday: [{ start: "09:00", end: "13:00" }],
      }),
    },
    {
      name: "Karthikeyan Periyasami",
      email: "ayurvista@gmail.com",
      phone: "+919962326631",
      specialization: "General Physician",
      department: "General Medicine",
      staffIdNumber: "D10002",
      consultationFee: 20,
      slotDuration: 20,
      schedule: "{}",
    },
    {
      name: "Dr. 3Phala",
      email: "3phala@gmail.com",
      phone: "+6590909090",
      specialization: "Panchakarma",
      department: "Yoga & Naturopathy",
      staffIdNumber: "D10003",
      consultationFee: 25,
      slotDuration: 30,
      schedule: JSON.stringify({
        monday: [{ start: "09:00", end: "13:00" }],
        tuesday: [{ start: "09:00", end: "13:00" }],
        wednesday: [{ start: "09:00", end: "13:00" }],
        thursday: [{ start: "09:00", end: "13:00" }],
        friday: [{ start: "09:00", end: "13:00" }],
        saturday: [{ start: "09:00", end: "13:00" }],
      }),
    },
  ];

  for (const doc of doctors) {
    const existingDoc = await prisma.user.findFirst({ where: { email: doc.email } });
    if (existingDoc) {
      // Never overwrite existing password — only ensure active
      await prisma.user.update({ where: { id: existingDoc.id }, data: { isActive: true, status: "active" } });
      console.log(`⏭️  Doctor already exists: ${doc.name} (password unchanged)`);
    } else {
      await prisma.user.create({ data: {
        name: doc.name, email: doc.email, password: doctorPassword, role: "doctor",
        phone: doc.phone, specialization: doc.specialization, department: doc.department,
        staffIdNumber: doc.staffIdNumber, consultationFee: doc.consultationFee,
        slotDuration: doc.slotDuration, schedule: doc.schedule, isActive: true, status: "active",
      }});
      console.log(`✅ Doctor created: ${doc.name} (${doc.email})`);
    }
  }

  // ─── Therapists ───────────────────────────────────────────────────────
  const therapists = [
    {
      name: "SIJU",
      email: "siju@staff.local",
      specialization: "Abhyanga",
      department: "Panchakarma",
      staffIdNumber: "T10003",
    },
    {
      name: "LINU",
      email: "linu@staff.local",
      specialization: "General Therapy",
      department: "Panchakarma",
      staffIdNumber: "T10001",
    },
  ];

  for (const t of therapists) {
    const existingT = await prisma.user.findFirst({ where: { email: t.email } });
    if (existingT) {
      // Never overwrite existing password — only ensure active
      await prisma.user.update({ where: { id: existingT.id }, data: { isActive: true, status: "active" } });
      console.log(`⏭️  Therapist already exists: ${t.name} (password unchanged)`);
    } else {
      await prisma.user.create({ data: {
        name: t.name, email: t.email, password: doctorPassword, role: "therapist",
        specialization: t.specialization, department: t.department, staffIdNumber: t.staffIdNumber,
        consultationFee: 0, slotDuration: 30, schedule: "{}", isActive: true, status: "active",
      }});
      console.log(`✅ Therapist created: ${t.name} (${t.email})`);
    }
  }

  // ─── Patients ─────────────────────────────────────────────────────────
  const patients = [
    {
      patientIdNumber: "P10001",
      firstName: "Harini",
      lastName: "Karthikeyan",
      phone: "+65937667676",
      gender: "female",
      dateOfBirth: new Date("2010-07-07"),
      status: "inactive",
    },
    {
      patientIdNumber: "P10002",
      firstName: "Bharathi",
      lastName: "Karthikeyan",
      phone: "9898989898",
      gender: "female",
      dateOfBirth: new Date("2000-08-02"),
      status: "active",
    },
    {
      patientIdNumber: "P10003",
      firstName: "Sangeetha",
      lastName: "Karthikeyan",
      phone: "+6590118920",
      email: "keyan1987@gmail.com",
      gender: "female",
      dateOfBirth: new Date("1987-07-07"),
      bloodGroup: "A+",
      address: "84 Bedok North Street",
      status: "active",
    },
  ];

  for (const p of patients) {
    const existing = await prisma.patient.findFirst({ where: { patientIdNumber: p.patientIdNumber } });
    if (!existing) {
      await prisma.patient.create({ data: p });
      console.log(`✅ Patient: ${p.firstName} ${p.lastName} (${p.patientIdNumber})`);
    } else {
      console.log(`⏭️  Patient already exists: ${p.firstName} ${p.lastName}`);
    }
  }

  // ─── Clinic Settings ──────────────────────────────────────────────────
  const existingSettings = await prisma.clinicSettings.findFirst();
  if (!existingSettings) {
    await prisma.clinicSettings.create({
      data: {
        clinicName: "Ayur Centre Pte. Ltd.",
        address: "84 Bedok North Street 4 #01-17",
        city: "Singapore",
        state: "Singapore",
        zipCode: "460084",
        phone: "6445 0072",
        email: "ayurcentresg@gmail.com",
        website: "www.ayurcentre.sg",
        currency: "SGD",
        dateFormat: "dd/MM/yyyy",
        timeFormat: "12h",
        appointmentDuration: 30,
        workingHoursStart: "09:00",
        workingHoursEnd: "18:00",
        workingDays: "[1,2,3,4,5,6]",
      },
    });
  }

  console.log("✅ Clinic settings seeded");
  console.log("\n🎉 Seed complete.");
  console.log("💡 Set passwords via env vars: SEED_ADMIN_PASSWORD, SEED_DOCTOR_PASSWORD");
  console.log("   Passwords are only applied when creating NEW users (existing passwords are never overwritten).");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
