import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicId } from "@/lib/get-clinic-id";
import { getTenantPrisma } from "@/lib/tenant-db";

// GET /api/dashboard/staff-summary
export async function GET() {
  try {
    const clinicId = await getClinicId();
    const db = clinicId ? getTenantPrisma(clinicId) : prisma;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch all active clinical staff
    const allStaff = await db.user.findMany({
      where: { role: { in: ["doctor", "therapist"] }, status: "active" },
      select: { id: true, name: true, role: true },
    });

    // Fetch approved leaves that overlap today
    const todayLeaves = await db.staffLeave.findMany({
      where: {
        status: "approved",
        type: { in: ["leave", "holiday"] },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: { userId: true },
    });

    const onLeaveUserIds = new Set(todayLeaves.map((l) => l.userId));
    // Count clinic-wide holidays
    const hasClinicHoliday = onLeaveUserIds.has("clinic");

    // If it's a clinic holiday, everyone is on leave
    const onLeaveStaff = hasClinicHoliday
      ? allStaff
      : allStaff.filter((s) => onLeaveUserIds.has(s.id));
    const availableStaff = hasClinicHoliday
      ? []
      : allStaff.filter((s) => !onLeaveUserIds.has(s.id));

    // Top performer this month (by completed appointment count)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthAppointments = await db.appointment.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ["completed", "checked-out"] },
        doctorId: { not: null },
      },
      select: { doctorId: true, sessionPrice: true, id: true },
    });

    // Aggregate by doctor
    const doctorStats: Record<string, { count: number; revenue: number }> = {};
    for (const appt of monthAppointments) {
      if (!appt.doctorId) continue;
      if (!doctorStats[appt.doctorId]) {
        doctorStats[appt.doctorId] = { count: 0, revenue: 0 };
      }
      doctorStats[appt.doctorId].count++;
      doctorStats[appt.doctorId].revenue += appt.sessionPrice || 0;
    }

    // Find top performer
    let topPerformer: { name: string; appointments: number; revenue: number } | null = null;
    let maxCount = 0;
    for (const staff of allStaff) {
      const stats = doctorStats[staff.id];
      if (stats && stats.count > maxCount) {
        maxCount = stats.count;
        topPerformer = {
          name: staff.name,
          appointments: stats.count,
          revenue: Math.round(stats.revenue * 100) / 100,
        };
      }
    }

    return NextResponse.json({
      availableCount: availableStaff.length,
      onLeaveCount: onLeaveStaff.length,
      onLeaveNames: onLeaveStaff.map((s) => s.name),
      topPerformer,
      isClinicHoliday: hasClinicHoliday,
    });
  } catch (error) {
    console.error("Staff summary API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff summary" },
      { status: 500 }
    );
  }
}
