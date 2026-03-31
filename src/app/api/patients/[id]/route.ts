import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateName } from "@/lib/validation";

/** Normalize phone: strip formatting, add country code for SG/IN local numbers */
function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (!cleaned) return "";
  if (/^\d{8}$/.test(cleaned) && /^[689]/.test(cleaned)) cleaned = "+65" + cleaned;
  else if (/^65\d{8}$/.test(cleaned)) cleaned = "+" + cleaned;
  else if (/^\d{10}$/.test(cleaned) && /^[6-9]/.test(cleaned)) cleaned = "+91" + cleaned;
  else if (/^91\d{10}$/.test(cleaned)) cleaned = "+" + cleaned;
  return cleaned;
}

/** Validate Singapore NRIC checksum */
function validateNRIC(nric: string): boolean {
  if (!/^[STFGM]\d{7}[A-Z]$/.test(nric)) return false;
  const prefix = nric[0];
  const digits = nric.slice(1, 8).split("").map(Number);
  const weights = [2, 7, 6, 5, 4, 3, 2];
  let sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  if (prefix === "T" || prefix === "G") sum += 4;
  if (prefix === "M") sum += 3;
  const remainder = sum % 11;
  const stChecks = ["J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
  const fgmChecks = ["X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K"];
  const checkLetters = (prefix === "S" || prefix === "T") ? stChecks : fgmChecks;
  return nric[8] === checkLetters[remainder];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { date: "desc" } },
        communications: { orderBy: { sentAt: "desc" } },
        clinicalNotes: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate required fields if they are being updated
    if ("firstName" in body) {
      const fnCheck = validateName(body.firstName ?? "", "First name");
      if (!fnCheck.valid) return NextResponse.json({ error: fnCheck.error }, { status: 400 });
    }
    if ("lastName" in body) {
      const lnCheck = validateName(body.lastName ?? "", "Last name");
      if (!lnCheck.valid) return NextResponse.json({ error: lnCheck.error }, { status: 400 });
    }
    if ("phone" in body && (!body.phone || !body.phone.trim())) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if ("email" in body && body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if ("gender" in body && !["male", "female", "other"].includes(body.gender)) {
      return NextResponse.json({ error: "Gender must be male, female, or other" }, { status: 400 });
    }
    if ("status" in body && !["active", "inactive"].includes(body.status)) {
      return NextResponse.json({ error: "Status must be active or inactive" }, { status: 400 });
    }

    // Check patient exists
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Validate NRIC if being updated
    if ("nricId" in body && body.nricId && body.nricId.trim()) {
      const nric = body.nricId.trim().toUpperCase();
      if (!validateNRIC(nric)) {
        return NextResponse.json({ error: "Invalid NRIC format or checksum" }, { status: 400 });
      }
      body.nricId = nric;
    }

    // Normalize phone fields if being updated
    if ("phone" in body && body.phone) body.phone = normalizePhone(body.phone);
    if ("secondaryMobile" in body && body.secondaryMobile) body.secondaryMobile = normalizePhone(body.secondaryMobile);
    if ("whatsapp" in body && body.whatsapp) body.whatsapp = normalizePhone(body.whatsapp);
    if ("emergencyPhone" in body && body.emergencyPhone) body.emergencyPhone = normalizePhone(body.emergencyPhone);
    if ("email" in body && body.email) body.email = body.email.trim().toLowerCase();

    // Cross-field validation
    const phone = body.phone || existing.phone;
    const phoneNorm = normalizePhone(phone || "");
    if (body.secondaryMobile && normalizePhone(body.secondaryMobile) === phoneNorm) {
      return NextResponse.json({ error: "Secondary mobile cannot be the same as primary mobile" }, { status: 400 });
    }
    if (body.emergencyPhone && normalizePhone(body.emergencyPhone) === phoneNorm) {
      return NextResponse.json({ error: "Emergency contact should be different from patient's own number" }, { status: 400 });
    }

    // Don't allow updating patientIdNumber or id
    const { patientIdNumber, id: _bodyId, ...updateData } = body;

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...updateData,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("PUT /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Delete related records first, then patient
    await prisma.communication.deleteMany({ where: { patientId: id } });
    await prisma.appointment.deleteMany({ where: { patientId: id } });
    await prisma.clinicalNote.deleteMany({ where: { patientId: id } });
    await prisma.document.deleteMany({ where: { patientId: id } });
    await prisma.patient.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
