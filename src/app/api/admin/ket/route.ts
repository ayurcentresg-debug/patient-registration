import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/admin/ket — list all KETs
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const kets = await db.keyEmploymentTerms.findMany({
      where,
      orderBy: { issuedDate: "desc" },
    });

    // Resolve user names
    const userIds = [...new Set(kets.map((k: { userId: string }) => k.userId))];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true, staffIdNumber: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u: { id: string }) => [u.id, u]));

    const enriched = kets.map((k: { userId: string }) => ({
      ...k,
      userName: (userMap[k.userId] as unknown as { name: string })?.name || "Unknown",
      userRole: (userMap[k.userId] as unknown as { role: string })?.role || "unknown",
      userStaffId: (userMap[k.userId] as unknown as { staffIdNumber: string })?.staffIdNumber || "",
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("KET GET error:", e);
    return NextResponse.json({ error: "Failed to fetch KETs" }, { status: 500 });
  }
}

// POST /api/admin/ket — create or update a KET
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { userId, ...ketData } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Supersede any existing active KETs for this user
    const existing = await db.keyEmploymentTerms.findMany({
      where: { userId, status: { in: ["draft", "issued"] } },
    });
    for (const k of existing) {
      await db.keyEmploymentTerms.update({
        where: { id: (k as { id: string }).id },
        data: { status: "superseded" },
      });
    }

    const ket = await db.keyEmploymentTerms.create({
      data: {
        clinicId: clinicId || undefined,
        userId,
        companyName: ketData.companyName || "",
        placeOfWork: ketData.placeOfWork || null,
        employeeName: ketData.employeeName || "",
        nricFin: ketData.nricFin || null,
        jobTitle: ketData.jobTitle || "",
        employmentType: ketData.employmentType || "full_time",
        mainDuties: ketData.mainDuties || null,
        employmentStartDate: ketData.employmentStartDate ? new Date(ketData.employmentStartDate) : null,
        employmentEndDate: ketData.employmentEndDate ? new Date(ketData.employmentEndDate) : null,
        // Section B
        dailyWorkingHours: ketData.dailyWorkingHours || null,
        workStartEndTime: ketData.workStartEndTime || null,
        breakDuration: ketData.breakDuration || null,
        workingDaysPerWeek: ketData.workingDaysPerWeek || null,
        restDays: ketData.restDays || null,
        // Section C
        salaryPeriod: ketData.salaryPeriod || null,
        salaryFrequency: ketData.salaryFrequency || "monthly",
        overtimePaymentPeriod: ketData.overtimePaymentPeriod || null,
        overtimeFrequency: ketData.overtimeFrequency || null,
        salaryPaymentDate: ketData.salaryPaymentDate || null,
        overtimePaymentDate: ketData.overtimePaymentDate || null,
        basicRate: ketData.basicRate || null,
        grossRate: ketData.grossRate || null,
        overtimeRate: ketData.overtimeRate || null,
        fixedAllowances: ketData.fixedAllowances || "[]",
        fixedDeductions: ketData.fixedDeductions || "[]",
        otherSalaryComponents: ketData.otherSalaryComponents || null,
        cpfApplicable: ketData.cpfApplicable !== false,
        // Section D
        annualLeaveDays: ketData.annualLeaveDays || null,
        sickLeaveDays: ketData.sickLeaveDays || null,
        hospitalisationLeaveDays: ketData.hospitalisationLeaveDays || null,
        otherLeave: ketData.otherLeave || null,
        medicalBenefits: ketData.medicalBenefits || null,
        // Section E
        probationLength: ketData.probationLength || null,
        probationStartDate: ketData.probationStartDate ? new Date(ketData.probationStartDate) : null,
        probationEndDate: ketData.probationEndDate ? new Date(ketData.probationEndDate) : null,
        noticePeriod: ketData.noticePeriod || null,
        // Meta
        issuedDate: new Date(),
        status: ketData.status || "draft",
      },
    });

    await logAudit({
      action: "create",
      entity: "KET",
      entityId: ket.id,
      details: { userId, employeeName: ketData.employeeName },
    });

    return NextResponse.json(ket);
  } catch (e) {
    console.error("KET POST error:", e);
    return NextResponse.json({ error: "Failed to create KET" }, { status: 500 });
  }
}
