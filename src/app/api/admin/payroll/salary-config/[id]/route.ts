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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (body.baseSalary !== undefined) data.baseSalary = parseFloat(body.baseSalary);
    if (body.salaryCurrency !== undefined) data.salaryCurrency = body.salaryCurrency || "SGD";
    if (body.salaryType !== undefined) data.salaryType = body.salaryType;
    if (body.hourlyRate !== undefined) data.hourlyRate = body.hourlyRate ? parseFloat(body.hourlyRate) : null;
    if (body.allowances !== undefined) data.allowances = JSON.stringify(body.allowances);
    if (body.deductions !== undefined) data.deductions = JSON.stringify(body.deductions);
    if (body.cpfEmployee !== undefined) data.cpfEmployee = parseFloat(body.cpfEmployee);
    if (body.cpfEmployer !== undefined) data.cpfEmployer = parseFloat(body.cpfEmployer);
    if (body.bankName !== undefined) data.bankName = body.bankName || null;
    if (body.bankAccount !== undefined) data.bankAccount = body.bankAccount || null;
    if (body.paymentFrequency !== undefined) data.paymentFrequency = body.paymentFrequency || "monthly";
    if (body.paymentDayOfMonth !== undefined) data.paymentDayOfMonth = body.paymentDayOfMonth != null ? parseInt(body.paymentDayOfMonth) : null;
    if (body.paymentMode !== undefined) data.paymentMode = body.paymentMode || null;
    if (body.hourlyOvertimeRate !== undefined) data.hourlyOvertimeRate = body.hourlyOvertimeRate != null ? parseFloat(body.hourlyOvertimeRate) : null;
    if (body.awsEligible !== undefined) data.awsEligible = Boolean(body.awsEligible);
    if (body.awsMonths !== undefined) data.awsMonths = body.awsMonths != null ? parseFloat(body.awsMonths) : null;
    if (body.variableBonusNote !== undefined) data.variableBonusNote = body.variableBonusNote || null;
    if (body.cpfRateType !== undefined) data.cpfRateType = body.cpfRateType || "graduated_graduated";
    if (body.cpfOptIn !== undefined) data.cpfOptIn = body.cpfOptIn !== false;

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
