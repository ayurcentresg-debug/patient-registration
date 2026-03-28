import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/treatment-plans/stats - Treatment plan statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (patientId) where.patientId = patientId;

    const [totalPlans, activePlans, completedPlans, pausedPlans, allPlans] = await Promise.all([
      prisma.treatmentPlan.count({ where }),
      prisma.treatmentPlan.count({ where: { ...where, status: "active" } }),
      prisma.treatmentPlan.count({ where: { ...where, status: "completed" } }),
      prisma.treatmentPlan.count({ where: { ...where, status: "paused" } }),
      prisma.treatmentPlan.findMany({
        where,
        select: { totalSessions: true, completedSessions: true },
      }),
    ]);

    const totalSessions = allPlans.reduce((sum, p) => sum + p.totalSessions, 0);
    const completedSessions = allPlans.reduce((sum, p) => sum + p.completedSessions, 0);
    const overallProgress = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100 * 100) / 100
      : 0;

    // Upcoming milestones (next 5 pending)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const milestoneWhere: any = { status: "pending" };
    if (patientId) {
      milestoneWhere.plan = { patientId };
    }
    const upcomingMilestones = await prisma.treatmentMilestone.findMany({
      where: milestoneWhere,
      orderBy: { targetDate: "asc" },
      take: 5,
      include: {
        plan: {
          select: { id: true, name: true, planNumber: true, patientId: true },
        },
      },
    });

    // Recent progress: last 10 items with completedSessions > 0, ordered by plan updatedAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemWhere: any = { completedSessions: { gt: 0 } };
    if (patientId) {
      itemWhere.plan = { patientId };
    }
    const recentProgress = await prisma.treatmentPlanItem.findMany({
      where: itemWhere,
      orderBy: { plan: { updatedAt: "desc" } },
      take: 10,
      include: {
        plan: {
          select: { id: true, name: true, planNumber: true, patientId: true },
        },
      },
    });

    return NextResponse.json({
      totalPlans,
      activePlans,
      completedPlans,
      pausedPlans,
      overallProgress,
      totalSessions,
      completedSessions,
      upcomingMilestones,
      recentProgress,
    });
  } catch (error) {
    console.error("GET /api/treatment-plans/stats error:", error);
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }
}
