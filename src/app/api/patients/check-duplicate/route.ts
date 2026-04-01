import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

/**
 * GET /api/patients/check-duplicate?field=nricId&value=S7676767D
 * GET /api/patients/check-duplicate?field=phone&value=91234567
 * GET /api/patients/check-duplicate?field=email&value=test@example.com
 *
 * Optional: &excludeId=cmxxx to exclude current patient (for edit mode)
 *
 * Returns: { duplicate: boolean, patient?: { id, firstName, lastName, patientIdNumber, lastVisit } }
 */

// Normalize phone: strip spaces, dashes, parens, dots — keep leading +
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const searchParams = request.nextUrl.searchParams;
    const field = searchParams.get("field");
    const value = searchParams.get("value");
    const excludeId = searchParams.get("excludeId");

    if (!field || !value) {
      return NextResponse.json({ duplicate: false });
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return NextResponse.json({ duplicate: false });
    }

    const selectFields = {
      id: true,
      firstName: true,
      lastName: true,
      patientIdNumber: true,
      phone: true,
      nricId: true,
      email: true,
      appointments: {
        orderBy: { date: "desc" as const },
        take: 1,
        select: { date: true },
      },
    };

    let match = null;

    if (field === "nricId") {
      // Find by exact NRIC (case-insensitive via app-level)
      const patients = await db.patient.findMany({
        where: {
          nricId: { not: "" },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: selectFields,
      });
      const searchUpper = trimmedValue.toUpperCase();
      match = patients.find(
        (p) => p.nricId && p.nricId.toUpperCase() === searchUpper
      );
    } else if (field === "phone") {
      const normalized = normalizePhone(trimmedValue);
      if (normalized.replace(/\D/g, "").length < 7) {
        return NextResponse.json({ duplicate: false });
      }
      // Fetch all patients and do normalized comparison
      const patients = await db.patient.findMany({
        where: {
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: selectFields,
      });
      match = patients.find((p) => {
        const pPhone = p.phone ? normalizePhone(p.phone) : "";
        // Check if normalized versions match (handles +65 prefix differences)
        if (!pPhone) return false;
        return (
          pPhone === normalized ||
          pPhone.endsWith(normalized) ||
          normalized.endsWith(pPhone)
        );
      });
    } else if (field === "email") {
      const searchEmail = trimmedValue.toLowerCase();
      const patients = await db.patient.findMany({
        where: {
          email: { not: "" },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: selectFields,
      });
      match = patients.find(
        (p) => p.email && p.email.toLowerCase() === searchEmail
      );
    } else {
      return NextResponse.json({ duplicate: false });
    }

    if (match) {
      const lastVisit = match.appointments[0]?.date || null;
      return NextResponse.json({
        duplicate: true,
        patient: {
          id: match.id,
          firstName: match.firstName,
          lastName: match.lastName,
          patientIdNumber: match.patientIdNumber,
          phone: match.phone,
          lastVisit: lastVisit
            ? new Date(lastVisit).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null,
        },
      });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error("GET /api/patients/check-duplicate error:", error);
    return NextResponse.json({ duplicate: false });
  }
}
