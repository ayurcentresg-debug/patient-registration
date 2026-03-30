/**
 * Import Practo/Clinic CSV Export Data
 *
 * Usage: npx tsx scripts/import-practo.ts "/path/to/csv/folder"
 *
 * Imports: Patients, Treatments (Procedure Catalog), Appointments,
 *          Invoices+Payments, Prescriptions, ClinicalNotes, TreatmentPlans
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";
import fs from "fs";

// ─── DB Setup ──────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

// ─── CSV Parser (handles single-quoted Practo format) ──────────────────────
function parseCSV(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⏭  File not found: ${path.basename(filePath)}, skipping`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      // Strip single quotes from Practo format
      let val = (values[j] || "").trim();
      if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!inQuotes && (ch === "'" || ch === '"')) {
      inQuotes = true;
      quoteChar = ch;
      current += ch;
    } else if (inQuotes && ch === quoteChar) {
      inQuotes = false;
      current += ch;
    } else if (!inQuotes && ch === ",") {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function clean(val: string | undefined): string {
  if (!val) return "";
  let v = val.trim();
  if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
  return v.trim();
}

function parseDate(val: string): Date {
  const cleaned = clean(val);
  if (!cleaned) return new Date();
  // Handle "2026-03-01 09:00:00" and "2026-03-01"
  return new Date(cleaned);
}

function parseFloat2(val: string): number {
  const n = parseFloat(clean(val));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function parseInt2(val: string): number {
  const n = parseInt(clean(val), 10);
  return isNaN(n) ? 0 : n;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function genderMap(g: string): string {
  const v = g.toUpperCase();
  if (v === "M" || v === "MALE") return "male";
  if (v === "F" || v === "FEMALE") return "female";
  return "other";
}

function timeFromDate(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Main Import ───────────────────────────────────────────────────────────
async function main() {
  const csvDir = process.argv[2];
  if (!csvDir) {
    console.error("Usage: npx tsx scripts/import-practo.ts <csv-folder-path>");
    process.exit(1);
  }

  const resolvedDir = path.resolve(csvDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  console.log(`\n📁 Importing from: ${resolvedDir}`);
  console.log(`💾 Database: ${DB_PATH}\n`);

  // Track ID mappings: Practo ID → our DB ID
  const patientMap = new Map<string, string>(); // B9001 → cuid
  const invoiceMap = new Map<string, string>();  // INV9001 → cuid
  const treatmentMap = new Map<string, string>(); // treatment name → cuid
  const doctorMap = new Map<string, string>();    // doctor name → cuid

  let totalImported = 0;

  // ═══════════════════════════════════════════════════════════════════════
  // 1. PROCEDURE CATALOG → Treatments
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 1/8 Importing Treatments (Procedure Catalog) ━━━");
  const procedures = parseCSV(path.join(resolvedDir, "Procedure Catalog.csv"));
  let treatmentCount = 0;

  for (const row of procedures) {
    const name = clean(row["Treatment Name"]);
    const cost = parseFloat2(row["Treatment Cost"]);
    if (!name) continue;

    // Check if treatment already exists
    const existing = await prisma.treatment.findFirst({ where: { name } });
    if (existing) {
      treatmentMap.set(name, existing.id);
      console.log(`  ⏭  Treatment "${name}" already exists`);
      continue;
    }

    // Categorize based on name
    let category = "therapy";
    const lower = name.toLowerCase();
    if (lower.includes("consultation") || lower.includes("follow up")) {
      category = "consultation";
    } else if (lower.includes("abhyangam") || lower.includes("shirodhara") || lower.includes("pizhichil") || lower.includes("nasya")) {
      category = "panchakarma";
    } else if (lower.includes("kizhi") || lower.includes("podikizhi") || lower.includes("elakizhi")) {
      category = "therapy";
    } else if (lower.includes("udwarthanam")) {
      category = "massage";
    }

    const treatment = await prisma.treatment.create({
      data: {
        name,
        category,
        basePrice: cost,
        duration: category === "consultation" ? 15 : 50,
        isActive: true,
        sortOrder: treatmentCount,
      },
    });
    treatmentMap.set(name, treatment.id);
    treatmentCount++;
    console.log(`  ✅ Treatment: ${name} (S$${cost}) [${category}]`);
  }
  totalImported += treatmentCount;
  console.log(`  📊 ${treatmentCount} treatments imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. PATIENTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 2/8 Importing Patients ━━━");
  const patients = parseCSV(path.join(resolvedDir, "Patients.csv"));
  let patientCount = 0;

  for (const row of patients) {
    const patNum = clean(row["Patient Number"]);
    const fullName = clean(row["Patient Name"]);
    const phone = clean(row["Mobile Number"]);
    if (!patNum || !fullName) continue;

    // Check if patient already exists by patientIdNumber
    const existing = await prisma.patient.findFirst({
      where: { patientIdNumber: patNum },
    });
    if (existing) {
      patientMap.set(patNum, existing.id);
      console.log(`  ⏭  Patient ${patNum} "${fullName}" already exists`);
      continue;
    }

    const { firstName, lastName } = splitName(fullName);
    const dob = clean(row["Date of Birth"]);

    const patient = await prisma.patient.create({
      data: {
        patientIdNumber: patNum,
        firstName,
        lastName,
        phone: phone || "+6500000000",
        secondaryMobile: clean(row["Secondary Mobile"]) || null,
        landline: clean(row["Contact Number"]) || null,
        email: clean(row["Email Address"]) || null,
        gender: genderMap(clean(row["Gender"])),
        address: clean(row["Address"]) || null,
        locality: clean(row["Locality"]) || null,
        city: clean(row["City"]) || "Singapore",
        zipCode: clean(row["Pincode"]) || null,
        nricId: clean(row["National Id"]) || null,
        dateOfBirth: dob ? new Date(dob) : null,
        age: parseInt2(row["Age"]) || null,
        bloodGroup: clean(row["Blood Group"]) || null,
        referredBy: clean(row["Referred By"]) || null,
        medicalHistory: clean(row["Medical History"]) || "[]",
        groups: clean(row["Groups"]) || "[]",
        medicalNotes: clean(row["Patient Notes"]) || clean(row["Remarks"]) || null,
        status: "active",
      },
    });
    patientMap.set(patNum, patient.id);
    patientCount++;
    console.log(`  ✅ Patient: ${patNum} — ${firstName} ${lastName}`);
  }
  totalImported += patientCount;
  console.log(`  📊 ${patientCount} patients imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Map doctors to existing User records
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 3/8 Mapping Doctors ━━━");
  const allDoctors = await prisma.user.findMany({
    where: { role: { in: ["doctor", "therapist"] } },
  });
  for (const doc of allDoctors) {
    doctorMap.set(doc.name, doc.id);
    // Also map without "Dr. " prefix
    if (doc.name.startsWith("Dr. ")) {
      doctorMap.set(doc.name.replace("Dr. ", ""), doc.id);
    }
  }

  // Collect unique doctor names from appointments
  const appointments = parseCSV(path.join(resolvedDir, "Appointments.csv"));
  const uniqueDoctors = new Set<string>();
  for (const row of appointments) {
    const docName = clean(row["DoctorName"]);
    if (docName) uniqueDoctors.add(docName);
  }

  // Create missing doctors/therapists
  for (const docName of uniqueDoctors) {
    if (!doctorMap.has(docName)) {
      const isDoctor = docName.toLowerCase().startsWith("dr.");
      const user = await prisma.user.create({
        data: {
          name: docName,
          email: `${docName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@clinic.local`,
          role: isDoctor ? "doctor" : "therapist",
          password: "", // placeholder — they'll set via invite
          isActive: true,
          status: "active",
        },
      });
      doctorMap.set(docName, user.id);
      console.log(`  ✅ Created ${isDoctor ? "Doctor" : "Therapist"}: ${docName}`);
    } else {
      console.log(`  ⏭  Doctor "${docName}" already exists`);
    }
  }
  console.log(`  📊 ${uniqueDoctors.size} doctors mapped\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 4. APPOINTMENTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 4/8 Importing Appointments ━━━");
  let apptCount = 0;

  for (const row of appointments) {
    const patNum = clean(row["Patient Number"]);
    const patientId = patientMap.get(patNum);
    const docName = clean(row["DoctorName"]);
    const doctorId = doctorMap.get(docName) || null;
    const dateStr = clean(row["Date"]);
    if (!dateStr) continue;

    const date = parseDate(dateStr);
    const time = timeFromDate(date);

    // Determine status
    let status = "completed"; // imported data = already happened
    const practoStatus = clean(row["Status"]).toLowerCase();
    if (practoStatus === "cancelled") status = "cancelled";
    else if (practoStatus === "no show" || practoStatus === "no-show") status = "no-show";

    await prisma.appointment.create({
      data: {
        patientId: patientId || null,
        doctorId,
        date: new Date(date.toISOString().split("T")[0] + "T00:00:00.000Z"),
        time,
        duration: 30,
        doctor: docName,
        type: "consultation",
        reason: clean(row["Notes"]) || null,
        notes: clean(row["Notes"]) || null,
        status,
        isWalkin: !patientId,
        walkinName: !patientId ? clean(row["Patient Name"]) : null,
      },
    });
    apptCount++;
    console.log(`  ✅ Appointment: ${clean(row["Patient Name"])} → ${docName} on ${dateStr.split(" ")[0]} at ${time}`);
  }
  totalImported += apptCount;
  console.log(`  📊 ${apptCount} appointments imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 5. INVOICES + PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 5/8 Importing Invoices ━━━");
  const invoices = parseCSV(path.join(resolvedDir, "Invoices.csv"));
  let invCount = 0;

  for (const row of invoices) {
    const invNum = clean(row["Invoice Number"]);
    const patNum = clean(row["Patient Number"]);
    const patientId = patientMap.get(patNum) || null;
    const patientName = clean(row["Patient Name"]);
    if (!invNum) continue;

    // Check if invoice number already exists
    const existing = await prisma.invoice.findFirst({
      where: { invoiceNumber: invNum },
    });
    if (existing) {
      invoiceMap.set(invNum, existing.id);
      console.log(`  ⏭  Invoice ${invNum} already exists`);
      continue;
    }

    const unitCost = parseFloat2(row["Unit Cost"]);
    const quantity = parseInt2(row["Quantity"]) || 1;
    const discount = parseFloat2(row["Discount"]);
    const discountType = clean(row["DiscountType"]); // PERCENT or NUMBER

    // Calculate amounts
    const subtotal = unitCost * quantity;
    let discountAmount = 0;
    if (discountType === "PERCENT") {
      discountAmount = Math.round(subtotal * discount / 100 * 100) / 100;
    } else {
      discountAmount = discount;
    }
    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNum,
        patientId,
        patientName,
        date: parseDate(row["Date"]),
        subtotal,
        discountPercent: discountType === "PERCENT" ? discount : 0,
        discountAmount,
        taxableAmount: totalAmount,
        gstAmount: 0,
        totalAmount,
        paidAmount: totalAmount, // assume paid (we'll update from payments)
        balanceAmount: 0,
        status: "paid",
        notes: clean(row["Notes"]) || clean(row["Description"]) || null,
        items: {
          create: [
            {
              type: clean(row["Type"]) === "retail" ? "medicine" : "therapy",
              description: clean(row["Treatment Name"]),
              quantity,
              unitPrice: unitCost,
              discount: discountAmount,
              gstPercent: 0,
              gstAmount: 0,
              amount: totalAmount,
            },
          ],
        },
      },
    });
    invoiceMap.set(invNum, invoice.id);
    invCount++;
    console.log(`  ✅ Invoice: ${invNum} — ${patientName} — S$${totalAmount}`);
  }
  totalImported += invCount;
  console.log(`  📊 ${invCount} invoices imported\n`);

  // ─── Payments ────────────────────────────────────────────────────────
  console.log("━━━ 6/8 Importing Payments ━━━");
  const payments = parseCSV(path.join(resolvedDir, "Payments.csv"));
  let payCount = 0;

  for (const row of payments) {
    const invNum = clean(row["Invoice Number"]);
    const invoiceId = invoiceMap.get(invNum);
    if (!invoiceId) {
      console.log(`  ⚠️  Payment for invoice ${invNum} — invoice not found, skipping`);
      continue;
    }

    const receiptNum = clean(row["Receipt Number"]);
    const amount = parseFloat2(row["Amount Paid"]);
    const mode = clean(row["Payment Mode"]).toLowerCase();
    const vendor = clean(row["Vendor Name"]);

    // Map payment mode
    let method = "cash";
    if (mode === "card") method = "card";
    else if (mode === "upi" || mode === "netbanking") method = "bank_transfer";

    // Check for duplicate
    const existingPayment = await prisma.payment.findFirst({
      where: { receiptNumber: receiptNum },
    });
    if (existingPayment) {
      console.log(`  ⏭  Payment ${receiptNum} already exists`);
      continue;
    }

    await prisma.payment.create({
      data: {
        invoiceId,
        receiptNumber: receiptNum || null,
        amount,
        method,
        reference: vendor || null,
        notes: clean(row["Notes"]) || null,
        date: parseDate(row["Date"]),
      },
    });
    payCount++;
    console.log(`  ✅ Payment: ${receiptNum} — S$${amount} (${method}${vendor ? ` / ${vendor}` : ""})`);
  }
  totalImported += payCount;
  console.log(`  📊 ${payCount} payments imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 7. CLINICAL NOTES
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 7/8 Importing Clinical Notes ━━━");
  const notes = parseCSV(path.join(resolvedDir, "ClinicalNotes.csv"));
  let noteCount = 0;

  for (const row of notes) {
    const patNum = clean(row["Patient Number"]);
    const patientId = patientMap.get(patNum);
    if (!patientId) continue;

    const type = clean(row["Type"]).toLowerCase();
    const desc = clean(row["Description"]);
    if (!desc) continue;

    // Map Practo types to our types
    let noteType = "general";
    if (type === "complaints") noteType = "present_illness";
    else if (type === "observations") noteType = "examination";
    else if (type === "diagnosis") noteType = "diagnosis";
    else if (type === "treatment") noteType = "treatment";

    await prisma.clinicalNote.create({
      data: {
        patientId,
        type: noteType,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        content: desc,
        doctor: clean(row["Doctor"]) || null,
        createdAt: parseDate(row["Date"]),
      },
    });
    noteCount++;
    console.log(`  ✅ Note: ${clean(row["Patient Name"])} — ${type}: ${desc.substring(0, 50)}`);
  }
  totalImported += noteCount;
  console.log(`  📊 ${noteCount} clinical notes imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // 8. PRESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("━━━ 8/8 Importing Prescriptions ━━━");
  const prescriptions = parseCSV(path.join(resolvedDir, "Prescriptions.csv"));
  let rxCount = 0;

  // Group prescriptions by patient+date (one prescription per visit)
  const rxGroups = new Map<string, typeof prescriptions>();
  for (const row of prescriptions) {
    const key = `${clean(row["Patient Number"])}_${clean(row["Date"])}`;
    if (!rxGroups.has(key)) rxGroups.set(key, []);
    rxGroups.get(key)!.push(row);
  }

  for (const [key, items] of rxGroups) {
    const firstItem = items[0];
    const patNum = clean(firstItem["Patient Number"]);
    const patientId = patientMap.get(patNum);
    if (!patientId) continue;

    // Generate prescription number
    const dateStr = clean(firstItem["Date"]).replace(/['-]/g, "").substring(0, 8);
    const prescNo = `RX-${dateStr}-${patNum}`;

    // Check if exists
    const existing = await prisma.prescription.findFirst({
      where: { prescriptionNo: prescNo },
    });
    if (existing) {
      console.log(`  ⏭  Prescription ${prescNo} already exists`);
      continue;
    }

    // Build frequency from morning/afternoon/night flags
    const rxItems = items.map((row, idx) => {
      const morning = clean(row["Morning"]) === "1";
      const afternoon = clean(row["Afternoon"]) === "1";
      const night = clean(row["Night"]) === "1";

      let frequency = "once_daily";
      const timesPerDay = (morning ? 1 : 0) + (afternoon ? 1 : 0) + (night ? 1 : 0);
      if (timesPerDay >= 3) frequency = "thrice_daily";
      else if (timesPerDay === 2) frequency = "twice_daily";

      const beforeFood = clean(row["Before Food"]) === "1";
      const timing = beforeFood ? "before_food" : "after_food";

      return {
        medicineName: clean(row["Drug Name"]),
        dosage: `${clean(row["Dosage"])} ${clean(row["Dosage Unit"])}`,
        frequency,
        timing,
        duration: `${clean(row["Duration"])} ${clean(row["Duration Unit"])}`,
        instructions: clean(row["Instruction"]) || null,
        sequence: idx,
      };
    });

    await prisma.prescription.create({
      data: {
        prescriptionNo: prescNo,
        patientId,
        doctorName: "Imported",
        status: "completed",
        date: parseDate(firstItem["Date"]),
        items: {
          create: rxItems,
        },
      },
    });
    rxCount++;
    console.log(`  ✅ Prescription: ${prescNo} — ${clean(firstItem["Patient Name"])} (${rxItems.length} medicines)`);
  }
  totalImported += rxCount;
  console.log(`  📊 ${rxCount} prescriptions imported\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════");
  console.log(`✅ IMPORT COMPLETE — ${totalImported} total records imported`);
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Treatments:     ${treatmentCount}`);
  console.log(`  Patients:       ${patientCount}`);
  console.log(`  Appointments:   ${apptCount}`);
  console.log(`  Invoices:       ${invCount}`);
  console.log(`  Payments:       ${payCount}`);
  console.log(`  Clinical Notes: ${noteCount}`);
  console.log(`  Prescriptions:  ${rxCount}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("❌ Import failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
