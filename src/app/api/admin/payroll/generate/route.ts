import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId, requireRole, ADMIN_ROLES } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";
import { logAudit } from "@/lib/audit";
import { calculateStatutory } from "@/lib/payroll-rules";

const PAID_LEAVE_THRESHOLD = 2; // paid leave days per month

/**
 * Count working days in a month (exclude Sundays).
 */
function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) workingDays++; // 0 = Sunday
  }
  return workingDays;
}

// POST /api/admin/payroll/generate — generate payroll for a period
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(ADMIN_ROLES);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const body = await request.json();
    const { period } = body; // "2026-04"

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: "Invalid period format. Use YYYY-MM" }, { status: 400 });
    }

    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const workingDays = getWorkingDays(year, month);
    const dailyRate = (wd: number, base: number) => (wd > 0 ? base / wd : 0);

    // Period date range for leave queries
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Get all active salary configs
    const configs = await db.salaryConfig.findMany({
      where: { isActive: true },
    });

    if (!configs.length) {
      return NextResponse.json({ error: "No salary configurations found" }, { status: 404 });
    }

    const results = [];

    for (const config of configs) {
      const allowances: { name: string; amount: number }[] = JSON.parse(config.allowances || "[]");
      const deductions: { name: string; amount: number }[] = JSON.parse(config.deductions || "[]");

      const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
      const totalConfigDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

      // Get commission from CommissionPayout for this period (if exists)
      const commissionPayout = await db.commissionPayout.findFirst({
        where: {
          userId: config.userId,
          period,
        },
      });
      const commission = commissionPayout?.finalAmount || 0;

      // Get approved leave days in this period
      const leaves = await db.staffLeave.findMany({
        where: {
          userId: config.userId,
          status: "approved",
          type: "leave",
          startDate: { lte: periodEnd },
          endDate: { gte: periodStart },
        },
      });

      // Calculate total leave days within this month
      let leaveDays = 0;
      for (const leave of leaves) {
        const leaveStart = new Date(Math.max(leave.startDate.getTime(), periodStart.getTime()));
        const leaveEnd = new Date(Math.min(leave.endDate.getTime(), periodEnd.getTime()));
        // Count only all-day leaves
        if (leave.allDay) {
          const start = leaveStart.getDate();
          const end = leaveEnd.getDate();
          for (let d = start; d <= end; d++) {
            const dayOfWeek = new Date(year, month - 1, d).getDay();
            if (dayOfWeek !== 0) leaveDays++; // skip Sundays
          }
        }
      }

      // Unpaid leave: days exceeding threshold
      const unpaidLeaveDays = Math.max(0, leaveDays - PAID_LEAVE_THRESHOLD);
      const perDay = dailyRate(workingDays, config.baseSalary);
      const unpaidLeaveDeduction = unpaidLeaveDays * perDay;

      // Gross pay (before deductions)
      const grossPay = config.baseSalary + totalAllowances + commission;

      // Get user ethnicity for SHG calculation
      const staffUser = await db.user.findFirst({
        where: { id: config.userId },
        select: { ethnicity: true },
      });

      // Country-specific statutory calculations
      const country = config.country || "SG";
      const statutory = calculateStatutory(country, grossPay, {
        age: config.age || undefined,
        annualIncome: grossPay * 12,
        ethnicity: staffUser?.ethnicity || undefined,
      });

      // For backward compatibility, still populate cpfEmployee/cpfEmployer fields
      // For SG: use CPF amounts; for other countries: use the primary employee/employer fund
      const cpfEmployeeAmt = country === "SG"
        ? (statutory.employeeContributions.find(c => c.name === "CPF Employee")?.amount || 0)
        : statutory.employeeContributions[0]?.amount || 0;
      const cpfEmployerAmt = country === "SG"
        ? (statutory.employerContributions.find(c => c.name === "CPF Employer")?.amount || 0)
        : statutory.employerContributions[0]?.amount || 0;

      // Total deductions = all employee statutory + tax + unpaid leave + custom deductions
      const totalDeductions = statutory.totalEmployeeDeductions + unpaidLeaveDeduction + totalConfigDeductions;

      // Net pay
      const netPay = grossPay - totalDeductions;

      // Build statutory breakdown JSON
      const statutoryBreakdown = JSON.stringify({
        employeeContributions: statutory.employeeContributions,
        employerContributions: statutory.employerContributions,
        taxWithholding: statutory.taxWithholding,
        taxDetails: statutory.taxDetails,
      });

      // Check if payroll record already exists for this user+period
      const existingPayroll = await db.payroll.findFirst({
        where: { userId: config.userId, period },
      });

      let payroll;
      const payrollData = {
        baseSalary: config.baseSalary,
        totalAllowances,
        commission,
        overtime: existingPayroll?.overtime || 0,
        bonus: existingPayroll?.bonus || 0,
        grossPay: grossPay + (existingPayroll?.overtime || 0) + (existingPayroll?.bonus || 0),
        cpfEmployee: cpfEmployeeAmt,
        cpfEmployer: cpfEmployerAmt,
        unpaidLeave: unpaidLeaveDeduction,
        otherDeductions: totalConfigDeductions,
        totalDeductions,
        netPay: netPay + (existingPayroll?.overtime || 0) + (existingPayroll?.bonus || 0),
        workingDays,
        leaveDays,
        unpaidLeaveDays,
        allowanceBreakdown: JSON.stringify(allowances),
        deductionBreakdown: JSON.stringify(deductions),
        country,
        employerContributions: statutory.totalEmployerCost,
        taxWithholding: statutory.taxWithholding,
        statutoryBreakdown,
      };

      if (existingPayroll) {
        // Only update draft records
        if (existingPayroll.status !== "draft") {
          results.push(existingPayroll);
          continue;
        }
        payroll = await db.payroll.update({
          where: { id: existingPayroll.id },
          data: payrollData,
        });
      } else {
        payroll = await db.payroll.create({
          data: {
            userId: config.userId,
            period,
            ...payrollData,
            status: "draft",
          },
        });
      }

      results.push(payroll);
    }

    await logAudit({
      action: "create",
      entity: "Payroll",
      details: { period, count: results.length },
    });

    // Enrich with user names
    const userIds = [...new Set(results.map((r) => r.userId))];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = results.map((r) => ({
      ...r,
      userName: userMap[r.userId]?.name || "Unknown",
      userRole: userMap[r.userId]?.role || "unknown",
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("Payroll generate error:", e);
    return NextResponse.json({ error: "Failed to generate payroll" }, { status: 500 });
  }
}
