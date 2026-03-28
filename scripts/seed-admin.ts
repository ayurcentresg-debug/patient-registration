import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import path from "path";

// Use same DB path as runtime — DB_PATH env var or dev.db in project root
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "dev.db");

async function main() {
  console.log(`📂 Database path: ${dbPath}`);

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });

  const adminPassword = await bcrypt.hash("admin123", 12);
  const doctorPassword = await bcrypt.hash("doctor123", 12);

  // ─── Admin ────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: { password: adminPassword, role: "admin", isActive: true },
    create: {
      name: "Admin",
      email: "admin@clinic.com",
      password: adminPassword,
      role: "admin",
      isActive: true,
      staffIdNumber: "A10001",
      status: "active",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

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
    await prisma.user.upsert({
      where: { email: doc.email },
      update: { password: doctorPassword, isActive: true, status: "active" },
      create: {
        name: doc.name,
        email: doc.email,
        password: doctorPassword,
        role: "doctor",
        phone: doc.phone,
        specialization: doc.specialization,
        department: doc.department,
        staffIdNumber: doc.staffIdNumber,
        consultationFee: doc.consultationFee,
        slotDuration: doc.slotDuration,
        schedule: doc.schedule,
        isActive: true,
        status: "active",
      },
    });
    console.log(`✅ Doctor: ${doc.name} (${doc.email}) — password: doctor123`);
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
    await prisma.user.upsert({
      where: { email: t.email },
      update: { password: doctorPassword, isActive: true, status: "active" },
      create: {
        name: t.name,
        email: t.email,
        password: doctorPassword,
        role: "therapist",
        specialization: t.specialization,
        department: t.department,
        staffIdNumber: t.staffIdNumber,
        consultationFee: 0,
        slotDuration: 30,
        schedule: "{}",
        isActive: true,
        status: "active",
      },
    });
    console.log(`✅ Therapist: ${t.name} (${t.email}) — password: doctor123`);
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
      currency: "SGD",
      dateFormat: "dd/MM/yyyy",
      timeFormat: "12h",
      appointmentDuration: 30,
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      workingDays: "[1,2,3,4,5,6]",
    },
  });

  console.log("✅ Clinic settings seeded");
  console.log("\n🎉 All done! Login credentials:");
  console.log("   Admin:      admin@clinic.com / admin123");
  console.log("   Doctors:    rajesh@clinic.com / doctor123");
  console.log("               3phala@gmail.com / doctor123");
  console.log("               ayurvista@gmail.com / doctor123");
  console.log("   Therapists: siju@staff.local / doctor123");
  console.log("               linu@staff.local / doctor123");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
