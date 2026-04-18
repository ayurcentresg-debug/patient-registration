/**
 * Demo Clinic Seed Script
 *
 * Creates a fully-populated demo clinic for testing all modules.
 *
 * Usage (against local dev.db):
 *   npx tsx prisma/seed-demo.ts
 *
 * Usage (against Railway prod — be careful):
 *   DB_PATH=/path/to/prod/clinic.db npx tsx prisma/seed-demo.ts
 *
 * Creates: 1 clinic, 1 admin, 2 doctors, 5 therapists (2 local + 3 foreign),
 *          1 receptionist, 1 supplier, 15 inventory items, 2 treatments,
 *          2 packages, 7 patients (Menon family of 4 + 3 individuals),
 *          10 appointments, 3 invoices.
 *
 * Idempotent: running twice exits early if clinic already exists.
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

// ─── Configuration ─────────────────────────────────────────────────────

const DEMO_CLINIC_EMAIL = "demo@ayurgate.com";
const DEMO_PASSWORD = "Demo2026!";
const DEMO_CLINIC_NAME = "Demo Clinic Singapore";
const DEMO_CLINIC_SLUG = "demo-clinic-sg";

// ─── Helpers ───────────────────────────────────────────────────────────

async function hashPw(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Main seed ─────────────────────────────────────────────────────────

async function seed() {
  console.log(`🌿 Seeding demo clinic...`);
  console.log(`   DB: ${DB_PATH}\n`);

  // Check if already exists
  const existing = await prisma.clinic.findFirst({
    where: { email: DEMO_CLINIC_EMAIL },
  });

  if (existing) {
    console.log(`⚠️  Demo clinic already exists (id: ${existing.id}).`);
    console.log(`    Delete it from /super-admin/clinics to re-seed.\n`);
    printLoginBox();
    return;
  }

  // ─── 1. Clinic + Subscription + Settings ───────────────────────────
  const clinic = await prisma.clinic.create({
    data: {
      name: DEMO_CLINIC_NAME,
      slug: DEMO_CLINIC_SLUG,
      email: DEMO_CLINIC_EMAIL,
      phone: "+65 6123 4567",
      address: "123 Orchard Road",
      city: "Singapore",
      country: "Singapore",
      zipCode: "238823",
      clinicType: "ayurveda",
      practitionerCount: "5-10",
      currency: "SGD",
      timezone: "Asia/Singapore",
      isActive: true,
      onboardingComplete: true,
      emailVerified: true,
      termsAcceptedAt: new Date(),
    },
  });
  console.log(`✅ Clinic: ${clinic.name} (${clinic.id})`);

  await prisma.clinicSubscription.create({
    data: {
      clinicId: clinic.id,
      plan: "professional",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: daysFromNow(30),
      maxUsers: 25,
      maxPatients: 5000,
    },
  });

  await prisma.clinicSettings.create({
    data: {
      clinicId: clinic.id,
      clinicName: DEMO_CLINIC_NAME,
      email: DEMO_CLINIC_EMAIL,
      phone: "+65 6123 4567",
      address: "123 Orchard Road, Singapore 238823",
      city: "Singapore",
      state: "Singapore",
      zipCode: "238823",
      currency: "SGD",
      gstRegistrationNo: "201912345A",
    },
  });
  console.log(`✅ Subscription (professional) + settings`);

  // ─── 2. Admin user ─────────────────────────────────────────────────
  const pwHash = await hashPw(DEMO_PASSWORD);
  const admin = await prisma.user.create({
    data: {
      clinicId: clinic.id,
      name: "Demo Admin",
      email: DEMO_CLINIC_EMAIL,
      phone: "+65 9123 4567",
      role: "admin",
      password: pwHash,
      isActive: true,
      staffIdNumber: "A10001",
      residencyStatus: "singaporean",
      gender: "female",
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── 3. Doctors ────────────────────────────────────────────────────
  const [doc1, doc2] = await Promise.all([
    prisma.user.create({
      data: {
        clinicId: clinic.id, name: "Dr. Priya Nair", email: "priya@demo-clinic.sg",
        phone: "+65 9111 2222", role: "doctor", password: pwHash, isActive: true,
        staffIdNumber: "D10001", residencyStatus: "singaporean", gender: "female",
        specialization: "Panchakarma", jobTitle: "Senior Ayurvedic Physician",
      },
    }),
    prisma.user.create({
      data: {
        clinicId: clinic.id, name: "Dr. Rajan Kumar", email: "rajan@demo-clinic.sg",
        phone: "+65 9111 3333", role: "doctor", password: pwHash, isActive: true,
        staffIdNumber: "D10002", residencyStatus: "singaporean", gender: "male",
        specialization: "Kaya Chikitsa", jobTitle: "Ayurvedic Physician",
      },
    }),
  ]);
  console.log(`✅ Doctors: 2`);

  // ─── 4. Therapists (2 local + 3 foreign) ───────────────────────────
  const therapists = await Promise.all([
    prisma.user.create({ data: { clinicId: clinic.id, name: "Aisha Fernandez", email: "aisha@demo-clinic.sg", phone: "+65 9222 1111", role: "therapist", password: pwHash, isActive: true, staffIdNumber: "T10001", residencyStatus: "singaporean", gender: "female", jobTitle: "Senior Therapist" } }),
    prisma.user.create({ data: { clinicId: clinic.id, name: "Lim Wei Jie", email: "weijie@demo-clinic.sg", phone: "+65 9222 2222", role: "therapist", password: pwHash, isActive: true, staffIdNumber: "T10002", residencyStatus: "pr", gender: "male", jobTitle: "Therapist" } }),
    prisma.user.create({ data: { clinicId: clinic.id, name: "Meera Sharma", email: "meera@demo-clinic.sg", phone: "+65 9333 1111", role: "therapist", password: pwHash, isActive: true, staffIdNumber: "T10003", residencyStatus: "foreigner", gender: "female", jobTitle: "Ayurvedic Therapist" } }),
    prisma.user.create({ data: { clinicId: clinic.id, name: "Ahmad Bin Ismail", email: "ahmad@demo-clinic.sg", phone: "+65 9333 2222", role: "therapist", password: pwHash, isActive: true, staffIdNumber: "T10004", residencyStatus: "foreigner", gender: "male", jobTitle: "Massage Therapist" } }),
    prisma.user.create({ data: { clinicId: clinic.id, name: "Sushila Tamang", email: "sushila@demo-clinic.sg", phone: "+65 9333 3333", role: "therapist", password: pwHash, isActive: true, staffIdNumber: "T10005", residencyStatus: "foreigner", gender: "female", jobTitle: "Therapist" } }),
  ]);
  console.log(`✅ Therapists: ${therapists.length} (2 local + 3 foreign)`);

  await prisma.user.create({
    data: {
      clinicId: clinic.id, name: "Tan Mei Ling", email: "meiling@demo-clinic.sg",
      phone: "+65 9444 1111", role: "receptionist", password: pwHash, isActive: true,
      staffIdNumber: "R10001", residencyStatus: "singaporean", gender: "female",
      jobTitle: "Front Desk Executive",
    },
  });
  console.log(`✅ Receptionist: 1`);

  // ─── 5. Supplier + Inventory ───────────────────────────────────────
  const supplier = await prisma.supplier.create({
    data: {
      clinicId: clinic.id,
      name: "Kottakkal Ayurveda Pvt Ltd",
      contactPerson: "Ramesh Kutty",
      email: "sales@kottakkal.demo",
      phone: "+91 98765 43210",
      address: "Kottakkal, Kerala, India",
      status: "active",
    },
  });

  const inventoryItems = [
    { name: "Dhanwantharam Taila", category: "oil", subcategory: "Thailam", unit: "bottle", unitPrice: 45.0, stock: 20, reorder: 5 },
    { name: "Kottamchukkadi Taila", category: "oil", subcategory: "Thailam", unit: "bottle", unitPrice: 38.0, stock: 15, reorder: 5 },
    { name: "Murivenna Oil", category: "oil", subcategory: "Thailam", unit: "bottle", unitPrice: 42.0, stock: 18, reorder: 5 },
    { name: "Triphala Churna", category: "herb", subcategory: "Choornam", unit: "bottle", unitPrice: 22.0, stock: 30, reorder: 10 },
    { name: "Ashwagandha Capsules", category: "medicine", unit: "bottle", unitPrice: 35.0, stock: 25, reorder: 8 },
    { name: "Arogyavardhini Vati", category: "medicine", unit: "bottle", unitPrice: 28.0, stock: 22, reorder: 6 },
    { name: "Chyawanprash", category: "medicine", subcategory: "Leham", unit: "bottle", unitPrice: 48.0, stock: 12, reorder: 4 },
    { name: "Navara Rice Bolus", category: "consumable", unit: "packet", unitPrice: 18.0, stock: 40, reorder: 15 },
    { name: "Herbal Steam Leaves", category: "consumable", unit: "packet", unitPrice: 12.0, stock: 50, reorder: 20 },
    { name: "Disposable Sheet Roll", category: "consumable", unit: "nos", unitPrice: 15.0, stock: 8, reorder: 10 }, // low stock!
    { name: "Gulkand (Rose Petal Jam)", category: "medicine", unit: "bottle", unitPrice: 16.0, stock: 14, reorder: 5 },
    { name: "Saraswatha Ghrita", category: "medicine", subcategory: "Ghritam", unit: "bottle", unitPrice: 55.0, stock: 10, reorder: 3 },
    { name: "Brahmi Oil", category: "oil", subcategory: "Thailam", unit: "bottle", unitPrice: 32.0, stock: 16, reorder: 5 },
    { name: "Neem Soap Bar", category: "consumable", unit: "nos", unitPrice: 8.0, stock: 60, reorder: 20 },
    { name: "Abhyangam Full Body Oil Kit", category: "medicine", unit: "nos", unitPrice: 85.0, stock: 6, reorder: 2 },
  ];

  for (let i = 0; i < inventoryItems.length; i++) {
    const item = inventoryItems[i];
    await prisma.inventoryItem.create({
      data: {
        clinicId: clinic.id,
        sku: `DEMO-${String(i + 1).padStart(4, "0")}`,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        unit: item.unit,
        unitPrice: item.unitPrice,
        costPrice: item.unitPrice * 0.6,
        reorderLevel: item.reorder,
        currentStock: item.stock,
        supplier: supplier.name,
        status: "active",
      },
    });
  }
  console.log(`✅ Inventory: ${inventoryItems.length} items`);

  // ─── 6. Treatments + Packages ──────────────────────────────────────
  const treatment1 = await prisma.treatment.create({
    data: {
      clinicId: clinic.id,
      name: "Panchakarma Detox",
      description: "Full 7-day Panchakarma detoxification program",
      category: "panchakarma",
      duration: 90,
      basePrice: 300.0,
      isActive: true,
    },
  });
  const treatment2 = await prisma.treatment.create({
    data: {
      clinicId: clinic.id,
      name: "Shirodhara",
      description: "Stress relief therapy — warm oil poured on forehead",
      category: "therapy",
      duration: 60,
      basePrice: 150.0,
      isActive: true,
    },
  });

  await prisma.treatmentPackage.create({
    data: {
      clinicId: clinic.id,
      treatmentId: treatment1.id,
      name: "Panchakarma Wellness Package (7 sessions)",
      sessionCount: 7,
      discountPercent: 14.3, // rough ~15% off
      totalPrice: 1800.0,
      pricePerSession: 257.14,
      isActive: true,
    },
  });
  await prisma.treatmentPackage.create({
    data: {
      clinicId: clinic.id,
      treatmentId: treatment2.id,
      name: "Stress Relief Package (5 sessions)",
      sessionCount: 5,
      discountPercent: 13.3,
      totalPrice: 650.0,
      pricePerSession: 130.0,
      isActive: true,
    },
  });
  console.log(`✅ Treatments: 2 + Packages: 2`);

  // ─── 7. Patients + Family (Menon family) ───────────────────────────
  const familyHead = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0001",
      firstName: "Ravi", lastName: "Menon", phone: "+65 9500 1111",
      email: "ravi.menon@demo.sg", gender: "male",
      dateOfBirth: new Date("1978-03-15"),
      address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123",
      bloodGroup: "B+",
    },
  });
  const familySpouse = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0002",
      firstName: "Lakshmi", lastName: "Menon", phone: "+65 9500 1112",
      email: "lakshmi.menon@demo.sg", gender: "female",
      dateOfBirth: new Date("1982-08-22"),
      address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123",
      bloodGroup: "O+",
    },
  });
  const familyChild1 = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0003",
      firstName: "Arjun", lastName: "Menon", phone: "+65 9500 1113",
      gender: "male", dateOfBirth: new Date("2010-05-10"),
      address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123",
      bloodGroup: "B+",
    },
  });
  const familyChild2 = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0004",
      firstName: "Priya", lastName: "Menon", phone: "+65 9500 1114",
      gender: "female", dateOfBirth: new Date("2013-11-03"),
      address: "Blk 123 Serangoon Ave 3, #05-12", city: "Singapore", zipCode: "550123",
      bloodGroup: "O+",
    },
  });

  // Link family members (from head perspective)
  await prisma.familyMember.createMany({
    data: [
      { clinicId: clinic.id, patientId: familyHead.id, linkedPatientId: familySpouse.id, memberName: "Lakshmi Menon", memberPhone: familySpouse.phone, memberGender: "female", relation: "spouse" },
      { clinicId: clinic.id, patientId: familyHead.id, linkedPatientId: familyChild1.id, memberName: "Arjun Menon", memberPhone: familyChild1.phone, memberGender: "male", relation: "child" },
      { clinicId: clinic.id, patientId: familyHead.id, linkedPatientId: familyChild2.id, memberName: "Priya Menon", memberPhone: familyChild2.phone, memberGender: "female", relation: "child" },
      { clinicId: clinic.id, patientId: familySpouse.id, linkedPatientId: familyHead.id, memberName: "Ravi Menon", memberPhone: familyHead.phone, memberGender: "male", relation: "spouse" },
    ],
  });

  const ind1 = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0005",
      firstName: "Sarah", lastName: "Chen", phone: "+65 9600 1111",
      email: "sarah.chen@demo.sg", gender: "female",
      dateOfBirth: new Date("1990-06-18"), city: "Singapore", bloodGroup: "A+",
    },
  });
  const ind2 = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0006",
      firstName: "Muhammad", lastName: "Hassan", phone: "+65 9600 2222",
      gender: "male", dateOfBirth: new Date("1965-02-12"),
      city: "Singapore", bloodGroup: "AB+",
    },
  });
  const ind3 = await prisma.patient.create({
    data: {
      clinicId: clinic.id, patientIdNumber: "PT-0007",
      firstName: "Emily", lastName: "Tan", phone: "+65 9600 3333",
      email: "emily.tan@demo.sg", gender: "female",
      dateOfBirth: new Date("1995-09-25"), city: "Singapore", bloodGroup: "O-",
    },
  });
  console.log(`✅ Patients: 7 (Menon family of 4 + 3 individuals)`);

  // ─── 8. Appointments ───────────────────────────────────────────────
  const apptPlan = [
    { patient: familyHead, doctor: doc1, day: 0, time: "09:00", type: "consultation", status: "confirmed" },
    { patient: familySpouse, doctor: doc1, day: 0, time: "10:30", type: "follow-up", status: "confirmed" },
    { patient: ind1, doctor: doc2, day: 0, time: "14:00", type: "consultation", status: "scheduled" },
    { patient: ind2, doctor: doc1, day: 1, time: "09:30", type: "procedure", status: "scheduled" },
    { patient: familyChild1, doctor: doc2, day: 1, time: "11:00", type: "follow-up", status: "scheduled" },
    { patient: ind3, doctor: doc1, day: 2, time: "10:00", type: "consultation", status: "scheduled" },
    { patient: familyHead, doctor: doc1, day: 3, time: "15:00", type: "procedure", status: "scheduled" },
    { patient: familyChild2, doctor: doc2, day: 4, time: "16:30", type: "consultation", status: "scheduled" },
    { patient: ind1, doctor: doc1, day: -2, time: "11:00", type: "consultation", status: "completed" },
    { patient: familySpouse, doctor: doc2, day: -5, time: "14:30", type: "procedure", status: "completed" },
  ];

  for (const a of apptPlan) {
    await prisma.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: a.patient.id,
        doctorId: a.doctor.id,
        date: daysFromNow(a.day),
        time: a.time,
        duration: 30,
        doctor: a.doctor.name,
        department: "Ayurveda",
        type: a.type,
        status: a.status,
      },
    });
  }
  console.log(`✅ Appointments: ${apptPlan.length}`);

  // ─── 9. Invoices ───────────────────────────────────────────────────
  const inv1 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id, patientId: ind1.id, invoiceNumber: "INV-0001",
      patientName: `${ind1.firstName} ${ind1.lastName}`, patientPhone: ind1.phone,
      date: daysFromNow(-2), dueDate: daysFromNow(-2),
      subtotal: 150.0, gstAmount: 13.5, totalAmount: 163.5,
      paidAmount: 163.5, balanceAmount: 0,
      status: "paid", paymentMethod: "card",
    },
  });
  await prisma.invoiceItem.create({
    data: {
      clinicId: clinic.id, invoiceId: inv1.id,
      type: "consultation", description: "Consultation with Dr. Priya Nair",
      quantity: 1, unitPrice: 150.0, gstPercent: 9.0, gstAmount: 13.5, amount: 163.5,
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id, patientId: familySpouse.id, invoiceNumber: "INV-0002",
      patientName: `${familySpouse.firstName} ${familySpouse.lastName}`, patientPhone: familySpouse.phone,
      date: daysFromNow(-5), dueDate: daysFromNow(-5),
      subtotal: 270.0, gstAmount: 24.3, totalAmount: 294.3,
      paidAmount: 294.3, balanceAmount: 0,
      status: "paid", paymentMethod: "cash",
    },
  });
  await prisma.invoiceItem.create({
    data: {
      clinicId: clinic.id, invoiceId: inv2.id,
      type: "therapy", description: "Abhyangam Session",
      quantity: 1, unitPrice: 180.0, gstPercent: 9.0, gstAmount: 16.2, amount: 196.2,
    },
  });
  await prisma.invoiceItem.create({
    data: {
      clinicId: clinic.id, invoiceId: inv2.id,
      type: "medicine", description: "Dhanwantharam Taila",
      quantity: 2, unitPrice: 45.0, gstPercent: 9.0, gstAmount: 8.1, amount: 98.1,
    },
  });

  const inv3 = await prisma.invoice.create({
    data: {
      clinicId: clinic.id, patientId: familyHead.id, invoiceNumber: "INV-0003",
      patientName: `${familyHead.firstName} ${familyHead.lastName}`, patientPhone: familyHead.phone,
      date: daysFromNow(0), dueDate: daysFromNow(14),
      subtotal: 120.0, gstAmount: 10.8, totalAmount: 130.8,
      paidAmount: 0, balanceAmount: 130.8,
      status: "pending",
    },
  });
  await prisma.invoiceItem.create({
    data: {
      clinicId: clinic.id, invoiceId: inv3.id,
      type: "consultation", description: "Follow-up Consultation",
      quantity: 1, unitPrice: 120.0, gstPercent: 9.0, gstAmount: 10.8, amount: 130.8,
    },
  });
  console.log(`✅ Invoices: 3 (2 paid, 1 pending)`);

  // ─── Done ───────────────────────────────────────────────────────────
  console.log(`\n🎉 Demo clinic seeded successfully!\n`);
  printLoginBox();
  console.log(`Explore:`);
  console.log(`  • Dashboard — KPIs, charts`);
  console.log(`  • Patients — Menon family (4) + 3 individuals`);
  console.log(`  • Appointments — 10 bookings across this week`);
  console.log(`  • Inventory — 15 items, 1 low-stock alert (Disposable Sheet Roll)`);
  console.log(`  • Billing — 3 invoices (2 paid, 1 pending)`);
  console.log(`  • Admin → Staff — 2 doctors, 5 therapists (2 local + 3 foreign), 1 receptionist`);
  console.log(`  • Admin → Treatments → Packages — Panchakarma + Stress Relief\n`);
}

function printLoginBox() {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  LOGIN TO TEST:`);
  console.log(`  URL:      https://www.ayurgate.com/login`);
  console.log(`  Email:    ${DEMO_CLINIC_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// ─── Run ─────────────────────────────────────────────────────────────

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
