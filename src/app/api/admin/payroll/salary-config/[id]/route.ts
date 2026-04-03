import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// GET /api/admin/payroll/salary-config/[id] — single config
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

    const config = await db.salaryConfig.findFirst({ where: { id } });
    if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ...config,
      allowances: JSON.parse(config.allowances || "[]"),
      deductions: JSON.parse(config.deductions || "[]"),
    });
  } catch (e) {
    console.error("Salary config GET [id] error:", e);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT /api/admin/payroll/salary-config/[id] — update config
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

    const body = await request.json();
    const {
      baseSalary,
      salaryType,
      hourlyRate,
      allowances,
      deductions,
      cpfEmployee,
      cpfEmployer,
      bankName,
      bankAccount,
    } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (baseSalary !== undefined) data.baseSalary = parseFloat(baseSalary);
    if (salaryType !== undefined) data.salaryType = salaryType;
    if (hourlyRate !== undefined) data.hourlyRate = hourlyRate ? parseFloat(hourlyRate) : null;
    if (allowances !== undefined) data.allowances = JSON.stringify(allowances);
    if (deductions !== undefined) data.deductions = JSON.stringify(deductions);
    if (cpfEmployee !== undefined) data.cpfEmployee = parseFloat(cpfEmployee);
    if (cpfEmployer !== undefined) data.cpfEmployer = parseFloat(cpfEmployer);
    if (bankName !== undefined) data.bankName = bankName || null;
    if (bankAccount !== undefined) data.bankAccount = bankAccount || null;

    const config = await db.salaryConfig.update({ where: { id }, data });

    await logAudit({
      action: "update",
      entity: "SalaryConfig",
      entityId: id,
      details: data,
    });

    return NextResponse.json(config);
  } catch (e) {
    console.error("Salary config PUT error:", e);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}

// DELETE /api/admin/payroll/salary-config/[id] — deactivate
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

    await db.salaryConfig.update({ where: { id }, data: { isActive: false } });

    await logAudit({
      action: "delete",
      entity: "SalaryConfig",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Salary config DELETE error:", e);
    return NextResponse.json({ error: "Failed to deactivate config" }, { status: 500 });
  }
}
