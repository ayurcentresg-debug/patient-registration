import { NextRequest, NextResponse } from "next/server";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * POST /api/patients/import
 * Bulk-import patients from CSV upload.
 * Expects: { patients: Array<{ firstName, lastName, phone, ... }> }
 * Returns: { imported: number, skipped: number, errors: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getTenantPrisma(clinicId);

    const { patients } = await request.json();
    if (!Array.isArray(patients) || patients.length === 0) {
      return NextResponse.json({ error: "No patients provided" }, { status: 400 });
    }
    if (patients.length > 500) {
      return NextResponse.json({ error: "Maximum 500 patients per import" }, { status: 400 });
    }

    // Get current highest patientIdNumber for auto-increment
    const lastPatient = await db.patient.findFirst({
      orderBy: { createdAt: "desc" },
      select: { patientIdNumber: true },
    });

    let nextNum = 1;
    if (lastPatient?.patientIdNumber) {
      const match = lastPatient.patientIdNumber.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    // Check existing phones for duplicate detection
    const existingPhones = new Set<string>();
    const allExisting = await db.patient.findMany({ select: { phone: true } });
    allExisting.forEach((p: { phone: string | null }) => { if (p.phone) existingPhones.add(p.phone.replace(/\D/g, "")); });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < patients.length; i++) {
      const row = patients[i];
      const rowNum = i + 2; // CSV row number (1-indexed + header)

      // Validate required fields
      if (!row.firstName && !row.name) {
        errors.push(`Row ${rowNum}: Missing name`);
        skipped++;
        continue;
      }

      // Parse name if single "name" field provided
      let firstName = row.firstName || "";
      let lastName = row.lastName || "";
      if (!firstName && row.name) {
        const parts = row.name.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ");
      }

      // Duplicate check by phone
      const phone = (row.phone || "").toString().trim();
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        if (existingPhones.has(cleanPhone)) {
          skipped++;
          continue; // Silent skip for duplicates
        }
        existingPhones.add(cleanPhone);
      }

      // Generate patient ID
      const padded = String(nextNum).padStart(5, "0");
      const patientIdNumber = `P${padded}`;
      nextNum++;

      try {
        await db.patient.create({
          data: {
            patientIdNumber,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone || null,
            email: (row.email || "").trim() || null,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            age: row.age ? parseInt(row.age) : null,
            gender: (row.gender || "").trim() || null,
            address: (row.address || "").trim() || null,
            city: (row.city || "").trim() || null,
            state: (row.state || "").trim() || null,
            zipCode: (row.zipCode || row.postalCode || "").trim() || null,
            bloodGroup: (row.bloodGroup || "").trim() || null,
            nationality: (row.nationality || "").trim() || null,
            occupation: (row.occupation || "").trim() || null,
            allergies: (row.allergies || "").trim() || null,
            medicalHistory: (row.medicalHistory || "").trim() || null,
            medicalNotes: (row.medicalNotes || "").trim() || null,
            referredBy: (row.referredBy || "").trim() || null,
            emergencyName: (row.emergencyName || "").trim() || null,
            emergencyPhone: (row.emergencyPhone || "").trim() || null,
            status: "active",
          },
        });
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${rowNum}: ${message}`);
        skipped++;
      }
    }

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 20), total: patients.length });
  } catch (error) {
    console.error("POST /api/patients/import error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}

/**
 * GET /api/patients/import/template
 * Download CSV template for patient import
 */
export async function GET() {
  const headers = [
    "firstName", "lastName", "phone", "email", "dateOfBirth", "age", "gender",
    "address", "city", "state", "zipCode", "bloodGroup", "nationality", "occupation",
    "allergies", "medicalHistory", "referredBy", "emergencyName", "emergencyPhone",
  ];
  const sampleRow = [
    "John", "Doe", "+6591234567", "john@email.com", "1990-01-15", "36", "Male",
    "123 Main St", "Singapore", "", "520123", "O+", "Singaporean", "Engineer",
    "Penicillin", "Hypertension", "Dr. Smith", "Jane Doe", "+6598765432",
  ];

  const csv = [headers.join(","), sampleRow.join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=patient-import-template.csv",
    },
  });
}
