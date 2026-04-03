import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/admin/payroll/salary-config — list all salary configs with staff info
export async function GET() {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const configs = await db.salaryConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Resolve user names
    const userIds = configs.map((c) => c.userId);
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true, email: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = configs.map((c) => ({
      ...c,
      allowances: JSON.parse(c.allowances || "[]"),
      deductions: JSON.parse(c.deductions || "[]"),
      userName: userMap[c.userId]?.name || "Unknown",
      userRole: userMap[c.userId]?.role || "unknown",
      userEmail: userMap[c.userId]?.email || "",
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Salary config GET error:", e);
    return NextResponse.json({ error: "Failed to fetch salary configs" }, { status: 500 });
  }
}

// POST /api/admin/payroll/salary-config — create or update salary config
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const {
      userId,
      baseSalary,
      salaryType = "monthly",
      hourlyRate,
      allowances = [],
      deductions = [],
      cpfEmployee = 20,
      cpfEmployer = 17,
      bankName,
      bankAccount,
    } = body;

    if (!userId || baseSalary === undefined) {
      return NextResponse.json({ error: "userId and baseSalary are required" }, { status: 400 });
    }

    // Check if config already exists for this user
    const existing = await db.salaryConfig.findUnique({ where: { userId } });

    let config;
    if (existing) {
      config = await db.salaryConfig.update({
        where: { userId },
        data: {
          baseSalary: parseFloat(baseSalary),
          salaryType,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          allowances: JSON.stringify(allowances),
          deductions: JSON.stringify(deductions),
          cpfEmployee: parseFloat(cpfEmployee),
          cpfEmployer: parseFloat(cpfEmployer),
          bankName: bankName || null,
          bankAccount: bankAccount || null,
          isActive: true,
        },
      });
      await logAudit({
        action: "update",
        entity: "SalaryConfig",
        entityId: config.id,
        details: { userId, baseSalary },
      });
    } else {
      config = await db.salaryConfig.create({
        data: {
          userId,
          baseSalary: parseFloat(baseSalary),
          salaryType,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          allowances: JSON.stringify(allowances),
          deductions: JSON.stringify(deductions),
          cpfEmployee: parseFloat(cpfEmployee),
          cpfEmployer: parseFloat(cpfEmployer),
          bankName: bankName || null,
          bankAccount: bankAccount || null,
        },
      });
      await logAudit({
        action: "create",
        entity: "SalaryConfig",
        entityId: config.id,
        details: { userId, baseSalary },
      });
    }

    return NextResponse.json(config);
  } catch (e) {
    console.error("Salary config POST error:", e);
    return NextResponse.json({ error: "Failed to save salary config" }, { status: 500 });
  }
}
