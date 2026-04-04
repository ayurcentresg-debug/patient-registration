import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";

// PUT /api/admin/payroll/[id] — update payroll record
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

    const existing = await db.payroll.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const { overtime, bonus, notes, status, overtimeHours, paymentMode } = body;

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["confirmed"],
        confirmed: ["paid"],
        paid: [],
      };
      if (!validTransitions[existing.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existing.status} to ${status}` },
          { status: 400 }
        );
      }
    }

    // Only allow editing amounts if draft
    if ((overtime !== undefined || bonus !== undefined || overtimeHours !== undefined || paymentMode !== undefined) && existing.status !== "draft") {
      return NextResponse.json(
        { error: "Can only edit amounts on draft payroll records" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (overtime !== undefined) {
      data.overtime = parseFloat(overtime);
    }
    if (bonus !== undefined) {
      data.bonus = parseFloat(bonus);
    }
    if (overtimeHours !== undefined) {
      data.overtimeHours = parseFloat(overtimeHours);
    }
    if (paymentMode !== undefined) {
      data.paymentMode = paymentMode;
    }
    if (notes !== undefined) {
      data.notes = notes;
    }
    if (status) {
      data.status = status;
      if (status === "paid") {
        data.paidAt = new Date();
      }
    }

    // Recalculate gross and net if overtime or bonus changed
    if (overtime !== undefined || bonus !== undefined) {
      const newOvertime = overtime !== undefined ? parseFloat(overtime) : existing.overtime;
      const newBonus = bonus !== undefined ? parseFloat(bonus) : existing.bonus;
      const grossPay =
        existing.baseSalary + existing.totalAllowances + existing.commission + newOvertime + newBonus;
      const netPay = grossPay - existing.totalDeductions;
      data.grossPay = grossPay;
      data.netPay = netPay;
    }

    const payroll = await db.payroll.update({ where: { id }, data });

    await logAudit({
      action: "update",
      entity: "Payroll",
      entityId: id,
      details: data,
    });

    return NextResponse.json(payroll);
  } catch (e) {
    console.error("Payroll PUT error:", e);
    return NextResponse.json({ error: "Failed to update payroll" }, { status: 500 });
  }
}
