import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { validateName } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { checkPatientLimit, checkTenantAccess, isFeatureEnabled, getBranding } from "@/lib/plan-enforcement";

/**
 * Normalize phone number for consistent storage.
 * - Strip spaces, dashes, parens, dots
 * - If 8 digits (Singapore local), prepend +65
 * - If starts with 65 and is 10 digits, prepend +
 * - Keep existing + prefix
 */
function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned) return "";

  // 8-digit Singapore local number (starts with 6/8/9)
  if (/^\d{8}$/.test(cleaned) && /^[689]/.test(cleaned)) {
    cleaned = "+65" + cleaned;
  }
  // 10 digits starting with 65 (missing +)
  else if (/^65\d{8}$/.test(cleaned)) {
    cleaned = "+" + cleaned;
  }
  // 10-digit Indian number (starts with 6-9)
  else if (/^\d{10}$/.test(cleaned) && /^[6-9]/.test(cleaned)) {
    cleaned = "+91" + cleaned;
  }
  // 12 digits starting with 91 (Indian, missing +)
  else if (/^91\d{10}$/.test(cleaned)) {
    cleaned = "+" + cleaned;
  }
  // Already has + prefix — keep as-is
  else if (cleaned.startsWith("+")) {
    // no change
  }

  return cleaned;
}

// Auto-generate patient ID like P10001
// Uses MAX existing ID instead of COUNT to avoid race-condition duplicates
async function generatePatientId(db: typeof prisma): Promise<string> {
  const lastPatient = await db.patient.findFirst({
    where: { patientIdNumber: { startsWith: "P" } },
    orderBy: { patientIdNumber: "desc" },
    select: { patientIdNumber: true },
  });

  if (!lastPatient || !lastPatient.patientIdNumber) {
    return "P10001";
  }

  const lastNum = parseInt(lastPatient.patientIdNumber.replace("P", ""), 10);
  const nextNum = (isNaN(lastNum) ? 10000 : lastNum) + 1;
  return `P${nextNum}`;
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const all = searchParams.get("all") === "true";

    const gender = searchParams.get("gender") || "";

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { patientIdNumber: { contains: search } },
        { nricId: { contains: search } },
      ];
    }

    // Search queries and ?all=true return flat arrays (backward-compatible for dropdowns)
    if (all || search) {
      const patients = await db.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { appointments: true, communications: true } } },
        ...(search ? { take: 50 } : {}), // Cap search results
      });
      return NextResponse.json(patients);
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { appointments: true, communications: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.patient.count({ where }),
    ]);

    return NextResponse.json({
      patients,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/patients error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    // Enforce plan limits
    if (clinicId) {
      const access = await checkTenantAccess(clinicId);
      if (access) return NextResponse.json({ error: access.error }, { status: access.status });

      const limit = await checkPatientLimit(clinicId);
      if (!limit.allowed) return NextResponse.json({ error: limit.message }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    const firstNameCheck = validateName(body.firstName ?? "", "First name");
    if (!firstNameCheck.valid) {
      return NextResponse.json({ error: firstNameCheck.error }, { status: 400 });
    }
    const lastNameCheck = validateName(body.lastName ?? "", "Last name");
    if (!lastNameCheck.valid) {
      return NextResponse.json({ error: lastNameCheck.error }, { status: 400 });
    }
    if (!body.phone || !body.phone.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!body.gender || !["male", "female", "other"].includes(body.gender)) {
      return NextResponse.json({ error: "Valid gender is required (male, female, or other)" }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Validate NRIC format if provided
    if (body.nricId && body.nricId.trim()) {
      const nric = body.nricId.trim().toUpperCase();
      if (!/^[STFGM]\d{7}[A-Z]$/.test(nric)) {
        return NextResponse.json({ error: "Invalid NRIC format. Expected: 1 letter prefix (S/T/F/G/M) + 7 digits + 1 check letter" }, { status: 400 });
      }
      // Checksum validation
      const prefix = nric[0];
      const digits = nric.slice(1, 8).split("").map(Number);
      const weights = [2, 7, 6, 5, 4, 3, 2];
      let sum = digits.reduce((acc: number, d: number, i: number) => acc + d * weights[i], 0);
      if (prefix === "T" || prefix === "G") sum += 4;
      if (prefix === "M") sum += 3;
      const remainder = sum % 11;
      const stChecks = ["J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
      const fgmChecks = ["X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K"];
      const checkLetters = (prefix === "S" || prefix === "T") ? stChecks : fgmChecks;
      if (nric[8] !== checkLetters[remainder]) {
        return NextResponse.json({ error: "Invalid NRIC checksum — please verify the ID number" }, { status: 400 });
      }
      // Store uppercase
      body.nricId = nric;
    }

    // Normalize all phone fields
    const primaryPhone = normalizePhone(body.phone);
    const secondaryMobile = body.secondaryMobile ? normalizePhone(body.secondaryMobile) : null;
    const landline = body.landline ? body.landline.trim() : null; // Landline: just trim, don't normalize
    const whatsapp = body.whatsapp ? normalizePhone(body.whatsapp) : primaryPhone;
    const emergencyPhone = body.emergencyPhone ? normalizePhone(body.emergencyPhone) : null;

    // Cross-field validation: secondary ≠ primary
    if (secondaryMobile && secondaryMobile === primaryPhone) {
      return NextResponse.json({ error: "Secondary mobile cannot be the same as the primary mobile" }, { status: 400 });
    }
    // Cross-field validation: emergency ≠ own phone
    if (emergencyPhone && emergencyPhone === primaryPhone) {
      return NextResponse.json({ error: "Emergency contact number should be different from the patient's own number" }, { status: 400 });
    }

    const patientIdNumber = await generatePatientId(db);

    const patient = await db.patient.create({
      data: {
        patientIdNumber,
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        nricId: body.nricId || null,
        email: body.email ? body.email.trim().toLowerCase() : null,
        phone: primaryPhone,
        secondaryMobile,
        landline,
        whatsapp,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        age: body.age ? parseInt(body.age, 10) : null,
        gender: body.gender,
        address: body.address || null,
        locality: body.locality || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        bloodGroup: body.bloodGroup || null,
        ethnicity: body.ethnicity || null,
        nationality: body.nationality || null,
        occupation: body.occupation || null,
        referredBy: body.referredBy || null,
        familyRelation: body.familyRelation || null,
        familyMemberName: body.familyMemberName || null,
        emergencyName: body.emergencyName || null,
        emergencyPhone: emergencyPhone,
        medicalHistory: body.medicalHistory || "[]",
        otherHistory: body.otherHistory || null,
        allergies: body.allergies || null,
        medicalNotes: body.medicalNotes || null,
        groups: body.groups || "[]",
      },
    });

    await logAudit({
      action: "create",
      entity: "patient",
      entityId: patient.id,
      details: { patientIdNumber: patient.patientIdNumber, name: `${patient.firstName} ${patient.lastName}` },
    });

    // Send welcome notifications
    const branding = await getBranding();
    const welcomeMessage = `Welcome ${patient.firstName}! You have been successfully registered at our clinic. Your Patient ID is ${patient.patientIdNumber}. For any queries, please contact us.`;

    try {
      if (patient.email) {
        await sendEmail({
          to: patient.email,
          subject: `Welcome — ${branding.platformName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0d9488;">Registration Confirmed</h2>
              <p>Dear ${patient.firstName} ${patient.lastName},</p>
              <p>${welcomeMessage}</p>
              <p style="background: #f0fdfa; padding: 12px; border-radius: 8px;">
                <strong>Patient ID:</strong> ${patient.patientIdNumber}<br/>
                <strong>Name:</strong> ${patient.firstName} ${patient.lastName}<br/>
                <strong>Phone:</strong> ${patient.phone}
              </p>
              <p>Thank you for choosing our clinic.</p>
            </div>
          `,
        });

        await db.communication.create({
          data: { patientId: patient.id, type: "email", subject: "Welcome - Registration Confirmed", message: welcomeMessage, status: "sent" },
        });
      }
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    try {
      const whatsAppEnabled = await isFeatureEnabled("enableWhatsApp");
      if (whatsAppEnabled && patient.whatsapp) {
        await sendWhatsApp({ to: patient.whatsapp, message: welcomeMessage });
        await db.communication.create({
          data: { patientId: patient.id, type: "whatsapp", message: welcomeMessage, status: "sent" },
        });
      }
    } catch (e) {
      console.error("WhatsApp notification failed:", e);
    }

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}
