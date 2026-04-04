import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/admin/ket/[id] — get single KET
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const ket = await db.keyEmploymentTerms.findFirst({ where: { id } });
    if (!ket) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(ket);
  } catch (e) {
    console.error("KET GET error:", e);
    return NextResponse.json({ error: "Failed to fetch KET" }, { status: 500 });
  }
}

// PUT /api/admin/ket/[id] — update KET
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const existing = await db.keyEmploymentTerms.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    // Allow updating any KET field
    const stringFields = [
      "companyName", "placeOfWork", "employeeName", "nricFin", "jobTitle",
      "employmentType", "mainDuties", "dailyWorkingHours", "workStartEndTime",
      "breakDuration", "workingDaysPerWeek", "restDays", "salaryPeriod",
      "salaryFrequency", "overtimePaymentPeriod", "overtimeFrequency",
      "salaryPaymentDate", "overtimePaymentDate", "basicRate", "grossRate",
      "overtimeRate", "fixedAllowances", "fixedDeductions",
      "otherSalaryComponents", "annualLeaveDays", "sickLeaveDays",
      "hospitalisationLeaveDays", "otherLeave", "medicalBenefits",
      "probationLength", "noticePeriod", "status",
    ];

    for (const field of stringFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    // Date fields
    const dateFields = ["employmentStartDate", "employmentEndDate", "probationStartDate", "probationEndDate", "issuedDate"];
    for (const field of dateFields) {
      if (body[field] !== undefined) {
        data[field] = body[field] ? new Date(body[field]) : null;
      }
    }

    // Boolean
    if (body.cpfApplicable !== undefined) data.cpfApplicable = body.cpfApplicable;

    const ket = await db.keyEmploymentTerms.update({ where: { id }, data });

    await logAudit({ action: "update", entity: "KET", entityId: id });

    return NextResponse.json(ket);
  } catch (e) {
    console.error("KET PUT error:", e);
    return NextResponse.json({ error: "Failed to update KET" }, { status: 500 });
  }
}

// DELETE /api/admin/ket/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    await db.keyEmploymentTerms.delete({ where: { id } });

    await logAudit({ action: "delete", entity: "KET", entityId: id });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("KET DELETE error:", e);
    return NextResponse.json({ error: "Failed to delete KET" }, { status: 500 });
  }
}
