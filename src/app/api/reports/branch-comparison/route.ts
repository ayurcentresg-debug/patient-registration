/**
 * Branch comparison report — side-by-side stats per branch for the period.
 *
 * GET /api/reports/branch-comparison?period=month|week|quarter|year
 *
 * Returns: array of { branchId, branchName, isMainBranch,
 *   appointments, completed, cancelled, noShow, completionRate,
 *   noShowRate, revenue, billed, outstanding, uniquePatients,
 *   topDoctor: { name, appointments }
 * }
 *
 * Used by /reports page Branches tab for at-a-glance branch-vs-branch.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

function getDateRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const from = new Date(now);
  if (period === "week") from.setDate(from.getDate() - 7);
  else if (period === "quarter") from.setMonth(from.getMonth() - 3);
  else if (period === "year") from.setFullYear(from.getFullYear() - 1);
  else from.setMonth(from.getMonth() - 1); // default month
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const clinicId = await getClinicId();
    if (!clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getTenantPrisma(clinicId);

    const period = request.nextUrl.searchParams.get("period") || "month";
    const { from, to } = getDateRange(period);

    const branches = await db.branch.findMany({
      where: { isActive: true },
      orderBy: [{ isMainBranch: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isMainBranch: true },
    });

    if (branches.length === 0) {
      return NextResponse.json({ period: { from, to }, branches: [] });
    }

    const results = await Promise.all(branches.map(async (b) => {
      const [statusCounts, revenueAgg, billed, uniquePatientsAgg, topDoctor] = await Promise.all([
        // Appointment status breakdown
        db.appointment.groupBy({
          by: ["status"],
          where: { branchId: b.id, date: { gte: from, lte: to } },
          _count: true,
        }),
        // Revenue (paid) for the period
        db.invoice.aggregate({
          _sum: { totalAmount: true },
          where: {
            branchId: b.id,
            date: { gte: from, lte: to },
            status: { notIn: ["cancelled", "draft"] },
          },
        }),
        // Total billed (incl unpaid)
        db.invoice.aggregate({
          _sum: { totalAmount: true, balanceAmount: true },
          where: {
            branchId: b.id,
            date: { gte: from, lte: to },
            status: { notIn: ["cancelled", "draft"] },
          },
        }),
        // Unique patients
        db.appointment.groupBy({
          by: ["patientId"],
          where: { branchId: b.id, date: { gte: from, lte: to }, patientId: { not: null } },
        }),
        // Top doctor by appointment count
        db.appointment.groupBy({
          by: ["doctorId", "doctor"],
          where: { branchId: b.id, date: { gte: from, lte: to }, status: { notIn: ["cancelled"] } },
          _count: true,
          orderBy: { _count: { doctorId: "desc" } },
          take: 1,
        }),
      ]);

      const counts = { scheduled: 0, confirmed: 0, "in-progress": 0, completed: 0, cancelled: 0, "no-show": 0 } as Record<string, number>;
      let total = 0;
      for (const r of statusCounts) {
        counts[r.status] = r._count;
        total += r._count;
      }
      const completionRate = total > 0 ? Math.round((counts.completed / total) * 100) : 0;
      const noShowRate = total > 0 ? Math.round((counts["no-show"] / total) * 100) : 0;

      return {
        branchId: b.id,
        branchName: b.name,
        isMainBranch: !!b.isMainBranch,
        appointments: total,
        completed: counts.completed,
        cancelled: counts.cancelled,
        noShow: counts["no-show"],
        completionRate,
        noShowRate,
        revenue: revenueAgg._sum.totalAmount ?? 0,
        billed: billed._sum.totalAmount ?? 0,
        outstanding: billed._sum.balanceAmount ?? 0,
        uniquePatients: uniquePatientsAgg.length,
        topDoctor: topDoctor[0]
          ? { name: topDoctor[0].doctor || "—", appointments: topDoctor[0]._count }
          : null,
      };
    }));

    return NextResponse.json({
      period: { from, to, label: period },
      branches: results,
    });
  } catch (err) {
    console.error("branch-comparison error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load comparison" },
      { status: 500 }
    );
  }
}
